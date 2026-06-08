# =============================================================================
# ShiftSync — Serializers
# =============================================================================
# TODO: Implement each serializer as we build each feature.
# Placeholder classes are here so imports don't break.
# =============================================================================

from rest_framework import serializers
from .models import (
    User, ShiftType, EmployeeShiftEligibility, FixedDayOff,
    InviteToken, TimeOffRequest, Schedule, ScheduleShift, Notification
)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class LoginSerializer(serializers.Serializer):
    # TODO: implement
    email = serializers.EmailField()
    password = serializers.CharField()


class RegisterSerializer(serializers.Serializer):
    # TODO: implement (used for invite-link registration)
    token = serializers.CharField()
    username = serializers.CharField()
    password = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    # TODO: implement
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'is_oncall',
                  'priority_rank', 'min_shifts_per_week', 'max_shifts_per_week']


# ---------------------------------------------------------------------------
# Employees
# ---------------------------------------------------------------------------

class EmployeeCreateSerializer(serializers.ModelSerializer):
    # TODO: implement — used when owner/manager adds a new employee
    class Meta:
        model = User
        fields = '__all__'


class FixedDayOffSerializer(serializers.ModelSerializer):
    # TODO: implement
    class Meta:
        model = FixedDayOff
        fields = '__all__'


# ---------------------------------------------------------------------------
# Shift Types & Eligibility
# ---------------------------------------------------------------------------

class ShiftTypeSerializer(serializers.ModelSerializer):
    # TODO: implement
    class Meta:
        model = ShiftType
        fields = '__all__'


class EmployeeShiftEligibilitySerializer(serializers.ModelSerializer):
    # TODO: implement
    class Meta:
        model = EmployeeShiftEligibility
        fields = '__all__'


# ---------------------------------------------------------------------------
# Time-Off Requests
# ---------------------------------------------------------------------------

class TimeOffRequestSerializer(serializers.ModelSerializer):
    # TODO: implement — includes employee name for shared calendar view
    class Meta:
        model = TimeOffRequest
        fields = '__all__'


# ---------------------------------------------------------------------------
# Schedule
# ---------------------------------------------------------------------------

class ScheduleShiftSerializer(serializers.ModelSerializer):
    # TODO: implement
    class Meta:
        model = ScheduleShift
        fields = '__all__'


class ScheduleSerializer(serializers.ModelSerializer):
    # TODO: implement — includes nested shifts
    class Meta:
        model = Schedule
        fields = '__all__'


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class NotificationSerializer(serializers.ModelSerializer):
    # TODO: implement
    class Meta:
        model = Notification
        fields = '__all__'
