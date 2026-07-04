from flask import Blueprint, jsonify, g, request, send_file
from werkzeug.utils import secure_filename
import os
import time
from app.config import Config
from app.models import db
from app.models.job import Job
from app.models.application import Application, MatchScore
from app.models.setting import SystemSetting
from app.middleware.auth_middleware import token_required, roles_allowed
import json

recruiter_bp = Blueprint('recruiter', __name__)

@recruiter_bp.route('/dashboard', methods=['GET'])
@token_required
@roles_allowed('recruiter', 'admin')
def get_dashboard():
    from sqlalchemy import func
    
    # Get all jobs posted by the logged-in recruiter
    total_jobs = Job.query.filter_by(recruiter_id=g.user.id).count()
    active_jobs = Job.query.filter_by(recruiter_id=g.user.id, status='open').count()
    
    # Get all applications to recruiter's jobs — grouped by status in one query
    status_counts_raw = db.session.query(
        Application.status, func.count(Application.id)
    ).join(Job).filter(
        Job.recruiter_id == g.user.id
    ).group_by(Application.status).all()
    
    applications_by_status = {status: count for status, count in status_counts_raw}
    total_applications = sum(applications_by_status.values())
    
    # Exact per-status counts
    applied_count = applications_by_status.get('applied', 0)
    pending_eval_count = applications_by_status.get('pending_evaluation', 0)
    evaluated_count = applications_by_status.get('evaluated', 0)
    shortlisted_count = applications_by_status.get('shortlisted', 0)
    interview_count = applications_by_status.get('interview', 0)
    selected_count = applications_by_status.get('selected', 0) + applications_by_status.get('approved', 0)
    hired_count = applications_by_status.get('hired', 0)
    rejected_count = applications_by_status.get('rejected', 0)
    
    # Pending = applied + pending_evaluation (not yet scored)
    pending_evals = applied_count + pending_eval_count
    
    # Evaluated = all candidates who have been scored (everything past pending)
    evaluated_candidates = total_applications - pending_evals
    
    # Shortlisted includes downstream: shortlisted + interview + selected + hired
    shortlisted_plus = shortlisted_count + interview_count + selected_count + hired_count
    
    # Fetch top 5 recent applications
    recent_apps = Application.query.join(Job).filter(
        Job.recruiter_id == g.user.id
    ).order_by(Application.applied_at.desc()).limit(5).all()
    
    return jsonify({
        'metrics': {
            'total_jobs': total_jobs,
            'active_jobs': active_jobs,
            'total_applications': total_applications,
            'pending_evaluations': pending_evals,
            'evaluated_candidates': evaluated_candidates,
            'shortlisted_applications': shortlisted_plus,
            'approved_applications': selected_count,
            'hired_applications': hired_count,
            'interview_applications': interview_count,
            'rejected_applications': rejected_count,
            'applications_by_status': applications_by_status
        },
        'recent_applications': [app.to_dict() for app in recent_apps]
    }), 200

@recruiter_bp.route('/settings', methods=['GET'])
@token_required
@roles_allowed('recruiter', 'admin')
def get_settings():
    weights_setting = SystemSetting.query.filter_by(key='DEFAULT_WEIGHTS').first()

    weights = {
        'skills': 50,
        'experience': 20,
        'projects': 20,
        'resume_quality': 10
    }
    if weights_setting and weights_setting.value:
        try:
            weights = json.loads(weights_setting.value)
            # Backward compatibility: ensure resume_quality exists
            if 'resume_quality' not in weights:
                weights['resume_quality'] = 0
        except Exception:
            pass

    return jsonify({
        'default_weights': weights
    }), 200

@recruiter_bp.route('/settings', methods=['POST'])
@token_required
@roles_allowed('recruiter', 'admin')
def save_settings():
    data = request.json or {}
    default_weights = data.get('default_weights')

    # Update Weights
    if default_weights:
        skills = int(default_weights.get('skills', 50))
        experience = int(default_weights.get('experience', 20))
        projects = int(default_weights.get('projects', 20))
        resume_quality = int(default_weights.get('resume_quality', 10))
        if skills + experience + projects + resume_quality != 100:
            return jsonify({'message': 'Weights must sum to exactly 100%'}), 400
            
        weights_setting = SystemSetting.query.filter_by(key='DEFAULT_WEIGHTS').first()
        serialized_weights = json.dumps({
            'skills': skills,
            'experience': experience,
            'projects': projects,
            'resume_quality': resume_quality
        })
        if not weights_setting:
            weights_setting = SystemSetting(key='DEFAULT_WEIGHTS', value=serialized_weights)
            db.session.add(weights_setting)
        else:
            weights_setting.value = serialized_weights

    db.session.commit()
    return jsonify({'message': 'Settings saved successfully!'}), 200


