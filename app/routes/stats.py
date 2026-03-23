from flask import Blueprint, jsonify, render_template
from flask_login import login_required, current_user
from app import db
from app.models.room import ProbabilitySnapshot, PlayerHand

stats_bp = Blueprint('stats', __name__)


@stats_bp.app_template_global('enumerate')
def _enumerate(iterable, start=0):
    return enumerate(iterable, start)


@stats_bp.route('/player/<int:player_id>/history')
@login_required
def player_history(player_id: int):
    from flask import request
    from app.models.player import Player

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
    result = db.session.execute(db.text(
        "SELECT * FROM game_statistics ORDER BY win_rate_pct DESC LIMIT 20"
    ))
    rows = [dict(row._mapping) for row in result]
    return render_template('stats/dashboard.html', stats=rows)


@stats_bp.route('/probability-theory')
def probability_theory():
    return render_template('stats/theory.html')