import os
import time
import json
from datetime import datetime, timezone
from django.conf import settings
from django.http import JsonResponse, FileResponse
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from accounts.models import User
from accounts.auth import auth_required
from resumes.models import Resume
from jobs.models import Job
from applications.models import Application
from candidates.models import CandidateProfile
from services.resume_parser_service import (
    parse_resume, calculate_resume_confidence
)
from services.match_service import calculate_ats_score
from services.storage_service import (
    save_file, delete_file, serve_file_response, file_exists, get_local_uploads_dir
)

ALLOWED_RESUME_EXTS = {'.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'}
MIN_RESUME_TEXT_LENGTH = 150


def _get_uploads_dir():
    folder = getattr(settings, 'MEDIA_ROOT', None)
    if not folder:
        folder = os.path.abspath(os.path.join(os.path.dirname(settings.BASE_DIR), 'uploads'))
    os.makedirs(folder, exist_ok=True)
    return folder


def _resolve_resume_path(stored_path: str) -> str | None:
    if stored_path and os.path.exists(stored_path):
        return os.path.abspath(stored_path)

    if not stored_path:
        return None

    file_name = os.path.basename(stored_path)
    uploads_dir = _get_uploads_dir()

    candidates = [
        os.path.join(uploads_dir, file_name),
        os.path.join(settings.BASE_DIR, "uploads", file_name),
        os.path.join(settings.BASE_DIR, "uploads", "external_resumes", file_name),
    ]

    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)

    return None


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@auth_required('candidate', 'admin')
def upload_resume(request):
    user = request.current_user
    file = request.FILES.get('file')
    if not file or file.size == 0:
        return JsonResponse({"message": "No file selected for uploading"}, status=400)

    _, ext = os.path.splitext(file.name)
    ext = ext.lower()
    if ext not in ALLOWED_RESUME_EXTS:
        return JsonResponse({
            "message": "Invalid file format. Accepted formats: PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP.",
            "detail": "Please upload a properly formatted resume file.",
            "error_type": "invalid_file_type"
        }, status=400)

    content_type = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }.get(ext, 'application/octet-stream')

    timestamp = int(time.time())
    safe_name = os.path.basename(file.name).replace(" ", "_")
    unique_file_name = f"user_{user.id}_{timestamp}_{safe_name}"
    storage_key = f"resumes/{unique_file_name}"

    file_path = None
    try:
        file_path = save_file(file, storage_key, content_type)

        parsed_data = parse_resume(file_path)
        extracted_text = parsed_data.get("extracted_text", "")

        confidence = calculate_resume_confidence(extracted_text)
        if confidence < 35:
            if file_path:
                delete_file(file_path)
            return JsonResponse({
                "message": "Invalid Resume File",
                "detail": "This document does not appear to be a valid resume. Please upload a professional resume or CV.",
                "error_type": "invalid_file_type"
            }, status=400)

        parse_quality = "good"
        parse_warning = None
        if len(extracted_text.strip()) < MIN_RESUME_TEXT_LENGTH:
            parse_quality = "insufficient"
            parse_warning = "Resume uploaded successfully. However, we could not extract sufficient resume information. Please upload a properly formatted resume."

        skills = parsed_data.get("skills", [])
        projects = parsed_data.get("projects", [])
        experience_years = float(parsed_data.get("experience_years", 0.0))

        new_resume = Resume(
            user_id=user.id,
            file_name=file.name,
            file_path=file_path,
            extracted_text=extracted_text,
            skills=json.dumps(skills),
            projects=json.dumps(projects),
            experience_years=experience_years,
            parsed_at=datetime.now(timezone.utc)
        )
        new_resume.save()

        payload = {
            "message": parse_warning or "Resume uploaded and parsed successfully!",
            "resume": new_resume.to_dict(),
            "parse_quality": parse_quality
        }
        if parse_warning:
            payload["parse_warning"] = parse_warning

        return JsonResponse(payload, status=201)
    except Exception as ex:
        if file_path:
            delete_file(file_path)
        return JsonResponse({"message": f"Failed to process resume: {ex}"}, status=500)


