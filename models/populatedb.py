from datetime import datetime as dt
from datetime import timezone as tz
from flask import current_app as app
from flask import jsonify
from models import db, CatalogServices, CatalogOperations, CatalogUserRoles, RTCOnlineUsers, User, UserXRole
from models import CatalogSurveysAnswerTypes, Surveys, SurveysQuestions

# -----------------------------------------------------------------------------------------------------
# DATABASE MINIMUM REQUIRED DATA
# POPULATION FUNCTIONS
# -----------------------------------------------------------------------------------------------------

# Initialize Database Populate Function
def initPopulateDB():
    # Add Surveys Answer Types Catalog
    populateSurveysAnswerTypesCatalog()

    # Add Survey - User Satisfaction
    populateSurveyUserSatisfaction()

    # Add Operations Catalog
    populateCatalogOperations()

    # Add User Roles Catalog
    populateCatalogUserRoles()

    # Add Services Catalog
    populateServicesCatalog()

    # Add Default Users
    populateDefaultUsers()

    # Add Default RTC_OUL
    populateDefaultRTC_OUL()

    app.logger.info('** SWING_CMS ** - Populate Database FINISHED.')


# Populate Default RTC Online User List
def populateDefaultRTC_OUL():
    try:
        app.logger.debug('** SWING_CMS ** - Populate Default RTC Online User List')

        #Add Default RTC_OUL JSON
        nowdt = dt.now(tz.utc)
        operation = CatalogOperations.query.filter_by(name_short='ins').first()

        rtc_oul = RTCOnlineUsers()
        rtc_oul.id = nowdt
        rtc_oul.operation_id = operation.id
        rtc_oul.userlist = {
            'rtc_online_users': {
                'id': str(nowdt),
                'anon_users': [],
                'emp_users': [],
                'reg_users': []
            }
        }
        rtc_oul.enabled = True
        db.session.add(rtc_oul)

        db.session.commit()

        return jsonify({ 'status': 'success' })
    except Exception as e:
        app.logger.error('** SWING_CMS ** - Populate Default RTC Online User List Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


# Populate Default Users
def populateDefaultUsers():
    try:
        app.logger.debug('** SWING_CMS ** - Populate Default Users')

        # Add Admin User
        admin_user = User()
        admin_user.uid = '126-Administrator'
        admin_user.email = 'admusr@126.gob.sv'
        admin_user.name = '126 Administrador'
        admin_user.cmuserid = '126-ADM-200000-0001'
        db.session.add(admin_user)
        db.session.flush()
        # Add Admin Role
        admin_role = CatalogUserRoles.query.filter_by(name_short='adm').first()
        admin_userxrole = UserXRole()
        admin_userxrole.user_id = admin_user.id
        admin_userxrole.user_role_id = admin_role.id
        db.session.add(admin_userxrole)

        db.session.commit()

        # Add Anon User
        anon_user = User()
        anon_user.uid = '126-Anonim@'
        anon_user.email = 'anon@126.gob.sv'
        anon_user.name = 'Anonim@'
        anon_user.cmuserid = '126-ANN-200000-0001'
        db.session.add(anon_user)
        db.session.flush()
        # Add User Role
        user_role = CatalogUserRoles.query.filter_by(name_short='usr').first()
        anon_userxrole = UserXRole()
        anon_userxrole.user_id = anon_user.id
        anon_userxrole.user_role_id = user_role.id
        db.session.add(anon_userxrole)

        db.session.commit()

        return jsonify({ 'status': 'success' })
    except Exception as e:
        app.logger.error('** SWING_CMS ** - Populate Default Users Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


# Populate Catalog Services Data
def populateServicesCatalog():
    try:
        app.logger.debug('** SWING_CMS ** - Populate Catalog Services')

        # Add Services
        psy_role = CatalogUserRoles.query.filter_by(name_short='psi').first()
        psychology = CatalogServices(name='Apoyo psicológico', name_short='psi', service_user_role=psy_role.id)
        db.session.add(psychology)

        law_role = CatalogUserRoles.query.filter_by(name_short='abo').first()
        lawyer = CatalogServices(name='Asistencia legal', name_short='abo', service_user_role=law_role.id)
        db.session.add(lawyer)

        soc_role = CatalogUserRoles.query.filter_by(name_short='soc').first()
        social = CatalogServices(name='Apoyo social', name_short='soc', service_user_role=soc_role.id)
        db.session.add(social)

        groups = CatalogServices(name='Grupos de autoayuda', name_short='gaa')
        db.session.add(groups)
        
        db.session.commit()

        return jsonify({ 'status': 'success' })
    except Exception as e:
        app.logger.error('** SWING_CMS ** - Populate Catalog Services Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


# Populate Surveys Answer Types
def populateSurveysAnswerTypesCatalog():
    try:
        app.logger.debug('** SWING_CMS ** - Populate Catalog Surveys Answer Types')

        # Add Answer Types
        checkboxes = CatalogSurveysAnswerTypes(name='Selección Múltiple', name_short='chk')
        db.session.add(checkboxes)

        radios = CatalogSurveysAnswerTypes(name='Selección Única', name_short='rad')
        db.session.add(radios)
        
        satisfaction = CatalogSurveysAnswerTypes(name='Rango de Satisfacción (3 Niveles)', name_short='sat_3')
        db.session.add(satisfaction)

        satisfactionFaces = CatalogSurveysAnswerTypes(name='Rango de Satisfacción (3 Caritas)', name_short='sat_3f')
        db.session.add(satisfactionFaces)

        textbox = CatalogSurveysAnswerTypes(name='Respuesta de Usuario', name_short='txt')
        db.session.add(textbox)

        db.session.commit()

        return jsonify({ 'status': 'success' })
    except Exception as e:
        app.logger.error('** SWING_CMS ** - Populate Catalog Surveys Answer Types Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


# Populate Survey - User Satisfaction
def populateSurveyUserSatisfaction():
    try:
        app.logger.debug('** SWING_CMS ** - Populate Survey User Satisfaction')

        # Add Questions
        ans_type = CatalogSurveysAnswerTypes.query.filter_by(name_short='sat_3f').first()

        question01 = SurveysQuestions(
            question = '¿Cómo calificas tu experiencia con el servicio recibido?',
            question_answers = {
                'a_1': 'sentiment_very_dissatisfied',
                'a_2': 'sentiment_satisfied',
                'a_3': 'sentiment_very_satisfied'
            },
            answers_type = ans_type.id
        )
        db.session.add(question01)

        question02 = SurveysQuestions(
            question = '¿Cómo calificas tu experiencia con la plataforma?',
            question_answers = {
                'a_1': 'sentiment_very_dissatisfied',
                'a_2': 'sentiment_satisfied',
                'a_3': 'sentiment_very_satisfied'
            },
            answers_type = ans_type.id
        )
        db.session.add(question02)

        db.session.commit()

        # Add Survey and it's Questions
        userSatisfactionSurvey = Surveys(
            name = 'Encuesta de satisfacción de atención.',
            name_short = 'uss',
            description = 'Encuesta de satisfacción de usuario sobre la atención recibida y el uso de la plataforma.',
            questions = {
                'q_1': question01.id,
                'q_2': question02.id
            }
        )
        db.session.add(userSatisfactionSurvey)

        db.session.commit()

        return jsonify({ 'status': 'success' })
    except Exception as e:
        app.logger.error('** SWING_CMS ** - Populate Survey User Satisfaction Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


# Populate Catalog Operations Data
def populateCatalogOperations():
    try:
        app.logger.debug('** SWING_CMS ** - Populate Catalog Operations')

        # Add Operation
        insert = CatalogOperations(name='Inserción', name_short='ins')
        db.session.add(insert)

        delete = CatalogOperations(name='Eliminación', name_short='del')
        db.session.add(delete)

        update = CatalogOperations(name='Actualización', name_short='upd')
        db.session.add(update)

        read = CatalogOperations(name='Lectura', name_short='read')
        db.session.add(read)

        connect = CatalogOperations(name='Conexión', name_short='con')
        db.session.add(connect)

        disconnect = CatalogOperations(name='Desconexión', name_short='dcon')
        db.session.add(disconnect)

        db.session.commit()

        return jsonify({ 'status': 'success' })
    except Exception as e:
        app.logger.error('** SWING_CMS ** - Populate Catalog Operations Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


# Populate Catalog User Roles Data
def populateCatalogUserRoles():
    try:
        app.logger.debug('** SWING_CMS ** - Populate Catalog User Roles')

        # Add User Roles
        user_role = CatalogUserRoles(name='Usuario', name_short='usr')
        db.session.add(user_role)

        admin_role = CatalogUserRoles(name='Administrador', name_short='adm')
        db.session.add(admin_role)
        
        counselor_role = CatalogUserRoles(name='Orientadora', name_short='ori')
        db.session.add(counselor_role)

        lawyer_role = CatalogUserRoles(name='Abogada', name_short='abo')
        db.session.add(lawyer_role)

        psych_role = CatalogUserRoles(name='Psicóloga', name_short='psi')
        db.session.add(psych_role)

        social_role = CatalogUserRoles(name='Trabajadora Social', name_short='soc')
        db.session.add(social_role)

        coordinator_role = CatalogUserRoles(name='Coordinadora', name_short='coo')
        db.session.add(coordinator_role)

        db.session.commit()

        return jsonify({ 'status': 'success' })
    except Exception as e:
        app.logger.error('** SWING_CMS ** - Populate Catalog User Roles Error: {}'.format(e))
        return jsonify({ 'status': 'error' })

