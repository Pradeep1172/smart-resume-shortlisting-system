import json
from datetime import datetime, timezone
from django.http import JsonResponse
from rest_framework.decorators import api_view
from accounts.models import User
from accounts.auth import auth_required
from jobs.models import Job
from applications.models import Application, MatchScore
from notifications.models import Notification
from services.match_service import (
    auto_compute_weights, calculate_quick_score, calculate_match_score,
    generate_pool_quick_analysis, generate_pool_ai_analysis
)
from services.email_service import send_shortlist_email
from utils.date_utils import parse_deadline, is_past_deadline, ensure_utc_aware


@api_view(['GET', 'POST'])
@auth_required()
def jobs_list_create(request):
    user = request.current_user

    if request.method == 'GET':
        status = request.GET.get('status')
        recruiter_id = request.GET.get('recruiter_id')

        query = Job.objects.filter(is_external=False).select_related('recruiter')

        if user.role == 'recruiter':
            query = query.filter(recruiter_id=user.id)
        elif recruiter_id:
            try:
                query = query.filter(recruiter_id=int(recruiter_id))
            except ValueError:
                pass

        if status:
            query = query.filter(status=status)

        jobs = query.order_by('-id')
        return JsonResponse([j.to_dict() for j in jobs], safe=False, status=200)

    # POST
    if user.role not in ('recruiter', 'admin'):
        return JsonResponse({"message": "Access forbidden: unauthorized role!"}, status=403)

    data = request.data
    title = (data.get('title') or '').strip()
    description = (data.get('description') or '').strip()

    if not title or not description:
        return JsonResponse({"message": "Title and description are required"}, status=400)

    skills_raw = data.get('skills_required', [])
    skills_list = []
    if isinstance(skills_raw, list):
        skills_list = [str(s).strip() for s in skills_raw if str(s).strip()]
    elif isinstance(skills_raw, str):
        skills_list = [s.strip() for s in skills_raw.split(',') if s.strip()]

    try:
        experience_required = int(data.get('experience_required', 0))
    except (ValueError, TypeError):
        experience_required = 0

    location = data.get('location', '')

    try:
        min_match_score = int(data.get('min_match_score', 70))
    except (ValueError, TypeError):
        min_match_score = 70

    ai_insights_enabled = bool(data.get('ai_insights_enabled', True))
    evaluation_strategy = data.get('evaluation_strategy', 'intelligent')
    if evaluation_strategy not in ('quick', 'intelligent'):
        return JsonResponse({"message": "evaluation_strategy must be 'quick' or 'intelligent'"}, status=400)

    deadline = None
    deadline_str = data.get('deadline')
    if deadline_str:
        try:
            deadline = parse_deadline(deadline_str)
        except Exception:
            return JsonResponse({"message": "Invalid deadline format. Use YYYY-MM-DD or ISO string"}, status=400)

    weights = auto_compute_weights(experience_required)

    try:
        new_job = Job(
            recruiter_id=user.id,
            title=title,
            description=description,
            skills_required=json.dumps(skills_list),
            experience_required=experience_required,
            location=location,
            status="open",
            deadline=deadline,
            min_match_score=min_match_score,
            evaluation_type="ai",
            ai_insights_enabled=ai_insights_enabled,
            evaluation_strategy=evaluation_strategy,
            evaluation_weights=json.dumps(weights),
            created_at=datetime.now(timezone.utc),
            is_external=False
        )
        new_job.save()

        return JsonResponse({
            "message": "Job posted successfully!",
            "job": new_job.to_dict()
        }, status=201)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to create job: {ex}"}, status=500)


