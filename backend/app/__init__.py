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


# Import blueprints
from app.routes.auth import auth_bp
from app.routes.jobs import jobs_bp
from app.routes.resumes import resumes_bp
from app.routes.applications import applications_bp
from app.routes.recruiter import recruiter_bp
from app.routes.admin import admin_bp
from app.routes.notifications import notifications_bp

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

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(jobs_bp, url_prefix='/api/jobs')
    app.register_blueprint(resumes_bp, url_prefix='/api/resumes')
    app.register_blueprint(applications_bp, url_prefix='/api/applications')
    app.register_blueprint(recruiter_bp, url_prefix='/api/recruiter')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')

    # Base Health Check Route
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'system': 'Smart Resume Shortlisting API',
            'version': '1.0.0'
        }), 200

    return app
