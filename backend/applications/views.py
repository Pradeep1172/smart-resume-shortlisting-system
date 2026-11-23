import json
from datetime import datetime, timezone
from django.http import JsonResponse
from rest_framework.decorators import api_view
from accounts.models import User
from accounts.auth import auth_required
from jobs.models import Job
from resumes.models import Resume
from applications.models import Application, MatchScore
from candidates.models import CandidateProfile
from notifications.models import Notification
from services.match_service import calculate_quick_score, calculate_match_score
from services.resume_parser_service import calculate_resume_confidence
from services.email_service import send_application_confirmation_email, send_status_update_email
from utils.date_utils import is_past_deadline, ensure_utc_aware

ALLOWED_STATUSES = {"applied", "pending_evaluation", "evaluated", "shortlisted", "interview", "selected", "hired", "rejected", "approved"}

VALID_STATUS_MAP = {
    "applied": ["pending_evaluation", "rejected"],
    "pending_evaluation": ["evaluated", "applied", "rejected"],
    "evaluated": ["pending_evaluation", "shortlisted", "rejected"],
    "shortlisted": ["evaluated", "interview", "selected", "rejected"],
    "interview": ["shortlisted", "selected", "rejected"],
    "selected": ["interview", "hired", "rejected"],
    "hired": ["selected", "rejected"],
    "rejected": ["applied", "pending_evaluation", "evaluated"]
}


def is_valid_status_transition(current_status: str, new_status: str) -> bool:
    if current_status == new_status:
        return True

    curr = "selected" if current_status == "approved" else (current_status or "applied")
    nxt = "selected" if new_status == "approved" else new_status

    allowed = VALID_STATUS_MAP.get(curr, [])
    return nxt in allowed


@api_view(['GET', 'POST'])
@auth_required()
def applications_list_create(request):
    user = request.current_user

    if request.method == 'GET':
        job_id = request.GET.get('job_id')
        query = Application.objects.select_related('job', 'candidate', 'resume').prefetch_related('matches')

        if user.role == 'candidate':
            query = query.filter(candidate_id=user.id)
        elif user.role == 'recruiter':
            if job_id:
                try:
                    jid = int(job_id)
                    job = Job.objects.filter(id=jid).first()
                    if not job:
                        return JsonResponse({"message": "Job not found"}, status=404)
                    if job.recruiter_id != user.id:
                        return JsonResponse({"message": "Access forbidden: you do not own this job"}, status=403)
                    query = query.filter(job_id=jid)
                except ValueError:
                    pass
            else:
                query = query.filter(job__recruiter_id=user.id)
        else:  # admin
            if job_id:
                try:
                    query = query.filter(job_id=int(job_id))
                except ValueError:
                    pass

        apps = list(query)
        return JsonResponse([a.to_dict() for a in apps], safe=False, status=200)

    # POST (Apply to job)
    if user.role not in ('candidate', 'admin'):
        return JsonResponse({"message": "Access forbidden: candidate role required"}, status=403)

    data = request.data
    job_id = data.get('job_id')
    resume_id = data.get('resume_id')

    if not job_id or not resume_id:
        return JsonResponse({"message": "job_id and resume_id are required"}, status=400)

    try:
        job = Job.objects.filter(id=int(job_id)).select_related('recruiter').first()
    except (ValueError, TypeError):
        job = None
    if not job:
        return JsonResponse({"message": "Job posting not found"}, status=404)

    is_expired = is_past_deadline(job.deadline)
    if job.status != "open" or is_expired:
        return JsonResponse({"message": "This job posting has been closed or expired"}, status=400)

    try:
        resume = Resume.objects.filter(id=int(resume_id)).first()
    except (ValueError, TypeError):
        resume = None
    if not resume:
        return JsonResponse({"message": "Resume not found"}, status=404)

    if resume.user_id != user.id and user.role != 'admin':
        return JsonResponse({"message": "Access forbidden: you do not own this resume"}, status=403)

    if Application.objects.filter(job_id=job.id, candidate_id=user.id).exists():
        return JsonResponse({"message": "You have already applied to this job!"}, status=409)

    try:
        application = Application(
            job_id=job.id,
            candidate_id=user.id,
            resume_id=resume.id,
            status="applied",
            applied_at=datetime.now(timezone.utc)
        )
        application.save()

        notif = Notification(
            user_id=job.recruiter_id,
            message=f"New application for '{job.title}' from '{user.name}'.",
            created_at=datetime.now(timezone.utc),
            is_read=False
        )
        notif.save()

        # Trigger Brevo email confirmation
        try:
            comp_name = job.company_name or (job.recruiter.company if job.recruiter and job.recruiter.company else "ShortlistIQ")
            send_application_confirmation_email(user.email, user.name, job.title, comp_name)
        except Exception as mail_err:
            print(f"[Applications] Confirmation email skipped/failed: {mail_err}")

        return JsonResponse({
            "message": "Application submitted successfully!",
            "application": application.to_dict()
        }, status=201)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to submit application: {ex}"}, status=500)


