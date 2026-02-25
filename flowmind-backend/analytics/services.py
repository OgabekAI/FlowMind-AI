from django.utils import timezone
from django.db.models import Sum, Avg
from planner.models import DailyPlan, Task
from goals.models import Goal
from .models import DailyStats
import datetime


def update_daily_stats(user, date=None):
    """
    Recalculates and saves daily stats for a user.
    Called automatically when a task is toggled done.
    """
    if date is None:
        date = timezone.now().date()

    try:
        plan = DailyPlan.objects.get(user=user, date=date)
        tasks = plan.tasks.all()
        total_tasks = tasks.count()
        completed_tasks = tasks.filter(is_done=True).count()
        total_focus_minutes = tasks.filter(
            is_done=True
        ).aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0

        completion_rate = 0
        if total_tasks > 0:
            completion_rate = int((completed_tasks / total_tasks) * 100)

    except DailyPlan.DoesNotExist:
        total_tasks = 0
        completed_tasks = 0
        total_focus_minutes = 0
        completion_rate = 0

    stats, created = DailyStats.objects.update_or_create(
        user=user,
        date=date,
        defaults={
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'total_focus_minutes': total_focus_minutes,
            'completion_rate': completion_rate,
        }
    )
    return stats


def get_weekly_stats(user):
    """
    Returns stats for the last 7 days.
    """
    today = timezone.now().date()
    week_ago = today - datetime.timedelta(days=6)

    # Get all days in range
    days = []
    current = week_ago
    while current <= today:
        days.append(current)
        current += datetime.timedelta(days=1)

    # Get stats for each day
    stats_map = {
        s.date: s
        for s in DailyStats.objects.filter(
            user=user,
            date__range=[week_ago, today]
        )
    }

    weekly_data = []
    for day in days:
        stat = stats_map.get(day)
        weekly_data.append({
            'date': str(day),
            'day_name': day.strftime('%a'),
            'total_tasks': stat.total_tasks if stat else 0,
            'completed_tasks': stat.completed_tasks if stat else 0,
            'completion_rate': stat.completion_rate if stat else 0,
            'focus_minutes': stat.total_focus_minutes if stat else 0,
            'focus_hours': round((stat.total_focus_minutes if stat else 0) / 60, 1),
        })

    # Summary stats
    total_tasks = sum(d['total_tasks'] for d in weekly_data)
    completed_tasks = sum(d['completed_tasks'] for d in weekly_data)
    total_focus = sum(d['focus_minutes'] for d in weekly_data)

    best_day = max(weekly_data, key=lambda d: d['completion_rate'])

    weekly_completion = 0
    if total_tasks > 0:
        weekly_completion = int((completed_tasks / total_tasks) * 100)

    return {
        'days': weekly_data,
        'summary': {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'completion_rate': weekly_completion,
            'total_focus_minutes': total_focus,
            'total_focus_hours': round(total_focus / 60, 1),
            'best_day': best_day['day_name'],
            'goals_progressed': Goal.objects.filter(
                user=user,
                updated_at__date__gte=week_ago
            ).count(),
        }
    }


def get_monthly_stats(user):
    """
    Returns stats for the last 30 days.
    """
    today = timezone.now().date()
    month_ago = today - datetime.timedelta(days=29)

    stats = DailyStats.objects.filter(
        user=user,
        date__range=[month_ago, today]
    ).order_by('date')

    # Build a map for quick lookup
    days_map = {s.date: s for s in stats}

    # Fill every day including days with no data
    serialized = []
    current = month_ago
    while current <= today:
        stat = days_map.get(current)
        serialized.append({
            'date': str(current),
            'day_name': current.strftime('%d/%m'),
            'total_tasks': stat.total_tasks if stat else 0,
            'completed_tasks': stat.completed_tasks if stat else 0,
            'completion_rate': stat.completion_rate if stat else 0,
            'focus_minutes': stat.total_focus_minutes if stat else 0,
            'focus_hours': round((stat.total_focus_minutes if stat else 0) / 60, 1),
        })
        current += datetime.timedelta(days=1)

    # Summary
    total_focus = sum(d['focus_minutes'] for d in serialized)
    total_tasks = sum(d['total_tasks'] for d in serialized)
    completed_tasks = sum(d['completed_tasks'] for d in serialized)
    active_days = len([d for d in serialized if d['total_tasks'] > 0])

    avg_completion = 0
    if active_days > 0:
        avg_completion = round(
            sum(d['completion_rate'] for d in serialized if d['total_tasks'] > 0) / active_days
        )

    best_day = max(serialized, key=lambda d: d['completion_rate'])

    monthly_completion = 0
    if total_tasks > 0:
        monthly_completion = int((completed_tasks / total_tasks) * 100)

    return {
        'days': serialized,
        'summary': {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'completion_rate': monthly_completion,
            'total_focus_minutes': total_focus,
            'total_focus_hours': round(total_focus / 60, 1),
            'avg_completion_rate': avg_completion,
            'active_days': active_days,
            'best_day': best_day['day_name'],
            'goals_progressed': Goal.objects.filter(
                user=user,
                updated_at__date__gte=month_ago
            ).count(),
        }
    }