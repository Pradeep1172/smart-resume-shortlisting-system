import os
import io
import time
import json
import zipfile
import uuid
import shutil
from datetime import datetime, timezone
from django.conf import settings
from django.http import JsonResponse, FileResponse, HttpResponse
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from accounts.models import User
from accounts.auth import auth_required
from jobs.models import Job
from external_hiring.models import ExternalCandidate
from services.resume_parser_service import (
    parse_resume, calculate_resume_confidence, guess_name_from_text_and_filename
)
from services.match_service import (
    auto_compute_weights, calculate_quick_score, calculate_match_score,
    generate_pool_quick_analysis, generate_pool_ai_analysis
)
from services.email_service import send_shortlist_email

ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'}


def _get_uploads_dir():
    folder = getattr(settings, 'MEDIA_ROOT', None)
    if not folder:
        folder = os.path.abspath(os.path.join(os.path.dirname(settings.BASE_DIR), 'uploads'))
    os.makedirs(folder, exist_ok=True)
    return folder


def _get_ext_uploads_dir():
    base = _get_uploads_dir()
    ext_dir = os.path.join(base, 'external_resumes')
    os.makedirs(ext_dir, exist_ok=True)
    return ext_dir


def _generate_candidate_id():
    return f"EXT-{uuid.uuid4().hex[:8].upper()}"


@api_view(['GET', 'POST'])
@auth_required('recruiter', 'admin')
def external_jobs(request):
    user = request.current_user

    if request.method == 'GET':
        query = Job.objects.filter(is_external=True)
        if user.role == 'recruiter':
            query = query.filter(recruiter_id=user.id)
        jobs = query.order_by('-id')
        return JsonResponse([j.to_dict() for j in jobs], safe=False, status=200)

    # POST
    data = request.data or {}
    title = data.get('title')
    description = data.get('description')
    company_name = data.get('company_name')

    if not title or not description or not company_name:
        return JsonResponse({"message": "Title, description, and company name are required"}, status=400)

    strategy = (data.get('evaluation_strategy') or 'intelligent').lower()
    if strategy not in ('quick', 'intelligent'):
        return JsonResponse({"message": "evaluation_strategy must be 'quick' or 'intelligent'"}, status=400)

    try:
        exp_req = float(data.get('experience_required', 0))
    except (ValueError, TypeError):
        exp_req = 0.0

    computed_weights = auto_compute_weights(exp_req)
    skills_required = data.get('skills_required', [])
    if isinstance(skills_required, str):
        try:
            skills_required = json.loads(skills_required)
        except Exception:
            skills_required = [s.strip() for s in skills_required.split(',') if s.strip()]

    try:
        new_job = Job(
            recruiter_id=user.id,
            title=title,
            description=description,
            skills_required=json.dumps(skills_required),
            experience_required=int(round(exp_req)),
            location=data.get('location', '') or '',
            status='open',
            min_match_score=int(data.get('min_match_score', 70)),
            evaluation_type='ai' if strategy == 'intelligent' else 'keyword',
            ai_insights_enabled=True,
            evaluation_strategy=strategy,
            evaluation_weights=json.dumps(computed_weights),
            is_external=True,
            company_name=company_name,
            created_at=datetime.now(timezone.utc)
        )
        new_job.save()

        return JsonResponse({
            "message": "External job created successfully!",
            "job": new_job.to_dict()
        }, status=201)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to create job: {ex}"}, status=500)


@api_view(['GET', 'DELETE'])
@auth_required('recruiter', 'admin')
def external_job_detail_delete(request, job_id):
    user = request.current_user
    job = Job.objects.filter(id=job_id, is_external=True).first()
    if not job:
        return JsonResponse({"message": "External job not found"}, status=404)

    if user.role == 'recruiter' and job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden: you do not own this job posting"}, status=403)

    if request.method == 'GET':
        return JsonResponse(job.to_dict(), status=200)

    # DELETE
    try:
        candidates = ExternalCandidate.objects.filter(job_id=job.id)
        for c in candidates:
            if c.file_path and os.path.exists(c.file_path):
                try:
                    os.remove(c.file_path)
                except Exception:
                    pass
        candidates.delete()
        job.delete()

        return JsonResponse({"message": "External job posting and all its candidates deleted successfully!"}, status=200)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to delete job: {ex}"}, status=500)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@auth_required('recruiter', 'admin')
