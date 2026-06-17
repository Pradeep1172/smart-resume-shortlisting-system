from flask import Blueprint, jsonify, request, g
from app.models import db
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.models.application import Application, MatchScore
from app.models.setting import SystemSetting
from app.middleware.auth_middleware import token_required, roles_allowed
import json

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/dashboard', methods=['GET'])
@token_required
@roles_allowed('admin')
def get_admin_dashboard():
    total_candidates = User.query.filter_by(role='candidate').count()
    total_recruiters = User.query.filter_by(role='recruiter').count()
    total_admins = User.query.filter_by(role='admin').count()
    total_jobs = Job.query.count()
    total_resumes = Resume.query.count()
    total_applications = Application.query.count()
    
    # Calculate average match score
    match_scores = MatchScore.query.all()
    avg_score = round(sum([m.final_score for m in match_scores]) / len(match_scores), 1) if match_scores else 0.0
    
    # Popular skills in system
    skills_counts = {}
    for job in Job.query.all():
        skills = job.skills_required
        if isinstance(skills, str):
            try:
                skills = json.loads(skills)
            except:
                skills = []
        if isinstance(skills, list):
            for s in skills:
                s_name = s.strip()
                s_lower = s_name.lower()
                if s_lower:
                    skills_counts[s_name] = skills_counts.get(s_name, 0) + 1
                    
    top_skills = sorted(skills_counts.items(), key=lambda x: x[1], reverse=True)[:6]
    top_skills_formatted = [{'skill': k, 'count': v} for k, v in top_skills]
    
    # Recent users for dashboard preview
    recent_users = User.query.order_by(User.id.desc()).limit(5).all()
    
    return jsonify({
        'metrics': {
            'total_candidates': total_candidates,
            'total_recruiters': total_recruiters,
            'total_admins': total_admins,
            'total_jobs': total_jobs,
            'total_resumes': total_resumes,
            'total_applications': total_applications,
            'average_match_score': avg_score,
            'top_skills': top_skills_formatted
        },
        'recent_users': [u.to_dict() for u in recent_users]
    }), 200

@admin_bp.route('/users', methods=['GET'])
@token_required
@roles_allowed('admin')
def get_users():
    role = request.args.get('role')
    query = User.query
    if role:
        query = query.filter_by(role=role)
        
    users = query.all()
    
    users_data = []
    for u in users:
        u_dict = u.to_dict()
        if u.role == 'recruiter':
            u_dict['jobs_posted'] = Job.query.filter_by(recruiter_id=u.id).count()
            u_dict['applications_received'] = Application.query.join(Job).filter(Job.recruiter_id == u.id).count()
        elif u.role == 'candidate':
            u_dict['resumes_count'] = Resume.query.filter_by(user_id=u.id).count()
            u_dict['applications_sent'] = Application.query.filter_by(candidate_id=u.id).count()
        users_data.append(u_dict)
        
    return jsonify(users_data), 200

@admin_bp.route('/users/<int:user_id>/approve', methods=['PUT'])
@token_required
@roles_allowed('admin')
def approve_recruiter(user_id):
    user = User.query.get_or_404(user_id)

    if user.role != 'recruiter':
        return jsonify({'message': 'Only recruiter accounts can be approved.'}), 400

    if not user.email_verified:
        return jsonify({'message': 'Recruiter must verify their email before approval.'}), 400

    if user.approval_status == 'approved':
        return jsonify({'message': 'Recruiter is already approved.', 'user': user.to_dict()}), 200

    try:
        user.approval_status = 'approved'
        db.session.commit()
        return jsonify({
            'message': f"Recruiter '{user.name}' approved successfully.",
            'user': user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to approve recruiter: {str(e)}'}), 500


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@token_required
@roles_allowed('admin')
def delete_user(user_id):
    if g.user.id == user_id:
        return jsonify({'message': 'Access forbidden: you cannot delete your own admin account!'}), 400
        
    user = User.query.get_or_404(user_id)
    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': f"User '{user.name}' deleted successfully!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete user: {str(e)}'}), 500

