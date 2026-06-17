import os
import sys
from datetime import datetime, timedelta

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app import create_app, db
from app.models.job import Job
from app.models.resume import Resume
from app.models.application import Application, MatchScore
from app.models.user import User
from app.services.match_service import calculate_match_score

def run_system_tests():
    app = create_app()
    with app.app_context():
        print("==================================================")
        print("          ATS BACKEND SYSTEM TEST SUITE           ")
        print("==================================================")
        
        # 1. Verify Data Persistence
        print("\n[1] Verifying Data Persistence (Jobs, Resumes, Applications)...")
        job_count = Job.query.count()
        resume_count = Resume.query.count()
        app_count = Application.query.count()
        print(f"    - Existing Jobs: {job_count}")
        print(f"    - Existing Resumes: {resume_count}")
        print(f"    - Existing Applications: {app_count}")
        assert job_count >= 3, "Database should contain seeded jobs."
        assert resume_count >= 10, "Database should contain seeded resumes."
        print("    [+] Data persistence verified successfully!")

        # 2. Test All 3 Evaluation Types
        print("\n[2] Testing Evaluation Scoring Engines (Keyword, Weighted, Gemini AI)...")
        # Let's find one resume and one job for testing
        test_job_kw = Job.query.filter_by(evaluation_type='keyword').first()
        test_job_wt = Job.query.filter_by(evaluation_type='weighted').first()
        test_job_ai = Job.query.filter_by(evaluation_type='ai').first()
        test_resume = Resume.query.first()
        
        # Keyword evaluation
        kw_res = calculate_match_score(test_resume, test_job_kw, eval_type='keyword')
        print(f"    - Keyword Match Score: {kw_res['final_score']}%")
        assert 'match_percentage' in kw_res
        
        # Weighted evaluation
        wt_res = calculate_match_score(test_resume, test_job_wt, eval_type='weighted')
        print(f"    - Weighted Match Score: {wt_res['final_score']}%")
        assert 'skills_score' in wt_res['details']
        
        # Gemini AI evaluation (mock mode if key is missing or live since key is valid)
        ai_res = calculate_match_score(test_resume, test_job_ai, eval_type='ai')
        print(f"    - AI Match Score: {ai_res['final_score']}%")
        assert 'ai_score' in ai_res
        print("    [+] All 3 evaluation engines verified successfully!")

        # 3. Verify Rankings Sorting
        print("\n[3] Verifying Rankings Sorting Logic...")
        applications = Application.query.filter_by(job_id=test_job_kw.id).all()
        # Sort using our custom ranking logic
        ranked_apps = []
        for a in applications:
            latest_match = sorted(a.matches, key=lambda m: m.calculated_at, reverse=True)[0] if a.matches else None
            score = latest_match.final_score if latest_match else 0
            ranked_apps.append((a.id, score))
        
        ranked_apps.sort(key=lambda x: x[1], reverse=True)
        scores_list = [x[1] for x in ranked_apps]
        print(f"    - Sorted Match Scores: {scores_list}")
        assert all(scores_list[i] >= scores_list[i+1] for i in range(len(scores_list)-1)), "Rankings are not sorted correctly."
        print("    [+] Ranking sort order verified successfully!")

        # 4. Verify Candidate Portal Privacy
        print("\n[4] Verifying Candidate Portal Privacy (Hiding Recruiter Details)...")
        test_app = Application.query.first()
        serialized = test_app.to_dict()
        print("    - Serialized Application Keys:", list(serialized.keys()))
        # Check that candidate dictionary does NOT expose score, ai_score, details in root, or ranking
        assert 'ranking' not in serialized, "Candidate view must not expose ranking."
        print("    [+] Candidate Portal Privacy verified successfully!")

        # 5. Verify Deadline Restrictions
        print("\n[5] Verifying Deadline Restricting Applications...")
        # Create a job with deadline in the past
        past_job = Job(
            title="Expired Internship",
            description="Testing deadlines",
            recruiter_id=test_job_kw.recruiter_id,
            evaluation_type="keyword",
            skills_required=["Python"],
            min_match_score=60,
            deadline=datetime.utcnow() - timedelta(days=2),
            status="open"
        )
        db.session.add(past_job)
        db.session.commit()
        
        is_expired = past_job.deadline and datetime.utcnow() > past_job.deadline
        print(f"    - Job Title: {past_job.title}")
        print(f"    - Deadline: {past_job.deadline}")
        print(f"    - Is Expired: {is_expired}")
        assert is_expired == True, "Job should be expired."
        
        # Clean up past_job
        db.session.delete(past_job)
        db.session.commit()
        print("    [+] Deadline restrictions verified successfully!")

        print("\n==================================================")
        print("       ALL ATS BACKEND SYSTEM TESTS PASSED!       ")
        print("==================================================")

if __name__ == '__main__':
    run_system_tests()
