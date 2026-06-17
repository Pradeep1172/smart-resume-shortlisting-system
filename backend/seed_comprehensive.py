import os
import sys
import shutil
from datetime import datetime, timedelta

# Ensure backend imports work
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app import create_app, db
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.models.application import Application, MatchScore
from app.services.match_service import calculate_match_score

def seed_comprehensive():
    app = create_app()
    with app.app_context():
        print("Dropping all existing database tables...")
        db.drop_all()
        print("Recreating database tables...")
        db.create_all()
        
        # Ensure uploads folder exists and write a dummy PDF file
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        dummy_resume_path = os.path.join(app.config['UPLOAD_FOLDER'], 'mock_resume.pdf')
        
        if os.path.exists('mock_resume.pdf'):
            shutil.copy('mock_resume.pdf', dummy_resume_path)
        else:
            with open(dummy_resume_path, 'w') as f:
                f.write("%PDF-1.4 mock pdf data")
                
        # 1. Seed Recruiter User
        recruiter = User(name="Jane Recruiter", email="jane@recruiter.com", role="recruiter")
        recruiter.set_password("password123")
        db.session.add(recruiter)
        db.session.commit()
        print(f"Recruiter Jane seeded (ID: {recruiter.id})")
        
        # 2. Seed Job Postings
        jobs_data = [
            {
                "title": "Python Software Engineer",
                "description": "Looking for a backend engineer proficient in Python and Flask, with SQL databases and AWS deployment experience. React experience is a major plus.",
                "skills": ["Python", "Flask", "SQL", "React", "AWS"],
                "experience": 3,
                "location": "Remote",
                "status": "closed",
                "deadline": datetime.utcnow() - timedelta(days=1),
                "min_match_score": 70,
                "evaluation_type": "keyword"
            },
            {
                "title": "Frontend React Developer",
                "description": "Build modern, responsive UI interfaces with React, TailwindCSS, and TypeScript. Experience with state management is required.",
                "skills": ["React", "JavaScript", "HTML", "CSS", "Tailwind", "TypeScript"],
                "experience": 2,
                "location": "New York, NY",
                "status": "open",
                "deadline": datetime.utcnow() + timedelta(days=15),
                "min_match_score": 65,
                "evaluation_type": "weighted"
            },
            {
                "title": "Data Scientist",
                "description": "Develop machine learning models and perform data analytics using Python, SQL, and pandas. Experience in NLP/Deep Learning is preferred.",
                "skills": ["Python", "Machine Learning", "SQL", "Pandas", "NumPy", "Scikit-Learn"],
                "experience": 4,
                "location": "Remote",
                "status": "open",
                "deadline": datetime.utcnow() + timedelta(days=20),
                "min_match_score": 75,
                "evaluation_type": "ai"
            }
        ]
        
        jobs = []
        for job_info in jobs_data:
            job = Job(
                recruiter_id=recruiter.id,
                title=job_info["title"],
                description=job_info["description"],
                skills_required=job_info["skills"],
                experience_required=job_info["experience"],
                location=job_info["location"],
                status=job_info["status"],
                deadline=job_info["deadline"],
                min_match_score=job_info["min_match_score"],
                evaluation_type=job_info["evaluation_type"]
            )
            db.session.add(job)
            jobs.append(job)
            
        db.session.commit()
        print(f"Seeded {len(jobs)} job postings.")
        
        # 3. Seed 12 Candidate Users, Resumes
        candidates_data = [
            {
                "name": "John Candidate",
                "email": "john@candidate.com",
                "skills": ["Python", "Flask", "React", "SQL"],
                "experience": 3.0,
                "projects": ["E-Commerce Backend", "Task Manager React App"],
                "apply_to_indices": [0, 1]  # Python Software Eng, Frontend React Dev
            },
            {
                "name": "Alice Candidate",
                "email": "alice@candidate.com",
                "skills": ["Python", "SQL", "Flask", "Docker", "AWS"],
                "experience": 5.0,
                "projects": ["Microservices Platform", "Data Pipelines on AWS"],
                "apply_to_indices": [0, 2]  # Python Software Eng, Data Scientist
            },
            {
                "name": "Bob Candidate",
                "email": "bob@candidate.com",
                "skills": ["React", "JavaScript", "HTML", "CSS", "Tailwind", "TypeScript"],
                "experience": 2.0,
                "projects": ["Personal Portfolio Website", "React SaaS Dashboard"],
                "apply_to_indices": [1]  # Frontend React Dev
            },
            {
                "name": "Charlie Candidate",
                "email": "charlie@candidate.com",
                "skills": ["C++", "Java", "Python"],
                "experience": 1.0,
                "projects": ["CLI Game in C++"],
                "apply_to_indices": [0]  # Python Software Eng
            },
            {
                "name": "Diana Data",
                "email": "diana@test.com",
                "skills": ["Python", "Machine Learning", "SQL", "Pandas", "NumPy", "Scikit-Learn"],
                "experience": 4.0,
                "projects": ["Customer Churn Prediction Model", "NLP Sentiment Analyzer"],
                "apply_to_indices": [2]  # Data Scientist
            },
            {
                "name": "Evan Dev",
                "email": "evan@test.com",
                "skills": ["JavaScript", "React", "Node.js", "CSS", "HTML", "Tailwind", "TypeScript"],
                "experience": 3.0,
                "projects": ["MERN Stack Chat Application", "Agile Task Board"],
                "apply_to_indices": [1]  # Frontend React Dev
            },
            {
                "name": "Fiona Fullstack",
                "email": "fiona@test.com",
                "skills": ["Python", "Flask", "SQL", "React", "JavaScript", "AWS", "Docker"],
                "experience": 4.0,
                "projects": ["Collaborative Whiteboard App", "Serverless API Gateway"],
                "apply_to_indices": [0, 1]  # Python Software Eng, Frontend React Dev
            },
            {
                "name": "George Junior",
                "email": "george@test.com",
                "skills": ["HTML", "CSS", "JavaScript", "React"],
                "experience": 0.5,
                "projects": ["Recipe Finder Web App"],
                "apply_to_indices": [1]  # Frontend React Dev
            },
            {
                "name": "Hannah Senior",
                "email": "hannah@test.com",
                "skills": ["Python", "SQL", "AWS", "Docker", "Machine Learning", "Pandas"],
                "experience": 7.0,
                "projects": ["High-Throughput Analytics Platform", "Automated Fraud Detection System"],
                "apply_to_indices": [0, 2]  # Python Software Eng, Data Scientist
            },
            {
                "name": "Ian Infrastructure",
                "email": "ian@test.com",
                "skills": ["Python", "AWS", "Docker", "Git", "Flask"],
                "experience": 5.0,
                "projects": ["Infrastructure as Code AWS Template", "Dockerized Jenkins Pipeline"],
                "apply_to_indices": [0]  # Python Software Eng
            },
            {
                "name": "Kevin Kotlin",
                "email": "kevin@test.com",
                "skills": ["Java", "Kotlin", "Swift", "Git"],
                "experience": 3.0,
                "projects": ["Native Android Shopping App"],
                "apply_to_indices": []  # No applications initially
            },
            {
                "name": "Laura Lead",
                "email": "laura@test.com",
                "skills": ["Python", "SQL", "Flask", "Git", "React"],
                "experience": 6.0,
                "projects": ["Enterprise CRM Platform", "Sprint Planner Tool"],
                "apply_to_indices": [0, 1, 2]  # Applies to all 3 jobs
            }
        ]
        
        candidate_count = 0
        application_count = 0
        
        for cand_info in candidates_data:
            # Create user
            user = User(name=cand_info["name"], email=cand_info["email"], role="candidate")
            user.set_password("password123")
            db.session.add(user)
            db.session.commit()
            candidate_count += 1
            
            # Create resume with structured text to satisfy confidence parsing checks
            resume_text = f"""
            {cand_info['name']}
            Email: {cand_info['email']}
            Phone: +1 555-0199
            
            Professional Summary:
            Highly motivated software engineer with experience building web applications, database design, and cloud solutions.
            
            Skills:
            {', '.join(cand_info['skills'])}
            
            Experience:
            Software Engineer | 2021 - Present
            - Worked for {cand_info['experience']} years in software development.
            - Developed and managed key features.
            
            Projects:
            {'. '.join(cand_info['projects'])}
            
            Education:
            Bachelor of Science in Computer Science
            University of Technology | 2017 - 2021
            """
            
            resume = Resume(
                user_id=user.id,
                file_name=f"{cand_info['name'].lower().replace(' ', '_')}_resume.pdf",
                file_path=dummy_resume_path,
                extracted_text=resume_text,
                skills=cand_info["skills"],
                experience_years=cand_info["experience"],
                projects=cand_info["projects"]
            )
            db.session.add(resume)
            db.session.commit()
            
            # Create applications
            for idx in cand_info["apply_to_indices"]:
                job = jobs[idx]
                
                # Default status is 'applied'
                application = Application(
                    job_id=job.id,
                    candidate_id=user.id,
                    resume_id=resume.id,
                    status="applied"
                )
                db.session.add(application)
                db.session.flush()
                application_count += 1
                
                # Only pre-calculate score for jobs 1 and 2, leave job 0 unevaluated
                if idx > 0:
                    match_data = calculate_match_score(resume, job, eval_type=job.evaluation_type)
                    
                    score_record = MatchScore(
                        application_id=application.id,
                        match_percentage=match_data['match_percentage'],
                        ai_score=match_data['ai_score'],
                        final_score=match_data['final_score'],
                        evaluation_type=match_data['evaluation_type'],
                        details=match_data['details']
                    )
                    db.session.add(score_record)
                
        db.session.commit()
        print(f"Seeded {candidate_count} candidates and {application_count} applications.")
        print("Initial match scores pre-computed for jobs 1 and 2. Job 0 left unevaluated.")
        print("Comprehensive Seeding Complete!")

if __name__ == '__main__':
    seed_comprehensive()
