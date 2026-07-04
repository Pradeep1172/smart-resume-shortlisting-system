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
    import json
    import os
    import time

    # Check if request is multipart form data (used for file/logo upload)
    is_multipart = request.content_type and 'multipart/form-data' in request.content_type

    if is_multipart:
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        role = request.form.get('role')
        company_details_str = request.form.get('company_details')
        logo_file = request.files.get('logo')
    else:
        data = request.get_json() or {}
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role')
        company_details_str = None
        logo_file = None

    if not name or not email or not password or not role:
        return jsonify({'message': 'All fields are required (name, email, password, role)'}), 400

    if role not in ['candidate', 'recruiter']:
        return jsonify({'message': 'Invalid role. Choose candidate or recruiter.'}), 400

    # Parse company details if recruiter
    company_name = None
    comp_details = {}
    if role == 'recruiter':
        if company_details_str:
            try:
                comp_details = json.loads(company_details_str)
            except Exception:
                comp_details = {}
        
        # Merge individual keys from request.form or data
        source = request.form if is_multipart else (data or {})
        for key in ['company_name', 'company_website', 'company_email', 'hr_email', 'phone', 'company_address', 'industry', 'company_size', 'company_description']:
            val = source.get(key)
            if val:
                comp_details[key] = val

        company_name = comp_details.get('company_name')

    # Validate logo file format
    if logo_file and logo_file.filename != '':
        allowed_exts = {'jpg', 'jpeg', 'png', 'webp', 'gif'}
        ext = logo_file.filename.rsplit('.', 1)[-1].lower() if '.' in logo_file.filename else ''
        if ext not in allowed_exts:
            return jsonify({'message': 'Invalid logo file type. Allowed: jpg, jpeg, png, webp, gif'}), 400

    user_exists = User.query.filter_by(email=email).first()
    if user_exists:
        if user_exists.email_verified:
            return jsonify({'message': 'User with this email already exists!'}), 409
            
        try:
            # Update credentials in case of corrections
            user_exists.name = name
            user_exists.set_password(password)
            user_exists.role = role
            user_exists.approval_status = 'pending' if role == 'recruiter' else None
            
            if role == 'recruiter':
                user_exists.company = company_name
                user_exists.company_details = json.dumps(comp_details)
                
                # Save logo file if uploaded
                if logo_file and logo_file.filename != '':
                    ext = logo_file.filename.rsplit('.', 1)[-1].lower()
                    timestamp = int(time.time())
                    filename = f"recruiter_{user_exists.id}_{timestamp}.{ext}"
                    logos_dir = os.path.join(Config.UPLOAD_FOLDER, 'logos')
                    os.makedirs(logos_dir, exist_ok=True)
                    file_path = os.path.join(logos_dir, filename)
                    abs_file_path = os.path.abspath(file_path)
                    logo_file.save(abs_file_path)
                    user_exists.company_logo_path = abs_file_path
            
            # Generate new OTP
            otp = generate_otp()
            user_exists.otp_code = otp
            user_exists.otp_expires_at = get_otp_expiry(2)
            
            # Resend email synchronously (raises RuntimeError on failure before commit)
            send_otp_email(user_exists.email, otp, user_exists.name)
            db.session.commit()
            
            return jsonify({
                'message': 'A pending registration already exists for this email. A new verification code has been sent to your inbox.',
                'needs_verification': True,
                'email': user_exists.email,
                'role': user_exists.role,
                'otp': otp
            }), 200
        except RuntimeError as e:
            db.session.rollback()
            return jsonify({'message': f'Pending registration detected but email delivery failed: {str(e)}'}), 500
        except Exception as e:
            db.session.rollback()
            return jsonify({'message': f'Failed to update pending registration: {str(e)}'}), 500

    try:
        new_user = User(
            name=name,
            email=email,
            role=role,
            email_verified=False,
            approval_status='pending' if role == 'recruiter' else None,
        )
        new_user.set_password(password)
        
        if role == 'recruiter':
            new_user.company = company_name
            new_user.company_details = json.dumps(comp_details)

        db.session.add(new_user)
        db.session.flush() # Flush to get new_user.id for logo filename

        if role == 'recruiter' and logo_file and logo_file.filename != '':
            ext = logo_file.filename.rsplit('.', 1)[-1].lower()
            timestamp = int(time.time())
            filename = f"recruiter_{new_user.id}_{timestamp}.{ext}"
            logos_dir = os.path.join(Config.UPLOAD_FOLDER, 'logos')
            os.makedirs(logos_dir, exist_ok=True)
            file_path = os.path.join(logos_dir, filename)
            abs_file_path = os.path.abspath(file_path)
            logo_file.save(abs_file_path)
            new_user.company_logo_path = abs_file_path

        # Generate OTP and persist
        otp = generate_otp()
        new_user.otp_code = otp
        new_user.otp_expires_at = get_otp_expiry(2)

        # Fire email synchronously (if SMTP fails, it raises RuntimeError and rolls back before commit)
        send_otp_email(new_user.email, otp, new_user.name)
        db.session.commit()

        return jsonify({
            'message': 'Registration successful. Please verify your email with the OTP sent to your inbox.',
            'needs_verification': True,
            'email': new_user.email,
            'role': new_user.role,
            'otp': otp
        }), 201
    except RuntimeError as e:
        db.session.rollback()
        return jsonify({'message': f'Email delivery failed: {str(e)}'}), 500
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
            'message': f'A new verification code has been sent to your email. It expires in {OTP_VALIDITY_MINUTES} minutes.'
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

    try:
        user.last_login_at = datetime.utcnow()
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Failed to update last login: {e}")

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


@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Missing data'}), 400
        
    new_password = data.get('new_password')
    if not new_password or len(new_password) < 6:
        return jsonify({'message': 'New password must be at least 6 characters long.'}), 400
        
    try:
        g.user.set_password(new_password)
        g.user.must_change_password = False
        db.session.commit()
        return jsonify({
            'message': 'Password updated successfully!',
            'user': g.user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update password: {str(e)}'}), 500
