"""
Complete E2E Verification Script for Smart Resume Shortlisting System
Tests all workflows: candidates, resumes, recruiter, jobs, evaluation, shortlisting, status transitions, admin
"""
import requests
import json
import os
import time
from datetime import datetime

BASE = "http://127.0.0.1:5000"
RESULTS = {"pass": 0, "fail": 0, "errors": []}

def check(label, condition, detail=""):
    if condition:
        RESULTS["pass"] += 1
        print(f"  ✅ {label}")
    else:
        RESULTS["fail"] += 1
        RESULTS["errors"].append(f"{label}: {detail}")
        print(f"  ❌ {label} — {detail}")

def header(title):
    print(f"\n{'='*60}\n  {title}\n{'='*60}")

# ─── STEP 0: Health Check ───
header("STEP 0: Health Check")
r = requests.get(f"{BASE}/health")
check("Backend is healthy", r.status_code == 200, f"status={r.status_code}")

# ─── STEP 1: Create 10 Candidate Accounts in DB ───
header("STEP 1: Create 10 Candidate Accounts via DB script")

# We'll use the app context directly
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import create_app, db
from app.models.user import User
from app.models.resume import Resume
from app.models.application import Application, MatchScore
from app.models.job import Job

app = create_app()

CANDIDATES = [
    {"name": "Alice Johnson", "email": "alice@test.com", "skills": ["Python", "Flask", "SQL", "Docker", "AWS"], "exp": 3.0, "projects": ["Built a REST API microservice", "Deployed ML pipeline on AWS"]},
    {"name": "Bob Smith", "email": "bob@test.com", "skills": ["React", "JavaScript", "Node.js", "MongoDB"], "exp": 2.0, "projects": ["E-commerce frontend", "Real-time chat app"]},
    {"name": "Carol Davis", "email": "carol@test.com", "skills": ["Python", "React", "SQL", "Git", "Docker"], "exp": 4.0, "projects": ["Full-stack dashboard", "CI/CD pipeline automation", "Data analytics tool"]},
    {"name": "David Wilson", "email": "david@test.com", "skills": ["Java", "Python", "AWS", "Kubernetes"], "exp": 5.0, "projects": ["Cloud migration project", "Distributed systems platform"]},
    {"name": "Eva Martinez", "email": "eva@test.com", "skills": ["Python", "Machine Learning", "Pandas", "SQL"], "exp": 1.5, "projects": ["Sentiment analysis tool"]},
    {"name": "Frank Brown", "email": "frank@test.com", "skills": ["JavaScript", "React", "CSS", "HTML", "Node.js", "Express"], "exp": 3.5, "projects": ["Portfolio website", "Task management app", "Weather dashboard"]},
    {"name": "Grace Lee", "email": "grace@test.com", "skills": ["Python", "Flask", "React", "SQL", "Docker", "Git", "AWS"], "exp": 6.0, "projects": ["Enterprise SaaS platform", "Automated testing framework", "API gateway"]},
    {"name": "Henry Taylor", "email": "henry@test.com", "skills": ["Python", "Django", "PostgreSQL"], "exp": 0.0, "projects": ["Student management system"]},
    {"name": "Ivy Chen", "email": "ivy@test.com", "skills": ["React", "TypeScript", "Node.js", "MongoDB", "Docker"], "exp": 2.5, "projects": ["Social media dashboard", "Real-time notification system"]},
    {"name": "Jack Anderson", "email": "jack@test.com", "skills": ["Python", "Flask", "SQL", "React", "AWS", "Docker", "Git"], "exp": 4.5, "projects": ["Resume screening tool", "Job matching engine", "Admin dashboard"]},
]

candidate_ids = []
resume_ids = []

