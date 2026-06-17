from flask import Blueprint, request, jsonify, g
from app.models import db
from app.models.application import Application, MatchScore
from app.models.job import Job
from app.models.resume import Resume
from app.models.notification import Notification
from app.services.match_service import calculate_match_score
from app.middleware.auth_middleware import token_required, roles_allowed

applications_bp = Blueprint('applications', __name__)

@applications_bp.route('', methods=['POST'])
@token_required
@roles_allowed('candidate', 'admin')
def apply_to_job():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Missing application details'}), 400
        
    job_id = data.get('job_id')
    resume_id = data.get('resume_id')
    
    if not job_id or not resume_id:
        return jsonify({'message': 'job_id and resume_id are required'}), 400
        
    # Check if job exists and is open/expired
    job = Job.query.get(job_id)
    if not job:
        return jsonify({'message': 'Job posting not found'}), 404
        
    from datetime import datetime
    is_expired = job.deadline and datetime.utcnow() > job.deadline
    if job.status != 'open' or is_expired:
        return jsonify({'message': 'This job posting has been closed or expired'}), 400
        
    # Check if resume exists and belongs to the candidate
    resume = Resume.query.get(resume_id)
    if not resume:
        return jsonify({'message': 'Resume not found'}), 404
    if resume.user_id != g.user.id and g.user.role != 'admin':
        return jsonify({'message': 'Access forbidden: you do not own this resume'}), 403
        
    # Check if candidate already applied to this job
    existing_app = Application.query.filter_by(job_id=job_id, candidate_id=g.user.id).first()
    if existing_app:
        return jsonify({'message': 'You have already applied to this job!'}), 409
        
    try:
        # Create Application - always starts as 'applied' (Pending Evaluation)
        application = Application(
            job_id=job_id,
            candidate_id=g.user.id,
            resume_id=resume_id,
            status='applied'
        )
        db.session.add(application)
        
        # Create Notification for Recruiter
        notif_msg = f"New application for '{job.title}' from '{g.user.name}'."
        recruiter_notif = Notification(
            user_id=job.recruiter_id,
            message=notif_msg
        )
        db.session.add(recruiter_notif)
        
        db.session.commit()
        return jsonify({
            'message': 'Application submitted successfully!',
            'application': application.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to submit application: {str(e)}'}), 500


@applications_bp.route('', methods=['GET'])
@token_required
def get_applications():
    job_id = request.args.get('job_id')
    
    if g.user.role == 'candidate':
        # Candidate views their own applications
        apps = Application.query.filter_by(candidate_id=g.user.id).all()
    elif g.user.role == 'recruiter':
        # Recruiter views applications to their jobs
        if job_id:
            # Check ownership of job
            job = Job.query.get_or_404(job_id)
            if job.recruiter_id != g.user.id:
                return jsonify({'message': 'Access forbidden: you do not own this job'}), 403
            apps = Application.query.filter_by(job_id=job_id).all()
        else:
            # All applications to recruiter's jobs
            apps = Application.query.join(Job).filter(Job.recruiter_id == g.user.id).all()
    else:
        # Admin views all
        if job_id:
            apps = Application.query.filter_by(job_id=job_id).all()
        else:
            apps = Application.query.all()
            
    return jsonify([app.to_dict() for app in apps]), 200

@applications_bp.route('/<int:app_id>', methods=['GET'])
@token_required
def get_application(app_id):
    app = Application.query.get_or_404(app_id)
    
    # Authorize based on ownership or role
    if g.user.role == 'candidate' and app.candidate_id != g.user.id:
        return jsonify({'message': 'Access forbidden: unauthorized'}), 403
    elif g.user.role == 'recruiter' and app.job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: unauthorized'}), 403
        
    return jsonify(app.to_dict()), 200


@applications_bp.route('/bulk-status', methods=['PUT'])
@token_required
@roles_allowed('recruiter', 'admin')
def bulk_update_application_status():
    data = request.get_json()
    if not data or 'application_ids' not in data or 'status' not in data:
        return jsonify({'message': 'Missing application_ids or status in payload'}), 400
        
    app_ids = data.get('application_ids')
    new_status = data.get('status')
    
    if not isinstance(app_ids, list):
        return jsonify({'message': 'application_ids must be a list of integers'}), 400
        
    if new_status not in ['applied', 'shortlisted', 'interview', 'rejected', 'approved']:
        return jsonify({'message': 'Invalid status type'}), 400
        
    try:
        updated_count = 0
        for app_id in app_ids:
            app = Application.query.get(app_id)
            if not app:
                continue
            
            # Recruiter ownership check
            if g.user.role == 'recruiter' and app.job.recruiter_id != g.user.id:
                continue
                
            app.status = new_status
            
            # Notify Candidate
            notif_msg = f"Your application status for '{app.job.title}' has been updated to: '{new_status.title()}'."
            candidate_notif = Notification(
                user_id=app.candidate_id,
                message=notif_msg
            )
            db.session.add(candidate_notif)

            # Notify Recruiter
            recruiter_notif = Notification(
                user_id=app.job.recruiter_id,
                message=f"Candidate '{app.candidate_name}' status updated to '{new_status.title()}' for job '{app.job.title}'."
            )
            db.session.add(recruiter_notif)

            updated_count += 1
            
        db.session.commit()
        return jsonify({
            'message': f'Successfully updated status to {new_status} for {updated_count} applications!'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to bulk update status: {str(e)}'}), 500


@applications_bp.route('/<int:app_id>/status', methods=['PUT'])
@token_required
@roles_allowed('recruiter', 'admin')
def update_application_status(app_id):
    app = Application.query.get_or_404(app_id)
    
    # Recruiter check
    if g.user.role == 'recruiter' and app.job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting'}), 403
        
    data = request.get_json()
    if not data or 'status' not in data:
        return jsonify({'message': 'Missing status in payload'}), 400
        
    new_status = data.get('status')
    if new_status not in ['applied', 'shortlisted', 'interview', 'rejected', 'approved']:
        return jsonify({'message': 'Invalid status type'}), 400
        
    try:
        app.status = new_status
        
        # Notify Candidate
        notif_msg = f"Your application status for '{app.job.title}' has been updated to: '{new_status.title()}'."
        candidate_notif = Notification(
            user_id=app.candidate_id,
            message=notif_msg
        )
        db.session.add(candidate_notif)

        # Notify Recruiter
        recruiter_notif = Notification(
            user_id=app.job.recruiter_id,
            message=f"Candidate '{app.candidate_name}' status updated to '{new_status.title()}' for job '{app.job.title}'."
        )
        db.session.add(recruiter_notif)
        
        db.session.commit()
        return jsonify({
            'message': 'Application status updated successfully!',
            'application': app.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update status: {str(e)}'}), 500


@applications_bp.route('/<int:app_id>/rescore', methods=['POST'])
@token_required
@roles_allowed('recruiter', 'admin')
def rescore_application(app_id):
    app = Application.query.get_or_404(app_id)
    
    # Recruiter check
    if g.user.role == 'recruiter' and app.job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting'}), 403
        
    data = request.get_json() or {}
    eval_type = data.get('evaluation_type', 'keyword')
    weights = data.get('weights') # e.g. {'skills': 50, 'projects': 30, 'experience': 20}
    
    if eval_type not in ['keyword', 'weighted', 'ai']:
        return jsonify({'message': 'Invalid evaluation_type'}), 400
        
    try:
        # Check resume validity
        from app.services.parser_service import calculate_resume_confidence
        confidence = calculate_resume_confidence(app.resume.extracted_text or '')
        if confidence < 35:
            # Delete any legacy match scores for this invalid resume to maintain consistency
            MatchScore.query.filter_by(application_id=app.id).delete()
            db.session.commit()
            return jsonify({
                'message': 'Cannot evaluate candidate: the uploaded resume file is invalid or has insufficient content.'
            }), 400

        # Calculate new score
        match_data = calculate_match_score(app.resume, app.job, eval_type=eval_type, weights=weights)
        
        # Remove previous match scores to prevent duplication
        MatchScore.query.filter_by(application_id=app.id).delete()
        
        # Create a new MatchScore record
        score_record = MatchScore(
            application_id=app.id,
            match_percentage=match_data['match_percentage'],
            ai_score=match_data['ai_score'],
            final_score=match_data['final_score'],
            evaluation_type=match_data['evaluation_type'],
            details=match_data['details']
        )
        db.session.add(score_record)

        # Notify Recruiter
        recruiter_notif = Notification(
            user_id=app.job.recruiter_id,
            message=f"AI Evaluation generated for candidate '{app.candidate_name}' ({round(match_data['final_score'])}% Match) for job '{app.job.title}'."
        )
        db.session.add(recruiter_notif)

        db.session.commit()
        
        return jsonify({
            'message': 'Application match score recalculated successfully!',
            'score': score_record.to_dict(),
            'application': app.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Rescoring failed: {str(e)}'}), 500


@applications_bp.route('/reset-evaluations', methods=['GET'])
def reset_evaluations():
    try:
        from app.models.application import MatchScore, Application
        num_deleted = MatchScore.query.delete()
        for app in Application.query.all():
            app.status = 'applied'
        db.session.commit()
        return f"Successfully deleted {num_deleted} MatchScore records and reset applications to 'applied'.", 200
    except Exception as e:
        db.session.rollback()
        return f"Error: {str(e)}", 500
