from swing_main import app
from views.socketio import socketio

socketio.init_app(app)
app.logger.info("** SWING_CMS ** - FLASK_SOCKETIO IMPLEMENTATION")

if __name__ == '__main__':
    socketio.run(app)
