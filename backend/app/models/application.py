from datetime import datetime
from app.models import db

class Application(db.Model):
    __tablename__ = 'applications'

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False)
    candidate_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    resume_id = db.Column(db.Integer, db.ForeignKey('resumes.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.Enum('applied', 'shortlisted', 'interview', 'rejected', 'approved', name='application_status'), default='applied')
    applied_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    job = db.relationship('Job', backref=db.backref('applications', lazy=True, cascade="all, delete-orphan"))
    candidate = db.relationship('User', backref=db.backref('applications', lazy=True, cascade="all, delete-orphan"))
    resume = db.relationship('Resume', backref=db.backref('applications', lazy=True, cascade="all, delete-orphan"))
    
    # Matches will be fetched sequentially
    matches = db.relationship('MatchScore', backref='application', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        # We can extract the latest match score if it exists
        match_data = None
        if self.matches:
            # Get the latest match score
            match_data = sorted(self.matches, key=lambda m: m.calculated_at, reverse=True)[0].to_dict()

        return {
            'id': self.id,
            'job_id': self.job_id,
            'job_title': self.job.title if self.job else None,
            'candidate_id': self.candidate_id,
            'candidate_name': self.candidate.name if self.candidate else None,
            'candidate_email': self.candidate.email if self.candidate else None,
            'resume_id': self.resume_id,
            'resume_file_name': self.resume.file_name if self.resume else None,
            'resume': self.resume.to_dict() if self.resume else None,
            'job_min_match_score': self.job.min_match_score if self.job else 70,
            'status': self.status,
            'applied_at': self.applied_at.isoformat() if self.applied_at else None,
            'match_score': match_data
        }

class MatchScore(db.Model):
    __tablename__ = 'match_scores'

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id', ondelete='CASCADE'), nullable=False)
    match_percentage = db.Column(db.Float, nullable=False)
    ai_score = db.Column(db.Float, nullable=True)
    final_score = db.Column(db.Float, nullable=False)
    evaluation_type = db.Column(db.Enum('keyword', 'weighted', 'ai', name='evaluation_types'), default='keyword')
    details = db.Column(db.JSON, nullable=True)  # JSON structure containing breakdown details
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'application_id': self.application_id,
            'match_percentage': self.match_percentage,
            'ai_score': self.ai_score,
            'final_score': self.final_score,
            'evaluation_type': self.evaluation_type,
            'details': self.details,
            'calculated_at': self.calculated_at.isoformat() if self.calculated_at else None
        }
