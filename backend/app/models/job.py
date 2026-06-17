from datetime import datetime
from app.models import db

class Job(db.Model):
    __tablename__ = 'jobs'

    id = db.Column(db.Integer, primary_key=True)
    recruiter_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    skills_required = db.Column(db.JSON, nullable=False)  # JSON array, e.g. ["Python", "Flask", "React"]
    experience_required = db.Column(db.Integer, default=0) # In years
    location = db.Column(db.String(100), nullable=True)
    status = db.Column(db.Enum('open', 'closed', 'expired', name='job_status'), default='open')
    deadline = db.Column(db.DateTime, nullable=True)
    min_match_score = db.Column(db.Integer, default=70)
    evaluation_type = db.Column(db.Enum('keyword', 'weighted', 'ai', name='job_evaluation_type'), default='keyword')
    ai_insights_enabled = db.Column(db.Boolean, default=True)  # Recruiter toggle: show/hide AI insights
    evaluation_weights = db.Column(db.JSON, nullable=True)  # Auto-computed {skills, experience, projects, resume_quality}
    evaluation_status = db.Column(db.Enum('pending', 'evaluated', name='job_eval_status'), default='pending')
    pool_analysis = db.Column(db.JSON, nullable=True)
    results_generated = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to user
    recruiter = db.relationship('User', backref=db.backref('jobs', lazy=True, cascade="all, delete-orphan"))

    def to_dict(self):
        # Dynamically check deadline
        current_status = self.status
        if self.deadline and datetime.utcnow() > self.deadline and self.status == 'open':
            current_status = 'expired'

        return {
            'id': self.id,
            'recruiter_id': self.recruiter_id,
            'recruiter_name': self.recruiter.name if self.recruiter else None,
            'title': self.title,
            'description': self.description,
            'skills_required': self.skills_required,
            'experience_required': self.experience_required,
            'location': self.location,
            'status': current_status,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'min_match_score': self.min_match_score,
            'evaluation_type': self.evaluation_type,
            'ai_insights_enabled': self.ai_insights_enabled if self.ai_insights_enabled is not None else True,
            'evaluation_weights': self.evaluation_weights,
            'evaluation_status': self.evaluation_status,
            'pool_analysis': self.pool_analysis,
            'results_generated': self.results_generated,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
