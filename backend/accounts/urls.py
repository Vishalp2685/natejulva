from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegisterView, VerifyOTPView, LoginView
from .admin_views import AdminDashboardView, AdminUserViewSet, AdminReportsView

router = DefaultRouter()
router.register(r'admin/users', AdminUserViewSet, basename='admin-users')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('login/', LoginView.as_view(), name='login'),
    
    # Admin routes
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/reports/', AdminReportsView.as_view(), name='admin-reports'),
    path('', include(router.urls)),
]
