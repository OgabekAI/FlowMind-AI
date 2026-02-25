from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import DailyPlan, Task
from .serializers import DailyPlanSerializer, DailyPlanSummarySerializer, TaskSerializer


class TodayPlanView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        plan, created = DailyPlan.objects.get_or_create(
            user=request.user,
            date=today
        )
        serializer = DailyPlanSerializer(plan)
        return Response(serializer.data)

    def patch(self, request):
        today = timezone.now().date()
        plan, created = DailyPlan.objects.get_or_create(
            user=request.user,
            date=today
        )
        serializer = DailyPlanSerializer(
            plan,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PlanListView(generics.ListAPIView):
    serializer_class = DailyPlanSummarySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DailyPlan.objects.filter(
            user=self.request.user
        ).order_by('-date')[:30]


class PlanDetailView(generics.RetrieveAPIView):
    serializer_class = DailyPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DailyPlan.objects.filter(user=self.request.user)


class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        plan = get_object_or_404(
            DailyPlan,
            pk=self.kwargs['plan_id'],
            user=self.request.user
        )
        return Task.objects.filter(plan=plan)

    def perform_create(self, serializer):
        plan = get_object_or_404(
            DailyPlan,
            pk=self.kwargs['plan_id'],
            user=self.request.user
        )
        serializer.save(plan=plan)


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(
            plan__user=self.request.user
        )


class TaskToggleDoneView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        task = get_object_or_404(
            Task,
            pk=pk,
            plan__user=request.user
        )
        task.is_done = not task.is_done
        task.done_at = timezone.now() if task.is_done else None
        task.save()

        if task.goal:
            goal = task.goal
            total_tasks = goal.tasks.count()
            if total_tasks > 0:
                done_tasks = goal.tasks.filter(is_done=True).count()
                goal.progress = int((done_tasks / total_tasks) * 100)
                if goal.progress == 100:
                    goal.status = 'completed'
                elif goal.progress == 0:
                    goal.status = 'active'
                elif goal.status == 'completed' and goal.progress < 100:
                    goal.status = 'active'
                goal.save()

        from analytics.services import update_daily_stats
        update_daily_stats(request.user, task.plan.date)

        return Response(TaskSerializer(task).data)


class TodayTasksView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        today = timezone.now().date()
        plan, created = DailyPlan.objects.get_or_create(
            user=request.user,
            date=today
        )
        serializer = TaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(plan=plan)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )