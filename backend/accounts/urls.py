from django.urls import re_path
from accounts import views

urlpatterns = [
    re_path(r'^register/?$', views.register, name='auth_register'),
    re_path(r'^verify-otp/?$', views.verify_otp, name='auth_verify_otp'),
    re_path(r'^resend-otp/?$', views.resend_otp, name='auth_resend_otp'),
    re_path(r'^login/?$', views.login, name='auth_login'),
    re_path(r'^me/?$', views.get_profile, name='auth_me'),
    re_path(r'^change-password/?$', views.change_password, name='auth_change_password'),
]