@api_view(['GET'])
@auth_required()
def application_detail(request, app_id):
    user = request.current_user
    app = Application.objects.filter(id=app_id).select_related('job', 'candidate', 'resume').prefetch_related('matches').first()
    if not app:
        return JsonResponse({"message": "Application not found"}, status=404)

    if user.role == 'candidate' and app.candidate_id != user.id:
        return JsonResponse({"message": "Access forbidden: unauthorized"}, status=403)

    if user.role == 'recruiter' and app.job and app.job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden: unauthorized"}, status=403)

    return JsonResponse(app.to_dict(), status=200)


@api_view(['PUT'])
@auth_required('recruiter', 'admin')
def bulk_update_status(request):
    user = request.current_user
    data = request.data or {}
    app_ids = data.get('application_ids', [])
    status = data.get('status')

    if not app_ids or not status:
        return JsonResponse({"message": "Missing application_ids or status in payload"}, status=400)

    if status not in ALLOWED_STATUSES:
        return JsonResponse({"message": "Invalid status type"}, status=400)

    try:
        apps = Application.objects.filter(id__in=app_ids).select_related('job', 'candidate')
        updated_count = 0
        skipped_count = 0

        for app in apps:
            if user.role == 'recruiter' and app.job and app.job.recruiter_id != user.id:
                continue

            if not is_valid_status_transition(app.status, status):
                skipped_count += 1
                continue

            app.status = status
            app.save()

            formatted_status = status[0].upper() + status[1:]
            job_title = app.job.title if app.job else "Job"
            candidate_name = app.candidate.name if app.candidate else "Candidate"

            Notification.objects.create(
                user_id=app.candidate_id,
                message=f"Your application status for '{job_title}' has been updated to: '{formatted_status}'.",
                created_at=datetime.now(timezone.utc),
                is_read=False
            )

            if app.job:
                Notification.objects.create(
                    user_id=app.job.recruiter_id,
                    message=f"Candidate '{candidate_name}' status updated to '{formatted_status}' for job '{job_title}'.",
                    created_at=datetime.now(timezone.utc),
                    is_read=False
                )

            # Trigger Brevo status update email
            try:
                if app.candidate and app.candidate.email:
                    comp_name = app.job.company_name if app.job else "ShortlistIQ"
                    send_status_update_email(app.candidate.email, candidate_name, job_title, status, comp_name)
            except Exception as mail_err:
                print(f"[Applications] Status update email skipped/failed: {mail_err}")

            updated_count += 1

        msg = f"Successfully updated status to {status} for {updated_count} applications!"
        if skipped_count > 0:
            msg += f" Skipped {skipped_count} invalid transitions."

        return JsonResponse({"message": msg}, status=200)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to bulk update status: {ex}"}, status=500)


