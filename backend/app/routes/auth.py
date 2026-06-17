from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
import jwt
from app.config import Config
from app.models import db
from app.models.user import User
from app.middleware.auth_middleware import token_required
from app.services.email_service import generate_otp, get_otp_expiry, send_otp_email, OTP_VALIDITY_MINUTES

auth_bp = Blueprint('auth', __name__)


def _issue_otp(user: User):
    """Generate OTP, persist it on the user object, and email it.
    Raises RuntimeError if email delivery fails.
    """
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = get_otp_expiry(2)
    send_otp_email(user.email, otp, user.name)  # raises RuntimeError on SMTP failure


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Missing request data'}), 400

    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if not name or not email or not password or not role:
        return jsonify({'message': 'All fields are required (name, email, password, role)'}), 400

    if role not in ['candidate', 'recruiter']:
        return jsonify({'message': 'Invalid role. Choose candidate or recruiter.'}), 400

    user_exists = User.query.filter_by(email=email).first()
    if user_exists:
        return jsonify({'message': 'User with this email already exists!'}), 409

    try:
        new_user = User(
            name=name,
            email=email,
            role=role,
            email_verified=False,
            approval_status='pending' if role == 'recruiter' else None,
        )
        new_user.set_password(password)

        # Generate OTP and persist before committing, so the verify
        # endpoint works even while the background email thread is running
        otp = generate_otp()
        new_user.otp_code = otp
        new_user.otp_expires_at = get_otp_expiry(2)

        db.session.add(new_user)
        db.session.commit()          # ← user + OTP written to DB first

        # Fire email asynchronously (non-blocking)
        send_otp_email(new_user.email, otp, new_user.name)

        return jsonify({
            'message': 'Registration successful. Please verify your email with the OTP sent to your inbox.',
            'needs_verification': True,
            'email': new_user.email,
            'role': new_user.role,
            'otp': otp
        }), 201
    except RuntimeError as e:
        db.session.rollback()
        return jsonify({'message': f'Registration succeeded but email delivery failed: {str(e)}'}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Registration failed: {str(e)}'}), 500


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Missing request data'}), 400

    email = data.get('email')
    otp = data.get('otp')

    if not email or not otp:
        return jsonify({'message': 'Email and OTP are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'Account not found'}), 404

    if user.email_verified:
        return jsonify({
            'message': 'Email already verified.',
            'role': user.role,
            'verified': True,
        }), 200

    if not user.otp_code or user.otp_code != str(otp).strip():
        return jsonify({'message': 'Invalid verification code. Please try again.'}), 400

    if not user.otp_expires_at or user.otp_expires_at < datetime.utcnow():
        return jsonify({'message': 'Verification code has expired. Please request a new one.'}), 400

    user.email_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    db.session.commit()

    if user.role == 'recruiter':
        return jsonify({
            'message': 'Email verified successfully. Your recruiter account is awaiting admin approval.',
            'role': user.role,
            'verified': True,
            'awaiting_approval': True,
        }), 200

    return jsonify({
        'message': 'Email verified successfully. You can now sign in.',
        'role': user.role,
        'verified': True,
        'awaiting_approval': False,
    }), 200


@auth_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Missing request data'}), 400

    email = data.get('email')
    if not email:
        return jsonify({'message': 'Email is required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'Account not found'}), 404

    if user.email_verified:
        return jsonify({'message': 'Email is already verified.'}), 400

    try:
        _issue_otp(user)
        db.session.commit()
        return jsonify({
            'message': f'A new verification code has been sent to your email. It expires in {OTP_VALIDITY_MINUTES} minutes.',
            'otp': user.otp_code
        }), 200
    except RuntimeError as e:
        db.session.rollback()
        return jsonify({'message': f'Email delivery failed: {str(e)}'}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to resend code: {str(e)}'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Missing login credentials'}), 400

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid email or password!'}), 401

    can_login, block_message = user.can_login()
    if not can_login:
        status = 403
        payload = {'message': block_message}
        if user.role == 'recruiter' and user.email_verified and user.approval_status != 'approved':
            payload['awaiting_approval'] = True
        if not user.email_verified:
            payload['needs_verification'] = True
        return jsonify(payload), status

    token = jwt.encode({
        'user_id': user.id,
        'role': user.role,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, Config.JWT_SECRET_KEY, algorithm='HS256')

    if isinstance(token, bytes):
        token = token.decode('utf-8')

    return jsonify({
        'message': 'Login successful!',
        'token': token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_profile():
    return jsonify({
        'user': g.user.to_dict()
    }), 200
