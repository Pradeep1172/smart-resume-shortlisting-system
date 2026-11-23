import os
import sys
import json
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client

client = Client()

passed = 0
failed = 0

def assert_test(condition, test_name, error_detail=""):
    global passed, failed
    if condition:
        print(f"[PASS] {test_name}")
        passed += 1
    else:
        print(f"[FAIL] {test_name} - {error_detail}")
        failed += 1

print("\n" + "="*70)
print(" SHORTLISTIQ DJANGO BACKEND - FULL INTEGRATION TEST SUITE")
print("="*70 + "\n")

# 1. Health Endpoints
res = client.get('/health')
assert_test(res.status_code == 200, "GET /health status code 200", f"Got {res.status_code}")
data = res.json()
assert_test(data.get("status") == "healthy" and data.get("version") == "1.0.0", "GET /health payload correct", str(data))

res = client.get('/api/health')
assert_test(res.status_code == 200, "GET /api/health status code 200", f"Got {res.status_code}")

# 1b. Date Utils & Timezone Handling Verification
from utils.date_utils import parse_deadline, ensure_utc_aware, is_past_deadline
from datetime import datetime, timezone

dt_aware = parse_deadline("2026-11-23")
assert_test(dt_aware is not None and dt_aware.tzinfo == timezone.utc and dt_aware.hour == 23 and dt_aware.minute == 59, "parse_deadline: YYYY-MM-DD sets 23:59:59 UTC aware")

dt_custom = parse_deadline("23-11-2026")
assert_test(dt_custom is not None and dt_custom.tzinfo == timezone.utc and dt_custom.day == 23, "parse_deadline: DD-MM-YYYY parsed correctly")

dt_iso = parse_deadline("2026-11-23T15:30:00Z")
assert_test(dt_iso is not None and dt_iso.tzinfo == timezone.utc and dt_iso.hour == 15, "parse_deadline: ISO 8601 with Z parsed to UTC")

dt_past = parse_deadline("2020-01-01")
assert_test(is_past_deadline(dt_past) is True, "is_past_deadline: past date returns True")

dt_future = parse_deadline("2035-01-01")
assert_test(is_past_deadline(dt_future) is False, "is_past_deadline: future date returns False")

# 2. RBAC Tests (Unauthenticated & Forbidden)
res = client.get('/api/admin/dashboard')
assert_test(res.status_code == 401, "RBAC: Unauthenticated GET /api/admin/dashboard returns 401", f"Got {res.status_code}")

# 3. Candidate Flow
res = client.post('/api/auth/login', data=json.dumps({"email": "john@candidate.com", "password": "password123"}), content_type="application/json")
assert_test(res.status_code == 200, "Candidate Login POST /api/auth/login", f"Got {res.status_code}")
cand_data = res.json()
cand_token = cand_data.get("token")
assert_test(bool(cand_token), "Candidate received valid JWT token", str(cand_data))

cand_headers = {"HTTP_AUTHORIZATION": f"Bearer {cand_token}"}

# Candidate RBAC block on admin endpoint
res = client.get('/api/admin/dashboard', **cand_headers)
assert_test(res.status_code == 403, "RBAC: Candidate accessing /api/admin/dashboard blocked with 403", f"Got {res.status_code}")

# Candidate /me
res = client.get('/api/auth/me', **cand_headers)
cand_user = res.json().get("user", {})
assert_test(res.status_code == 200 and cand_user.get("email") == "john@candidate.com", "Candidate GET /api/auth/me", str(res.json()))

# Candidate Profile
res = client.get('/api/profile', **cand_headers)
assert_test(res.status_code == 200, "Candidate GET /api/profile", f"Got {res.status_code}")

# Candidate Resumes
res = client.get('/api/resumes', **cand_headers)
assert_test(res.status_code == 200 and isinstance(res.json(), list), "Candidate GET /api/resumes", f"Got {res.status_code}")
resumes_list = res.json()
cand_resume_id = resumes_list[0]["id"] if resumes_list else None

# Candidate Dashboard Insights
res = client.get('/api/resumes/dashboard-insights', **cand_headers)
assert_test(res.status_code == 200 and "profile_score" in res.json(), "Candidate GET /api/resumes/dashboard-insights", str(res.json()))

# Candidate Notifications
res = client.get('/api/notifications', **cand_headers)
assert_test(res.status_code == 200 and isinstance(res.json(), list), "Candidate GET /api/notifications", f"Got {res.status_code}")

