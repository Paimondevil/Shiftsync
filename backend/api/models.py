# =============================================================================
# ShiftSync — Models
# =============================================================================

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class UserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'OWNER')
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_OWNER = 'OWNER'
    ROLE_MANAGER = 'MANAGER'
    ROLE_EMPLOYEE = 'EMPLOYEE'
    ROLE_CHOICES = [
        (ROLE_OWNER, 'Owner'),
        (ROLE_MANAGER, 'Manager'),
        (ROLE_EMPLOYEE, 'Employee'),
    ]

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_EMPLOYEE)

    is_oncall = models.BooleanField(default=False)
    priority_rank = models.PositiveIntegerField(default=99)
    min_shifts_per_week = models.PositiveIntegerField(default=1)
    max_shifts_per_week = models.PositiveIntegerField(default=5)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    hire_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UserManager()

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def is_max_5plus(self):
        return self.max_shifts_per_week == 6


# ---------------------------------------------------------------------------
# Shift Type
# ---------------------------------------------------------------------------

class ShiftType(models.Model):
    MORNING = 'MORNING'
    EVENING = 'EVENING'
    NIGHT = 'NIGHT'
    SHIFT_CHOICES = [
        (MORNING, 'Morning (7am-3pm)'),
        (EVENING, 'Evening (3pm-11pm)'),
        (NIGHT, 'Night (11pm-7am)'),
    ]

    name = models.CharField(max_length=10, choices=SHIFT_CHOICES, unique=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'shift_types'

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Employee Shift Eligibility
# ---------------------------------------------------------------------------

class EmployeeShiftEligibility(models.Model):
    PREFERRED = 'PREFERRED'
    PRIORITY_1 = 'PRIORITY_1'
    PRIORITY_2 = 'PRIORITY_2'
    PREF_CHOICES = [
        (PREFERRED, 'Preferred'),
        (PRIORITY_1, 'Priority 1 (prefers not to)'),
        (PRIORITY_2, 'Priority 2 (worst case)'),
    ]

    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shift_eligibilities')
    shift_type = models.ForeignKey(ShiftType, on_delete=models.CASCADE)
    preference = models.CharField(max_length=12, choices=PREF_CHOICES, default=PREFERRED)

    class Meta:
        db_table = 'employee_shift_eligibility'
        unique_together = ('employee', 'shift_type')

    def __str__(self):
        return f"{self.employee.full_name} - {self.shift_type.name} ({self.preference})"


# ---------------------------------------------------------------------------
# Fixed Day Off
# ---------------------------------------------------------------------------

class FixedDayOff(models.Model):
    PRIORITY_3 = 3
    PRIORITY_2 = 2
    PRIORITY_1 = 1
    PRIORITY_CHOICES = [
        (PRIORITY_3, '3 - Never'),
        (PRIORITY_2, '2 - Rarely (emergency only)'),
        (PRIORITY_1, '1 - Prefer not to'),
    ]

    SUNDAY = 0
    MONDAY = 1
    TUESDAY = 2
    WEDNESDAY = 3
    THURSDAY = 4
    FRIDAY = 5
    SATURDAY = 6
    DAY_CHOICES = [
        (SUNDAY, 'Sunday'),
        (MONDAY, 'Monday'),
        (TUESDAY, 'Tuesday'),
        (WEDNESDAY, 'Wednesday'),
        (THURSDAY, 'Thursday'),
        (FRIDAY, 'Friday'),
        (SATURDAY, 'Saturday'),
    ]

    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fixed_days_off')
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    priority = models.IntegerField(choices=PRIORITY_CHOICES)

    class Meta:
        db_table = 'fixed_days_off'
        unique_together = ('employee', 'day_of_week')

    def __str__(self):
        return f"{self.employee.full_name} - {self.get_day_of_week_display()} (P{self.priority})"


# ---------------------------------------------------------------------------
# Invite Token
# ---------------------------------------------------------------------------

class InviteToken(models.Model):
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invite_tokens')
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = 'invite_tokens'

    def __str__(self):
        return f"Invite for {self.employee.email} - expires {self.expires_at}"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at


# ---------------------------------------------------------------------------
# Time-Off Request
# ---------------------------------------------------------------------------

class TimeOffRequest(models.Model):
    STATUS_PENDING = 'PENDING'
    STATUS_APPROVED = 'APPROVED'
    STATUS_DENIED = 'DENIED'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_DENIED, 'Denied'),
    ]

    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='time_off_requests')
    date = models.DateField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    manager_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_requests'
    )

    class Meta:
        db_table = 'time_off_requests'
        unique_together = ('employee', 'date')

    def __str__(self):
        return f"{self.employee.full_name} - {self.date} ({self.status})"


