import json
import secrets
import string
from datetime import datetime, timezone
from django.db.models import Avg, Count, Q
from django.http import JsonResponse
from rest_framework.decorators import api_view
from accounts.models import User
from accounts.auth import auth_required
from jobs.models import Job
from resumes.models import Resume
from applications.models import Application, MatchScore
from admin_portal.models import SystemSetting
from services.email_service import send_approval_email, send_rejection_email


def _generate_random_password(length: int = 8) -> str:
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


@api_view(['GET'])
@auth_required('admin')
def get_admin_dashboard(request):
    total_candidates = User.objects.filter(role="candidate").count()
    total_recruiters = User.objects.filter(role="recruiter").count()
    total_admins = User.objects.filter(role="admin").count()
    total_jobs = Job.objects.count()
    total_resumes = Resume.objects.count()

    status_counts = Application.objects.values('status').annotate(cnt=Count('id'))
    applications_by_status = {item['status'] or 'applied': item['cnt'] for item in status_counts}
    total_applications = sum(applications_by_status.values())

    avg_score_raw = MatchScore.objects.aggregate(avg=Avg('final_score'))['avg']
    avg_score = round(float(avg_score_raw), 1) if avg_score_raw is not None else 0.0

    all_jobs = Job.objects.all()
    skills_counts = {}
    for job in all_jobs:
        skills_list = []
        if job.skills_required:
            try:
                skills_list = json.loads(job.skills_required)
            except Exception:
                skills_list = [s.strip() for s in job.skills_required.split(',') if s.strip()]

        for s in skills_list:
            trimmed = s.strip()
            if trimmed:
                key = trimmed.title()
                skills_counts[key] = skills_counts.get(key, 0) + 1

    top_skills_formatted = [
        {"skill": k, "count": v}
        for k, v in sorted(skills_counts.items(), key=lambda kv: kv[1], reverse=True)[:6]
    ]

    recent_users = User.objects.order_by('-id')[:5]

    pending_approvals = User.objects.filter(
        role="recruiter"
    ).filter(
        Q(approval_status="pending") | Q(approval_status__isnull=True, email_verified=True)
    ).count()

    active_jobs = Job.objects.filter(status="open").count()

    shortlisted_count = applications_by_status.get("shortlisted", 0)
    interview_count = applications_by_status.get("interview", 0)
    selected_count = applications_by_status.get("selected", 0) + applications_by_status.get("approved", 0)
    hired_count = applications_by_status.get("hired", 0)
    evaluated_count = applications_by_status.get("evaluated", 0)
    rejected_count = applications_by_status.get("rejected", 0)
    applied_count = applications_by_status.get("applied", 0) + applications_by_status.get("pending_evaluation", 0)

    return JsonResponse({
        "metrics": {
            "total_candidates": total_candidates,
            "total_recruiters": total_recruiters,
            "total_admins": total_admins,
            "total_jobs": total_jobs,
            "total_resumes": total_resumes,
            "total_applications": total_applications,
            "average_match_score": avg_score,
            "top_skills": top_skills_formatted,
            "pending_approvals": pending_approvals,
            "active_jobs": active_jobs,
            "shortlisted_count": shortlisted_count,
            "interview_count": interview_count,
            "selected_count": selected_count,
            "hired_count": hired_count,
            "evaluated_count": evaluated_count,
            "rejected_count": rejected_count,
            "applied_count": applied_count,
            "applications_by_status": applications_by_status
        },
        "recent_users": [u.to_dict() for u in recent_users]
    }, status=200)


