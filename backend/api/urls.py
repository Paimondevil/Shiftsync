# =============================================================================
# ShiftSync — API URL Configuration
# =============================================================================

from django.urls import path
from . import views

urlpatterns = [
    # --- Auth ---
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/me/', views.me_view, name='me'),
    path('auth/register/', views.register_view, name='register'),
    path('auth/change-password/', views.change_password_view, name='change-password'),

    # --- Employees ---
    path('employees/', views.employees_list_view, name='employees-list'),
    path('employees/<int:pk>/', views.employee_detail_view, name='employee-detail'),
    path('employees/<int:pk>/resend-invite/', views.resend_invite_view, name='resend-invite'),

    # --- Shift Types & Eligibility ---
    path('shifts/', views.shift_types_view, name='shift-types'),
    path('shifts/<int:pk>/', views.shift_type_detail_view, name='shift-type-detail'),
    path('eligibility/', views.eligibility_view, name='eligibility'),
    path('eligibility/<int:pk>/', views.eligibility_detail_view, name='eligibility-detail'),

    # --- Time-Off Requests ---
    path('timeoff/', views.timeoff_list_view, name='timeoff-list'),
    path('timeoff/<int:pk>/', views.timeoff_detail_view, name='timeoff-detail'),

    # --- Schedule ---
    path('schedule/', views.schedule_view, name='schedule'),
    path('schedule/generate/', views.schedule_generate_view, name='schedule-generate'),
    path('schedule/<int:pk>/approve/', views.schedule_approve_view, name='schedule-approve'),
    path('schedule/shift/<int:pk>/', views.schedule_shift_edit_view, name='schedule-shift-edit'),

    # --- Notifications ---
    path('notifications/', views.notifications_list_view, name='notifications-list'),
    path('notifications/<int:pk>/', views.notification_read_view, name='notification-read'),
    path('notifications/read-all/', views.notifications_read_all_view, name='notifications-read-all'),
]
