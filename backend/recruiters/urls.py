from django.urls import re_path
from recruiters import views

urlpatterns = [
    re_path(r'^dashboard/?$', views.get_dashboard, name='recruiter_dashboard'),
    re_path(r'^settings/?$', views.settings_handler, name='recruiter_settings'),
    re_path(r'^profile/?$', views.update_profile, name='recruiter_profile'),
    re_path(r'^upload-logo/?$', views.upload_logo, name='recruiter_upload_logo'),
    re_path(r'^logo/(?P<user_id>\d+)/?$', views.get_logo, name='recruiter_logo_get'),
]
