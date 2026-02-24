from django.urls import path
from .views import (
    WeeklyStatsView,
    MonthlyStatsView,
    WeeklySummaryAIView,
    RefreshStatsView,
)

urlpatterns = [
    path('weekly/', WeeklyStatsView.as_view(), name='weekly-stats'),
    path('monthly/', MonthlyStatsView.as_view(), name='monthly-stats'),
    path('weekly/summary/', WeeklySummaryAIView.as_view(), name='weekly-summary'),
    path('refresh/', RefreshStatsView.as_view(), name='refresh-stats'),
]