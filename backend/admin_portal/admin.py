from django.contrib import admin
from admin_portal.models import SystemSetting


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ('id', 'key', 'value')
    search_fields = ('key', 'value')
    ordering = ('key',)
