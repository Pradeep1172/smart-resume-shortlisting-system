-- Smart Resume Shortlisting System Reference MySQL Schema

CREATE DATABASE IF NOT EXISTS smart_resume_db;
USE smart_resume_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('candidate', 'recruiter', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recruiter_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    skills_required JSON NOT NULL, -- list of strings e.g. ["React", "Python"]
    experience_required INT DEFAULT 0,
    location VARCHAR(100) NULL,
    status ENUM('open', 'closed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recruiter_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Resumes Table
CREATE TABLE IF NOT EXISTS resumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    extracted_text LONGTEXT NULL,
    skills JSON NULL, -- list of strings parsed e.g. ["Python", "SQL"]
    projects JSON NULL, -- list of projects details
    experience_years FLOAT DEFAULT 0.0,
    parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    candidate_id INT NOT NULL,
    resume_id INT NOT NULL,
    status ENUM('applied', 'shortlisted', 'interview', 'rejected') DEFAULT 'applied',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Match Scores Table
CREATE TABLE IF NOT EXISTS match_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    match_percentage FLOAT NOT NULL,
    ai_score FLOAT NULL,
    final_score FLOAT NOT NULL,
    evaluation_type ENUM('keyword', 'weighted', 'ai') DEFAULT 'keyword',
    details JSON NULL, -- JSON detailing gaps and sub-scores
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
