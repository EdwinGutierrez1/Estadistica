from flask import Blueprint, request, jsonify, render_template, redirect, url_for
from flask_login import login_user, logout_user, login_required, current_user
from app import db
from app.models.player import Player
from datetime import datetime

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        return render_template('auth/register.html')

    data = request.get_json() or request.form
    username = data.get('username', '').strip()

    if not username or len(username) < 3:
        return jsonify({'error': 'Username debe tener al menos 3 caracteres'}), 400

    if Player.query.filter_by(username=username).first():
        return jsonify({'error': 'Username ya existe'}), 409

    player = Player(username=username, chips=1000, created_at=datetime.utcnow())
    db.session.add(player)
    db.session.commit()

    login_user(player)
    return jsonify({'success': True, 'player': player.to_dict()}), 201


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('auth/login.html')

    data = request.get_json() or request.form
    username = data.get('username', '').strip()

    player = Player.query.filter_by(username=username).first()
    if not player:
        return jsonify({'error': 'Jugador no encontrado'}), 404

    player.last_seen = datetime.utcnow()
    db.session.commit()

    login_user(player, remember=True)
    return jsonify({'success': True, 'player': player.to_dict()})


@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))


@auth_bp.route('/me')
@login_required
def me():
    return jsonify(current_user.to_dict())