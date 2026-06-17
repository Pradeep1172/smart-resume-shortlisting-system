from app import create_app, db
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.models.application import Application, MatchScore
import json

app = create_app()
with app.app_context():
    print("--- USERS ---")
    for u in User.query.all():
        print(f"ID: {u.id}, Name: {u.name}, Email: {u.email}, Role: {u.role}")

    print("\n--- JOBS ---")
    for j in Job.query.all():
        print(f"ID: {j.id}, Title: {j.title}, Recruiter: {j.recruiter_id}, Skills Required: {j.skills_required}")

    print("\n--- RESUMES ---")
    for r in Resume.query.all():
        # Truncate text for readability
        txt = r.extracted_text[:100].replace('\n', ' ') if r.extracted_text else 'None'
        print(f"ID: {r.id}, User ID: {r.user_id}, File: {r.file_name}, Experience: {r.experience_years}, Skills: {r.skills}, Extracted Preview: {txt}")

    print("\n--- APPLICATIONS ---")
    for a in Application.query.all():
        print(f"ID: {a.id}, Job ID: {a.job_id}, Resume ID: {a.resume_id}, Status: {a.status}")

    print("\n--- MATCH SCORES ---")
    for m in MatchScore.query.all():
        print(f"ID: {m.id}, App ID: {m.application_id}, Match Pct: {m.match_percentage}, Final Score: {m.final_score}, Details: {json.dumps(m.details)}")
