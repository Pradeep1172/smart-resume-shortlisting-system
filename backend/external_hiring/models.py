import json
from django.db import models
from jobs.models import Job


class ExternalCandidate(models.Model):
    id = models.AutoField(primary_key=True, db_column='id')
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='external_candidates', db_column='job_id')
    external_candidate_id = models.CharField(max_length=50, unique=True, db_column='external_candidate_id')
    name = models.CharField(max_length=150, null=True, blank=True, db_column='name')
    email = models.CharField(max_length=150, null=True, blank=True, db_column='email')
    phone = models.CharField(max_length=50, null=True, blank=True, db_column='phone')
    file_name = models.CharField(max_length=255, db_column='file_name')
    file_path = models.CharField(max_length=255, db_column='file_path')
    extracted_text = models.TextField(null=True, blank=True, db_column='extracted_text')
    skills = models.TextField(null=True, blank=True, db_column='skills')
    experience_years = models.FloatField(default=0.0, null=True, blank=True, db_column='experience_years')
    projects = models.TextField(null=True, blank=True, db_column='projects')
    status = models.CharField(max_length=50, default='pending_evaluation', null=True, blank=True, db_column='status')
    match_percentage = models.FloatField(null=True, blank=True, db_column='match_percentage')
    ai_score = models.FloatField(null=True, blank=True, db_column='ai_score')
    final_score = models.FloatField(null=True, blank=True, db_column='final_score')
    evaluation_type = models.CharField(max_length=20, null=True, blank=True, db_column='evaluation_type')
    evaluation_details = models.TextField(null=True, blank=True, db_column='evaluation_details')
    created_at = models.DateTimeField(null=True, blank=True, db_column='created_at')

    class Meta:
        managed = False
        db_table = 'external_candidates'

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

        parsed_details = None
        if self.evaluation_details:
            try:
                parsed_details = json.loads(self.evaluation_details)
            except Exception:
                parsed_details = self.evaluation_details

        return {
            "id": self.id,
            "job_id": self.job_id,
            "job_title": self.job.title if self.job else None,
            "external_candidate_id": self.external_candidate_id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "file_name": self.file_name,
            "status": self.status,
            "match_percentage": self.match_percentage,
            "ai_score": self.ai_score,
            "final_score": self.final_score,
            "evaluation_type": self.evaluation_type,
            "evaluation_details": parsed_details,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "skills": parsed_skills or [],
            "experience_years": self.experience_years or 0.0,
            "projects": parsed_projects or []
        }