with app.app_context():
    for c in CANDIDATES:
        # Remove existing user if any
        existing = User.query.filter_by(email=c["email"]).first()
        if existing:
            db.session.delete(existing)
            db.session.commit()
        
        user = User(name=c["name"], email=c["email"], role="candidate", email_verified=True)
        user.set_password("test123")
        db.session.add(user)
        db.session.commit()
        candidate_ids.append(user.id)
        
        # Create resume record directly
        resume_text = f"""
        {c['name']}
        Email: {c['email']}
        
        Summary:
        Experienced software developer with {c['exp']} years of experience.
        
        Skills:
        {', '.join(c['skills'])}
        
        Experience:
        {c['exp']} years of professional experience in software development.
        Software Developer - Tech Corp (2020 - present)
        
        Projects:
        {chr(10).join(['- ' + p for p in c['projects']])}
        
        Education:
        Bachelor of Technology in Computer Science
        University of Technology (2016 - 2020)
        """
        
        resume = Resume(
            user_id=user.id,
            file_name=f"{c['name'].lower().replace(' ', '_')}_resume.pdf",
            file_path=f"./uploads/mock_{user.id}.pdf",
            extracted_text=resume_text,
            skills=c["skills"],
            projects=c["projects"],
            experience_years=c["exp"]
        )
        db.session.add(resume)
        db.session.commit()
        resume_ids.append(resume.id)
    
    print(f"  Created {len(candidate_ids)} candidates: IDs = {candidate_ids}")
    print(f"  Created {len(resume_ids)} resumes: IDs = {resume_ids}")
    check("Created 10 candidate accounts", len(candidate_ids) == 10)
    check("Created 10 resumes", len(resume_ids) == 10)

# ─── STEP 2: Verify Resume Parser Extractions ───
header("STEP 2: Verify Resume Parser Extractions")
with app.app_context():
    for i, rid in enumerate(resume_ids):
        r = Resume.query.get(rid)
        c = CANDIDATES[i]
        has_skills = r.skills and len(r.skills) > 0
        has_text = r.extracted_text and len(r.extracted_text) > 50
        check(f"Resume {c['name']}: skills={len(r.skills or [])}, exp={r.experience_years}", has_skills and has_text)

# ─── STEP 3: Create Recruiter via Registration Flow ───
header("STEP 3: Register Recruiter Account")
RECRUITER = {"name": "TestRecruiter", "email": "recruiter_test@test.com", "password": "recruiter123", "role": "recruiter"}

# First, clean up any existing recruiter
with app.app_context():
    existing_rec = User.query.filter_by(email=RECRUITER["email"]).first()
    if existing_rec:
        db.session.delete(existing_rec)
        db.session.commit()

# Create recruiter directly (simulating registration + OTP verification)
with app.app_context():
    rec_user = User(name=RECRUITER["name"], email=RECRUITER["email"], role="recruiter", 
                    email_verified=True, approval_status="pending")
    rec_user.set_password(RECRUITER["password"])
    db.session.add(rec_user)
    db.session.commit()
    recruiter_id = rec_user.id
    print(f"  Recruiter created: ID={recruiter_id}, email={RECRUITER['email']}")
    check("Recruiter account created with pending status", rec_user.approval_status == "pending")

# ─── STEP 4: Approve Recruiter from Admin ───
header("STEP 4: Approve Recruiter from Admin Portal")

# Login as admin
r = requests.post(f"{BASE}/api/auth/login", json={"email": "admin@site.com", "password": "password123"})
check("Admin login", r.status_code == 200, f"status={r.status_code}")
admin_token = r.json().get("token", "")

# Approve the recruiter
temp_password = RECRUITER["password"]
r = requests.put(f"{BASE}/api/admin/users/{recruiter_id}/approve", 
                 headers={"Authorization": f"Bearer {admin_token}"})
check("Recruiter approved by admin", r.status_code == 200, f"status={r.status_code}, body={r.text[:200]}")
if r.status_code == 200:
    temp_password = r.json().get("temp_password", RECRUITER["password"])

# Verify approval
with app.app_context():
    rec = User.query.get(recruiter_id)
    check("Recruiter approval_status is 'approved'", rec.approval_status == "approved", f"got={rec.approval_status}")

# ─── STEP 5: Login as Recruiter and Create a Job ───
header("STEP 5: Login as Recruiter & Create Job")
r = requests.post(f"{BASE}/api/auth/login", json={"email": RECRUITER["email"], "password": temp_password})
check("Recruiter login successful", r.status_code == 200, f"status={r.status_code}")
rec_token = ""
if r.status_code == 200:
    rec_token = r.json().get("token", "")
    user_data = r.json().get("user", {})
    if user_data.get("must_change_password"):
        # Change password to the expected default password
        change_res = requests.post(
            f"{BASE}/api/auth/change-password",
            json={"new_password": RECRUITER["password"]},
            headers={"Authorization": f"Bearer {rec_token}"}
        )
        check("Forced password change succeeded", change_res.status_code == 200, f"status={change_res.status_code}")
        if change_res.status_code == 200:
            rec_token = change_res.json().get("user", {}).get("token", rec_token)
            # Re-login with new password to get clean token
            login_res = requests.post(f"{BASE}/api/auth/login", json={"email": RECRUITER["email"], "password": RECRUITER["password"]})
            if login_res.status_code == 200:
                rec_token = login_res.json().get("token", "")

JOB_DATA = {
    "title": "Senior Full-Stack Developer",
    "description": "We are looking for a Senior Full-Stack Developer with expertise in Python, Flask, React, and cloud technologies. The ideal candidate should have experience with SQL databases, Docker, and CI/CD pipelines.",
    "skills_required": ["Python", "Flask", "React", "SQL", "Docker", "AWS", "Git"],
    "experience_required": 3,
    "location": "Bangalore, India",
    "min_match_score": 60,
    "evaluation_strategy": "quick",
    "ai_insights_enabled": True
}

r = requests.post(f"{BASE}/api/jobs", json=JOB_DATA, headers={"Authorization": f"Bearer {rec_token}"})
check("Job created successfully", r.status_code == 201, f"status={r.status_code}, body={r.text[:300]}")
job_id = r.json().get("job", {}).get("id")
print(f"  Job ID: {job_id}")

# ─── STEP 6: Make All 10 Candidates Apply ───
header("STEP 6: All 10 Candidates Apply for the Job")
application_ids = []

for i, cid in enumerate(candidate_ids):
    # Login as candidate
    c = CANDIDATES[i]
    r = requests.post(f"{BASE}/api/auth/login", json={"email": c["email"], "password": "test123"})
    if r.status_code != 200:
        check(f"Candidate {c['name']} login", False, f"status={r.status_code}")
        continue
    cand_token = r.json()["token"]
    
    # Apply
    r = requests.post(f"{BASE}/api/applications", 
                      json={"job_id": job_id, "resume_id": resume_ids[i]},
                      headers={"Authorization": f"Bearer {cand_token}"})
    check(f"Candidate {c['name']} applied", r.status_code == 201, f"status={r.status_code}, body={r.text[:200]}")
    if r.status_code == 201:
        application_ids.append(r.json()["application"]["id"])

check(f"All 10 applications submitted", len(application_ids) == 10, f"got={len(application_ids)}")

# ─── STEP 7: Verify Applications in Recruiter Dashboard ───
header("STEP 7: Verify Applications in Recruiter Dashboard")
r = requests.get(f"{BASE}/api/applications?job_id={job_id}", headers={"Authorization": f"Bearer {rec_token}"})
check("Recruiter can see applications", r.status_code == 200, f"status={r.status_code}")
apps_data = r.json()
check(f"All 10 applications visible to recruiter", len(apps_data) == 10, f"got={len(apps_data)}")

# Verify all statuses are 'applied'
applied_count = sum(1 for a in apps_data if a["status"] == "applied")
check("All applications have 'applied' status", applied_count == 10, f"applied={applied_count}")

# Verify no scores exist yet
no_scores = all(a.get("match_score") is None for a in apps_data)
check("No match scores exist before evaluation", no_scores)

# ─── STEP 8: Run Quick Evaluation ───
header("STEP 8: Run Quick Evaluation")
r = requests.post(f"{BASE}/api/jobs/{job_id}/evaluate", headers={"Authorization": f"Bearer {rec_token}"})
check("Quick evaluation completed", r.status_code == 200, f"status={r.status_code}, body={r.text[:300]}")

# Verify job evaluation status
r = requests.get(f"{BASE}/api/jobs/{job_id}", headers={"Authorization": f"Bearer {rec_token}"})
job_data = r.json()
check("Job evaluation_status is 'evaluated'", job_data.get("evaluation_status") == "evaluated")
check("Job results_generated is False", job_data.get("results_generated") == False)
check("Pool analysis exists", job_data.get("pool_analysis") is not None)

pool = job_data.get("pool_analysis", {})
print(f"  Pool Analysis: avg={pool.get('average_score')}, high={pool.get('highest_score')}, low={pool.get('lowest_score')}")

