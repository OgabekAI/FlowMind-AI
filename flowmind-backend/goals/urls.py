from django.urls import path
from .views import (
    GoalListCreateView,
    GoalDetailView,
    GoalProgressView,
    MilestoneListCreateView,
    MilestoneToggleView,
)

urlpatterns = [
    path('', GoalListCreateView.as_view(), name='goal-list'),
    path('<int:pk>/', GoalDetailView.as_view(), name='goal-detail'),
    path('<int:pk>/progress/', GoalProgressView.as_view(), name='goal-progress'),
    path('<int:goal_id>/milestones/', MilestoneListCreateView.as_view(), name='milestone-list'),
    path('<int:goal_id>/milestones/<int:pk>/toggle/', MilestoneToggleView.as_view(), name='milestone-toggle'),
]