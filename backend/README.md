# ShortlistIQ – Python Django Backend

This is the Python Django backend for **ShortlistIQ – AI-Powered Resume Shortlisting System**, fully migrated from ASP.NET Core (.NET/C#) with **zero functionality changes**.

It maintains 100% architectural, schema, and API compatibility with the React frontend and existing MySQL database (`smart_resume_db`).

---

## 1. Academic Syllabus Mapping (Course: INT253 – Web Development in Python Using Django)

The backend has been developed following the college syllabus for **INT253 – Web Development in Python Using Django**:

### UNIT I – Introduction to Django
- **Project Structure**: Clean Django project initialized (`config`) with standard settings and WSGI/ASGI configurations.
- **Modular Django Applications**: Instead of a monolithic app, the backend is partitioned into 9 domain-focused apps:
  - `accounts`: User authentication, registration, OTP verification, password hashing, and JWT tokens.
  - `candidates`: Candidate profiles, headlines, contact information, and profile picture uploads.
  - `recruiters`: Recruiter dashboards, company logos, company profiles, and preferences.
  - `jobs`: Job postings, deadlines, requirement specifications, and evaluation triggers.
  - `applications`: Application management, candidate privacy enforcement, recruitment pipeline transitions, and score association.
  - `resumes`: Multi-format resume uploads, file storage, parsing, and ATS dashboard insights.
  - `external_hiring`: Bulk external recruitment, ZIP archive processing, candidate evaluation, and shortlisted resume bundle downloads.
  - `admin_portal`: Admin dashboard metrics, user approvals, dynamic system configuration, and data exports.
  - `notifications`: User notification delivery, status tracking, and read receipts.
- **manage.py Commands**: Configured for command-line management, testing, and checks.

### UNIT II – Views and URLs
- **RESTful Endpoints**: All ASP.NET Core endpoints are mapped to Django REST Framework function-based views using `@api_view`.
- **URL Routing with Regular Expressions**: URL routing implemented using `re_path` with regex patterns (`r'^.../?$'`) supporting flexible trailing slashes without client redirects.
- **HTTP Methods & Status Codes**: Exact HTTP semantics preserved (`200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `500 Server Error`).
- **Standardized Snake Case Output**: JSON payload structures match the frontend expectations using exact snake_case dictionary formatting.

### UNIT III – Templates, Debugging and Testing
- **Django Testing Framework**: Comprehensive unit and integration test suite located in `accounts/tests.py` and `test_django_api.py`.
- **Debugging & Error Logging**: Configured error handling with detailed exceptions in development and clean JSON error responses for clients.

### UNIT IV – Forms and Serializers
- **Backend Validation**: Strict payload validation for incoming JSON data, multipart form uploads, and file extension checks (`.pdf`, `.docx`, `.doc`, `.png`, `.jpg`, `.webp`).
- **File Upload Parsing**: Integration with `MultiPartParser` and `FormParser` for seamless binary handling.

### UNIT V – Models, Migrations and Django Admin
- **Database Safety (`managed = False`)**: All Django models are mapped directly to existing MySQL tables (`smart_resume_db`) without modifying or dropping any table structure or records.
- **Foreign Key Relationships**: Relational mapping across `User`, `Job`, `Application`, `MatchScore`, and `Resume`.
- **Django Admin Interface**: Admin classes registered for all models (`accounts/admin.py`, `jobs/admin.py`, etc.) with searchable and filterable fields.
- **MariaDB 10.4 Compatibility**: Patched database features (`can_return_columns_from_insert = False`) to support MariaDB 10.4.32 / MySQL 5.7+ without requiring modern `RETURNING` clauses.

### UNIT VI – Cookies, Sessions and Authentication
- **Custom JWT Authentication**: `JwtAuthMiddleware` validates Bearer tokens (`Authorization: Bearer <token>`) and query tokens (`?token=<token>`).
- **BCrypt Password Security**: Secure password hashing with salt generation and backward-compatible verification.
- **Role-Based Access Control (RBAC)**: Custom `@auth_required(*allowed_roles)` decorator protecting endpoints for `candidate`, `recruiter`, and `admin`.
- **Recruiter Approval Workflow**: Recruiter registration approval flow with automated temporary password generation, forced first-time password changes, and email notification.

---

## 2. Directory Structure

```
backend/
├── manage.py
├── requirements.txt
├── .env.example
├── .env
├── test_django_api.py
├── config/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── accounts/
│   ├── admin.py
│   ├── auth.py          # JWT generation, decoding, middleware, @auth_required
│   ├── models.py        # User model with BCrypt password hashing
│   ├── tests.py         # Unit test suite
│   ├── urls.py
│   └── views.py         # Login, register, verify-otp, me, change-password
├── candidates/
│   ├── admin.py
│   ├── models.py        # CandidateProfile model
│   ├── urls.py
│   └── views.py         # Profile management & avatar upload
├── recruiters/
│   ├── admin.py
│   ├── models.py
│   ├── urls.py
│   └── views.py         # Recruiter dashboard metrics, settings, logo upload
├── jobs/
│   ├── admin.py
│   ├── models.py        # Job model
│   ├── urls.py
│   └── views.py         # Jobs CRUD, evaluation trigger, shortlist emails
├── applications/
│   ├── admin.py
│   ├── models.py        # Application & MatchScore models
│   ├── urls.py
│   └── views.py         # Job applications, pipeline status, privacy enforcement
├── resumes/
│   ├── admin.py
│   ├── models.py        # Resume model
│   ├── urls.py
│   └── views.py         # Resume file upload, parsing, dashboard insights
├── external_hiring/
│   ├── admin.py
│   ├── models.py        # ExternalCandidate model
│   ├── urls.py
│   └── views.py         # External jobs, bulk resume parsing, ZIP upload/export
├── admin_portal/
│   ├── admin.py
│   ├── models.py        # SystemSetting model
│   ├── urls.py
│   └── views.py         # Admin dashboard, recruiter approval, config, logs, exports
├── notifications/
│   ├── admin.py
│   ├── models.py        # Notification model
│   ├── urls.py
│   └── views.py         # Notifications list, mark as read, mark all read
└── services/
    ├── __init__.py
    ├── email_service.py         # OTP, shortlist, approval, rejection emails
    ├── resume_parser_service.py # PDF/DOCX/OCR text extraction, skills & experience
    └── match_service.py         # 20% Keyword + 60% ATS + 20% Gemini AI scoring
```

---

## 3. Recruitment Pipeline & Evaluation Engine

### Recruitment Pipeline
The exact 8-stage recruitment pipeline is strictly preserved:
1. `applied`
2. `pending_evaluation`
3. `evaluated`
4. `shortlisted`
5. `interview`
6. `selected`
7. `hired` (or `rejected`)

### Scoring Engine Logic
- **Keyword Matching (20%)**: Jaccard similarity and keyword frequency matching against required skills and description.
- **ATS Compatibility Score (60%)**: Experience evaluation (40%), skills coverage (45%), project relevance (15%), and structural section checks.
- **Google Gemini AI Evaluation (20%)**: Intelligent semantic analysis using Google Gemini API (`gemini-2.5-flash`). Fallback mechanism ensures reliable scoring when API limits are reached.
- **Candidate Privacy**: Candidates never see raw match percentages or recruiter-only scores in application views.

---

## 4. Setup and Installation

### Prerequisites
- Python 3.10+ (tested with Python 3.14)
- MySQL / MariaDB Server (running on port 3306 with database `smart_resume_db`)

### Installation Steps
1. Navigate to the Django backend directory:
   ```bash
   cd smart-resume-shortlisting-system/backend
   ```

2. Activate your virtual environment:
   ```powershell
   # Windows PowerShell
   ..\..\.venv\Scripts\Activate.ps1
   ```

3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables in `.env`:
   ```ini
   DEBUG=True
   SECRET_KEY=c21hcnRfcmVzdW1lX3Nob3J0bGlzdGluZ19zeXN0ZW1fc2VjcmV0X2tleQ==
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=smart_resume_db
   DB_USER=root
   DB_PASSWORD=
   JWT_SECRET_KEY=and0X3NlY3JldF9rZXlfZm9yX3Jlc3VtZV9zaG9ydGxpc3Rpbmc=
   GEMINI_API_KEY=YOUR_GEMINI_KEY
   GEMINI_MODEL=gemini-2.5-flash
   ```

5. Verify database connection and configuration:
   ```bash
   python manage.py check
   ```

6. Run the integration test suite:
   ```bash
   python test_django_api.py
   ```

7. Start the Django development server on port 5000:
   ```bash
   python manage.py runserver 0.0.0.0:5000
   ```

---

## 5. Running the Complete System (Frontend + Django Backend)

- **Backend**: Listens on `http://localhost:5000/api`
- **Frontend**: Run `npm run dev` in `smart-resume-shortlisting-system/frontend` (listens on `http://localhost:5173`)
- **Compatibility**: The React frontend connects directly to `http://localhost:5000/api` without any modifications.
