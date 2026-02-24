from django.db import models
from users.models import User

class Goal(models.Model):
    CATEGORY_CHOICES = [
        ('study', 'Study'),
        ('fitness', 'Fitness'),
        ('personal', 'Personal'),
        ('work', 'Work'),
        ('finance', 'Finance'),
        ('health', 'Health'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='goals'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='personal'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    progress = models.PositiveIntegerField(default=0)  # 0-100
    deadline = models.DateField(null=True, blank=True)
    ai_feedback = models.TextField(blank=True)
    ai_feedback_updated = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'goals'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} — {self.title}'

    @property
    def is_overdue(self):
        from django.utils import timezone
        if self.deadline and self.status == 'active':
            return self.deadline < timezone.now().date()
        return False

    @property
    def days_remaining(self):
        from django.utils import timezone
        if self.deadline:
            delta = self.deadline - timezone.now().date()
            return delta.days
        return None


class Milestone(models.Model):
    goal = models.ForeignKey(
        Goal,
        on_delete=models.CASCADE,
        related_name='milestones'
    )
    title = models.CharField(max_length=255)
    is_done = models.BooleanField(default=False)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'milestones'
        ordering = ['due_date']

    def __str__(self):
        return f'{self.goal.title} — {self.title}'