@api_view(['GET'])
@auth_required('admin')
def get_users(request):
    role = request.GET.get('role')
    query = User.objects.all()
    if role:
        query = query.filter(role=role)

    users = list(query)
    users_data = []

    for u in users:
        d = u.to_dict()
        if u.role == "recruiter":
            d["jobs_posted"] = Job.objects.filter(recruiter_id=u.id).count()
            d["active_jobs_posted"] = Job.objects.filter(recruiter_id=u.id, status="open").count()
            d["applications_received"] = Application.objects.filter(job__recruiter_id=u.id).count()
        elif u.role == "candidate":
            d["resumes_count"] = Resume.objects.filter(user_id=u.id).count()
            d["applications_sent"] = Application.objects.filter(candidate_id=u.id).count()
        users_data.append(d)

    return JsonResponse(users_data, safe=False, status=200)


@api_view(['PUT'])
@auth_required('admin')
def approve_recruiter(request, user_id):
    user = User.objects.filter(id=user_id).first()
    if not user:
        return JsonResponse({"message": "User not found"}, status=404)

    if user.role != "recruiter":
        return JsonResponse({"message": "Only recruiter accounts can be approved."}, status=400)

    if not user.email_verified:
        return JsonResponse({"message": "Recruiter must verify their email before approval."}, status=400)

    if user.approval_status == "approved":
        return JsonResponse({"message": "Recruiter is already approved.", "user": user.to_dict()}, status=200)

    try:
        temp_password = _generate_random_password(8)
        user.set_password(temp_password)
        user.must_change_password = True
        user.approval_status = "approved"
        user.save(update_fields=['password_hash', 'must_change_password', 'approval_status'])

        send_approval_email(user.email, user.name, temp_password)

        return JsonResponse({
            "message": f"Recruiter '{user.name}' approved successfully. Credentials emailed.",
            "user": user.to_dict(),
            "temp_password": temp_password
        }, status=200)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to approve recruiter: {ex}"}, status=500)


@api_view(['PUT'])
@auth_required('admin')
def reject_recruiter(request, user_id):
    user = User.objects.filter(id=user_id).first()
    if not user:
        return JsonResponse({"message": "User not found"}, status=404)

    if user.role != "recruiter":
        return JsonResponse({"message": "Only recruiter accounts can be rejected."}, status=400)

    if not user.email_verified:
        return JsonResponse({"message": "Recruiter must verify their email before rejection."}, status=400)

    try:
        user.approval_status = "rejected"
        user.save(update_fields=['approval_status'])

        send_rejection_email(user.email, user.name)

        return JsonResponse({
            "message": f"Recruiter '{user.name}' rejected successfully. Rejection email sent.",
            "user": user.to_dict()
        }, status=200)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to reject recruiter: {ex}"}, status=500)


@api_view(['DELETE'])
@auth_required('admin')
def delete_user(request, user_id):
    current = request.current_user
    if current.id == user_id:
        return JsonResponse({"message": "Access forbidden: you cannot delete your own admin account!"}, status=400)

    user = User.objects.filter(id=user_id).first()
    if not user:
        return JsonResponse({"message": "User not found"}, status=404)

    try:
        user_name = user.name
        user.delete()
        return JsonResponse({"message": f"User '{user_name}' deleted successfully!"}, status=200)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to delete user: {ex}"}, status=500)


