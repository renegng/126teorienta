from flask import Flask
from instance.config_app import configType as cfgapp
from instance.config_firebase import configType as cfgfirebase
from instance.config_models import configType as cfgmodels

# Enables Instance Folder Configuration (instance_relative_config=True) 
app = Flask(__name__, instance_relative_config=True)

# Configuration Files From Instance Folder
cfgType = app.config['ENV']
app.config.from_object(cfgapp[cfgType])
app.config.from_object(cfgfirebase[cfgType])
app.config.from_object(cfgmodels[cfgType])

app.logger.info("** SWING_CMS ** - CONFIG: {}".format(app.config))

with app.app_context():
    from views.home import home as home_view
    from views.seo import seo as seo_view
    from views.socketio import sio as sio_view

    # Home
    app.register_blueprint(home_view)

    # Search Engine Optimization - SEO
    app.register_blueprint(seo_view)

    # SocketIO Events
    app.register_blueprint(sio_view)

    # Register the Service Worker
    @app.route('/sw.js', methods=['GET'])
    def serviceworker():
        return app.send_static_file('js/sw.js')

    