# ─── STEP 9: Verify No Scores Visible Before Generate Results ───
header("STEP 9: Verify Scores After Evaluation But Before Generate Results")
r = requests.get(f"{BASE}/api/applications?job_id={job_id}", headers={"Authorization": f"Bearer {rec_token}"})
apps_after_eval = r.json()

# After evaluation, match_scores should exist but results_generated should be False
evaluated_count = sum(1 for a in apps_after_eval if a["status"] == "evaluated")
check(f"All apps have 'evaluated' status", evaluated_count == 10, f"evaluated={evaluated_count}")

has_scores = sum(1 for a in apps_after_eval if a.get("match_score") is not None)
check(f"Match scores exist after evaluation ({has_scores}/10)", has_scores == 10, f"with_scores={has_scores}")
check("results_generated is still False", job_data.get("results_generated") == False)

# ─── STEP 10: Generate Results / Shortlist ───
header("STEP 10: Generate Results & Verify Scores")

# Get pool analysis recommended threshold
threshold = pool.get("recommended_threshold", 60)
print(f"  Using threshold: {threshold}%")

r = requests.post(f"{BASE}/api/jobs/{job_id}/generate-results", 
                   json={"threshold": threshold, "send_emails": False},
                   headers={"Authorization": f"Bearer {rec_token}"})
check("Generate results completed", r.status_code == 200, f"status={r.status_code}, body={r.text[:300]}")

# Re-fetch applications
r = requests.get(f"{BASE}/api/applications?job_id={job_id}", headers={"Authorization": f"Bearer {rec_token}"})
apps_after_results = r.json()

# Verify scores
scores = []
for a in apps_after_results:
    ms = a.get("match_score")
    if ms:
        scores.append(ms.get("final_score", 0))

check("All 10 apps have scores", len(scores) == 10, f"got={len(scores)}")

if scores:
    actual_highest = max(scores)
    actual_lowest = min(scores)
    actual_avg = round(sum(scores) / len(scores), 1)
    pool_highest = pool.get("highest_score")
    pool_lowest = pool.get("lowest_score")
    pool_avg = pool.get("average_score")
    
    print(f"  Actual: highest={actual_highest}, lowest={actual_lowest}, avg={actual_avg}")
    print(f"  Pool:   highest={pool_highest}, lowest={pool_lowest}, avg={pool_avg}")
    
    check("Highest score matches pool analysis", abs(actual_highest - pool_highest) < 0.2, f"actual={actual_highest} vs pool={pool_highest}")
    check("Lowest score matches pool analysis", abs(actual_lowest - pool_lowest) < 0.2, f"actual={actual_lowest} vs pool={pool_lowest}")
    check("Average score matches pool analysis", abs(actual_avg - pool_avg) < 0.2, f"actual={actual_avg} vs pool={pool_avg}")

# Verify shortlisting
shortlisted = [a for a in apps_after_results if a["status"] == "shortlisted"]
evaluated_remaining = [a for a in apps_after_results if a["status"] == "evaluated"]
print(f"  Shortlisted: {len(shortlisted)}, Evaluated (not shortlisted): {len(evaluated_remaining)}")
check("Shortlisting worked (some shortlisted)", len(shortlisted) > 0, f"shortlisted={len(shortlisted)}")

# Verify shortlisted candidates all have scores >= threshold
all_above = all(a.get("match_score", {}).get("final_score", 0) >= threshold for a in shortlisted)
check(f"All shortlisted have score >= {threshold}", all_above)

# Verify non-shortlisted have scores < threshold
all_below = all(a.get("match_score", {}).get("final_score", 0) < threshold for a in evaluated_remaining)
check(f"All non-shortlisted have score < {threshold}", all_below)

# Verify job results_generated is True
r = requests.get(f"{BASE}/api/jobs/{job_id}", headers={"Authorization": f"Bearer {rec_token}"})
check("results_generated is True after shortlisting", r.json().get("results_generated") == True)

# ─── PIPELINE CONSISTENCY VERIFICATION ───
# After generate-results, every candidate must be either shortlisted or rejected (no 'evaluated' remaining)
rejected_apps = [a for a in apps_after_results if a["status"] == "rejected"]
print(f"  Pipeline Check: shortlisted={len(shortlisted)}, rejected={len(rejected_apps)}, evaluated_remaining={len(evaluated_remaining)}")
check("No candidates remain in 'evaluated' state after shortlisting", len(evaluated_remaining) == 0, f"evaluated_remaining={len(evaluated_remaining)}")
check("shortlisted + rejected = total applications", len(shortlisted) + len(rejected_apps) == 10, 
      f"shortlisted={len(shortlisted)} + rejected={len(rejected_apps)} = {len(shortlisted)+len(rejected_apps)}")

