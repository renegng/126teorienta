from datetime import datetime as dt
from datetime import timezone as tz
from flask import Blueprint, request, url_for, jsonify, make_response
from flask import current_app as app
from flask_login import current_user, login_required
from models.models import CatalogUserRoles, CatalogServices, User, UserXRole

api = Blueprint('api', __name__, template_folder='templates', static_folder='static')

# Get the User's Details
@api.route('/api/detail/user/<int:user_id>/', methods = ['GET'])
# @login_required
def _getuser(user_id = None):
    app.logger.debug('** SWING_CMS ** - API User Detail')
    try:
        if request.method == 'GET':
            if user_id is not None:
                response = {
                    'birthdate': None,
                    'city': None,
                    'country': None,
                    'email': None,
                    'enabled': None,
                    'id': user_id,
                    'last_names': None,
                    'name': None,
                    'names': None,
                    'national_id': None,
                    'phonenumber': None,
                    'roles': None,
                    'state': None,
                    'status': 200
                }

                detail = User.query.filter(User.id == user_id).first()
                if detail is not None:
                    response['status'] = 200
                    response['id'] = user_id
                    response['name'] = detail.name
                    response['email'] = detail.email
                    response['birthdate'] = detail.birthdate
                    response['phonenumber'] = detail.phonenumber
                    response['enabled'] = detail.enabled
                    response['roles'] = detail.get_user_roles(True)
                    if detail.extra_info is not None:
                        response['national_id'] = detail.extra_info.national_id
                        response['last_names'] = detail.extra_info.last_names
                        response['names'] = detail.extra_info.names
                        response['country'] = detail.extra_info.country
                        response['state'] = detail.extra_info.state
                        response['city'] = detail.extra_info.city

                return jsonify(response)
            else:
                return jsonify({ 'status': 400 })
        
    except Exception as e:
        app.logger.error('** SWING_CMS ** - API User Detail Error: {}'.format(e))
        return jsonify({ 'status': 'error', 'msg': e })


# Get a list of Users
@api.route('/api/list/users/', methods = ['GET'])
# @login_required
def _getusers():
    app.logger.debug('** SWING_CMS ** - API List Users')
    try:
        if request.method == 'GET':
            query = request.args.get('qry')
            filters = request.args.get('flt')
            filters_type = request.args.get('ft')

            if query is not None:
                ulist, total = User.search(query, 1, 5)

                # Check if there is a User Role Filter parameter and Filter by it
                if filters is not None and filters != '':
                    userRolesFilters = filters.split('-')
                    
                    # Check if the Filters are of type Servie User Role
                    if filters_type is not None and filters_type == 'sur':
                        newUserRolesFilters = []
                        
                        services = CatalogServices.query.filter(CatalogServices.name_short.in_(userRolesFilters))
                        for service in services:
                            user_role = CatalogUserRoles.query.filter(CatalogUserRoles.id == service.service_user_role).first()
                            if user_role is not None:
                                newUserRolesFilters.append(user_role.name_short)
                        
                        userRolesFilters = newUserRolesFilters

                    ulistFiltered = []
                    for user in ulist:
                        if user.is_user_role(userRolesFilters):
                            ulistFiltered.append(user)
                    ulist = ulistFiltered
                    total = len(ulistFiltered)

                response = {
                    'r_filter': filters,
                    'r_total': total,
                    'records': [],
                    'status': 404
                }

                if total > 0:
                    response['status'] = 200
                    for usr in ulist:
                        response['records'].append({
                            'u_id': usr.id,
                            'u_name': usr.name,
                            'u_email': usr.email
                        })
                
                return jsonify(response)
            else:
                return jsonify({ 'status': 400 })
        
    except Exception as e:
        app.logger.error('** SWING_CMS ** - API List Users Error: {}'.format(e))
        return jsonify({ 'status': 'error', 'msg': e })

