from datetime import datetime
from app.models import db


class CandidateProfile(db.Model):
    __tablename__ = 'candidate_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    phone = db.Column(db.String(30), nullable=True)
    headline = db.Column(db.String(200), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    education = db.Column(db.Text, nullable=True)
    certifications = db.Column(db.Text, nullable=True)
    github_url = db.Column(db.String(255), nullable=True)
    linkedin_url = db.Column(db.String(255), nullable=True)
    leetcode_url = db.Column(db.String(255), nullable=True)
    portfolio_url = db.Column(db.String(255), nullable=True)
    photo_path = db.Column(db.String(255), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('candidate_profile', uselist=False))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'phone': self.phone,
            'headline': self.headline,
            'bio': self.bio,
            'education': self.education,
            'certifications': self.certifications,
            'github_url': self.github_url,
            'linkedin_url': self.linkedin_url,
            'leetcode_url': self.leetcode_url,
            'portfolio_url': self.portfolio_url,
            'has_photo': bool(self.photo_path),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
