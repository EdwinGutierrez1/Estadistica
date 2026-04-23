from flask import Blueprint, request, jsonify, render_template, redirect, url_for
from flask_login import login_required, current_user
from app import db
from app.models.room import Room, RoomPlayer
from app.utils.qr_generator import generate_qr_base64
import os

rooms_bp = Blueprint('rooms', __name__)

ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')


@rooms_bp.route('/', methods=['GET'])
@login_required
def list_rooms():
    q = (request.args.get('q') or '').strip()
    query = Room.query.filter(Room.status != 'finished')
    if q:
        query = query.filter(Room.name.ilike(f'%{q}%'))
    rooms = query.order_by(Room.created_at.desc()).all()
    return render_template(
        'rooms/list.html',
        rooms=rooms,
        q=q,
        is_global_admin=(current_user.username == ADMIN_USERNAME)
    )


@rooms_bp.route('/create', methods=['POST'])
@login_required
def create_room():
    payload = request.json or {}
    max_players = int(payload.get('max_players', 5))
    room_name = (payload.get('name') or '').strip()

    if not room_name:
        return jsonify({'error': 'El nombre de la sala es obligatorio'}), 400
    if len(room_name) > 80:
        return jsonify({'error': 'El nombre de la sala no puede exceder 80 caracteres'}), 400
    if not (3 <= max_players <= 5):
        return jsonify({'error': 'max_players debe ser entre 3 y 5'}), 400

    room = Room(
        admin_player_id=current_user.id,
        max_players=max_players,
        name=room_name
    )
    db.session.add(room)
    db.session.flush()

    # El admin global no ocupa asiento
    if current_user.username != ADMIN_USERNAME:
        room_player = RoomPlayer(
            room_id=room.id,
            player_id=current_user.id,
            seat_number=1
        )
        db.session.add(room_player)

    db.session.commit()
    return jsonify({
        'success': True,
        'room': room.to_dict(),
        'invite_url': _build_invite_url(room.invite_token)
    }), 201


@rooms_bp.route('/join/<token>', methods=['GET'])
@login_required
def join_by_token(token: str):
    room = Room.query.filter_by(invite_token=token).first_or_404()

    if room.status == 'finished':
        return render_template('error.html', message='La sala ya terminó'), 403

    # Admin global puede entrar sin ocupar asiento
    if current_user.username == ADMIN_USERNAME:
        return redirect(url_for('game.room_lobby', room_id=room.id))

    if room.status == 'active':
        return render_template('error.html', message='La partida ya está en curso'), 403

    if room.player_count >= room.max_players:
        return render_template('error.html', message='Sala llena'), 403

    existing = RoomPlayer.query.filter_by(
        room_id=room.id, player_id=current_user.id
    ).first()

    if not existing:
        taken_seats = {rp.seat_number for rp in room.active_players}
        next_seat = next(s for s in range(1, room.max_players + 1) if s not in taken_seats)
        rp = RoomPlayer(
            room_id=room.id,
            player_id=current_user.id,
            seat_number=next_seat
        )
        db.session.add(rp)
        db.session.commit()
    elif not existing.is_active:
        existing.is_active = True
        db.session.commit()

    return redirect(url_for('game.room_lobby', room_id=room.id))


@rooms_bp.route('/delete/<int:room_id>', methods=['POST'])
@login_required
def delete_room(room_id: int):
    room = Room.query.get_or_404(room_id)

    # Solo el admin global o el creador de la sala pueden eliminarla
    if current_user.username != ADMIN_USERNAME and room.admin_player_id != current_user.id:
        return jsonify({'error': 'No tienes permiso'}), 403

    from app.models.room import PlayerHand, Game, ProbabilitySnapshot
    game_ids = [g.id for g in room.games.all()]
    if game_ids:
        ProbabilitySnapshot.query.filter(ProbabilitySnapshot.game_id.in_(game_ids)).delete()
        PlayerHand.query.filter(PlayerHand.game_id.in_(game_ids)).delete()
        Game.query.filter(Game.room_id == room_id).delete()

    RoomPlayer.query.filter_by(room_id=room_id).delete()
    db.session.delete(room)
    db.session.commit()
    return jsonify({'success': True})


@rooms_bp.route('/leave/<int:room_id>', methods=['POST'])
@login_required
def leave_room(room_id: int):
    rp = RoomPlayer.query.filter_by(
        room_id=room_id, player_id=current_user.id
    ).first()
    if rp:
        rp.is_active = False
        db.session.commit()

    room = Room.query.get(room_id)
    if room:
        _reassign_room_admin_if_needed(room)

    # Si no quedan jugadores activos, eliminar la sala
    if room and room.player_count == 0:
        _delete_room_cascade(room_id)
        return jsonify({'success': True, 'new_admin_id': None})

    return jsonify({'success': True, 'new_admin_id': room.admin_player_id if room else None})


@rooms_bp.route('/<int:room_id>/qr', methods=['GET'])
@login_required
def get_qr(room_id: int):
    room = Room.query.get_or_404(room_id)
    invite_url = _build_invite_url(room.invite_token)
    qr_data = generate_qr_base64(invite_url)
    return jsonify({'qr': qr_data, 'url': invite_url})


def _build_invite_url(token: str) -> str:
    from flask import request as req
    base = req.host_url.rstrip('/')
    return f"{base}/rooms/join/{token}"


def _reassign_room_admin_if_needed(room: Room):
    if not room:
        return None

    current_admin_active = RoomPlayer.query.filter_by(
        room_id=room.id,
        player_id=room.admin_player_id,
        is_active=True
    ).first()

    if current_admin_active:
        return room.admin_player_id

    next_admin_rp = (RoomPlayer.query
                     .filter_by(room_id=room.id, is_active=True)
                     .order_by(RoomPlayer.joined_at.asc(), RoomPlayer.seat_number.asc())
                     .first())

    if next_admin_rp:
        room.admin_player_id = next_admin_rp.player_id
        db.session.commit()
        return room.admin_player_id

    return None


    from app.models.room import PlayerHand, Game, ProbabilitySnapshot
    room = Room.query.get(room_id)
    if not room:
        return
    game_ids = [g.id for g in room.games.all()]
    if game_ids:
        ProbabilitySnapshot.query.filter(ProbabilitySnapshot.game_id.in_(game_ids)).delete()
        PlayerHand.query.filter(PlayerHand.game_id.in_(game_ids)).delete()
        Game.query.filter(Game.room_id == room_id).delete()
    RoomPlayer.query.filter_by(room_id=room_id).delete()
    db.session.delete(room)
    db.session.commit()