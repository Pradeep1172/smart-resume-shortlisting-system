from flask import Blueprint, request, jsonify, g, send_file
from werkzeug.utils import secure_filename
import os
import zipfile
import uuid
import time
import shutil
from datetime import datetime
from app.config import Config
from app.models import db
from app.models.job import Job
from app.models.external_candidate import ExternalCandidate
from app.services.parser_service import (
    parse_external_resume_details,
    calculate_resume_confidence,
    guess_name_from_text_and_filename
)
from app.services.match_service import (
    calculate_match_score,
    calculate_quick_score,
    generate_pool_ai_analysis,
    generate_pool_quick_analysis,
    auto_compute_weights
)
from app.middleware.auth_middleware import token_required, roles_allowed

external_hiring_bp = Blueprint('external_hiring', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp'}
MIN_RESUME_TEXT_LENGTH = 150

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_ext_candidate_id():
    # Loop to ensure uniqueness
    while True:
        ext_id = f"EXT-{uuid.uuid4().hex[:8].upper()}"
        if not ExternalCandidate.query.filter_by(external_candidate_id=ext_id).first():
            return ext_id

@external_hiring_bp.route('/jobs', methods=['GET'])
@token_required
@roles_allowed('recruiter', 'admin')
def get_external_jobs():
    query = Job.query.filter_by(is_external=True)
    if g.user.role == 'recruiter':
        query = query.filter_by(recruiter_id=g.user.id)
    jobs = query.order_by(Job.id.desc()).all()
    return jsonify([job.to_dict() for job in jobs]), 200

@external_hiring_bp.route('/jobs', methods=['POST'])
@token_required
@roles_allowed('recruiter', 'admin')
def create_external_job():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Missing job posting data'}), 400
        
    title = data.get('title')
    description = data.get('description')
    skills_required = data.get('skills_required', [])
    experience_required = data.get('experience_required', 0)
    location = data.get('location', '')
    company_name = data.get('company_name', '')
    min_match_score = data.get('min_match_score', 70)
    evaluation_strategy = data.get('evaluation_strategy', 'intelligent')
    
    if not title or not description or not company_name:
        return jsonify({'message': 'Title, description, and company name are required'}), 400
        
    if not isinstance(skills_required, list):
        return jsonify({'message': 'skills_required must be a list of strings'}), 400

    if evaluation_strategy not in ('quick', 'intelligent'):
        return jsonify({'message': "evaluation_strategy must be 'quick' or 'intelligent'"}), 400

    # Auto-compute evaluation weights from experience_required
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
            min_match_score=int(min_match_score),
            evaluation_type='ai' if evaluation_strategy == 'intelligent' else 'keyword',
            ai_insights_enabled=True,
            evaluation_strategy=evaluation_strategy,
            evaluation_weights=computed_weights,
            is_external=True,
            company_name=company_name
        )
        db.session.add(new_job)
        db.session.commit()
        return jsonify({
            'message': 'External job created successfully!',
            'job': new_job.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to create job: {str(e)}'}), 500

@external_hiring_bp.route('/jobs/<int:job_id>', methods=['GET'])
@token_required
@roles_allowed('recruiter', 'admin')
def get_external_job_detail(job_id):
    job = Job.query.filter_by(id=job_id, is_external=True).first_or_404()
    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting'}), 403
    return jsonify(job.to_dict()), 200

@external_hiring_bp.route('/jobs/<int:job_id>', methods=['DELETE'])
@token_required
@roles_allowed('recruiter', 'admin')
def delete_external_job(job_id):
    job = Job.query.filter_by(id=job_id, is_external=True).first_or_404()
    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting'}), 403
    
    try:
        db.session.delete(job)
        db.session.commit()
        return jsonify({'message': 'External job posting and all its candidates deleted successfully!'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete job: {str(e)}'}), 500

@external_hiring_bp.route('/jobs/<int:job_id>/upload', methods=['POST'])
@token_required
@roles_allowed('recruiter', 'admin')
def upload_external_resumes(job_id):
    job = Job.query.filter_by(id=job_id, is_external=True).first_or_404()
    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting'}), 403

    if 'files' not in request.files and 'file' not in request.files:
        return jsonify({'message': 'No files uploaded'}), 400

    uploaded_files = request.files.getlist('files')
    if not uploaded_files or (len(uploaded_files) == 1 and uploaded_files[0].filename == ''):
        # Fall back to single 'file' field
        single_file = request.files.get('file')
        if single_file and single_file.filename != '':
            uploaded_files = [single_file]
        else:
            return jsonify({'message': 'No files selected for uploading'}), 400

    # Ensure upload directory exists
    ext_uploads_dir = os.path.abspath(os.path.join(Config.UPLOAD_FOLDER, 'external_resumes'))
    os.makedirs(ext_uploads_dir, exist_ok=True)

    success_count = 0
    skipped_files = []
    processed_candidates = []

    def process_single_file(file, original_filename):
        if not allowed_file(original_filename):
            return {'success': False, 'filename': original_filename, 'reason': 'Unsupported file format'}

        safe_name = secure_filename(original_filename)
        timestamp = int(time.time() * 1000)
        unique_filename = f"job_{job_id}_{timestamp}_{safe_name}"
        file_path = os.path.join(ext_uploads_dir, unique_filename)

        try:
            file.save(file_path)
            # We will process parsing outside this so we can multithread it.
            return {'success': True, 'filename': original_filename, 'file_path': file_path}
        except Exception as e:
            return {'success': False, 'filename': original_filename, 'reason': f'File save failed: {str(e)}'}

    # Collect all files to parse
    files_to_parse = []

    for up_file in uploaded_files:
        filename = up_file.filename
        if filename.lower().endswith('.zip'):
            temp_zip_dir = os.path.join(ext_uploads_dir, f"temp_zip_{int(time.time() * 1000)}")
            os.makedirs(temp_zip_dir, exist_ok=True)
            zip_path = os.path.join(temp_zip_dir, secure_filename(filename))
            try:
                up_file.save(zip_path)
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_zip_dir)
                
                for root_dir, _, files in os.walk(temp_zip_dir):
                    for f in files:
                        if f.lower().endswith('.zip') or f.startswith('__MACOSX') or f.startswith('.'):
                            continue
                        full_f_path = os.path.join(root_dir, f)
                        
                        timestamp = int(time.time() * 1000)
                        unique_name = f"job_{job_id}_{timestamp}_{secure_filename(f)}"
                        dest_path = os.path.join(ext_uploads_dir, unique_name)
                        shutil.copy2(full_f_path, dest_path)
                        
                        files_to_parse.append({'original_filename': f, 'file_path': dest_path})
            except Exception as zip_err:
                skipped_files.append({'filename': filename, 'reason': f'Failed to extract ZIP: {str(zip_err)}'})
            finally:
                shutil.rmtree(temp_zip_dir, ignore_errors=True)
        else:
            res = process_single_file(up_file, filename)
            if res['success']:
                files_to_parse.append({'original_filename': res['filename'], 'file_path': res['file_path']})
            else:
                skipped_files.append({'filename': res['filename'], 'reason': res['reason']})

    # Threaded Parsing
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    def parse_worker(file_info):
        file_path = file_info['file_path']
        original_filename = file_info['original_filename']
        try:
            parsed_data = parse_external_resume_details(file_path)
            extracted_text = parsed_data.get('extracted_text', '')
            confidence = calculate_resume_confidence(extracted_text)
            
            if confidence < 30:
                os.remove(file_path)
                return {'success': False, 'filename': original_filename, 'reason': 'Document does not appear to be a valid resume'}
                
            return {
                'success': True,
                'filename': original_filename,
                'file_path': file_path,
                'parsed_data': parsed_data,
                'extracted_text': extracted_text
            }
        except Exception as e:
            if os.path.exists(file_path):
                try: os.remove(file_path)
                except: pass
            return {'success': False, 'filename': original_filename, 'reason': f'Parsing failed: {str(e)}'}

    # Use ThreadPoolExecutor to massively speed up parsing (especially for Gemini API calls)
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(parse_worker, finfo) for finfo in files_to_parse]
        
        for future in as_completed(futures):
            result = future.result()
            if result['success']:
                # Save to database sequentially since db session is not thread-safe
                ext_cand_id = generate_ext_candidate_id()
                parsed_data = result['parsed_data']
                new_candidate = ExternalCandidate(
                    job_id=job.id,
                    external_candidate_id=ext_cand_id,
                    name=parsed_data.get('name') or guess_name_from_text_and_filename('', result['filename']),
                    email=parsed_data.get('email'),
                    phone=parsed_data.get('phone'),
                    file_name=result['filename'],
                    file_path=result['file_path'],
                    extracted_text=result['extracted_text'],
                    skills=parsed_data.get('skills', []),
                    experience_years=float(parsed_data.get('experience_years') or 0.0),
                    projects=parsed_data.get('projects', []),
                    status='pending_evaluation'
                )
                db.session.add(new_candidate)
                success_count += 1
                processed_candidates.append(new_candidate)
            else:
                skipped_files.append({'filename': result['filename'], 'reason': result['reason']})

    try:
        db.session.commit()
        # Mark job as pending if new resumes were added, since scores are outdated/not evaluated
        if success_count > 0:
            job.evaluation_status = 'pending'
            job.scores_outdated = True
            db.session.commit()
            
        return jsonify({
            'message': f'Successfully uploaded and parsed {success_count} resumes!',
            'success_count': success_count,
            'skipped': skipped_files,
            'candidates': [cand.to_dict() for cand in processed_candidates]
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to save candidates: {str(e)}'}), 500

@external_hiring_bp.route('/jobs/<int:job_id>/candidates', methods=['GET'])
@token_required
@roles_allowed('recruiter', 'admin')
def get_external_candidates(job_id):
    job = Job.query.filter_by(id=job_id, is_external=True).first_or_404()
    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting'}), 403

    candidates = ExternalCandidate.query.filter_by(job_id=job.id).order_by(ExternalCandidate.final_score.desc(), ExternalCandidate.id.asc()).all()
    return jsonify([cand.to_dict() for cand in candidates]), 200

@external_hiring_bp.route('/jobs/<int:job_id>/evaluate', methods=['POST'])
@token_required
@roles_allowed('recruiter', 'admin')
def evaluate_external_candidates(job_id):
    job = Job.query.filter_by(id=job_id, is_external=True).first_or_404()
    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting'}), 403

    # Check for evaluating status to prevent duplicate concurrent evaluations
    if job.evaluation_status == 'evaluating':
        return jsonify({'message': 'Evaluation is already in progress for this job.'}), 409

    prev_status = job.evaluation_status or 'pending'
    job.evaluation_status = 'evaluating'
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to start evaluation: {str(e)}'}), 500

    # Read evaluation type/strategy from request body or fallback to job strategy
    data = request.get_json() or {}
    strategy = data.get('evaluation_strategy', job.evaluation_strategy or 'intelligent')
    shortlisted_only = data.get('shortlisted_only', False)

    if strategy not in ('quick', 'intelligent'):
        job.evaluation_status = prev_status
        db.session.commit()
        return jsonify({'message': "evaluation_strategy must be 'quick' or 'intelligent'"}), 400

    if shortlisted_only:
        candidates = ExternalCandidate.query.filter_by(job_id=job.id, status='shortlisted').all()
    else:
        candidates = ExternalCandidate.query.filter_by(job_id=job.id).all()

    if not candidates:
        job.evaluation_status = prev_status
        db.session.commit()
        return jsonify({'message': 'No candidates to evaluate for this job.'}), 400

    # Auto compute weights
    resolved_weights = auto_compute_weights(job.experience_required)

    try:
        scores = []
        matched_skills_all = []
        missing_skills_all = []
        evaluated_candidates = []

        for cand in candidates:
            try:
                if strategy == 'quick':
                    match_data = calculate_quick_score(cand, job)
                else:
                    match_data = calculate_match_score(cand, job, weights=resolved_weights)

                cand.match_percentage = match_data['match_percentage']
                cand.ai_score = match_data['ai_score']
                cand.final_score = match_data['final_score']
                cand.evaluation_type = match_data['evaluation_type']
                cand.evaluation_details = match_data['details']
                cand.status = 'evaluated'

                scores.append(match_data['final_score'])
                matched_skills_all.extend(match_data['details'].get('matched_skills', []))
                missing_skills_all.extend(match_data['details'].get('missing_skills', []))
                evaluated_candidates.append(cand)
            except Exception as e:
                print(f"Failed to evaluate external candidate {cand.external_candidate_id}: {e}")
                continue

        if not evaluated_candidates:
            raise Exception("All candidates failed to evaluate.")

        # Pool Analysis
        if strategy == 'quick':
            pool_data = generate_pool_quick_analysis(job, evaluated_candidates, scores, matched_skills_all, missing_skills_all)
        else:
            pool_data = generate_pool_ai_analysis(job, evaluated_candidates, scores, matched_skills_all, missing_skills_all)

        # Update job fields
        job.evaluation_type = 'keyword' if strategy == 'quick' else 'ai'
        job.evaluation_weights = resolved_weights
        job.evaluation_status = 'evaluated'
        job.pool_analysis = pool_data
        job.results_generated = False
        job.scores_outdated = False
        job.evaluated_at = datetime.utcnow()
        job.evaluated_by_id = g.user.id
        job.evaluation_strategy = strategy

        db.session.commit()
        return jsonify({
            'message': f'Successfully evaluated {len(evaluated_candidates)} candidates!',
            'job': job.to_dict(),
            'candidates': [c.to_dict() for c in evaluated_candidates]
        }), 200

    except Exception as e:
        db.session.rollback()
        # Restore status on error
        try:
            job.evaluation_status = prev_status
            db.session.commit()
        except Exception:
            db.session.rollback()
        return jsonify({'message': f'Evaluation failed: {str(e)}'}), 500

@external_hiring_bp.route('/jobs/<int:job_id>/shortlist', methods=['POST'])
@token_required
@roles_allowed('recruiter', 'admin')
def shortlist_external_candidates(job_id):
    job = Job.query.filter_by(id=job_id, is_external=True).first_or_404()
    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting'}), 403

    if job.scores_outdated or job.evaluation_status != 'evaluated':
        return jsonify({'message': 'Please evaluate candidates before generating a shortlist.'}), 400

    data = request.get_json() or {}
    threshold = data.get('threshold')
    max_candidates = data.get('max_candidates')
    included_ids = data.get('included_ids', None)  # list of ExternalCandidate database IDs to force shortlist

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

    candidates = ExternalCandidate.query.filter_by(job_id=job.id).all()
    if not candidates:
        return jsonify({'message': 'No candidates found for this job.'}), 404

    try:
        if included_ids is not None and isinstance(included_ids, list):
            # Force shortlist only explicitly included candidates
            included_set = set(included_ids)
            shortlisted_count = 0
            rejected_count = 0
            for cand in candidates:
                if cand.id in included_set:
                    cand.status = 'shortlisted'
                    shortlisted_count += 1
                else:
                    if cand.final_score is not None:
                        cand.status = 'rejected'
                        rejected_count += 1
        else:
            # Threshold & rank based shortlist
            evaluated_candidates = [c for c in candidates if c.final_score is not None]
            evaluated_candidates.sort(key=lambda x: x.final_score, reverse=True)

            qualifying_candidates = [c for c in evaluated_candidates if c.final_score >= threshold]

            if max_candidates is not None and max_candidates > 0:
                shortlist_items = qualifying_candidates[:max_candidates]
                rejected_items = qualifying_candidates[max_candidates:] + [c for c in evaluated_candidates if c.final_score < threshold]
            else:
                shortlist_items = qualifying_candidates
                rejected_items = [c for c in evaluated_candidates if c.final_score < threshold]

            shortlisted_count = 0
            for cand in shortlist_items:
                cand.status = 'shortlisted'
                shortlisted_count += 1

            rejected_count = 0
            for cand in rejected_items:
                cand.status = 'rejected'
                rejected_count += 1

        job.min_match_score = threshold
        job.results_generated = True

        db.session.commit()
        return jsonify({
            'message': f'Shortlist successfully generated with {shortlisted_count} candidate(s)! {rejected_count} candidate(s) marked as rejected.',
            'shortlisted_count': shortlisted_count,
            'rejected_count': rejected_count,
            'job': job.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to generate shortlist: {str(e)}'}), 500

@external_hiring_bp.route('/candidates/<int:candidate_id>/status', methods=['POST'])
@token_required
@roles_allowed('recruiter', 'admin')
def update_external_candidate_status(candidate_id):
    candidate = ExternalCandidate.query.get_or_404(candidate_id)
    job = Job.query.get(candidate.job_id)
    
    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting'}), 403

    data = request.get_json() or {}
    new_status = data.get('status')
    valid_statuses = {'pending_evaluation', 'evaluated', 'shortlisted', 'interview', 'selected', 'hired', 'rejected'}
    
    if not new_status or new_status not in valid_statuses:
        return jsonify({'message': f'Invalid status. Allowed: {list(valid_statuses)}'}), 400

    try:
        candidate.status = new_status
        db.session.commit()
        return jsonify({
            'message': f'Candidate status updated to {new_status}!',
            'candidate': candidate.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update status: {str(e)}'}), 500

@external_hiring_bp.route('/candidates/<int:candidate_id>/resume', methods=['GET'])
@token_required
@roles_allowed('recruiter', 'admin')
def get_external_candidate_resume(candidate_id):
    candidate = ExternalCandidate.query.get_or_404(candidate_id)
    job = Job.query.get(candidate.job_id)

    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden'}), 403

    resolved_path = candidate.file_path
    if not os.path.isabs(resolved_path):
        resolved_path = os.path.abspath(resolved_path)

    if not os.path.exists(resolved_path):
        # Check relative fallback just in case path was stored relatively
        fallback = os.path.abspath(os.path.join(Config.UPLOAD_FOLDER, 'external_resumes', os.path.basename(candidate.file_path)))
        if os.path.exists(fallback):
            resolved_path = fallback
        else:
            return jsonify({'message': 'Resume file not found on disk'}), 404

    ext = candidate.file_name.rsplit('.', 1)[1].lower() if '.' in candidate.file_name else 'pdf'
    if ext == 'pdf':
        mimetype = 'application/pdf'
    elif ext in ['png', 'jpg', 'jpeg']:
        mimetype = f'image/{ext if ext != "jpg" else "jpeg"}'
    else:
        mimetype = 'application/octet-stream'

    return send_file(resolved_path, mimetype=mimetype)

@external_hiring_bp.route('/candidates/<int:candidate_id>', methods=['DELETE'])
@token_required
@roles_allowed('recruiter', 'admin')
def delete_external_candidate(candidate_id):
    candidate = ExternalCandidate.query.get_or_404(candidate_id)
    job = Job.query.get(candidate.job_id)

    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden'}), 403

    try:
        if os.path.exists(candidate.file_path):
            try:
                os.remove(candidate.file_path)
            except Exception:
                pass

        db.session.delete(candidate)
        # Mark scores as outdated because candidate list has changed
        job.scores_outdated = True
        db.session.commit()
        return jsonify({'message': 'Candidate and resume deleted successfully!'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete candidate: {str(e)}'}), 500

@external_hiring_bp.route('/jobs/<int:job_id>/download-shortlisted-resumes', methods=['GET'])
@token_required
@roles_allowed('recruiter', 'admin')
def download_shortlisted_resumes(job_id):
    job = Job.query.filter_by(id=job_id, is_external=True).first_or_404()
    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden'}), 403

    shortlisted = ExternalCandidate.query.filter_by(job_id=job.id, status='shortlisted').all()
    if not shortlisted:
        return jsonify({'message': 'No shortlisted candidates found for this job.'}), 400

    import io
    memory_file = io.BytesIO()
    try:
        with zipfile.ZipFile(memory_file, 'w') as zip_file:
            added_filenames = set()
            for cand in shortlisted:
                path_to_use = None
                if os.path.isabs(cand.file_path) and os.path.exists(cand.file_path):
                    path_to_use = cand.file_path
                else:
                    abs_path = os.path.abspath(cand.file_path)
                    if os.path.exists(abs_path):
                        path_to_use = abs_path
                    else:
                        fallback = os.path.abspath(os.path.join(Config.UPLOAD_FOLDER, 'external_resumes', os.path.basename(cand.file_path)))
                        if os.path.exists(fallback):
                            path_to_use = fallback
                
                if path_to_use:
                    filename = cand.file_name
                    if filename in added_filenames:
                        name_part, ext_part = os.path.splitext(filename)
                        filename = f"{name_part}_{cand.external_candidate_id}{ext_part}"
                    added_filenames.add(filename)
                    zip_file.write(path_to_use, filename)

        if not added_filenames:
            return jsonify({'message': 'Shortlisted resumes files not found on disk.'}), 404

        memory_file.seek(0)
        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f"shortlisted_resumes_{job.title.lower().replace(' ', '_')}.zip"
        )
    except Exception as e:
        return jsonify({'message': f'Failed to generate ZIP: {str(e)}'}), 500

@external_hiring_bp.route('/jobs/<int:job_id>/send-shortlist-emails', methods=['POST'])
@token_required
@roles_allowed('recruiter', 'admin')
def send_external_shortlist_emails(job_id):
    job = Job.query.filter_by(id=job_id, is_external=True).first_or_404()
    
    if g.user.role == 'recruiter' and job.recruiter_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this job posting!'}), 403
        
    from app.services.email_service import send_shortlist_email
    from app.models.user import User
    
    recruiter = User.query.get(job.recruiter_id)
    company_name = recruiter.company if recruiter and recruiter.company else "ShortlistIQ"
    
    candidates = ExternalCandidate.query.filter_by(job_id=job.id, status='shortlisted').all()
    emails_sent = 0
    
    for cand in candidates:
        if cand.email:
            try:
                send_shortlist_email(
                    to_email=cand.email,
                    candidate_name=cand.name,
                    job_title=job.title,
                    company_name=company_name,
                    match_score=cand.final_score
                )
                emails_sent += 1
            except Exception as e:
                print(f"Failed to send email to {cand.email}: {e}")
                
    return jsonify({
        'message': f'Successfully sent invitation emails to {emails_sent} shortlisted candidate(s)!',
        'emails_sent': emails_sent
    }), 200