@recruiter_bp.route('/profile', methods=['PUT'])
@token_required
@roles_allowed('recruiter')
def update_profile():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Missing data'}), 400
        
    name = data.get('name')
    company = data.get('company')
    
    if not name:
        return jsonify({'message': 'Name is required'}), 400
        
    g.user.name = name
    if company is not None:
        g.user.company = company

    # Update company_details JSON field
    try:
        details = json.loads(g.user.company_details) if g.user.company_details else {}
    except Exception:
        details = {}

    details['company_name'] = company
    details['company_website'] = data.get('company_website', details.get('company_website'))
    details['company_description'] = data.get('company_description', details.get('company_description'))
    details['industry'] = data.get('industry', details.get('industry'))
    details['company_type'] = data.get('company_type', details.get('company_type'))
    details['company_size'] = data.get('company_size', details.get('company_size'))
    details['established_year'] = data.get('established_year', details.get('established_year'))
    details['headquarters'] = data.get('headquarters', details.get('headquarters'))
    details['company_address'] = data.get('company_address', details.get('company_address'))
    details['hr_email'] = data.get('hr_contact_email', details.get('hr_email'))
    details['phone'] = data.get('phone', details.get('phone'))
    details['linkedin_url'] = data.get('linkedin_url', details.get('linkedin_url'))
    details['twitter_url'] = data.get('twitter_url', details.get('twitter_url'))
    details['default_eval_strategy'] = data.get('default_eval_strategy', details.get('default_eval_strategy'))

    g.user.company_details = json.dumps(details)
        
    db.session.commit()
    return jsonify({
        'message': 'Profile updated successfully',
        'user': g.user.to_dict()
    }), 200


@recruiter_bp.route('/upload-logo', methods=['POST'])
@token_required
@roles_allowed('recruiter', 'admin')
def upload_logo():
    if 'logo' not in request.files:
        return jsonify({'message': 'No logo file in request'}), 400
    file = request.files['logo']
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400
    
    allowed_exts = {'jpg', 'jpeg', 'png', 'webp', 'gif'}
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in allowed_exts:
        return jsonify({'message': 'Invalid file type. Allowed: jpg, jpeg, png, webp, gif'}), 400

    timestamp = int(time.time())
    filename = f"recruiter_{g.user.id}_{timestamp}.{ext}"
    logos_dir = os.path.join(Config.UPLOAD_FOLDER, 'logos')
    os.makedirs(logos_dir, exist_ok=True)
    file_path = os.path.join(logos_dir, filename)
    abs_file_path = os.path.abspath(file_path)

    # Remove old logo if exists
    if g.user.company_logo_path:
        old_path = g.user.company_logo_path
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass
        else:
            # Try to resolve relative path for cleanup
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            rel_path = old_path.lstrip('./').lstrip('.\\')
            alt_path = os.path.join(base_dir, rel_path)
            if os.path.exists(alt_path):
                try:
                    os.remove(alt_path)
                except Exception:
                    pass

    file.save(abs_file_path)
    g.user.company_logo_path = abs_file_path
    db.session.commit()
    return jsonify({
        'message': 'Logo uploaded successfully!',
        'logo_url': f'/api/recruiter/logo/{g.user.id}'
    }), 200


@recruiter_bp.route('/logo/<int:user_id>', methods=['GET'])
def get_logo(user_id):
    from app.models.user import User
    recruiter = User.query.get(user_id)
    if not recruiter or not recruiter.company_logo_path:
        return jsonify({'message': 'No logo found'}), 404
        
    path = recruiter.company_logo_path
    # If the stored path does not exist directly, try resolving it dynamically
    if not os.path.exists(path):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        rel_path = path.lstrip('./').lstrip('.\\')
        alt_path = os.path.join(base_dir, rel_path)
        if os.path.exists(alt_path):
            path = alt_path
        else:
            root_dir = os.path.dirname(base_dir)
            alt_path_root = os.path.join(root_dir, rel_path)
            if os.path.exists(alt_path_root):
                path = alt_path_root
            else:
                return jsonify({'message': 'No logo file found on disk'}), 404
                
    return send_file(path)

