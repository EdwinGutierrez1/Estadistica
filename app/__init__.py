from flask import Flask
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

db = SQLAlchemy()
socketio = SocketIO()
login_manager = LoginManager()


def create_app(config_override: dict = None) -> Flask:
    app = Flask(__name__)

    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-key')
    db_uri = (
        f"mysql+pymysql://{os.getenv('DB_USER', 'root')}:"
        f"{os.getenv('DB_PASSWORD', '')}@"
        f"{os.getenv('DB_HOST', 'localhost')}:"
        f"{os.getenv('DB_PORT', '3306')}/"
        f"{os.getenv('DB_NAME', 'blackjack_db')}"
        f"?charset=utf8mb4"
    )
    app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MIN_PLAYERS'] = int(os.getenv('MIN_PLAYERS', 3))
    app.config['MAX_PLAYERS'] = int(os.getenv('MAX_PLAYERS', 5))
    app.config['DECKS_COUNT'] = int(os.getenv('DECKS_COUNT', 1))

    if config_override:
        app.config.update(config_override)

    db.init_app(app)
    socketio.init_app(
        app,
        async_mode=os.getenv('SOCKETIO_ASYNC_MODE', 'eventlet'),
        cors_allowed_origins="*",
        logger=True,
        engineio_logger=False
    )
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    CORS(app, resources={r"/*": {"origins": "*"}})

    from app.routes.auth  import auth_bp
    from app.routes.rooms import rooms_bp
    from app.routes.game  import game_bp
    from app.routes.stats import stats_bp

    app.register_blueprint(auth_bp,  url_prefix='/auth')
    app.register_blueprint(rooms_bp, url_prefix='/rooms')
    app.register_blueprint(game_bp,  url_prefix='/game')
    app.register_blueprint(stats_bp, url_prefix='/stats')

    from app.sockets import game_events  # noqa: F401

    from app.models.player import Player

    @login_manager.user_loader
    def load_user(user_id: str):
        return Player.query.get(int(user_id))

    from flask import render_template

    @app.route('/')
    def index():
        return render_template('index.html')

    return app  