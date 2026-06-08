# =============================================================================
# ShiftSync — Views
# =============================================================================
# TODO: Implement each view as we build each feature.
# Placeholder views are here so URLs don't break on import.
# =============================================================================

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status


# ---------------------------------------------------------------------------
# Auth Views
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    # TODO: implement token login
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['POST'])
def logout_view(request):
    # TODO: implement token logout
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['GET'])
def me_view(request):
    # TODO: return current user info
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    # TODO: handle invite token registration
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['POST'])
def change_password_view(request):
    # TODO: implement
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


# ---------------------------------------------------------------------------
# Employee Views
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
def employees_list_view(request):
    # TODO: GET = list all employees (owner/manager), POST = create employee
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['GET', 'PUT', 'DELETE'])
def employee_detail_view(request, pk):
    # TODO: GET = single employee, PUT = update, DELETE = soft delete
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['POST'])
def resend_invite_view(request, pk):
    # TODO: resend 48hr invite link
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


# ---------------------------------------------------------------------------
# Shift Type & Eligibility Views
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
def shift_types_view(request):
    # TODO: list shift types / create
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['PUT', 'DELETE'])
def shift_type_detail_view(request, pk):
    # TODO: update / delete shift type
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['GET', 'POST'])
def eligibility_view(request):
    # TODO: list / assign eligibility
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['DELETE'])
def eligibility_detail_view(request, pk):
    # TODO: remove eligibility
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


# ---------------------------------------------------------------------------
# Time-Off Request Views
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
def timeoff_list_view(request):
    # TODO: GET = all requests visible to user, POST = submit request
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['GET', 'PATCH', 'DELETE'])
def timeoff_detail_view(request, pk):
    # TODO: GET = single, PATCH = manager approve/deny, DELETE = employee cancel
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


# ---------------------------------------------------------------------------
# Schedule Views
# ---------------------------------------------------------------------------

@api_view(['GET'])
def schedule_view(request):
    # TODO: get schedule for a period (?week_start=2026-06-14)
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['POST'])
def schedule_generate_view(request):
    # TODO: trigger auto-generation for next 2-week period
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['PATCH'])
def schedule_approve_view(request, pk):
    # TODO: manager approves draft → emails everyone
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['PUT'])
def schedule_shift_edit_view(request, pk):
    # TODO: owner/manager edits one shift within 24hr window
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


# ---------------------------------------------------------------------------
# Notification Views
# ---------------------------------------------------------------------------

@api_view(['GET'])
def notifications_list_view(request):
    # TODO: get current user's notifications
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['PATCH'])
def notification_read_view(request, pk):
    # TODO: mark one notification as read
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['POST'])
def notifications_read_all_view(request):
    # TODO: mark all notifications as read
    return Response({'detail': 'Not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)