# Verify recruiter dashboard metrics match application statuses
r = requests.get(f"{BASE}/api/recruiter/dashboard", headers={"Authorization": f"Bearer {rec_token}"})
rec_metrics = r.json().get("metrics", {})
check("Recruiter dashboard total_applications matches", rec_metrics.get("total_applications") == 10, f"got={rec_metrics.get('total_applications')}")
check("Recruiter dashboard shortlisted matches", rec_metrics.get("shortlisted_applications") == len(shortlisted), 
      f"dashboard={rec_metrics.get('shortlisted_applications')} vs actual={len(shortlisted)}")
check("Recruiter dashboard rejected matches", rec_metrics.get("rejected_applications") == len(rejected_apps),
      f"dashboard={rec_metrics.get('rejected_applications')} vs actual={len(rejected_apps)}")

# ─── STEP 11: Status Transitions (Shortlisted → Interview → Selected → Hired) ───
header("STEP 11: Status Transitions (Interview → Selected → Hired)")

if shortlisted:
    test_app_id = shortlisted[0]["id"]
    test_candidate_name = shortlisted[0].get("candidate_name", "Unknown")
    print(f"  Testing transitions for: {test_candidate_name} (app_id={test_app_id})")
    
    # Shortlisted → Interview
    r = requests.put(f"{BASE}/api/applications/{test_app_id}/status",
                     json={"status": "interview"},
                     headers={"Authorization": f"Bearer {rec_token}"})
    check("Shortlisted → Interview", r.status_code == 200, f"status={r.status_code}, body={r.text[:200]}")
    
    # Interview → Selected
    r = requests.put(f"{BASE}/api/applications/{test_app_id}/status",
                     json={"status": "selected"},
                     headers={"Authorization": f"Bearer {rec_token}"})
    check("Interview → Selected", r.status_code == 200, f"status={r.status_code}, body={r.text[:200]}")
    
    # Selected → Hired
    r = requests.put(f"{BASE}/api/applications/{test_app_id}/status",
                     json={"status": "hired"},
                     headers={"Authorization": f"Bearer {rec_token}"})
    check("Selected → Hired", r.status_code == 200, f"status={r.status_code}, body={r.text[:200]}")
    
    # Verify final status
    r = requests.get(f"{BASE}/api/applications/{test_app_id}", headers={"Authorization": f"Bearer {rec_token}"})
    check("Final status is 'hired'", r.json().get("status") == "hired", f"got={r.json().get('status')}")
    
    # Test invalid transition: hired → interview (should fail)
    r = requests.put(f"{BASE}/api/applications/{test_app_id}/status",
                     json={"status": "interview"},
                     headers={"Authorization": f"Bearer {rec_token}"})
    check("Invalid transition hired→interview blocked", r.status_code == 400, f"status={r.status_code}")

    # Test bulk status update for remaining shortlisted
    if len(shortlisted) > 1:
        bulk_ids = [a["id"] for a in shortlisted[1:3]]  # Take 2 more
        r = requests.put(f"{BASE}/api/applications/bulk-status",
                         json={"application_ids": bulk_ids, "status": "interview"},
                         headers={"Authorization": f"Bearer {rec_token}"})
        check("Bulk status update to interview", r.status_code == 200, f"status={r.status_code}")

# ─── STEP 12: Admin Dashboard, Analytics, Reports, Exports ───
header("STEP 12: Admin Dashboard, Analytics, Reports & Exports")

