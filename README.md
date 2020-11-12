# 126 Te Orienta
126 Te Orienta, Progressive Web App

-RXDBit

# Requirements

Swing CMS, Contact-Os, 126 Te Orienta is being develop with the following libraries:
- Python 3.6.6 (on a virtual environment)
- Python pip 10.0.1
- Flask 1.0.2
- Apache HTTPD 2.4.18
- Nginx and Gunicorn 20.0.4
- SocketIO 2.3.0, Flask-SocketIO 4.3.0 and SimplePeer 9.7
- libapache2-mod-wsgi-py3
- NodeJS 10.1.0
- npm 6.0.1
- npm libraries:
    - webpack@4
    - css-loader
    - sass-loader
    - node-sass
    - extract-loader
    - file-loader
    - babel-core 
    - babel-loader
    - material-components-web
    - aos (animation on scroll)


# Installation steps

To install Swing CMS, follow the next steps (under Ubuntu 16.04):

1 - Create a directory into which clone Swing CMS. If it's being deployed on a web server, like Apache HTTPD, create it under the proper directory. (i.e.: /var/www/)

2 - Install git:

    ~: sudo add-apt-repository ppa:git-core/ppa

    ~: sudo apt update

    ~: sudo apt-get install git

3 - Clone Swing CMS from GitHub's repository:

    ~: git clone git@github.com:renegng/126teorienta.git

4 - Inside the prevoius folder, install a Python 3.5 or greater virtual environment and the RDBMS (MySQL) prerequisites:

    ~: [python | python3 | python3.6 | python3.x] -m venv venv
    ~: sudo apt-get install build-essential python3-dev libmysqlclient-dev

5 - Inside the prevoius folder, activate the virtual environment:

    ~: source ./venv/bin/activate

6 - Within the activated virtual environment, install Flask and all PiP applications:

    You could install all packages automatically:

    ~: pip install -r requirements.txt

    or independently:

    ~: pip install wheel
    ~: pip install flask
    ~: pip install flask-login
    ~: pip install flask-sqlalchemy
    ~: pip install flask-migrate
    ~: pip install flask-wtf
    ~: pip install flask-socketio
    ~: pip install gunicorn[eventlet]
    ~: pip install psycopg2-binary
    ~: pip install firebase-admin
    ~: pip install mysqlclient

    For ChatBot component, install following packages:
    ~: pip install chatterbot
    ~: pip install pyyaml
    ~: pip install spacy
    ~: spacy download es

    ~: deactivate

7 - Install the appropriate plugin for Flask and Python to be executed on the web server:

    ~: sudo apt-get install [libapache2-mod-wsgi-py3 | nginx]

8 - Instal NodeJS:

    ~: curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -

    ~: sudo apt-get install -y nodejs

9 - Execute NodeJS's npm to install all libraries needed:

    ~: npm install
    ~: rm node_modules/aos/.babelrc
    ~: npm run build-prd-wp

** - AOS can sometimes generate some issues. To prevent that delete the .babelrc file under the node_modules/aos folder.

10 - Copy/configure the instance folder with all proper credentials and configurations:
    
    + firebase-admin-key
    + firebase-api-init
    + firebase-key
    + config_app
    + config_firebase
    + config_models

11 - Execute models/ddl.py to generate the database.

12 - Deploy your webserver:

    + Apache HTTPD - swing_cms.apache2.conf
    OR
    + Nginx/Gunicorn - swing_cms-socketio.*.conf


# Credits to

Proper credit for the following people/teams:
- Apache HTTPD, web server that never fails.
- Google's Material Design, Workbox and Firebase team, for making the web awesome!
- Polymer Project, for an amazing main HTML PWA Template structure.
- Python, Flask, NodeJS, SQLAlchemy, Migrate, Alembic, WTForms, Login, GitHub and everyone's amazing frameworks.
- PeerJS, simple-peer, SaltyRTC for their wonderful frameworks to implement WebRTC.
- Traversy Media, for incredible tips & tricks overall.
- Visual Studio Code, for an incredible IDE.
- Twitter Twemoji for the amazing emojis.
- Ubuntu team, stable OS to work on.
- Animate.css from <a href="https://animate.style/" title="Animate CSS">animate.style/</a> for their amazing css animations!
- Icons made by <a href="http://www.freepik.com/" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
- Icons made by <a href="https://www.flaticon.com/authors/vitaly-gorbachev" title="Vitaly Gorbachev">Vitaly Gorbachev</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
- Anchorme for URL detection and replacement
