from django.urls import re_path
from candidates import views

urlpatterns = [
    re_path(r'^$', views.profile_handler, name='profile_handler'),
    re_path(r'^photo/?$', views.photo_handler, name='profile_photo_handler'),
    re_path(r'^photo/(?P<user_id>\d+)/?$', views.get_photo, name='profile_photo_get'),
]