@api_view(['PUT'])
@auth_required('recruiter', 'admin')
def update_status(request, app_id):
    user = request.current_user
    app = Application.objects.filter(id=app_id).select_related('job', 'candidate').first()
    if not app:
        return JsonResponse({"message": "Application not found"}, status=404)

    if user.role == 'recruiter' and app.job and app.job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden: you do not own this job posting"}, status=403)

    data = request.data or {}
    status = data.get('status')
    if not status:
        return JsonResponse({"message": "Missing status in payload"}, status=400)

    if status not in ALLOWED_STATUSES:
        return JsonResponse({"message": "Invalid status type"}, status=400)

    if not is_valid_status_transition(app.status, status):
        return JsonResponse({
            "message": f"Invalid status transition from '{app.status or 'applied'}' to '{status}'."
        }, status=400)

    try:
        app.status = status
        app.save()

        formatted_status = status[0].upper() + status[1:]
        job_title = app.job.title if app.job else "Job"
        candidate_name = app.candidate.name if app.candidate else "Candidate"

        Notification.objects.create(
            user_id=app.candidate_id,
            message=f"Your application status for '{job_title}' has been updated to: '{formatted_status}'.",
            created_at=datetime.now(timezone.utc),
            is_read=False
        )

        if app.job:
            Notification.objects.create(
                user_id=app.job.recruiter_id,
                message=f"Candidate '{candidate_name}' status updated to '{formatted_status}' for job '{job_title}'.",
                created_at=datetime.now(timezone.utc),
                is_read=False
            )

        # Trigger Brevo status update email
        try:
            if app.candidate and app.candidate.email:
                comp_name = app.job.company_name if app.job else "ShortlistIQ"
                send_status_update_email(app.candidate.email, candidate_name, job_title, status, comp_name)
        except Exception as mail_err:
            print(f"[Applications] Status update email skipped/failed: {mail_err}")

        return JsonResponse({
            "message": "Application status updated successfully!",
            "application": app.to_dict()
        }, status=200)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to update status: {ex}"}, status=500)


@api_view(['POST'])
@auth_required('recruiter', 'admin')
def rescore_application(request, app_id):
    user = request.current_user
    app = Application.objects.filter(id=app_id).select_related('job', 'candidate', 'resume').first()
    if not app:
        return JsonResponse({"message": "Application not found"}, status=404)

    if user.role == 'recruiter' and app.job and app.job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden: you do not own this job posting"}, status=403)

    if app.job and app.job.scores_outdated:
        return JsonResponse({
            "message": "Cannot rescore candidate: job evaluation strategy has changed. Please re-evaluate the entire candidate pool first."
        }, status=400)

    data = request.data or {}
    eval_type = data.get('evaluation_type', 'keyword')
    if eval_type not in ('keyword', 'weighted', 'ai'):
        return JsonResponse({"message": "Invalid evaluation_type"}, status=400)

    if not app.resume or not app.job:
        return JsonResponse({"message": "Application is missing resume or job reference"}, status=400)

    try:
        confidence = calculate_resume_confidence(app.resume.extracted_text or "")
        if confidence < 35:
            MatchScore.objects.filter(application_id=app.id).delete()
            return JsonResponse({
                "message": "Cannot evaluate candidate: the uploaded resume file is invalid or has insufficient content."
            }, status=400)

        r_skills = []
        if app.resume.skills:
            try:
                r_skills = json.loads(app.resume.skills)
            except Exception:
                r_skills = [app.resume.skills]

        r_projects = []
        if app.resume.projects:
            try:
                r_projects = json.loads(app.resume.projects)
            except Exception:
                r_projects = [app.resume.projects]

        weights_dict = None
        if 'weights' in data and isinstance(data['weights'], dict):
            weights_dict = {}
            for k, v in data['weights'].items():
                try:
                    weights_dict[k] = int(v)
                except (ValueError, TypeError):
                    pass

        if app.job.evaluation_strategy == "quick":
            match_data = calculate_quick_score(app.resume.extracted_text, r_skills, app.resume.experience_years or 0.0, app.job)
        else:
            match_data = calculate_match_score(app.resume.extracted_text, r_skills, r_projects, app.resume.experience_years or 0.0, app.job, eval_type, weights_dict)

        MatchScore.objects.filter(application_id=app.id).delete()

        final_score = float(match_data["final_score"])
        match_percentage = float(match_data["match_percentage"])
        ai_score = float(match_data["ai_score"]) if match_data.get("ai_score") is not None else None
        details_json = json.dumps(match_data.get("details", {}))

        score_record = MatchScore(
            application_id=app.id,
            match_percentage=match_percentage,
            ai_score=ai_score,
            final_score=final_score,
            evaluation_type=match_data.get("evaluation_type", eval_type),
            details=details_json,
            calculated_at=datetime.now(timezone.utc)
        )
        score_record.save()

        if app.status in ("applied", "pending_evaluation", None, ""):
            app.status = "evaluated"
            app.save()

        candidate_name = app.candidate.name if app.candidate else "Candidate"
        Notification.objects.create(
            user_id=app.job.recruiter_id,
            message=f"AI Evaluation generated for candidate '{candidate_name}' ({round(final_score)}% Match) for job '{app.job.title}'.",
            created_at=datetime.now(timezone.utc),
            is_read=False
        )

        return JsonResponse({
            "message": "Application match score recalculated successfully!",
            "score": score_record.to_dict(),
            "application": app.to_dict()
        }, status=200)
    except Exception as ex:
        return JsonResponse({"message": f"Rescoring failed: {ex}"}, status=500)


