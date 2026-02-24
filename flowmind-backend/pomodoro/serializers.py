from rest_framework import serializers
from .models import PomodoroSession, PomodoroSettings


class PomodoroSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PomodoroSettings
        fields = [
            'id',
            'focus_minutes',
            'short_break_minutes',
            'long_break_minutes',
            'sessions_before_long_break',
        ]
        read_only_fields = ['id']

    def validate_focus_minutes(self, value):
        if value < 1 or value > 120:
            raise serializers.ValidationError(
                'Focus duration must be between 1 and 120 minutes.'
            )
        return value

    def validate_short_break_minutes(self, value):
        if value < 1 or value > 30:
            raise serializers.ValidationError(
                'Short break must be between 1 and 30 minutes.'
            )
        return value

    def validate_long_break_minutes(self, value):
        if value < 1 or value > 60:
            raise serializers.ValidationError(
                'Long break must be between 1 and 60 minutes.'
            )
        return value


class PomodoroSessionSerializer(serializers.ModelSerializer):
    task_title = serializers.SerializerMethodField()

    class Meta:
        model = PomodoroSession
        fields = [
            'id',
            'task',
            'task_title',
            'session_type',
            'session_number',
            'duration_minutes',
            'status',
            'started_at',
            'completed_at',
        ]
        read_only_fields = [
            'id',
            'started_at',
            'completed_at',
            'session_number',
            'duration_minutes',
        ]

    def get_task_title(self, obj):
        if obj.task:
            return obj.task.title
        return None