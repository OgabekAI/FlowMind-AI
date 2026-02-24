from django.db import models
from users.models import User


class DailyStats(models.Model):
    """
    Stores a snapshot of user productivity for each day.
    Auto-calculated when tasks are completed.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='daily_stats'
    )
    date = models.DateField()
    total_tasks = models.PositiveIntegerField(default=0)
    completed_tasks = models.PositiveIntegerField(default=0)
    total_focus_minutes = models.PositiveIntegerField(default=0)
    completion_rate = models.PositiveIntegerField(default=0)  # 0-100

    class Meta:
        db_table = 'daily_stats'
        ordering = ['-date']
        unique_together = ['user', 'date']

    def __str__(self):
        return f'{self.user.email} — {self.date} — {self.completion_rate}%'