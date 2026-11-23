from django.contrib import admin
from resumes.models import Resume


@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'file_name', 'experience_years', 'parsed_at')
    search_fields = ('user__name', 'user__email', 'file_name')
    ordering = ('-id',)
