import pytz
from django.utils import timezone


class TimezoneMiddleware:
    """
    Automatically activates the user's timezone for every request.
    So all datetime operations use the user's local time.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            user_tz = getattr(request.user, 'timezone', 'UTC')
            try:
                tz = pytz.timezone(user_tz)
                timezone.activate(tz)
            except pytz.exceptions.UnknownTimeZoneError:
                timezone.activate(pytz.utc)
        else:
            timezone.deactivate()

        response = self.get_response(request)
        return response