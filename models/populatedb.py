import datetime

from flask import current_app as app
from flask import jsonify
from models import db, CatalogOperations, CatalogUserRoles, RTCOnlineUsers, User, UserXRole

# -----------------------------------------------------------------------------------------------------
# DATABASE MINIMUM REQUIRED DATA
# POPULATION FUNCTIONS
# -----------------------------------------------------------------------------------------------------

# Initialize Database Populate Function
def initPopulateDB():
    # Add Operations Catalog
    populateCatalogOperations()

    # Add User Roles Catalog
    populateCatalogUserRoles()

    # Add Default Users
    populateDefaultUsers()

    # Add Default RTC_OUL
    populateDefaultRTC_OUL()


# Populate Default RTC Online User List
def populateDefaultRTC_OUL():
    try:
        app.logger.debug('** SWING_CMS ** - Populate Default RTC Online User List')

        #Add Default RTC_OUL JSON
        nowdt = datetime.datetime.utcnow()
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
        
        staff_role = CatalogUserRoles(name='Empleado', name_short='emp')
        db.session.add(staff_role)

        db.session.commit()

        return jsonify({ 'status': 'success' })
    except Exception as e:
        app.logger.error('** SWING_CMS ** - Populate Catalog User Roles Error: {}'.format(e))
        return jsonify({ 'status': 'error' })

