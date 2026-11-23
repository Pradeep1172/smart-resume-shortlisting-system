import json
from django.db import models
from accounts.models import User
from jobs.models import Job
from resumes.models import Resume


class Application(models.Model):
    id = models.AutoField(primary_key=True, db_column='id')
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications', db_column='job_id')
    candidate = models.ForeignKey(User, on_delete=models.CASCADE, related_name='applications', db_column='candidate_id')
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name='applications', db_column='resume_id')
    status = models.CharField(max_length=50, default='applied', db_column='status')
    applied_at = models.DateTimeField(null=True, blank=True, db_column='applied_at')

    class Meta:
        managed = False
        db_table = 'applications'

    def to_dict(self) -> dict:
        match_data = None
        latest_match = self.matches.order_by('-calculated_at', '-id').first()
        if latest_match:
            match_data = latest_match.to_dict()

        company_name = None
        logo_path = None
        recruiter_id = None
        recruiter_name = None
        job_title = None
        min_match_score = 70

        job = self.job
        if job:
            job_title = job.title
            recruiter_id = job.recruiter_id
            min_match_score = job.min_match_score if job.min_match_score is not None else 70

            recruiter = job.recruiter
            if recruiter:
                recruiter_name = recruiter.name
                company_name = recruiter.company if recruiter.company else recruiter.name
                logo_path = recruiter.company_logo_path

        candidate = self.candidate
        resume = self.resume

        return {
            "id": self.id,
            "job_id": self.job_id,
            "job_title": job_title,
            "recruiter_id": recruiter_id,
            "recruiter_name": recruiter_name,
            "company_name": company_name,
            "company_logo_path": logo_path,
            "candidate_id": self.candidate_id,
            "candidate_name": candidate.name if candidate else None,
            "candidate_email": candidate.email if candidate else None,
            "resume_id": self.resume_id,
            "resume_file_name": resume.file_name if resume else None,
            "resume": resume.to_dict() if resume else None,
            "job_min_match_score": min_match_score,
            "status": self.status,
            "applied_at": self.applied_at.isoformat() if self.applied_at else None,
            "match_score": match_data
        }


class MatchScore(models.Model):
    id = models.AutoField(primary_key=True, db_column='id')
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='matches', db_column='application_id')
    match_percentage = models.FloatField(db_column='match_percentage')
    ai_score = models.FloatField(null=True, blank=True, db_column='ai_score')
    final_score = models.FloatField(db_column='final_score')
    evaluation_type = models.CharField(max_length=20, default='keyword', null=True, blank=True, db_column='evaluation_type')
    details = models.TextField(null=True, blank=True, db_column='details')
    calculated_at = models.DateTimeField(null=True, blank=True, db_column='calculated_at')

    class Meta:
        managed = False
        db_table = 'match_scores'

    def to_dict(self) -> dict:
        parsed_details = None
        if self.details:
            try:
                parsed_details = json.loads(self.details)
            except Exception:
                parsed_details = self.details

        return {
            "id": self.id,
            "application_id": self.application_id,
            "match_percentage": self.match_percentage,
            "ai_score": self.ai_score,
            "final_score": self.final_score,
            "evaluation_type": self.evaluation_type,
            "details": parsed_details,
            "calculated_at": self.calculated_at.isoformat() if self.calculated_at else None
        }
