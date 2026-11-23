import os
from pathlib import Path
from dotenv import load_dotenv
import pymysql

# PyMySQL setup
pymysql.install_as_MySQLdb()

# Bypass MariaDB version check for 10.4.32 compatibility
from django.db.backends.base.base import BaseDatabaseWrapper
BaseDatabaseWrapper.check_database_version_supported = lambda self: None

from django.db.backends.mysql.features import DatabaseFeatures
DatabaseFeatures.can_return_columns_from_insert = False
DatabaseFeatures.can_return_rows_from_bulk_insert = False

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env
env_paths = [
    BASE_DIR.parent / '.env',
    BASE_DIR / '.env',
    BASE_DIR.parent.parent / '.env',
]
for p in env_paths:
    if p.exists():
        load_dotenv(p, override=True)

# Production and development settings
SECRET_KEY = os.getenv('SECRET_KEY', 'shortlistiq-django-secret-key-2026')
DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 't')

allowed_hosts_raw = os.getenv('ALLOWED_HOSTS', '')
if allowed_hosts_raw:
    ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_raw.split(',') if h.strip()]
else:
    ALLOWED_HOSTS = ['*'] if DEBUG else ['localhost', '127.0.0.1', '.onrender.com']

if '.onrender.com' not in ALLOWED_HOSTS and '*' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('.onrender.com')

# Proxy SSL Header (Render terminates SSL at edge load balancer)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'corsheaders',
    'storages',

    # Project apps
    'accounts',
    'candidates',
    'recruiters',
    'jobs',
    'applications',
    'resumes',
    'external_hiring',
    'admin_portal',
    'notifications',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'accounts.auth.JwtAuthMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database configuration
DB_NAME = os.getenv('DB_NAME', 'smart_resume_db')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '3306')
DB_SSL_CA = os.getenv('DB_SSL_CA', '').strip()

db_options = {
    'charset': 'utf8mb4',
    'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
}

# Configure SSL/TLS verification if DB_SSL_CA is specified (TiDB Cloud)
if DB_SSL_CA:
    ca_candidate = os.path.abspath(os.path.join(str(BASE_DIR), DB_SSL_CA)) if not os.path.isabs(DB_SSL_CA) else DB_SSL_CA
    if not os.path.exists(ca_candidate):
        # Also check relative to workspace
        alt_path = os.path.abspath(os.path.join(str(BASE_DIR.parent), DB_SSL_CA))
        if os.path.exists(alt_path):
            ca_candidate = alt_path
    if os.path.exists(ca_candidate):
        db_options['ssl'] = {
            'ca': ca_candidate,
            'check_hostname': True,
        }

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': DB_NAME,
        'USER': DB_USER,
        'PASSWORD': DB_PASSWORD,
        'HOST': DB_HOST,
        'PORT': int(DB_PORT) if str(DB_PORT).isdigit() else 3306,
        'CONN_MAX_AGE': int(os.getenv('DB_CONN_MAX_AGE', '300')),
        'OPTIONS': db_options,
    }
}

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'UNAUTHENTICATED_USER': None,
}

# CORS & CSRF settings
cors_raw = os.getenv('CORS_ALLOWED_ORIGINS', '')
if cors_raw:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in cors_raw.split(',') if o.strip()]
else:
    CORS_ALLOWED_ORIGINS = [
        'https://shortlistiq-dev.vercel.app',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ]

CORS_ALLOW_ALL_ORIGINS = True if DEBUG and not cors_raw else False
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

csrf_raw = os.getenv('CSRF_TRUSTED_ORIGINS', '')
if csrf_raw:
    CSRF_TRUSTED_ORIGINS = [c.strip() for c in csrf_raw.split(',') if c.strip()]
else:
    CSRF_TRUSTED_ORIGINS = [
        'https://shortlistiq-dev.vercel.app',
        'https://*.onrender.com',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static & Upload files (WhiteNoise production configuration)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', './uploads')
MEDIA_URL = '/uploads/'
MEDIA_ROOT = os.path.abspath(os.path.join(str(BASE_DIR.parent), 'uploads'))

# Cloudflare R2 / S3 Storage Configuration
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID', '').strip()
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY', '').strip()
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME', '').strip()
AWS_S3_ENDPOINT_URL = os.getenv('AWS_S3_ENDPOINT_URL', '').strip()
AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'auto').strip()
AWS_S3_SIGNATURE_VERSION = os.getenv('AWS_S3_SIGNATURE_VERSION', 's3v4').strip()
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Brevo Transactional Email API Configuration
BREVO_API_KEY = os.getenv('BREVO_API_KEY', '')
BREVO_SENDER_EMAIL = os.getenv('BREVO_SENDER_EMAIL', 'shortlistiq.official@gmail.com')
BREVO_SENDER_NAME = os.getenv('BREVO_SENDER_NAME', 'ShortlistIQ')
BREVO_API_URL = os.getenv('BREVO_API_URL', 'https://api.brevo.com/v3/smtp/email')
