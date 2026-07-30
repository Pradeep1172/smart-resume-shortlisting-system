import requests
import os
import json
import time

def get_user_otp_from_db(email):
    from app import create_app
    from app.models.user import User
    app = create_app()
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        return user.otp_code if user else None

BASE_URL = "http://127.0.0.1:5000"

def run_e2e_tests():
    print("==================================================")
    print("        ATS END-TO-END WORKFLOW INTEGRATION TEST   ")
    print("==================================================")

    # 1. Register a new candidate
    print("\n[1] Registering a new candidate...")
    candidate_email = f"test_cand_{int(time.time())}@test.com"
    cand_reg_payload = {
        "name": "Test Candidate",
        "email": candidate_email,
        "password": "password123",
        "role": "candidate"
    }
    res = requests.post(f"{BASE_URL}/api/auth/register", json=cand_reg_payload)
    print(f"    - Register status: {res.status_code}")
    assert res.status_code == 201, "Candidate registration failed"
    otp = get_user_otp_from_db(candidate_email)
    print(f"    - OTP generated: {otp}")

    # 2. Verify candidate OTP
    print("\n[2] Verifying candidate OTP...")
    verify_payload = {
        "email": candidate_email,
        "otp": otp
    }
    res = requests.post(f"{BASE_URL}/api/auth/verify-otp", json=verify_payload)
    print(f"    - Verify status: {res.status_code}")
    assert res.status_code == 200, "OTP verification failed"

    # 3. Log in as candidate
    print("\n[3] Logging in as candidate...")
    login_payload = {
        "email": candidate_email,
        "password": "password123"
    }
    res = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
    print(f"    - Login status: {res.status_code}")
    assert res.status_code == 200, "Candidate login failed"
    cand_token = res.json().get("token")
    cand_headers = {"Authorization": f"Bearer {cand_token}"}
    print("    [+] Logged in successfully!")

    # 4. Upload a valid resume and verify parsing
    print("\n[4] Uploading a valid resume...")
    resume_path = "mock_resume.pdf"
    if not os.path.exists(resume_path):
        resume_path = "uploads/mock_resume.pdf"
        
    with open(resume_path, "rb") as f:
        files = {"file": (os.path.basename(resume_path), f, "application/pdf")}
        res = requests.post(f"{BASE_URL}/api/resumes/upload", files=files, headers=cand_headers)
        
    print(f"    - Upload status: {res.status_code}")
    assert res.status_code in (200, 201), f"Resume upload failed: {res.text}"
    resume_data = res.json().get("resume")
    resume_id = resume_data.get("id")
    print(f"    - Uploaded Resume ID: {resume_id}")
    print(f"    - Extracted Skills: {resume_data.get('skills')}")
    print(f"    - Experience Years parsed: {resume_data.get('experience_years')}")

    # 5. Register a recruiter
    print("\n[5] Registering a recruiter...")
    recruiter_email = f"test_rec_{int(time.time())}@test.com"
    rec_reg_payload = {
        "name": "Test Recruiter",
        "email": recruiter_email,
        "password": "password123",
        "role": "recruiter"
    }
    res = requests.post(f"{BASE_URL}/api/auth/register", json=rec_reg_payload)
    print(f"    - Register status: {res.status_code}")
    assert res.status_code == 201, "Recruiter registration failed"
    rec_otp = get_user_otp_from_db(recruiter_email)

    # 6. Verify recruiter OTP
    print("\n[6] Verifying recruiter OTP...")
    verify_payload = {
        "email": recruiter_email,
        "otp": rec_otp
    }
    res = requests.post(f"{BASE_URL}/api/auth/verify-otp", json=verify_payload)
    print(f"    - Verify status: {res.status_code}")
    assert res.status_code == 200, "Recruiter OTP verification failed"

    # 7. Log in as admin to approve recruiter
    print("\n[7] Logging in as admin and approving recruiter...")
    admin_login_payload = {
        "email": "admin@site.com",
        "password": "password123"
    }
    res = requests.post(f"{BASE_URL}/api/auth/login", json=admin_login_payload)
    assert res.status_code == 200, "Admin login failed"
    admin_token = res.json().get("token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Find recruiter ID
    res = requests.get(f"{BASE_URL}/api/admin/users?role=recruiter", headers=admin_headers)
    assert res.status_code == 200, "Admin get recruiters failed"
    recruiters = res.json()
    recruiter_id = None
    for r in recruiters:
        if r.get("email") == recruiter_email:
            recruiter_id = r.get("id")
            break
    print(f"    - Recruiter ID: {recruiter_id}")
    assert recruiter_id is not None, "Could not find recruiter account"

    # Approve recruiter
    res = requests.put(f"{BASE_URL}/api/admin/users/{recruiter_id}/approve", headers=admin_headers)
    print(f"    - Approve status: {res.status_code}")
    assert res.status_code == 200, "Recruiter approval failed"

    # 8. Log in as recruiter
    print("\n[8] Logging in as recruiter...")
    rec_login_payload = {
        "email": recruiter_email,
        "password": "password123"
    }
    res = requests.post(f"{BASE_URL}/api/auth/login", json=rec_login_payload)
    print(f"    - Recruiter login status: {res.status_code}")
    assert res.status_code == 200, "Recruiter login failed"
    rec_token = res.json().get("token")
    rec_headers = {"Authorization": f"Bearer {rec_token}"}

    # 9. Recruiter creates a job
    print("\n[9] Recruiter creating a job...")
    job_payload = {
        "title": "Backend Python Test Engineer",
        "description": "Must have Python, Flask, SQL, and Docker experience.",
        "skills_required": ["Python", "Flask", "SQL", "Docker"],
        "experience_required": 2,
        "location": "Dallas, TX",
        "min_match_score": 60,
        "evaluation_strategy": "intelligent"
    }
    res = requests.post(f"{BASE_URL}/api/jobs", json=job_payload, headers=rec_headers)
    print(f"    - Create job status: {res.status_code}")
    assert res.status_code == 201, "Job creation failed"
    job_data = res.json().get("job")
    job_id = job_data.get("id")
    print(f"    - Created Job ID: {job_id}")

    # 10. Candidate applies to the job
    print("\n[10] Candidate applying to the job...")
    apply_payload = {
        "job_id": job_id,
        "resume_id": resume_id
    }
    res = requests.post(f"{BASE_URL}/api/applications", json=apply_payload, headers=cand_headers)
    print(f"    - Apply status: {res.status_code}")
    assert res.status_code == 201, "Apply to job failed"
    app_id = res.json().get("application").get("id")
    print(f"    - Application ID: {app_id}")

    # 11. Test Quick Evaluation vs Intelligent Evaluation
    print("\n[11] Testing evaluation strategies...")
    # First, let's set job to quick evaluation strategy
    update_payload = {"evaluation_strategy": "quick"}
    res = requests.put(f"{BASE_URL}/api/jobs/{job_id}", json=update_payload, headers=rec_headers)
    assert res.status_code == 200, "Job update to quick strategy failed"

    # Evaluate using quick strategy
    res = requests.post(f"{BASE_URL}/api/jobs/{job_id}/evaluate", headers=rec_headers)
    print(f"    - Quick evaluation status: {res.status_code}")
    assert res.status_code == 200, "Quick evaluation failed"
    res_data = res.json()
    print(f"    - Quick pool analysis: {json.dumps(res_data.get('job').get('pool_analysis'))}")

    # Set job to intelligent evaluation strategy
    update_payload = {"evaluation_strategy": "intelligent"}
    res = requests.put(f"{BASE_URL}/api/jobs/{job_id}", json=update_payload, headers=rec_headers)
    assert res.status_code == 200, "Job update to intelligent strategy failed"
    # Should flag scores as outdated
    print(f"    - Job scores outdated status: {res.json().get('job').get('scores_outdated')}")

    # Evaluate using intelligent strategy
    res = requests.post(f"{BASE_URL}/api/jobs/{job_id}/evaluate", headers=rec_headers)
    print(f"    - Intelligent evaluation status: {res.status_code}")
    assert res.status_code == 200, "Intelligent evaluation failed"
    res_data = res.json()
    print(f"    - Intelligent pool analysis: {json.dumps(res_data.get('job').get('pool_analysis'))}")

    # 12. Test shortlisting with threshold and max candidate limits
    print("\n[12] Testing bulk shortlisting and results generation...")
    # Generate results with high threshold (e.g. 95) -> should yield 0 shortlisted if candidate doesn't match that high
    res_payload = {
        "threshold": 95,
        "max_candidates": 5
    }
    res = requests.post(f"{BASE_URL}/api/jobs/{job_id}/generate-results", json=res_payload, headers=rec_headers)
    print(f"    - Generate results with threshold 95: {res.status_code}")
    assert res.status_code == 200, "Results generation failed"
    # Check application status - should be 'evaluated' (since score < 95)
    app_res = requests.get(f"{BASE_URL}/api/applications/{app_id}", headers=rec_headers)
    print(f"    - App status after 95 threshold: {app_res.json().get('status')}")

    # Generate results with low threshold (e.g. 30) -> should shortlist candidate
    res_payload = {
        "threshold": 30,
        "max_candidates": 5
    }
    res = requests.post(f"{BASE_URL}/api/jobs/{job_id}/generate-results", json=res_payload, headers=rec_headers)
    print(f"    - Generate results with threshold 30: {res.status_code}")
    assert res.status_code == 200, "Results generation failed"
    app_res = requests.get(f"{BASE_URL}/api/applications/{app_id}", headers=rec_headers)
    print(f"    - App status after 30 threshold: {app_res.json().get('status')}")
    assert app_res.json().get("status") == "shortlisted", "Candidate should be shortlisted"

    # 13. Verify manual status updates and transitions
    print("\n[13] Verifying manual status updates and transitions...")
    # Try invalid transition: shortlisted -> hired directly (should fail because we must follow: shortlisted -> interview -> selected -> hired)
    transition_payload = {"status": "hired"}
    res = requests.put(f"{BASE_URL}/api/applications/{app_id}/status", json=transition_payload, headers=rec_headers)
    print(f"    - Invalid transition status: {res.status_code}")
    assert res.status_code == 400, "Invalid transition should fail"
    print(f"    - Error message: {res.json().get('message')}")

    # Valid transitions: shortlisted -> interview
    res = requests.put(f"{BASE_URL}/api/applications/{app_id}/status", json={"status": "interview"}, headers=rec_headers)
    assert res.status_code == 200, "Transition to interview failed"
    print("    - Transition to interview: Success")

    # interview -> selected
    res = requests.put(f"{BASE_URL}/api/applications/{app_id}/status", json={"status": "selected"}, headers=rec_headers)
    assert res.status_code == 200, "Transition to selected failed"
    print("    - Transition to selected: Success")

    # selected -> hired
    res = requests.put(f"{BASE_URL}/api/applications/{app_id}/status", json={"status": "hired"}, headers=rec_headers)
    assert res.status_code == 200, "Transition to hired failed"
    print("    - Transition to hired: Success")

    # 14. Test sending invitation emails
    print("\n[14] Testing email sending route...")
    # Manually downgrade status back to shortlisted to allow invitation email test
    res = requests.put(f"{BASE_URL}/api/applications/{app_id}/status", json={"status": "selected"}, headers=rec_headers)
    assert res.status_code == 200
    res = requests.put(f"{BASE_URL}/api/applications/{app_id}/status", json={"status": "interview"}, headers=rec_headers)
    assert res.status_code == 200
    res = requests.put(f"{BASE_URL}/api/applications/{app_id}/status", json={"status": "shortlisted"}, headers=rec_headers)
    assert res.status_code == 200
    
    # Send email
    res = requests.post(f"{BASE_URL}/api/jobs/{job_id}/send-shortlist-emails", headers=rec_headers)
    print(f"    - Send emails status: {res.status_code}")
    assert res.status_code == 200, "Send emails route failed"
    print(f"    - Email response: {res.json()}")

    # 15. Verify Candidate Portal notifications
    print("\n[15] Verifying notifications for candidate...")
    res = requests.get(f"{BASE_URL}/api/notifications", headers=cand_headers)
    print(f"    - Get notifications status: {res.status_code}")
    assert res.status_code == 200
    notifs = res.json()
    print(f"    - Candidate notifications count: {len(notifs)}")
    for n in notifs[:3]:
        print(f"      * {n.get('message')}")

    # 16. Verify Admin Dashboard and User management
    print("\n[16] Verifying Admin Dashboard & Metrics...")
    res = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=admin_headers)
    print(f"    - Get admin dashboard status: {res.status_code}")
    assert res.status_code == 200
    dash = res.json()
    print(f"    - Metrics: {json.dumps(dash.get('metrics'))}")

    # Clean up test users & job
    print("\n[17] Cleaning up E2E test data...")
    res = requests.delete(f"{BASE_URL}/api/jobs/{job_id}", headers=rec_headers)
    print(f"    - Job deletion status: {res.status_code}")
    assert res.status_code == 200, "Job deletion failed"

    print("\n==================================================")
    print("      ALL E2E WORKFLOW TESTS PASSED SUCCESSFULLY! ")
    print("==================================================")

if __name__ == "__main__":
    run_e2e_tests()
