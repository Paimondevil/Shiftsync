# =============================================================================
# ShiftSync — Scheduling Algorithm
# =============================================================================
#
# Called by schedule_generate_view to produce a 2-week Schedule draft.
#
# Rules:
#   - 1 person per shift (Morning / Evening / Night), 3 per day
#   - Week runs Sunday → Saturday, 2 weeks total
#   - Per week targets tracked independently
#   - Night shift → next morning hard-blocked for that employee
#   - Priority-3 fixed days off are hard blocks (never scheduled)
#   - Priority-2 fixed days off: only if no other option
#   - Priority-1 fixed days off: prefer not to, but flexible
#   - Shift eligibility: Preferred → Priority 1 → Priority 2
#   - On-call (e.g. Ranjeet): only if shift would otherwise have 0 coverage
#   - 5+ employees: target 5, can go to 6 (flag manager), 7 (flag + confirm)
#   - If no one available: flag shift as UNDERSTAFFED
#
# TODO: Implement generate_schedule() below.
# =============================================================================

import logging
from datetime import date, timedelta
from typing import Optional

logger = logging.getLogger(__name__)


def generate_schedule(week_start_date: date) -> dict:
    """
    Generate a 2-week schedule starting from week_start_date (a Sunday).

    Returns a dict:
    {
        'shifts': [
            {
                'employee_id': int,
                'shift_type_id': int,
                'date': date,
                'is_override': False,
            },
            ...
        ],
        'warnings': [
            {
                'type': 'UNDERSTAFFED' | 'SIXTH_DAY' | 'SEVENTH_DAY',
                'date': date,
                'shift_type_id': int | None,
                'employee_id': int | None,
                'message': str,
            },
            ...
        ]
    }
    """
    # TODO: implement
    # Step 1: Load all active, non-deleted employees
    # Step 2: Load shift types (Morning, Evening, Night)
    # Step 3: Load approved time-off requests for this 2-week window
    # Step 4: Load fixed days off for all employees
    # Step 5: Load shift eligibilities for all employees
    # Step 6: For each week (week 1, week 2):
    #           For each day (Sunday → Saturday):
    #             For each shift (Morning → Evening → Night):
    #               Run assignment logic (see docstring above)
    # Step 7: Return shifts + warnings

    raise NotImplementedError("Scheduler not yet implemented")


def _get_eligible_employees(shift_type, date_obj, assigned_counts, approved_timeoff_dates,
                             fixed_days_off_map, night_shift_dates, all_employees):
    """
    Filter and sort employees eligible for a given shift on a given date.
    Returns ordered list: [preferred_employees, priority1, priority2, oncall]
    TODO: implement
    """
    pass


def _would_exceed_max(employee, assigned_counts_this_week) -> bool:
    """
    Check if assigning another shift to this employee would exceed their weekly max.
    5+ employees: max is 5 normally; returns True if already at 5 (soft stop).
    TODO: implement
    """
    pass


def _is_night_to_morning_conflict(employee, shift_type, date_obj, night_shift_dates) -> bool:
    """
    Returns True if employee worked Night on the previous date and this is a Morning shift.
    TODO: implement
    """
    pass

def check_timeoff_coverage(employee, date):
    """
    Returns True if there is a coverage conflict (manager needs to review).
    Returns False if the request can be auto-approved.

    Logic: For each shift the employee is eligible for, check if there is
    at least 1 other eligible employee NOT already requesting that day off.
    If any shift would have zero coverage -> conflict = True.
    """
    from .models import EmployeeShiftEligibility, TimeOffRequest

    eligible_shifts = EmployeeShiftEligibility.objects.filter(employee=employee)

    for eligibility in eligible_shifts:
        shift_type = eligibility.shift_type

        # All other employees eligible for this shift
        other_eligible = EmployeeShiftEligibility.objects.filter(
            shift_type=shift_type
        ).exclude(employee=employee).values_list('employee_id', flat=True)

        # How many of them already have approved or pending time-off on this date
        others_off = TimeOffRequest.objects.filter(
            employee_id__in=other_eligible,
            date=date,
            status__in=['APPROVED', 'PENDING']
        ).count()

        # If all other eligible employees are also off -> conflict
        if others_off >= len(other_eligible):
            return True

    return False