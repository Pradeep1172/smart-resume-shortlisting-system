from django.urls import re_path
from admin_portal import views

urlpatterns = [
    re_path(r'^dashboard/?$', views.get_admin_dashboard, name='admin_dashboard'),
    re_path(r'^users/?$', views.get_users, name='admin_users'),
    re_path(r'^users/(?P<user_id>\d+)/approve/?$', views.approve_recruiter, name='admin_approve_recruiter'),
    re_path(r'^users/(?P<user_id>\d+)/reject/?$', views.reject_recruiter, name='admin_reject_recruiter'),
    re_path(r'^users/(?P<user_id>\d+)/?$', views.delete_user, name='admin_delete_user'),
    re_path(r'^config/?$', views.config_view, name='admin_config'),
    re_path(r'^logs/?$', views.get_logs, name='admin_logs'),
    re_path(r'^jobs/(?P<job_id>\d+)/details/?$', views.get_job_details, name='admin_job_details'),
    re_path(r'^candidates/(?P<candidate_id>\d+)/details/?$', views.get_candidate_details, name='admin_candidate_details'),
    re_path(r'^export/recruiters/?$', views.export_recruiters, name='admin_export_recruiters'),
    re_path(r'^export/candidates/?$', views.export_candidates, name='admin_export_candidates'),
    re_path(r'^export/jobs/?$', views.export_jobs, name='admin_export_jobs'),
    re_path(r'^export/applications/?$', views.export_applications, name='admin_export_applications'),
    re_path(r'^export/hiring-report/?$', views.export_hiring_report, name='admin_export_hiring_report'),
    re_path(r'^export/recruiter-report/?$', views.export_recruiter_report, name='admin_export_recruiter_report'),
    re_path(r'^analytics/?$', views.get_analytics, name='admin_analytics'),
]
