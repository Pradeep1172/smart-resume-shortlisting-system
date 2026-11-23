from django.db import models


class SystemSetting(models.Model):
    id = models.AutoField(primary_key=True, db_column='id')
    key = models.CharField(max_length=100, unique=True, db_column='key')
    value = models.TextField(null=True, blank=True, db_column='value')

    class Meta:
        managed = False
        db_table = 'system_settings'

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "key": self.key,
            "value": self.value
        }
