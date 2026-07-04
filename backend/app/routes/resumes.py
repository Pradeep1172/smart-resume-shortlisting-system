from flask import Blueprint, request, jsonify, g, send_file
from werkzeug.utils import secure_filename
import os
import time
from app.config import Config
from app.models import db
from app.models.resume import Resume
from app.services.parser_service import parse_resume, calculate_resume_confidence
from app.middleware.auth_middleware import token_required, roles_allowed

resumes_bp = Blueprint('resumes', __name__)

# Supported extensions: PDF, DOC, DOCX, and common image formats for OCR
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp'}

# Minimum extracted text length to consider a PDF properly parsed
MIN_RESUME_TEXT_LENGTH = 150


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@resumes_bp.route('/upload', methods=['POST'])
@token_required
@roles_allowed('candidate', 'admin')
def upload_resume():
    if 'file' not in request.files:
        return jsonify({'message': 'No file part in the request'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No file selected for uploading'}), 400

    # ── Reject disallowed files ───────────────────────────────────────────
    if not allowed_file(file.filename):
        return jsonify({
            'message': 'Invalid file format. Accepted formats: PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP.',
            'detail': 'Please upload a properly formatted resume file.',
            'error_type': 'invalid_file_type'
        }), 400

    filename = secure_filename(file.filename)
    timestamp = int(time.time())
    unique_filename = f"user_{g.user.id}_{timestamp}_{filename}"
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    file_path = os.path.join(Config.UPLOAD_FOLDER, unique_filename)

    try:
        file.save(file_path)

        # Parse the resume file (PDF, DOC, DOCX, or Image OCR)
        parsed_data = parse_resume(file_path)
        extracted_text = parsed_data.get('extracted_text', '')

        # Validate document intent / confidence
        confidence = calculate_resume_confidence(extracted_text)
        if confidence < 35:
            try:
                os.remove(file_path)
            except Exception:
                pass
            return jsonify({
                'message': 'Invalid Resume File',
                'detail': 'This document does not appear to be a valid resume. Please upload a professional resume or CV.',
                'error_type': 'invalid_file_type'
            }), 400

        parse_quality = 'good'
        parse_warning = None

        if len(extracted_text.strip()) < MIN_RESUME_TEXT_LENGTH:
            parse_quality = 'insufficient'
            parse_warning = (
                'Resume uploaded successfully. However, we could not extract sufficient '
                'resume information. Please upload a properly formatted resume.'
            )

        # Save to Database
        new_resume = Resume(
            user_id=g.user.id,
            file_name=filename,
            file_path=file_path,
            extracted_text=extracted_text,
            skills=parsed_data['skills'],
            projects=parsed_data['projects'],
            experience_years=parsed_data['experience_years']
        )
        db.session.add(new_resume)
        db.session.commit()

        # ── Case 3: Successfully parsed with rich data ─────────────────────
        response_payload = {
            'message': parse_warning if parse_warning else 'Resume uploaded and parsed successfully!',
            'resume': new_resume.to_dict(),
            'parse_quality': parse_quality,   # 'good' | 'insufficient'
        }
        if parse_warning:
            response_payload['parse_warning'] = parse_warning

        return jsonify(response_payload), 201

    except Exception as e:
        db.session.rollback()
        if os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({'message': f'Failed to process resume: {str(e)}'}), 500



@resumes_bp.route('/dashboard-insights', methods=['GET'])
@token_required
def get_dashboard_insights():
    try:
        if g.user.role != 'candidate':
            return jsonify({'message': 'Only candidates can retrieve dashboard insights'}), 403

        profile = g.user.candidate_profile
        resume = Resume.query.filter_by(user_id=g.user.id).order_by(Resume.id.desc()).first()
        
        # Calculate Profile Score base completion first
        # We can calculate fields completion
        profile_fields = [
            g.user.name,
            g.user.email,
            profile.phone if profile else None,
            profile.headline if profile else None,
            profile.bio if profile else None,
            profile.education if profile else None,
            profile.certifications if profile else None,
            profile.github_url if profile else None,
            profile.linkedin_url if profile else None,
            profile.portfolio_url if profile else None
        ]
        filled_count = sum(1 for f in profile_fields if f and str(f).strip())
        completion_pct = (filled_count / len(profile_fields)) * 50  # Max 50 points

        # Social score
        social_score = 0
        if profile:
            if profile.portfolio_url and profile.portfolio_url.strip():
                social_score += 5
            if profile.github_url and profile.github_url.strip():
                social_score += 5
            if profile.linkedin_url and profile.linkedin_url.strip():
                social_score += 5

        # Verified details
        verified_score = 10 if g.user.email_verified else 0

        if not resume:
            profile_score = int(completion_pct + social_score + verified_score)
            profile_score = max(10, min(profile_score, 100))
            return jsonify({
                'resume_strength': 0,
                'ats_compatibility': 0,
                'profile_score': profile_score,
                'job_matches': 0,
                'recommended_jobs': []
            }), 200

        # Parse skills and projects robustly
        import json
        
        skills = resume.skills or []
        if isinstance(skills, str):
            try:
                skills = json.loads(skills)
            except Exception:
                skills = []
                
        projects = resume.projects or []
        if isinstance(projects, str):
            try:
                projects = json.loads(projects)
            except Exception:
                projects = [projects] if projects.strip() else []

        try:
            experience_years = float(resume.experience_years or 0.0)
        except (ValueError, TypeError):
            experience_years = 0.0

        # 1. Calculate Resume Strength
        text_lower = (resume.extracted_text or '').lower()
        has_education = any(x in text_lower for x in ['education', 'degree', 'university', 'college', 'school']) or (profile and profile.education and profile.education.strip())
        has_skills = len(skills) > 0 or any(x in text_lower for x in ['skills', 'technologies', 'programming', 'tools'])
        has_projects = len(projects) > 0 or any(x in text_lower for x in ['project', 'projects'])
        has_experience = experience_years > 0 or any(x in text_lower for x in ['experience', 'employment', 'history', 'work'])
        has_certifications = any(x in text_lower for x in ['certification', 'certifications', 'certified', 'credential']) or (profile and profile.certifications and profile.certifications.strip())
        has_achievements = any(x in text_lower for x in ['achievement', 'achievements', 'award', 'awards', 'accomplishment', 'honors'])

        resume_strength = 0
        if has_education: resume_strength += 20
        if has_skills: resume_strength += 20
        if has_projects: resume_strength += 20
        if has_experience: resume_strength += 20
        if has_certifications: resume_strength += 10
        if has_achievements: resume_strength += 10
        resume_strength = max(30, min(resume_strength, 100))

        # 2. Calculate ATS Compatibility
        sections = ['experience', 'education', 'skills', 'project', 'contact', 'summary', 'objective']
        found_sections = [s for s in sections if s in text_lower]
        section_score = min(len(found_sections) * 6, 40)
        
        readability_score = 30
        if resume.file_name.lower().endswith('.pdf'):
            readability_score += 5
        if len(text_lower) > 500:
            readability_score += 5
        readability_score = min(readability_score, 40)

        keyword_score = min(len(skills) * 3, 20)
        
        ats_compatibility = section_score + readability_score + keyword_score
        ats_compatibility = max(40, min(ats_compatibility, 100))

        # Update profile score incorporating resume quality
        resume_quality_pct = (resume_strength * 0.25)
        profile_score = int(completion_pct + resume_quality_pct + social_score + verified_score)
        profile_score = max(10, min(profile_score, 100))

        # 3. Calculate Recommended Jobs matching scores
        from app.models.job import Job
        from app.services.match_service import calculate_ats_score
        
        open_jobs = Job.query.filter_by(status='open').all()
        recommended_jobs = []
        
        for job in open_jobs:
            try:
                match_result = calculate_ats_score(resume, job)
                recommended_jobs.append({
                    'job_id': job.id,
                    'match_score': match_result['ats_score'],
                    'matched_skills': match_result['matched_skills'],
                    'missing_skills': match_result['missing_skills']
                })
            except Exception as match_err:
                import traceback
                print(f"Error matching job {job.id}: {match_err}")
                traceback.print_exc()

        # Sort recommended jobs by match score descending
        recommended_jobs.sort(key=lambda x: x['match_score'], reverse=True)

        # 4. Job Match % based on applied jobs
        from app.models.application import Application
        user_apps = Application.query.filter_by(candidate_id=g.user.id).all()
        app_scores = []
        for app in user_apps:
            if app.matches:
                latest = sorted(app.matches, key=lambda m: m.calculated_at, reverse=True)[0]
                app_scores.append(latest.final_score)
        
        if app_scores:
            job_matches = int(sum(app_scores) / len(app_scores))
        else:
            if recommended_jobs:
                job_matches = int(sum(rj['match_score'] for rj in recommended_jobs) / len(recommended_jobs))
            else:
                job_matches = 0

        return jsonify({
            'resume_strength': resume_strength,
            'ats_compatibility': ats_compatibility,
            'profile_score': profile_score,
            'job_matches': job_matches,
            'recommended_jobs': recommended_jobs
        }), 200

    except Exception as e:
        import traceback
        print("CRITICAL ERROR in get_dashboard_insights:")
        traceback.print_exc()
        return jsonify({
            'error': 'Internal Server Error',
            'message': str(e)
        }), 500


@resumes_bp.route('', methods=['GET'])
@token_required
def get_resumes():
    # Candidates can only see their own resumes (latest first)
    if g.user.role == 'candidate':
        resumes = Resume.query.filter_by(user_id=g.user.id).order_by(Resume.id.desc()).all()
    elif g.user.role == 'recruiter':
        from app.models.application import Application
        from app.models.job import Job
        # Get resumes of candidates who applied to the recruiter's jobs
        resumes = Resume.query.join(Application).join(Job).filter(
            Job.recruiter_id == g.user.id
        ).order_by(Resume.id.desc()).all()
    else:
        # Admins can see all resumes (latest first)
        resumes = Resume.query.order_by(Resume.id.desc()).all()

    return jsonify([resume.to_dict() for resume in resumes]), 200


def resolve_resume_path(stored_path):
    # Try the stored path directly
    if os.path.exists(stored_path):
        return os.path.abspath(stored_path)
    
    base_name = os.path.basename(stored_path)
    
    # Try relative to the Config.UPLOAD_FOLDER
    fallback_path = os.path.join(Config.UPLOAD_FOLDER, base_name)
    if os.path.exists(fallback_path):
        return os.path.abspath(fallback_path)
        
    # Check parent/sibling uploads folder (e.g. backend/uploads/)
    backend_uploads = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'uploads', base_name))
    if os.path.exists(backend_uploads):
        return backend_uploads
        
    # Check app/uploads/
    app_uploads = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', base_name))
    if os.path.exists(app_uploads):
        return app_uploads

    # Return the absolute version of the stored path as a final fallback
    return os.path.abspath(stored_path)


