from django.urls import re_path
from jobs import views

urlpatterns = [
    re_path(r'^$', views.jobs_list_create, name='jobs_list_create'),
    re_path(r'^(?P<job_id>\d+)/?$', views.job_detail_update_delete, name='job_detail_update_delete'),
    re_path(r'^(?P<job_id>\d+)/evaluate/?$', views.evaluate_job, name='job_evaluate'),
    re_path(r'^(?P<job_id>\d+)/generate-results/?$', views.generate_results, name='job_generate_results'),
    re_path(r'^(?P<job_id>\d+)/send-shortlist-emails/?$', views.send_shortlist_emails_endpoint, name='job_send_shortlist_emails'),
]
