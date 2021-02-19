import base64, json

from . import crypto_key, db, removeItemFromList, updateItemFromList
from datetime import datetime as dt
from datetime import timezone as tz
from flask import current_app as app
from flask import Blueprint, request, jsonify
from flask_login import current_user
from flask_socketio import SocketIO, close_room, join_room, leave_room, rooms
from models.models import CatalogOperations, CatalogUserRoles, LogUserConnections, RTCOnlineUsers, User
from models.models import ChatsAnonymous, ChatsEmployees, ChatsRegistered
from sqlalchemy.orm.attributes import flag_modified

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
        dt_now = dt.now(tz.utc)
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
            if current_user.is_user_role(['adm', 'ori', 'abo', 'psi', 'soc', 'coo']):
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
            if current_user.is_user_role(['adm', 'ori', 'abo', 'psi', 'soc', 'coo']):
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
        dt_now = dt.now(tz.utc)
        
        # Retrieve the user list depending on the user's role and Remove User from List
        new_oul = cur_oul
        if current_user.is_authenticated:
            if current_user.is_user_role(['adm', 'ori', 'abo', 'psi', 'soc', 'coo']):
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
            if current_user.is_user_role(['adm', 'ori', 'abo', 'psi', 'soc', 'coo']):
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
        dt_now = dt.now(tz.utc)
        
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