def upload_external_resumes(request, job_id):
    user = request.current_user
    job = Job.objects.filter(id=job_id, is_external=True).first()
    if not job:
        return JsonResponse({"message": "External job not found"}, status=404)

    if user.role == 'recruiter' and job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden: you do not own this job posting"}, status=403)

    uploaded_files = request.FILES.getlist('files') or request.FILES.getlist('file')
    if not uploaded_files:
        return JsonResponse({"message": "No files selected for uploading"}, status=400)

    ext_uploads_dir = _get_ext_uploads_dir()
    success_count = 0
    skipped_files = []
    processed_candidates = []
    files_to_process = []

    for up_file in uploaded_files:
        if up_file.size == 0:
            continue
        file_name = up_file.name

        if file_name.lower().endswith('.zip'):
            temp_zip_dir = os.path.join(ext_uploads_dir, f"temp_zip_{int(time.time() * 1000)}")
            os.makedirs(temp_zip_dir, exist_ok=True)
            zip_path = os.path.join(temp_zip_dir, os.path.basename(file_name))

            try:
                with open(zip_path, 'wb') as f:
                    for chunk in up_file.chunks():
                        f.write(chunk)

                with zipfile.ZipFile(zip_path, 'r') as zf:
                    zf.extractall(temp_zip_dir)

                for root, _, files in os.walk(temp_zip_dir):
                    for f in files:
                        b_name = os.path.basename(f)
                        if b_name.lower().endswith('.zip') or b_name.startswith('__MACOSX') or b_name.startswith('.'):
                            continue
                        _, ext = os.path.splitext(b_name)
                        if ext.lower() not in ALLOWED_EXTENSIONS:
                            skipped_files.append({"filename": b_name, "reason": "Unsupported file format"})
                            continue

                        safe_name = b_name.replace(" ", "_")
                        time_ms = int(time.time() * 1000)
                        dest_name = f"job_{job_id}_{time_ms}_{safe_name}"
                        dest_path = os.path.join(ext_uploads_dir, dest_name)
                        shutil.copyfile(os.path.join(root, f), dest_path)
                        files_to_process.append((b_name, dest_path))
            except Exception as ex:
                skipped_files.append({"filename": file_name, "reason": f"Failed to extract ZIP: {ex}"})
            finally:
                try:
                    shutil.rmtree(temp_zip_dir, ignore_errors=True)
                except Exception:
                    pass
        else:
            _, ext = os.path.splitext(file_name)
            if ext.lower() not in ALLOWED_EXTENSIONS:
                skipped_files.append({"filename": file_name, "reason": "Unsupported file format"})
                continue

            safe_name = os.path.basename(file_name).replace(" ", "_")
            time_ms = int(time.time() * 1000)
            dest_name = f"job_{job_id}_{time_ms}_{safe_name}"
            dest_path = os.path.join(ext_uploads_dir, dest_name)

            try:
                with open(dest_path, 'wb') as f:
                    for chunk in up_file.chunks():
                        f.write(chunk)
                files_to_process.append((file_name, dest_path))
            except Exception as ex:
                skipped_files.append({"filename": file_name, "reason": f"File save failed: {ex}"})

    for original_name, temp_path in files_to_process:
        try:
            parsed_data = parse_resume(temp_path)
            extracted_text = parsed_data.get("extracted_text", "")
            confidence = calculate_resume_confidence(extracted_text)

            if confidence < 30:
                try:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                except Exception:
                    pass
                skipped_files.append({
                    "filename": original_name,
                    "reason": "Document does not appear to be a valid resume"
                })
                continue

            cand_id = _generate_candidate_id()
            parsed_name = parsed_data.get("name")
            candidate_name = parsed_name if parsed_name and parsed_name.strip() else guess_name_from_text_and_filename("", original_name)

            skills = parsed_data.get("skills", [])
            projects = parsed_data.get("projects", [])
            experience_years = float(parsed_data.get("experience_years", 0.0))

            new_cand = ExternalCandidate(
                job_id=job.id,
                external_candidate_id=cand_id,
                name=candidate_name,
                email=parsed_data.get("email"),
                phone=parsed_data.get("phone"),
                file_name=original_name,
                file_path=temp_path,
                extracted_text=extracted_text,
                skills=json.dumps(skills),
                experience_years=experience_years,
                projects=json.dumps(projects),
                status="pending_evaluation",
                created_at=datetime.now(timezone.utc)
            )
            new_cand.save()
            processed_candidates.append(new_cand)
            success_count += 1
        except Exception as ex:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass
            skipped_files.append({"filename": original_name, "reason": f"Parsing failed: {ex}"})

    try:
        if success_count > 0:
            job.evaluation_status = "pending"
            job.scores_outdated = True
            job.save(update_fields=['evaluation_status', 'scores_outdated'])

        return JsonResponse({
            "message": f"Successfully uploaded and parsed {success_count} resumes!",
            "success_count": success_count,
            "skipped": skipped_files,
            "candidates": [c.to_dict() for c in processed_candidates]
        }, status=201)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to save candidates: {ex}"}, status=500)


