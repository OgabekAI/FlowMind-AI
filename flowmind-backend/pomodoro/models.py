from django.db import models
from users.models import User
from planner.models import Task


class PomodoroSettings(models.Model):
    """User's preferred pomodoro settings"""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='pomodoro_settings'
    )
    focus_minutes = models.PositiveIntegerField(default=25)
    short_break_minutes = models.PositiveIntegerField(default=5)
    long_break_minutes = models.PositiveIntegerField(default=15)
    sessions_before_long_break = models.PositiveIntegerField(default=4)

    class Meta:
        db_table = 'pomodoro_settings'

    def __str__(self):
        return f'{self.user.email} pomodoro settings'


class PomodoroSession(models.Model):
    STATUS_CHOICES = [
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    TYPE_CHOICES = [
        ('focus', 'Focus'),
        ('short_break', 'Short Break'),
        ('long_break', 'Long Break'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='pomodoro_sessions'
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pomodoro_sessions'
    )
    session_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default='focus'
    )
    session_number = models.PositiveIntegerField(default=1)
    duration_minutes = models.PositiveIntegerField(default=25)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ongoing'
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'pomodoro_sessions'
        ordering = ['-started_at']

    def __str__(self):
        return f'{self.user.email} — {self.session_type} — {self.status}'