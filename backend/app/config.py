import os
import pymysql
from dotenv import load_dotenv

# Load .env relative to this file's location (works regardless of launch CWD)
_HERE = os.path.dirname(os.path.abspath(__file__))
_DOTENV_PATH = os.path.join(_HERE, '..', '.env')
load_dotenv(dotenv_path=_DOTENV_PATH, override=True)

def get_database_uri():
    db_uri = os.environ.get('DATABASE_URL')
    
    # Resolve SQLite to an absolute path so it points to the same file from any execution CWD
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    absolute_sqlite_uri = f"sqlite:///{os.path.join(backend_dir, 'smart_resume_db.db')}"
    
    if not db_uri:
        return absolute_sqlite_uri
    
    # If MySQL URL is provided, test if MySQL server is running.
    # If not running, fall back to SQLite to ensure application functionality.
    if db_uri.startswith('mysql'):
        try:
            # Parse connection details
            rem = db_uri.split('://')[1]
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
                host_port, _ = location.split('/', 1)
            else:
                host_port = location
                
            if ':' in host_port:
                host, port_str = host_port.split(':', 1)
                port = int(port_str)
            else:
                host = host_port
                port = 3306
                
            # Quick connection test
            conn = pymysql.connect(
                host=host,
                user=user,
                password=password,
                port=port,
                connect_timeout=2
            )
            conn.close()
            return db_uri
        except Exception:
            print(f"MySQL database not reachable. Falling back to local absolute SQLite database: '{absolute_sqlite_uri}'")
            return absolute_sqlite_uri
            
    return db_uri

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-flask-key')
    SQLALCHEMY_DATABASE_URI = get_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'default-jwt-key')
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', './uploads')

    # Optional SMTP for OTP emails (falls back to console log in development)
    SMTP_HOST = os.environ.get('SMTP_HOST', '')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
    SMTP_USER = os.environ.get('SMTP_USER', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    SMTP_FROM = os.environ.get('SMTP_FROM', '')
    SMTP_USE_TLS = os.environ.get('SMTP_USE_TLS', 'true').lower() == 'true'
    
    # Ensure upload directory exists
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