@api_view(['GET'])
@auth_required('recruiter', 'admin')
def get_external_candidates(request, job_id):
    user = request.current_user
    job = Job.objects.filter(id=job_id, is_external=True).first()
    if not job:
        return JsonResponse({"message": "External job not found"}, status=404)

    if user.role == 'recruiter' and job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden: you do not own this job posting"}, status=403)

    candidates = ExternalCandidate.objects.filter(job_id=job.id).order_by('-final_score', 'id')
    return JsonResponse([c.to_dict() for c in candidates], safe=False, status=200)


@api_view(['POST'])
@auth_required('recruiter', 'admin')
def evaluate_external_candidates(request, job_id):
    user = request.current_user
    job = Job.objects.filter(id=job_id, is_external=True).first()
    if not job:
        return JsonResponse({"message": "External job not found"}, status=404)

    if user.role == 'recruiter' and job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden: you do not own this job posting"}, status=403)

    if job.evaluation_status == 'evaluating':
        return JsonResponse({"message": "Evaluation is already in progress for this job."}, status=409)

    prev_status = job.evaluation_status or 'pending'
    job.evaluation_status = 'evaluating'
    job.save(update_fields=['evaluation_status'])

    data = request.data or {}
    strategy = (data.get('evaluation_strategy') or job.evaluation_strategy or 'intelligent').lower()
    if strategy not in ('quick', 'intelligent'):
        job.evaluation_status = prev_status
        job.save(update_fields=['evaluation_status'])
        return JsonResponse({"message": "evaluation_strategy must be 'quick' or 'intelligent'"}, status=400)

    cand_query = ExternalCandidate.objects.filter(job_id=job.id)
    if data.get('shortlisted_only'):
        cand_query = cand_query.filter(status='shortlisted')

    candidates = list(cand_query)
    if not candidates:
        job.evaluation_status = prev_status
        job.save(update_fields=['evaluation_status'])
        return JsonResponse({"message": "No candidates to evaluate for this job."}, status=400)

    resolved_weights = auto_compute_weights(job.experience_required or 0)

    try:
        scores = []
        matched_skills_all = []
        missing_skills_all = []
        evaluated_candidates = []

        for cand in candidates:
            try:
                cand_skills = []
                if cand.skills:
                    try:
                        cand_skills = json.loads(cand.skills)
                    except Exception:
                        cand_skills = [s.strip() for s in cand.skills.split(',') if s.strip()]

                cand_projects = []
                if cand.projects:
                    try:
                        cand_projects = json.loads(cand.projects)
                    except Exception:
                        cand_projects = [cand.projects]

                if strategy == 'quick':
                    match_data = calculate_quick_score(
                        cand.extracted_text or "",
                        cand_skills,
                        cand.experience_years or 0.0,
                        job
                    )
                else:
                    match_data = calculate_match_score(
                        cand.extracted_text or "",
                        cand_skills,
                        cand_projects,
                        cand.experience_years or 0.0,
                        job,
                        eval_type="ai",
                        weights=resolved_weights
                    )

                final_score = float(match_data.get("final_score", 0.0))
                match_pct = float(match_data.get("match_percentage", 0.0))
                ai_score = float(match_data["ai_score"]) if match_data.get("ai_score") is not None else None

                cand.match_percentage = match_pct
                cand.ai_score = ai_score
                cand.final_score = final_score
                cand.evaluation_type = match_data.get("evaluation_type") or strategy
                cand.evaluation_details = json.dumps(match_data.get("details"))
                cand.status = "evaluated"
                cand.save()

                scores.append(final_score)
                details_dict = match_data.get("details") or {}
                if isinstance(details_dict, dict):
                    matched_skills_all.extend(details_dict.get("matched_skills", []))
                    missing_skills_all.extend(details_dict.get("missing_skills", []))

                evaluated_candidates.append(cand)
            except Exception as ex:
                print(f"Failed to evaluate candidate {cand.external_candidate_id}: {ex}")

        if not evaluated_candidates:
            raise Exception("All candidates failed to evaluate.")

        if strategy == 'quick':
            pool_data = generate_pool_quick_analysis(
                job, len(evaluated_candidates), scores, matched_skills_all, missing_skills_all
            )
        else:
            pool_data = generate_pool_ai_analysis(
                job, len(evaluated_candidates), scores, matched_skills_all, missing_skills_all
            )

        job.evaluation_type = 'keyword' if strategy == 'quick' else 'ai'
        job.evaluation_weights = json.dumps(resolved_weights)
        job.evaluation_status = 'evaluated'
        job.pool_analysis = json.dumps(pool_data)
        job.results_generated = False
        job.scores_outdated = False
        job.evaluated_at = datetime.now(timezone.utc)
        job.evaluated_by_id = user.id
        job.evaluation_strategy = strategy
        job.save()

        return JsonResponse({
            "message": f"Successfully evaluated {len(evaluated_candidates)} candidates!",
            "job": job.to_dict(),
            "candidates": [c.to_dict() for c in evaluated_candidates]
        }, status=200)
    except Exception as ex:
        job.evaluation_status = prev_status
        job.save(update_fields=['evaluation_status'])
        return JsonResponse({"message": f"Evaluation failed: {ex}"}, status=500)


