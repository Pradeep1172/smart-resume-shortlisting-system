from django.contrib import admin
from candidates.models import CandidateProfile


@admin.register(CandidateProfile)
class CandidateProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'phone', 'headline')
    search_fields = ('user__name', 'user__email', 'phone', 'headline')
    ordering = ('-id',)
