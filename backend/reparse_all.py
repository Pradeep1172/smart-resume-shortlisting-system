from app import create_app, db
from app.models.resume import Resume
from app.models.application import Application, MatchScore
from app.services.parser_service import parse_resume
from app.services.match_service import calculate_match_score

app = create_app()
with app.app_context():
    print("--- STEP 1: RE-PARSING RESUMES ---")
    for r in Resume.query.all():
        print(f"Parsing resume ID {r.id} ({r.file_name})...")
        parsed = parse_resume(r.file_path)
        r.extracted_text = parsed['extracted_text']
        r.skills = parsed['skills']
        r.experience_years = parsed['experience_years']
        r.projects = parsed['projects']
        print(f"-> Skills: {r.skills}")
        print(f"-> Experience Years: {r.experience_years}")
        
    print("\n--- STEP 2: RE-CALCULATING SCORES ---")
    for a in Application.query.all():
        print(f"Recalculating score for App ID {a.id} (Job: {a.job.title}, Candidate: {a.candidate.name})...")
        
        # Get active evaluation mode from latest match score
        latest_score = MatchScore.query.filter_by(application_id=a.id).order_by(MatchScore.calculated_at.desc()).first()
        eval_type = 'keyword'
        weights = None
        
        if latest_score:
            eval_type = latest_score.evaluation_type
            if latest_score.details and 'weights_applied' in latest_score.details:
                weights = latest_score.details['weights_applied']
                
        match_data = calculate_match_score(a.resume, a.job, eval_type=eval_type, weights=weights)
        
        new_score = MatchScore(
            application_id=a.id,
            match_percentage=match_data['match_percentage'],
            ai_score=match_data['ai_score'],
            final_score=match_data['final_score'],
            evaluation_type=match_data['evaluation_type'],
            details=match_data['details']
        )
        db.session.add(new_score)
        print(f"-> New score: {match_data['final_score']}% ({eval_type})")
        
    db.session.commit()
    print("\nRepair completed and database successfully synced!")