@api_view(['POST'])
@auth_required('recruiter', 'admin')
def shortlist_external_candidates(request, job_id):
    user = request.current_user
    job = Job.objects.filter(id=job_id, is_external=True).first()
    if not job:
        return JsonResponse({"message": "External job not found"}, status=404)

    if user.role == 'recruiter' and job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden: you do not own this job posting"}, status=403)

    if job.scores_outdated or job.evaluation_status != 'evaluated':
        return JsonResponse({"message": "Please evaluate candidates before generating a shortlist."}, status=400)

    data = request.data or {}
    threshold = 70
    if data.get('threshold') is not None:
        try:
            threshold = int(data['threshold'])
        except (ValueError, TypeError):
            pass
    elif job.pool_analysis:
        try:
            pool_dict = json.loads(job.pool_analysis)
            if 'recommended_threshold' in pool_dict:
                threshold = int(pool_dict['recommended_threshold'])
        except Exception:
            pass

    max_candidates = data.get('max_candidates')
    if max_candidates is not None:
        try:
            max_candidates = int(max_candidates)
        except (ValueError, TypeError):
            max_candidates = None

    candidates = list(ExternalCandidate.objects.filter(job_id=job.id))
    if not candidates:
        return JsonResponse({"message": "No candidates found for this job."}, status=404)

    shortlisted_count = 0
    rejected_count = 0
    included_ids = data.get('included_ids')

    if included_ids and isinstance(included_ids, list):
        included_set = set(int(x) for x in included_ids)
        for cand in candidates:
            if cand.id in included_set:
                cand.status = "shortlisted"
                cand.save(update_fields=['status'])
                shortlisted_count += 1
            else:
                if cand.final_score is not None:
                    cand.status = "rejected"
                    cand.save(update_fields=['status'])
                    rejected_count += 1
    else:
        evaluated = [c for c in candidates if c.final_score is not None]
        evaluated.sort(key=lambda x: x.final_score, reverse=True)
        qualifying = [c for c in evaluated if (c.final_score or 0) >= threshold]

        if max_candidates and max_candidates > 0:
            shortlist_items = qualifying[:max_candidates]
            rejected_items = qualifying[max_candidates:] + [c for c in evaluated if (c.final_score or 0) < threshold]
        else:
            shortlist_items = qualifying
            rejected_items = [c for c in evaluated if (c.final_score or 0) < threshold]

        for cand in shortlist_items:
            cand.status = "shortlisted"
            cand.save(update_fields=['status'])
            shortlisted_count += 1

        for cand in rejected_items:
            cand.status = "rejected"
            cand.save(update_fields=['status'])
            rejected_count += 1

    job.min_match_score = threshold
    job.results_generated = True
    job.save(update_fields=['min_match_score', 'results_generated'])

    return JsonResponse({
        "message": f"Shortlist successfully generated with {shortlisted_count} candidate(s)! {rejected_count} candidate(s) marked as rejected.",
        "shortlisted_count": shortlisted_count,
        "rejected_count": rejected_count,
        "job": job.to_dict()
    }, status=200)


