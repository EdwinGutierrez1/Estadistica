from app import db
from flask_login import UserMixin
from datetime import datetime


class Player(UserMixin, db.Model):
    __tablename__ = 'players'

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username   = db.Column(db.String(50), nullable=False, unique=True)
    email      = db.Column(db.String(100), unique=True)
    chips      = db.Column(db.Integer, nullable=False, default=1000)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    last_seen  = db.Column(db.DateTime, onupdate=datetime.utcnow)

    hands = db.relationship('PlayerHand', backref='player', lazy='dynamic')

    def to_dict(self) -> dict:
        return {
            'id':       self.id,
            'username': self.username,
            'chips':    self.chips,
        }

    def __repr__(self):
        return f'<Player {self.username}>'