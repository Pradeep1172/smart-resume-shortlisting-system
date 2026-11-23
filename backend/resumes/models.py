import json
from django.db import models
from accounts.models import User


class Resume(models.Model):
    id = models.AutoField(primary_key=True, db_column='id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='resumes', db_column='user_id')
    file_name = models.CharField(max_length=255, db_column='file_name')
    file_path = models.CharField(max_length=255, db_column='file_path')
    extracted_text = models.TextField(null=True, blank=True, db_column='extracted_text')
    skills = models.TextField(null=True, blank=True, db_column='skills')
    projects = models.TextField(null=True, blank=True, db_column='projects')
    experience_years = models.FloatField(default=0.0, null=True, blank=True, db_column='experience_years')
    parsed_at = models.DateTimeField(null=True, blank=True, db_column='parsed_at')

    class Meta:
        managed = False
        db_table = 'resumes'

    def to_dict(self) -> dict:
        parsed_skills = []
        if self.skills:
            try:
                parsed_skills = json.loads(self.skills)
            except Exception:
                parsed_skills = [s.strip() for s in self.skills.split(',') if s.strip()]

        parsed_projects = []
        if self.projects:
            try:
                parsed_projects = json.loads(self.projects)
            except Exception:
                parsed_projects = [self.projects]

        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else None,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "extracted_text": self.extracted_text,
            "skills": parsed_skills or [],
            "projects": parsed_projects or [],
            "experience_years": self.experience_years or 0.0,
            "parsed_at": self.parsed_at.isoformat() if self.parsed_at else None
        }
