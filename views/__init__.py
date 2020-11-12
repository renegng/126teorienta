import datetime
import firebase_admin

from firebase_admin import auth, credentials
from flask import flash, render_template, jsonify, request, redirect, url_for
from flask import current_app as app
from flask_login import LoginManager, login_user, current_user, logout_user
from models.models import db, User


# Enable instance of SQLAlchemy
db.init_app(app)


# Enable Firebase Admin
cred = credentials.Certificate(app.config.get('GOOGLE_APPLICATION_CREDENTIALS'))
fba = firebase_admin.initialize_app(cred)


# Enable Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'home._welcome'
login_manager.login_message = 'Debes Iniciar sesión o Registrarte para ingresar.'

@login_manager.user_loader
def load_user(uid):
    if uid:
        return User.query.filter_by(uid = uid).first()
    return None

@login_manager.unauthorized_handler
def unauthorized():
    try:
        # Verify if there is a Valid Firebase Cookie and Creates a Session
        if verifyFirebaseCookieCreateSession():
            # Return to the URL accessed
            return redirect(request.url)
        else:
            flash('Debes Iniciar sesión o Registrarte para ingresar.', 'error')
            return redirect(url_for('home._welcome'))
    except Exception as e:
        app.logger.error('** SWING_CMS ** - UnauthorizedHandler Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


# Create a JSON Response
def createJsonResponse(status = 'error', cmd = None, action = None):
    jsonData = {
        'status': status,
        'cmd': cmd,
        'action': action
    }
    return jsonify(jsonData)


# Creates a Flask-Login Session instance
def createLoginSession(user):
    try:
        return login_user(user)
    except Exception as e:
        app.logger.error('** SWING_CMS ** - CreateLoginSession Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


# Creates a Firebase Cookie Session instance
def createCookieSession(idToken, cmd = None, action = None):
    try:
        # Set session expiration to 14 days.
        expires_in = datetime.timedelta(days = 14)

        # Set cookie policy for session cookie.
        expires = datetime.datetime.now() + expires_in

        # Create the session cookie. This will also verify the ID token in the process.
        # The session cookie will have the same claims as the ID token.
        session_cookie = auth.create_session_cookie(idToken, expires_in = expires_in)

        # Create an HTTP Response with a JSON Success Status and attach the cookie to it.
        response = createJsonResponse('success', cmd, action)

        if app.config['ENV'] == 'development':
            # Cookies for Development
            response.set_cookie(app.config['FIREBASE_COOKIE_NAME'], session_cookie, expires = expires, httponly = False, samesite = 'Lax', secure = False)
        else:
            # Cookies for Production
            response.set_cookie(app.config['FIREBASE_COOKIE_NAME'], session_cookie, expires = expires, httponly = True, samesite = 'Lax', secure = True)

        return response
    except Exception as e:
        app.logger.error('** SWING_CMS ** - CreateCookieSession Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


# Get User Redirect URL
def getUserRedirectURL(user, origin):
    try:
        redirectURL = '/'

        # Validate User Login Redirect URL
        if origin == 'loginuser':
            # Set URL for regular registered user
            redirectURL = '/chat/home/'

            # Iterate through the user's roles
            for role in user.roles:
                # Check if user has a different role than user
                if role.user_role.name_short != 'usr':
                    redirectURL = '/chat/admin/'
        
        # Validate Try Chat Redirect URL
        elif origin == 'chat':
            # Set URL for regular registered user
            redirectURL = '/chat/home/'

            # Iterate through the user's roles
            for role in user.roles:
                # Check if user has a different role than user
                if role.user_role.name_short != 'usr':
                    redirectURL = '/chat/admin/'

        
        return redirectURL
    except Exception as e:
        app.logger.error('** SWING_CMS ** - GetUserRedirectURL Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


# Verifies Firebase's Cookies Sessions
def isFirebaseCookieSessionValid():
    try:
        session_cookie = request.cookies.get(app.config['FIREBASE_COOKIE_NAME'])

        # Verify if cookie does not exist
        if not session_cookie:
            return False

        decoded_claims = auth.verify_session_cookie(session_cookie)        
        return decoded_claims
    except (auth.InvalidSessionCookieError, auth.ExpiredSessionCookieError) as e:
        app.logger.info('** SWING_CMS ** - IsFirebaseCookieSessionValid Invalid or Expired: {}'.format(e))
        return False
    except Exception as e:
        app.logger.error('** SWING_CMS ** - IsFirebaseCookieSessionValid Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


# Verifies if User has any Session and Redirects
def isUserLoggedInRedirect(origin, responseType):
    try:
        # Validate if the user has a Valid Session
        if current_user.is_authenticated:
            # If it has a valid Session, verifies the Firebase Cookie Session
            if isFirebaseCookieSessionValid():
                # Set URL depending on role
                url = getUserRedirectURL(current_user, origin)

                if responseType == 'redirect':
                    return redirect(url)
                elif responseType == 'jsonResponse':
                    return createJsonResponse('success', 'redirectURL', url)
            else:
                # If the Firebase Cookie Session is invalid, user is logged out and Login Process continues
                logout_user()
        else:
            # If user doesnt have a Valid Session, validate if it has a Firebase Cookie Session
            if verifyFirebaseCookieCreateSession():
                # Set URL depending on role
                url = getUserRedirectURL(current_user, origin)

                if responseType == 'redirect':
                    return redirect(url)
                elif responseType == 'jsonResponse':
                    return createJsonResponse('success', 'redirectURL', url)
        
        return None
    except Exception as e:
        app.logger.error('** SWING_CMS ** - IsUserLoggedIn Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


# Remove Item from List
def removeItemFromList(lst, k, v):
    for listItem in lst:
        if listItem.get(k) == v:
            lst.remove(listItem)


# Update Item from List
def updateItemFromList(lst, k, v, obj, updK, updV, updObj):
    for listItem in lst:
        if obj is None:
            if listItem.get(k) == v:
                if updObj is not None:
                    listItem.get(updObj, {})[updK] = updV
                else:
                    listItem[updK] = updV
        else:
            if listItem.get(obj, {}).get(k) == v:
                if updObj is not None:
                    listItem.get(updObj, {})[updK] = updV
                else:
                    listItem[updK] = updV


# Verifies a Firebase Session Cookie and Creates a Flask Login Session
def verifyFirebaseCookieCreateSession():
    try:
        # First, verify if there is a Valid Firebase Cookie
        # decoded_claims returns TRUE and a JWT dictionary if valid
        decoded_claims = isFirebaseCookieSessionValid()
        if decoded_claims:
            uid = decoded_claims['uid']
            # Search for the user in the DB.
            user = User.query.filter_by(uid = uid).first()
            # Create User Session
            return createLoginSession(user)
        else:
            return False
    except Exception as e:
        app.logger.error('** SWING_CMS ** - VerifyFirebaseCookieCreateSession Error: {}'.format(e))
        return jsonify({ 'status': 'error' })

