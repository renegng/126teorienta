from datetime import datetime
from flask import jsonify
from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy, orm

db = SQLAlchemy()

# **************************************************************************
# Database models
# **************************************************************************

# Catalog Operations Class
class CatalogOperations(db.Model):
    __tablename__ = 'catalog_operations'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(60), unique=True, nullable=False)
    name_short = db.Column(db.String(6), unique=True, nullable=True)

    def __repr__(self):
        return jsonify(
            id = self.id,
            name = self.name,
            name_short = self.name_short
        )


# Catalog User Roles Class
class CatalogUserRoles(db.Model):
    __tablename__ = 'catalog_user_roles'
    id = db.Column(db.Integer, primary_key=True)
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


# Log User Connections Class
class LogUserConnections(db.Model):
    __tablename__ = 'log_user_connections'
    id = db.Column(db.DateTime, primary_key=True, default=datetime.utcnow)
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
    id = db.Column(db.DateTime, primary_key=True, default=datetime.utcnow)
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


# User Class
class User(UserMixin, db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    uid = db.Column(db.String(255), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=False, nullable=False)
    name = db.Column(db.String(300), unique=False, nullable=False)
    cmuserid = db.Column(db.String(20), unique=False, nullable=False)
    avatar = db.Column(db.String(16), unique=False, nullable=True)
    phonenumber = db.Column(db.String(20), unique=False, nullable=True)
    notifications = db.Column(db.Boolean, unique=False, nullable=True)
    enabled = db.Column(db.Boolean, unique=False, nullable=True, default=True)
    datecreated = db.Column(db.DateTime, unique=False, nullable=False, index=True, default=datetime.utcnow)
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
    

# User Roles Class
class UserXRole(db.Model):
    __tablename__ = 'user_x_role'
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
    user_role_id = db.Column(db.Integer, db.ForeignKey('catalog_user_roles.id'), primary_key=True)
    datecreated = db.Column(db.DateTime, unique=False, nullable=False, index=True, default=datetime.utcnow)
    user = db.relationship('User', back_populates='roles')
    user_role = db.relationship('CatalogUserRoles', back_populates='users')

