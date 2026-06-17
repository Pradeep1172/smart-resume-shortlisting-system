from app import create_app, db
from app.models.user import User

app = create_app()
with app.app_context():
    admin = User.query.filter_by(email="admin@site.com").first()
    if not admin:
        admin = User(
            name="System Admin",
            email="admin@site.com",
            role="admin",
            email_verified=True,
            approval_status="approved",
        )
        admin.set_password("password123")
        db.session.add(admin)
        db.session.commit()
        print("Admin user seeded successfully!")
    else:
        print("Admin user already exists!")
