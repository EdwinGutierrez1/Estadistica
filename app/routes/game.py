from flask import Blueprint, render_template, redirect, url_for
from flask_login import login_required, current_user
from app.models.room import Room, Game
import os

game_bp = Blueprint('game', __name__)

ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')


@game_bp.route('/room/<int:room_id>')
@login_required
def room_lobby(room_id: int):
    room = Room.query.get(room_id)
    if not room:
        return redirect(url_for('rooms.list_rooms'))

    active_game = None
    if room.status == 'active':
        active_game = Game.query.filter_by(room_id=room.id).order_by(Game.round_number.desc()).first()

    # Admin global puede entrar a cualquier sala sin ser miembro
    if current_user.username == ADMIN_USERNAME:
        return render_template(
            'game/room.html',
            room=room,
            player=current_user,
            is_admin=True,
            active_game=active_game
        )

    # Jugador normal — verificar que pertenece a la sala
    player_in_room = any(
        rp.player_id == current_user.id
        for rp in room.active_players
    )
    if not player_in_room:
        return redirect(url_for('rooms.list_rooms'))

    return render_template(
        'game/room.html',
        room=room,
        player=current_user,
        is_admin=(room.admin_player_id == current_user.id),
        active_game=active_game
    )