@api_view(['GET', 'POST'])
@auth_required('admin')
def config_view(request):
    if request.method == 'GET':
        settings_objs = SystemSetting.objects.all()
        settings_dict = {s.key: s.value for s in settings_objs}

        defaults = {
            "GEMINI_API_KEY": "",
            "DEFAULT_WEIGHTS": json.dumps({"skills": 50, "projects": 30, "experience": 20}),
            "SITE_NAME": "ShortlistIQ ATS",
            "DEFAULT_SCREENING_THRESHOLD": "70",
            "ALLOW_CANDIDATE_REGISTRATION": "true",
            "GEMINI_MODEL_VERSION": "gemini-1.5-flash"
        }

        for k, v in defaults.items():
            if k not in settings_dict:
                settings_dict[k] = v

        return JsonResponse(settings_dict, status=200)

    # POST
    data = request.data or {}
    try:
        if "DEFAULT_WEIGHTS" in data and data["DEFAULT_WEIGHTS"]:
            w_val = data["DEFAULT_WEIGHTS"]
            if isinstance(w_val, str):
                try:
                    w_dict = json.loads(w_val)
                except Exception:
                    w_dict = None
            elif isinstance(w_val, dict):
                w_dict = w_val
            else:
                w_dict = None

            if w_dict:
                skills = int(w_dict.get("skills", 50))
                projects = int(w_dict.get("projects", 30))
                experience = int(w_dict.get("experience", 20))
                if skills + projects + experience != 100:
                    return JsonResponse({"message": "Evaluation weights must sum to exactly 100%"}, status=400)
                data["DEFAULT_WEIGHTS"] = json.dumps(w_dict)

        for k, v in data.items():
            val_str = str(v) if v is not None else ""
            setting = SystemSetting.objects.filter(key=k).first()
            if not setting:
                SystemSetting.objects.create(key=k, value=val_str)
            else:
                setting.value = val_str
                setting.save(update_fields=['value'])

        return JsonResponse({"message": "Configurations updated successfully!"}, status=200)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to save settings: {ex}"}, status=500)


@api_view(['GET'])
@auth_required('admin')
def get_logs(request):
    logs = []

    users = User.objects.order_by('-id')[:15]
    for u in users:
        logs.append({
            "type": "user",
            "message": f"New account registered: '{u.name}' ({u.email}) signed up as role '{u.role}'.",
            "timestamp": u.created_at.isoformat() if u.created_at else None
        })

    jobs = Job.objects.select_related('recruiter').order_by('-id')[:15]
    for j in jobs:
        recruiter_name = j.recruiter.name if j.recruiter else f"ID {j.recruiter_id}"
        logs.append({
            "type": "job",
            "message": f"New job posting published: '{j.title}' by Recruiter '{recruiter_name}' (Location: '{j.location or 'Remote'}').",
            "timestamp": j.created_at.isoformat() if j.created_at else None
        })

    resumes = Resume.objects.select_related('user').order_by('-id')[:15]
    for r in resumes:
        cand_name = r.user.name if r.user else f"ID {r.user_id}"
        logs.append({
            "type": "resume",
            "message": f"Resume uploaded & parsed: '{r.file_name}' for Candidate '{cand_name}' ({r.experience_years or 0.0} years experience parsed).",
            "timestamp": r.parsed_at.isoformat() if r.parsed_at else None
        })

    apps = Application.objects.select_related('candidate', 'job').order_by('-id')[:15]
    for a in apps:
        cand_name = a.candidate.name if a.candidate else f"ID {a.candidate_id}"
        job_title = a.job.title if a.job else f"ID {a.job_id}"
        logs.append({
            "type": "application",
            "message": f"Job application submitted: Candidate '{cand_name}' applied for '{job_title}' (Status: '{a.status.upper()}').",
            "timestamp": a.applied_at.isoformat() if a.applied_at else None
        })

    logs.sort(key=lambda l: l["timestamp"] or "", reverse=True)
    return JsonResponse(logs[:40], safe=False, status=200)


