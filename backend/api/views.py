# =============================================================================
# ShiftSync — Views
# =============================================================================

from django.utils import timezone
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .models import (
    User, ShiftType, EmployeeShiftEligibility, FixedDayOff,
    InviteToken, TimeOffRequest, Schedule, ScheduleShift, Notification
)
from .serializers import (
    LoginSerializer, RegisterSerializer, ChangePasswordSerializer,
    UserSerializer, EmployeeCreateSerializer, EmployeeDetailSerializer,
    ShiftTypeSerializer, EmployeeShiftEligibilitySerializer, FixedDayOffSerializer,
    TimeOffRequestSerializer, TimeOffReviewSerializer,
    ScheduleSerializer, ScheduleShiftSerializer,
    NotificationSerializer
)
from .permissions import IsOwnerOrManager


# ---------------------------------------------------------------------------
# Auth Views
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.validated_data['user']
    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'user': UserSerializer(user).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response({'detail': 'Logged out successfully.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()
    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        'detail': 'Account created successfully.',
        'token': token.key,
        'user': UserSerializer(user).data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()
    # Invalidate old token and issue a new one
    request.user.auth_token.delete()
    token = Token.objects.create(user=request.user)

    return Response({
        'detail': 'Password changed successfully.',
        'token': token.key
    })


# ---------------------------------------------------------------------------
# Employee Views
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def employees_list_view(request):
    if request.method == 'GET':
        if request.user.role not in ('OWNER', 'MANAGER'):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        employees = User.objects.filter(is_deleted=False).order_by('priority_rank', 'first_name')
        return Response(EmployeeDetailSerializer(employees, many=True).data)

    if request.method == 'POST':
        if request.user.role not in ('OWNER', 'MANAGER'):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = EmployeeCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee = serializer.save()
        _send_invite(employee, request.user)

        return Response(EmployeeDetailSerializer(employee).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def employee_detail_view(request, pk):
    try:
        employee = User.objects.get(pk=pk, is_deleted=False)
    except User.DoesNotExist:
        return Response({'detail': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        if request.user.role not in ('OWNER', 'MANAGER') and request.user.pk != pk:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(EmployeeDetailSerializer(employee).data)

    if request.method == 'PUT':
        if request.user.role not in ('OWNER', 'MANAGER'):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = EmployeeDetailSerializer(employee, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    if request.method == 'DELETE':
        if request.user.role not in ('OWNER', 'MANAGER'):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        # Soft delete
        employee.is_deleted = True
        employee.is_active = False
        employee.deleted_at = timezone.now()
        employee.save()

        # Enforce soft delete cap of 50
        _enforce_soft_delete_cap()

        return Response({'detail': 'Employee deactivated.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resend_invite_view(request, pk):
    if request.user.role not in ('OWNER', 'MANAGER'):
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        employee = User.objects.get(pk=pk, is_deleted=False)
    except User.DoesNotExist:
        return Response({'detail': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

    _send_invite(employee, request.user)
    return Response({'detail': 'Invite resent successfully.'})


def _send_invite(employee, created_by):
    """Create a new invite token and send the email."""
    import secrets
    from .emails import send_invite_email

    # Expire any existing unused tokens
    InviteToken.objects.filter(employee=employee, is_used=False).update(
        expires_at=timezone.now()
    )

    token = InviteToken.objects.create(
        employee=employee,
        token=secrets.token_urlsafe(48),
        expires_at=timezone.now() + timezone.timedelta(hours=settings.INVITE_LINK_EXPIRY_HOURS)
    )
    send_invite_email(employee, token)


def _enforce_soft_delete_cap():
    """If more than 50 soft-deleted employees, permanently delete the oldest."""
    deleted = User.objects.filter(is_deleted=True).order_by('deleted_at')
    cap = settings.SOFT_DELETE_CAP
    if deleted.count() > cap:
        to_purge = deleted[:deleted.count() - cap]
        for user in to_purge:
            user.delete()


# ---------------------------------------------------------------------------
# Shift Type & Eligibility Views
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def shift_types_view(request):
    if request.method == 'GET':
        shift_types = ShiftType.objects.all()
        return Response(ShiftTypeSerializer(shift_types, many=True).data)

    if request.method == 'POST':
        if request.user.role not in ('OWNER', 'MANAGER'):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ShiftTypeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def shift_type_detail_view(request, pk):
    if request.user.role not in ('OWNER', 'MANAGER'):
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        shift_type = ShiftType.objects.get(pk=pk)
    except ShiftType.DoesNotExist:
        return Response({'detail': 'Shift type not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PUT':
        serializer = ShiftTypeSerializer(shift_type, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    if request.method == 'DELETE':
        shift_type.delete()
        return Response({'detail': 'Shift type deleted.'})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def eligibility_view(request):
    if request.method == 'GET':
        if request.user.role not in ('OWNER', 'MANAGER'):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        eligibilities = EmployeeShiftEligibility.objects.select_related('employee', 'shift_type').all()
        return Response(EmployeeShiftEligibilitySerializer(eligibilities, many=True).data)

    if request.method == 'POST':
        if request.user.role not in ('OWNER', 'MANAGER'):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = EmployeeShiftEligibilitySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def eligibility_detail_view(request, pk):
    if request.user.role not in ('OWNER', 'MANAGER'):
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        eligibility = EmployeeShiftEligibility.objects.get(pk=pk)
    except EmployeeShiftEligibility.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    eligibility.delete()
    return Response({'detail': 'Eligibility removed.'})


# ---------------------------------------------------------------------------
# Time-Off Request Views
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def timeoff_list_view(request):
    if request.method == 'GET':
        # All users see all requests (employees need to see others' requests)
        requests = TimeOffRequest.objects.select_related('employee', 'reviewed_by').order_by('-created_at')
        return Response(TimeOffRequestSerializer(requests, many=True).data)

    if request.method == 'POST':
        date = request.data.get('date')
        reason = request.data.get('reason', '')

        if not date:
            return Response({'detail': 'Date is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check for duplicate
        if TimeOffRequest.objects.filter(employee=request.user, date=date).exists():
            return Response({'detail': 'You already have a request for this date.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check coverage and decide auto-approve or pending
        from .scheduler import check_timeoff_coverage
        conflict = check_timeoff_coverage(request.user, date)

        if conflict:
            # Notify manager, keep as pending
            time_off = TimeOffRequest.objects.create(
                employee=request.user,
                date=date,
                reason=reason,
                status=TimeOffRequest.STATUS_PENDING
            )
            _notify_manager_timeoff_conflict(time_off)
        else:
            # Auto-approve
            time_off = TimeOffRequest.objects.create(
                employee=request.user,
                date=date,
                reason=reason,
                status=TimeOffRequest.STATUS_APPROVED,
                reviewed_at=timezone.now()
            )
            Notification.objects.create(
                recipient=request.user,
                notification_type=Notification.TYPE_TIMEOFF_AUTO_APPROVED,
                message=f'Your time-off request for {date} was automatically approved.',
                related_timeoff=time_off
            )

        return Response(TimeOffRequestSerializer(time_off).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def timeoff_detail_view(request, pk):
    try:
        time_off = TimeOffRequest.objects.get(pk=pk)
    except TimeOffRequest.DoesNotExist:
        return Response({'detail': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(TimeOffRequestSerializer(time_off).data)

    if request.method == 'PATCH':
        # Manager/owner approves or denies
        if request.user.role not in ('OWNER', 'MANAGER'):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = TimeOffReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        time_off.status = serializer.validated_data['status']
        time_off.manager_note = serializer.validated_data.get('manager_note', '')
        time_off.reviewed_at = timezone.now()
        time_off.reviewed_by = request.user
        time_off.save()

        notif_type = (
            Notification.TYPE_TIMEOFF_APPROVED
            if time_off.status == 'APPROVED'
            else Notification.TYPE_TIMEOFF_DENIED
        )
        Notification.objects.create(
            recipient=time_off.employee,
            notification_type=notif_type,
            message=f'Your time-off request for {time_off.date} was {time_off.status.lower()}.',
            related_timeoff=time_off
        )

        return Response(TimeOffRequestSerializer(time_off).data)

    if request.method == 'DELETE':
        # Employee cancels their own pending request
        if time_off.employee != request.user:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        if time_off.status != TimeOffRequest.STATUS_PENDING:
            return Response({'detail': 'Only pending requests can be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)
        time_off.delete()
        return Response({'detail': 'Request cancelled.'})


def _notify_manager_timeoff_conflict(time_off):
    from .emails import send_timeoff_conflict_email
    manager = User.objects.filter(role=User.ROLE_MANAGER, is_deleted=False).first()
    if not manager:
        manager = User.objects.filter(role=User.ROLE_OWNER, is_deleted=False).first()
    if manager:
        Notification.objects.create(
            recipient=manager,
            notification_type=Notification.TYPE_TIMEOFF_CONFLICT,
            message=f'{time_off.employee.full_name} requested {time_off.date} off — coverage conflict, needs review.',
            related_timeoff=time_off
        )
        send_timeoff_conflict_email(manager, time_off)


# ---------------------------------------------------------------------------
# Schedule Views
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def schedule_view(request):
    week_start = request.query_params.get('week_start')
    if not week_start:
        return Response({'detail': 'week_start query param required. (e.g. ?week_start=2026-06-14)'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        schedule = Schedule.objects.get(week_start_date=week_start)
    except Schedule.DoesNotExist:
        return Response({'detail': 'No schedule found for this period.'}, status=status.HTTP_404_NOT_FOUND)

    # Employees only see published schedules
    if request.user.role == User.ROLE_EMPLOYEE and schedule.status == Schedule.STATUS_DRAFT:
        return Response({'detail': 'Schedule not yet published.'}, status=status.HTTP_403_FORBIDDEN)

    return Response(ScheduleSerializer(schedule).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def schedule_generate_view(request):
    if request.user.role not in ('OWNER', 'MANAGER'):
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    from datetime import date, timedelta

    # Auto-calculate next period from latest existing schedule
    latest = Schedule.objects.order_by('-week_start_date').first()
    if latest:
        week_start = latest.week_start_date + timedelta(days=14)
    else:
        # No schedule yet — start from next Sunday
        today = date.today()
        days_until_sunday = (6 - today.weekday()) % 7 + 1
        if days_until_sunday == 7:
            days_until_sunday = 0
        week_start = today + timedelta(days=days_until_sunday)

    if Schedule.objects.filter(week_start_date=week_start).exists():
        return Response({'detail': f'A schedule for {week_start} already exists.'}, status=status.HTTP_400_BAD_REQUEST)
    
    from .scheduler import generate_schedule
    from .emails import send_schedule_draft_email
    from datetime import date

    try:
        result = generate_schedule(week_start)
    except Exception as e:
        return Response({'detail': f'Schedule generation failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    schedule = Schedule.objects.create(
        week_start_date=week_start,
        status=Schedule.STATUS_DRAFT,
        created_by=request.user
    )

    for shift_data in result['shifts']:
        ScheduleShift.objects.create(
            schedule=schedule,
            employee_id=shift_data['employee_id'],
            shift_type_id=shift_data['shift_type_id'],
            date=shift_data['date'],
            is_override=shift_data['is_override'],
        )

    # Notify manager via email
    manager = User.objects.filter(role=User.ROLE_MANAGER, is_deleted=False).first()
    if manager:
        send_schedule_draft_email(manager, schedule)
        Notification.objects.create(
            recipient=manager,
            notification_type=Notification.TYPE_SCHEDULE_DRAFT,
            message=f'New schedule draft ready for review: {week_start}',
            related_schedule=schedule
        )

    return Response({
        'schedule': ScheduleSerializer(schedule).data,
        'warnings': result.get('warnings', [])
    }, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def schedule_approve_view(request, pk):
    if request.user.role not in ('OWNER', 'MANAGER'):
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        schedule = Schedule.objects.get(pk=pk)
    except Schedule.DoesNotExist:
        return Response({'detail': 'Schedule not found.'}, status=status.HTTP_404_NOT_FOUND)

    if schedule.status != Schedule.STATUS_DRAFT:
        return Response({'detail': 'Only draft schedules can be approved.'}, status=status.HTTP_400_BAD_REQUEST)

    schedule.status = Schedule.STATUS_APPROVED
    schedule.approved_by = request.user
    schedule.approved_at = timezone.now()
    schedule.save()

    # Email everyone
    from .emails import send_schedule_published_email
    all_employees = User.objects.filter(is_active=True, is_deleted=False)
    send_schedule_published_email(list(all_employees), schedule)

    # Notify all employees in-app
    for employee in all_employees:
        Notification.objects.create(
            recipient=employee,
            notification_type=Notification.TYPE_SCHEDULE_PUBLISHED,
            message=f'The schedule for {schedule.week_start_date} has been published.',
            related_schedule=schedule
        )

    return Response(ScheduleSerializer(schedule).data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def schedule_shift_edit_view(request, pk):
    if request.user.role not in ('OWNER', 'MANAGER'):
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        shift = ScheduleShift.objects.select_related('schedule').get(pk=pk)
    except ScheduleShift.DoesNotExist:
        return Response({'detail': 'Shift not found.'}, status=status.HTTP_404_NOT_FOUND)

    schedule = shift.schedule

    if schedule.status == Schedule.STATUS_LOCKED:
        return Response({'detail': 'Schedule is locked and cannot be edited.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check 24hr window if already approved
    if schedule.status == Schedule.STATUS_APPROVED:
        hours_since_approval = (timezone.now() - schedule.approved_at).total_seconds() / 3600
        if hours_since_approval > 24:
            schedule.status = Schedule.STATUS_LOCKED
            schedule.locked_at = timezone.now()
            schedule.save()
            return Response({'detail': 'The 24-hour edit window has passed. Schedule is now locked.'}, status=status.HTTP_400_BAD_REQUEST)

    new_employee_id = request.data.get('employee')
    if new_employee_id:
        try:
            new_employee = User.objects.get(pk=new_employee_id, is_deleted=False)
        except User.DoesNotExist:
            return Response({'detail': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)
        shift.employee = new_employee
        shift.is_override = True
        shift.save()

    # If schedule was approved, notify everyone of the change
    if schedule.status == Schedule.STATUS_APPROVED:
        from .emails import send_schedule_edited_email
        all_employees = User.objects.filter(is_active=True, is_deleted=False)
        send_schedule_edited_email(list(all_employees), schedule, [shift])

        for employee in all_employees:
            Notification.objects.create(
                recipient=employee,
                notification_type=Notification.TYPE_SCHEDULE_EDITED,
                message=f'The schedule for {schedule.week_start_date} has been updated.',
                related_schedule=schedule
            )

    return Response(ScheduleShiftSerializer(shift).data)


# ---------------------------------------------------------------------------
# Notification Views
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications_list_view(request):
    notifications = Notification.objects.filter(recipient=request.user)
    return Response(NotificationSerializer(notifications, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def notification_read_view(request, pk):
    try:
        notification = Notification.objects.get(pk=pk, recipient=request.user)
    except Notification.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    notification.is_read = True
    notification.save()
    return Response(NotificationSerializer(notification).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notifications_read_all_view(request):
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({'detail': 'All notifications marked as read.'})