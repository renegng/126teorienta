from . import auth, createCookieSession, createLoginSession, createJsonResponse, db, getUserRedirectURL, isUserLoggedInRedirect

from babel.dates import format_date, format_datetime, format_time
from datetime import datetime as dt
from datetime import timedelta as td
from datetime import timezone as tz
from flask import Blueprint, redirect, render_template, request, url_for, jsonify, make_response
from flask import current_app as app
from flask_login import logout_user, current_user, login_required
from models.models import Appointments, CatalogIDDocumentTypes, CatalogServices, CatalogUserRoles, User, UserXRole, UserXEmployeeAssigned

home = Blueprint('home', __name__, template_folder='templates', static_folder='static')

# Creates Timestamps without UTC for JavaScript handling:
# utcDate.replace(tzinfo=tz.utc).timestamp()
#
# Creates Dates witout UTC for Python handling:
# utcDate.replace(tzinfo=tz.utc).astimezone(tz=None)

@home.route('/')
def _index():
    app.logger.debug('** SWING_CMS ** - Index')
    return redirect(url_for('home._welcome'))


@home.route('/autocuidado/')
def _autocuidado():
    app.logger.debug('** SWING_CMS ** - Autocuidado')
    return render_template('autocuidado.html')


# Create appointment response
def _appointment_response(details, apptList, cmd = 'for'):
    app.logger.debug('** SWING_CMS ** - Citas Crear Response')
    try:
        if details is not None:
            for record in details:
                usr_for = User.query.filter_by(id = record.created_for).first()
                emp_crt = User.query.filter_by(id = record.created_by).first()
                emp_tab = UserXEmployeeAssigned.query.filter_by(id = record.emp_assigned).first()
                emp_asg = User.query.filter_by(id = emp_tab.employee_id).first()
                service = CatalogServices.query.filter_by(id = record.service_id).first()
                time_sf = record.date_scheduled + td(minutes = service.duration_minutes)
                time_end_local = time_sf.replace(tzinfo=tz.utc).astimezone(tz=None)
                time_start_local = record.date_scheduled.replace(tzinfo=tz.utc).astimezone(tz=None)
                daytime = None
                if time_start_local.hour >= 0 and time_start_local.hour < 6:
                    daytime = 'dawn'
                elif time_start_local.hour >= 6 and time_start_local.hour < 12:
                    daytime = 'morning'
                elif time_start_local.hour >= 12 and time_start_local.hour < 18:
                    daytime = 'evening'
                elif time_start_local.hour >= 18 and time_start_local.hour <= 23:
                    daytime = 'night'
                
                apptList.append({
                    'id': record.id,
                    'appointment_type': cmd,
                    'cancelled': record.cancelled,
                    'created_by': {
                        'name': emp_crt.name
                    },
                    'created_for': {
                        'attended': record.usr_attendance,
                        'name': usr_for.name
                    },
                    'date_created': record.date_created,
                    'date_timestamp': int(record.date_scheduled.replace(tzinfo=tz.utc).timestamp() * 1000),
                    'date_scheduled': format_date(time_start_local, "EEEE, dd 'de' MMMM 'del' yyyy", locale='es').capitalize(),
                    'time_scheduled_start': format_time(time_start_local, "hh:mm a", locale='en'),
                    'time_scheduled_end': format_time(time_end_local, "hh:mm a", locale='en'),
                    'emp_assigned': {
                        'accepted': record.emp_accepted,
                        'attended': record.emp_attendance,
                        'name': emp_asg.name
                    },
                    'service': {
                        'duration': service.duration_minutes,
                        'name': service.name,
                        'name_short': service.name_short,
                        'time_of_day': daytime
                    }
                })
    except Exception as e:
        app.logger.error('** SWING_CMS ** - Citas Crear Response Error: {}'.format(e))
        return jsonify({ 'status': 'error' })