@socketio.on('getConversationId')
def _getConversationId(js):
    app.logger.debug('** SWING_CMS ** - SocketIO Get Conversation ID: {}'.format(js))
    try:
        j = json.loads(js)
        usr_id = j['u_id']
        usr_ip = j['u_ip']
        usr_rid = j['u_rid']
        usr_type = j['u_type']
        usr_name = j['u_name']
        usr_photo = j['u_photoURL']
        emp_id = j['e_id']
        emp_name = j['e_name']
        emp_photo = j['e_photoURL']

        # Retrieve current time and date
        currdate = dt.now(tz.utc)

        # Depending on the user type, we need to retrieve or create a Conversation
        # New Conversations are created per day
        isNewConv = False
        usr_conversation = None

        if usr_type == 'anon':
            anon_last_conv = ChatsAnonymous.query.filter_by(sid=usr_id, ip_address=usr_ip).order_by(ChatsAnonymous.date.desc()).first()

            # If Anonymous User has no record tied to his SocketIO ID, search through IP
            if anon_last_conv is None:
                anon_last_conv = ChatsAnonymous.query.filter_by(ip_address=usr_ip).order_by(ChatsAnonymous.date.desc()).first()

            # If there is a conversation record, use stored conversation if dates are the same
            if anon_last_conv is not None and currdate.date() == anon_last_conv.date.date():
                usr_conversation = anon_last_conv
            else:
                # If there is no conversation record or date is different than current date, create a new Conversation
                usr_conversation = ChatsAnonymous()
                usr_conversation.date = currdate
                usr_conversation.sid = usr_id
                usr_conversation.ip_address = usr_ip
                isNewConv = True
            
        elif usr_type == 'reg':
            reg_last_conv = ChatsRegistered.query.filter_by(user_id=usr_id).order_by(ChatsRegistered.date.desc()).first()

            # If there is a conversation record, use stored conversation if dates are the same
            if reg_last_conv is not None and currdate.date() == reg_last_conv.date.date():
                usr_conversation = reg_last_conv
            else:
                # If there is no conversation record or date is different than current date, create a new Conversation
                usr_conversation = ChatsRegistered()
                usr_conversation.date = currdate
                usr_conversation.user_id = usr_id
                usr_conversation.ip_address = usr_ip
                isNewConv = True
            
        elif usr_type == 'emp':
            emp_id_01 = None
            emp_id_02 = None
            # emp_id_01 ID number should always be lower than emp_id_02 to guarantee proper storage and retrieval of data
            if emp_id < usr_id:
                emp_id_01 = emp_id
                emp_id_02 = usr_id
            else:
                emp_id_01 = usr_id
                emp_id_02 = emp_id

            emp_last_conv = ChatsEmployees.query.filter_by(user_id_01=emp_id_01, user_id_02=emp_id_02).order_by(ChatsEmployees.date.desc()).first()

            # If there is a conversation record, use stored conversation if dates are the same
            if emp_last_conv is not None and currdate.date() == emp_last_conv.date.date():
                usr_conversation = emp_last_conv
            else:
                # If there is no conversation record or date is different than current date, create a new Conversation
                usr_conversation = ChatsEmployees()
                usr_conversation.date = currdate
                usr_conversation.user_id_01 = emp_id_01
                usr_conversation.user_id_02 = emp_id_02
                isNewConv = True

        # Verify if Employee/User are included in the Users List, if not, add them
        hasEmp = False
        hasUsr = False
        for user in usr_conversation.users:
            if user.get('type') != 'emp' and user.get('type') == usr_type:
                if user.get('id') == usr_id or user.get('ip') == usr_ip:
                    hasUsr = True
            elif user.get('type') == 'emp':
                if user.get('id') == usr_id:
                    hasUsr = True
                elif user.get('id') == emp_id:
                    hasEmp = True
        
        if not hasUsr:
            usr_conversation.users.append({
                'id': usr_id,
                'ip': usr_ip,
                'type': usr_type,
                'name': usr_name,
                'photoURL': usr_photo
            })

            if not isNewConv:
                flag_modified(usr_conversation, 'users')

        if not hasEmp:
            usr_conversation.users.append({
                'id': emp_id,
                'ip': request.environ.get('HTTP_X_REAL_IP', request.remote_addr),
                'type': 'emp',
                'name': emp_name,
                'photoURL': emp_photo
            })

            if not isNewConv:
                flag_modified(usr_conversation, 'users')
        
        if isNewConv:
            db.session.add(usr_conversation)
        
        db.session.commit()
        db.session.refresh(usr_conversation)

        # Retrieve Users Conversation ID
        usr_conversation_id = None
        usr_conversation_json = None
        usr_conversation_id_b64 = None
        if usr_type == 'anon':
            usr_conversation_json = json.dumps({
                'date': usr_conversation.date.timestamp(),
                'sid': usr_conversation.sid,
                'u_type': usr_type
            })
            usr_conversation_id_b64 = base64.b64encode(usr_conversation_json.encode('utf-8'))
        elif usr_type == 'reg':
            usr_conversation_json = json.dumps({
                'date': usr_conversation.date.timestamp(),
                'user_id': usr_conversation.user_id,
                'u_type': usr_type
            })
            usr_conversation_id_b64 = base64.b64encode(usr_conversation_json.encode('utf-8'))
        elif usr_type == 'emp':
            usr_conversation_json = json.dumps({
                'date': usr_conversation.date.timestamp(),
                'user_id_01': usr_conversation.user_id_01,
                'user_id_02': usr_conversation.user_id_02,
                'u_type': usr_type
            })
            usr_conversation_id_b64 = base64.b64encode(usr_conversation_json.encode('utf-8'))

        usr_conversation_id = {
            'rid': usr_rid,
            'cid': usr_conversation_id_b64
        }

        socketio.emit('setConversationId', usr_conversation_id, room=request.sid)
    except Exception as e:
        app.logger.error('** SWING_CMS ** - SocketIO Get Conversation ID Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


@socketio.on('getConversationMessages')
def _getConversationMessages(js):
    app.logger.debug('** SWING_CMS ** - SocketIO Get Conversation Messages: {}'.format(js))
    try:
        usr_conv_obj = json.loads(base64.b64decode(js['cid']).decode('utf-8'))
        usr_conv_type = usr_conv_obj['u_type']
        
        j = json.loads(js['data'])
        req_date = j['c_date']
        uid = j['uidElm']

        # Depending on the user type, we need to retrieve the Conversation
        usr_conv_date = None
        usr_conversation = None

        if req_date == 'current':
            usr_conv_date = dt.fromtimestamp(usr_conv_obj['date'])
        else:
            usr_conv_date = dt.fromtimestamp(req_date)

        if usr_conv_type == 'anon':
            if req_date == 'current':
                usr_conversation = ChatsAnonymous.query.filter_by(
                    date=usr_conv_date,
                    sid=usr_conv_obj['sid']
                ).first()

        elif usr_conv_type == 'reg':
            if req_date == 'current':
                usr_conversation = ChatsRegistered.query.filter_by(
                    date=usr_conv_date,
                    user_id=int(usr_conv_obj['user_id'])
                ).first()
            else:
                usr_conversation = ChatsRegistered.query.filter_by(
                    date < usr_conv_date,
                    user_id=int(usr_conv_obj['user_id'])
                ).order_by(ChatsRegistered.date.desc()).first()

        elif usr_conv_type == 'emp':
            if req_date == 'current':
                usr_conversation = ChatsEmployees.query.filter_by(
                    date=usr_conv_date,
                    user_id_01=int(usr_conv_obj['user_id_01']),
                    user_id_02=int(usr_conv_obj['user_id_02'])
                ).first()
            else:
                usr_conversation = ChatsEmployees.query.filter_by(
                    date < usr_conv_date,
                    user_id_01=int(usr_conv_obj['user_id_01']),
                    user_id_02=int(usr_conv_obj['user_id_02'])
                ).order_by(ChatsEmployees.date.desc()).first()

        if usr_conversation is not None:
            response = {
                'users': usr_conversation.users,
                'messages': usr_conversation.messages,
                'uidElm': uid
            }
            app.logger.debug('** SWING_CMS ** - SocketIO Get Conversation Messages Users: {}'.format(usr_conversation.users))
            app.logger.debug('** SWING_CMS ** - SocketIO Get Conversation Messages Messages: {}'.format(usr_conversation.messages))
            
            socketio.emit('setConversationMessages', response, room=request.sid)

    except Exception as e:
        app.logger.error('** SWING_CMS ** - SocketIO Get Conversation Messages Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


@socketio.on('heartbeat')
def _heartbeat(js):
    app.logger.debug('** SWING_CMS ** - App Heartbeat: {}'.format(js))
    try:
        socketio.emit('receiveHeartbeat', { 'hb' : 1 }, room=request.sid)
    except Exception as e:
        app.logger.error('** SWING_CMS ** - App Heartbeat Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


@socketio.on('receiveSocketID')
def _receiveSocketID(js):
    app.logger.debug('** SWING_CMS ** - SocketIO User Connected SocketID: {}'.format(js))


@socketio.on('saveConversation')
def _saveConversation(js):
    app.logger.debug('** SWING_CMS ** - SocketIO Save Conversation: {}'.format(js))
    try:
        usr_conv_obj = json.loads(base64.b64decode(js['cid']).decode('utf-8'))
        usr_conv_date = dt.fromtimestamp(usr_conv_obj['date'])
        
        j = json.loads(js['data'])
        usr_id = j['u_id']
        message = j['msg']
        msg_date = j['date']
        usr_type = j['u_type']

        # Depending on the user type, we need to retrieve the Conversation
        # New Conversations are created per day
        usr_conversation = None

        if usr_conv_obj['u_type'] == 'anon':
            usr_conversation = ChatsAnonymous.query.filter_by(
                date=usr_conv_date,
                sid=usr_conv_obj['sid']
            ).first()

            if usr_type == 'anon' and usr_id != usr_conv_obj['sid']:
                usr_id = usr_conv_obj['sid']
            
        elif usr_conv_obj['u_type'] == 'reg':
            usr_conversation = ChatsRegistered.query.filter_by(
                date=usr_conv_date,
                user_id=int(usr_conv_obj['user_id'])
            ).first()

        elif usr_conv_obj['u_type'] == 'emp':
            usr_conversation = ChatsEmployees.query.filter_by(
                date=usr_conv_date,
                user_id_01=int(usr_conv_obj['user_id_01']),
                user_id_02=int(usr_conv_obj['user_id_02'])
            ).first()
        
        if usr_conversation is not None:
            usr_conversation.messages.append({
                'user_id': usr_id,
                'message': message,
                'msg_date': msg_date
            })
            app.logger.debug('** SWING_CMS ** - SocketIO Save Conversation: {}'.format(usr_conversation.users))
            app.logger.debug('** SWING_CMS ** - SocketIO Save Conversation: {}'.format(usr_conversation.messages))

            flag_modified(usr_conversation, 'messages')
            db.session.commit()

    except Exception as e:
        app.logger.error('** SWING_CMS ** - SocketIO Save Conversation Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


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
        dt_now = dt.now(tz.utc)

        # Set status accordingly
        new_emp_status = ''
        new_usr_status = ''

        # If status is Transferred, retrieve Employee Room ID to emit a Snackbar Notification
        usr_name = ''
        trf_emp_id = ''
        trf_emp_rid = ''

        if status == 'online' or status == 'away' or status == 'meeting':
            cur_emp_status = None
            for empUser in cur_oul.userlist.get('rtc_online_users', {}).get('emp_users'):
                if empUser.get('id') == emp_id:
                    cur_emp_status = empUser.get('userInfo', {}).get('status')
            
            if cur_emp_status == 'Atendiendo':
                new_emp_status = 'Atendiendo'
            else:
                if status == 'online':
                    new_emp_status = 'Disponible'
                elif status == 'away':
                    new_emp_status = 'Ausente'
                elif status == 'meeting':
                    new_emp_status = 'En reunión'

        elif status == 'busy':
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
            # Retrieve Employee ID for User Assignment and Notification
            trf_emp_id = int(j['e_t_id'])
            for empUser in cur_oul.userlist.get('rtc_online_users', {}).get('emp_users'):
                if empUser.get('id') == trf_emp_id:
                    trf_emp_rid = empUser.get('r_id')

            # Determine if Employee has more users assigned to display proper status
            for anonUser in cur_oul.userlist.get('rtc_online_users', {}).get('anon_users'):
                if anonUser.get('r_id') == usr_id:
                    usr_name = anonUser.get('userInfo', {}).get('name')
                elif anonUser.get('userInfo', {}).get('assignedTo') == emp_id and anonUser.get('r_id') != usr_id:
                    usrsAssigned += 1
            
            for regUser in cur_oul.userlist.get('rtc_online_users', {}).get('reg_users'):
                if regUser.get('r_id') == usr_id:
                    usr_name = regUser.get('userInfo', {}).get('name')
                elif regUser.get('userInfo', {}).get('assignedTo') == emp_id and regUser.get('r_id') != usr_id:
                    usrsAssigned += 1
            
            new_emp_status = 'Disponible'
            if usrsAssigned > 0:
                new_emp_status = 'Atendiendo'
            
            new_usr_status = 'Transferid@'

        new_oul = cur_oul
        # Update Our Employee Status
        ulist = new_oul.userlist.get('rtc_online_users', {}).get('emp_users')
        updateItemFromList(ulist, 'id', emp_id, None, 'status', new_emp_status, 'userInfo')
        updateItemFromList(ulist, 'id', emp_id, None, 'activity', int(int(dt_now.strftime('%s%f'))/1000), 'userInfo')
        
        # If User is Transferred, Update the Employee ID to the Transfer Employee ID
        if status == 'transferred':
            emp_id = trf_emp_id
        
        # Depending on the type of User, update it's status
        if usr_type == 'anon':
            ulist = new_oul.userlist.get('rtc_online_users', {}).get('anon_users')
            updateItemFromList(ulist, 'r_id', usr_id, None, 'status', new_usr_status, 'userInfo')
            updateItemFromList(ulist, 'r_id', usr_id, None, 'assignedTo', emp_id, 'userInfo')
            updateItemFromList(ulist, 'r_id', usr_id, None, 'activity', int(int(dt_now.strftime('%s%f'))/1000), 'userInfo')
        elif usr_type == 'emp':
            updateItemFromList(ulist, 'r_id', usr_id, None, 'status', new_usr_status, 'userInfo')
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
        # Send Employee Notification of User Transferral
        if status == 'transferred':
            socketio.emit('userTransferNotification', { 'usr_name' : usr_name }, room=trf_emp_rid)
    except Exception as e:
        app.logger.error('** SWING_CMS ** - SocketIO Update User Status Error: {}'.format(e))
        return jsonify({ 'status': 'error' })


@socketio.on_error()
def error_handler(e):
    app.logger.error('** SWING_CMS ** - SocketIO Error: {}'.format(e))
    db.session.rollback()

