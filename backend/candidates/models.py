from django.db import models
from accounts.models import User


class CandidateProfile(models.Model):
    id = models.AutoField(primary_key=True, db_column='id')
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='candidate_profile', db_column='user_id')
    phone = models.CharField(max_length=30, null=True, blank=True, db_column='phone')
    headline = models.CharField(max_length=200, null=True, blank=True, db_column='headline')
    bio = models.TextField(null=True, blank=True, db_column='bio')
    education = models.TextField(null=True, blank=True, db_column='education')
    certifications = models.TextField(null=True, blank=True, db_column='certifications')
    github_url = models.CharField(max_length=255, null=True, blank=True, db_column='github_url')
    linkedin_url = models.CharField(max_length=255, null=True, blank=True, db_column='linkedin_url')
    leetcode_url = models.CharField(max_length=255, null=True, blank=True, db_column='leetcode_url')
    portfolio_url = models.CharField(max_length=255, null=True, blank=True, db_column='portfolio_url')
    photo_path = models.CharField(max_length=255, null=True, blank=True, db_column='photo_path')
    updated_at = models.DateTimeField(null=True, blank=True, db_column='updated_at')

    class Meta:
        managed = False
        db_table = 'candidate_profiles'

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "phone": self.phone,
            "headline": self.headline,
            "bio": self.bio,
            "education": self.education,
            "certifications": self.certifications,
            "github_url": self.github_url,
            "linkedin_url": self.linkedin_url,
            "leetcode_url": self.leetcode_url,
            "portfolio_url": self.portfolio_url,
            "has_photo": bool(self.photo_path),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
