from flask import Blueprint, jsonify, request, g
from app.models import db
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.models.application import Application, MatchScore
from app.models.setting import SystemSetting
from app.middleware.auth_middleware import token_required, roles_allowed
from datetime import datetime, timedelta
from sqlalchemy import func, extract, or_
import json
import random
import string
from app.services.email_service import send_approval_email, send_rejection_email

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
    
    # Applications grouped by status (single efficient query)
    status_counts = db.session.query(
        Application.status, func.count(Application.id)
    ).group_by(Application.status).all()
    applications_by_status = {status: count for status, count in status_counts}
    total_applications = sum(applications_by_status.values())
    
    # Calculate average match score efficiently via SQL
    avg_result = db.session.query(func.avg(MatchScore.final_score)).scalar()
    avg_score = round(avg_result, 1) if avg_result else 0.0
    
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
    
    # Additional dashboard metrics
    pending_approvals = User.query.filter(
        User.role == 'recruiter',
        or_(
            User.approval_status == 'pending',
            db.and_(User.approval_status.is_(None), User.email_verified == True)
        )
    ).count()
    active_jobs = Job.query.filter_by(status='open').count()
    
    # Per-status counts from the grouped query
    shortlisted_count = applications_by_status.get('shortlisted', 0)
    interview_count = applications_by_status.get('interview', 0)
    selected_count = applications_by_status.get('selected', 0) + applications_by_status.get('approved', 0)
    hired_count = applications_by_status.get('hired', 0)
    evaluated_count = applications_by_status.get('evaluated', 0)
    rejected_count = applications_by_status.get('rejected', 0)
    applied_count = applications_by_status.get('applied', 0) + applications_by_status.get('pending_evaluation', 0)
    
    return jsonify({
        'metrics': {
            'total_candidates': total_candidates,
            'total_recruiters': total_recruiters,
            'total_admins': total_admins,
            'total_jobs': total_jobs,
            'total_resumes': total_resumes,
            'total_applications': total_applications,
            'average_match_score': avg_score,
            'top_skills': top_skills_formatted,
            'pending_approvals': pending_approvals,
            'active_jobs': active_jobs,
            'shortlisted_count': shortlisted_count,
            'interview_count': interview_count,
            'selected_count': selected_count,
            'hired_count': hired_count,
            'evaluated_count': evaluated_count,
            'rejected_count': rejected_count,
            'applied_count': applied_count,
            'applications_by_status': applications_by_status
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
            u_dict['active_jobs_posted'] = Job.query.filter_by(recruiter_id=u.id, status='open').count()
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
        # Generate random 8-character temporary password
        chars = string.ascii_letters + string.digits
        temp_password = ''.join(random.choice(chars) for _ in range(8))

        user.set_password(temp_password)
        user.must_change_password = True
        user.approval_status = 'approved'
        
        # Send approval email containing credentials
        send_approval_email(user.email, user.name, temp_password)
        
        db.session.commit()
        return jsonify({
            'message': f"Recruiter '{user.name}' approved successfully. Credentials emailed.",
            'user': user.to_dict(),
            'temp_password': temp_password # returned for ease of verification/testing
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to approve recruiter: {str(e)}'}), 500


@admin_bp.route('/users/<int:user_id>/reject', methods=['PUT'])
@token_required
@roles_allowed('admin')
def reject_recruiter(user_id):
    user = User.query.get_or_404(user_id)

    if user.role != 'recruiter':
        return jsonify({'message': 'Only recruiter accounts can be rejected.'}), 400

    if not user.email_verified:
        return jsonify({'message': 'Recruiter must verify their email before rejection.'}), 400

    try:
        user.approval_status = 'rejected'
        
        # Send rejection email
        send_rejection_email(user.email, user.name)
        
        db.session.commit()
        return jsonify({
            'message': f"Recruiter '{user.name}' rejected successfully. Rejection email sent.",
            'user': user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to reject recruiter: {str(e)}'}), 500


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

@admin_bp.route('/jobs/<int:job_id>/details', methods=['GET'])
@token_required
@roles_allowed('admin')
def get_job_details(job_id):
    job = Job.query.get_or_404(job_id)
    
    # Application pipeline counts
    apps = Application.query.filter_by(job_id=job_id).all()
    total = len(apps)
    pending = sum(1 for a in apps if a.status in ['applied', 'pending_evaluation'])
    evaluated_only = sum(1 for a in apps if a.status == 'evaluated')
    shortlisted_only = sum(1 for a in apps if a.status == 'shortlisted')
    interview_only = sum(1 for a in apps if a.status == 'interview')
    selected_only = sum(1 for a in apps if a.status in ['selected', 'approved'])
    hired_only = sum(1 for a in apps if a.status == 'hired')
    rejected_only = sum(1 for a in apps if a.status == 'rejected')
    # Total evaluated = all scored candidates (everything past pending)
    evaluated_total = total - pending
    # Total shortlisted = shortlisted + downstream (interview + selected + hired)
    shortlisted_plus = shortlisted_only + interview_only + selected_only + hired_only

    pipeline = {
        'total': total,
        'pending': pending,
        'evaluated': evaluated_total,
        'evaluated_only': evaluated_only,
        'shortlisted': shortlisted_plus,
        'shortlisted_only': shortlisted_only,
        'interview': interview_only,
        'selected': selected_only,
        'hired': hired_only,
        'rejected': rejected_only
    }
    
    # AI evaluation stats
    app_ids = [a.id for a in apps]
    avg_final = 0.0
    score_distribution = {'0-20': 0, '20-40': 0, '40-60': 0, '60-80': 0, '80-100': 0}
    if app_ids:
        scores = MatchScore.query.filter(MatchScore.application_id.in_(app_ids)).all()
        if scores:
            avg_final = round(sum(s.final_score for s in scores) / len(scores), 1)
            for s in scores:
                fs = s.final_score
                if fs < 20:
                    score_distribution['0-20'] += 1
                elif fs < 40:
                    score_distribution['20-40'] += 1
                elif fs < 60:
                    score_distribution['40-60'] += 1
                elif fs < 80:
                    score_distribution['60-80'] += 1
                else:
                    score_distribution['80-100'] += 1
    
    ai_stats = {
        'avg_final_score': avg_final,
        'score_distribution': score_distribution
    }
    
    # Recent 10 applications
    recent_apps = Application.query.filter_by(job_id=job_id).order_by(Application.id.desc()).limit(10).all()
    recent_apps_data = []
    for app in recent_apps:
        latest_score = None
        if app.matches:
            latest_match = sorted(app.matches, key=lambda m: m.calculated_at, reverse=True)[0]
            latest_score = latest_match.final_score
        recent_apps_data.append({
            'candidate_name': app.candidate.name if app.candidate else None,
            'status': app.status,
            'applied_at': app.applied_at.isoformat() if app.applied_at else None,
            'match_score': latest_score
        })
    
    return jsonify({
        **job.to_dict(),
        'recruiter_name': job.recruiter.name if job.recruiter else None,
        'recruiter_email': job.recruiter.email if job.recruiter else None,
        'pipeline': pipeline,
        'pipeline_counts': pipeline,
        'ai_stats': {
            'avg_score': avg_final,
            'score_distribution': score_distribution
        },
        'recent_applications': recent_apps_data
    }), 200

@admin_bp.route('/candidates/<int:candidate_id>/details', methods=['GET'])
@token_required
@roles_allowed('admin')
def get_candidate_details(candidate_id):
    user = User.query.get_or_404(candidate_id)
    
    # Resume info
    resumes = Resume.query.filter_by(user_id=candidate_id).all()
    resumes_data = [{
        'file_name': r.file_name,
        'parsed_at': r.parsed_at.isoformat() if r.parsed_at else None,
        'experience_years': r.experience_years,
        'skills': r.skills
    } for r in resumes]
    
    # Applications list
    apps = Application.query.filter_by(candidate_id=candidate_id).all()
    apps_data = []
    for app in apps:
        latest_score = None
        if app.matches:
            latest_match = sorted(app.matches, key=lambda m: m.calculated_at, reverse=True)[0]
            latest_score = latest_match.final_score
        apps_data.append({
            'job_title': app.job.title if app.job else None,
            'company': app.job.recruiter.name if (app.job and app.job.recruiter) else None,
            'status': app.status,
            'applied_at': app.applied_at.isoformat() if app.applied_at else None,
            'match_score': latest_score
        })
    
    return jsonify({
        'user': {
            'name': user.name,
            'email': user.email,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None
        },
        'resumes': resumes_data,
        'applications': apps_data
    }), 200

@admin_bp.route('/export/recruiters', methods=['GET'])
@token_required
@roles_allowed('admin')
def export_recruiters():
    recruiters = User.query.filter_by(role='recruiter').all()
    data = []
    for r in recruiters:
        data.append({
            'name': r.name,
            'email': r.email,
            'approval_status': r.approval_status,
            'email_verified': bool(r.email_verified),
            'jobs_posted': Job.query.filter_by(recruiter_id=r.id).count(),
            'active_jobs_posted': Job.query.filter_by(recruiter_id=r.id, status='open').count(),
            'applications_received': Application.query.join(Job).filter(Job.recruiter_id == r.id).count(),
            'created_at': r.created_at.isoformat() if r.created_at else None,
            'last_login_at': r.last_login_at.isoformat() if r.last_login_at else None
        })
    return jsonify(data), 200

@admin_bp.route('/export/candidates', methods=['GET'])
@token_required
@roles_allowed('admin')
def export_candidates():
    candidates = User.query.filter_by(role='candidate').all()
    data = []
    for c in candidates:
        data.append({
            'name': c.name,
            'email': c.email,
            'resumes_count': Resume.query.filter_by(user_id=c.id).count(),
            'applications_sent': Application.query.filter_by(candidate_id=c.id).count(),
            'created_at': c.created_at.isoformat() if c.created_at else None,
            'last_login_at': c.last_login_at.isoformat() if c.last_login_at else None
        })
    return jsonify(data), 200

@admin_bp.route('/export/jobs', methods=['GET'])
@token_required
@roles_allowed('admin')
def export_jobs():
    jobs = Job.query.all()
    data = []
    for j in jobs:
        data.append({
            'title': j.title,
            'recruiter_name': j.recruiter.name if j.recruiter else None,
            'location': j.location,
            'status': j.status,
            'experience_required': j.experience_required,
            'applications_count': Application.query.filter_by(job_id=j.id).count(),
            'created_at': j.created_at.isoformat() if j.created_at else None
        })
    return jsonify(data), 200

@admin_bp.route('/export/applications', methods=['GET'])
@token_required
@roles_allowed('admin')
def export_applications():
    apps = Application.query.all()
    data = []
    for app in apps:
        latest_score = None
        if app.matches:
            latest_match = sorted(app.matches, key=lambda m: m.calculated_at, reverse=True)[0]
            latest_score = latest_match.final_score
        data.append({
            'candidate_name': app.candidate.name if app.candidate else None,
            'candidate_email': app.candidate.email if app.candidate else None,
            'job_title': app.job.title if app.job else None,
            'recruiter_name': app.job.recruiter.name if (app.job and app.job.recruiter) else None,
            'status': app.status,
            'applied_at': app.applied_at.isoformat() if app.applied_at else None,
            'match_score': latest_score
        })
    return jsonify(data), 200

@admin_bp.route('/export/hiring-report', methods=['GET'])
@token_required
@roles_allowed('admin')
def export_hiring_report():
    jobs = Job.query.all()
    data = []
    for j in jobs:
        apps = Application.query.filter_by(job_id=j.id).all()
        data.append({
            'title': j.title,
            'recruiter_name': j.recruiter.name if j.recruiter else None,
            'total_applications': len(apps),
            'applied': sum(1 for a in apps if a.status == 'applied'),
            'evaluated': sum(1 for a in apps if a.status == 'evaluated'),
            'shortlisted': sum(1 for a in apps if a.status == 'shortlisted'),
            'interview': sum(1 for a in apps if a.status == 'interview'),
            'selected': sum(1 for a in apps if a.status == 'selected'),
            'hired': sum(1 for a in apps if a.status == 'hired'),
            'rejected': sum(1 for a in apps if a.status == 'rejected')
        })
    return jsonify(data), 200

@admin_bp.route('/export/recruiter-report', methods=['GET'])
@token_required
@roles_allowed('admin')
def export_recruiter_report():
    recruiters = User.query.filter_by(role='recruiter').all()
    data = []
    for r in recruiters:
        jobs = Job.query.filter_by(recruiter_id=r.id).all()
        job_ids = [j.id for j in jobs]
        apps = Application.query.filter(Application.job_id.in_(job_ids)).all() if job_ids else []
        app_ids = [a.id for a in apps]
        scores = MatchScore.query.filter(MatchScore.application_id.in_(app_ids)).all() if app_ids else []
        avg_score = round(sum(s.final_score for s in scores) / len(scores), 1) if scores else 0.0
        
        data.append({
            'name': r.name,
            'email': r.email,
            'total_jobs': len(jobs),
            'active_jobs': sum(1 for j in jobs if j.status == 'open'),
            'total_applications': len(apps),
            'shortlisted': sum(1 for a in apps if a.status == 'shortlisted'),
            'hired': sum(1 for a in apps if a.status == 'hired'),
            'avg_match_score': avg_score
        })
    return jsonify(data), 200

@admin_bp.route('/analytics', methods=['GET'])
@token_required
@roles_allowed('admin')
def get_analytics():
    # Applications by status
    app_status_counts = db.session.query(
        Application.status, func.count(Application.id)
    ).group_by(Application.status).all()
    applications_by_status = {status: count for status, count in app_status_counts}
    
    # Jobs by status
    job_status_counts = db.session.query(
        Job.status, func.count(Job.id)
    ).group_by(Job.status).all()
    jobs_by_status = {status: count for status, count in job_status_counts}
    
    # Recent activities (reuse logic from /logs)
    logs = []
    users = User.query.order_by(User.id.desc()).limit(15).all()
    for u in users:
        logs.append({
            'type': 'user',
            'message': f"New account registered: '{u.name}' ({u.email}) signed up as role '{u.role}'.",
            'timestamp': u.created_at.isoformat() if u.created_at else None
        })
    jobs_log = Job.query.order_by(Job.id.desc()).limit(15).all()
    for j in jobs_log:
        recruiter = User.query.get(j.recruiter_id)
        recruiter_name = recruiter.name if recruiter else f"ID {j.recruiter_id}"
        logs.append({
            'type': 'job',
            'message': f"New job posting published: '{j.title}' by Recruiter '{recruiter_name}' (Location: '{j.location or 'Remote'}').",
            'timestamp': j.created_at.isoformat() if j.created_at else None
        })
    resumes = Resume.query.order_by(Resume.id.desc()).limit(15).all()
    for r in resumes:
        cand = User.query.get(r.user_id)
        cand_name = cand.name if cand else f"ID {r.user_id}"
        logs.append({
            'type': 'resume',
            'message': f"Resume uploaded & parsed: '{r.file_name}' for Candidate '{cand_name}' ({r.experience_years} years experience parsed).",
            'timestamp': r.parsed_at.isoformat() if r.parsed_at else None
        })
    applications_log = Application.query.order_by(Application.id.desc()).limit(15).all()
    for app in applications_log:
        cand = User.query.get(app.candidate_id)
        job = Job.query.get(app.job_id)
        cand_name = cand.name if cand else f"ID {app.candidate_id}"
        job_title = job.title if job else f"ID {app.job_id}"
        logs.append({
            'type': 'application',
            'message': f"Job application submitted: Candidate '{cand_name}' applied for '{job_title}' (Status: '{app.status.upper()}').",
            'timestamp': app.applied_at.isoformat() if app.applied_at else None
        })
    logs.sort(key=lambda x: x['timestamp'] or '', reverse=True)
    recent_activities = logs[:15]
    
    # Monthly applications for last 6 months
    now = datetime.utcnow()
    monthly_applications = []
    for i in range(5, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1, day=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1, day=1)
        count = Application.query.filter(
            Application.applied_at >= month_start,
            Application.applied_at < month_end
        ).count()
        monthly_applications.append({
            'month': month_start.strftime('%Y-%m'),
            'count': count
        })
    
    # Top 5 recruiters by active jobs
    recruiters = User.query.filter_by(role='recruiter').all()
    recruiter_stats = []
    for r in recruiters:
        active = Job.query.filter_by(recruiter_id=r.id, status='open').count()
        total_apps = Application.query.join(Job).filter(Job.recruiter_id == r.id).count()
        recruiter_stats.append({
            'name': r.name,
            'active_jobs': active,
            'total_applications': total_apps
        })
    recruiter_stats.sort(key=lambda x: x['active_jobs'], reverse=True)
    top_recruiters = recruiter_stats[:5]
    
    return jsonify({
        'applications_by_status': applications_by_status,
        'jobs_by_status': jobs_by_status,
        'recent_activities': recent_activities,
        'monthly_applications': monthly_applications,
        'top_recruiters': top_recruiters
    }), 200