# 4. Recruiter Flow
res = client.post('/api/auth/login', data=json.dumps({"email": "jane@recruiter.com", "password": "password123"}), content_type="application/json")
assert_test(res.status_code == 200, "Recruiter Login POST /api/auth/login", f"Got {res.status_code}")
rec_data = res.json()
rec_token = rec_data.get("token")
assert_test(bool(rec_token), "Recruiter received valid JWT token", str(rec_data))

rec_headers = {"HTTP_AUTHORIZATION": f"Bearer {rec_token}"}

# Recruiter Dashboard
res = client.get('/api/recruiter/dashboard', **rec_headers)
assert_test(res.status_code == 200 and "metrics" in res.json(), "Recruiter GET /api/recruiter/dashboard", str(res.json())[:100])

# Recruiter Settings
res = client.get('/api/recruiter/settings', **rec_headers)
assert_test(res.status_code == 200, "Recruiter GET /api/recruiter/settings", f"Got {res.status_code}")

# Recruiter Jobs
res = client.get('/api/jobs', **rec_headers)
assert_test(res.status_code == 200 and isinstance(res.json(), list), "Recruiter GET /api/jobs", f"Count: {len(res.json())}")

# Recruiter External Jobs
res = client.get('/api/external-hiring/jobs', **rec_headers)
assert_test(res.status_code == 200 and isinstance(res.json(), list), "Recruiter GET /api/external-hiring/jobs", f"Count: {len(res.json())}")

# 5. Recruitment Pipeline & Evaluation Flow
# 5a. Recruiter creates a test job with date-only deadline (verifying timezone-aware datetime fix)
job_payload = {
    "title": "Django Senior Backend Engineer",
    "description": "Looking for an expert in Python, Django, REST API, MySQL, and Docker to build AI-powered ATS systems.",
    "skills_required": ["Python", "Django", "MySQL", "REST API", "Docker"],
    "experience_required": 4,
    "location": "Remote",
    "deadline": "2026-11-23",
    "min_match_score": 70,
    "evaluation_type": "keyword"
}
res = client.post('/api/jobs', data=json.dumps(job_payload), content_type="application/json", **rec_headers)
assert_test(res.status_code == 201, "Recruiter POST /api/jobs with date-only deadline '2026-11-23'", f"Got {res.status_code} - {res.content.decode()}")
created_job = res.json().get("job", {})
test_job_id = created_job.get("id")
assert_test(bool(test_job_id), "Created job has valid ID", str(created_job))
assert_test(created_job.get("status") == "open", "Created job status is 'open'", str(created_job))
assert_test(created_job.get("deadline") is not None and "2026-11-23" in created_job.get("deadline"), "Created job deadline correctly preserved in UTC", str(created_job.get("deadline")))

# 5a-2. Recruiter creates an expired job (past deadline) to test automatic status expiry
expired_payload = {
    "title": "Expired Job Role",
    "description": "This job had a deadline in the past.",
    "skills_required": ["Legacy"],
    "experience_required": 1,
    "location": "On-site",
    "deadline": "2020-01-01",
    "min_match_score": 50,
    "evaluation_type": "keyword"
}
res_exp = client.post('/api/jobs', data=json.dumps(expired_payload), content_type="application/json", **rec_headers)
assert_test(res_exp.status_code == 201, "Recruiter POST /api/jobs with past deadline '2020-01-01'", f"Got {res_exp.status_code}")
exp_job = res_exp.json().get("job", {})
exp_job_id = exp_job.get("id")
assert_test(exp_job.get("status") == "expired", "Past deadline job correctly marked 'expired'", str(exp_job))

# Test that candidate CANNOT apply to expired job
if exp_job_id and cand_resume_id:
    exp_apply_res = client.post('/api/applications', data=json.dumps({"job_id": exp_job_id, "resume_id": cand_resume_id}), content_type="application/json", **cand_headers)
    assert_test(exp_apply_res.status_code == 400, "Candidate applying to expired job blocked with 400", f"Got {exp_apply_res.status_code}")
    # Clean up expired job
    client.delete(f'/api/jobs/{exp_job_id}', **rec_headers)