@home.route('/appointments/')
@login_required
def _appointments():
    app.logger.debug('** SWING_CMS ** - Citas')
    try:
        dt_today = dt.now(tz.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        response = {
            'appointments_created_by': [],
            'appointments_created_for_e': [],
            'appointments_created_for_u': [],
            'datetime': str(dt_today)
        }

        if current_user.is_user_role(['adm', 'ori', 'abo', 'psi', 'soc', 'coo']):
            # Get Appointments for Employees (Assigned and Created By)

            # Appointments - created_by
            details_by = Appointments.query.filter(
                Appointments.created_by == current_user.id,
                Appointments.cancelled == False,
                Appointments.date_scheduled >= dt_today
            ).order_by(Appointments.date_scheduled.asc())

            _appointment_response(details_by, response['appointments_created_by'], 'by')

            # Appointments - created_for_e (emp_assigned)
            details_for = Appointments.query.join(UserXEmployeeAssigned).filter(
                Appointments.date_scheduled >= dt_today,
                UserXEmployeeAssigned.user_id == Appointments.created_for,
                UserXEmployeeAssigned.employee_id == current_user.id,
                Appointments.cancelled == False
            ).order_by(Appointments.date_scheduled.asc())

            _appointment_response(details_for, response['appointments_created_for_e'], 'assigned')
        else:
            # Get Appointments for Users (Created For)
            
            # Appointments - created_for_u
            details = Appointments.query.filter(
                Appointments.created_for == current_user.id,
                Appointments.cancelled == False,
                Appointments.date_scheduled >= dt_today
            ).order_by(Appointments.date_scheduled.asc())

            _appointment_response(details, response['appointments_created_for_u'])

        return render_template('appointments.html', appointments=response)
    except Exception as e:
        app.logger.error('** SWING_CMS ** - Citas Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


@home.route('/appointments/create/')
@login_required
def _appointmentscreate():
    app.logger.debug('** SWING_CMS ** - Crear Citas')
    return render_template('appointments_create.html')


@home.route('/appointments/create/admin/')
@login_required
def _appointmentscreateadmin():
    app.logger.debug('** SWING_CMS ** - Crear Citas Admin')
    try:
        srv = CatalogServices.query.filter_by(enabled = True).order_by(CatalogServices.name.asc())
        ids = CatalogIDDocumentTypes.query.filter_by(enabled = True).order_by(CatalogIDDocumentTypes.name.asc())
        return render_template('appointments_create_admin.html', services=srv, ids_docs_types=ids)
    except Exception as e:
        app.logger.error('** SWING_CMS ** - Crear Citas Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


@home.route('/chat/')
def _chat():
    app.logger.debug('** SWING_CMS ** - Try Chat')
    try:
        # Validate if the user has a Valid Session and Redirects
        response = isUserLoggedInRedirect('chat', 'redirect')
        if response is not None: return response
        
        return render_template('chat.html')
    except Exception as e:
        app.logger.error('** SWING_CMS ** - Try Chat Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


@home.route('/chat/admin/')
@login_required
def _chat_admin():
    app.logger.debug('** SWING_CMS ** - Chat Admin')
    return render_template('chat_admin.html')


@home.route('/chat/home/')
@login_required
def _chat_home():
    app.logger.debug('** SWING_CMS ** - Chat Home')
    return render_template('chat_home.html')


# @home.route('/components/')
# def _components():
#     app.logger.debug('** SWING_CMS ** - Components')
#     return render_template('components.html')


@home.route('/coronavirus/')
def _coronavirus():
    app.logger.debug('** SWING_CMS ** - Coronavirus')
    return render_template('coronavirus.html')


@home.route('/comoiniciar/')
def _comoiniciarsesion():
    app.logger.debug('** SWING_CMS ** - Como Iniciar Sesion')
    return render_template('comoiniciarsesion.html')


@home.route('/dirservicios/')
def _dirservicios():
    app.logger.debug('** SWING_CMS ** - Directorio de Servicios')
    return render_template('directorio_servicios.html')


@home.route('/home/')
@login_required
def _home():
    app.logger.debug('** SWING_CMS ** - Home')
    return render_template('home.html')


@home.route('/login/')
def _login():
    app.logger.debug('** SWING_CMS ** - Login')
    return render_template('login.html')


@home.route('/loginuser/', methods=['POST'])
def _loginuser():
    app.logger.debug('** SWING_CMS ** - Login')
    try:
        # Validate if the user has a Valid Session and Redirects
        response = isUserLoggedInRedirect('loginuser', 'jsonResponse')
        if response is not None: return response
        
        # Login Process
        # Retrieve the uid from the JWT idToken
        idToken = request.json['idToken']
        decoded_token = auth.verify_id_token(idToken)
        usremail = decoded_token['email']
        uid = decoded_token['uid'] if usremail != 'admusr@126.gob.sv' else '126-Administrator'

        # Search for the user in the DB.
        user = User.query.filter_by(uid = uid).first()
        if user is None:
            # Retrieve Firebase's User info
            fbUser = auth.get_user(uid)

            # User is not registered on DB. Insert user in DB.
            user = User()
            user.uid = uid
            user.email = fbUser.email
            user.name = fbUser.display_name
            user.phonenumber = fbUser.phone_number
            user.datecreated = dt.now(tz.utc)
            user.cmuserid = '126-' + user.name.strip().upper()[0:1] + user.datecreated.strftime('-%y%m%d-%H%M%S')
            db.session.add(user)
            db.session.flush()

            # Add User Role
            user_role = CatalogUserRoles.query.filter_by(name_short='usr').first()
            user_userxrole = UserXRole()
            user_userxrole.user_id = user.id
            user_userxrole.user_role_id = user_role.id
            db.session.add(user_userxrole)

            db.session.commit()
            app.logger.info('** SWING_CMS ** - LoginUser added: {}'.format(user.id))
        
        # Create User Session
        createLoginSession(user)
        
        # Return Session Cookie
        # Set URL depending on role
        url = getUserRedirectURL(user, 'loginuser')
        
        response = createCookieSession(idToken, 'redirectURL', url)
        return response

    except Exception as e:
        app.logger.error('** SWING_CMS ** - LoginUser Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


@home.route('/logoutuser/')
@login_required
def _logoutuser():
    app.logger.debug('** SWING_CMS ** - Logout')
    try:
        # First, user is logged out from Flask Login Session
        logout_user()

        response = make_response(redirect(url_for('home._welcome')))

        # Second, user is logged out from Firebase Cookie Session
        # The Firebase Cookie is cleared
        response.set_cookie(app.config['FIREBASE_COOKIE_NAME'], expires=0)

        return response
    except Exception as e:
        app.logger.error('** SWING_CMS ** - LogoutUser Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


@home.route('/politicaprivacidad/')
def _politicaprivacidad():
    app.logger.debug('** SWING_CMS ** - PoliticaPrivacidad')
    return render_template('politicaprivacidad.html')


@home.route('/recursos/')
def _recursos():
    app.logger.debug('** SWING_CMS ** - Recursos')
    return render_template('recursos.html')


@home.route('/sobrenosotras/')
def _sobrenosotros():
    app.logger.debug('** SWING_CMS ** - SobreNosotras')
    return render_template('sobrenosotras.html')


@home.route('/terminosdelservicio/')
def _terminosdelservicio():
    app.logger.debug('** SWING_CMS ** - TerminosDelServicio')
    return render_template('terminosdelservicio.html')


@home.route('/welcome/')
def _welcome():
    app.logger.debug('** SWING_CMS ** - Welcome')
    return render_template('welcome.html')
