from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse

from candidates import views as candidate_views
from jobs import views as job_views
from applications import views as application_views
from resumes import views as resume_views
from notifications import views as notification_views


def health_check(request):
    return JsonResponse({
        "status": "healthy",
        "system": "Smart Resume Shortlisting API",
        "version": "1.0.0"
    }, status=200)


urlpatterns = [
    path('admin/', admin.site.urls),
    re_path(r'^health/?$', health_check, name='health_root'),
    re_path(r'^api/health/?$', health_check, name='health_api'),

    # Direct collection routes for zero-redirect support without trailing slash
    re_path(r'^api/profile/?$', candidate_views.profile_handler, name='direct_profile'),
    re_path(r'^api/jobs/?$', job_views.jobs_list_create, name='direct_jobs'),
    re_path(r'^api/applications/?$', application_views.applications_list_create, name='direct_applications'),
    re_path(r'^api/resumes/?$', resume_views.resumes_list, name='direct_resumes'),
    re_path(r'^api/notifications/?$', notification_views.get_notifications, name='direct_notifications'),

    # App route trees
    path('api/auth/', include('accounts.urls')),
    path('api/profile/', include('candidates.urls')),
    path('api/recruiter/', include('recruiters.urls')),
    path('api/jobs/', include('jobs.urls')),
    path('api/applications/', include('applications.urls')),
    path('api/resumes/', include('resumes.urls')),
    path('api/external-hiring/', include('external_hiring.urls')),
    path('api/admin/', include('admin_portal.urls')),
    path('api/notifications/', include('notifications.urls')),
]
