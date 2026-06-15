# =============================================================================
# ShiftSync — Scheduling Algorithm v3
# =============================================================================
# Approach:
#   1. For each shift type, collect all eligible employees sorted by priority
#   2. Distribute shifts fairly across the 2-week period
#   3. Respect fixed days off (priority 3=never, 2=emergency, 1=prefer not)
#   4. Respect night→morning hard block
#   5. Try to hit each employee's target (max) before going to lower priority
#   6. On-call only used when shift has zero regular coverage
# =============================================================================

import logging
from datetime import date, timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)

SHIFT_ORDER = ['MORNING', 'EVENING', 'NIGHT']


def generate_schedule(week_start_date: date) -> dict:
    from .models import (
        User, ShiftType, EmployeeShiftEligibility,
        FixedDayOff, TimeOffRequest
    )

    # -----------------------------------------------------------------------
    # Load all data
    # -----------------------------------------------------------------------
    all_employees = list(User.objects.filter(is_active=True, is_deleted=False))
    regular_employees = [e for e in all_employees if not e.is_oncall]
    oncall_employees  = [e for e in all_employees if e.is_oncall]

    shift_types = {st.name: st for st in ShiftType.objects.all()}

    # eligibility_map: { employee_id: { shift_name: preference } }
    eligibility_map = {}
    for elig in EmployeeShiftEligibility.objects.select_related('employee', 'shift_type').all():
        eligibility_map.setdefault(elig.employee_id, {})[elig.shift_type.name] = elig.preference

    # fixed_off_map: { employee_id: { dow (Sun=0..Sat=6): priority } }
    fixed_off_map = {}
    for fdo in FixedDayOff.objects.all():
        fixed_off_map.setdefault(fdo.employee_id, {})[fdo.day_of_week] = fdo.priority

    # Approved/pending time-off for this 2-week window
    period_end = week_start_date + timedelta(days=13)
    timeoff_set = set()
    for tor in TimeOffRequest.objects.filter(
        date__gte=week_start_date,
        date__lte=period_end,
        status__in=['APPROVED', 'PENDING']
    ):
        timeoff_set.add((tor.employee_id, tor.date.isoformat()))

    # -----------------------------------------------------------------------
    # Build the 14 days
    # -----------------------------------------------------------------------
    days = [week_start_date + timedelta(days=i) for i in range(14)]

    # -----------------------------------------------------------------------
    # Generate week by week
    # -----------------------------------------------------------------------
    all_shifts = []
    all_warnings = []

    for week_num in range(2):
        week_days = days[week_num * 7: week_num * 7 + 7]

        # Per-week state
        # shifts_assigned: { employee_id: count }
        shifts_assigned = {e.id: 0 for e in all_employees}
        # night_dates: set of (employee_id, date_str) where they worked night
        night_dates = set()
        # schedule_grid: { (date_str, shift_name): employee_id or None }
        schedule_grid = {}

        # -------------------------------------------------------------------
        # PASS 1: Assign each shift slot using priority-aware selection
        # We do multiple passes to ensure high-priority employees get their
        # target shifts before lower-priority employees fill the slots.
        # -------------------------------------------------------------------

        # Sort employees by priority rank (1 = highest)
        sorted_regular = sorted(regular_employees, key=lambda e: e.priority_rank)

        # For each shift slot, track availability
        # First, build a preference-ordered candidate list per (day, shift)
        def get_weekly_target(emp):
            # 5+ stored as 6 → target 5
            return 5 if emp.max_shifts_per_week == 6 else emp.max_shifts_per_week

        def get_weekly_max_hard(emp):
            # Hard max is 7
            return 7

        def dow_for(d):
            # Sunday=0 ... Saturday=6
            return d.isoweekday() % 7

        def is_blocked(emp, d, shift_name, allow_priority_2=False, allow_priority_1=False):
            """Returns True if employee cannot/should not work this slot."""
            date_str = d.isoformat()
            dow = dow_for(d)
            fixed = fixed_off_map.get(emp.id, {})
            fp = fixed.get(dow, 0)

            # Priority 3 = never
            if fp == 3:
                return True

            # Priority 2 = emergency only
            if fp == 2 and not allow_priority_2:
                return True

            # Priority 1 = prefer not — blocked unless allowed
            if fp == 1 and not allow_priority_1:
                return True

            # Time off
            if (emp.id, date_str) in timeoff_set:
                return True

            # Night → morning block
            if shift_name == 'MORNING':
                prev = (d - timedelta(days=1)).isoformat()
                if (emp.id, prev) in night_dates:
                    return True

            return False

        def pref_score(emp, shift_name):
            """Lower = better preference."""
            p = eligibility_map.get(emp.id, {}).get(shift_name)
            if p == 'PREFERRED':   return 0
            if p == 'PRIORITY_1':  return 1
            if p == 'PRIORITY_2':  return 2
            return 99  # not eligible

        def pick_employee(day, shift_name, exclude_ids=set(), allow_p1=False, allow_p2=False, allow_oncall=False):
            """
            Pick the best employee for a shift slot.
            Tries employees in priority rank order.
            Prefers those under target, with best shift preference, fewest shifts this week.
            """
            pool = oncall_employees if allow_oncall else sorted_regular
            date_str = day.isoformat()

            candidates = []
            for emp in pool:
                if emp.id in exclude_ids:
                    continue
                # Must be eligible
                if shift_name not in eligibility_map.get(emp.id, {}):
                    continue
                # Hard max
                if shifts_assigned[emp.id] >= get_weekly_max_hard(emp):
                    continue
                # Blocked?
                if is_blocked(emp, day, shift_name,
                              allow_priority_2=allow_p2,
                              allow_priority_1=allow_p1):
                    continue

                target = get_weekly_target(emp)
                count  = shifts_assigned[emp.id]
                at_target = count >= target

                candidates.append((
                    at_target,                    # prefer under-target first
                    pref_score(emp, shift_name),  # prefer better preference
                    emp.priority_rank,            # prefer higher rank (lower number)
                    count,                        # then fewest shifts
                    emp,
                ))

            if not candidates:
                return None

            candidates.sort(key=lambda x: x[:4])
            return candidates[0][4]

        # -------------------------------------------------------------------
        # Assign all 7 days × 3 shifts
        # Pass A: no relaxation (respect all priority-1 and priority-2 days off)
        # Pass B: relax priority-1 days off
        # Pass C: relax priority-1 and priority-2 days off
        # Pass D: try on-call
        # -------------------------------------------------------------------
        for day in week_days:
            for shift_name in SHIFT_ORDER:
                slot_key = (day.isoformat(), shift_name)

                # Pass A: strict
                emp = pick_employee(day, shift_name, allow_p1=False, allow_p2=False)

                # Pass B: relax priority-1
                if not emp:
                    emp = pick_employee(day, shift_name, allow_p1=True, allow_p2=False)

                # Pass C: relax priority-1 and priority-2
                if not emp:
                    emp = pick_employee(day, shift_name, allow_p1=True, allow_p2=True)

                # Pass D: try on-call
                if not emp:
                    emp = pick_employee(day, shift_name, allow_p1=True, allow_p2=True, allow_oncall=True)

                if emp:
                    schedule_grid[slot_key] = emp.id
                    shifts_assigned[emp.id] += 1
                    if shift_name == 'NIGHT':
                        night_dates.add((emp.id, day.isoformat()))

                    # Build shift record
                    all_shifts.append({
                        'employee_id': emp.id,
                        'shift_type_id': shift_types[shift_name].id,
                        'date': day,
                        'is_override': False,
                    })

                    # Warn on 6th/7th day
                    count = shifts_assigned[emp.id]
                    if count == 6:
                        all_warnings.append({
                            'type': 'SIXTH_DAY',
                            'date': day.isoformat(),
                            'shift_type': shift_name,
                            'employee_id': emp.id,
                            'message': f'{emp.full_name} assigned 6th shift this week ({day.isoformat()} {shift_name}). Review required.'
                        })
                    elif count == 7:
                        all_warnings.append({
                            'type': 'SEVENTH_DAY',
                            'date': day.isoformat(),
                            'shift_type': shift_name,
                            'employee_id': emp.id,
                            'message': f'{emp.full_name} assigned 7th shift this week ({day.isoformat()} {shift_name}). Manual confirmation required.'
                        })
                else:
                    all_warnings.append({
                        'type': 'UNDERSTAFFED',
                        'date': day.isoformat(),
                        'shift_type': shift_name,
                        'employee_id': None,
                        'message': f'No one available for {shift_name} on {day.isoformat()}. Shift UNDERSTAFFED.'
                    })

        # Log weekly summary
        for emp in all_employees:
            logger.debug(f'Week {week_num+1} — {emp.first_name}: {shifts_assigned[emp.id]} shifts')

    return {'shifts': all_shifts, 'warnings': all_warnings}


def check_timeoff_coverage(employee, date) -> bool:
    """
    Returns True if there is a coverage conflict (manager needs to review).
    Returns False if the request can be auto-approved.
    """
    from .models import EmployeeShiftEligibility, TimeOffRequest

    eligible_shifts = EmployeeShiftEligibility.objects.filter(employee=employee)

    for eligibility in eligible_shifts:
        shift_type = eligibility.shift_type

        other_eligible_ids = list(
            EmployeeShiftEligibility.objects.filter(shift_type=shift_type)
            .exclude(employee=employee)
            .values_list('employee_id', flat=True)
        )

        if not other_eligible_ids:
            return True

        others_off_count = TimeOffRequest.objects.filter(
            employee_id__in=other_eligible_ids,
            date=date,
            status__in=['APPROVED', 'PENDING']
        ).count()

        if (len(other_eligible_ids) - others_off_count) <= 0:
            return True

    return False