@api_view(['GET', 'PUT', 'DELETE'])
@auth_required()
def job_detail_update_delete(request, job_id):
    user = request.current_user
    job = Job.objects.filter(id=job_id).select_related('recruiter').first()
    if not job:
        return JsonResponse({"message": "Job posting not found"}, status=404)

    if request.method == 'GET':
        if user.role == 'candidate' and job.is_external:
            return JsonResponse({"message": "Access forbidden: this job posting is private"}, status=403)
        if user.role == 'recruiter' and job.recruiter_id != user.id:
            return JsonResponse({"message": "Access forbidden: you do not own this job posting"}, status=403)
        return JsonResponse(job.to_dict(), status=200)

    # PUT or DELETE require recruiter or admin
    if user.role not in ('recruiter', 'admin'):
        return JsonResponse({"message": "Access forbidden: unauthorized role!"}, status=403)

    if user.role == 'recruiter' and job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden: you do not own this job posting!"}, status=403)

    if request.method == 'DELETE':
        try:
            job.delete()
            return JsonResponse({"message": "Job posting deleted successfully!"}, status=200)
        except Exception as ex:
            return JsonResponse({"message": f"Failed to delete job: {ex}"}, status=500)

    # PUT
    data = request.data
    criteria_changed = False

    if 'title' in data and data['title']:
        job.title = data['title']
    if 'description' in data and data['description']:
        job.description = data['description']

    if 'skills_required' in data:
        sp = data['skills_required']
        if isinstance(sp, list):
            new_skills_list = [str(s).strip() for s in sp if str(s).strip()]
        else:
            new_skills_list = [s.strip() for s in str(sp).split(',') if s.strip()]
        new_skills_json = json.dumps(new_skills_list)
        if new_skills_json != job.skills_required:
            criteria_changed = True
            job.skills_required = new_skills_json

    if 'experience_required' in data:
        try:
            new_exp = int(data['experience_required'])
            if new_exp != job.experience_required:
                criteria_changed = True
                job.experience_required = new_exp
                job.evaluation_weights = json.dumps(auto_compute_weights(new_exp))
        except (ValueError, TypeError):
            pass

    if 'location' in data:
        job.location = data['location']

    if 'status' in data and data['status']:
        job.status = data['status']

    if 'min_match_score' in data:
        try:
            job.min_match_score = int(data['min_match_score'])
        except (ValueError, TypeError):
            pass

    if 'ai_insights_enabled' in data:
        job.ai_insights_enabled = bool(data['ai_insights_enabled'])

    if 'evaluation_strategy' in data:
        new_strat = data['evaluation_strategy']
        if new_strat in ('quick', 'intelligent'):
            if job.evaluation_status == 'evaluating':
                return JsonResponse({"message": "Cannot change evaluation strategy while evaluation is in progress."}, status=409)
            if new_strat != job.evaluation_strategy:
                criteria_changed = True
                job.evaluation_strategy = new_strat

    if 'deadline' in data:
        dl_str = data['deadline']
        if dl_str:
            try:
                job.deadline = parse_deadline(dl_str)
            except Exception:
                return JsonResponse({"message": "Invalid deadline format. Use YYYY-MM-DD or ISO string"}, status=400)
        else:
            job.deadline = None

    if criteria_changed and job.evaluation_status == 'evaluated':
        job.scores_outdated = True

    try:
        job.save()
        return JsonResponse({
            "message": "Job updated successfully!",
            "job": job.to_dict()
        }, status=200)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to update job: {ex}"}, status=500)


