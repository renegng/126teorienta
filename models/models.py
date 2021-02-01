from datetime import datetime as dt
from datetime import timezone as tz
from flask import jsonify
from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy, orm
from sqlalchemy_utils import EncryptedType
from sqlalchemy_utils.types import JSONType
from sqlalchemy_utils.types.encrypted.encrypted_type import AesEngine

db = SQLAlchemy()

# **************************************************************************
# Utilities
# **************************************************************************

class AESCryptoKey():
    def __init__(self):
        self._crypKey = None
    
    @property
    def key(self):
        return self._crypKey

    @key.setter
    def key(self, val):
        self._crypKey = val

crypto_key = AESCryptoKey()

def get_crypto_key():
    return crypto_key.key


# **************************************************************************
# Database models
# **************************************************************************


# Appointments Class
class Appointments(db.Model):
    __tablename__ = 'appointments'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    date_created = db.Column(db.DateTime, nullable=False, default=dt.now(tz.utc))
    date_scheduled = db.Column(db.DateTime, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_for = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('catalog_services.id'), nullable=False)
    service_supp_id = db.Column(db.Integer, db.ForeignKey('services_supplement.id'), nullable=True)
    emp_assigned = db.Column(db.Integer, db.ForeignKey('user_x_employees_assigned.id'), nullable=False)
    conversation_id = db.Column(db.JSON, nullable=True)
    usr_attendance = db.Column(db.DateTime, nullable=True)
    emp_attendance = db.Column(db.DateTime, nullable=True)
    ended_with_survey = db.Column(db.DateTime, nullable=True)
    cancelled = db.Column(db.Boolean, nullable=True, default=False)
    cancelled_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    cancelled_reason = db.Column(EncryptedType(db.Text, get_crypto_key, AesEngine, 'pkcs5'), nullable=True)

    def __repr__(self):
        return jsonify(
            id = self.id,
            service_id = self.service_id,
            created_for = self.created_for,
            emp_assigned = self.emp_assigned,
            date_scheduled = self.date_scheduled
        )


# Catalog - Operations Class
class CatalogOperations(db.Model):
    __tablename__ = 'catalog_operations'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(60), unique=True, nullable=False)
    name_short = db.Column(db.String(6), unique=True, nullable=True)

    def __repr__(self):
        return jsonify(
            id = self.id,
            name = self.name,
            name_short = self.name_short
        )


# Catalog - Services Class
class CatalogServices(db.Model):
    __tablename__ = 'catalog_services'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    name_short = db.Column(db.String(6), unique=True, nullable=True)
    enabled = db.Column(db.Boolean, unique=False, nullable=True, default=True)
    break_minutes = db.Column(db.Integer, unique=False, nullable=True, default=15)
    duration_minutes = db.Column(db.Integer, unique=False, nullable=True, default=45)
    service_user_role = db.Column(db.Integer, db.ForeignKey('catalog_user_roles.id'), nullable=True)

    def __repr__(self):
        return jsonify(
            id = self.id,
            name = self.name,
            name_short = self.name_short,
            break_minutes = self.break_minutes,
            duration_minutes = self.duration_minutes
        )


# Catalog - Survey Answers Types Class
class CatalogSurveysAnswerTypes(db.Model):
    __tablename__ = 'catalog_surveys_answer_types'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(35), unique=True, nullable=False)
    name_short = db.Column(db.String(6), unique=True, nullable=True)

    def __repr__(self):
        return jsonify(
            id = self.id,
            name = self.name,
            name_short = self.name_short
        )


# Catalog - User Roles Class
class CatalogUserRoles(db.Model):
    __tablename__ = 'catalog_user_roles'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(60), unique=True, nullable=False)
    name_short = db.Column(db.String(6), unique=True, nullable=True)
    enabled = db.Column(db.Boolean, unique=False, nullable=True, default=True)
    users = db.relationship('UserXRole', lazy='subquery', back_populates='user_role')

    def __repr__(self):
        return jsonify(
            id = self.id,
            name = self.name,
            name_short = self.name_short,
            enabled = self.enabled,
            users = self.users
        )


# Chat Conversation Class
class Chat():
    date = db.Column(db.DateTime, primary_key=True, default=dt.now(tz.utc))
    users = db.Column(EncryptedType(JSONType, get_crypto_key, AesEngine, 'pkcs5'), nullable=False)
    messages = db.Column(EncryptedType(JSONType, get_crypto_key, AesEngine, 'pkcs5'), nullable=False)

    def __init__(self):
        self.users = []
        self.messages = []


