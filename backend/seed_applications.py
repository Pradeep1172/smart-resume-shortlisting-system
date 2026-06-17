import os
import shutil
from datetime import datetime, timedelta
from app import create_app, db
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.models.application import Application

def seed():
    app = create_app()
    with app.app_context():
        # Ensure uploads folder exists and copy a dummy resume
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        dummy_resume_path = os.path.join(app.config['UPLOAD_FOLDER'], 'mock_resume.pdf')
        
        # If there is a mock_resume.pdf in backend, copy it. Otherwise write a small text file.
        if os.path.exists('mock_resume.pdf'):
            shutil.copy('mock_resume.pdf', dummy_resume_path)
        else:
            with open(dummy_resume_path, 'w') as f:
                f.write("%PDF-1.4 mock pdf data")

        # 1. Fetch Recruiter
        jane = User.query.filter_by(email="jane@recruiter.com").first()
        if not jane:
            jane = User(name="Jane Recruiter", email="jane@recruiter.com", role="recruiter")
            jane.set_password("password123")
            db.session.add(jane)
            db.session.commit()
            
        # 2. Add an expired Job (Yesterday) to trigger "Evaluation Pending"
        job = Job.query.filter_by(title="Python Software Engineer").first()
        if not job:
            job = Job(
                recruiter_id=jane.id,
                title="Python Software Engineer",
                description="Looking for a Python Backend Engineer who can build Flask web applications and interface with SQL databases. Experience in React frontend is a major plus.",
                skills_required=["Python", "Flask", "React", "SQL"],
                experience_required=3,
                location="Remote",
                status="closed",
                deadline=datetime.utcnow() - timedelta(days=1),
                min_match_score=70,
                evaluation_type="keyword",
                evaluation_status="pending",
                results_generated=False
            )
            db.session.add(job)
            db.session.commit()
            print("Python Software Engineer job seeded.")

        # 3. Add Candidate Users, Resumes and Applications
        candidates_data = [
            {
                "name": "John Candidate",
                "email": "john@candidate.com",
                "skills": ["Python", "Flask", "React", "SQL"],
                "experience": 3.0,
                "file": "john_resume.pdf"
            },
            {
                "name": "Alice Candidate",
                "email": "alice@candidate.com",
                "skills": ["Python", "SQL", "Flask", "Docker", "AWS"],
                "experience": 5.0,
                "file": "alice_resume.pdf"
            },
            {
                "name": "Bob Candidate",
                "email": "bob@candidate.com",
                "skills": ["React", "JavaScript", "HTML", "CSS"],
                "experience": 2.0,
                "file": "bob_resume.pdf"
            },
            {
                "name": "Charlie Candidate",
                "email": "charlie@candidate.com",
                "skills": ["C++", "Java", "Python"],
                "experience": 1.0,
                "file": "charlie_resume.pdf"
            }
        ]

        for cand in candidates_data:
            user = User.query.filter_by(email=cand["email"]).first()
            if not user:
                user = User(name=cand["name"], email=cand["email"], role="candidate")
                user.set_password("password123")
                db.session.add(user)
                db.session.commit()

            # Create Resume
            resume = Resume.query.filter_by(user_id=user.id).first()
            if not resume:
                resume = Resume(
                    user_id=user.id,
                    file_name=cand["file"],
                    file_path=dummy_resume_path,
                    extracted_text=f"Skills: {', '.join(cand['skills'])}. Experience: {cand['experience']} years.",
                    skills=cand["skills"],
                    experience_years=cand["experience"]
                )
                db.session.add(resume)
                db.session.commit()

            # Create Application
            appln = Application.query.filter_by(job_id=job.id, candidate_id=user.id).first()
            if not appln:
                appln = Application(
                    job_id=job.id,
                    candidate_id=user.id,
                    resume_id=resume.id,
                    status="applied"
                )
                db.session.add(appln)
                db.session.commit()

        print("Seeding of candidates and applications finished successfully!")

if __name__ == '__main__':
    seed()
