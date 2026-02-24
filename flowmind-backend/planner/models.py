from django.db import models
from users.models import User
from goals.models import Goal


class DailyPlan(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='daily_plans'
    )
    date = models.DateField()
    note = models.TextField(blank=True)
    ai_feedback = models.TextField(blank=True)
    ai_feedback_updated = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'daily_plans'
        ordering = ['-date']
        unique_together = ['user', 'date']

    def __str__(self):
        return f'{self.user.email} — {self.date}'

    @property
    def completion_rate(self):
        total = self.tasks.count()
        if total == 0:
            return 0
        done = self.tasks.filter(is_done=True).count()
        return int((done / total) * 100)


class Task(models.Model):
    CATEGORY_CHOICES = [
        ('study', 'Study'),
        ('fitness', 'Fitness'),
        ('personal', 'Personal'),
        ('work', 'Work'),
        ('finance', 'Finance'),
        ('health', 'Health'),
        ('break', 'Break'),
        ('other', 'Other'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    plan = models.ForeignKey(
        DailyPlan,
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    goal = models.ForeignKey(
        Goal,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='personal'
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium'
    )
    start_time = models.TimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(default=30)
    is_done = models.BooleanField(default=False)
    done_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tasks'
        ordering = ['start_time', 'priority']

    def __str__(self):
        return f'{self.plan.date} — {self.title}'