from django.urls import re_path
from notifications import views

urlpatterns = [
    re_path(r'^$', views.get_notifications, name='get_notifications'),
    re_path(r'^(?P<notif_id>\d+)/read/?$', views.read_notification, name='read_notification'),
    re_path(r'^read-all/?$', views.read_all_notifications, name='read_all_notifications'),
]
