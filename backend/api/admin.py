# =============================================================================
# ShiftSync — Django Admin Registration
# =============================================================================

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, ShiftType, EmployeeShiftEligibility, FixedDayOff,
    InviteToken, TimeOffRequest, Schedule, ScheduleShift, Notification
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'role', 'is_active', 'is_deleted')
    list_filter = ('role', 'is_active', 'is_deleted', 'is_oncall')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone', 'hire_date')}),
        ('Role & scheduling', {'fields': ('role', 'is_oncall', 'priority_rank', 'min_shifts_per_week', 'max_shifts_per_week')}),
        ('Status', {'fields': ('is_active', 'is_deleted', 'deleted_at', 'is_staff')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2', 'role'),
        }),
    )


admin.site.register(ShiftType)
admin.site.register(EmployeeShiftEligibility)
admin.site.register(FixedDayOff)
admin.site.register(InviteToken)
admin.site.register(TimeOffRequest)
admin.site.register(Schedule)
admin.site.register(ScheduleShift)
admin.site.register(Notification)
