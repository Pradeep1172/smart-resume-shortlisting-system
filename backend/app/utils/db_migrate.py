from sqlalchemy import inspect, text

from app.models import db
from app.models.user import User


def ensure_auth_columns():
    """Add email verification / approval columns and missing jobs columns to existing databases."""
    inspector = inspect(db.engine)
    
    # --- USERS TABLE MIGRATION ---
    if "users" in inspector.get_table_names():
        existing_users = {col["name"] for col in inspector.get_columns("users")}
        is_mysql = str(db.engine.url).startswith("mysql")
        bool_type = "TINYINT(1)" if is_mysql else "BOOLEAN"

        additions_users = []
        if "email_verified" not in existing_users:
            additions_users.append(
                f"ALTER TABLE users ADD COLUMN email_verified {bool_type} NOT NULL DEFAULT 0"
            )
        if "approval_status" not in existing_users:
            additions_users.append(
                "ALTER TABLE users ADD COLUMN approval_status VARCHAR(20) NULL"
            )
        if "otp_code" not in existing_users:
            additions_users.append("ALTER TABLE users ADD COLUMN otp_code VARCHAR(6) NULL")
        if "otp_expires_at" not in existing_users:
            additions_users.append("ALTER TABLE users ADD COLUMN otp_expires_at DATETIME NULL")

        with db.engine.begin() as conn:
            for stmt in additions_users:
                try:
                    conn.execute(text(stmt))
                except Exception as e:
                    print(f"Error executing users migration '{stmt}': {e}")

        if additions_users:
            try:
                for user in User.query.all():
                    user.email_verified = True
                    if user.role in ('recruiter', 'admin'):
                        user.approval_status = 'approved'
                db.session.commit()
            except Exception as e:
                print(f"Error seeding user defaults post-migration: {e}")
                db.session.rollback()

    # --- JOBS TABLE MIGRATION ---
    if "jobs" in inspector.get_table_names():
        existing_jobs = {col["name"] for col in inspector.get_columns("jobs")}
        is_mysql = str(db.engine.url).startswith("mysql")
        
        json_type = "JSON" if is_mysql else "TEXT"
        bool_type = "TINYINT(1)" if is_mysql else "BOOLEAN"

        additions_jobs = []
        if "min_match_score" not in existing_jobs:
            additions_jobs.append("ALTER TABLE jobs ADD COLUMN min_match_score INT DEFAULT 70")
        if "evaluation_type" not in existing_jobs:
            additions_jobs.append("ALTER TABLE jobs ADD COLUMN evaluation_type VARCHAR(20) DEFAULT 'keyword'")
        if "ai_insights_enabled" not in existing_jobs:
            additions_jobs.append(f"ALTER TABLE jobs ADD COLUMN ai_insights_enabled {bool_type} DEFAULT 1")
        if "evaluation_weights" not in existing_jobs:
            additions_jobs.append(f"ALTER TABLE jobs ADD COLUMN evaluation_weights {json_type} DEFAULT NULL")
        if "evaluation_status" not in existing_jobs:
            additions_jobs.append("ALTER TABLE jobs ADD COLUMN evaluation_status VARCHAR(20) DEFAULT 'pending'")
        if "pool_analysis" not in existing_jobs:
            additions_jobs.append(f"ALTER TABLE jobs ADD COLUMN pool_analysis {json_type} DEFAULT NULL")
        if "results_generated" not in existing_jobs:
            additions_jobs.append(f"ALTER TABLE jobs ADD COLUMN results_generated {bool_type} DEFAULT 0")

        with db.engine.begin() as conn:
            for stmt in additions_jobs:
                try:
                    conn.execute(text(stmt))
                    print(f"Jobs migration: Executed '{stmt}' successfully.")
                except Exception as e:
                    print(f"Jobs migration error executing '{stmt}': {e}")

