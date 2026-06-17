import os
import pymysql
from dotenv import load_dotenv

# Load .env relative to this file's location (not CWD)
_HERE = os.path.dirname(os.path.abspath(__file__))
load_dotenv(dotenv_path=os.path.join(_HERE, '.env'), override=True)

# Pre-create database if not exists using raw pymysql connection
db_url = os.environ.get('DATABASE_URL', 'mysql+pymysql://root:@localhost/smart_resume_db')

try:
    if db_url.startswith('mysql+pymysql://'):
        rem = db_url[len('mysql+pymysql://'):]
        if '@' in rem:
            credentials, location = rem.split('@', 1)
            if ':' in credentials:
                user, password = credentials.split(':', 1)
            else:
                user, password = credentials, ''
        else:
            user, password = 'root', ''
            location = rem
            
        if '/' in location:
            host_port, db_name = location.split('/', 1)
            if '?' in db_name:
                db_name = db_name.split('?', 1)[0]
        else:
            host_port, db_name = location, 'smart_resume_db'
            
        if ':' in host_port:
            host, port_str = host_port.split(':', 1)
            port = int(port_str)
        else:
            host = host_port
            port = 3306
            
        # Connect to MySQL server (without database name) to verify existence
        conn = pymysql.connect(
            host=host,
            user=user,
            password=password,
            port=port
        )
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        cursor.close()
        conn.close()
        print(f"Database status checked. Target database '{db_name}' verified.")
except Exception as e:
    print(f"Database pre-creation warning: {e}")
    print("SQLAlchemy will attempt standard connection initialization.")

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
