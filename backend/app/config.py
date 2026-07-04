import os
from dotenv import load_dotenv

# Load .env relative to this file's location (works regardless of launch CWD)
_HERE = os.path.dirname(os.path.abspath(__file__))
_DOTENV_PATH = os.path.join(_HERE, '..', '.env')
load_dotenv(dotenv_path=_DOTENV_PATH, override=True)

def get_database_uri():
    db_uri = os.environ.get('DATABASE_URL')
    if not db_uri:
        raise RuntimeError("DATABASE_URL is not set in the environment or .env file.")
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
