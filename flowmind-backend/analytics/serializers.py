from rest_framework import serializers
from .models import DailyStats


class DailyStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyStats
        fields = [
            'id',
            'date',
            'total_tasks',
            'completed_tasks',
            'total_focus_minutes',
            'completion_rate',
        ]
        read_only_fields = fields