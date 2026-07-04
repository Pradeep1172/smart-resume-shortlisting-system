from datetime import datetime
from app.models import db

class ExternalCandidate(db.Model):
    __tablename__ = 'external_candidates'

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False)
    external_candidate_id = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(150), nullable=True)
    email = db.Column(db.String(150), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    extracted_text = db.Column(db.Text, nullable=True)
    skills = db.Column(db.JSON, nullable=True)
    experience_years = db.Column(db.Float, default=0.0)
    projects = db.Column(db.JSON, nullable=True)
    status = db.Column(db.String(50), default='pending_evaluation') # 'pending_evaluation', 'evaluated', 'shortlisted', 'rejected'
    
    # Evaluation results
    match_percentage = db.Column(db.Float, nullable=True)
    ai_score = db.Column(db.Float, nullable=True)
    final_score = db.Column(db.Float, nullable=True)
    evaluation_type = db.Column(db.String(20), nullable=True) # 'quick' or 'ai'
    evaluation_details = db.Column(db.JSON, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to Job
    job = db.relationship('Job', backref=db.backref('external_candidates', lazy=True, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            'id': self.id,
            'job_id': self.job_id,
            'job_title': self.job.title if self.job else None,
            'external_candidate_id': self.external_candidate_id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'file_name': self.file_name,
            'status': self.status,
            'match_percentage': self.match_percentage,
            'ai_score': self.ai_score,
            'final_score': self.final_score,
            'evaluation_type': self.evaluation_type,
            'evaluation_details': self.evaluation_details,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'skills': self.skills,
            'experience_years': self.experience_years,
            'projects': self.projects
        }
