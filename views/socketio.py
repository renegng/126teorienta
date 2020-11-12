import datetime, json

from . import db, removeItemFromList, updateItemFromList
from flask import current_app as app
from flask import Blueprint, request, jsonify
from flask_login import current_user
from flask_socketio import SocketIO, close_room, join_room, leave_room, rooms
from models.models import CatalogOperations, CatalogUserRoles, LogUserConnections, RTCOnlineUsers, User

sio = Blueprint('sio', __name__, template_folder='templates', static_folder='static')

# Instantiate SocketIO
socketio = SocketIO()

@socketio.on('connect')
def _connect():
    app.logger.debug('** SWING_CMS ** - SocketIO User Connected')
    try:
        # Retrieve User
        user = current_user if current_user.is_authenticated else User.query.filter_by(uid='126-Anonim@').first()

        # Retrieve User IP Address
        ip = request.environ.get('HTTP_X_REAL_IP', request.remote_addr)

        # Add User to RTC Online Users List
        cur_oul = RTCOnlineUsers.query.with_for_update().order_by(RTCOnlineUsers.id.desc()).first()
        dt_now = datetime.datetime.utcnow()
        rtc_user = {
            'id': user.id,
            'r_id': str(request.sid),
            'userInfo': {
                'activity': int(int(dt_now.strftime('%s%f'))/1000),
                'assignedTo': None,
                'ip': str(ip),
                'name': user.name,
                'photoURL': request.args.get('photoURL'),
                'roles': user.get_user_roles(),
                'status': 'Disponible'
            }
        }
        
        # Retrieve the user list depending on the user's role and Append User into the list
        new_oul = cur_oul
        if current_user.is_authenticated:
            if current_user.is_user_role(['adm', 'emp']):
                new_oul.userlist.get('rtc_online_users', {}).get('emp_users').append(rtc_user)
            else:
                new_oul.userlist.get('rtc_online_users', {}).get('reg_users').append(rtc_user)
        else:
            new_oul.userlist.get('rtc_online_users', {}).get('anon_users').append(rtc_user)

        new_userlist = new_oul.userlist
        
        oper = CatalogOperations.query.filter_by(name_short='ins').first()
        new_oul.userlist.get('rtc_online_users', {})['id'] = str(dt_now)
        new_rtc_oul = RTCOnlineUsers()
        new_rtc_oul.id = dt_now
        new_rtc_oul.operation_id = oper.id
        new_rtc_oul.userlist = new_userlist
        db.session.add(new_rtc_oul)

        cur_oul.enabled = False
        db.session.add(cur_oul)

        # Log User Connection
        oper = CatalogOperations.query.filter_by(name_short='con').first()
        log_uc = LogUserConnections()
        log_uc.id = dt_now
        log_uc.sid = request.sid
        log_uc.user_id = user.id
        log_uc.operation_id = oper.id
        log_uc.ip_address = ip
        db.session.add(log_uc)

        db.session.commit()

        # Add Employee to Room and Send User List
        if current_user.is_authenticated:
            if current_user.is_user_role(['adm', 'emp']):
                join_room('126-EMPS')
        
        socketio.emit('userIsConnected', { 'status' : 'success', 'id' : user.id, 'roles' : user.get_user_roles() }, room=request.sid)
        socketio.emit('RTCUserList', new_userlist, room='126-EMPS')
    except Exception as e:
        app.logger.error('** SWING_CMS ** - SocketIO User Connected Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


@socketio.on('disconnect')
def _disconnect():
    app.logger.debug('** SWING_CMS ** - SocketIO User Disconnected')
    try:
        # Retrieve User
        user = current_user if current_user.is_authenticated else User.query.filter_by(uid='126-Anonim@').first()

        # Retrieve User IP Address
        ip = request.remote_addr

        # Remove User to RTC Online Users List
        cur_oul = RTCOnlineUsers.query.with_for_update().order_by(RTCOnlineUsers.id.desc()).first()
        dt_now = datetime.datetime.utcnow()
        
        # Retrieve the user list depending on the user's role and Remove User from List
        new_oul = cur_oul
        if current_user.is_authenticated:
            if current_user.is_user_role(['adm', 'emp']):
                removeItemFromList(new_oul.userlist.get('rtc_online_users', {}).get('emp_users'), 'id', user.id)
                
                # Update all users assigned status back to default
                new_usr_status = 'Disponible'

                # Depending on the type of User, update it's status
                ulist = new_oul.userlist.get('rtc_online_users', {}).get('anon_users')
                updateItemFromList(ulist, 'assignedTo', current_user.id, 'userInfo', 'status', new_usr_status, 'userInfo')
                updateItemFromList(ulist, 'assignedTo', current_user.id, 'userInfo', 'assignedTo', None, 'userInfo')
                updateItemFromList(ulist, 'assignedTo', current_user.id, 'userInfo', 'activity', int(int(dt_now.strftime('%s%f'))/1000), 'userInfo')
                
                ulist = new_oul.userlist.get('rtc_online_users', {}).get('reg_users')
                updateItemFromList(ulist, 'assignedTo', current_user.id, 'userInfo', 'status', new_usr_status, 'userInfo')
                updateItemFromList(ulist, 'assignedTo', current_user.id, 'userInfo', 'assignedTo', None, 'userInfo')
                updateItemFromList(ulist, 'assignedTo', current_user.id, 'userInfo', 'activity', int(int(dt_now.strftime('%s%f'))/1000), 'userInfo')
            else:
                removeItemFromList(new_oul.userlist.get('rtc_online_users', {}).get('reg_users'), 'id', user.id)
        else:
            removeItemFromList(new_oul.userlist.get('rtc_online_users', {}).get('anon_users'), 'r_id', str(request.sid))
        
        new_userlist = new_oul.userlist

        oper = CatalogOperations.query.filter_by(name_short='dcon').first()
        new_oul.userlist.get('rtc_online_users', {})['id'] = str(dt_now)
        new_rtc_oul = RTCOnlineUsers()
        new_rtc_oul.id = dt_now
        new_rtc_oul.operation_id = oper.id
        new_rtc_oul.userlist = new_userlist
        db.session.add(new_rtc_oul)

        cur_oul.enabled = False
        db.session.add(cur_oul)

        # Log User Disconnection
        oper = CatalogOperations.query.filter_by(name_short='dcon').first()
        log_ud = LogUserConnections()
        log_ud.id = dt_now
        log_ud.sid = request.sid
        log_ud.user_id = user.id
        log_ud.operation_id = oper.id
        log_ud.ip_address = ip
        db.session.add(log_ud)

        db.session.commit()

        # Remove Employee to Room
        if current_user.is_authenticated:
            if current_user.is_user_role(['adm', 'emp']):
                leave_room('126-EMPS')
        
        socketio.emit('RTCUserList', new_userlist, room='126-EMPS')
    except Exception as e:
        app.logger.error('** SWING_CMS ** - SocketIO User Disconnected Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


@socketio.on('endRTC')
def _endrtc(js):
    app.logger.debug('** SWING_CMS ** - SocketIO EndRTC')
    try:
        j = json.loads(js)
        emp_id = j['e_id']
        usr_id = j['u_id']
        usr_type = j['u_type']

        # Remove User to RTC Online Users List
        cur_oul = RTCOnlineUsers.query.with_for_update().order_by(RTCOnlineUsers.id.desc()).first()
        dt_now = datetime.datetime.utcnow()
        
        # Depending on the type of User, remove the user
        new_oul = cur_oul
        if usr_type == 'anon':
            ulist = new_oul.userlist.get('rtc_online_users', {}).get('anon_users')
            removeItemFromList(ulist, 'r_id', usr_id)
        elif usr_type == 'emp':
            urooms = rooms(usr_id)
            if len(urooms) <= 0:
                ulist = new_oul.userlist.get('rtc_online_users', {}).get('emp_users')
                removeItemFromList(ulist, 'r_id', usr_id)
        elif usr_type == 'reg':
            ulist = new_oul.userlist.get('rtc_online_users', {}).get('reg_users')
            removeItemFromList(ulist, 'r_id', usr_id)
        
        # Set status accordingly
        usrsAssigned = 0
        for anonUser in cur_oul.userlist.get('rtc_online_users', {}).get('anon_users'):
            if anonUser.get('userInfo', {}).get('assignedTo') == emp_id:
                usrsAssigned += 1
        
        for regUser in cur_oul.userlist.get('rtc_online_users', {}).get('reg_users'):
            if regUser.get('userInfo', {}).get('assignedTo') == emp_id:
                usrsAssigned += 1
        
        new_emp_status = 'Disponible'
        if usrsAssigned > 0:
            new_emp_status = 'Atendiendo'
        
        # Update Our Employee Status
        ulist = new_oul.userlist.get('rtc_online_users', {}).get('emp_users')
        updateItemFromList(ulist, 'id', emp_id, None, 'status', new_emp_status, 'userInfo')
        
        new_userlist = new_oul.userlist

        oper = CatalogOperations.query.filter_by(name_short='del').first()
        new_oul.userlist.get('rtc_online_users', {})['id'] = str(dt_now)
        new_rtc_oul = RTCOnlineUsers()
        new_rtc_oul.id = dt_now
        new_rtc_oul.operation_id = oper.id
        new_rtc_oul.userlist = new_userlist
        db.session.add(new_rtc_oul)

        cur_oul.enabled = False
        db.session.add(cur_oul)

        db.session.commit()

        socketio.emit('RTCUserList', new_userlist, room='126-EMPS')
    except Exception as e:
        app.logger.error('** SWING_CMS ** - SocketIO EndRTC Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


@socketio.on('receiveSocketID')
def _receiveSocketID(json):
    app.logger.debug('** SWING_CMS ** - SocketIO User Connected SocketID: {}'.format(json))


@socketio.on('sendOfferToUser')
def _sendOfferToUser(js):
    app.logger.debug('** SWING_CMS ** - SocketIO Send Offer To User: {}'.format(js))
    try:
        j = json.loads(js)
        data = j['data']
        r_id = j['r_id']
        socketio.emit('receiveInitiatorOffer', { 'r_id' : request.sid, 'data' : data }, room=r_id)
    except Exception as e:
        app.logger.error('** SWING_CMS ** - SocketIO Send Offer To User Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


@socketio.on('sendAnswerToUser')
def _sendAnswerToUser(js):
    app.logger.debug('** SWING_CMS ** - SocketIO Send Answer To User: {}'.format(js))
    try:
        j = json.loads(js)
        data = j['data']
        r_id = j['r_id']
        socketio.emit('receiveReceiverAnswer', { 'r_id' : request.sid, 'data' : data }, room=r_id)
    except Exception as e:
        app.logger.error('** SWING_CMS ** - SocketIO Send Answer To User Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


@socketio.on('updateUsersStatus')
def _updateUsersStatus(js):
    app.logger.debug('** SWING_CMS ** - SocketIO Update User Status : {}'.format(js))
    try:
        j = json.loads(js)
        emp_id = j['e_id']
        status = j['s_type']
        usr_id = j['u_id']
        usr_type = j['u_type']

        # Update Users to RTC Online Users List
        cur_oul = RTCOnlineUsers.query.with_for_update().order_by(RTCOnlineUsers.id.desc()).first()
        dt_now = datetime.datetime.utcnow()

        # Set status accordingly
        new_emp_status = ''
        new_usr_status = ''

        if status == 'busy':
            # Conversation is between employee and user
            if usr_type != 'emp':
                new_emp_status = 'Atendiendo'
                new_usr_status = 'Atendido'
            # If user type is an employee, conversation is between employees. Do not update status
            elif usr_type == 'emp':
                for empUser in cur_oul.userlist.get('rtc_online_users', {}).get('emp_users'):
                    if empUser.get('id') == emp_id:
                        new_emp_status = empUser.get('userInfo', {}).get('status')
                    elif empUser.get('r_id') == usr_id:
                        new_usr_status = empUser.get('userInfo', {}).get('status')
            
        elif status == 'transferred':
            usrsAssigned = 0
            for anonUser in cur_oul.userlist.get('rtc_online_users', {}).get('anon_users'):
                if anonUser.get('userInfo', {}).get('assignedTo') == emp_id and anonUser.get('r_id') != usr_id:
                    usrsAssigned += 1
            
            for regUser in cur_oul.userlist.get('rtc_online_users', {}).get('reg_users'):
                if regUser.get('userInfo', {}).get('assignedTo') == emp_id and regUser.get('r_id') != usr_id:
                    usrsAssigned += 1
            
            new_emp_status = 'Disponible'
            if usrsAssigned > 0:
                new_emp_status = 'Atendiendo'
            
            new_usr_status = 'Transferid@'

        new_oul = cur_oul
        # Update Our Employee Status
        ulist = new_oul.userlist.get('rtc_online_users', {}).get('emp_users')
        updateItemFromList(ulist, 'id', emp_id, None, 'status', new_emp_status, 'userInfo')
        # If User is Transferred, Update the Employee ID to the Transfer Employee ID
        if status == 'transferred':
            emp_id = j['e_t_id']
        # Depending on the type of User, update it's status
        if usr_type == 'anon':
            ulist = new_oul.userlist.get('rtc_online_users', {}).get('anon_users')
            updateItemFromList(ulist, 'r_id', usr_id, None, 'status', new_usr_status, 'userInfo')
            updateItemFromList(ulist, 'r_id', usr_id, None, 'assignedTo', emp_id, 'userInfo')
            updateItemFromList(ulist, 'r_id', usr_id, None, 'activity', int(int(dt_now.strftime('%s%f'))/1000), 'userInfo')
        elif usr_type == 'emp':
            updateItemFromList(ulist, 'r_id', usr_id, None, 'status', new_emp_status, 'userInfo')
            updateItemFromList(ulist, 'r_id', usr_id, None, 'activity', int(int(dt_now.strftime('%s%f'))/1000), 'userInfo')
        elif usr_type == 'reg':
            ulist = new_oul.userlist.get('rtc_online_users', {}).get('reg_users')
            updateItemFromList(ulist, 'r_id', usr_id, None, 'status', new_usr_status, 'userInfo')
            updateItemFromList(ulist, 'r_id', usr_id, None, 'assignedTo', emp_id, 'userInfo')
            updateItemFromList(ulist, 'r_id', usr_id, None, 'activity', int(int(dt_now.strftime('%s%f'))/1000), 'userInfo')
        
        new_userlist = new_oul.userlist

        oper = CatalogOperations.query.filter_by(name_short='upd').first()
        new_oul.userlist.get('rtc_online_users', {})['id'] = str(dt_now)
        new_rtc_oul = RTCOnlineUsers()
        new_rtc_oul.id = dt_now
        new_rtc_oul.operation_id = oper.id
        new_rtc_oul.userlist = new_userlist
        db.session.add(new_rtc_oul)

        cur_oul.enabled = False
        db.session.add(cur_oul)

        db.session.commit()

        socketio.emit('RTCUserList', new_userlist, room='126-EMPS')
    except Exception as e:
        app.logger.error('** SWING_CMS ** - SocketIO Update User Status Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


@socketio.on_error()
def error_handler(e):
    app.logger.error('** SWING_CMS ** - SocketIO Error: {}'.format(e))
    db.session.rollback()

