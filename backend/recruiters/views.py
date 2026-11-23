import os
import time
import json
from django.conf import settings
from django.http import JsonResponse, FileResponse
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from accounts.models import User
from accounts.auth import auth_required
from jobs.models import Job
from applications.models import Application
from admin_portal.models import SystemSetting

ALLOWED_LOGO_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}


def _get_uploads_dir():
    folder = getattr(settings, 'MEDIA_ROOT', None)
    if not folder:
        folder = os.path.abspath(os.path.join(os.path.dirname(settings.BASE_DIR), 'uploads'))
    os.makedirs(folder, exist_ok=True)
    return folder


@api_view(['GET'])
@auth_required('recruiter', 'admin')
def get_dashboard(request):
    user = request.current_user
    total_jobs = Job.objects.filter(recruiter_id=user.id).count()
    active_jobs = Job.objects.filter(recruiter_id=user.id, status='open').count()

    recruiter_job_ids = list(Job.objects.filter(recruiter_id=user.id).values_list('id', flat=True))
    apps_query = Application.objects.filter(job_id__in=recruiter_job_ids)

    applications_by_status = {}
    for app in apps_query:
        st = app.status or "applied"
        applications_by_status[st] = applications_by_status.get(st, 0) + 1

    total_applications = sum(applications_by_status.values())
    applied_count = applications_by_status.get("applied", 0)
    pending_eval_count = applications_by_status.get("pending_evaluation", 0)
    evaluated_count = applications_by_status.get("evaluated", 0)
    shortlisted_count = applications_by_status.get("shortlisted", 0)
    interview_count = applications_by_status.get("interview", 0)
    selected_count = applications_by_status.get("selected", 0) + applications_by_status.get("approved", 0)
    hired_count = applications_by_status.get("hired", 0)
    rejected_count = applications_by_status.get("rejected", 0)

    pending_evals = applied_count + pending_eval_count
    evaluated_candidates = total_applications - pending_evals
    shortlisted_plus = shortlisted_count + interview_count + selected_count + hired_count

    recent_apps = apps_query.select_related('job', 'candidate', 'resume').order_by('-applied_at')[:5]

    return JsonResponse({
        "metrics": {
            "total_jobs": total_jobs,
            "active_jobs": active_jobs,
            "total_applications": total_applications,
            "pending_evaluations": pending_evals,
            "evaluated_candidates": evaluated_candidates,
            "shortlisted_applications": shortlisted_plus,
            "approved_applications": selected_count,
            "hired_applications": hired_count,
            "interview_applications": interview_count,
            "rejected_applications": rejected_count,
            "applications_by_status": applications_by_status
        },
        "recent_applications": [a.to_dict() for a in recent_apps]
    }, status=200)


@api_view(['GET', 'POST'])
@auth_required('recruiter', 'admin')
def settings_handler(request):
    if request.method == 'GET':
        setting = SystemSetting.objects.filter(key="DEFAULT_WEIGHTS").first()
        weights = {
            "skills": 50,
            "experience": 20,
            "projects": 20,
            "resume_quality": 10
        }
        if setting and setting.value:
            try:
                parsed = json.loads(setting.value)
                if isinstance(parsed, dict):
                    weights = parsed
                    if "resume_quality" not in weights:
                        weights["resume_quality"] = 0
            except Exception:
                pass
        return JsonResponse({"default_weights": weights}, status=200)

    # POST
    data = request.data
    default_weights = data.get("default_weights")
    if default_weights and isinstance(default_weights, dict):
        try:
            skills = int(default_weights.get("skills", 50))
            experience = int(default_weights.get("experience", 20))
            projects = int(default_weights.get("projects", 20))
            resume_quality = int(default_weights.get("resume_quality", 10))

            if skills + experience + projects + resume_quality != 100:
                return JsonResponse({"message": "Weights must sum to exactly 100%"}, status=400)

            serialized = json.dumps({
                "skills": skills,
                "experience": experience,
                "projects": projects,
                "resume_quality": resume_quality
            })

            setting = SystemSetting.objects.filter(key="DEFAULT_WEIGHTS").first()
            if not setting:
                setting = SystemSetting(key="DEFAULT_WEIGHTS", value=serialized)
            else:
                setting.value = serialized
            setting.save()
        except ValueError:
            return JsonResponse({"message": "Weights must be valid numbers"}, status=400)

    return JsonResponse({"message": "Settings saved successfully!"}, status=200)


@api_view(['PUT'])
@auth_required('recruiter')
def update_profile(request):
    user = request.current_user
    data = request.data
    name = (data.get('name') or '').strip()
    if not name:
        return JsonResponse({"message": "Name is required"}, status=400)

    user.name = name
    if 'company' in data and data['company'] is not None:
        user.company = data['company']

    details = {}
    if user.company_details:
        try:
            details = json.loads(user.company_details)
        except Exception:
            details = {}

    details["company_name"] = data.get('company') or user.company
    for key in ['company_website', 'company_description', 'industry', 'company_type',
                'company_size', 'established_year', 'headquarters', 'company_address',
                'phone', 'linkedin_url', 'twitter_url', 'default_eval_strategy']:
        if key in data and data[key] is not None:
            details[key] = data[key]

    if 'hr_contact_email' in data and data['hr_contact_email'] is not None:
        details['hr_email'] = data['hr_contact_email']
    elif 'hr_email' in data and data['hr_email'] is not None:
        details['hr_email'] = data['hr_email']

    user.company_details = json.dumps(details)
    user.save()

    return JsonResponse({
        "message": "Profile updated successfully",
        "user": user.to_dict()
    }, status=200)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@auth_required('recruiter', 'admin')
def upload_logo(request):
    user = request.current_user
    logo = request.FILES.get('logo')
    if not logo or logo.size == 0:
        return JsonResponse({"message": "No logo file selected"}, status=400)

    _, ext = os.path.splitext(logo.name)
    ext = ext.lower()
    if ext not in ALLOWED_LOGO_EXTS:
        return JsonResponse({"message": "Invalid file type. Allowed: jpg, jpeg, png, webp, gif"}, status=400)

    logos_dir = os.path.join(_get_uploads_dir(), "logos")
    os.makedirs(logos_dir, exist_ok=True)

    timestamp = int(time.time())
    file_name = f"recruiter_{user.id}_{timestamp}{ext}"
    abs_file_path = os.path.join(logos_dir, file_name)

    if user.company_logo_path and os.path.exists(user.company_logo_path):
        try:
            os.remove(user.company_logo_path)
        except Exception:
            pass

    with open(abs_file_path, 'wb') as dest:
        for chunk in logo.chunks():
            dest.write(chunk)

    user.company_logo_path = abs_file_path
    user.save(update_fields=['company_logo_path'])

    return JsonResponse({
        "message": "Logo uploaded successfully!",
        "logo_url": f"/api/recruiter/logo/{user.id}"
    }, status=200)


@api_view(['GET'])
def get_logo(request, user_id):
    recruiter = User.objects.filter(id=user_id).first()
    if not recruiter or not recruiter.company_logo_path:
        return JsonResponse({"message": "No logo found"}, status=404)

    path = recruiter.company_logo_path
    if not os.path.exists(path):
        file_name = os.path.basename(path)
        fallback = os.path.join(_get_uploads_dir(), "logos", file_name)
        if os.path.exists(fallback):
            path = fallback
        else:
            return JsonResponse({"message": "No logo file found on disk"}, status=404)

    _, ext = os.path.splitext(path)
    ext = ext.lower()
    content_type = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
    }.get(ext, 'application/octet-stream')

    return FileResponse(open(path, 'rb'), content_type=content_type)