# 5b. Candidate applies to the new job
if test_job_id and cand_resume_id:
    app_payload = {
        "job_id": test_job_id,
        "resume_id": cand_resume_id
    }
    res = client.post('/api/applications', data=json.dumps(app_payload), content_type="application/json", **cand_headers)
    assert_test(res.status_code == 201, "Candidate POST /api/applications (Job Application)", f"Got {res.status_code} - {res.content.decode()}")
    created_app = res.json().get("application", {})
    test_app_id = created_app.get("id")
    assert_test(bool(test_app_id), "Application created successfully with valid ID", str(created_app))

    # Candidate view applications - check privacy: candidates must NOT see internal scores
    res = client.get('/api/applications', **cand_headers)
    assert_test(res.status_code == 200, "Candidate GET /api/applications", f"Got {res.status_code}")
    cand_apps = res.json()
    our_cand_app = next((a for a in cand_apps if a.get("id") == test_app_id), None)
    assert_test(bool(our_cand_app), "Application appears in candidate's application list")
    # Verify candidate privacy:
    assert_test("score" not in (our_cand_app or {}) and "final_score" not in (our_cand_app or {}), "Candidate Privacy: Internal matching score is hidden from candidate", str(our_cand_app))

    # 5c. Recruiter evaluates the job
    res = client.post(f'/api/jobs/{test_job_id}/evaluate', data=json.dumps({"evaluation_type": "keyword"}), content_type="application/json", **rec_headers)
    assert_test(res.status_code == 200, "Recruiter POST /api/jobs/{id}/evaluate (Evaluation Engine)", f"Got {res.status_code} - {res.content.decode()}")

    # 5d. Recruiter checks application details with score breakdown
    res = client.get(f'/api/applications/{test_app_id}', **rec_headers)
    assert_test(res.status_code == 200, "Recruiter GET /api/applications/{id}", f"Got {res.status_code}")
    app_detail = res.json()
    assert_test("score" in app_detail or "match_score" in app_detail, "Recruiter can see candidate evaluation score breakdown", str(app_detail))

    # 5e. Pipeline Status Progression: applied -> shortlisted -> interview -> selected -> hired
    pipeline_stages = ["shortlisted", "interview", "selected", "hired"]
    for stage in pipeline_stages:
        res = client.put(f'/api/applications/{test_app_id}/status', data=json.dumps({"status": stage}), content_type="application/json", **rec_headers)
        assert_test(res.status_code == 200 and res.json().get("application", {}).get("status") == stage, f"Pipeline progression to '{stage}'", f"Got {res.status_code}")

    # 5f. Clean up test job & application so DB remains clean
    res = client.delete(f'/api/jobs/{test_job_id}', **rec_headers)
    assert_test(res.status_code == 200, "Clean up: DELETE /api/jobs/{test_job_id}", f"Got {res.status_code}")

# 6. Admin Flow
res = client.post('/api/auth/login', data=json.dumps({"email": "admin@site.com", "password": "password123"}), content_type="application/json")
assert_test(res.status_code == 200, "Admin Login POST /api/auth/login", f"Got {res.status_code}")
admin_data = res.json()
admin_token = admin_data.get("token")
assert_test(bool(admin_token), "Admin received valid JWT token", str(admin_data))

admin_headers = {"HTTP_AUTHORIZATION": f"Bearer {admin_token}"}

# Admin Dashboard
res = client.get('/api/admin/dashboard', **admin_headers)
assert_test(res.status_code == 200 and "metrics" in res.json(), "Admin GET /api/admin/dashboard", str(res.json())[:100])

# Admin Users List
res = client.get('/api/admin/users', **admin_headers)
assert_test(res.status_code == 200 and isinstance(res.json(), list) and len(res.json()) >= 1, "Admin GET /api/admin/users", f"Count: {len(res.json())}")

# Admin Config
res = client.get('/api/admin/config', **admin_headers)
assert_test(res.status_code == 200 and "DEFAULT_WEIGHTS" in res.json(), "Admin GET /api/admin/config", str(res.json())[:100])

# Admin Logs
res = client.get('/api/admin/logs', **admin_headers)
assert_test(res.status_code == 200 and isinstance(res.json(), list), "Admin GET /api/admin/logs", f"Count: {len(res.json())}")

# Admin Analytics
res = client.get('/api/admin/analytics', **admin_headers)
assert_test(res.status_code == 200 and "monthly_applications" in res.json(), "Admin GET /api/admin/analytics", str(res.json())[:100])

# Admin Exports
for exp_type in ['recruiters', 'candidates', 'jobs', 'applications', 'hiring-report', 'recruiter-report']:
    res = client.get(f'/api/admin/export/{exp_type}', **admin_headers)
    assert_test(res.status_code == 200 and isinstance(res.json(), list), f"Admin GET /api/admin/export/{exp_type}", f"Got {res.status_code}")

print("\n" + "="*70)
print(f" TOTAL TESTS: {passed + failed} | PASSED: {passed} | FAILED: {failed}")
print("="*70 + "\n")

if failed > 0:
    sys.exit(1)
