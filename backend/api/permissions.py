# =============================================================================
# ShiftSync — Custom DRF Permissions
# =============================================================================

from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """Only the Owner role can access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'OWNER'


class IsManager(BasePermission):
    """Only the Manager role can access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'MANAGER'


class IsOwnerOrManager(BasePermission):
    """Owner or Manager can access."""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in ('OWNER', 'MANAGER')
        )


class IsEmployee(BasePermission):
    """Any authenticated user (all roles are employees in a broad sense)."""
    def has_permission(self, request, view):
        return request.user.is_authenticated
