from flask import Flask, jsonify
from flask_cors import CORS
from app.config import Config
from app.models import db

# Import models to ensure they are registered with SQLAlchemy
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.models.application import Application, MatchScore
from app.models.notification import Notification
from app.models.setting import SystemSetting
from app.models.candidate_profile import CandidateProfile
from app.models.external_candidate import ExternalCandidate


# Import blueprints
from app.routes.auth import auth_bp
from app.routes.jobs import jobs_bp
from app.routes.resumes import resumes_bp
from app.routes.applications import applications_bp
from app.routes.recruiter import recruiter_bp
from app.routes.admin import admin_bp
from app.routes.notifications import notifications_bp
from app.routes.profile import profile_bp
from app.routes.external_hiring import external_hiring_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for all API routes
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize SQLAlchemy database instance
    db.init_app(app)

    # Auto-migration check for ai_insights_enabled column
    with app.app_context():
        try:
            from sqlalchemy import text
            db.session.execute(text("SELECT ai_insights_enabled FROM jobs LIMIT 1"))
        except Exception:
            try:
                db.session.rollback()
                db.session.execute(text("ALTER TABLE jobs ADD COLUMN ai_insights_enabled BOOLEAN DEFAULT TRUE"))
                db.session.commit()
                print("Successfully altered jobs table to add ai_insights_enabled column.")
            except Exception as e:
                print(f"Auto-migration failed to add ai_insights_enabled column: {e}")

        # Auto-migration for evaluation_strategy column
        try:
            db.session.execute(text("SELECT evaluation_strategy FROM jobs LIMIT 1"))
        except Exception:
            try:
                db.session.rollback()
                db.session.execute(text("ALTER TABLE jobs ADD COLUMN evaluation_strategy VARCHAR(20) DEFAULT 'intelligent'"))
                db.session.commit()
                print("Successfully altered jobs table to add evaluation_strategy column.")
            except Exception as e:
                print(f"Auto-migration failed to add evaluation_strategy column: {e}")

        # Auto-migration for scores_outdated column
        try:
            db.session.execute(text("SELECT scores_outdated FROM jobs LIMIT 1"))
        except Exception:
            try:
                db.session.rollback()
                db.session.execute(text("ALTER TABLE jobs ADD COLUMN scores_outdated BOOLEAN DEFAULT 0"))
                db.session.commit()
                print("Successfully altered jobs table to add scores_outdated column.")
            except Exception as e:
                print(f"Auto-migration failed to add scores_outdated column: {e}")

        # Auto-migration for is_external column
        try:
            db.session.execute(text("SELECT is_external FROM jobs LIMIT 1"))
        except Exception:
            try:
                db.session.rollback()
                db.session.execute(text("ALTER TABLE jobs ADD COLUMN is_external BOOLEAN DEFAULT 0"))
                db.session.commit()
                print("Successfully altered jobs table to add is_external column.")
            except Exception as e:
                print(f"Auto-migration failed to add is_external column: {e}")

        # Auto-migration for last_login_at column
        try:
            db.session.execute(text("SELECT last_login_at FROM users LIMIT 1"))
        except Exception:
            try:
                db.session.rollback()
                db.session.execute(text("ALTER TABLE users ADD COLUMN last_login_at DATETIME"))
                db.session.commit()
                print("Successfully altered users table to add last_login_at column.")
            except Exception as e:
                print(f"Auto-migration failed to add last_login_at column: {e}")

        # Auto-migration for company_logo_path column on users
        try:
            db.session.execute(text("SELECT company_logo_path FROM users LIMIT 1"))
        except Exception:
            try:
                db.session.rollback()
                db.session.execute(text("ALTER TABLE users ADD COLUMN company_logo_path VARCHAR(255)"))
                db.session.commit()
                print("Successfully added company_logo_path column to users.")
            except Exception as e:
                print(f"Auto-migration failed for company_logo_path: {e}")

        # Auto-migration for company column on users
        try:
            db.session.execute(text("SELECT company FROM users LIMIT 1"))
        except Exception:
            try:
                db.session.rollback()
                db.session.execute(text("ALTER TABLE users ADD COLUMN company VARCHAR(100)"))
                db.session.commit()
                print("Successfully added company column to users.")
            except Exception as e:
                print(f"Auto-migration failed for company: {e}")

        # Auto-migration for must_change_password column on users
        try:
            db.session.execute(text("SELECT must_change_password FROM users LIMIT 1"))
        except Exception:
            try:
                db.session.rollback()
                db.session.execute(text("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT 0"))
                db.session.commit()
                print("Successfully added must_change_password column to users.")
            except Exception as e:
                print(f"Auto-migration failed for must_change_password: {e}")

        # Auto-migration for company_details column on users
        try:
            db.session.execute(text("SELECT company_details FROM users LIMIT 1"))
        except Exception:
            try:
                db.session.rollback()
                db.session.execute(text("ALTER TABLE users ADD COLUMN company_details TEXT"))
                db.session.commit()
                print("Successfully added company_details column to users.")
            except Exception as e:
                print(f"Auto-migration failed for company_details: {e}")

        # Create candidate_profiles table if it doesn't exist
        try:
            db.create_all()
        except Exception as e:
            print(f"db.create_all() error: {e}")

        # Ensure all columns from db_migrate are created
        try:
            from app.utils.db_migrate import ensure_auth_columns
            ensure_auth_columns()
        except Exception as e:
            print(f"Failed to run ensure_auth_columns: {e}")

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(jobs_bp, url_prefix='/api/jobs')
    app.register_blueprint(resumes_bp, url_prefix='/api/resumes')
    app.register_blueprint(applications_bp, url_prefix='/api/applications')
    app.register_blueprint(recruiter_bp, url_prefix='/api/recruiter')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(external_hiring_bp, url_prefix='/api/external-hiring')

    # Base Health Check Route
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'system': 'Smart Resume Shortlisting API',
            'version': '1.0.0'
        }), 200

    return app