@admin_bp.route('/config', methods=['GET'])
@token_required
@roles_allowed('admin')
def get_config():
    settings = SystemSetting.query.all()
    settings_dict = {s.key: s.value for s in settings}
    
    # Set default values if not present
    defaults = {
        'GEMINI_API_KEY': '',
        'DEFAULT_WEIGHTS': '{"skills": 50, "projects": 30, "experience": 20}',
        'SITE_NAME': 'ShortlistIQ ATS',
        'DEFAULT_SCREENING_THRESHOLD': '70',
        'ALLOW_CANDIDATE_REGISTRATION': 'true',
        'GEMINI_MODEL_VERSION': 'gemini-1.5-flash'
    }
    
    for k, v in defaults.items():
        if k not in settings_dict:
            settings_dict[k] = v
            
    return jsonify(settings_dict), 200

@admin_bp.route('/config', methods=['POST'])
@token_required
@roles_allowed('admin')
def save_config():
    data = request.get_json() or {}
    try:
        # If DEFAULT_WEIGHTS is in the payload, validate it
        if 'DEFAULT_WEIGHTS' in data:
            weights_val = data['DEFAULT_WEIGHTS']
            if isinstance(weights_val, str):
                weights_dict = json.loads(weights_val)
            else:
                weights_dict = weights_val
            skills = int(weights_dict.get('skills', 50))
            projects = int(weights_dict.get('projects', 30))
            experience = int(weights_dict.get('experience', 20))
            if skills + projects + experience != 100:
                return jsonify({'message': 'Evaluation weights must sum to exactly 100%'}), 400
            data['DEFAULT_WEIGHTS'] = json.dumps(weights_dict)

        for key, value in data.items():
            setting = SystemSetting.query.filter_by(key=key).first()
            if not setting:
                setting = SystemSetting(key=key, value=str(value))
                db.session.add(setting)
            else:
                setting.value = str(value)
                
        db.session.commit()
        return jsonify({'message': 'Configurations updated successfully!'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to save settings: {str(e)}'}), 500

@admin_bp.route('/logs', methods=['GET'])
@token_required
@roles_allowed('admin')
def get_logs():
    logs = []
    
    # 1. Recent Users
    users = User.query.order_by(User.id.desc()).limit(15).all()
    for u in users:
        logs.append({
            'type': 'user',
            'message': f"New account registered: '{u.name}' ({u.email}) signed up as role '{u.role}'.",
            'timestamp': u.created_at.isoformat() if u.created_at else None
        })
        
    # 2. Recent Vacancies
    jobs = Job.query.order_by(Job.id.desc()).limit(15).all()
    for j in jobs:
        recruiter = User.query.get(j.recruiter_id)
        recruiter_name = recruiter.name if recruiter else f"ID {j.recruiter_id}"
        logs.append({
            'type': 'job',
            'message': f"New job posting published: '{j.title}' by Recruiter '{recruiter_name}' (Location: '{j.location or 'Remote'}').",
            'timestamp': j.created_at.isoformat() if j.created_at else None
        })
        
    # 3. Recent Resume Uploads
    resumes = Resume.query.order_by(Resume.id.desc()).limit(15).all()
    for r in resumes:
        cand = User.query.get(r.user_id)
        cand_name = cand.name if cand else f"ID {r.user_id}"
        logs.append({
            'type': 'resume',
            'message': f"Resume uploaded & parsed: '{r.file_name}' for Candidate '{cand_name}' ({r.experience_years} years experience parsed).",
            'timestamp': r.parsed_at.isoformat() if r.parsed_at else None
        })
        
    # 4. Recent Applications
    applications = Application.query.order_by(Application.id.desc()).limit(15).all()
    for app in applications:
        cand = User.query.get(app.candidate_id)
        job = Job.query.get(app.job_id)
        cand_name = cand.name if cand else f"ID {app.candidate_id}"
        job_title = job.title if job else f"ID {app.job_id}"
        logs.append({
            'type': 'application',
            'message': f"Job application submitted: Candidate '{cand_name}' applied for '{job_title}' (Status: '{app.status.upper()}').",
            'timestamp': app.applied_at.isoformat() if app.applied_at else None
        })
        
    # Sort logs by timestamp desc
    logs.sort(key=lambda x: x['timestamp'] or '', reverse=True)
    
    return jsonify(logs[:40]), 200

