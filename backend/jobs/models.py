import json
from datetime import datetime, timezone
from django.db import models
from accounts.models import User
from utils.date_utils import is_past_deadline, ensure_utc_aware


class Job(models.Model):
    id = models.AutoField(primary_key=True, db_column='id')
    recruiter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='jobs', db_column='recruiter_id')
    title = models.CharField(max_length=150, db_column='title')
    description = models.TextField(db_column='description')
    skills_required = models.TextField(default='[]', db_column='skills_required')
    experience_required = models.IntegerField(default=0, null=True, blank=True, db_column='experience_required')
    location = models.CharField(max_length=100, null=True, blank=True, db_column='location')
    status = models.CharField(max_length=20, default='open', db_column='status')  # open, closed, expired
    deadline = models.DateTimeField(null=True, blank=True, db_column='deadline')
    min_match_score = models.IntegerField(default=70, null=True, blank=True, db_column='min_match_score')
    evaluation_type = models.CharField(max_length=20, default='keyword', null=True, blank=True, db_column='evaluation_type')
    ai_insights_enabled = models.BooleanField(default=True, null=True, blank=True, db_column='ai_insights_enabled')
    evaluation_weights = models.TextField(null=True, blank=True, db_column='evaluation_weights')
    evaluation_status = models.CharField(max_length=20, default='pending', null=True, blank=True, db_column='evaluation_status')
    pool_analysis = models.TextField(null=True, blank=True, db_column='pool_analysis')
    results_generated = models.BooleanField(default=False, null=True, blank=True, db_column='results_generated')
    evaluation_strategy = models.CharField(max_length=20, default='intelligent', null=True, blank=True, db_column='evaluation_strategy')
    scores_outdated = models.BooleanField(default=False, null=True, blank=True, db_column='scores_outdated')
    evaluated_at = models.DateTimeField(null=True, blank=True, db_column='evaluated_at')
    evaluated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='evaluated_jobs', db_column='evaluated_by_id')
    created_at = models.DateTimeField(null=True, blank=True, db_column='created_at')
    is_external = models.BooleanField(default=False, null=True, blank=True, db_column='is_external')
    company_name = models.CharField(max_length=150, null=True, blank=True, db_column='company_name')

    class Meta:
        managed = False
        db_table = 'jobs'

    def get_skills_list(self) -> list[str]:
        if not self.skills_required:
            return []
        try:
            val = json.loads(self.skills_required)
            if isinstance(val, list):
                return [str(s).strip() for s in val if str(s).strip()]
            return [str(val).strip()]
        except Exception:
            return [s.strip() for s in self.skills_required.split(',') if s.strip()]

    def to_dict(self) -> dict:
        current_status = self.status
        if self.deadline and is_past_deadline(self.deadline) and current_status == "open":
            current_status = "expired"

        parsed_skills = self.get_skills_list()

        parsed_weights = None
        if self.evaluation_weights:
            try:
                parsed_weights = json.loads(self.evaluation_weights)
            except Exception:
                pass

        parsed_pool = None
        if self.pool_analysis:
            try:
                parsed_pool = json.loads(self.pool_analysis)
            except Exception:
                pass

        company_name_val = self.company_name
        recruiter = self.recruiter
        if not company_name_val and recruiter:
            company_name_val = recruiter.company if recruiter.company else recruiter.name

        app_count = 0
        has_shortlisted = False
        if bool(self.is_external):
            try:
                app_count = self.external_candidates.count()
                has_shortlisted = self.external_candidates.filter(status='shortlisted').exists()
            except Exception:
                pass
        else:
            try:
                app_count = self.applications.count()
            except Exception:
                pass

        return {
            "id": self.id,
            "recruiter_id": self.recruiter_id,
            "recruiter_name": recruiter.name if recruiter else None,
            "title": self.title,
            "description": self.description,
            "skills_required": parsed_skills,
            "experience_required": self.experience_required or 0,
            "location": self.location,
            "status": current_status,
            "deadline": ensure_utc_aware(self.deadline).isoformat() if self.deadline else None,
            "min_match_score": self.min_match_score if self.min_match_score is not None else 70,
            "evaluation_type": self.evaluation_type,
            "ai_insights_enabled": bool(self.ai_insights_enabled) if self.ai_insights_enabled is not None else True,
            "evaluation_weights": parsed_weights,
            "evaluation_status": self.evaluation_status,
            "pool_analysis": parsed_pool,
            "results_generated": bool(self.results_generated),
            "evaluation_strategy": self.evaluation_strategy or "intelligent",
            "scores_outdated": bool(self.scores_outdated),
            "evaluated_at": self.evaluated_at.isoformat() if self.evaluated_at else None,
            "evaluated_by": self.evaluated_by.name if self.evaluated_by else None,
            "evaluated_by_id": self.evaluated_by_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_external": bool(self.is_external),
            "company_name": company_name_val,
            "company_logo_path": recruiter.company_logo_path if recruiter else None,
            "applications_count": app_count,
            "has_shortlisted": has_shortlisted
        }
