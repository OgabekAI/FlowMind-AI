from rest_framework import serializers
from .models import DailyPlan, Task
from goals.serializers import GoalSummarySerializer


class TaskSerializer(serializers.ModelSerializer):
    goal_title = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id',
            'goal',
            'goal_title',
            'title',
            'description',
            'category',
            'priority',
            'start_time',
            'end_time',
            'duration_minutes',
            'is_done',
            'done_at',
            'created_at',
        ]
        read_only_fields = ['id', 'done_at', 'created_at', 'duration_minutes']

    def get_goal_title(self, obj):
        if obj.goal:
            return obj.goal.title
        return None

    def validate(self, attrs):
        start = attrs.get('start_time')
        end = attrs.get('end_time')
        if start and end:
            from datetime import datetime, date
            start_dt = datetime.combine(date.today(), start)
            end_dt = datetime.combine(date.today(), end)
            if end_dt <= start_dt:
                raise serializers.ValidationError({
                    'end_time': 'End time must be after start time.'
                })
            # Auto calculate duration
            diff = end_dt - start_dt
            attrs['duration_minutes'] = int(diff.total_seconds() / 60)
        return attrs


class DailyPlanSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)
    completion_rate = serializers.IntegerField(read_only=True)
    task_count = serializers.SerializerMethodField()
    done_count = serializers.SerializerMethodField()

    class Meta:
        model = DailyPlan
        fields = [
            'id',
            'date',
            'note',
            'ai_feedback',
            'ai_feedback_updated',
            'completion_rate',
            'task_count',
            'done_count',
            'tasks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'ai_feedback',
            'ai_feedback_updated',
            'created_at',
            'updated_at',
        ]

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_done_count(self, obj):
        return obj.tasks.filter(is_done=True).count()


class DailyPlanSummarySerializer(serializers.ModelSerializer):
    completion_rate = serializers.IntegerField(read_only=True)
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = DailyPlan
        fields = [
            'id',
            'date',
            'completion_rate',
            'task_count',
            'created_at',
        ]

    def get_task_count(self, obj):
        return obj.tasks.count()