# ---------------------------------------------------------------------------
# Schedule
# ---------------------------------------------------------------------------

class Schedule(models.Model):
    STATUS_DRAFT = 'DRAFT'
    STATUS_APPROVED = 'APPROVED'
    STATUS_LOCKED = 'LOCKED'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_LOCKED, 'Locked'),
    ]

    week_start_date = models.DateField(unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='created_schedules'
    )
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_schedules'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'schedules'

    def __str__(self):
        return f"Schedule from {self.week_start_date} ({self.status})"


# ---------------------------------------------------------------------------
# Schedule Shift
# ---------------------------------------------------------------------------

class ScheduleShift(models.Model):
    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE, related_name='shifts')
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scheduled_shifts')
    shift_type = models.ForeignKey(ShiftType, on_delete=models.CASCADE)
    date = models.DateField()
    is_override = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'schedule_shifts'
        unique_together = ('schedule', 'shift_type', 'date')

    def __str__(self):
        return f"{self.employee.full_name} - {self.shift_type.name} on {self.date}"


# ---------------------------------------------------------------------------
# Notification
# ---------------------------------------------------------------------------

class Notification(models.Model):
    TYPE_TIMEOFF_AUTO_APPROVED = 'TIMEOFF_AUTO_APPROVED'
    TYPE_TIMEOFF_APPROVED = 'TIMEOFF_APPROVED'
    TYPE_TIMEOFF_DENIED = 'TIMEOFF_DENIED'
    TYPE_TIMEOFF_CONFLICT = 'TIMEOFF_CONFLICT'
    TYPE_SCHEDULE_DRAFT = 'SCHEDULE_DRAFT'
    TYPE_SCHEDULE_PUBLISHED = 'SCHEDULE_PUBLISHED'
    TYPE_SCHEDULE_EDITED = 'SCHEDULE_EDITED'
    TYPE_UNDERSTAFFED = 'UNDERSTAFFED'
    TYPE_SIXTH_DAY = 'SIXTH_DAY'
    TYPE_SEVENTH_DAY = 'SEVENTH_DAY'

    TYPE_CHOICES = [
        (TYPE_TIMEOFF_AUTO_APPROVED, 'Time-off auto approved'),
        (TYPE_TIMEOFF_APPROVED, 'Time-off approved'),
        (TYPE_TIMEOFF_DENIED, 'Time-off denied'),
        (TYPE_TIMEOFF_CONFLICT, 'Time-off conflict - needs review'),
        (TYPE_SCHEDULE_DRAFT, 'Schedule draft ready'),
        (TYPE_SCHEDULE_PUBLISHED, 'Schedule published'),
        (TYPE_SCHEDULE_EDITED, 'Schedule edited after publish'),
        (TYPE_UNDERSTAFFED, 'Shift understaffed warning'),
        (TYPE_SIXTH_DAY, '6th day assignment - review needed'),
        (TYPE_SEVENTH_DAY, '7th day assignment - confirm required'),
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    related_schedule = models.ForeignKey(
        Schedule, on_delete=models.SET_NULL, null=True, blank=True
    )
    related_timeoff = models.ForeignKey(
        TimeOffRequest, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.recipient.full_name} - {self.notification_type}"
