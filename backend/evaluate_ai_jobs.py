import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app import create_app, db
from app.models.job import Job
from app.models.application import Application, MatchScore
from app.services.match_service import calculate_match_score

def evaluate_ai_applications():
    app = create_app()
    with app.app_context():
        # Find the Data Scientist job (AI evaluation type)
        job = Job.query.filter_by(title="Data Scientist").first()
        if not job:
            print("[x] Error: Data Scientist job post not found.")
            return
            
        print(f"=== Evaluating Applications for Job: {job.title} ===")
        print(f"Evaluation Type: {job.evaluation_type}")
        
        # Get all applications for this job
        applications = Application.query.filter_by(job_id=job.id).all()
        print(f"Found {len(applications)} applications to evaluate.")
        
        for index, application in enumerate(applications, 1):
            print(f"\n[{index}/{len(applications)}] Evaluating candidate: {application.candidate.name}")
            print(f"Resume File: {application.resume.file_name}")
            
            # Delete any existing match scores to ensure clean database write
            MatchScore.query.filter_by(application_id=application.id).delete()
            
            # Calculate match using AI engine
            try:
                res = calculate_match_score(
                    resume=application.resume,
                    job=job,
                    eval_type='ai'
                )
                
                # Create a new MatchScore row
                match_score = MatchScore(
                    application_id=application.id,
                    match_percentage=res['match_percentage'],
                    ai_score=res['ai_score'],
                    final_score=res['final_score'],
                    evaluation_type=res['evaluation_type'],
                    details=res['details']
                )
                
                db.session.add(match_score)
                db.session.commit()
                
                print(f"[+] Evaluated successfully!")
                print(f"    AI Score: {match_score.ai_score}%")
                print(f"    AI Recommendation: {match_score.details.get('ai_recommendation')}")
                print(f"    AI Analysis (Summary): {match_score.details.get('ai_analysis')[:120]}...")
                
            except Exception as e:
                db.session.rollback()
                print(f"[x] Error evaluating {application.candidate.name}: {e}")
                
        print("\n=== AI Job Evaluation Complete ===")

if __name__ == '__main__':
    evaluate_ai_applications()