@api_view(['GET'])
def reset_evaluations(request):
    try:
        count = MatchScore.objects.count()
        MatchScore.objects.all().delete()
        Application.objects.all().update(status="applied")
        return JsonResponse({"message": f"Successfully deleted {count} MatchScore records and reset applications to 'applied'."}, status=200)
    except Exception as ex:
        return JsonResponse({"message": f"Error: {ex}"}, status=500)


@api_view(['GET'])
@auth_required('recruiter', 'admin')
def get_candidate_profile_for_recruiter(request, app_id):
    user = request.current_user
    app = Application.objects.filter(id=app_id).select_related('job', 'candidate', 'resume').first()
    if not app:
        return JsonResponse({"message": "Application not found"}, status=404)

    if user.role == 'recruiter' and app.job and app.job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden"}, status=403)

    candidate = app.candidate
    if not candidate:
        return JsonResponse({"message": "Candidate not found"}, status=404)

    profile = CandidateProfile.objects.filter(user_id=candidate.id).first()
    resume = app.resume

    has_photo = bool(profile and profile.photo_path)

    resume_skills = []
    if resume and resume.skills:
        try:
            resume_skills = json.loads(resume.skills)
        except Exception:
            resume_skills = [resume.skills]

    resume_projects = []
    if resume and resume.projects:
        try:
            resume_projects = json.loads(resume.projects)
        except Exception:
            resume_projects = [resume.projects]

    return JsonResponse({
        "candidate_id": candidate.id,
        "candidate_name": candidate.name,
        "candidate_email": candidate.email,
        "has_photo": has_photo,
        "photo_url": f"/api/profile/photo/{candidate.id}" if has_photo else None,
        "profile": profile.to_dict() if profile else {},
        "resume": {
            "skills": resume_skills,
            "projects": resume_projects,
            "experience_years": resume.experience_years or 0.0 if resume else 0.0,
            "file_name": resume.file_name if resume else None
        },
        "application": {
            "id": app.id,
            "status": app.status,
            "applied_at": app.applied_at.isoformat() if app.applied_at else None
        }
    }, status=200)
