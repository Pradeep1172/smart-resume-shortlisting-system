from flask import Blueprint, jsonify, g, request
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
    # Get all jobs posted by the logged-in recruiter
    total_jobs = Job.query.filter_by(recruiter_id=g.user.id).count()
    active_jobs = Job.query.filter_by(recruiter_id=g.user.id, status='open').count()
    
    # Get all applications to recruiter's jobs
    total_applications = Application.query.join(Job).filter(Job.recruiter_id == g.user.id).count()
    
    # Pending Evaluations (no match score record exists)
    pending_evals = Application.query.join(Job).filter(
        Job.recruiter_id == g.user.id
    ).filter(~Application.matches.any()).count()
    
    # Evaluated Candidates (match score record exists)
    evaluated_candidates = Application.query.join(Job).filter(
        Job.recruiter_id == g.user.id
    ).filter(Application.matches.any()).count()
    
    # Filter by various statuses
    shortlisted_apps = Application.query.join(Job).filter(
        Job.recruiter_id == g.user.id, 
        Application.status == 'shortlisted'
    ).count()
    
    # Check approved/interview/rejected apps
    approved_apps = Application.query.join(Job).filter(
        Job.recruiter_id == g.user.id, 
        Application.status == 'approved'
    ).count()
    
    interview_apps = Application.query.join(Job).filter(
        Job.recruiter_id == g.user.id, 
        Application.status == 'interview'
    ).count()
    
    rejected_apps = Application.query.join(Job).filter(
        Job.recruiter_id == g.user.id, 
        Application.status == 'rejected'
    ).count()
    
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
            'shortlisted_applications': shortlisted_apps,
            'approved_applications': approved_apps,
            'interview_applications': interview_apps,
            'rejected_applications': rejected_apps
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

