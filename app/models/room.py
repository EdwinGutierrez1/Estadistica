from app import db
from datetime import datetime
import secrets
import string


def _generate_room_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def _generate_invite_token() -> str:
    return secrets.token_urlsafe(32)


class Room(db.Model):
    __tablename__ = 'rooms'

    id              = db.Column(db.Integer, primary_key=True)
    code            = db.Column(db.String(8), nullable=False, unique=True,
                                default=_generate_room_code)
    admin_player_id = db.Column(db.Integer, db.ForeignKey('players.id'), nullable=False)
    status          = db.Column(db.Enum('waiting','active','finished'),
                                nullable=False, default='waiting')
    name            = db.Column(db.String(80), nullable=False, default='Sala sin nombre')
    max_players     = db.Column(db.Integer, nullable=False, default=5)
    decks_count     = db.Column(db.Integer, nullable=False, default=1)
    invite_token    = db.Column(db.String(64), nullable=False, unique=True,
                                default=_generate_invite_token)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)
    started_at      = db.Column(db.DateTime)
    finished_at     = db.Column(db.DateTime)

    admin   = db.relationship('Player', foreign_keys=[admin_player_id])
    players = db.relationship('RoomPlayer', backref='room', lazy='dynamic')
    games   = db.relationship('Game', backref='room', lazy='dynamic')

    @property
    def active_players(self):
        return self.players.filter_by(is_active=True).all()

    @property
    def player_count(self) -> int:
        return len(self.active_players)

    def to_dict(self) -> dict:
        return {
            'id':           self.id,
            'code':         self.code,
            'name':         self.name,
            'status':       self.status,
            'player_count': self.player_count,
            'max_players':  self.max_players,
            'admin_id':     self.admin_player_id,
        }


class RoomPlayer(db.Model):
    __tablename__ = 'room_players'

    id          = db.Column(db.Integer, primary_key=True)
    room_id     = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    player_id   = db.Column(db.Integer, db.ForeignKey('players.id'), nullable=False)
    seat_number = db.Column(db.Integer, nullable=False)
    joined_at   = db.Column(db.DateTime, default=datetime.utcnow)
    is_active   = db.Column(db.Boolean, default=True)

    player = db.relationship('Player')

    def to_dict(self) -> dict:
        return {
            'player':      self.player.to_dict(),
            'seat_number': self.seat_number,
            'is_active':   self.is_active,
        }


class Game(db.Model):
    __tablename__ = 'games'

    id           = db.Column(db.Integer, primary_key=True)
    room_id      = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    round_number = db.Column(db.Integer, default=1)
    _deck_state  = db.Column('deck_state', db.JSON)
    _dealer_hand = db.Column('dealer_hand', db.JSON)
    status       = db.Column(
        db.Enum('dealing','player_turns','dealer_turn','finished'),
        default='dealing'
    )
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    finished_at = db.Column(db.DateTime)

    hands = db.relationship('PlayerHand', backref='game', lazy='dynamic')

    @property
    def deck_state(self) -> list:
        return self._deck_state or []

    @deck_state.setter
    def deck_state(self, value: list):
        self._deck_state = value

    @property
    def dealer_hand(self) -> list:
        return self._dealer_hand or []

    @dealer_hand.setter
    def dealer_hand(self, value: list):
        self._dealer_hand = value


class PlayerHand(db.Model):
    __tablename__ = 'player_hands'

    id          = db.Column(db.Integer, primary_key=True)
    game_id     = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    player_id   = db.Column(db.Integer, db.ForeignKey('players.id'), nullable=False)
    _cards      = db.Column('cards', db.JSON, nullable=False, default=list)
    final_score = db.Column(db.Integer)
    result      = db.Column(db.Enum('win','lose','push','blackjack','bust'))
    bet_amount  = db.Column(db.Integer, default=0)
    chips_delta = db.Column(db.Integer)

    @property
    def cards(self) -> list:
        return self._cards or []

    @cards.setter
    def cards(self, value: list):
        self._cards = value

    def to_dict(self) -> dict:
        return {
            'game_id':     self.game_id,
            'player_id':   self.player_id,
            'cards':       self.cards,
            'final_score': self.final_score,
            'result':      self.result,
            'bet_amount':  self.bet_amount,
            'chips_delta': self.chips_delta,
        }


class ProbabilitySnapshot(db.Model):
    __tablename__ = 'probability_snapshots'

    id              = db.Column(db.Integer, primary_key=True)
    game_id         = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    player_id       = db.Column(db.Integer, db.ForeignKey('players.id'), nullable=False)
    snapshot_time   = db.Column(db.DateTime, default=datetime.utcnow)
    cards_dealt     = db.Column(db.Integer, nullable=False)
    cards_remaining = db.Column(db.Integer, nullable=False)
    prob_win        = db.Column(db.Numeric(6, 4), nullable=False)
    prob_bust       = db.Column(db.Numeric(6, 4), nullable=False)
    prob_push       = db.Column(db.Numeric(6, 4), nullable=False)
    current_score   = db.Column(db.Integer, nullable=False)