@api_view(['GET'])
@auth_required('admin')
def get_job_details(request, job_id):
    job = Job.objects.select_related('recruiter').filter(id=job_id).first()
    if not job:
        return JsonResponse({"message": "Job not found"}, status=404)

    apps = list(Application.objects.select_related('candidate').prefetch_related('matches').filter(job_id=job.id))
    total = len(apps)
    pending = sum(1 for a in apps if a.status in ('applied', 'pending_evaluation'))
    evaluated_only = sum(1 for a in apps if a.status == 'evaluated')
    shortlisted_only = sum(1 for a in apps if a.status == 'shortlisted')
    interview_only = sum(1 for a in apps if a.status == 'interview')
    selected_only = sum(1 for a in apps if a.status in ('selected', 'approved'))
    hired_only = sum(1 for a in apps if a.status == 'hired')
    rejected_only = sum(1 for a in apps if a.status == 'rejected')

    evaluated_total = total - pending
    shortlisted_plus = shortlisted_only + interview_only + selected_only + hired_only

    pipeline = {
        "total": total,
        "pending": pending,
        "evaluated": evaluated_total,
        "evaluated_only": evaluated_only,
        "shortlisted": shortlisted_plus,
        "shortlisted_only": shortlisted_only,
        "interview": interview_only,
        "selected": selected_only,
        "hired": hired_only,
        "rejected": rejected_only
    }

    app_ids = [a.id for a in apps]
    avg_final = 0.0
    score_distribution = {"0-20": 0, "20-40": 0, "40-60": 0, "60-80": 0, "80-100": 0}

    if app_ids:
        scores = list(MatchScore.objects.filter(application_id__in=app_ids))
        if scores:
            avg_final = round(sum(s.final_score for s in scores) / len(scores), 1)
            for s in scores:
                fs = s.final_score
                if fs < 20: score_distribution["0-20"] += 1
                elif fs < 40: score_distribution["20-40"] += 1
                elif fs < 60: score_distribution["40-60"] += 1
                elif fs < 80: score_distribution["60-80"] += 1
                else: score_distribution["80-100"] += 1

    recent_apps = sorted(apps, key=lambda a: a.id, reverse=True)[:10]
    recent_apps_data = []
    for a in recent_apps:
        latest_match = a.matches.order_by('-calculated_at').first()
        latest_score = latest_match.final_score if latest_match else None
        recent_apps_data.append({
            "candidate_name": a.candidate.name if a.candidate else None,
            "status": a.status,
            "applied_at": a.applied_at.isoformat() if a.applied_at else None,
            "match_score": latest_score
        })

    job_dict = job.to_dict()
    job_dict["recruiter_name"] = job.recruiter.name if job.recruiter else None
    job_dict["recruiter_email"] = job.recruiter.email if job.recruiter else None
    job_dict["pipeline"] = pipeline
    job_dict["pipeline_counts"] = pipeline
    job_dict["ai_stats"] = {
        "avg_score": avg_final,
        "avg_final_score": avg_final,
        "score_distribution": score_distribution
    }
    job_dict["recent_applications"] = recent_apps_data

    return JsonResponse(job_dict, status=200)


@api_view(['GET'])
@auth_required('admin')
def get_candidate_details(request, candidate_id):
    user = User.objects.filter(id=candidate_id).first()
    if not user:
        return JsonResponse({"message": "Candidate not found"}, status=404)

    resumes = Resume.objects.filter(user_id=candidate_id)
    resumes_data = []
    for r in resumes:
        skills_list = []
        if r.skills:
            try:
                skills_list = json.loads(r.skills)
            except Exception:
                skills_list = [r.skills]

        resumes_data.append({
            "file_name": r.file_name,
            "parsed_at": r.parsed_at.isoformat() if r.parsed_at else None,
            "experience_years": float(r.experience_years or 0.0),
            "skills": skills_list
        })

    apps = Application.objects.select_related('job__recruiter').prefetch_related('matches').filter(candidate_id=candidate_id)
    apps_data = []
    for a in apps:
        latest_match = a.matches.order_by('-calculated_at').first()
        latest_score = latest_match.final_score if latest_match else None
        apps_data.append({
            "job_title": a.job.title if a.job else None,
            "company": a.job.recruiter.name if a.job and a.job.recruiter else None,
            "status": a.status,
            "applied_at": a.applied_at.isoformat() if a.applied_at else None,
            "match_score": latest_score
        })

    return JsonResponse({
        "user": {
            "name": user.name,
            "email": user.email,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None
        },
        "resumes": resumes_data,
        "applications": apps_data
    }, status=200)


