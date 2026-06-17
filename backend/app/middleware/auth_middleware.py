from functools import wraps
from flask import request, jsonify, g
import jwt
from app.config import Config
from app.models.user import User

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                parts = auth_header.split(" ")
                if parts[0].lower() == 'bearer' and len(parts) == 2:
                    token = parts[1]
                else:
                    return jsonify({'message': 'Token format must be Bearer <token>'}), 401
            except IndexError:
                return jsonify({'message': 'Token format is invalid!'}), 401
        elif 'token' in request.args:
            token = request.args.get('token')
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['user_id']).first()
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
            g.user = current_user
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired. Please log in again.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
            
        return f(*args, **kwargs)
        
    return decorated

def roles_allowed(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, 'user') or not g.user:
                return jsonify({'message': 'Authentication required!'}), 401
            if g.user.role not in roles:
                return jsonify({'message': 'Access forbidden: unauthorized role!'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