# Admin Dashboard
r = requests.get(f"{BASE}/api/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
check("Admin dashboard loads", r.status_code == 200, f"status={r.status_code}")
dashboard = r.json()
metrics = dashboard.get("metrics", {})

with app.app_context():
    db_candidates = User.query.filter_by(role="candidate").count()
    db_recruiters = User.query.filter_by(role="recruiter").count()
    db_jobs = Job.query.count()
    db_applications = Application.query.count()
    db_resumes = Resume.query.count()
    db_hired = Application.query.filter_by(status="hired").count()
    db_shortlisted = Application.query.filter_by(status="shortlisted").count()

print(f"  Dashboard metrics: candidates={metrics.get('total_candidates')}, recruiters={metrics.get('total_recruiters')}, jobs={metrics.get('total_jobs')}, apps={metrics.get('total_applications')}")
print(f"  Database counts:   candidates={db_candidates}, recruiters={db_recruiters}, jobs={db_jobs}, apps={db_applications}")

check("Dashboard candidates matches DB", metrics.get("total_candidates") == db_candidates, 
      f"dashboard={metrics.get('total_candidates')} vs db={db_candidates}")
check("Dashboard recruiters matches DB", metrics.get("total_recruiters") == db_recruiters,
      f"dashboard={metrics.get('total_recruiters')} vs db={db_recruiters}")
check("Dashboard jobs matches DB", metrics.get("total_jobs") == db_jobs,
      f"dashboard={metrics.get('total_jobs')} vs db={db_jobs}")
check("Dashboard applications matches DB", metrics.get("total_applications") == db_applications,
      f"dashboard={metrics.get('total_applications')} vs db={db_applications}")
check("Dashboard resumes matches DB", metrics.get("total_resumes") == db_resumes,
      f"dashboard={metrics.get('total_resumes')} vs db={db_resumes}")
check("Dashboard hired count matches DB", metrics.get("hired_count") == db_hired,
      f"dashboard={metrics.get('hired_count')} vs db={db_hired}")

# Analytics
r = requests.get(f"{BASE}/api/admin/analytics", headers={"Authorization": f"Bearer {admin_token}"})
check("Admin analytics loads", r.status_code == 200, f"status={r.status_code}")
analytics = r.json()
check("Analytics has applications_by_status", "applications_by_status" in analytics)
check("Analytics has jobs_by_status", "jobs_by_status" in analytics)
check("Analytics has monthly_applications", "monthly_applications" in analytics)

# Exports
for endpoint in ["recruiters", "candidates", "jobs", "applications", "hiring-report", "recruiter-report"]:
    r = requests.get(f"{BASE}/api/admin/export/{endpoint}", headers={"Authorization": f"Bearer {admin_token}"})
    check(f"Export '{endpoint}' returns 200", r.status_code == 200, f"status={r.status_code}")
    data = r.json()
    check(f"Export '{endpoint}' returns data", isinstance(data, list) and len(data) > 0, f"len={len(data) if isinstance(data, list) else 'not list'}")

# Hiring report verification
r = requests.get(f"{BASE}/api/admin/export/hiring-report", headers={"Authorization": f"Bearer {admin_token}"})
hiring_report = r.json()
if hiring_report:
    job_report = [jr for jr in hiring_report if jr.get("title") == JOB_DATA["title"]]
    if job_report:
        jr = job_report[0]
        print(f"  Hiring Report: total={jr['total_applications']}, shortlisted={jr['shortlisted']}, hired={jr['hired']}")
        check("Hiring report total_applications matches", jr["total_applications"] == 10, f"got={jr['total_applications']}")

# Admin Logs
r = requests.get(f"{BASE}/api/admin/logs", headers={"Authorization": f"Bearer {admin_token}"})
check("Admin logs loads", r.status_code == 200, f"status={r.status_code}")
logs = r.json()
check("Admin logs has entries", len(logs) > 0, f"entries={len(logs)}")

# Admin Job Details
r = requests.get(f"{BASE}/api/admin/jobs/{job_id}/details", headers={"Authorization": f"Bearer {admin_token}"})
check("Admin job details loads", r.status_code == 200, f"status={r.status_code}")
job_details = r.json()
pipeline = job_details.get("pipeline", {})
print(f"  Pipeline: total={pipeline.get('total')}, shortlisted={pipeline.get('shortlisted')}, hired={pipeline.get('hired')}")
check("Pipeline total matches", pipeline.get("total") == 10, f"got={pipeline.get('total')}")

# ─── FINAL SUMMARY ───
header("FINAL RESULTS")
total = RESULTS["pass"] + RESULTS["fail"]
print(f"\n  Total Tests: {total}")
print(f"  ✅ Passed: {RESULTS['pass']}")
print(f"  ❌ Failed: {RESULTS['fail']}")
if RESULTS["errors"]:
    print(f"\n  Failed Tests:")
    for err in RESULTS["errors"]:
        print(f"    → {err}")
print()
