from flask import Blueprint, request, jsonify, g
from app.models import db
from app.models.job import Job
from app.models.notification import Notification
from app.middleware.auth_middleware import token_required, roles_allowed

jobs_bp = Blueprint('jobs', __name__)

@jobs_bp.route('', methods=['GET'])
@token_required
def get_jobs():
    status = request.args.get('status')
    recruiter_id = request.args.get('recruiter_id')
    
    query = Job.query
    
    if status:
        query = query.filter_by(status=status)
    if recruiter_id:
        query = query.filter_by(recruiter_id=recruiter_id)
        
    jobs = query.all()
    return jsonify([job.to_dict() for job in jobs]), 200

@jobs_bp.route('/<int:job_id>', methods=['GET'])
@token_required
def get_job(job_id):
    job = Job.query.get_or_404(job_id)
    return jsonify(job.to_dict()), 200

@jobs_bp.route('', methods=['POST'])
@token_required
@roles_allowed('recruiter', 'admin')
def create_job():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Missing job posting data'}), 400
        
    title = data.get('title')
    description = data.get('description')
    skills_required = data.get('skills_required', [])
    experience_required = data.get('experience_required', 0)
    location = data.get('location', '')
    min_match_score = data.get('min_match_score', 70)
    ai_insights_enabled = data.get('ai_insights_enabled', True)
    
    deadline_str = data.get('deadline')
    deadline = None
    if deadline_str:
        try:
            from datetime import datetime
            if 'T' in deadline_str:
                deadline = datetime.fromisoformat(deadline_str.replace('Z', ''))
            else:
                deadline = datetime.strptime(deadline_str, '%Y-%m-%d')
        except ValueError:
            return jsonify({'message': 'Invalid deadline format. Use YYYY-MM-DD or ISO string'}), 400
            
    if not title or not description:
        return jsonify({'message': 'Title and description are required'}), 400
        
    if not isinstance(skills_required, list):
        return jsonify({'message': 'skills_required must be a list of strings'}), 400
    
    # Auto-compute evaluation weights from experience_required
    from app.services.match_service import auto_compute_weights
    computed_weights = auto_compute_weights(experience_required)
        
    try:
        new_job = Job(
            recruiter_id=g.user.id,
            title=title,
            description=description,
            skills_required=skills_required,
            experience_required=experience_required,
            location=location,
            status='open',
            deadline=deadline,
            min_match_score=int(min_match_score),
            evaluation_type='ai',
            ai_insights_enabled=bool(ai_insights_enabled),
            evaluation_weights=computed_weights
        )
        db.session.add(new_job)
        db.session.commit()
        return jsonify({
            'message': 'Job posted successfully!',
            'job': new_job.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to create job: {str(e)}'}), 500


@jobs_bp.route('/<int:job_id>', methods=['PUT'])
@token_required
@roles_allowed('recruiter', 'admin')
def update_job(job_id):
    job = Job.query.get_or_404(job_id)
    
    # Recruiter can only edit their own jobs
    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting!'}), 403
        
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Missing update data'}), 400
        
    job.title = data.get('title', job.title)
    job.description = data.get('description', job.description)
    job.skills_required = data.get('skills_required', job.skills_required)
    job.experience_required = data.get('experience_required', job.experience_required)
    job.location = data.get('location', job.location)
    job.status = data.get('status', job.status)
    job.min_match_score = data.get('min_match_score', job.min_match_score)
    job.evaluation_status = data.get('evaluation_status', job.evaluation_status)
    if 'ai_insights_enabled' in data:
        job.ai_insights_enabled = bool(data['ai_insights_enabled'])
    
    # Re-compute weights if experience_required changed
    if 'experience_required' in data:
        from app.services.match_service import auto_compute_weights
        job.evaluation_weights = auto_compute_weights(job.experience_required)
    
    deadline_str = data.get('deadline')
    if deadline_str:
        try:
            from datetime import datetime
            if 'T' in deadline_str:
                job.deadline = datetime.fromisoformat(deadline_str.replace('Z', ''))
            else:
                job.deadline = datetime.strptime(deadline_str, '%Y-%m-%d')
        except ValueError:
            return jsonify({'message': 'Invalid deadline format. Use YYYY-MM-DD or ISO string'}), 400
            
    try:
        db.session.commit()
        return jsonify({
            'message': 'Job updated successfully!',
            'job': job.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update job: {str(e)}'}), 500


@jobs_bp.route('/<int:job_id>', methods=['DELETE'])
@token_required
@roles_allowed('recruiter', 'admin')
def delete_job(job_id):
    job = Job.query.get_or_404(job_id)
    
    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting!'}), 403
        
    try:
        db.session.delete(job)
        db.session.commit()
        return jsonify({'message': 'Job posting deleted successfully!'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete job: {str(e)}'}), 500


@jobs_bp.route('/<int:job_id>/evaluate', methods=['POST'])
@token_required
@roles_allowed('recruiter', 'admin')
def evaluate_job_applications(job_id):
    job = Job.query.get_or_404(job_id)
    
    # Recruiter check
    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting!'}), 403

    # Unified engine: always runs Keyword + ATS + AI
    # Weights are auto-computed from job.experience_required
    from app.services.match_service import calculate_match_score, generate_pool_ai_analysis, auto_compute_weights
    from app.models.application import Application, MatchScore
    
    # Recompute weights (in case experience_required was updated)
    resolved_weights = auto_compute_weights(job.experience_required)
    
    applications = Application.query.filter_by(job_id=job.id).all()
    
    try:
        scores = []
        matched_skills_all = []
        missing_skills_all = []

        # Remove previous match scores to prevent duplication
        for app in applications:
            MatchScore.query.filter_by(application_id=app.id).delete()

        evaluated_apps = []
        for app in applications:
            try:
                # Check resume validity: invalid resumes never generate scores
                from app.services.parser_service import calculate_resume_confidence
                confidence = calculate_resume_confidence(app.resume.extracted_text or '')
                if confidence < 35:
                    print(f"Skipping evaluation for application {app.id} due to invalid resume (confidence: {confidence})")
                    continue

                # Unified evaluation: always calculates all three layers
                match_data = calculate_match_score(app.resume, job, weights=resolved_weights)
                
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
                
                scores.append(match_data['final_score'])
                matched_skills_all.extend(match_data['details'].get('matched_skills', []))
                missing_skills_all.extend(match_data['details'].get('missing_skills', []))
                evaluated_apps.append(app)
            except Exception as e:
                # Gemini failures or single-candidate errors never break other candidates' evaluation process
                print(f"Failed to evaluate candidate application {app.id}: {e}")
                continue
            
        # Generate pool analysis using only successfully evaluated applications
        pool_data = generate_pool_ai_analysis(job, evaluated_apps, scores, matched_skills_all, missing_skills_all)

        # Update job fields
        job.evaluation_type = 'ai'
        job.evaluation_weights = resolved_weights
        job.evaluation_status = 'evaluated'
        job.pool_analysis = pool_data
        job.results_generated = False
        
        # Notify Recruiter
        recruiter_notif = Notification(
            user_id=job.recruiter_id,
            message=f"Screening pipeline executed for job '{job.title}'. Evaluated {len(evaluated_apps)} candidates."
        )
        db.session.add(recruiter_notif)
        
        db.session.commit()
        return jsonify({
            'message': f'Successfully evaluated {len(applications)} applications!',
            'job': job.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Evaluation failed: {str(e)}'}), 500


@jobs_bp.route('/<int:job_id>/generate-results', methods=['POST'])
@token_required
@roles_allowed('recruiter', 'admin')
def generate_job_results(job_id):
    job = Job.query.get_or_404(job_id)
    
    # Recruiter check
    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting!'}), 403
        
    data = request.get_json() or {}
    threshold = data.get('threshold')
    
    if threshold is None:
        if job.pool_analysis and 'recommended_threshold' in job.pool_analysis:
            threshold = job.pool_analysis['recommended_threshold']
        else:
            threshold = 70
            
    try:
        threshold = int(threshold)
    except ValueError:
        return jsonify({'message': 'Invalid threshold value'}), 400

    from app.models.application import Application, MatchScore
    
    applications = Application.query.filter_by(job_id=job.id).all()
    
    try:
        for app in applications:
            # Find the latest match score
            score_record = MatchScore.query.filter_by(application_id=app.id).order_by(MatchScore.id.desc()).first()
            score = score_record.final_score if score_record else 0.0
            
            if score >= threshold:
                app.status = 'shortlisted'
            else:
                app.status = 'rejected'
                
        # Update job settings
        job.min_match_score = threshold
        job.results_generated = True
        
        # Notify Recruiter
        recruiter_notif = Notification(
            user_id=job.recruiter_id,
            message=f"Bulk screening thresholds generated for job '{job.title}' with target threshold of {threshold}%."
        )
        db.session.add(recruiter_notif)
        
        db.session.commit()
        return jsonify({
            'message': f'Results successfully generated for {len(applications)} candidates at threshold {threshold}%!',
            'job': job.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to generate results: {str(e)}'}), 500
