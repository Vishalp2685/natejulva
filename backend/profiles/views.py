from rest_framework.pagination import PageNumberPagination
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q, Count
from django.core.cache import cache
from .models import UserProfile, PartnerPreferences, ProfileLike, Message
from .serializers import (
    UserProfileSerializer, 
    UserProfileUpdateSerializer, 
    PartnerPreferencesSerializer,
    PublicUserProfileSerializer,
    MessageSerializer
)
from accounts.models import CustomUser

# ---------------------------------------------------------------------------
# Helper: Build a queryset of profiles with 100% completeness (all required
# fields filled) — used by both Search and Recommendations to avoid the
# expensive Python‑loop approach.
# ---------------------------------------------------------------------------
REQUIRED_PROFILE_FIELDS = [
    'height', 'religion', 'caste', 'marital_status', 'blood_group',
    'city', 'hometown', 'education',
    'occupation', 'working_status', 'annual_salary', 'about_me',
    'family_type',
]

def _complete_profiles_qs(base_qs):
    """Filters a UserProfile queryset to only those with every required field filled."""
    qs = base_qs
    for field in REQUIRED_PROFILE_FIELDS:
        qs = qs.exclude(**{f'{field}__isnull': True}).exclude(**{field: ''})
    qs = qs.exclude(profile_photo='').exclude(profile_photo__isnull=True)
    return qs


class MyProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # B4: select_related to avoid lazy-load on nested user serializer
        profile, created = UserProfile.objects.select_related('user').get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request):
        # B4 + B6: select_related; removed redundant re-fetch after save
        profile, created = UserProfile.objects.select_related('user').get_or_create(user=request.user)
        serializer = UserProfileUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Invalidate recommendations cache
            cache.delete(f"recommendations_{request.user.id}")
            profile.refresh_from_db()
            return Response(UserProfileSerializer(profile).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PartnerPreferencesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        prefs, created = PartnerPreferences.objects.get_or_create(user=request.user)
        serializer = PartnerPreferencesSerializer(prefs)
        return Response(serializer.data)

    def put(self, request):
        prefs, created = PartnerPreferences.objects.get_or_create(user=request.user)
        serializer = PartnerPreferencesSerializer(prefs, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Invalidate recommendations cache
            cache.delete(f"recommendations_{request.user.id}")
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PublicProfileDetailsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            # B4: select_related
            profile = UserProfile.objects.select_related('user').get(user_id=pk)
            # Fetch if current user has already liked them
            liked = ProfileLike.objects.filter(sender=request.user, receiver_id=pk).exists()
            # Fetch if they have liked the current user
            liked_back = ProfileLike.objects.filter(sender_id=pk, receiver=request.user).exists()
            mutual = liked and liked_back
            
            serializer = PublicUserProfileSerializer(profile)
            data = serializer.data
            data['liked_by_me'] = liked
            data['likes_me_back'] = liked_back
            data['mutual_match'] = mutual
            
            return Response(data)
        except UserProfile.DoesNotExist:
            return Response({"error": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)


class SearchPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


class ProfileSearchView(APIView):
    """B1: All filtering done at the database level with select_related to
    eliminate Python-loop filtering and N+1 queries. Results are paginated."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        # Start with all profiles except the current user, eagerly loading user
        queryset = UserProfile.objects.exclude(user=user).select_related('user')

        # Database-level completeness filter — replaces the Python loop
        queryset = _complete_profiles_qs(queryset)

        # Apply query filters at DB level
        filter_map = {
            'caste__icontains': request.query_params.get('caste'),
            'religion__icontains': request.query_params.get('religion'),
            'city__icontains': request.query_params.get('city'),
            'working_status__iexact': request.query_params.get('working_status'),
            'family_type__iexact': request.query_params.get('family_type'),
            'blood_group__iexact': request.query_params.get('blood_group'),
            'occupation__icontains': request.query_params.get('occupation'),
            'user__gender__iexact': request.query_params.get('gender'),
        }
        for lookup, value in filter_map.items():
            if value:
                queryset = queryset.filter(**{lookup: value})

        # Paginate queryset
        paginator = SearchPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)

        if page is not None:
            # Pre-fetch liked IDs in ONE query for ONLY the paginated candidates
            candidate_ids = [cand.user_id for cand in page]
            liked_ids = set(
                ProfileLike.objects.filter(sender=user, receiver_id__in=candidate_ids).values_list('receiver_id', flat=True)
            )
            results = []
            for cand in page:
                serialized_data = PublicUserProfileSerializer(cand).data
                serialized_data['liked_by_me'] = cand.user_id in liked_ids
                results.append(serialized_data)
            return paginator.get_paginated_response(results)

        # Fallback (non-paginated, though paginate_queryset always returns something or raise NotFound if out of range)
        liked_ids = set(
            ProfileLike.objects.filter(sender=user).values_list('receiver_id', flat=True)
        )
        results = []
        for cand in queryset:
            serialized_data = PublicUserProfileSerializer(cand).data
            serialized_data['liked_by_me'] = cand.user_id in liked_ids
            results.append(serialized_data)
        return Response(results)

class RecommendationsView(APIView):
    """B1 + B7: Database-level completeness filter, select_related on user,
    pre-fetch liked IDs. Scoring loop still runs in Python but on a
    pre-filtered, pre-joined queryset."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        cache_key = f"recommendations_{user.id}"
        
        # Check cache first
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            return Response(cached_response, status=status.HTTP_200_OK)
            
        # B4: select_related
        profile, created = UserProfile.objects.select_related('user').get_or_create(user=user)
        
        # Enforce 100% profile completeness
        completeness = profile.completeness_percentage
        if completeness < 100:
            return Response({
                "is_complete": False,
                "completeness_percentage": completeness,
                "message": "No recommendation available, complete profile to get recommendations.",
                "results": []
            }, status=status.HTTP_200_OK)
            
        # Get partner preferences
        prefs, created = PartnerPreferences.objects.get_or_create(user=user)
        
        # Filter opposite gender
        user_gender = user.gender
        target_gender = 'Female' if user_gender == 'Male' else 'Male' if user_gender == 'Female' else None
        
        # B1/B7: Database-level filtering + select_related
        queryset = UserProfile.objects.exclude(user=user).select_related('user')
        if target_gender:
            queryset = queryset.filter(user__gender=target_gender)
        queryset = _complete_profiles_qs(queryset)
            
        # Get IDs of users already liked by the current user — exclude from recommendations
        already_liked_ids = set(
            ProfileLike.objects.filter(sender=user).values_list('receiver_id', flat=True)
        )

        # Calculate dynamic compatibility scores using a weighted system
        scored_candidates = []
        for cand in queryset:
            # Skip if current user already sent a like
            if cand.user_id in already_liked_ids:
                continue

            score = 0
            max_possible = 0
            
            # 1. Critical Preferences (Weight 3)
            # Religion check
            if prefs.religion:
                max_possible += 3
                if prefs.religion.lower() in (cand.religion or '').lower():
                    score += 3
            # Location check
            if prefs.location:
                max_possible += 3
                if (prefs.location.lower() in (cand.city or '').lower()) or (prefs.location.lower() in (cand.hometown or '').lower()):
                    score += 3
                    
            # 2. Important Preferences (Weight 2)
            # Caste check
            if prefs.caste:
                max_possible += 2
                if prefs.caste.lower() in (cand.caste or '').lower():
                    score += 2
            # Working status check
            if prefs.working_status:
                max_possible += 2
                if prefs.working_status.lower() == (cand.working_status or '').lower():
                    score += 2
            # Salary check
            if prefs.annual_salary:
                max_possible += 2
                if prefs.annual_salary.lower() in (cand.annual_salary or '').lower():
                    score += 2
            # Age range check
            if prefs.min_age or prefs.max_age:
                max_possible += 2
                min_a = prefs.min_age or 18
                max_a = prefs.max_age or 100
                if min_a <= cand.user.age <= max_a:
                    score += 2
                    
            # 3. General Preferences (Weight 1)
            # Height check
            if prefs.height:
                max_possible += 1
                if prefs.height.lower() in (cand.height or '').lower():
                    score += 1
            # Occupation check
            if prefs.occupation:
                max_possible += 1
                if prefs.occupation.lower() in (cand.occupation or '').lower():
                    score += 1
            # Family type check
            if prefs.family_type:
                max_possible += 1
                if prefs.family_type.lower() == (cand.family_type or '').lower():
                    score += 1
            # Blood group check
            if prefs.blood_group:
                max_possible += 1
                if prefs.blood_group.lower() == (cand.blood_group or '').lower():
                    score += 1
                    
            match_percentage = int((score / max_possible) * 100) if max_possible > 0 else 100
            scored_candidates.append((cand, match_percentage))
            
        # Sort by score descending
        scored_candidates.sort(key=lambda x: x[1], reverse=True)

        # Build results (top 6)
        results = []
        for cand, match_pct in scored_candidates[:6]:
            serialized_data = PublicUserProfileSerializer(cand).data
            serialized_data['liked_by_me'] = False
            results.append(serialized_data)
            
        response_data = {
            "is_complete": True,
            "completeness_percentage": 100,
            "message": "Recommendations loaded successfully.",
            "results": results
        }
        
        # Cache calculated recommendations for 300 seconds (5 minutes)
        cache.set(cache_key, response_data, 300)
        
        return Response(response_data, status=status.HTTP_200_OK)

class LikeProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        receiver_id = request.data.get('receiver_id')
        if not receiver_id:
            return Response({"error": "Receiver ID is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            receiver = CustomUser.objects.get(id=receiver_id)
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if receiver == request.user:
            return Response({"error": "You cannot like your own profile."}, status=status.HTTP_400_BAD_REQUEST)
            
        like, created = ProfileLike.objects.get_or_create(sender=request.user, receiver=receiver)
        
        # Invalidate recommendations cache for both sender and receiver
        cache.delete(f"recommendations_{request.user.id}")
        cache.delete(f"recommendations_{receiver_id}")
        
        # Check if mutual match
        mutual_match = ProfileLike.objects.filter(sender=receiver, receiver=request.user).exists()
        
        return Response({
            "mutual_match": mutual_match,
            "message": "Mutual match established!" if mutual_match else "Profile liked successfully."
        }, status=status.HTTP_200_OK)

class UnmatchProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        receiver_id = request.data.get('receiver_id')
        if not receiver_id:
            return Response({"error": "Receiver ID is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            receiver = CustomUser.objects.get(id=receiver_id)
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
            
        # Delete user's outgoing like to this person
        deleted_count, _ = ProfileLike.objects.filter(sender=request.user, receiver=receiver).delete()
        
        # Invalidate recommendations cache for both sender and receiver
        cache.delete(f"recommendations_{request.user.id}")
        cache.delete(f"recommendations_{receiver_id}")
        
        # Clean up message history for privacy
        Message.objects.filter(
            (Q(sender=request.user) & Q(receiver=receiver)) | 
            (Q(sender=receiver) & Q(receiver=request.user))
        ).delete()
        
        if deleted_count > 0:
            return Response({"message": "Unmatched successfully."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "You are not connected with this user."}, status=status.HTTP_400_BAD_REQUEST)

class LikesSentView(APIView):
    """B2: Replaced list comprehension N+1 with a single bulk query + select_related."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        receiver_ids = ProfileLike.objects.filter(
            sender=request.user
        ).values_list('receiver_id', flat=True)
        profiles = UserProfile.objects.filter(
            user_id__in=receiver_ids
        ).select_related('user')
        serializer = PublicUserProfileSerializer(profiles, many=True)
        return Response(serializer.data)

class LikesReceivedView(APIView):
    """B2: Replaced loop with N+1 .get() and .exists() calls with set operations + bulk query."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # All users who liked me
        sender_ids = set(
            ProfileLike.objects.filter(receiver=request.user)
            .values_list('sender_id', flat=True)
        )
        # Users I have liked back (to exclude mutual matches)
        liked_back_ids = set(
            ProfileLike.objects.filter(sender=request.user, receiver_id__in=sender_ids)
            .values_list('receiver_id', flat=True)
        )
        pending_ids = sender_ids - liked_back_ids
        profiles = UserProfile.objects.filter(
            user_id__in=pending_ids
        ).select_related('user')
        serializer = PublicUserProfileSerializer(profiles, many=True)
        return Response(serializer.data)

class MutualMatchesView(APIView):
    """B2: Replaced list comprehension N+1 with set intersection + bulk query."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        sent_ids = set(
            ProfileLike.objects.filter(sender=user).values_list('receiver_id', flat=True)
        )
        mutual_sender_ids = set(
            ProfileLike.objects.filter(sender_id__in=sent_ids, receiver=user)
            .values_list('sender_id', flat=True)
        )
        profiles = UserProfile.objects.filter(
            user_id__in=mutual_sender_ids
        ).select_related('user')
        serializer = PublicUserProfileSerializer(profiles, many=True)
        return Response(serializer.data)

class ChatMessagesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, receiver_id):
        user = request.user
        # B8: Combine two .exists() calls into one .count() check
        match_count = ProfileLike.objects.filter(
            Q(sender=user, receiver_id=receiver_id) |
            Q(sender_id=receiver_id, receiver=user)
        ).count()
        if match_count < 2:
            return Response({"error": "Only matched profiles are allowed to chat."}, status=status.HTTP_403_FORBIDDEN)
        
        messages = Message.objects.filter(
            (Q(sender=user) & Q(receiver_id=receiver_id)) | 
            (Q(sender_id=receiver_id) & Q(receiver=user))
        )

        after_id = request.query_params.get('after_id')
        if after_id:
            try:
                messages = messages.filter(id__gt=int(after_id))
            except ValueError:
                pass

        messages = messages.order_by('timestamp')
        
        Message.objects.filter(sender_id=receiver_id, receiver=user, is_read=False).update(is_read=True)
        
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request, receiver_id):
        user = request.user
        # B8: Combine two .exists() calls into one .count() check
        match_count = ProfileLike.objects.filter(
            Q(sender=user, receiver_id=receiver_id) |
            Q(sender_id=receiver_id, receiver=user)
        ).count()
        if match_count < 2:
            return Response({"error": "Only matched profiles are allowed to chat."}, status=status.HTTP_403_FORBIDDEN)
            
        content = request.data.get('content')
        if not content:
            return Response({"error": "Content is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            receiver = CustomUser.objects.get(id=receiver_id)
        except CustomUser.DoesNotExist:
            return Response({"error": "Receiver not found."}, status=status.HTTP_404_NOT_FOUND)
            
        message = Message.objects.create(sender=user, receiver=receiver, content=content)
        serializer = MessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class ChatConversationsView(APIView):
    """B3: Replaced per-match N+1 (3 queries/match) with batch operations (~5 queries total)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        # Step 1: Get mutual match partner IDs (2 queries)
        sent_ids = set(
            ProfileLike.objects.filter(sender=user).values_list('receiver_id', flat=True)
        )
        mutual_partner_ids = list(
            ProfileLike.objects.filter(sender_id__in=sent_ids, receiver=user)
            .values_list('sender_id', flat=True)
        )

        if not mutual_partner_ids:
            return Response([])

        # Step 2: Batch-fetch all profiles (1 query with select_related)
        profiles_map = {
            p.user_id: p
            for p in UserProfile.objects.filter(user_id__in=mutual_partner_ids)
                .select_related('user')
        }

        # Step 3: Batch-fetch last messages — get all relevant messages in one query
        partner_messages = Message.objects.filter(
            Q(sender=user, receiver_id__in=mutual_partner_ids) |
            Q(sender_id__in=mutual_partner_ids, receiver=user)
        ).order_by('-timestamp')

        last_messages = {}
        for msg in partner_messages:
            partner_id = msg.receiver_id if msg.sender_id == user.id else msg.sender_id
            if partner_id not in last_messages:
                last_messages[partner_id] = msg

        # Step 4: Batch unread counts in one aggregation query
        unread_qs = (
            Message.objects.filter(
                sender_id__in=mutual_partner_ids, receiver=user, is_read=False
            )
            .values('sender_id')
            .annotate(cnt=Count('id'))
        )
        unread_counts = {row['sender_id']: row['cnt'] for row in unread_qs}

        # Step 5: Build response
        conversations = []
        for pid in mutual_partner_ids:
            profile = profiles_map.get(pid)
            if not profile:
                continue
            last_msg = last_messages.get(pid)
            conversations.append({
                "profile": PublicUserProfileSerializer(profile).data,
                "last_message": MessageSerializer(last_msg).data if last_msg else None,
                "unread_count": unread_counts.get(pid, 0)
            })

        return Response(conversations)
