from django.contrib import admin
from accounts.models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'email', 'role', 'email_verified', 'approval_status', 'created_at')
    list_filter = ('role', 'email_verified', 'approval_status')
    search_fields = ('name', 'email', 'company')
    ordering = ('-id',)
