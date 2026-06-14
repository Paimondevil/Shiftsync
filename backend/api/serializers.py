# =============================================================================
# ShiftSync — Serializers
# =============================================================================

from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import serializers
from .models import (
    User, ShiftType, EmployeeShiftEligibility, FixedDayOff,
    InviteToken, TimeOffRequest, Schedule, ScheduleShift, Notification
)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        user = authenticate(username=email, password=password)

        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('This account has been deactivated.')
        if user.is_deleted:
            raise serializers.ValidationError('This account no longer exists.')

        data['user'] = user
        return data


class RegisterSerializer(serializers.Serializer):
    token = serializers.CharField()
    username = serializers.CharField(max_length=50)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_token(self, value):
        try:
            invite = InviteToken.objects.get(token=value, is_used=False)
        except InviteToken.DoesNotExist:
            raise serializers.ValidationError('Invalid or already used invite link.')

        if invite.is_expired:
            raise serializers.ValidationError('This invite link has expired. Ask your manager to resend it.')

        self.context['invite'] = invite
        return value

    def validate_username(self, value):
        # username is stored in first_name for simplicity — or we can use a dedicated field
        # We'll store it as the display username; email is used for login
        return value

    def save(self):
        invite = self.context['invite']
        user = invite.employee
        user.set_password(self.validated_data['password'])
        # Store username in first_name if they haven't set a real name yet,
        # otherwise just update password. Owner already set their name on creation.
        user.save()
        invite.is_used = True
        invite.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'role', 'is_oncall', 'priority_rank',
            'min_shifts_per_week', 'max_shifts_per_week',
            'is_active', 'hire_date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


# ---------------------------------------------------------------------------
# Employees
# ---------------------------------------------------------------------------

class FixedDayOffSerializer(serializers.ModelSerializer):
    class Meta:
        model = FixedDayOff
        fields = ['id', 'day_of_week', 'priority']


class EmployeeShiftEligibilitySerializer(serializers.ModelSerializer):
    shift_type_name = serializers.ReadOnlyField(source='shift_type.name')

    class Meta:
        model = EmployeeShiftEligibility
        fields = ['id', 'shift_type', 'shift_type_name', 'preference']


class EmployeeCreateSerializer(serializers.ModelSerializer):
    fixed_days_off = FixedDayOffSerializer(many=True, required=False)
    shift_eligibilities = EmployeeShiftEligibilitySerializer(many=True, required=False)

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'phone', 'role',
            'is_oncall', 'priority_rank', 'min_shifts_per_week',
            'max_shifts_per_week', 'hire_date',
            'fixed_days_off', 'shift_eligibilities'
        ]

    def validate_role(self, value):
        if value == User.ROLE_MANAGER:
            if User.objects.filter(role=User.ROLE_MANAGER).exists():
                raise serializers.ValidationError(
                    'A manager already exists. Only one manager is allowed at a time.'
                )
        return value

    def create(self, validated_data):
        fixed_days_off_data = validated_data.pop('fixed_days_off', [])
        shift_eligibilities_data = validated_data.pop('shift_eligibilities', [])

        # Create user without password — they set it via invite link
        user = User.objects.create_user(
            email=validated_data['email'],
            password=None,
            **{k: v for k, v in validated_data.items() if k != 'email'}
        )
        user.set_unusable_password()
        user.save()

        for day_off in fixed_days_off_data:
            FixedDayOff.objects.create(employee=user, **day_off)

        for eligibility in shift_eligibilities_data:
            EmployeeShiftEligibility.objects.create(employee=user, **eligibility)

        return user


class EmployeeDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    fixed_days_off = FixedDayOffSerializer(many=True, read_only=True)
    shift_eligibilities = EmployeeShiftEligibilitySerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'role', 'is_oncall', 'priority_rank',
            'min_shifts_per_week', 'max_shifts_per_week',
            'is_active', 'is_deleted', 'hire_date', 'created_at',
            'fixed_days_off', 'shift_eligibilities'
        ]
        read_only_fields = ['id', 'email', 'created_at', 'is_deleted']


# ---------------------------------------------------------------------------
# Shift Types
# ---------------------------------------------------------------------------

class ShiftTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftType
        fields = '__all__'


# ---------------------------------------------------------------------------
# Time-Off Requests
# ---------------------------------------------------------------------------

class TimeOffRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.full_name')
    reviewed_by_name = serializers.ReadOnlyField(source='reviewed_by.full_name')

    class Meta:
        model = TimeOffRequest
        fields = [
            'id', 'employee', 'employee_name', 'date', 'reason',
            'status', 'manager_note', 'created_at', 'reviewed_at',
            'reviewed_by', 'reviewed_by_name'
        ]
        read_only_fields = ['id', 'employee', 'status', 'manager_note',
                            'reviewed_at', 'reviewed_by', 'created_at']


class TimeOffReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['APPROVED', 'DENIED'])
    manager_note = serializers.CharField(required=False, allow_blank=True)


# ---------------------------------------------------------------------------
# Schedule
# ---------------------------------------------------------------------------

class ScheduleShiftSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.full_name')
    shift_type_name = serializers.ReadOnlyField(source='shift_type.name')

    class Meta:
        model = ScheduleShift
        fields = [
            'id', 'employee', 'employee_name', 'shift_type',
            'shift_type_name', 'date', 'is_override'
        ]


class ScheduleSerializer(serializers.ModelSerializer):
    shifts = ScheduleShiftSerializer(many=True, read_only=True)
    created_by_name = serializers.ReadOnlyField(source='created_by.full_name')
    approved_by_name = serializers.ReadOnlyField(source='approved_by.full_name')

    class Meta:
        model = Schedule
        fields = [
            'id', 'week_start_date', 'status', 'created_by',
            'created_by_name', 'approved_by', 'approved_by_name',
            'created_at', 'approved_at', 'locked_at', 'shifts'
        ]
        read_only_fields = ['id', 'created_at', 'approved_at', 'locked_at']


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'message', 'is_read',
            'created_at', 'related_schedule', 'related_timeoff'
        ]
        read_only_fields = ['id', 'notification_type', 'message', 'created_at']