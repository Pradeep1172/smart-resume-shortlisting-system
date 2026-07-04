import os
from dotenv import load_dotenv

# Load .env relative to this file's location (not CWD)
_HERE = os.path.dirname(os.path.abspath(__file__))
load_dotenv(dotenv_path=os.path.join(_HERE, '.env'), override=True)

# SQLite database will be automatically created by SQLAlchemy if it does not exist.

from app import create_app, db

app = create_app()

# Initialize tables inside application context
with app.app_context():
    try:
        db.create_all()
        from app.utils.db_migrate import ensure_auth_columns
        ensure_auth_columns()
        print("All database tables synced/created successfully.")
    except Exception as e:
        print(f"Error provisioning database tables: {e}")

# Always print registered routes on startup (works with both 'flask run' and 'python run.py')
print("\n=== Registered Routes ===")
with app.app_context():
    for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
        methods = ','.join(sorted(r for r in rule.methods if r not in ('HEAD', 'OPTIONS')))
        print(f"  [{methods:6s}] {rule.rule}")
print("========================\n")


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
