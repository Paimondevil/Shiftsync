# =============================================================================
# ShiftSync — Email Sending Functions
# =============================================================================
#
# All outbound emails are sent from here.
# Uses Django's built-in email backend (configured in settings.py).
#
# TODO: Implement each function below.
# =============================================================================

from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def send_invite_email(employee, invite_token):
    """
    Send a 48-hour invite link to a new employee.
    Link: {FRONTEND_URL}/register?token={invite_token.token}
    TODO: implement
    """
    pass


def send_schedule_draft_email(manager, schedule):
    """
    Notify manager that a new schedule draft is ready for review.
    Sent when auto-generation completes.
    TODO: implement
    """
    pass


def send_schedule_published_email(employees, schedule):
    """
    Send the full 2-week schedule to ALL employees (including owner) after manager approves.
    TODO: implement
    """
    pass


def send_schedule_edited_email(employees, schedule, changed_shifts):
    """
    Notify all employees when manager edits the schedule within the 24hr window.
    TODO: implement
    """
    pass


def send_timeoff_conflict_email(manager, timeoff_request):
    """
    Notify manager that a time-off request has a coverage conflict and needs manual review.
    TODO: implement
    """
    pass
