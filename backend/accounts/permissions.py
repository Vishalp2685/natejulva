from rest_framework import permissions

class IsAdminUserRole(permissions.BasePermission):
    """
    Allows access only to admin users by role, is_staff, or is_superuser.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (getattr(request.user, 'role', 'user') == 'admin' or request.user.is_staff or request.user.is_superuser)
        )
