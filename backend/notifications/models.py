from django.db import models
from accounts.models import User


class Notification(models.Model):
    id = models.AutoField(primary_key=True, db_column='id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', db_column='user_id')
    message = models.TextField(db_column='message')
    is_read = models.BooleanField(default=False, null=True, blank=True, db_column='is_read')
    created_at = models.DateTimeField(null=True, blank=True, db_column='created_at')

    class Meta:
        managed = False
        db_table = 'notifications'

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "message": self.message,
            "is_read": bool(self.is_read),
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
