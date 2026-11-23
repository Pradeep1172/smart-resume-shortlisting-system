from django.urls import re_path
from applications import views

urlpatterns = [
    re_path(r'^$', views.applications_list_create, name='applications_list_create'),
    re_path(r'^bulk-status/?$', views.bulk_update_status, name='applications_bulk_status'),
    re_path(r'^reset-evaluations/?$', views.reset_evaluations, name='applications_reset_evaluations'),
    re_path(r'^(?P<app_id>\d+)/?$', views.application_detail, name='application_detail'),
    re_path(r'^(?P<app_id>\d+)/status/?$', views.update_status, name='application_update_status'),
    re_path(r'^(?P<app_id>\d+)/rescore/?$', views.rescore_application, name='application_rescore'),
    re_path(r'^(?P<app_id>\d+)/candidate-profile/?$', views.get_candidate_profile_for_recruiter, name='application_candidate_profile'),
]
