import requests
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from .groq_client import groq
from .prompts import (
    get_daily_plan_feedback_prompt,
    get_goal_feedback_prompt,
    get_chat_system_prompt,
    get_weekly_summary_prompt,
)


def generate_plan_feedback(user, plan):
    """Generate AI feedback for a daily plan"""
    cache_key = f'plan_feedback_{plan.id}_{plan.completion_rate}'
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
    """Generate AI chat response with full conversation history"""
    from goals.models import Goal
    from planner.models import DailyPlan
    from .models import ChatMessage

    # Get user context
    recent_goals = Goal.objects.filter(
        user=user,
        status='active'
    )[:5]

    today = timezone.now().date()
    try:
        today_tasks = DailyPlan.objects.get(
            user=user,
            date=today
        ).tasks.all()
    except DailyPlan.DoesNotExist:
        today_tasks = []

    goals_text = "\n".join([
        f"- {g.title} ({g.progress}% complete, {g.category})"
        for g in recent_goals
    ]) or "No active goals."

    tasks_text = "\n".join([
        f"- {t.title} ({t.category}, done: {t.is_done})"
        for t in today_tasks
    ]) or "No tasks for today."

    # Get last 10 messages for conversation history
    history = ChatMessage.objects.filter(
        user=user
    ).order_by('-timestamp')[:10]
    history = list(reversed(history))

    # Build messages array
    messages = [
        {
            "role": "system",
            "content": get_chat_system_prompt(user, goals_text, tasks_text)
        }
    ]

    # Add conversation history
    for msg in history:
        messages.append({
            "role": msg.role,
            "content": msg.content
        })

    # Add current message
    messages.append({
        "role": "user",
        "content": message
    })

    # Call Groq API with full conversation
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 400,
    }

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        return data['choices'][0]['message']['content'].strip()
    except requests.exceptions.Timeout:
        return "Response timed out. Please try again."
    except requests.exceptions.HTTPError as e:
        return f"AI service error ({response.status_code}). Please try again."
    except Exception:
        return "Something went wrong. Please try again."


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