# Chat Conversations Class - Anonymous
class ChatsAnonymous(Chat, db.Model):
    __tablename__ = 'chats_anonymous'
    sid = db.Column(db.String(35), primary_key=True)
    ip_address = db.Column(db.String(15), nullable=False)
    transferred = db.Column(db.Boolean, unique=False, nullable=True, default=False)
    ended_with_survey = db.Column(db.DateTime, unique=False, nullable=True)

    def __repr__(self):
        return jsonify(
            date = self.date,
            users = self.users,
            messages = self.messages,
            ip_address = self.ip_address
        )


# Chat Conversations Class - Chatbot
class ChatsChatbot(Chat, db.Model):
    __tablename__ = 'chats_chatbot'
    sid = db.Column(db.String(35), primary_key=True)
    ip_address = db.Column(db.String(15), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def __repr__(self):
        return jsonify(
            date = self.date,
            users = self.users,
            messages = self.messages,
            ip_address = self.ip_address
        )


# Chat Conversations Class - Employees
class ChatsEmployees(Chat, db.Model):
    __tablename__ = 'chats_employees'
    user_id_01 = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
    user_id_02 = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)

    def __repr__(self):
        return jsonify(
            date = self.date,
            users = self.users,
            messages = self.messages,
            user01 = self.user_id_01,
            user02 = self.user_id_02
        )


# Chat Conversations Class - Registered
class ChatsRegistered(Chat, db.Model):
    __tablename__ = 'chats_registered'
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
    sid = db.Column(db.String(35), nullable=True)
    ip_address = db.Column(db.String(15), nullable=False)
    transferred = db.Column(db.Boolean, unique=False, nullable=True, default=False)
    ended_with_survey = db.Column(db.DateTime, unique=False, nullable=True)

    def __repr__(self):
        return jsonify(
            date = self.date,
            users = self.users,
            messages = self.messages,
            user_id = self.user_id
        )


# Log User Connections Class
class LogUserConnections(db.Model):
    __tablename__ = 'log_user_connections'
    id = db.Column(db.DateTime, primary_key=True, default=dt.now(tz.utc))
    sid = db.Column(db.String(35), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    ip_address = db.Column(db.String(15), nullable=False)
    operation_id = db.Column(db.Integer, db.ForeignKey('catalog_operations.id'), nullable=False)

    def __repr__(self):
        return jsonify(
            id = self.id,
            user_id = self.user_id,
            ip_address = self.ip_address,
            operation_id = self.operation_id
        )


# Real Time Communication Online Users List Class
class RTCOnlineUsers(db.Model):
    __tablename__ = 'rtc_online_users'
    id = db.Column(db.DateTime, primary_key=True, default=dt.now(tz.utc))
    userlist = db.Column(db.JSON, nullable=False)
    operation_id = db.Column(db.Integer, db.ForeignKey('catalog_operations.id'), nullable=False)
    enabled = db.Column(db.Boolean, unique=False, nullable=True, default=True)

    def __repr__(self):
        return jsonify(
            id = self.id,
            userlist = self.userlist,
            operation_id = self.operation_id,
            enabled = self.enabled
        )


# Services Supplement Class
class ServicesSupplement(db.Model):
    __tablename__ = 'services_supplement'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    service_id = db.Column(db.Integer, db.ForeignKey('catalog_services.id'), nullable=False)
    name = db.Column(db.String(280), nullable=False)
    description = db.Column(db.Text, nullable=True)
    url = db.Column(EncryptedType(db.String(2000), get_crypto_key, AesEngine, 'pkcs5'), nullable=True)

    def __repr__(self):
        return jsonify(
            id = self.id,
            name = self.name,
            service_id = self.service_id,
            description = self.description,
            url = self.url
        )


# Surveys Class
class Surveys(db.Model):
    __tablename__ = 'surveys'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(80), unique=False, nullable=False)
    name_short = db.Column(db.String(6), unique=True, nullable=True)
    description = db.Column(db.Text, nullable=True)
    questions = db.Column(db.JSON, nullable=False)

    def __repr__(self):
        return jsonify(
            id = self.id,
            name = self.name,
            name_short = self.name_short,
            description = self.description,
            questions = self.questions
        )


# Surveys Answered Class
class SurveysAnswered(db.Model):
    __tablename__ = 'surveys_answered'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    answers = db.Column(db.JSON, unique=False, nullable=False)
    survey_id = db.Column(db.Integer, db.ForeignKey('surveys.id'), nullable=False)
    conversation_id = db.Column(db.JSON, nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=True)

    def __repr__(self):
        return jsonify(
            id = self.id,
            answers = self.answers,
            survey_id = self.survey_id,
            conversation_id = self.conversation_id,
            appointment_id = self.appointment_id
        )