@api_view(['POST'])
@auth_required('recruiter', 'admin')
def evaluate_job(request, job_id):
    user = request.current_user
    job = Job.objects.filter(id=job_id).select_related('recruiter').first()
    if not job:
        return JsonResponse({"message": "Job posting not found"}, status=404)

    if user.role == 'recruiter' and job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden: you do not own this job posting!"}, status=403)

    if job.evaluation_status == 'evaluating':
        return JsonResponse({"message": "Evaluation is already in progress for this job."}, status=409)

    strategy = job.evaluation_strategy or "intelligent"
    shortlisted_only = False

    data = request.data or {}
    if 'evaluation_strategy' in data:
        s = data['evaluation_strategy']
        if s in ('quick', 'intelligent'):
            strategy = s
        else:
            return JsonResponse({"message": "evaluation_strategy must be 'quick' or 'intelligent'"}, status=400)
    if 'shortlisted_only' in data:
        shortlisted_only = bool(data['shortlisted_only'])

    prev_status = job.evaluation_status or "pending"
    job.evaluation_strategy = strategy
    job.evaluation_status = "evaluating"
    job.save()

    app_query = Application.objects.filter(job_id=job.id).select_related('candidate', 'resume')
    if shortlisted_only:
        app_query = app_query.filter(status='shortlisted')

    applications = list(app_query)
    if shortlisted_only and len(applications) == 0:
        job.evaluation_status = prev_status
        job.save()
        return JsonResponse({"message": "No shortlisted candidates found to evaluate."}, status=400)

    for app in applications:
        if shortlisted_only or app.status in ("applied", None, ""):
            app.status = "pending_evaluation"
            app.save()

    resolved_weights = auto_compute_weights(job.experience_required or 0)

    try:
        app_ids = [a.id for a in applications]
        MatchScore.objects.filter(application_id__in=app_ids).delete()

        scores = []
        matched_skills_all = []
        missing_skills_all = []
        evaluated_apps = []

        for app in applications:
            try:
                if not app.resume:
                    continue

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

                if strategy == "quick":
                    match_data = calculate_quick_score(app.resume.extracted_text, r_skills, app.resume.experience_years or 0.0, job)
                else:
                    match_data = calculate_match_score(app.resume.extracted_text, r_skills, r_projects, app.resume.experience_years or 0.0, job, "ai", resolved_weights)

                final_score = float(match_data["final_score"])
                match_percentage = float(match_data["match_percentage"])
                ai_score = float(match_data["ai_score"]) if match_data.get("ai_score") is not None else None
                eval_type = match_data.get("evaluation_type") or strategy
                details_json = json.dumps(match_data.get("details", {}))

                score_record = MatchScore(
                    application_id=app.id,
                    match_percentage=match_percentage,
                    ai_score=ai_score,
                    final_score=final_score,
                    evaluation_type=eval_type,
                    details=details_json,
                    calculated_at=datetime.now(timezone.utc)
                )
                score_record.save()

                if app.status in ("applied", "pending_evaluation", None, ""):
                    app.status = "evaluated"
                    app.save()

                scores.append(final_score)

                details_dict = match_data.get("details", {})
                if isinstance(details_dict, dict):
                    matched_skills_all.extend(details_dict.get("matched_skills", []))
                    missing_skills_all.extend(details_dict.get("missing_skills", []))

                evaluated_apps.append(app)
            except Exception as ex:
                print(f"Failed to evaluate candidate application {app.id}: {ex}")

        if strategy == "quick":
            pool_data = generate_pool_quick_analysis(job, len(evaluated_apps), scores, matched_skills_all, missing_skills_all)
        else:
            pool_data = generate_pool_ai_analysis(job, len(evaluated_apps), scores, matched_skills_all, missing_skills_all)

        job.evaluation_type = "keyword" if strategy == "quick" else "ai"
        job.evaluation_weights = json.dumps(resolved_weights)
        job.evaluation_status = "evaluated"
        job.pool_analysis = json.dumps(pool_data)
        job.results_generated = False
        job.scores_outdated = False
        job.evaluated_at = datetime.now(timezone.utc)
        job.evaluated_by_id = user.id
        job.save()

        notif = Notification(
            user_id=job.recruiter_id,
            message=f"Screening pipeline executed for job '{job.title}'. Evaluated {len(evaluated_apps)} candidates.",
            created_at=datetime.now(timezone.utc)
        )
        notif.save()

        return JsonResponse({
            "message": f"Successfully evaluated {len(applications)} applications!",
            "job": job.to_dict()
        }, status=200)
    except Exception as ex:
        job.evaluation_status = prev_status
        job.save()
        return JsonResponse({"message": f"Evaluation failed: {ex}"}, status=500)


