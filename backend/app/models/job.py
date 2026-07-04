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
    evaluation_type = db.Column(db.Enum('keyword', 'weighted', 'ai', 'quick', name='job_evaluation_type'), default='keyword')
    ai_insights_enabled = db.Column(db.Boolean, default=True)  # Recruiter toggle: show/hide AI insights
    evaluation_weights = db.Column(db.JSON, nullable=True)  # Auto-computed {skills, experience, projects, resume_quality}
    evaluation_status = db.Column(db.Enum('pending', 'evaluated', 'evaluating', name='job_eval_status'), default='pending')
    pool_analysis = db.Column(db.JSON, nullable=True)
    results_generated = db.Column(db.Boolean, default=False)
    evaluation_strategy = db.Column(db.String(20), default='intelligent')  # 'quick' or 'intelligent'
    scores_outdated = db.Column(db.Boolean, default=False)  # True when strategy changed after evaluation
    evaluated_at = db.Column(db.DateTime, nullable=True)
    evaluated_by_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_external = db.Column(db.Boolean, default=False, server_default='0')
    company_name = db.Column(db.String(150), nullable=True)

    # Relationships
    recruiter = db.relationship('User', foreign_keys=[recruiter_id], backref=db.backref('jobs', lazy=True, cascade="all, delete-orphan"))
    evaluated_by = db.relationship('User', foreign_keys=[evaluated_by_id])

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
            'evaluation_strategy': self.evaluation_strategy or 'intelligent',
            'scores_outdated': bool(self.scores_outdated) if self.scores_outdated is not None else False,
            'evaluated_at': self.evaluated_at.isoformat() if self.evaluated_at else None,
            'evaluated_by': self.evaluated_by.name if self.evaluated_by else None,
            'evaluated_by_id': self.evaluated_by_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_external': bool(self.is_external) if self.is_external is not None else False,
            'company_name': self.company_name or (self.recruiter.company if (self.recruiter and self.recruiter.company) else (self.recruiter.name if self.recruiter else None)),
            'company_logo_path': self.recruiter.company_logo_path if self.recruiter else None,
            'applications_count': len(self.external_candidates) if self.is_external else (len(self.applications) if self.applications else 0),
            'has_shortlisted': any(c.status == 'shortlisted' for c in self.external_candidates) if self.is_external else False
        }

