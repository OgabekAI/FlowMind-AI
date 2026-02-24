from django.utils import timezone
from django.core.cache import cache
from .groq_client import groq
from .prompts import (
    get_daily_plan_feedback_prompt,
    get_goal_feedback_prompt,
    get_chat_prompt,
    get_weekly_summary_prompt,
)


def generate_plan_feedback(user, plan):
    """Generate AI feedback for a daily plan"""
    cache_key = f'plan_feedback_{plan.id}'
    cached = cache.get(cache_key)
    if cached:
        return cached

    tasks = plan.tasks.all()
    if not tasks.exists():
        return "Add some tasks to your plan first, then I can give you feedback!"

    prompt = get_daily_plan_feedback_prompt(user, plan, tasks)
    feedback = groq.chat(prompt, max_tokens=300)

    # Cache for 1 hour
    cache.set(cache_key, feedback, 3600)

    # Save to plan
    plan.ai_feedback = feedback
    plan.ai_feedback_updated = timezone.now()
    plan.save(update_fields=['ai_feedback', 'ai_feedback_updated'])

    return feedback


def generate_goal_feedback(user, goal):
    """Generate AI coaching feedback for a goal"""
    cache_key = f'goal_feedback_{goal.id}_{goal.progress}'
    cached = cache.get(cache_key)
    if cached:
        return cached

    milestones = goal.milestones.all()
    prompt = get_goal_feedback_prompt(user, goal, milestones)
    feedback = groq.chat(prompt, max_tokens=300)

    # Cache for 2 hours
    cache.set(cache_key, feedback, 7200)

    # Save to goal
    goal.ai_feedback = feedback
    goal.ai_feedback_updated = timezone.now()
    goal.save(update_fields=['ai_feedback', 'ai_feedback_updated'])

    return feedback


def generate_chat_response(user, message):
    """Generate AI chat response with user context"""
    from goals.models import Goal
    from planner.models import DailyPlan

    # Get user context
    recent_goals = Goal.objects.filter(
        user=user,
        status='active'
    )[:5]

    today = timezone.now().date()
    try:
        today_plan = DailyPlan.objects.get(
            user=user,
            date=today
        ).tasks.all()
    except DailyPlan.DoesNotExist:
        today_plan = []

    prompt = get_chat_prompt(user, message, recent_goals, today_plan)
    response = groq.chat(prompt, temperature=0.8, max_tokens=400)

    return response


def generate_weekly_summary(user, stats):
    """Generate AI weekly summary"""
    cache_key = f'weekly_summary_{user.id}_{timezone.now().isocalendar()[1]}'
    cached = cache.get(cache_key)
    if cached:
        return cached

    prompt = get_weekly_summary_prompt(user, stats)
    summary = groq.chat(prompt, max_tokens=400)

    # Cache for 24 hours
    cache.set(cache_key, summary, 86400)

    return summary