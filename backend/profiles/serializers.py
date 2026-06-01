from rest_framework import serializers
from .models import UserProfile, PartnerPreferences, ProfileLike, Message
from accounts.serializers import CustomUserSerializer
from accounts.models import CustomUser

class PublicUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'first_name', 'middle_name', 'last_name', 'age', 'gender']

class PartnerPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerPreferences
        exclude = ['user']

class UserProfileSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer(read_only=True)
    completeness_percentage = serializers.ReadOnlyField()
    is_complete = serializers.ReadOnlyField()
    partner_preferences = PartnerPreferencesSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'height', 'religion', 'caste', 'marital_status',
            'blood_group', 'city', 'hometown', 'current_place_of_living',
            'education', 'occupation', 'working_status', 'annual_salary',
            'about_me', 'family_type', 'profile_photo',
            'completeness_percentage', 'is_complete', 'partner_preferences'
        ]

class PublicUserProfileSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)
    completeness_percentage = serializers.ReadOnlyField()
    is_complete = serializers.ReadOnlyField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'height', 'religion', 'caste', 'marital_status',
            'blood_group', 'city', 'hometown', 'current_place_of_living',
            'education', 'occupation', 'working_status', 'annual_salary',
            'about_me', 'family_type', 'profile_photo',
            'completeness_percentage', 'is_complete'
        ]

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        exclude = ['user']

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.first_name')
    receiver_name = serializers.ReadOnlyField(source='receiver.first_name')

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_name', 'receiver', 'receiver_name', 'content', 'timestamp', 'is_read']
