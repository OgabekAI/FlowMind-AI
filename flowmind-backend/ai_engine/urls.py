from django.urls import path
from .views import PlanFeedbackView, GoalFeedbackView, ChatView

urlpatterns = [
    path('plan/feedback/', PlanFeedbackView.as_view(), name='plan-feedback'),
    path('goals/<int:goal_id>/feedback/', GoalFeedbackView.as_view(), name='goal-feedback'),
    path('chat/', ChatView.as_view(), name='chat'),
]