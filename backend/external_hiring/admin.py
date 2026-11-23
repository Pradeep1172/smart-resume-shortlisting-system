from django.contrib import admin
from external_hiring.models import ExternalCandidate


@admin.register(ExternalCandidate)
class ExternalCandidateAdmin(admin.ModelAdmin):
    list_display = ('id', 'job', 'external_candidate_id', 'name', 'email', 'status', 'final_score', 'created_at')
    list_filter = ('status', 'evaluation_type')
    search_fields = ('name', 'email', 'external_candidate_id', 'file_name')
    ordering = ('-id',)
