from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from planner.models import DailyPlan, Task
from goals.models import Goal
from .services import (
    generate_plan_feedback,
    generate_goal_feedback,
    generate_chat_response,
)
from .models import ChatMessage
from .serializers import ChatMessageSerializer


class PlanFeedbackView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        plan = get_object_or_404(
            DailyPlan,
            user=request.user,
            date=today
        )
        language = request.headers.get('Accept-Language', 'en')[:2]
        if language not in ('uz', 'ru', 'en'):
            language = 'en'
        feedback = generate_plan_feedback(request.user, plan, language)
        return Response({
            'feedback': feedback,
            'plan_date': str(plan.date),
            'completion_rate': plan.completion_rate,
        })


class GoalFeedbackView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, goal_id):
        goal = get_object_or_404(
            Goal,
            pk=goal_id,
            user=request.user
        )
        language = request.headers.get('Accept-Language', 'en')[:2]
        if language not in ('uz', 'ru', 'en'):
            language = 'en'
        feedback = generate_goal_feedback(request.user, goal, language)
        return Response({
            'feedback': feedback,
            'goal_title': goal.title,
            'progress': goal.progress,
        })


class ChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        messages = ChatMessage.objects.filter(
            user=request.user
        ).order_by('-timestamp')[:20]
        serializer = ChatMessageSerializer(
            reversed(list(messages)),
            many=True
        )
        return Response(serializer.data)

    def post(self, request):
        message = request.data.get('message', '').strip()

        if not message:
            return Response(
                {'error': 'Message cannot be empty.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(message) > 500:
            return Response(
                {'error': 'Message too long. Max 500 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save user message
        ChatMessage.objects.create(
            user=request.user,
            role='user',
            content=message
        )

        # Get AI response
        language = request.headers.get('Accept-Language', 'en')[:2]
        if language not in ('uz', 'ru', 'en'):
            language = 'en'
        ai_response = generate_chat_response(request.user, message, language)

        # Save AI message
        ai_msg = ChatMessage.objects.create(
            user=request.user,
            role='assistant',
            content=ai_response
        )

        return Response({
            'message': message,
            'response': ai_response,
            'timestamp': ai_msg.timestamp,
        })