@api_view(['POST'])
@auth_required('recruiter', 'admin')
def generate_results(request, job_id):
    user = request.current_user
    job = Job.objects.filter(id=job_id).select_related('recruiter').first()
    if not job:
        return JsonResponse({"message": "Job posting not found"}, status=404)

    if user.role == 'recruiter' and job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden: you do not own this job posting!"}, status=403)

    if job.scores_outdated:
        return JsonResponse({"message": "Evaluation results are outdated. Please re-evaluate candidates before generating a shortlist."}, status=400)

    data = request.data or {}
    threshold = 70
    if 'threshold' in data:
        try:
            threshold = int(data['threshold'])
        except (ValueError, TypeError):
            pass
    elif job.pool_analysis:
        try:
            pool = json.loads(job.pool_analysis)
            if 'recommended_threshold' in pool:
                threshold = int(pool['recommended_threshold'])
        except Exception:
            pass

    max_candidates = None
    if 'max_candidates' in data and data['max_candidates'] is not None:
        try:
            max_candidates = int(data['max_candidates'])
        except (ValueError, TypeError):
            pass

    send_emails = bool(data.get('send_emails', False))
    included_ids = data.get('included_ids')

    recruiter = User.objects.filter(id=job.recruiter_id).first()
    company_name = (recruiter.company if recruiter and recruiter.company else "ShortlistIQ")

    applications = list(Application.objects.filter(job_id=job.id).select_related('candidate').prefetch_related('matches'))

    app_scores = []
    for app in applications:
        latest = app.matches.order_by('-id').first()
        app_scores.append({"app": app, "score": latest.final_score if latest else None})

    shortlist_items = []
    remaining_items = []

    if included_ids and isinstance(included_ids, list):
        inc_set = set(int(x) for x in included_ids if str(x).isdigit())
        shortlist_items = [x["app"] for x in app_scores if x["app"].id in inc_set and x["score"] is not None]
        remaining_items = [x["app"] for x in app_scores if x["app"].id not in inc_set]
    else:
        qualifying = [x for x in app_scores if x["score"] is not None and x["score"] >= threshold]
        qualifying.sort(key=lambda x: x["score"], reverse=True)

        if max_candidates and max_candidates > 0:
            shortlist_items = [x["app"] for x in qualifying[:max_candidates]]
            remaining_items = [x["app"] for x in qualifying[max_candidates:]] + [x["app"] for x in app_scores if x["score"] is None or x["score"] < threshold]
        else:
            shortlist_items = [x["app"] for x in qualifying]
            remaining_items = [x["app"] for x in app_scores if x["score"] is None or x["score"] < threshold]

    shortlisted_count = 0
    for app in shortlist_items:
        app.status = "shortlisted"
        app.save()
        shortlisted_count += 1

        if send_emails and app.candidate and app.candidate.email:
            latest = app.matches.order_by('-id').first()
            send_shortlist_email(app.candidate.email, app.candidate.name, job.title, company_name, latest.final_score if latest else None)

    rejected_count = 0
    for app in remaining_items:
        latest = app.matches.order_by('-id').first()
        if latest and app.status not in ("shortlisted", "interview", "selected", "hired"):
            app.status = "rejected"
            app.save()
            rejected_count += 1

    job.min_match_score = threshold
    job.results_generated = True
    job.save()

    notif = Notification(
        user_id=job.recruiter_id,
        message=f"Bulk screening pipeline executed for job '{job.title}'. Shortlisted {shortlisted_count} candidate(s) at threshold of {threshold}%. {rejected_count} candidate(s) did not meet the threshold.",
        created_at=datetime.now(timezone.utc)
    )
    notif.save()

    return JsonResponse({
        "message": f"Shortlist successfully generated with {shortlisted_count} candidates at threshold {threshold}%! {rejected_count} candidate(s) rejected.",
        "shortlisted_count": shortlisted_count,
        "rejected_count": rejected_count,
        "job": job.to_dict()
    }, status=200)


@api_view(['POST'])
@auth_required('recruiter', 'admin')
def send_shortlist_emails_endpoint(request, job_id):
    user = request.current_user
    job = Job.objects.filter(id=job_id).select_related('recruiter').first()
    if not job:
        return JsonResponse({"message": "Job posting not found"}, status=404)

    if user.role == 'recruiter' and job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden: you do not own this job posting!"}, status=403)

    recruiter = User.objects.filter(id=job.recruiter_id).first()
    company_name = (recruiter.company if recruiter and recruiter.company else "ShortlistIQ")

    applications = Application.objects.filter(job_id=job.id, status='shortlisted').select_related('candidate').prefetch_related('matches')

    emails_sent = 0
    for app in applications:
        if app.candidate and app.candidate.email:
            try:
                latest = app.matches.order_by('-id').first()
                send_shortlist_email(app.candidate.email, app.candidate.name, job.title, company_name, latest.final_score if latest else None)
                emails_sent += 1
            except Exception as ex:
                print(f"Failed to send email to {app.candidate.email}: {ex}")

    return JsonResponse({
        "message": f"Successfully sent invitation emails to {emails_sent} shortlisted candidate(s)!",
        "emails_sent": emails_sent
    }, status=200)
