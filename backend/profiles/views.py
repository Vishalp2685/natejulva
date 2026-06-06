from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
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

class MyProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request):
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Invalidate recommendations cache
            cache.delete(f"recommendations_{request.user.id}")
            updated_profile = UserProfile.objects.get(user=request.user)
            return Response(UserProfileSerializer(updated_profile).data)
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
            profile = UserProfile.objects.get(user_id=pk)
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

class ProfileSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        queryset = UserProfile.objects.exclude(user=user)
        
        # 1. Filter out incomplete profiles
        complete_profiles = []
        for profile in queryset:
            if profile.completeness_percentage == 100:
                complete_profiles.append(profile)
                
        # 2. Apply query filters
        caste = request.query_params.get('caste')
        religion = request.query_params.get('religion')
        city = request.query_params.get('city')
        working_status = request.query_params.get('working_status')
        family_type = request.query_params.get('family_type')
        blood_group = request.query_params.get('blood_group')
        occupation = request.query_params.get('occupation')
        gender = request.query_params.get('gender')
        
        filtered = []
        for profile in complete_profiles:
            if gender and gender.lower() != (profile.user.gender or '').lower():
                continue
            if caste and caste.lower() not in (profile.caste or '').lower():
                continue
            if religion and religion.lower() not in (profile.religion or '').lower():
                continue
            if city and city.lower() not in (profile.city or '').lower():
                continue
            if working_status and working_status.lower() != (profile.working_status or '').lower():
                continue
            if family_type and family_type.lower() != (profile.family_type or '').lower():
                continue
            if blood_group and blood_group.lower() != (profile.blood_group or '').lower():
                continue
            if occupation and occupation.lower() not in (profile.occupation or '').lower():
                continue
            filtered.append(profile)
            
        results = []
        for cand in filtered:
            serialized_data = PublicUserProfileSerializer(cand).data
            serialized_data['liked_by_me'] = ProfileLike.objects.filter(sender=user, receiver=cand.user).exists()
            results.append(serialized_data)
            
        return Response(results)

class RecommendationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        cache_key = f"recommendations_{user.id}"
        
        # Check cache first
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            return Response(cached_response, status=status.HTTP_200_OK)
            
        profile, created = UserProfile.objects.get_or_create(user=user)
        
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
        
        # Filter opposite gender and complete profiles
        user_gender = user.gender
        target_gender = 'Female' if user_gender == 'Male' else 'Male' if user_gender == 'Female' else None
        
        queryset = UserProfile.objects.exclude(user=user)
        if target_gender:
            queryset = queryset.filter(user__gender=target_gender)
            
        complete_candidates = []
        for other_profile in queryset:
            if other_profile.completeness_percentage == 100:
                complete_candidates.append(other_profile)
                
        # Calculate dynamic compatibility scores using a weighted system
        scored_candidates = []
        for cand in complete_candidates:
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
        
        # Get IDs of users already liked by the current user — exclude from recommendations
        already_liked_ids = set(
            ProfileLike.objects.filter(sender=user).values_list('receiver_id', flat=True)
        )

        # Calculate dynamic compatibility scores using a weighted system
        results = []
        for cand, match_pct in scored_candidates:
            # Skip if current user already sent a like
            if cand.user_id in already_liked_ids:
                continue
            serialized_data = PublicUserProfileSerializer(cand).data
            serialized_data['liked_by_me'] = False
            results.append(serialized_data)
            
        response_data = {
            "is_complete": True,
            "completeness_percentage": 100,
            "message": "Recommendations loaded successfully.",
            "results": results[:6]
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
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        likes = ProfileLike.objects.filter(sender=request.user)
        profiles = [UserProfile.objects.get(user=like.receiver) for like in likes]
        serializer = PublicUserProfileSerializer(profiles, many=True)
        return Response(serializer.data)

class LikesReceivedView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        likes = ProfileLike.objects.filter(receiver=request.user)
        profiles = []
        for like in likes:
            liked_back = ProfileLike.objects.filter(sender=request.user, receiver=like.sender).exists()
            if not liked_back:
                profiles.append(UserProfile.objects.get(user=like.sender))
                
        serializer = PublicUserProfileSerializer(profiles, many=True)
        return Response(serializer.data)

class MutualMatchesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        likes_sent = ProfileLike.objects.filter(sender=user).values_list('receiver_id', flat=True)
        mutual_likes = ProfileLike.objects.filter(sender_id__in=likes_sent, receiver=user)
        
        profiles = [UserProfile.objects.get(user=like.sender) for like in mutual_likes]
        serializer = PublicUserProfileSerializer(profiles, many=True)
        return Response(serializer.data)

class ChatMessagesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, receiver_id):
        user = request.user
        is_liked = ProfileLike.objects.filter(sender=user, receiver_id=receiver_id).exists()
        is_liked_back = ProfileLike.objects.filter(sender_id=receiver_id, receiver=user).exists()
        if not (is_liked and is_liked_back):
            return Response({"error": "Only matched profiles are allowed to chat."}, status=status.HTTP_403_FORBIDDEN)
        
        messages = Message.objects.filter(
            (Q(sender=user) & Q(receiver_id=receiver_id)) | 
            (Q(sender_id=receiver_id) & Q(receiver=user))
        ).order_by('timestamp')
        
        Message.objects.filter(sender_id=receiver_id, receiver=user, is_read=False).update(is_read=True)
        
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request, receiver_id):
        user = request.user
        is_liked = ProfileLike.objects.filter(sender=user, receiver_id=receiver_id).exists()
        is_liked_back = ProfileLike.objects.filter(sender_id=receiver_id, receiver=user).exists()
        if not (is_liked and is_liked_back):
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
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        likes_sent = ProfileLike.objects.filter(sender=user).values_list('receiver_id', flat=True)
        mutual_likes = ProfileLike.objects.filter(sender_id__in=likes_sent, receiver=user)
        
        conversations = []
        for like in mutual_likes:
            partner = like.sender
            profile = UserProfile.objects.get(user=partner)
            
            last_msg = Message.objects.filter(
                (Q(sender=user) & Q(receiver=partner)) | 
                (Q(sender=partner) & Q(receiver=user))
            ).order_by('-timestamp').first()
            
            unread_count = Message.objects.filter(
                sender=partner,
                receiver=user,
                is_read=False
            ).count()
            
            serialized_profile = PublicUserProfileSerializer(profile).data
            
            conversations.append({
                "profile": serialized_profile,
                "last_message": MessageSerializer(last_msg).data if last_msg else None,
                "unread_count": unread_count
            })
            
        return Response(conversations)
