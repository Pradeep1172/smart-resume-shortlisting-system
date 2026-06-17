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

        resume = Resume.query.filter_by(user_id=g.user.id).order_by(Resume.id.desc()).first()
        if not resume:
            return jsonify({
                'resume_strength': 0,
                'ats_compatibility': 0,
                'job_matches_count': 0,
                'recommended_jobs': []
            }), 200

        # Parse skills and projects robustly (SQLite JSON support helper)
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
        skills_score = min(len(skills) * 5, 50)
        projects_score = min(len(projects) * 10, 30)
        experience_score = min(int(experience_years * 4), 20)
        resume_strength = skills_score + projects_score + experience_score

        # 2. Calculate ATS Compatibility
        text_lower = (resume.extracted_text or '').lower()
        sections = ['experience', 'education', 'skills', 'project', 'contact', 'summary']
        found_sections = [s for s in sections if s in text_lower]
        ats_compatibility = 40 + (len(found_sections) * 10)
        if not text_lower.strip():
            ats_compatibility = 0
        else:
            ats_compatibility = min(ats_compatibility, 100)

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

        print("=== DASHBOARD INSIGHTS CALCULATION ===")
        print("Resume ID:", resume.id)
        print("Filename:", resume.file_name)
        print("Skills:", len(skills) if isinstance(skills, list) else 0)
        print("Projects:", len(projects) if isinstance(projects, list) else 0)
        print("Experience:", experience_years)
        print("Resume Strength:", resume_strength)
        print("ATS:", ats_compatibility)
        print("======================================")

        return jsonify({
            'resume_strength': resume_strength,
            'ats_compatibility': ats_compatibility,
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
    else:
        # Recruiters and admins can see all resumes (latest first)
        resumes = Resume.query.order_by(Resume.id.desc()).all()

    return jsonify([resume.to_dict() for resume in resumes]), 200


@resumes_bp.route('/<int:resume_id>/file', methods=['GET'])
@token_required
def get_resume_file(resume_id):
    resume = Resume.query.get_or_404(resume_id)

    # Recruiter and admin can view any resume file. Candidate can only view their own.
    if g.user.role == 'candidate' and resume.user_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this resume!'}), 403

    if not os.path.exists(resume.file_path):
        return jsonify({'message': 'Resume file not found on disk!'}), 404

    # PDF-only now, but keep the mime detection for any legacy records
    ext = resume.file_name.rsplit('.', 1)[1].lower() if '.' in resume.file_name else 'pdf'
    if ext == 'pdf':
        mimetype = 'application/pdf'
    elif ext in ['png', 'jpg', 'jpeg']:
        mimetype = f'image/{ext if ext != "jpg" else "jpeg"}'
    else:
        mimetype = 'application/octet-stream'

    return send_file(resume.file_path, mimetype=mimetype)


@resumes_bp.route('/<int:resume_id>', methods=['GET'])
@token_required
def get_resume(resume_id):
    resume = Resume.query.get_or_404(resume_id)

    # Candidate must own the resume to view it
    if g.user.role == 'candidate' and resume.user_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this resume!'}), 403

    return jsonify(resume.to_dict()), 200


@resumes_bp.route('/<int:resume_id>', methods=['DELETE'])
@token_required
@roles_allowed('candidate', 'admin')
def delete_resume(resume_id):
    resume = Resume.query.get_or_404(resume_id)

    if g.user.role == 'candidate' and resume.user_id != g.user.id:
        return jsonify({'message': 'Access forbidden: you do not own this resume!'}), 403

    try:
        if os.path.exists(resume.file_path):
            os.remove(resume.file_path)

        db.session.delete(resume)
        db.session.commit()
        return jsonify({'message': 'Resume deleted successfully!'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete resume: {str(e)}'}), 500
