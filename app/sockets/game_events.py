from flask import request
from flask_socketio import emit, join_room, leave_room
from flask_login import current_user
from app import socketio, db
from app.models.player import Player
from app.models.room import Room, RoomPlayer, Game, PlayerHand, ProbabilitySnapshot
from app.utils.game_engine import GameState, get_game_state, set_game_state, remove_game_state
from app.utils.probability import compute_probabilities_for_player, calculate_hand_score
from datetime import datetime
import functools


def _emit_to_player(room_id: int, player_id: int, event_name: str, payload: dict):
    sid = None
    channel = f"room_{room_id}"
    participants = socketio.server.manager.rooms.get('/', {}).get(channel, set())

    for participant_sid in participants:
        try:
            sess = socketio.server.get_session(participant_sid)
        except Exception:
            sess = None

        if sess and sess.get('_user_id') == str(player_id):
            sid = participant_sid
            break

    if sid:
        emit(event_name, payload, to=sid)


def _reassign_room_admin_if_needed(room_id: int):
    room = Room.query.get(room_id)
    if not room:
        return None

    current_admin_active = RoomPlayer.query.filter_by(
        room_id=room_id,
        player_id=room.admin_player_id,
        is_active=True
    ).first()

    if current_admin_active:
        return room.admin_player_id

    next_admin_rp = (RoomPlayer.query
                     .filter_by(room_id=room_id, is_active=True)
                     .order_by(RoomPlayer.joined_at.asc(), RoomPlayer.seat_number.asc())
                     .first())

    if next_admin_rp:
        room.admin_player_id = next_admin_rp.player_id
        db.session.commit()
        return room.admin_player_id

    return None


