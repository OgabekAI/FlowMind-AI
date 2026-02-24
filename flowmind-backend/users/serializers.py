from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
import pytz
from .models import User

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            'email',
            'username',
            'password',
            'password2',
            'occupation',
            'timezone',
        ]

    def validate_timezone(self, value):
        if value not in pytz.all_timezones:
            raise serializers.ValidationError(
                'Invalid timezone. Example: America/New_York, Europe/London, Asia/Baku'
            )
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                'password': 'Passwords do not match.'
            })
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            occupation=validated_data.get('occupation', ''),
            timezone=validated_data.get('timezone', 'UTC'),
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'occupation',
            'bio',
            'avatar',
            'avatar_url',
            'timezone',
            'created_at',
        ]
        read_only_fields = ['id', 'email', 'created_at']
        extra_kwargs = {
            'avatar': {'write_only': True}
        }

    def validate_timezone(self, value):
        import pytz
        if value not in pytz.all_timezones:
            raise serializers.ValidationError('Invalid timezone.')
        return value

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
        return None