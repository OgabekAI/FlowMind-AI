from django.urls import path
from .views import (
    TodayPlanView,
    PlanListView,
    PlanDetailView,
    TaskListCreateView,
    TaskDetailView,
    TaskToggleDoneView,
    TodayTasksView,
)

urlpatterns = [
    path('today/', TodayPlanView.as_view(), name='today-plan'),
    path('today/tasks/', TodayTasksView.as_view(), name='today-tasks'),
    path('history/', PlanListView.as_view(), name='plan-list'),
    path('<int:pk>/', PlanDetailView.as_view(), name='plan-detail'),
    path('<int:plan_id>/tasks/', TaskListCreateView.as_view(), name='task-list'),
    path('tasks/<int:pk>/', TaskDetailView.as_view(), name='task-detail'),
    path('tasks/<int:pk>/toggle/', TaskToggleDoneView.as_view(), name='task-toggle'),
]