@api_view(['GET'])
@auth_required('admin')
def export_recruiters(request):
    recruiters = User.objects.filter(role="recruiter")
    data = []
    for r in recruiters:
        data.append({
            "name": r.name,
            "email": r.email,
            "approval_status": r.approval_status,
            "email_verified": r.email_verified,
            "jobs_posted": Job.objects.filter(recruiter_id=r.id).count(),
            "active_jobs_posted": Job.objects.filter(recruiter_id=r.id, status="open").count(),
            "applications_received": Application.objects.filter(job__recruiter_id=r.id).count(),
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "last_login_at": r.last_login_at.isoformat() if r.last_login_at else None
        })
    return JsonResponse(data, safe=False, status=200)


@api_view(['GET'])
@auth_required('admin')
def export_candidates(request):
    candidates = User.objects.filter(role="candidate")
    data = []
    for c in candidates:
        data.append({
            "name": c.name,
            "email": c.email,
            "resumes_count": Resume.objects.filter(user_id=c.id).count(),
            "applications_sent": Application.objects.filter(candidate_id=c.id).count(),
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "last_login_at": c.last_login_at.isoformat() if c.last_login_at else None
        })
    return JsonResponse(data, safe=False, status=200)


@api_view(['GET'])
@auth_required('admin')
def export_jobs(request):
    jobs = Job.objects.select_related('recruiter')
    data = []
    for j in jobs:
        data.append({
            "title": j.title,
            "recruiter_name": j.recruiter.name if j.recruiter else None,
            "location": j.location,
            "status": j.status,
            "experience_required": j.experience_required or 0,
            "applications_count": Application.objects.filter(job_id=j.id).count(),
            "created_at": j.created_at.isoformat() if j.created_at else None
        })
    return JsonResponse(data, safe=False, status=200)


@api_view(['GET'])
@auth_required('admin')
def export_applications(request):
    apps = Application.objects.select_related('candidate', 'job__recruiter').prefetch_related('matches')
    data = []
    for a in apps:
        latest = a.matches.order_by('-calculated_at').first()
        data.append({
            "candidate_name": a.candidate.name if a.candidate else None,
            "candidate_email": a.candidate.email if a.candidate else None,
            "job_title": a.job.title if a.job else None,
            "recruiter_name": a.job.recruiter.name if a.job and a.job.recruiter else None,
            "status": a.status,
            "applied_at": a.applied_at.isoformat() if a.applied_at else None,
            "match_score": latest.final_score if latest else None
        })
    return JsonResponse(data, safe=False, status=200)


@api_view(['GET'])
@auth_required('admin')
def export_hiring_report(request):
    jobs = Job.objects.select_related('recruiter')
    data = []
    for j in jobs:
        apps = list(Application.objects.filter(job_id=j.id))
        data.append({
            "title": j.title,
            "recruiter_name": j.recruiter.name if j.recruiter else None,
            "total_applications": len(apps),
            "applied": sum(1 for a in apps if a.status == "applied"),
            "evaluated": sum(1 for a in apps if a.status == "evaluated"),
            "shortlisted": sum(1 for a in apps if a.status == "shortlisted"),
            "interview": sum(1 for a in apps if a.status == "interview"),
            "selected": sum(1 for a in apps if a.status in ("selected", "approved")),
            "hired": sum(1 for a in apps if a.status == "hired"),
            "rejected": sum(1 for a in apps if a.status == "rejected")
        })
    return JsonResponse(data, safe=False, status=200)


@api_view(['GET'])
@auth_required('admin')
def export_recruiter_report(request):
    recruiters = User.objects.filter(role="recruiter")
    data = []
    for r in recruiters:
        jobs = list(Job.objects.filter(recruiter_id=r.id))
        job_ids = [j.id for j in jobs]
        apps = list(Application.objects.prefetch_related('matches').filter(job_id__in=job_ids)) if job_ids else []

        scores = [m.final_score for a in apps for m in a.matches.all()]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

        data.append({
            "name": r.name,
            "email": r.email,
            "total_jobs": len(jobs),
            "active_jobs": sum(1 for j in jobs if j.status == "open"),
            "total_applications": len(apps),
            "shortlisted": sum(1 for a in apps if a.status == "shortlisted"),
            "hired": sum(1 for a in apps if a.status == "hired"),
            "avg_match_score": avg_score
        })
    return JsonResponse(data, safe=False, status=200)


