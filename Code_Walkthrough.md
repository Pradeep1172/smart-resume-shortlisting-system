# Code Walkthrough

This document provides a granular look at the source code structure and the specific responsibilities of key files within the ShortlistIQ repository.

## 1. Project Directory Structure

```text
/
├── backend/
│   ├── app/
│   │   ├── __init__.py       # App factory, DB config, CORS, Blueprint registration
│   │   ├── config.py         # Environment configurations (DB URI, JWT Secret)
│   │   ├── models/           # SQLAlchemy ORM Models
│   │   │   ├── user.py, job.py, application.py, resume.py
│   │   ├── routes/           # API Endpoints mapped to modular Blueprints
│   │   │   ├── auth.py       # Login, Register, Profile
│   │   │   ├── recruiter.py  # Recruiter metrics, dashboard data
│   │   │   ├── jobs.py       # Job creation, fetching, application handling
│   │   │   ├── admin.py      # System metrics, user management
│   │   │   ├── applications.py
│   │   │   └── external_hiring.py # Public job link handling
│   │   ├── services/         # Business logic and external integrations
│   │   │   └── ai_service.py # Wrapper for Gemini API
│   ├── run.py                # Entry point for the Flask server
│   ├── populate_demo.py      # Script to seed database with realistic mock data
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── main.jsx          # React DOM mounting
    │   ├── App.jsx           # Router configuration & Context Providers
    │   ├── index.css         # Tailwind base, components, utilities, and CSS variables
    │   ├── context/
    │   │   └── AuthContext.jsx # Global state for user session, login/logout logic
    │   ├── services/
    │   │   └── api.js        # Axios instance with JWT request interceptors
    │   ├── components/       # Reusable UI components (Navbars, Modals)
    │   └── pages/            # Top-level route components
    │       ├── Landing.jsx
    │       ├── admin/        # Admin dashboard and nested pages
    │       ├── recruiter/    # Recruiter dashboard, job creation, applicant evaluation
    │       └── candidate/    # Candidate dashboard, profile, job browsing
```

## 2. Key Implementation Details

### 2.1 Backend Authentication (`routes/auth.py`)
Authentication is stateless using JSON Web Tokens (JWT). When a user logs in, the backend verifies the password hash using `werkzeug.security.check_password_hash`. Upon success, it issues a JWT containing the user's `id` and `role`. This token is sent in the `Authorization: Bearer <token>` header for all subsequent protected requests. The `@token_required` decorator validates this token and injects the `current_user` into the route context.

### 2.2 Database Modeling (`models/*.py`)
The system heavily utilizes SQLAlchemy relationships:
- `Job` has a foreign key to `User.id` (where role is recruiter).
- `Application` has foreign keys to `Job.id` and `User.id` (candidate), establishing a many-to-many relationship between candidates and jobs, with evaluation data stored on the associative `Application` table.
- Relationships use `backref` with `lazy=True` for efficient querying.

### 2.3 The AI Evaluation Logic
When an application is created in `routes/jobs.py` (or a dedicated evaluation service), the system retrieves the `resume_text` (or parsed JSON) and the `job_description`.
It crafts a highly specific prompt for the `google.generativeai` model:
> "Act as an expert technical recruiter. Evaluate the following candidate resume against the provided job description. Return ONLY a JSON object with two keys: `match_score` (an integer from 0-100) and `rationale` (a short string explaining the score)."

The backend attempts to parse the AI response using `json.loads()`. If successful, the `match_score` is directly saved to the `Application` record in the database, making it immediately queryable and sortable by the frontend.

### 2.4 Frontend API Client (`services/api.js`)
An Axios interceptor is configured to automatically attach the JWT token (stored in `localStorage`) to every outgoing request. If an API call returns a `401 Unauthorized`, the interceptor can trigger a logout flow, clearing local storage and redirecting the user to the login page.

### 2.5 Admin Navigation & Filtering (`AdminDashboard.jsx`, `DashboardPage.jsx`, `ApplicationsPage.jsx`)
The frontend heavily utilizes React Router's `useLocation` and `useNavigate` hooks to pass state without URL clutter. For example, clicking "Shortlisted Candidates" on the Admin Dashboard invokes `navigate('/applications', { state: { filter: 'shortlisted' } })`. The `ApplicationsPage` mounts, reads `location.state.filter`, dynamically adjusts its title, and instantly filters the table data locally using complex multi-conditional logic spanning multiple entity dimensions (Recruiter, Company, Score, Date Range) without requiring a separate backend endpoint.
