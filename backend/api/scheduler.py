# =============================================================================
# ShiftSync — Scheduling Algorithm v5
# =============================================================================
# Phase 1: Assign by priority rank (highest first, up to target)
# Phase 2: Enforce minimums — steal shifts from lowest priority above-min people
# Phase 3: On-call fills truly empty slots
# Phase 4: Build records + warnings
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
    all_employees = list(
        User.objects.filter(is_active=True, is_deleted=False).order_by('priority_rank')
    )
    regular_employees = [e for e in all_employees if not e.is_oncall]
    oncall_employees  = [e for e in all_employees if e.is_oncall]

    shift_types = {st.name: st for st in ShiftType.objects.all()}

    eligibility_map = {}
    for elig in EmployeeShiftEligibility.objects.select_related('employee', 'shift_type').all():
        eligibility_map.setdefault(elig.employee_id, {})[elig.shift_type.name] = elig.preference

    fixed_off_map = {}
    for fdo in FixedDayOff.objects.all():
        fixed_off_map.setdefault(fdo.employee_id, {})[fdo.day_of_week] = fdo.priority

    period_end = week_start_date + timedelta(days=13)
    timeoff_set = set()
    for tor in TimeOffRequest.objects.filter(
        date__gte=week_start_date,
        date__lte=period_end,
        status__in=['APPROVED', 'PENDING']
    ):
        timeoff_set.add((tor.employee_id, tor.date.isoformat()))

    days = [week_start_date + timedelta(days=i) for i in range(14)]

    all_shifts = []
    all_warnings = []

    # -----------------------------------------------------------------------
    # Process each week independently
    # -----------------------------------------------------------------------
    for week_num in range(2):
        week_days = days[week_num * 7: week_num * 7 + 7]

        # slot_owner: { (date_str, shift_name): employee_id }
        slot_owner = {}
        # employee_dates: { employee_id: set of date_str }
        employee_dates = defaultdict(set)
        # night_worked: set of (employee_id, date_str)
        night_worked = set()

        def dow(d):
            return d.isoweekday() % 7  # Sun=0 Sat=6

        def get_target(emp):
            return 5 if emp.max_shifts_per_week == 6 else emp.max_shifts_per_week

        def get_min(emp):
            return emp.min_shifts_per_week

        def fixed_priority(emp, d):
            return fixed_off_map.get(emp.id, {}).get(dow(d), 0)

        def is_hard_blocked(emp, d, shift_name, check_slot_taken=True):
            date_str = d.isoformat()
            if (emp.id, date_str) in timeoff_set:
                return True
            if shift_name == 'MORNING':
                prev = (d - timedelta(days=1)).isoformat()
                if (emp.id, prev) in night_worked:
                    return True
            if fixed_priority(emp, d) == 3:
                return True
            if shift_name not in eligibility_map.get(emp.id, {}):
                return True
            if check_slot_taken and (date_str, shift_name) in slot_owner:
                return True
            if date_str in employee_dates[emp.id]:
                return True
            return False

        def slot_score(emp, d, shift_name):
            fp = fixed_priority(emp, d)
            pref = eligibility_map.get(emp.id, {}).get(shift_name, 'PRIORITY_2')
            pref_score = {'PREFERRED': 0, 'PRIORITY_1': 1, 'PRIORITY_2': 2}.get(pref, 3)
            fp_score = {0: 0, 1: 1, 2: 2}.get(fp, 0)
            return (fp_score, pref_score)

        def assign(emp, d, shift_name):
            date_str = d.isoformat()
            slot_owner[(date_str, shift_name)] = emp.id
            employee_dates[emp.id].add(date_str)
            if shift_name == 'NIGHT':
                night_worked.add((emp.id, date_str))

        def unassign(emp_id, date_str, shift_name):
            if (date_str, shift_name) in slot_owner:
                del slot_owner[(date_str, shift_name)]
            employee_dates[emp_id].discard(date_str)
            night_worked.discard((emp_id, date_str))

        # -------------------------------------------------------------------
        # PHASE 1: Assign regular employees by priority rank up to target
        # -------------------------------------------------------------------
        for emp in regular_employees:
            target = get_target(emp)
            elig = eligibility_map.get(emp.id, {})
            if not elig:
                continue

            pref_order = {'PREFERRED': 0, 'PRIORITY_1': 1, 'PRIORITY_2': 2}
            preferred_shifts = sorted(elig.keys(), key=lambda s: pref_order.get(elig[s], 3))

            candidates = []
            for shift_name in preferred_shifts:
                for d in week_days:
                    if is_hard_blocked(emp, d, shift_name):
                        continue
                    score = slot_score(emp, d, shift_name)
                    candidates.append((score, d, shift_name))

            candidates.sort(key=lambda x: x[0])

            assigned = 0
            for score, d, shift_name in candidates:
                if assigned >= target:
                    break
                date_str = d.isoformat()
                if date_str in employee_dates[emp.id]:
                    continue
                if (date_str, shift_name) in slot_owner:
                    continue
                assign(emp, d, shift_name)
                assigned += 1

        # -------------------------------------------------------------------
        # PHASE 2: Enforce minimums
        # Find employees below min, steal from lowest-priority above-min people
        # -------------------------------------------------------------------
        max_iterations = 50  # safety cap
        iteration = 0
        while iteration < max_iterations:
            iteration += 1

            # Find who is below minimum (sorted: lowest priority first = hardest to satisfy)
            below_min = [
                emp for emp in regular_employees
                if len(employee_dates[emp.id]) < get_min(emp)
            ]
            if not below_min:
                break

            # Process the lowest-priority person below min first
            # (highest priority_rank number = lowest priority)
            needy = sorted(below_min, key=lambda e: -e.priority_rank)[0]
            needy_elig = eligibility_map.get(needy.id, {})
            if not needy_elig:
                break

            # Find candidates who can give up a shift:
            # must be above their minimum AND lower priority than needy
            # Only donors who share an eligible shift type with needy
            # and are above their minimum
            needy_shift_types = set(eligibility_map.get(needy.id, {}).keys())

            donors = [
                emp for emp in regular_employees
                if emp.id != needy.id
                and len(employee_dates[emp.id]) > get_min(emp)
                and bool(
                    needy_shift_types &
                    set(s for (ds, s), eid in slot_owner.items() if eid == emp.id)
                )
            ]

            # Sort: lowest priority first (highest rank number) = give up shifts from least important person
            donors.sort(key=lambda e: -e.priority_rank)

            if not donors:
                # No one can give up a shift — check if on-call can cover
                break

            stolen = False
            for donor in donors:
                # Find a shift this donor has that needy can also do
                donor_slots = [
                    (date_str, sn)
                    for (date_str, sn), eid in slot_owner.items()
                    if eid == donor.id
                ]

                for date_str, shift_name in donor_slots:
                    # Can needy do this shift?
                    if shift_name not in needy_elig:
                        continue
                    d = date.fromisoformat(date_str)
                    # Check needy is not blocked for this slot
                    if fixed_priority(needy, d) == 3:
                        continue
                    if (needy.id, date_str) in timeoff_set:
                        continue
                    if shift_name == 'MORNING':
                        prev = (d - timedelta(days=1)).isoformat()
                        if (needy.id, prev) in night_worked:
                            continue
                    if date_str in employee_dates[needy.id]:
                        continue

                    # Steal the shift
                    unassign(donor.id, date_str, shift_name)
                    assign(needy, d, shift_name)
                    stolen = True
                    logger.debug(
                        f'Week {week_num+1}: Moved {shift_name} on {date_str} '
                        f'from {donor.first_name} to {needy.first_name}'
                    )
                    break

                if stolen:
                    break

            if not stolen:
                # Could not satisfy minimum for needy — warn and move on
                all_warnings.append({
                    'type': 'UNDERSTAFFED',
                    'date': f'week {week_num+1}',
                    'shift_type': None,
                    'employee_id': needy.id,
                    'message': f'{needy.full_name} could not reach minimum of {get_min(needy)} shifts in week {week_num+1}.'
                })
                break

        # -------------------------------------------------------------------
        # PHASE 3: Fill empty slots with on-call employees
        # -------------------------------------------------------------------
        for shift_name in SHIFT_ORDER:
            for d in week_days:
                date_str = d.isoformat()
                if (date_str, shift_name) in slot_owner:
                    continue
                for emp in oncall_employees:
                    if is_hard_blocked(emp, d, shift_name):
                        continue
                    if date_str in employee_dates[emp.id]:
                        continue
                    assign(emp, d, shift_name)
                    break

        # -------------------------------------------------------------------
        # PHASE 4: Build shift records + warnings
        # -------------------------------------------------------------------
        for (date_str, shift_name), emp_id in slot_owner.items():
            emp = next((e for e in all_employees if e.id == emp_id), None)
            if not emp or shift_name not in shift_types:
                continue
            d = date.fromisoformat(date_str)
            all_shifts.append({
                'employee_id': emp_id,
                'shift_type_id': shift_types[shift_name].id,
                'date': d,
                'is_override': False,
            })

            count = len(employee_dates[emp_id])
            if count == 6:
                all_warnings.append({
                    'type': 'SIXTH_DAY', 'date': date_str, 'shift_type': shift_name,
                    'employee_id': emp_id,
                    'message': f'{emp.full_name} assigned 6th shift this week ({date_str} {shift_name}). Review required.'
                })
            elif count >= 7:
                all_warnings.append({
                    'type': 'SEVENTH_DAY', 'date': date_str, 'shift_type': shift_name,
                    'employee_id': emp_id,
                    'message': f'{emp.full_name} assigned 7th shift this week ({date_str} {shift_name}). Confirmation required.'
                })

        # Understaffed slots
        for shift_name in SHIFT_ORDER:
            for d in week_days:
                date_str = d.isoformat()
                if (date_str, shift_name) not in slot_owner:
                    all_warnings.append({
                        'type': 'UNDERSTAFFED', 'date': date_str, 'shift_type': shift_name,
                        'employee_id': None,
                        'message': f'No one available for {shift_name} on {date_str}. Shift UNDERSTAFFED.'
                    })

        # Debug summary
        for emp in all_employees:
            logger.debug(f'Week {week_num+1} — {emp.first_name}: {len(employee_dates[emp.id])} shifts (min={get_min(emp)}, target={get_target(emp)})')

    return {'shifts': all_shifts, 'warnings': all_warnings}


def check_timeoff_coverage(employee, date) -> bool:
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
        others_off = TimeOffRequest.objects.filter(
            employee_id__in=other_eligible_ids,
            date=date,
            status__in=['APPROVED', 'PENDING']
        ).count()
        if (len(other_eligible_ids) - others_off) <= 0:
            return True
    return False