@api_view(['GET'])
@auth_required('admin')
def get_analytics(request):
    app_status_counts = Application.objects.values('status').annotate(cnt=Count('id'))
    applications_by_status = {item['status'] or 'applied': item['cnt'] for item in app_status_counts}

    job_status_counts = Job.objects.values('status').annotate(cnt=Count('id'))
    jobs_by_status = {item['status'] or 'open': item['cnt'] for item in job_status_counts}

    logs = []
    users = User.objects.order_by('-id')[:15]
    for u in users:
        logs.append({
            "type": "user",
            "message": f"New account registered: '{u.name}' ({u.email}) signed up as role '{u.role}'.",
            "timestamp": u.created_at.isoformat() if u.created_at else None
        })

    jobs = Job.objects.select_related('recruiter').order_by('-id')[:15]
    for j in jobs:
        recruiter_name = j.recruiter.name if j.recruiter else f"ID {j.recruiter_id}"
        logs.append({
            "type": "job",
            "message": f"New job posting published: '{j.title}' by Recruiter '{recruiter_name}' (Location: '{j.location or 'Remote'}').",
            "timestamp": j.created_at.isoformat() if j.created_at else None
        })

    resumes = Resume.objects.select_related('user').order_by('-id')[:15]
    for r in resumes:
        cand_name = r.user.name if r.user else f"ID {r.user_id}"
        logs.append({
            "type": "resume",
            "message": f"Resume uploaded & parsed: '{r.file_name}' for Candidate '{cand_name}' ({r.experience_years or 0.0} years experience parsed).",
            "timestamp": r.parsed_at.isoformat() if r.parsed_at else None
        })

    apps = Application.objects.select_related('candidate', 'job').order_by('-id')[:15]
    for a in apps:
        cand_name = a.candidate.name if a.candidate else f"ID {a.candidate_id}"
        job_title = a.job.title if a.job else f"ID {a.job_id}"
        logs.append({
            "type": "application",
            "message": f"Job application submitted: Candidate '{cand_name}' applied for '{job_title}' (Status: '{a.status.upper()}').",
            "timestamp": a.applied_at.isoformat() if a.applied_at else None
        })

    logs.sort(key=lambda l: l["timestamp"] or "", reverse=True)
    recent_activities = logs[:15]

    now = datetime.now(timezone.utc)
    monthly_applications = []
    for i in range(5, -1, -1):
        year = now.year
        month = now.month - i
        while month <= 0:
            month += 12
            year -= 1

        next_year = year
        next_month = month + 1
        if next_month > 12:
            next_month = 1
            next_year += 1

        month_start = datetime(year, month, 1, tzinfo=timezone.utc)
        month_end = datetime(next_year, next_month, 1, tzinfo=timezone.utc)

        cnt = Application.objects.filter(applied_at__gte=month_start, applied_at__lt=month_end).count()
        monthly_applications.append({
            "month": month_start.strftime("%Y-%m"),
            "count": cnt
        })

    recruiters = User.objects.filter(role="recruiter")
    recruiter_stats = []
    for r in recruiters:
        active = Job.objects.filter(recruiter_id=r.id, status="open").count()
        total_apps = Application.objects.filter(job__recruiter_id=r.id).count()
        recruiter_stats.append({
            "name": r.name,
            "active_jobs": active,
            "total_applications": total_apps
        })

    recruiter_stats.sort(key=lambda rs: rs["active_jobs"], reverse=True)
    top_recruiters = recruiter_stats[:5]

    return JsonResponse({
        "applications_by_status": applications_by_status,
        "jobs_by_status": jobs_by_status,
        "recent_activities": recent_activities,
        "monthly_applications": monthly_applications,
        "top_recruiters": top_recruiters
    }, status=200)
