from django.urls import path
from .views import (
    PomodoroSettingsView,
    PomodoroStartView,
    PomodoroCompleteView,
    PomodoroCancelView,
    PomodoroStatsView,
    PomodoroHistoryView,
)

urlpatterns = [
    path('settings/', PomodoroSettingsView.as_view(), name='pomodoro-settings'),
    path('start/', PomodoroStartView.as_view(), name='pomodoro-start'),
    path('sessions/<int:pk>/complete/', PomodoroCompleteView.as_view(), name='pomodoro-complete'),
    path('sessions/<int:pk>/cancel/', PomodoroCancelView.as_view(), name='pomodoro-cancel'),
    path('stats/', PomodoroStatsView.as_view(), name='pomodoro-stats'),
    path('history/', PomodoroHistoryView.as_view(), name='pomodoro-history'),
]