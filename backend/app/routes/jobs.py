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
    
    # Exclude external hiring jobs from standard job listings
    query = Job.query.filter((Job.is_external == False) | (Job.is_external == None))
    
    if g.user.role == 'recruiter':
        query = query.filter_by(recruiter_id=g.user.id)
    else:
        if recruiter_id:
            query = query.filter_by(recruiter_id=recruiter_id)
            
    if status:
        query = query.filter_by(status=status)
        
    jobs = query.all()
    return jsonify([job.to_dict() for job in jobs]), 200

@jobs_bp.route('/<int:job_id>', methods=['GET'])
@token_required
def get_job(job_id):
    job = Job.query.get_or_404(job_id)
    
    # Block candidates from accessing external jobs
    if g.user.role == 'candidate' and job.is_external:
        return jsonify({'message': 'Access forbidden: this job posting is private'}), 403
        
    # Recruiter isolation check
    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting'}), 403
        
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
    evaluation_strategy = data.get('evaluation_strategy', 'intelligent')
    if evaluation_strategy not in ('quick', 'intelligent'):
        return jsonify({'message': "evaluation_strategy must be 'quick' or 'intelligent'"}), 400
    
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
            evaluation_strategy=evaluation_strategy,
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
        
    # Check if critical evaluation criteria changed
    criteria_changed = False
    if 'skills_required' in data and data['skills_required'] != job.skills_required:
        criteria_changed = True
    if 'experience_required' in data:
        try:
            if int(data['experience_required']) != job.experience_required:
                criteria_changed = True
        except (ValueError, TypeError):
            pass
    if 'evaluation_strategy' in data and data['evaluation_strategy'] != job.evaluation_strategy:
        criteria_changed = True

    if criteria_changed and job.evaluation_status == 'evaluated':
        job.scores_outdated = True

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
    if 'evaluation_strategy' in data:
        new_strategy = data['evaluation_strategy']
        if new_strategy not in ('quick', 'intelligent'):
            return jsonify({'message': "evaluation_strategy must be 'quick' or 'intelligent'"}), 400
        # Block strategy change while evaluation is running
        if hasattr(job, 'evaluation_status') and job.evaluation_status == 'evaluating':
            return jsonify({'message': 'Cannot change evaluation strategy while evaluation is in progress.'}), 409
        job.evaluation_strategy = new_strategy
    
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

    # Block duplicate concurrent evaluations
    if job.evaluation_status == 'evaluating':
        return jsonify({'message': 'Evaluation is already in progress for this job.'}), 409

    # Read evaluation type/strategy from request body or fallback to job strategy
    data = request.get_json() or {}
    strategy = data.get('evaluation_strategy', job.evaluation_strategy or 'intelligent')
    shortlisted_only = data.get('shortlisted_only', False)
    if strategy not in ('quick', 'intelligent'):
        return jsonify({'message': "evaluation_strategy must be 'quick' or 'intelligent'"}), 400

    # Remember previous evaluation status
    prev_status = job.evaluation_status or 'pending'

    # Update job's strategy to the selected run strategy
    job.evaluation_strategy = strategy

    # Set status to evaluating and commit immediately to block strategy changes
    job.evaluation_status = 'evaluating'
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to start evaluation: {str(e)}'}), 500

    from app.services.match_service import calculate_match_score, calculate_quick_score, generate_pool_ai_analysis, generate_pool_quick_analysis, auto_compute_weights
    from app.models.application import Application, MatchScore
    
    # Transition target candidates to 'pending_evaluation' at the beginning and commit
    if shortlisted_only:
        applications = Application.query.filter_by(job_id=job.id, status='shortlisted').all()
        if not applications:
            # Revert job status
            job.evaluation_status = prev_status
            db.session.commit()
            return jsonify({'message': 'No shortlisted candidates found to evaluate.'}), 400
    else:
        applications = Application.query.filter_by(job_id=job.id).all()

    for app in applications:
        if shortlisted_only or app.status == 'applied' or not app.status:
            app.status = 'pending_evaluation'
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        # Restore state on failure
        job.evaluation_status = prev_status
        db.session.commit()
        return jsonify({'message': f'Failed to transition application statuses to pending: {str(e)}'}), 500

    # Recompute weights (in case experience_required was updated)
    resolved_weights = auto_compute_weights(job.experience_required)
    
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
                if job.evaluation_strategy == 'quick':
                    match_data = calculate_quick_score(app.resume, job)
                else:
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
                
                # Update status to evaluated on success if they are in evaluation phase
                if app.status in ('applied', 'pending_evaluation') or not app.status:
                    app.status = 'evaluated'
                
                scores.append(match_data['final_score'])
                matched_skills_all.extend(match_data['details'].get('matched_skills', []))
                missing_skills_all.extend(match_data['details'].get('missing_skills', []))
                evaluated_apps.append(app)
            except Exception as e:
                # Gemini failures or single-candidate errors never break other candidates' evaluation process
                # The candidate status remains 'pending_evaluation' so the recruiter can retry later
                print(f"Failed to evaluate candidate application {app.id}: {e}")
                continue
            
        # Generate pool analysis based on strategy
        if job.evaluation_strategy == 'quick':
            pool_data = generate_pool_quick_analysis(job, evaluated_apps, scores, matched_skills_all, missing_skills_all)
        else:
            pool_data = generate_pool_ai_analysis(job, evaluated_apps, scores, matched_skills_all, missing_skills_all)

        # Update job fields ONLY after successful completion
        from datetime import datetime
        job.evaluation_type = 'keyword' if job.evaluation_strategy == 'quick' else 'ai'
        job.evaluation_weights = resolved_weights
        job.evaluation_status = 'evaluated'
        job.pool_analysis = pool_data
        job.results_generated = False
        job.scores_outdated = False  # Clear outdated flag after successful evaluation
        job.evaluated_at = datetime.utcnow()
        job.evaluated_by_id = g.user.id
        
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
        try:
            # Revert job status on failure
            job.evaluation_status = prev_status
            db.session.commit()
        except Exception:
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

    # Prevent shortlist generation if scores are outdated
    if job.scores_outdated:
        return jsonify({'message': 'Evaluation results are outdated. Please re-evaluate candidates before generating a shortlist.'}), 400
        
    data = request.get_json() or {}
    threshold = data.get('threshold')
    max_candidates = data.get('max_candidates')
    send_emails = data.get('send_emails', False)  # Default to False to allow recruiter confirmation control
    included_ids = data.get('included_ids', None)  # Optional: list of application IDs to shortlist (manual override)
    
    if threshold is None:
        if job.pool_analysis and 'recommended_threshold' in job.pool_analysis:
            threshold = job.pool_analysis['recommended_threshold']
        else:
            threshold = 70
            
    try:
        threshold = int(threshold)
    except ValueError:
        return jsonify({'message': 'Invalid threshold value'}), 400

    if max_candidates is not None and max_candidates != "":
        try:
            max_candidates = int(max_candidates)
        except ValueError:
            return jsonify({'message': 'Invalid max_candidates value'}), 400
    else:
        max_candidates = None

    from app.models.application import Application, MatchScore
    from app.services.email_service import send_shortlist_email
    from app.models.user import User
    
    recruiter = User.query.get(job.recruiter_id)
    company_name = recruiter.company if recruiter and recruiter.company else "ShortlistIQ"
    
    applications = Application.query.filter_by(job_id=job.id).all()
    
    try:
        # We need to compile a list of applications with their latest score
        app_scores = []
        for app in applications:
            score_record = MatchScore.query.filter_by(application_id=app.id).order_by(MatchScore.id.desc()).first()
            score = score_record.final_score if score_record else None
            app_scores.append((app, score))
            
        # Manual include mode: if included_ids provided, shortlist ONLY those app IDs
        if included_ids is not None and isinstance(included_ids, list) and len(included_ids) > 0:
            included_set = set(included_ids)
            shortlist_items = [(app, score) for app, score in app_scores
                               if app.id in included_set and score is not None]
            remaining_items = [(app, score) for app, score in app_scores
                               if app.id not in included_set]
        else:
            # Threshold-based logic (existing behavior)
            # Filter applications that have a score and meet the threshold
            qualifying_apps = [item for item in app_scores if item[1] is not None and item[1] >= threshold]
            
            # Sort qualifying applications by score descending
            qualifying_apps.sort(key=lambda x: x[1], reverse=True)
            
            # Determine how many to shortlist
            if max_candidates is not None and max_candidates > 0:
                shortlist_items = qualifying_apps[:max_candidates]
                remaining_items = qualifying_apps[max_candidates:] + [item for item in app_scores if item[1] is None or item[1] < threshold]
            else:
                shortlist_items = qualifying_apps
                remaining_items = [item for item in app_scores if item[1] is None or item[1] < threshold]
            
        # Set status for shortlisted applications and send email
        shortlisted_count = 0
        for app, score in shortlist_items:
            app.status = 'shortlisted'
            shortlisted_count += 1
            # Send the email notification if requested
            if send_emails and app.candidate and app.candidate.email:
                send_shortlist_email(
                    to_email=app.candidate.email,
                    candidate_name=app.candidate.name,
                    job_title=job.title,
                    company_name=company_name,
                    match_score=score
                )
                
        # For remaining evaluated/non-shortlisted applications: mark as rejected if they have a score
        # (they were evaluated but didn't make the shortlist cut)
        rejected_count = 0
        for app, score in remaining_items:
            if score is not None and app.status not in ('shortlisted', 'interview', 'selected', 'hired'):
                app.status = 'rejected'
                rejected_count += 1
            elif score is None and app.status in ('shortlisted',):
                app.status = 'applied'
                
        # Update job settings
        job.min_match_score = threshold
        job.results_generated = True
        
        # Notify Recruiter
        recruiter_notif = Notification(
            user_id=job.recruiter_id,
            message=f"Bulk screening pipeline executed for job '{job.title}'. Shortlisted {shortlisted_count} candidate(s) at threshold of {threshold}%. {rejected_count} candidate(s) did not meet the threshold."
        )
        db.session.add(recruiter_notif)
        
        db.session.commit()
        return jsonify({
            'message': f'Shortlist successfully generated with {shortlisted_count} candidates at threshold {threshold}%! {rejected_count} candidate(s) rejected.',
            'shortlisted_count': shortlisted_count,
            'rejected_count': rejected_count,
            'job': job.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to generate results: {str(e)}'}), 500


@jobs_bp.route('/<int:job_id>/send-shortlist-emails', methods=['POST'])
@token_required
@roles_allowed('recruiter', 'admin')
def send_shortlist_emails(job_id):
    job = Job.query.get_or_404(job_id)
    
    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting!'}), 403
        
    from app.models.application import Application, MatchScore
    from app.services.email_service import send_shortlist_email
    from app.models.user import User
    
    recruiter = User.query.get(job.recruiter_id)
    company_name = recruiter.company if recruiter and recruiter.company else "ShortlistIQ"
    
    applications = Application.query.filter_by(job_id=job.id, status='shortlisted').all()
    emails_sent = 0
    
    for app in applications:
        if app.candidate and app.candidate.email:
            try:
                score_record = MatchScore.query.filter_by(application_id=app.id).order_by(MatchScore.id.desc()).first()
                match_score = score_record.final_score if score_record else None
                send_shortlist_email(
                    to_email=app.candidate.email,
                    candidate_name=app.candidate.name,
                    job_title=job.title,
                    company_name=company_name,
                    match_score=match_score
                )
                emails_sent += 1
            except Exception as e:
                print(f"Failed to send email to {app.candidate.email}: {e}")
                
    return jsonify({
        'message': f'Successfully sent invitation emails to {emails_sent} shortlisted candidate(s)!',
        'emails_sent': emails_sent
    }), 200
