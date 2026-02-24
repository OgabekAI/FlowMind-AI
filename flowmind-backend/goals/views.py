from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Goal, Milestone
from .serializers import GoalSerializer, GoalSummarySerializer, MilestoneSerializer

class GoalListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return GoalSummarySerializer
        return GoalSerializer

    def get_queryset(self):
        queryset = Goal.objects.filter(user=self.request.user)
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class GoalDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user)


class GoalProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        goal = get_object_or_404(Goal, pk=pk, user=request.user)
        progress = request.data.get('progress')

        if progress is None:
            return Response(
                {'error': 'Progress value is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            progress = int(progress)
            if not 0 <= progress <= 100:
                raise ValueError
        except ValueError:
            return Response(
                {'error': 'Progress must be a number between 0 and 100.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        goal.progress = progress
        if progress == 100:
            goal.status = 'completed'
        goal.save()

        return Response(GoalSerializer(goal).data)


class MilestoneListCreateView(generics.ListCreateAPIView):
    serializer_class = MilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        goal = get_object_or_404(
            Goal,
            pk=self.kwargs['goal_id'],
            user=self.request.user
        )
        return Milestone.objects.filter(goal=goal)

    def perform_create(self, serializer):
        goal = get_object_or_404(
            Goal,
            pk=self.kwargs['goal_id'],
            user=self.request.user
        )
        serializer.save(goal=goal)


class MilestoneToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, goal_id, pk):
        goal = get_object_or_404(Goal, pk=goal_id, user=request.user)
        milestone = get_object_or_404(Milestone, pk=pk, goal=goal)
        milestone.is_done = not milestone.is_done
        milestone.save()

        # Auto update goal progress based on milestones
        total = goal.milestones.count()
        if total > 0:
            done = goal.milestones.filter(is_done=True).count()
            goal.progress = int((done / total) * 100)
            if goal.progress == 100:
                goal.status = 'completed'
            goal.save()

        return Response(MilestoneSerializer(milestone).data)