# Surveys Questions Class
class SurveysQuestions(db.Model):
    __tablename__ = 'surveys_questions'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    question = db.Column(db.Text, unique=False, nullable=False)
    question_answers = db.Column(db.JSON, unique=False, nullable=False)
    answers_type = db.Column(db.Integer, db.ForeignKey('catalog_surveys_answer_types.id'), nullable=False)

    def __repr__(self):
        return jsonify(
            id = self.id,
            question = self.question,
            answers_type = self.answers_type,
            question_answers = self.question_answers
        )


# User Class
class User(UserMixin, db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    uid = db.Column(db.String(255), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=False, nullable=False)
    name = db.Column(db.String(300), unique=False, nullable=False)
    cmuserid = db.Column(db.String(20), unique=False, nullable=False)
    birthdate = db.Column(db.DateTime, unique=False, nullable=True)
    phonenumber = db.Column(db.String(20), unique=False, nullable=True)
    notifications = db.Column(db.Boolean, unique=False, nullable=True)
    enabled = db.Column(db.Boolean, unique=False, nullable=True, default=True)
    datecreated = db.Column(db.DateTime, unique=False, nullable=False, index=True, default=dt.now(tz.utc))
    roles = db.relationship('UserXRole', lazy='subquery', back_populates='user')

    # UserClass properties and methods
    @orm.reconstructor
    def __init__(self):
        # Properties required by Flask-Login
        self._is_active = True
        self._is_authenticated = True

    @property
    def is_active(self):
        return self._is_active

    @is_active.setter
    def is_active(self, val):
        self._is_active = val

    @property
    def is_authenticated(self):
        return self._is_authenticated

    @is_authenticated.setter
    def is_authenticated(self, val):
        self._is_authenticated = val

    def __repr__(self):
        return jsonify(
            id = self.id,
            uid = self.uid,
            email = self.email,
            name = self.name,
            cmuserid = self.cmuserid,
            birthdate = self.birthdate,
            phonenumber = self.phonenumber,
            notifications = self.notifications,
            enabled = self.enabled,
            roles = self.roles
        )
    
    # Method required by Flask-Login
    def get_id(self):
        return self.uid
    
    # Method to return user roles
    def get_user_roles(self):
        u_roles = []

        # Iterate through all roles
        for role in self.roles:
            u_roles.append(role.user_role.name)
        
        return u_roles
    
    # Method to validate user role
    def is_user_role(self, uroles):
        hasRole = False

        # Iterate through all roles
        for role in self.roles:
            # Check the specified user role
            if role.user_role.name_short in uroles:
                hasRole = True
        
        return hasRole
    

# User Additional Information
class UserExtraInfo(db.Model):
    __tablename__ = 'user_extra_info'
    id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
    last_names = db.Column(db.String(300), unique=False, nullable=True)
    names = db.Column(db.String(300), unique=False, nullable=True)
    avatar = db.Column(db.String(16), unique=False, nullable=True)
    country = db.Column(db.JSON, unique=False, nullable=True)
    state = db.Column(db.JSON, unique=False, nullable=True)
    city = db.Column(db.JSON, unique=False, nullable=True)

    def __repr__(self):
        return jsonify(
            id = self.id,
            names = self.names,
            last_names = self.last_names,
            avatar = self.avatar,
            country = self.country,
            state = self.state,
            city = self.city
        )


# User's Employees Assigned Class
class UserXEmployeeAssigned(db.Model):
    __tablename__ = 'user_x_employees_assigned'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('catalog_services.id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    datecreated = db.Column(db.DateTime, unique=False, nullable=False, index=True, default=dt.now(tz.utc))
    enabled = db.Column(db.Boolean, unique=False, nullable=True, default=True)

    def __repr__(self):
        return jsonify(
            id = self.id,
            user_id = self.user_id,
            service_id = self.service_id,
            employee_id = self.employee_id,
            enabled = self.enabled
        )


# User Roles Class
class UserXRole(db.Model):
    __tablename__ = 'user_x_role'
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
    user_role_id = db.Column(db.Integer, db.ForeignKey('catalog_user_roles.id'), primary_key=True)
    datecreated = db.Column(db.DateTime, unique=False, nullable=False, index=True, default=dt.now(tz.utc))
    user = db.relationship('User', back_populates='roles')
    user_role = db.relationship('CatalogUserRoles', back_populates='users')

