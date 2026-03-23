import eventlet
eventlet.monkey_patch()

from app import create_app, socketio
import os

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'

    print(f"""
╔══════════════════════════════════════════╗
║     BLACKJACK ACADÉMICO — INICIANDO      ║
╠══════════════════════════════════════════╣
║  Puerto:  {port:<31} ║
║  Debug:   {str(debug):<31} ║
║  URL:     http://localhost:{port:<14} ║
╚══════════════════════════════════════════╝
    """)

    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=debug,
        use_reloader=False,
        log_output=True
    )
