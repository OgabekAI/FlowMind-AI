from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.utils import timezone
from .services import get_weekly_stats, get_monthly_stats, update_daily_stats
from .models import DailyStats
from .serializers import DailyStatsSerializer
from ai_engine.services import generate_weekly_summary


class WeeklyStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = get_weekly_stats(request.user)
        return Response(data)


class MonthlyStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = get_monthly_stats(request.user)
        return Response(data)


class WeeklySummaryAIView(APIView):
    """Get AI generated weekly summary"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        stats_data = get_weekly_stats(request.user)
        summary = generate_weekly_summary(
            request.user,
            stats_data['summary']
        )
        return Response({
            'summary': summary,
            'stats': stats_data['summary'],
        })


class RefreshStatsView(APIView):
    """Manually recalculate today's stats"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        today = timezone.now().date()
        stats = update_daily_stats(request.user, today)
        serializer = DailyStatsSerializer(stats)
        return Response(serializer.data)