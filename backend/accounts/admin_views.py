import datetime
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination

from profiles.models import UserProfile
from .admin_serializers import AdminUserSerializer, UserProfileAdminSerializer
from .permissions import IsAdminUserRole

User = get_user_model()

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class AdminDashboardView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        now = timezone.now()
        first_day_of_month = timezone.make_aware(datetime.datetime(now.year, now.month, 1))
        
        total_users = User.objects.exclude(role='admin').count()
        total_male = User.objects.filter(gender='Male').exclude(role='admin').count()
        total_female = User.objects.filter(gender='Female').exclude(role='admin').count()
        
        total_premium = UserProfile.objects.filter(is_premium=True).count()
        new_this_month = User.objects.filter(date_joined__gte=first_day_of_month).exclude(role='admin').count()
        pending_approvals = UserProfile.objects.filter(verification_status='pending').count()
        
        # Recent Activity (last 10 user registrations)
        recent_users = User.objects.exclude(role='admin').order_by('-date_joined')[:10]
        recent_activity = []
        for u in recent_users:
            recent_activity.append({
                'id': u.id,
                'name': f"{u.first_name} {u.last_name}",
                'mobile_number': u.mobile_number,
                'email': u.email or 'N/A',
                'gender': u.gender,
                'date_joined': u.date_joined.strftime('%Y-%m-%d %H:%M'),
                'is_active': u.is_active
            })
            
        data = {
            'total_users': total_users,
            'total_male': total_male,
            'total_female': total_female,
            'total_premium': total_premium,
            'new_registrations_this_month': new_this_month,
            'pending_profile_approvals': pending_approvals,
            'recent_activity': recent_activity
        }
        return Response(data, status=status.HTTP_200_OK)

class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUserRole]
    serializer_class = AdminUserSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        # Exclude other admin users to focus on bureau customers
        queryset = User.objects.exclude(role='admin').order_by('-id')
        
        # Search & Filtering parameters
        search_query = self.request.query_params.get('search', None)
        city = self.request.query_params.get('city', None)
        caste = self.request.query_params.get('caste', None)
        religion = self.request.query_params.get('religion', None)
        gender = self.request.query_params.get('gender', None)
        verification_status = self.request.query_params.get('verification_status', None)
        is_premium = self.request.query_params.get('is_premium', None)

        if search_query:
            queryset = queryset.filter(
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(mobile_number__icontains=search_query) |
                Q(profile__city__icontains=search_query) |
                Q(profile__caste__icontains=search_query) |
                Q(profile__religion__icontains=search_query)
            )

        if city:
            queryset = queryset.filter(profile__city__icontains=city)
        if caste:
            queryset = queryset.filter(profile__caste__icontains=caste)
        if religion:
            queryset = queryset.filter(profile__religion__icontains=religion)
        if gender:
            queryset = queryset.filter(gender=gender)
        if verification_status:
            queryset = queryset.filter(profile__verification_status=verification_status)
        if is_premium is not None:
            if is_premium.lower() == 'true':
                queryset = queryset.filter(profile__is_premium=True)
            elif is_premium.lower() == 'false':
                queryset = queryset.filter(profile__is_premium=False)

        return queryset

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response({
            'status': 'success',
            'is_active': user.is_active,
            'message': f"User account has been {'activated' if user.is_active else 'suspended'}."
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='verify-profile')
    def verify_profile(self, request, pk=None):
        user = self.get_object()
        profile = user.profile
        
        v_status = request.data.get('verification_status') # approved, rejected, pending
        remarks = request.data.get('admin_remarks', '')

        if v_status not in ['approved', 'rejected', 'pending']:
            return Response({'error': 'Invalid verification status.'}, status=status.HTTP_400_BAD_REQUEST)
        
        profile.verification_status = v_status
        profile.is_verified = (v_status == 'approved')
        profile.admin_remarks = remarks
        profile.save()
        
        return Response({
            'status': 'success',
            'verification_status': profile.verification_status,
            'is_verified': profile.is_verified,
            'admin_remarks': profile.admin_remarks,
            'message': f"Profile status updated to {v_status}."
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='update-membership')
    def update_membership(self, request, pk=None):
        user = self.get_object()
        profile = user.profile
        
        is_premium = request.data.get('is_premium')
        months = int(request.data.get('months', 6))
        payment_status = request.data.get('payment_status', 'completed')

        if is_premium is True:
            profile.is_premium = True
            profile.premium_expiry = timezone.now() + timezone.timedelta(days=30 * months)
            profile.payment_status = payment_status
        else:
            profile.is_premium = False
            profile.premium_expiry = None
            profile.payment_status = 'cancelled'
            
        profile.save()
        return Response({
            'status': 'success',
            'is_premium': profile.is_premium,
            'premium_expiry': profile.premium_expiry.strftime('%Y-%m-%d') if profile.premium_expiry else None,
            'payment_status': profile.payment_status,
            'message': "Membership subscription updated successfully."
        }, status=status.HTTP_200_OK)

class AdminReportsView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        # 1. Registrations by month (last 6 months)
        registrations_by_month = []
        now = timezone.now()
        for i in range(5, -1, -1):
            date = now - timezone.timedelta(days=30 * i)
            month_start = timezone.make_aware(datetime.datetime(date.year, date.month, 1))
            if date.month == 12:
                month_end = timezone.make_aware(datetime.datetime(date.year + 1, 1, 1))
            else:
                month_end = timezone.make_aware(datetime.datetime(date.year, date.month + 1, 1))
                
            count = User.objects.filter(
                date_joined__gte=month_start,
                date_joined__lt=month_end
            ).exclude(role='admin').count()
            
            registrations_by_month.append({
                'month': month_start.strftime('%b %Y'),
                'count': count
            })

        # 2. Gender distribution
        gender_counts = User.objects.exclude(role='admin').values('gender').annotate(count=Count('id'))
        gender_distribution = {item['gender']: item['count'] for item in gender_counts}

        # 3. Premium vs Free users
        premium_count = UserProfile.objects.filter(is_premium=True).count()
        free_count = UserProfile.objects.filter(is_premium=False).count()
        
        # 4. Active vs Suspended users
        active_count = User.objects.filter(is_active=True).exclude(role='admin').count()
        suspended_count = User.objects.filter(is_active=False).exclude(role='admin').count()

        data = {
            'registrations_by_month': registrations_by_month,
            'gender_distribution': {
                'Male': gender_distribution.get('Male', 0),
                'Female': gender_distribution.get('Female', 0),
                'Other': gender_distribution.get('Other', 0)
            },
            'membership_distribution': {
                'Premium': premium_count,
                'Free': free_count
            },
            'active_status_distribution': {
                'Active': active_count,
                'Suspended': suspended_count
            }
        }
        return Response(data, status=status.HTTP_200_OK)
