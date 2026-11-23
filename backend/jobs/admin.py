from django.contrib import admin
from jobs.models import Job


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'recruiter', 'location', 'status', 'is_external', 'created_at')
    list_filter = ('status', 'is_external')
    search_fields = ('title', 'description', 'location', 'company_name')
    ordering = ('-id',)