@api_view(['GET'])
@auth_required()
def dashboard_insights(request):
    user = request.current_user
    if user.role != "candidate":
        return JsonResponse({"message": "Only candidates can retrieve dashboard insights"}, status=403)

    try:
        profile = CandidateProfile.objects.filter(user_id=user.id).first()
        resume = Resume.objects.filter(user_id=user.id).order_by('-id').first()

        profile_fields = [
            user.name,
            user.email,
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
        completion_pct = (filled_count / len(profile_fields)) * 50.0

        social_score = 0
        if profile:
            if profile.portfolio_url and profile.portfolio_url.strip():
                social_score += 5
            if profile.github_url and profile.github_url.strip():
                social_score += 5
            if profile.linkedin_url and profile.linkedin_url.strip():
                social_score += 5

        verified_score = 10 if user.email_verified else 0

        if not resume:
            base_score = int(round(completion_pct + social_score + verified_score))
            base_score = max(10, min(base_score, 100))
            return JsonResponse({
                "resume_strength": 0,
                "ats_compatibility": 0,
                "profile_score": base_score,
                "job_matches": 0,
                "recommended_jobs": []
            }, status=200)

        skills = []
        if resume.skills:
            try:
                skills = json.loads(resume.skills)
            except Exception:
                skills = [resume.skills]

        projects = []
        if resume.projects:
            try:
                projects = json.loads(resume.projects)
            except Exception:
                projects = [resume.projects]

        experience_years = float(resume.experience_years or 0.0)
        text_lower = (resume.extracted_text or "").lower()

        has_education = any(x in text_lower for x in ["education", "degree", "university", "college", "school"]) or bool(profile and profile.education and profile.education.strip())
        has_skills = bool(skills) or any(x in text_lower for x in ["skills", "technologies", "programming", "tools"])
        has_projects = bool(projects) or any(x in text_lower for x in ["project", "projects"])
        has_experience = experience_years > 0 or any(x in text_lower for x in ["experience", "employment", "history", "work"])
        has_certifications = any(x in text_lower for x in ["certification", "certifications", "certified", "credential"]) or bool(profile and profile.certifications and profile.certifications.strip())
        has_achievements = any(x in text_lower for x in ["achievement", "achievements", "award", "awards", "accomplishment", "honors"])

        resume_strength = 0
        if has_education: resume_strength += 20
        if has_skills: resume_strength += 20
        if has_projects: resume_strength += 20
        if has_experience: resume_strength += 20
        if has_certifications: resume_strength += 10
        if has_achievements: resume_strength += 10
        resume_strength = max(30, min(resume_strength, 100))

        sections = ["experience", "education", "skills", "project", "contact", "summary", "objective"]
        found_sections = sum(1 for s in sections if s in text_lower)
        section_score = min(found_sections * 6, 40)

        readability_score = 30
        if resume.file_name.lower().endswith(".pdf"):
            readability_score += 5
        if len(text_lower) > 500:
            readability_score += 5
        readability_score = min(readability_score, 40)

        keyword_score = min(len(skills) * 3, 20)

        ats_compatibility = section_score + readability_score + keyword_score
        ats_compatibility = max(40, min(ats_compatibility, 100))

        resume_quality_pct = resume_strength * 0.25
        profile_score = int(round(completion_pct + resume_quality_pct + social_score + verified_score))
        profile_score = max(10, min(profile_score, 100))

        open_jobs = list(Job.objects.filter(status="open"))
        recommended_jobs = []

        for job in open_jobs:
            try:
                match_result = calculate_ats_score(resume.extracted_text, skills, projects, experience_years, job)
                score_val = float(match_result.get("ats_score", 0.0))
                recommended_jobs.append({
                    "job_id": job.id,
                    "match_score": score_val,
                    "matched_skills": match_result.get("matched_skills", []),
                    "missing_skills": match_result.get("missing_skills", [])
                })
            except Exception:
                pass

        recommended_jobs.sort(key=lambda x: x["match_score"], reverse=True)

        user_apps = Application.objects.filter(candidate_id=user.id).prefetch_related('matches')
        app_scores = []
        for a in user_apps:
            latest = a.matches.order_by('-id').first()
            if latest:
                app_scores.append(float(latest.final_score))

        if app_scores:
            job_matches = int(round(sum(app_scores) / len(app_scores)))
        elif recommended_jobs:
            job_matches = int(round(sum(rj["match_score"] for rj in recommended_jobs) / len(recommended_jobs)))
        else:
            job_matches = 0

        return JsonResponse({
            "resume_strength": resume_strength,
            "ats_compatibility": ats_compatibility,
            "profile_score": profile_score,
            "job_matches": job_matches,
            "recommended_jobs": recommended_jobs
        }, status=200)
    except Exception as ex:
        return JsonResponse({"error": "Internal Server Error", "message": str(ex)}, status=500)


@api_view(['GET'])
@auth_required()
def resumes_list(request):
    user = request.current_user
    if user.role == "candidate":
        resumes = Resume.objects.filter(user_id=user.id).order_by('-id')
    elif user.role == "recruiter":
        resumes = Resume.objects.filter(
            applications__job__recruiter_id=user.id
        ).distinct().order_by('-id')
    else:
        resumes = Resume.objects.all().order_by('-id')

    return JsonResponse([r.to_dict() for r in resumes], safe=False, status=200)


@api_view(['GET', 'DELETE'])
@auth_required()
def resume_detail_delete(request, resume_id):
    user = request.current_user
    resume = Resume.objects.filter(id=resume_id).first()
    if not resume:
        return JsonResponse({"message": "Resume not found"}, status=404)

    if request.method == 'DELETE':
        if user.role not in ('candidate', 'admin'):
            return JsonResponse({"message": "Access forbidden"}, status=403)
        if user.role == 'candidate' and resume.user_id != user.id:
            return JsonResponse({"message": "Access forbidden: you do not own this resume!"}, status=403)

        try:
            if resume.file_path:
                delete_file(resume.file_path)
            resume.delete()
            return JsonResponse({"message": "Resume deleted successfully!"}, status=200)
        except Exception as ex:
            return JsonResponse({"message": f"Failed to delete resume: {ex}"}, status=500)

    # GET
    if user.role == 'candidate' and resume.user_id != user.id:
        return JsonResponse({"message": "Access forbidden: you do not own this resume!"}, status=403)

    if user.role == 'recruiter':
        has_app = Application.objects.filter(resume_id=resume.id, job__recruiter_id=user.id).exists()
        if not has_app:
            return JsonResponse({"message": "Access forbidden: candidate has not applied to your jobs!"}, status=403)

    return JsonResponse(resume.to_dict(), status=200)


@api_view(['GET'])
@auth_required()
def get_resume_file(request, resume_id):
    user = request.current_user
    resume = Resume.objects.filter(id=resume_id).first()
    if not resume:
        return JsonResponse({"message": "Resume not found"}, status=404)

    if user.role == 'candidate' and resume.user_id != user.id:
        return JsonResponse({"message": "Access forbidden: you do not own this resume!"}, status=403)

    if user.role == 'recruiter':
        has_app = Application.objects.filter(resume_id=resume.id, job__recruiter_id=user.id).exists()
        if not has_app:
            return JsonResponse({"message": "Access forbidden: candidate has not applied to your jobs!"}, status=403)

    if not resume.file_path or not file_exists(resume.file_path):
        return JsonResponse({"message": "Resume file not found!"}, status=404)

    _, ext = os.path.splitext(resume.file_name)
    ext = ext.lower()
    content_type = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }.get(ext, 'application/octet-stream')

    return serve_file_response(request, resume.file_path, resume.file_name, content_type)
