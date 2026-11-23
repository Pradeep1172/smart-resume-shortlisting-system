from django.urls import re_path
from external_hiring import views

urlpatterns = [
    re_path(r'^jobs/?$', views.external_jobs, name='external_jobs'),
    re_path(r'^jobs/(?P<job_id>\d+)/?$', views.external_job_detail_delete, name='external_job_detail_delete'),
    re_path(r'^jobs/(?P<job_id>\d+)/upload/?$', views.upload_external_resumes, name='upload_external_resumes'),
    re_path(r'^jobs/(?P<job_id>\d+)/candidates/?$', views.get_external_candidates, name='get_external_candidates'),
    re_path(r'^jobs/(?P<job_id>\d+)/evaluate/?$', views.evaluate_external_candidates, name='evaluate_external_candidates'),
    re_path(r'^jobs/(?P<job_id>\d+)/shortlist/?$', views.shortlist_external_candidates, name='shortlist_external_candidates'),
    re_path(r'^candidates/(?P<candidate_id>\d+)/status/?$', views.update_external_candidate_status, name='update_external_candidate_status'),
    re_path(r'^candidates/(?P<candidate_id>\d+)/resume/?$', views.get_external_candidate_resume, name='get_external_candidate_resume'),
    re_path(r'^candidates/(?P<candidate_id>\d+)/?$', views.delete_external_candidate, name='delete_external_candidate'),
    re_path(r'^jobs/(?P<job_id>\d+)/download-shortlisted-resumes/?$', views.download_shortlisted_resumes, name='download_shortlisted_resumes'),
    re_path(r'^jobs/(?P<job_id>\d+)/send-shortlist-emails/?$', views.send_external_shortlist_emails, name='send_external_shortlist_emails'),
]