def socket_authenticated(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            emit('error', {'message': 'No autenticado'})
            return
        return f(*args, **kwargs)
    return wrapper


@socketio.on('connect')
def on_connect():
    if current_user.is_authenticated:
        socketio.server.save_session(request.sid, {
            '_user_id': str(current_user.id)
        })
        emit('connected', {'message': f'Bienvenido, {current_user.username}!'})
    else:
        emit('connected', {'message': 'Conectado como anónimo'})


@socketio.on('disconnect')
def on_disconnect():
    if current_user.is_authenticated:
        print(f"[SocketIO] Desconectado: {current_user.username}")


@socketio.on('join_room')
@socket_authenticated
def on_join_room(data: dict):
    import os
    room_id = data.get('room_id')
    if not room_id:
        emit('error', {'message': 'room_id requerido'})
        return

    room = Room.query.get(room_id)
    if not room:
        emit('error', {'message': 'Sala no encontrada'})
        return

    ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')

    # Admin global puede unirse al canal sin ser miembro de la sala
    if current_user.username != ADMIN_USERNAME:
        rp = RoomPlayer.query.filter_by(
            room_id=room_id, player_id=current_user.id, is_active=True
        ).first()
        if not rp:
            emit('error', {'message': 'No perteneces a esta sala'})
            return

    _reassign_room_admin_if_needed(room_id)

    channel = f"room_{room_id}"
    join_room(channel)

    emit('player_joined', {
        'player':      current_user.to_dict(),
        'seat_number': 0,
        'room':        room.to_dict(),
        'all_players': [rp2.to_dict() for rp2 in room.active_players]
    }, room=channel)

    if room.status == 'active':
        active_game = Game.query.filter_by(room_id=room_id).order_by(Game.round_number.desc()).first()
        if active_game:
            state = get_game_state(active_game.id)
            if state:
                _emit_to_player(room_id, current_user.id, 'game_started', {
                    'game_id':      active_game.id,
                    'round_number': active_game.round_number,
                    'player_order': state.player_ids,
                    'current_turn': state.current_player_id,
                })
                _emit_to_player(room_id, current_user.id, 'game_state', state.get_public_state(current_user.id))
            else:
                emit('error', {'message': 'Partida activa no disponible en memoria, recarga la sala.'})


@socketio.on('leave_room')
@socket_authenticated
def on_leave_room(data: dict):
    room_id = data.get('room_id')
    channel = f"room_{room_id}"

    rp = RoomPlayer.query.filter_by(
        room_id=room_id, player_id=current_user.id
    ).first()
    if rp:
        rp.is_active = False
        db.session.commit()

    new_admin_id = _reassign_room_admin_if_needed(room_id)

    leave_room(channel)
    emit('player_left', {
        'player_id': current_user.id,
        'new_admin_id': new_admin_id
    }, room=channel)


@socketio.on('start_game')
@socket_authenticated
def on_start_game(data: dict):
    room_id = data.get('room_id')
    room = Room.query.get(room_id)
    channel = f"room_{room_id}"

    if not room:
        emit('error', {'message': 'Sala no encontrada'})
        return

    import os
    ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
    is_global_admin = current_user.username == ADMIN_USERNAME

    active_admin_id = _reassign_room_admin_if_needed(room_id)

    if active_admin_id is None and not is_global_admin:
        emit('error', {'message': 'No hay administrador activo para iniciar'})
        return

    if active_admin_id != current_user.id and not is_global_admin:
        emit('error', {'message': 'Solo el administrador actual puede iniciar'})
        return

    active = room.active_players
    if len(active) < 3:
        emit('error', {'message': f'Se requieren al menos 3 jugadores para iniciar ({len(active)}/3)'})
        return

    if room.status != 'waiting':
        emit('error', {'message': 'La sala ya está en juego'})
        return

    last_game = Game.query.filter_by(room_id=room_id).order_by(Game.round_number.desc()).first()
    round_num = (last_game.round_number + 1) if last_game else 1

    game = Game(room_id=room_id, round_number=round_num)
    db.session.add(game)
    db.session.flush()

    player_ids = [rp.player_id for rp in active]
    for pid in player_ids:
        hand = PlayerHand(game_id=game.id, player_id=pid, bet_amount=100)
        db.session.add(hand)

    room.status = 'active'
    room.started_at = datetime.utcnow()
    db.session.commit()

    state = GameState(
        game_id=game.id,
        room_id=room_id,
        player_ids=player_ids,
        num_decks=room.decks_count
    )
    state.deal_initial_cards()

    game.deck_state  = state.deck
    game.dealer_hand = state.dealer_hand
    game.status      = 'player_turns'
    db.session.commit()

    set_game_state(game.id, state)

    emit('game_started', {
        'game_id':      game.id,
        'round_number': round_num,
        'player_order': player_ids,
        'current_turn': state.current_player_id,
    }, room=channel)

    for rp in active:
        public_state = state.get_public_state(rp.player_id)
        _emit_to_player(room_id, rp.player_id, 'game_state', public_state)


@socketio.on('hit')
@socket_authenticated
def on_hit(data: dict):
    game_id = data.get('game_id')
    state = get_game_state(game_id)

    if not state:
        emit('error', {'message': 'Partida no encontrada'})
        return

    channel = f"room_{state.room_id}"

    if state.current_player_id != current_user.id:
        emit('error', {'message': 'No es tu turno'})
        return

    try:
        card, new_score, busted = state.player_hit(current_user.id)
    except ValueError as e:
        emit('error', {'message': str(e)})
        return

    prob_data = {}
    if not busted and state.phase == 'player_turns':
        dealer_visible = state.dealer_hand[0]
        prob_data = compute_probabilities_for_player(
            state.player_hands[current_user.id],
            dealer_visible,
            state.deck
        )
        _save_probability_snapshot(game_id, current_user.id, new_score, prob_data, len(state.deck))

    active_players = RoomPlayer.query.filter_by(
        room_id=state.room_id, is_active=True
    ).all()

    for rp in active_players:
        if rp.player_id == current_user.id:
            _emit_to_player(state.room_id, rp.player_id, 'card_dealt', {
                'player_id':      current_user.id,
                'card':           card,
                'new_score':      new_score,
                'busted':         busted,
                'probabilities':  prob_data,
                'deck_remaining': len(state.deck),
            })
        else:
            hidden_card = {
                'suit': 'hidden', 'value': '?', 'numeric': 0,
                'id': f'hidden_{current_user.id}_{len(state.player_hands[current_user.id])}'
            }
            _emit_to_player(state.room_id, rp.player_id, 'card_dealt', {
                'player_id':      current_user.id,
                'card':           hidden_card,
                'new_score':      '?',
                'busted':         busted,
                'probabilities':  {},
                'deck_remaining': len(state.deck),
            })

    if state.phase == 'player_turns':
        emit('turn_changed', {'current_turn': state.current_player_id}, room=channel)
    elif state.phase == 'dealer_turn':
        emit('turn_changed', {'current_turn': state.current_player_id}, room=channel)
        _run_dealer_phase(state, channel)


@socketio.on('stand')
@socket_authenticated
def on_stand(data: dict):
    game_id = data.get('game_id')
    state = get_game_state(game_id)

    if not state:
        emit('error', {'message': 'Partida no encontrada'})
        return

    channel = f"room_{state.room_id}"

    if state.current_player_id != current_user.id:
        emit('error', {'message': 'No es tu turno'})
        return

    try:
        state.player_stand(current_user.id)
    except ValueError as e:
        emit('error', {'message': str(e)})
        return

    emit('player_stood', {
        'player_id': current_user.id,
        'score':     calculate_hand_score(state.player_hands[current_user.id])
    }, room=channel)

    if state.phase == 'player_turns':
        emit('turn_changed', {'current_turn': state.current_player_id}, room=channel)
    elif state.phase == 'dealer_turn':
        emit('turn_changed', {'current_turn': state.current_player_id}, room=channel)
        _run_dealer_phase(state, channel)


def _run_dealer_phase(state: GameState, channel: str):
    emit('dealer_card_revealed', {
        'dealer_hand':  state.dealer_hand,
        'dealer_score': calculate_hand_score(state.dealer_hand)
    }, room=channel)

    new_dealer_cards = state.dealer_play()
    dealer_final_score = calculate_hand_score(state.dealer_hand)

    if new_dealer_cards:
        emit('dealer_cards_dealt', {
            'new_cards':   new_dealer_cards,
            'final_score': dealer_final_score,
        }, room=channel)

    results = state.calculate_results()

    game = Game.query.get(state.game_id)
    game.status      = 'finished'
    game.finished_at = datetime.utcnow()
    game.dealer_hand = state.dealer_hand

    for pid, result_data in results.items():
        hand = PlayerHand.query.filter_by(game_id=state.game_id, player_id=pid).first()
        already_applied = bool(hand and hand.result is not None)

        if hand:
            hand.cards       = state.player_hands[pid]
            hand.final_score = result_data['score']
            hand.result      = result_data['result']
            hand.chips_delta = result_data['chips_delta']

        player = Player.query.get(pid)
        if player and not already_applied:
            player.chips += result_data['chips_delta']

    room = Room.query.get(state.room_id)
    room.status = 'waiting'

    db.session.commit()
    remove_game_state(state.game_id)

    emit('game_finished', {
        'game_id':      state.game_id,
        'dealer_hand':  state.dealer_hand,
        'dealer_score': dealer_final_score,
        'results':      results,
    }, room=channel)


@socketio.on('request_qr')
@socket_authenticated
def on_request_qr(data: dict):
    from app.utils.qr_generator import generate_qr_base64

    room_id = data.get('room_id')
    room = Room.query.get(room_id)
    if not room:
        emit('error', {'message': 'Sala no encontrada'})
        return

    base_url = data.get('base_url', 'http://localhost:5000')
    invite_url = f"{base_url}/rooms/join/{room.invite_token}"
    qr_base64 = generate_qr_base64(invite_url)

    emit('qr_generated', {
        'qr':   qr_base64,
        'url':  invite_url,
        'code': room.code
    })


def _save_probability_snapshot(game_id, player_id, current_score, prob_data, cards_remaining):
    game = Game.query.get(game_id)
    if not game:
        return

    room = Room.query.get(game.room_id)
    total_cards = 52 * (room.decks_count if room else 1)
    cards_dealt = total_cards - cards_remaining

    snapshot = ProbabilitySnapshot(
        game_id         = game_id,
        player_id       = player_id,
        cards_dealt     = cards_dealt,
        cards_remaining = cards_remaining,
        prob_win        = prob_data.get('prob_win', 0),
        prob_bust       = prob_data.get('prob_bust', 0),
        prob_push       = prob_data.get('prob_push', 0),
        current_score   = current_score,
    )
    db.session.add(snapshot)
    db.session.commit()
