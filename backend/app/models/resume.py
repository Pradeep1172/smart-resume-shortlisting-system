from datetime import datetime
from app.models import db

class Resume(db.Model):
    __tablename__ = 'resumes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    extracted_text = db.Column(db.Text, nullable=True)
    skills = db.Column(db.JSON, nullable=True)  # JSON array, e.g. ["Python", "SQL"]
    projects = db.Column(db.JSON, nullable=True)  # JSON array or text representation
    experience_years = db.Column(db.Float, default=0.0)
    parsed_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to user
    user = db.relationship('User', backref=db.backref('resumes', lazy=True, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'file_name': self.file_name,
            'file_path': self.file_path,
            'extracted_text': self.extracted_text,
            'skills': self.skills,
            'projects': self.projects,
            'experience_years': self.experience_years,
            'parsed_at': self.parsed_at.isoformat() if self.parsed_at else None
        }
