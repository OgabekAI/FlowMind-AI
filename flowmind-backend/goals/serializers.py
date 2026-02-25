from rest_framework import serializers
from .models import Goal, Milestone
from django.utils import timezone

class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = [
            'id',
            'title',
            'is_done',
            'due_date',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class GoalSerializer(serializers.ModelSerializer):
    milestones = MilestoneSerializer(many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    deadline = serializers.DateTimeField(required=False, allow_null=True)


    class Meta:
        model = Goal
        fields = [
            'id',
            'title',
            'description',
            'category',
            'status',
            'progress',
            'deadline',
            'ai_feedback',
            'ai_feedback_updated',
            'is_overdue',
            'days_remaining',
            'milestones',
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

    def validate_progress(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError(
                'Progress must be between 0 and 100.'
            )
        return value

    def validate_deadline(self, value):
        if value is None:
            return value

        current_deadline = getattr(self.instance, 'deadline', None)
        if current_deadline and current_deadline == value:
            return value

        if value <= timezone.now():
            raise serializers.ValidationError(
                'Deadline must be in the future.'
            )
        return value



class GoalSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for lists"""
    days_remaining = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    milestone_count = serializers.SerializerMethodField()
    completed_milestones = serializers.SerializerMethodField()

    class Meta:
        model = Goal
        fields = [
            'id',
            'title',
            'category',
            'status',
            'progress',
            'deadline',
            'days_remaining',
            'is_overdue',
            'milestone_count',
            'completed_milestones',
            'created_at',
        ]

    def get_milestone_count(self, obj):
        return obj.milestones.count()

    def get_completed_milestones(self, obj):
        return obj.milestones.filter(is_done=True).count()