@api_view(['POST'])
@auth_required('recruiter', 'admin')
def update_external_candidate_status(request, candidate_id):
    user = request.current_user
    cand = ExternalCandidate.objects.filter(id=candidate_id).first()
    if not cand:
        return JsonResponse({"message": "Candidate not found"}, status=404)

    job = Job.objects.filter(id=cand.job_id).first()
    if user.role == 'recruiter' and job and job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden: you do not own this job posting"}, status=403)

    valid_statuses = {"pending_evaluation", "evaluated", "shortlisted", "interview", "selected", "hired", "rejected"}
    status = (request.data or {}).get('status')
    if not status or status not in valid_statuses:
        return JsonResponse({"message": f"Invalid status. Allowed: {', '.join(valid_statuses)}"}, status=400)

    cand.status = status
    cand.save(update_fields=['status'])

    return JsonResponse({
        "message": f"Candidate status updated to {status}!",
        "candidate": cand.to_dict()
    }, status=200)


@api_view(['GET'])
@auth_required('recruiter', 'admin')
def get_external_candidate_resume(request, candidate_id):
    user = request.current_user
    cand = ExternalCandidate.objects.filter(id=candidate_id).first()
    if not cand:
        return JsonResponse({"message": "Candidate not found"}, status=404)

    job = Job.objects.filter(id=cand.job_id).first()
    if user.role == 'recruiter' and job and job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden"}, status=403)

    resolved_path = cand.file_path
    if not resolved_path or not os.path.exists(resolved_path):
        bname = os.path.basename(resolved_path) if resolved_path else cand.file_name
        fallback = os.path.join(_get_ext_uploads_dir(), bname)
        if os.path.exists(fallback):
            resolved_path = fallback
        else:
            return JsonResponse({"message": "Resume file not found on disk"}, status=404)

    _, ext = os.path.splitext(cand.file_name)
    content_type = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
    }.get(ext.lower(), 'application/octet-stream')

    return FileResponse(open(resolved_path, 'rb'), content_type=content_type)


@api_view(['DELETE'])
@auth_required('recruiter', 'admin')
def delete_external_candidate(request, candidate_id):
    user = request.current_user
    cand = ExternalCandidate.objects.filter(id=candidate_id).first()
    if not cand:
        return JsonResponse({"message": "Candidate not found"}, status=404)

    job = Job.objects.filter(id=cand.job_id).first()
    if user.role == 'recruiter' and job and job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden"}, status=403)

    if cand.file_path and os.path.exists(cand.file_path):
        try:
            os.remove(cand.file_path)
        except Exception:
            pass

    cand.delete()
    if job:
        job.scores_outdated = True
        job.save(update_fields=['scores_outdated'])

    return JsonResponse({"message": "Candidate and resume deleted successfully!"}, status=200)


@api_view(['GET'])
@auth_required('recruiter', 'admin')
def download_shortlisted_resumes(request, job_id):
    user = request.current_user
    job = Job.objects.filter(id=job_id, is_external=True).first()
    if not job:
        return JsonResponse({"message": "External job not found"}, status=404)

    if user.role == 'recruiter' and job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden"}, status=403)

    shortlisted = list(ExternalCandidate.objects.filter(job_id=job.id, status='shortlisted'))
    if not shortlisted:
        return JsonResponse({"message": "No shortlisted candidates found for this job."}, status=400)

    mem_stream = io.BytesIO()
    with zipfile.ZipFile(mem_stream, 'w', zipfile.ZIP_DEFLATED) as zf:
        added_names = set()
        for cand in shortlisted:
            path = cand.file_path
            if not path or not os.path.exists(path):
                fallback = os.path.join(_get_ext_uploads_dir(), os.path.basename(path or cand.file_name))
                if os.path.exists(fallback):
                    path = fallback
                else:
                    continue

            file_name = cand.file_name
            if file_name.lower() in added_names:
                bname, ext = os.path.splitext(file_name)
                file_name = f"{bname}_{cand.external_candidate_id}{ext}"
            added_names.add(file_name.lower())

            zf.write(path, arcname=file_name)

        if not added_names:
            return JsonResponse({"message": "Shortlisted resumes files not found on disk."}, status=404)

    mem_stream.seek(0)
    safe_title = (job.title or "job").lower().replace(" ", "_")
    response = HttpResponse(mem_stream.getvalue(), content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="shortlisted_resumes_{safe_title}.zip"'
    return response


@api_view(['POST'])
@auth_required('recruiter', 'admin')
def send_external_shortlist_emails(request, job_id):
    user = request.current_user
    job = Job.objects.filter(id=job_id, is_external=True).first()
    if not job:
        return JsonResponse({"message": "Job not found"}, status=404)

    if user.role == 'recruiter' and job.recruiter_id != user.id:
        return JsonResponse({"message": "Access forbidden: you do not own this job posting!"}, status=403)

    recruiter = User.objects.filter(id=job.recruiter_id).first()
    company_name = recruiter.company if recruiter and recruiter.company else "ShortlistIQ"

    shortlisted = ExternalCandidate.objects.filter(job_id=job.id, status='shortlisted')
    emails_sent = 0

    for cand in shortlisted:
        if cand.email and cand.email.strip():
            try:
                send_shortlist_email(
                    cand.email.strip(),
                    cand.name or "Candidate",
                    job.title,
                    company_name,
                    cand.final_score or 0.0
                )
                emails_sent += 1
            except Exception as ex:
                print(f"Failed to send email to {cand.email}: {ex}")

    return JsonResponse({
        "message": f"Successfully sent invitation emails to {emails_sent} shortlisted candidate(s)!",
        "emails_sent": emails_sent
    }, status=200)
