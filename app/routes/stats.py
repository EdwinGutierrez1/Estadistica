from flask import Blueprint, jsonify, render_template
from flask_login import login_required, current_user
from app import db
from app.models.room import ProbabilitySnapshot, PlayerHand
from app.models.player import Player
from sqlalchemy import func, case

stats_bp = Blueprint('stats', __name__)


@stats_bp.app_template_global('enumerate')
def _enumerate(iterable, start=0):
    return enumerate(iterable, start)


@stats_bp.route('/player/<int:player_id>/history')
@login_required
def player_history(player_id: int):
    from flask import request

    player = Player.query.get_or_404(player_id)

    if request.headers.get('Accept', '').startswith('application/json') or \
       request.args.get('format') == 'json':
        snapshots = (
            ProbabilitySnapshot.query
            .filter_by(player_id=player_id)
            .order_by(ProbabilitySnapshot.snapshot_time.asc())
            .limit(200).all()
        )
        data = [{
            'time':            s.snapshot_time.isoformat(),
            'cards_remaining': s.cards_remaining,
            'prob_win':        float(s.prob_win),
            'prob_bust':       float(s.prob_bust),
            'prob_push':       float(s.prob_push),
            'current_score':   s.current_score,
        } for s in snapshots]
        return jsonify(data)

    return render_template('stats/player_history.html', player=player)


@stats_bp.route('/game/<int:game_id>/summary')
@login_required
def game_summary(game_id: int):
    hands = PlayerHand.query.filter_by(game_id=game_id).all()
    return jsonify([h.to_dict() for h in hands])


@stats_bp.route('/dashboard')
@login_required
def dashboard():
    # Calcular estadísticas directamente con SQLAlchemy — sin depender de vista SQL
    rows = (
        db.session.query(
            Player.username,
            func.count(PlayerHand.id).label('total_hands'),
            func.sum(case((PlayerHand.result == 'win',      1), else_=0)).label('wins'),
            func.sum(case((PlayerHand.result == 'blackjack',1), else_=0)).label('blackjacks'),
            func.sum(case((PlayerHand.result == 'lose',     1), else_=0)).label('losses'),
            func.sum(case((PlayerHand.result == 'bust',     1), else_=0)).label('busts'),
            func.sum(func.coalesce(PlayerHand.chips_delta, 0)).label('total_chips_won'),
        )
        .join(PlayerHand, Player.id == PlayerHand.player_id)
        .group_by(Player.id, Player.username)
        .order_by(func.count(PlayerHand.id).desc())
        .limit(20)
        .all()
    )

    stats = []
    for row in rows:
        total = row.total_hands or 1
        win_rate = round(((row.wins or 0) + (row.blackjacks or 0)) / total * 100, 1)
        stats.append({
            'username':        row.username,
            'total_hands':     row.total_hands or 0,
            'wins':            row.wins or 0,
            'blackjacks':      row.blackjacks or 0,
            'losses':          row.losses or 0,
            'busts':           row.busts or 0,
            'win_rate_pct':    win_rate,
            'total_chips_won': row.total_chips_won or 0,
        })

    return render_template('stats/dashboard.html', stats=stats)


@stats_bp.route('/probability-theory')
def probability_theory():
    return render_template('stats/theory.html')
