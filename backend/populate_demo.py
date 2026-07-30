import os
import sys
from datetime import datetime, timedelta

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app import create_app
from app.models import db
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.models.application import Application, MatchScore
from app.models.candidate_profile import CandidateProfile
from app.services.match_service import (
    calculate_quick_score,
    calculate_match_score,
    generate_pool_quick_analysis,
    generate_pool_ai_analysis,
    auto_compute_weights
)

def populate_demo():
    app = create_app()
    with app.app_context():
        recruiter = User.query.filter_by(email='rahul@shortlistiq.com').first()
        if not recruiter:
            print("Recruiter not found!")
            return

        # 0. Clean up previous demo jobs
        old_jobs = Job.query.filter_by(recruiter_id=recruiter.id).all()
        for j in old_jobs:
            if j.title in ["Front-End Developer", "Data Scientist"]:
                old_apps = Application.query.filter_by(job_id=j.id).all()
                for a in old_apps:
                    MatchScore.query.filter_by(application_id=a.id).delete()
                    db.session.delete(a)
                db.session.delete(j)
        db.session.commit()
        print("Cleaned up previous demo jobs.")

        # 1. Create Jobs
        job1 = Job(
            recruiter_id=recruiter.id,
            title="Front-End Developer",
            location="Hyderabad",
            experience_required=1,
            skills_required=["HTML", "CSS", "JavaScript", "React", "Git"],
            description="We are looking for a passionate Front-End Developer to create dynamic, responsive web applications. You will be working with React, JavaScript, HTML, and CSS to deliver high-quality user experiences. Familiarity with Git is required.",
            status="open",
            deadline=datetime.utcnow() + timedelta(days=30),
            evaluation_type="keyword",
            evaluation_strategy="quick",
            min_match_score=60,
            ai_insights_enabled=True,
            evaluation_weights=auto_compute_weights(1)
        )
        
        job2 = Job(
            recruiter_id=recruiter.id,
            title="Data Scientist",
            location="Bangalore",
            experience_required=1,
            skills_required=["Python", "SQL", "Pandas", "NumPy", "Machine Learning"],
            description="Join our data team to build predictive models and analyze large datasets. Ideal candidates will have strong experience in Python, SQL, and Machine Learning algorithms. Proficiency with Pandas and NumPy is essential.",
            status="open",
            deadline=datetime.utcnow() + timedelta(days=30),
            evaluation_type="ai",
            evaluation_strategy="intelligent",
            min_match_score=60,
            ai_insights_enabled=True,
            evaluation_weights=auto_compute_weights(1)
        )

        db.session.add(job1)
        db.session.add(job2)
        db.session.commit()
        print(f"Created Job 1: {job1.title}")
        print(f"Created Job 2: {job2.title}")

        # 2. Update Candidates & Resumes
        all_candidates = [
            'aarav@gmail.com', 'priya@gmail.com', 'rohan@gmail.com', 
            'sneha@gmail.com', 'kiran@gmail.com', 'neha@gmail.com', 
            'aditya@gmail.com', 'pooja@gmail.com', 'vikram@gmail.com', 'ananya@gmail.com'
        ]

        # Mixed strengths for 10 candidates
        # Format: (FE_Skills, DS_Skills, Exp, Summary)
        profiles = [
            (["HTML", "CSS", "JavaScript", "React", "Git", "Redux"], [], 2, "Expert Front-End Developer with strong React experience.", "Very Strong", "Weak"),
            (["HTML", "CSS", "JavaScript", "React"], ["Python", "SQL"], 1.5, "Frontend developer learning backend/data skills.", "Strong", "Weak"),
            (["HTML", "CSS"], ["Python", "SQL", "Pandas", "Machine Learning"], 2, "Data Analyst with basic HTML knowledge.", "Weak", "Strong"),
            ([], ["Python", "SQL", "Pandas", "NumPy", "Machine Learning", "Deep Learning"], 2.5, "Senior Data Scientist specializing in Deep Learning.", "Weak", "Very Strong"),
            (["HTML", "CSS", "JavaScript", "React", "Git"], ["Python", "SQL", "Pandas", "Machine Learning"], 3, "Full-Stack Engineer with Data Science expertise.", "Very Strong", "Strong"),
            (["HTML", "CSS"], ["Python"], 0.5, "Junior developer with basic scripting knowledge.", "Weak", "Weak"),
            (["HTML", "CSS", "JavaScript", "React"], [], 1.5, "Dedicated React developer building modern UIs.", "Strong", "Weak"),
            ([], ["Python", "SQL", "Pandas", "NumPy", "Machine Learning"], 2, "Machine Learning Engineer focused on predictive models.", "Weak", "Very Strong"),
            (["HTML", "CSS", "JavaScript"], ["Python", "SQL", "Pandas"], 1, "Software developer with mixed skills.", "Average", "Average"),
            (["HTML", "CSS", "JavaScript", "React", "Git"], ["Python", "SQL", "Pandas", "Machine Learning"], 2, "Experienced Software Engineer tackling web and data.", "Strong", "Strong"),
        ]

        def create_resume_and_profile(email, profile_info):
            user = User.query.filter_by(email=email).first()
            if not user:
                return None
            
            fe_skills, ds_skills, exp, summary, fe_label, ds_label = profile_info
            skills = fe_skills + ds_skills
            
            profile = CandidateProfile.query.filter_by(user_id=user.id).first()
            if not profile:
                profile = CandidateProfile(user_id=user.id)
                db.session.add(profile)
            
            profile.headline = f"Software Professional | {exp} Years Exp"
            profile.bio = summary
            
            resume = Resume.query.filter_by(user_id=user.id).first()
            if not resume:
                resume = Resume(user_id=user.id)
                db.session.add(resume)
                
            resume.file_name = f"{user.name.replace(' ', '_')}_Resume.pdf"
            resume.file_path = "mock_resume.pdf"
            resume.skills = skills
            resume.experience_years = exp
            
            extracted = f"{user.name}\nEmail: {user.email}\nExperience: {exp} years\nSkills: {', '.join(skills)}\n"
            extracted += f"Summary:\n{summary}\n"
            
            projects = []
            if len(fe_skills) > 2:
                projects.append("Interactive Web Dashboard")
                extracted += "Built responsive web interfaces using React.\n"
            if len(ds_skills) > 2:
                projects.append("Predictive Analytics Engine")
                extracted += "Developed machine learning pipelines for data analysis.\n"
                
            resume.projects = projects
            resume.extracted_text = extracted
            db.session.commit()
            return user, resume

        print("Updating 10 candidates and resumes...")
        users_resumes = []
        for i, email in enumerate(all_candidates):
            res = create_resume_and_profile(email, profiles[i])
            if res:
                users_resumes.append(res)

        # 3. Create Applications (All 10 candidates apply to BOTH jobs)
        print("Creating 20 applications (10 for Job 1, 10 for Job 2)...")
        job1_apps = []
        job2_apps = []
        for u, r in users_resumes:
            app1 = Application(job_id=job1.id, candidate_id=u.id, resume_id=r.id, status='applied')
            app2 = Application(job_id=job2.id, candidate_id=u.id, resume_id=r.id, status='applied')
            db.session.add(app1)
            db.session.add(app2)
            job1_apps.append(app1)
            job2_apps.append(app2)
            
        db.session.commit()

        # 4. Evaluate Applications
        print("Evaluating Job 1: Front-End Developer (Quick Evaluation)...")
        scores1 = []
        for app_rec in job1_apps:
            match_data = calculate_quick_score(app_rec.resume, job1)
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
            scores1.append(match_data['final_score'])
        
        job1.pool_analysis = generate_pool_quick_analysis(job1, job1_apps, scores1, [], [])
        job1.evaluation_status = 'evaluated'
        job1.evaluated_at = datetime.utcnow()
        job1.evaluated_by_id = recruiter.id
        db.session.commit()

        print("Evaluating Job 2: Data Scientist (Intelligent Evaluation)...")
        scores2 = []
        for app_rec in job2_apps:
            try:
                match_data = calculate_match_score(app_rec.resume, job2, weights=job2.evaluation_weights)
            except Exception as e:
                print(f"AI evaluation failed for {app_rec.candidate_id}, falling back to quick: {e}")
                match_data = calculate_quick_score(app_rec.resume, job2)
                
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
            scores2.append(match_data['final_score'])

        job2.pool_analysis = generate_pool_ai_analysis(job2, job2_apps, scores2, [], [])
        job2.evaluation_status = 'evaluated'
        job2.evaluated_at = datetime.utcnow()
        job2.evaluated_by_id = recruiter.id
        db.session.commit()

        # 5. Shortlisting
        print("Shortlisting best candidates...")
        for job, apps in [(job1, job1_apps), (job2, job2_apps)]:
            recommended_threshold = job.pool_analysis.get('recommended_threshold', 60)
            job.min_match_score = recommended_threshold
            job.results_generated = True
            for app_rec in apps:
                score_record = MatchScore.query.filter_by(application_id=app_rec.id).order_by(MatchScore.id.desc()).first()
                if score_record and score_record.final_score >= recommended_threshold:
                    app_rec.status = 'shortlisted'
                else:
                    app_rec.status = 'rejected'
            db.session.commit()

        print("Demo data population complete. 2 Jobs, 20 Applications.")

if __name__ == '__main__':
    populate_demo()
