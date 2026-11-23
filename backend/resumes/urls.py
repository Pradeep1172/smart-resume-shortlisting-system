from django.urls import re_path
from resumes import views

urlpatterns = [
    re_path(r'^$', views.resumes_list, name='resumes_list'),
    re_path(r'^upload/?$', views.upload_resume, name='upload_resume'),
    re_path(r'^dashboard-insights/?$', views.dashboard_insights, name='dashboard_insights'),
    re_path(r'^(?P<resume_id>\d+)/?$', views.resume_detail_delete, name='resume_detail_delete'),
    re_path(r'^(?P<resume_id>\d+)/file/?$', views.get_resume_file, name='get_resume_file'),
]
