# Localhost Setup & Execution Guide — Smart Resume Shortlisting System

This guide provides step-by-step instructions to run the **Smart Resume Shortlisting System** locally on a Windows laptop using localhost with the **Python Django** backend and **React** frontend.

---

## 1. System Architecture & Prerequisites

- **Frontend:** React 19 + Vite (runs on `http://localhost:5173`)
- **Backend:** Python Django + Django REST Framework (runs on `http://localhost:5000`)
- **Database:** Local MySQL Server 8.0 / XAMPP MariaDB (port `3306`)
- **ORM:** Django ORM (`pymysql`)
- **Email Service:** Python smtplib with TLS/SSL (Gmail App Password, Brevo, Outlook, etc.)
- **AI Engine:** Google Gemini Flash (`gemini-2.5-flash` / `gemini-1.5-flash`)

### Prerequisites Installed on Windows:
1. **Python 3.10+** (verify with `python --version`)
2. **Node.js 18+ & npm** (verify with `node -v` and `npm -v`)
3. **MySQL Server 8.0** or **XAMPP MySQL** (running on port `3306`)

---

## 2. Environment Configuration

### Step 2.1: Configure Backend `.env`
Ensure `.env` exists in the `backend/` directory:

```dotenv
DEBUG=True
SECRET_KEY=shortlistiq-django-secret-key-2026

# Database Configuration (MySQL / MariaDB)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=smart_resume_db
DB_USER=root
DB_PASSWORD=

# JWT Authentication
JWT_SECRET_KEY=shortlistiq-jwt-secret-key-2026
JWT_EXPIRATION_HOURS=24

# Google Gemini AI Evaluation
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-2.5-flash

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=shortlistiq.official@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=ShortlistIQ <shortlistiq.official@gmail.com>
SMTP_USE_TLS=True

# Uploads
UPLOAD_FOLDER=./uploads
```

### Step 2.2: Configure Frontend `.env`
Ensure `frontend\.env` contains:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

---

## 3. Database Setup

Ensure MySQL is running on port 3306 and the database `smart_resume_db` is created:

```powershell
mysql -u root -e "CREATE DATABASE IF NOT EXISTS smart_resume_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

## 4. Running the Backend (Python Django)

Open a Windows PowerShell terminal in `backend`:

```powershell
cd backend
..\..\.venv\Scripts\Activate.ps1
python manage.py runserver 0.0.0.0:5000
```

The Django backend will start listening at:
- **API URL:** `http://localhost:5000/api`
- **Health Check:** `http://localhost:5000/health`
- **Django Admin:** `http://localhost:5000/admin/`

---

## 5. Running the Frontend (React + Vite)

Open a second Windows PowerShell terminal in `frontend`:

```powershell
cd frontend
npm install
npm run dev
```

The React frontend will be available at:
- `http://localhost:5173`

---

## 6. Testing & Automated Verification

To run the automated backend test suite:

```powershell
cd backend
python test_api.py
```
