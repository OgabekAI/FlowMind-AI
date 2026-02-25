from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, permissions, status
from django.utils import timezone
from django.db.models import Sum
from .models import PomodoroSession, PomodoroSettings
from .serializers import PomodoroSessionSerializer, PomodoroSettingsSerializer
from analytics.services import update_daily_stats


class PomodoroSettingsView(generics.RetrieveUpdateAPIView):
    """Get and update user's pomodoro preferences"""
    serializer_class = PomodoroSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        obj, created = PomodoroSettings.objects.get_or_create(
            user=self.request.user,
            defaults={
                'focus_minutes': 25,
                'short_break_minutes': 5,
                'long_break_minutes': 15,
                'sessions_before_long_break': 4,
            }
        )
        return obj


class PomodoroStartView(APIView):
    """
    User clicks START button.
    Creates a new session and tells React
    exactly how long to count down.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        task_id = request.data.get('task_id', None)
        session_type = request.data.get('session_type', 'focus')

        # Get user settings
        settings_obj, _ = PomodoroSettings.objects.get_or_create(
            user=user,
            defaults={
                'focus_minutes': 25,
                'short_break_minutes': 5,
                'long_break_minutes': 15,
                'sessions_before_long_break': 4,
            }
        )

        # Figure out duration based on session type
        if session_type == 'focus':
            duration = settings_obj.focus_minutes
        elif session_type == 'short_break':
            duration = settings_obj.short_break_minutes
        elif session_type == 'long_break':
            duration = settings_obj.long_break_minutes
        else:
            duration = settings_obj.focus_minutes

        # Count today's completed focus sessions
        today = timezone.now().date()
        completed_today = PomodoroSession.objects.filter(
            user=user,
            session_type='focus',
            status='completed',
            started_at__date=today
        ).count()

        # Session number is completed + 1
        session_number = completed_today + 1

        # Create session
        session_data = {
            'user': user,
            'session_type': session_type,
            'session_number': session_number,
            'duration_minutes': duration,
            'status': 'ongoing',
        }

        if task_id:
            from planner.models import Task
            try:
                task = Task.objects.get(pk=task_id, plan__user=user)
                session_data['task'] = task
            except Task.DoesNotExist:
                pass

        session = PomodoroSession.objects.create(**session_data)

        # Tell React what comes NEXT after this session
        sessions_before_long = settings_obj.sessions_before_long_break
        if session_type == 'focus':
            if session_number % sessions_before_long == 0:
                next_type = 'long_break'
                next_duration = settings_obj.long_break_minutes
            else:
                next_type = 'short_break'
                next_duration = settings_obj.short_break_minutes
        else:
            next_type = 'focus'
            next_duration = settings_obj.focus_minutes

        return Response({
            'session': PomodoroSessionSerializer(session).data,
            'duration_minutes': duration,
            'duration_seconds': duration * 60,
            'next': {
                'type': next_type,
                'duration_minutes': next_duration,
                'duration_seconds': next_duration * 60,
            }
        }, status=status.HTTP_201_CREATED)


class PomodoroCompleteView(APIView):
    """
    Timer hits 0 in React — user finished session.
    Mark it complete and tell React what to do next.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            session = PomodoroSession.objects.get(
                pk=pk,
                user=request.user
            )
        except PomodoroSession.DoesNotExist:
            return Response(
                {'error': 'Session not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if session.status != 'ongoing':
            return Response(
                {'error': 'Session already finished.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        session.status = 'completed'
        session.completed_at = timezone.now()
        session.save()

        # Update analytics
        update_daily_stats(request.user)

        # Get settings
        settings_obj, _ = PomodoroSettings.objects.get_or_create(
            user=request.user,
            defaults={
                'focus_minutes': 25,
                'short_break_minutes': 5,
                'long_break_minutes': 15,
                'sessions_before_long_break': 4,
            }
        )

        # Calculate what comes next
        if session.session_type == 'focus':
            today = timezone.now().date()
            completed_focus = PomodoroSession.objects.filter(
                user=request.user,
                session_type='focus',
                status='completed',
                started_at__date=today
            ).count()

            if completed_focus % settings_obj.sessions_before_long_break == 0:
                next_type = 'long_break'
                next_duration = settings_obj.long_break_minutes
                message = f'Great work! You completed {completed_focus} sessions. Take a long break!'
            else:
                next_type = 'short_break'
                next_duration = settings_obj.short_break_minutes
                message = 'Focus session done! Take a short break.'
        else:
            next_type = 'focus'
            next_duration = settings_obj.focus_minutes
            message = 'Break over! Ready to focus again?'

        return Response({
            'session': PomodoroSessionSerializer(session).data,
            'message': message,
            'next': {
                'type': next_type,
                'duration_minutes': next_duration,
                'duration_seconds': next_duration * 60,
            }
        })


class PomodoroCancelView(APIView):
    """User clicks CANCEL button mid session"""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            session = PomodoroSession.objects.get(
                pk=pk,
                user=request.user
            )
        except PomodoroSession.DoesNotExist:
            return Response(
                {'error': 'Session not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        session.status = 'cancelled'
        session.completed_at = timezone.now()
        session.save()

        return Response({
            'session': PomodoroSessionSerializer(session).data,
            'message': 'Session cancelled.',
        })


class PomodoroStatsView(APIView):
    """Get user's pomodoro statistics"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()

        all_sessions = PomodoroSession.objects.filter(
            user=request.user,
            status='completed',
            session_type='focus',
        )

        today_sessions = all_sessions.filter(started_at__date=today)

        total_focus = all_sessions.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0

        today_focus = today_sessions.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0

        # Get settings for context
        settings_obj, _ = PomodoroSettings.objects.get_or_create(
            user=request.user,
            defaults={
                'focus_minutes': 25,
                'short_break_minutes': 5,
                'long_break_minutes': 15,
                'sessions_before_long_break': 4,
            }
        )

        sessions_before_long = settings_obj.sessions_before_long_break
        sessions_until_long = sessions_before_long - (
            today_sessions.count() % sessions_before_long
        )

        return Response({
            'today': {
                'sessions': today_sessions.count(),
                'focus_minutes': today_focus,
                'focus_hours': round(today_focus / 60, 1),
                'sessions_until_long_break': sessions_until_long,
            },
            'all_time': {
                'sessions': all_sessions.count(),
                'focus_minutes': total_focus,
                'focus_hours': round(total_focus / 60, 1),
            },
            'settings': PomodoroSettingsSerializer(settings_obj).data,
        })

class PomodoroHistoryView(generics.ListAPIView):
    """Get recent pomodoro sessions"""
    serializer_class = PomodoroSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PomodoroSession.objects.filter(
            user=self.request.user
        ).order_by('-started_at')[:20]