@resumes_bp.route('/<int:resume_id>/file', methods=['GET'])
@token_required
def get_resume_file(resume_id):
    resume = Resume.query.get_or_404(resume_id)

    if g.user.role == 'candidate' and resume.user_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this resume!'}), 403

    if g.user.role == 'recruiter':
        from app.models.application import Application
        from app.models.job import Job
        has_app = Application.query.join(Job).filter(
            Application.resume_id == resume.id,
            Job.recruiter_id == g.user.id
        ).first()
        if not has_app:
            return jsonify({'message': 'Access forbidden: candidate has not applied to your jobs!'}), 403

    resolved_path = resolve_resume_path(resume.file_path)
    if not os.path.exists(resolved_path):
        return jsonify({'message': 'Resume file not found on disk!'}), 404

    # PDF-only now, but keep the mime detection for any legacy records
    ext = resume.file_name.rsplit('.', 1)[1].lower() if '.' in resume.file_name else 'pdf'
    if ext == 'pdf':
        mimetype = 'application/pdf'
    elif ext in ['png', 'jpg', 'jpeg']:
        mimetype = f'image/{ext if ext != "jpg" else "jpeg"}'
    else:
        mimetype = 'application/octet-stream'

    return send_file(resolved_path, mimetype=mimetype)


@resumes_bp.route('/<int:resume_id>', methods=['GET'])
@token_required
def get_resume(resume_id):
    resume = Resume.query.get_or_404(resume_id)

    if g.user.role == 'candidate' and resume.user_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this resume!'}), 403

    if g.user.role == 'recruiter':
        from app.models.application import Application
        from app.models.job import Job
        has_app = Application.query.join(Job).filter(
            Application.resume_id == resume.id,
            Job.recruiter_id == g.user.id
        ).first()
        if not has_app:
            return jsonify({'message': 'Access forbidden: candidate has not applied to your jobs!'}), 403

    return jsonify(resume.to_dict()), 200


@resumes_bp.route('/<int:resume_id>', methods=['DELETE'])
@token_required
@roles_allowed('candidate', 'admin')
def delete_resume(resume_id):
    resume = Resume.query.get_or_404(resume_id)

    if g.user.role == 'candidate' and resume.user_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this resume!'}), 403

    try:
        resolved_path = resolve_resume_path(resume.file_path)
        if os.path.exists(resolved_path):
            os.remove(resolved_path)

        db.session.delete(resume)
        db.session.commit()
        return jsonify({'message': 'Resume deleted successfully!'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete resume: {str(e)}'}), 500
