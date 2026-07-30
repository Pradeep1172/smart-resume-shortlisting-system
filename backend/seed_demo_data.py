import os
import sys
import json
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
from app.models.candidate_profile import CandidateProfile
from app.models.notification import Notification
from app.services.match_service import (
    calculate_quick_score,
    calculate_match_score,
    generate_pool_quick_analysis,
    generate_pool_ai_analysis,
    auto_compute_weights
)

def seed_demo_data():
    # Force fallback local scoring during seeding to bypass Gemini API rate limits/timeouts
    import app.services.match_service as ms
    ms.get_gemini_api_key = lambda: None

    app = create_app()
    with app.app_context():
        print("Dropping all existing database tables for clean demo seeding...")
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

        # 1. Seed Admin User
        admin = User(name="Administrator", email="admin@site.com", role="admin", email_verified=True)
        admin.set_password("password123")
        db.session.add(admin)
        print("Admin user seeded: admin@site.com / password123")

        # 2. Seed Recruiter User (with full Saanvika Software Solutions company info)
        recruiter = User(
            name="Pradeep Kumar",
            email="recruiter_test@test.com",
            role="recruiter",
            email_verified=True,
            approval_status="approved",
            company="Saanvika Software Solutions"
        )
        recruiter.set_password("recruiter123")
        
        company_details_dict = {
            "company_name": "Saanvika Software Solutions",
            "company_website": "https://www.saanvika.com",
            "company_description": "Building innovative software solutions for businesses across India.",
            "industry": "Information Technology",
            "company_type": "Private Limited",
            "company_size": "51-200 Employees",
            "established_year": "2018",
            "headquarters": "Hyderabad",
            "company_address": "HITEC City, Hyderabad, Telangana",
            "hr_email": "careers@saanvika.com",
            "phone": "+91 98765 43210",
            "default_eval_strategy": "intelligent"
        }
        recruiter.company_details = json.dumps(company_details_dict)
        db.session.add(recruiter)
        db.session.commit()
        print("Recruiter user seeded: recruiter_test@test.com / recruiter123")

        # 3. Seed Job Postings
        jobs_data = [
            {
                "title": "Senior Full-Stack Developer",
                "description": "We are looking for a Senior Full-Stack Developer with expertise in Python, Flask, React, and cloud technologies. The ideal candidate should have experience with SQL databases, Docker, and CI/CD pipelines.",
                "skills_required": ["Python", "Flask", "React", "SQL", "Docker", "AWS", "Git"],
                "experience_required": 3,
                "location": "Hyderabad, Telangana (Hybrid)",
                "min_match_score": 60,
                "evaluation_strategy": "quick",
                "evaluation_type": "keyword"
            },
            {
                "title": "Data Scientist & ML Engineer",
                "description": "Develop machine learning models and perform data analytics using Python, SQL, and pandas. Experience in NLP/Deep Learning is preferred.",
                "skills_required": ["Python", "Machine Learning", "SQL", "Pandas", "NumPy", "Scikit-Learn"],
                "experience_required": 4,
                "location": "Bengaluru, Karnataka (On-site)",
                "min_match_score": 65,
                "evaluation_strategy": "intelligent",
                "evaluation_type": "ai"
            }
        ]

        jobs = []
        for jd in jobs_data:
            job = Job(
                recruiter_id=recruiter.id,
                title=jd["title"],
                description=jd["description"],
                skills_required=jd["skills_required"],
                experience_required=jd["experience_required"],
                location=jd["location"],
                status="open",
                deadline=datetime.utcnow() + timedelta(days=30),
                min_match_score=jd["min_match_score"],
                evaluation_type=jd["evaluation_type"],
                evaluation_strategy=jd["evaluation_strategy"],
                ai_insights_enabled=True,
                evaluation_weights=auto_compute_weights(jd["experience_required"])
            )
            db.session.add(job)
            jobs.append(job)
        
        db.session.commit()
        print("2 Job postings created.")

        # 4. Seed 10 Candidates with full profiles and structured resumes
        candidates_list = [
            {
                "name": "Rahul Sharma",
                "email": "rahul@test.com",
                "skills": ["Python", "Flask", "React", "SQL", "Docker", "AWS", "Git"],
                "exp": 3.5,
                "projects": ["E-Commerce REST API using Flask", "Automated deployment pipeline on AWS"],
                "education": "Bachelor of Technology in Computer Science, IIT Hyderabad (2020)",
                "headline": "Senior Software Engineer | Python, Flask, React, AWS",
                "bio": "Experienced backend & fullstack developer specializing in scalable Python microservices and modern React frontends.",
                "certifications": "AWS Certified Developer - Associate",
                "phone": "+91 98765 43210"
            },
            {
                "name": "Priya Reddy",
                "email": "priya@test.com",
                "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Machine Learning", "Pandas", "AWS"],
                "exp": 5.0,
                "projects": ["E-commerce Search Index Optimizer", "Customer Churn Prediction Classifier"],
                "education": "M.Tech in Data Science, BITS Pilani (2019)",
                "headline": "Lead Backend & ML Engineer",
                "bio": "Passionate developer focused on database performance tuning, data modeling, and developing production-grade machine learning APIs.",
                "certifications": "PostgreSQL Expert Certificate",
                "phone": "+91 98765 43211"
            },
            {
                "name": "Arjun Kumar",
                "email": "arjun@test.com",
                "skills": ["React", "TypeScript", "TailwindCSS", "Node.js", "Express", "SQL", "Git"],
                "exp": 2.0,
                "projects": ["Real-time Collaborative Whiteboard", "Vite Component Library styling"],
                "education": "B.Sc in Software Engineering, Madras University (2022)",
                "headline": "Frontend React Specialist & UI/UX Advocate",
                "bio": "Focused on creating highly interactive, accessible web applications with pixel-perfect designs.",
                "certifications": "Meta Front-End Developer Certificate",
                "phone": "+91 98765 43212"
            },
            {
                "name": "Sneha Patel",
                "email": "sneha@test.com",
                "skills": ["Python", "Machine Learning", "Pandas", "NumPy", "Scikit-Learn", "SQL", "NLP"],
                "exp": 4.5,
                "projects": ["NLP Medical Information Parser", "Financial Fraud Detection System"],
                "education": "Bachelor of Technology in IT, Nirma University (2019)",
                "headline": "Data Scientist | Machine Learning & NLP practitioner",
                "bio": "Expert in engineering ML pipelines, feature extraction, model evaluations, and deploying NLP architectures.",
                "certifications": "Google Professional Data Engineer",
                "phone": "+91 98765 43213"
            },
            {
                "name": "Kiran Verma",
                "email": "kiran@test.com",
                "skills": ["Python", "SQL", "Pandas", "Tableau", "Git", "Excel"],
                "exp": 3.0,
                "projects": ["Sales Trend Analysis Dashboards", "Marketing Campaign ROI Tracking"],
                "education": "Bachelor of Commerce in Analytics, Delhi University (2021)",
                "headline": "Business Intelligence & Data Analyst",
                "bio": "Translating complex datasets into actionable business strategies and interactive Tableau dashboards.",
                "certifications": "Tableau Desktop Certified Associate",
                "phone": "+91 98765 43214"
            },
            {
                "name": "Ananya Rao",
                "email": "ananya@test.com",
                "skills": ["React", "JavaScript", "HTML", "CSS", "TailwindCSS", "Vite", "Figma"],
                "exp": 2.5,
                "projects": ["Premium Landing Page Designs", "SaaS Dashboard Layout Frontend"],
                "education": "Bachelor of Design (UI/UX), National Institute of Design (2021)",
                "headline": "UI/UX Engineer & Frontend Designer",
                "bio": "Bridging the gap between beautiful aesthetics and robust modern React codebases.",
                "certifications": "Interaction Design Specialist Certificate",
                "phone": "+91 98765 43215"
            },
            {
                "name": "Suresh Gupta",
                "email": "suresh@test.com",
                "skills": ["Java", "Spring Boot", "SQL", "Git", "Docker", "REST APIs"],
                "exp": 4.0,
                "projects": ["Microservices Payment Gateway", "Inventory Management Platform"],
                "education": "B.Tech in Computer Science, VIT Vellore (2019)",
                "headline": "Enterprise Java Developer | Spring Boot, Microservices",
                "bio": "Designing enterprise architecture, reliable payment gateways, and highly redundant message queues.",
                "certifications": "Oracle Certified Professional: Java SE Programmer",
                "phone": "+91 98765 43216"
            },
            {
                "name": "Neha Sen",
                "email": "neha@test.com",
                "skills": ["Python", "AWS", "Docker", "Kubernetes", "CI/CD", "Git", "Linux"],
                "exp": 5.5,
                "projects": ["Dockerized Jenkins Pipeline", "Kubernetes Autoscaling Cluster"],
                "education": "B.Tech in Computer Engineering, Pune University (2018)",
                "headline": "DevOps & Cloud Infrastructure Architect",
                "bio": "Automating server setups, cloud migrations, infrastructure-as-code, and continuous delivery platforms.",
                "certifications": "AWS Certified Solutions Architect - Professional",
                "phone": "+91 98765 43217"
            },
            {
                "name": "Vijay Nair",
                "email": "vijay@test.com",
                "skills": ["Python", "SQL", "Git", "HTML", "CSS"],
                "exp": 1.0,
                "projects": ["CLI File Organizing System"],
                "education": "B.Sc in Computer Science, MG University (2023)",
                "headline": "Junior Backend Developer | Python Enthusiast",
                "bio": "Eager to learn backend frameworks, optimizing SQL operations, and building system utility scripts.",
                "certifications": "Python Software Foundation Certified Entry Associate",
                "phone": "+91 98765 43218"
            },
            {
                "name": "Aditi Rao",
                "email": "aditi@test.com",
                "skills": ["Roadmap Planning", "Agile Management", "User Research", "SQL", "Jira"],
                "exp": 3.0,
                "projects": ["Sprint Planning Optimization System", "Recruiter UI Feedback Research"],
                "education": "MBA in Technology Management, Symbiosis Pune (2021)",
                "headline": "Technical Product Associate | Agile Advocate",
                "bio": "Facilitating agile sprint workflows, interviewing end-users, and managing features roadmap.",
                "certifications": "Certified Scrum Product Owner (CSPO)",
                "phone": "+91 98765 43219"
            }
        ]

        cand_users = []
        cand_resumes = []

        for cd in candidates_list:
            # Create Candidate User
            user = User(name=cd["name"], email=cd["email"], role="candidate", email_verified=True)
            user.set_password("test123")
            db.session.add(user)
            db.session.commit()
            cand_users.append(user)

            # Create Candidate Profile
            profile = CandidateProfile(
                user_id=user.id,
                phone=cd["phone"],
                headline=cd["headline"],
                bio=cd["bio"],
                education=cd["education"],
                certifications=cd["certifications"],
                github_url=f"https://github.com/{cd['name'].lower().replace(' ', '')}",
                linkedin_url=f"https://linkedin.com/in/{cd['name'].lower().replace(' ', '')}"
            )
            db.session.add(profile)

            # Create Resume Text
            resume_text = f"""
            {cd['name']}
            Email: {cd['email']}
            Phone: {cd['phone']}
            
            Professional Title: {cd['headline']}
            
            Summary:
            {cd['bio']}
            
            Skills:
            {', '.join(cd['skills'])}
            
            Professional Experience:
            Software Engineer | 2021 - Present
            - Over {cd['exp']} years of professional industry experience.
            - Led technical implementations and maintained code quality.
            
            Key Projects:
            {'. '.join(['- ' + p for p in cd['projects']])}
            
            Education:
            {cd['education']}
            
            Certifications:
            {cd['certifications']}
            """

            # Create Resume Record
            resume = Resume(
                user_id=user.id,
                file_name=f"{cd['name'].lower().replace(' ', '_')}_resume.pdf",
                file_path=dummy_resume_path,
                extracted_text=resume_text.strip(),
                skills=cd["skills"],
                experience_years=cd["exp"],
                projects=cd["projects"]
            )
            db.session.add(resume)
            db.session.commit()
            cand_resumes.append(resume)
        
        print("10 Candidate users, profiles, and resumes successfully seeded.")

        # 5. Apply All Candidates to Both Jobs
        applications = []
        for job in jobs:
            for i, user in enumerate(cand_users):
                app_rec = Application(
                    job_id=job.id,
                    candidate_id=user.id,
                    resume_id=cand_resumes[i].id,
                    status="applied"
                )
                db.session.add(app_rec)
                applications.append(app_rec)
        
        db.session.commit()
        print(f"Applied all 10 candidates to both jobs ({len(applications)} total applications created).")

        # 6. Evaluate and Match Score for both jobs
        for job in jobs:
            print(f"\nEvaluating candidates for Job: {job.title} ({job.evaluation_strategy} strategy)...")
            job_apps = Application.query.filter_by(job_id=job.id).all()
            
            scores = []
            matched_skills_all = []
            missing_skills_all = []
            evaluated_apps = []

            for app_rec in job_apps:
                app_rec.status = 'pending_evaluation'
                db.session.commit()

                # Calculate match score based on strategy
                if job.evaluation_strategy == 'quick':
                    match_data = calculate_quick_score(app_rec.resume, job)
                else:
                    match_data = calculate_match_score(app_rec.resume, job, weights=job.evaluation_weights)

                # Create MatchScore record
                score_record = MatchScore(
                    application_id=app_rec.id,
                    match_percentage=match_data['match_percentage'],
                    ai_score=match_data['ai_score'],
                    final_score=match_data['final_score'],
                    evaluation_type=match_data['evaluation_type'],
                    details=match_data['details']
                )
                db.session.add(score_record)

                app_rec.status = 'evaluated'
                scores.append(match_data['final_score'])
                matched_skills_all.extend(match_data['details'].get('matched_skills', []))
                missing_skills_all.extend(match_data['details'].get('missing_skills', []))
                evaluated_apps.append(app_rec)
            
            # Generate pool analysis metadata
            if job.evaluation_strategy == 'quick':
                pool_data = generate_pool_quick_analysis(job, evaluated_apps, scores, matched_skills_all, missing_skills_all)
            else:
                pool_data = generate_pool_ai_analysis(job, evaluated_apps, scores, matched_skills_all, missing_skills_all)

            job.pool_analysis = pool_data
            job.evaluation_status = 'evaluated'
            job.results_generated = False
            job.scores_outdated = False
            job.evaluated_at = datetime.utcnow()
            job.evaluated_by_id = recruiter.id
            db.session.commit()
            print(f"Evaluation completed for Job ID: {job.id}")

        # 7. Generate Results (Shortlisting) for both jobs using recommended thresholds
        for job in jobs:
            recommended_threshold = job.pool_analysis.get('recommended_threshold', 60)
            print(f"\nGenerating results for Job: {job.title} using recommended threshold of {recommended_threshold}%...")
            
            job_apps = Application.query.filter_by(job_id=job.id).all()
            shortlisted_count = 0
            
            for app_rec in job_apps:
                score_record = MatchScore.query.filter_by(application_id=app_rec.id).order_by(MatchScore.id.desc()).first()
                if score_record and score_record.final_score >= recommended_threshold:
                    app_rec.status = 'shortlisted'
                    shortlisted_count += 1
                else:
                    app_rec.status = 'rejected'
            
            job.min_match_score = recommended_threshold
            job.results_generated = True
            
            # Create a recruiter notification
            notif = Notification(
                user_id=recruiter.id,
                message=f"Bulk screening completed for job '{job.title}'. Shortlisted {shortlisted_count} candidate(s) at threshold {recommended_threshold}%."
            )
            db.session.add(notif)
            db.session.commit()
            print(f"Shortlisted {shortlisted_count} candidates for Job ID: {job.id}")

        print("\n=======================================================")
        print("DEMO DATA SEEDING COMPLETE AND FULLY READY FOR RECORDING!")
        print("Recruiter Login: recruiter_test@test.com / recruiter123")
        print("Admin Login: admin@site.com / password123")
        print("Candidates Login: rahul@test.com / test123")
        print("=======================================================")

if __name__ == '__main__':
    seed_demo_data()
