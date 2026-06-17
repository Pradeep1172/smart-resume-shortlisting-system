from app import create_app, db
from app.models.user import User

app = create_app()
with app.app_context():
    print("Dropping all existing tables for schema update...")
    db.drop_all()
    print("Recreating database tables...")
    db.create_all()
    
    # Seed recruiter user
    jane = User.query.filter_by(email="jane@recruiter.com").first()
    if not jane:
        jane = User(name="Jane Recruiter", email="jane@recruiter.com", role="recruiter")
        jane.set_password("password123")
        db.session.add(jane)
        print("Jane Recruiter seeded.")
        
    # Seed candidate user
    john = User.query.filter_by(email="john@candidate.com").first()
    if not john:
        john = User(name="John Candidate", email="john@candidate.com", role="candidate")
        john.set_password("password123")
        db.session.add(john)
        print("John Candidate seeded.")
        
    db.session.commit()
    print("Seeding complete.")
