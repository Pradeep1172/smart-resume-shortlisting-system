from django.contrib import admin
from applications.models import Application, MatchScore


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('id', 'job', 'candidate', 'status', 'applied_at')
    list_filter = ('status',)
    search_fields = ('job__title', 'candidate__name', 'candidate__email')
    ordering = ('-id',)


@admin.register(MatchScore)
class MatchScoreAdmin(admin.ModelAdmin):
    list_display = ('id', 'application', 'match_percentage', 'ai_score', 'final_score', 'evaluation_type', 'calculated_at')
    list_filter = ('evaluation_type',)
    ordering = ('-id',)
