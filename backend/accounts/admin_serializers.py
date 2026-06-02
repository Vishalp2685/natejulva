from rest_framework import serializers
from django.contrib.auth import get_user_model
from profiles.models import UserProfile

User = get_user_model()

class UserProfileAdminSerializer(serializers.ModelSerializer):
    completeness_percentage = serializers.ReadOnlyField()
    is_complete = serializers.ReadOnlyField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'height', 'religion', 'caste', 'marital_status', 'blood_group',
            'city', 'hometown', 'current_place_of_living', 'education', 'occupation',
            'working_status', 'annual_salary', 'about_me', 'family_type', 'profile_photo',
            'verification_status', 'is_verified', 'admin_remarks', 'is_premium',
            'premium_expiry', 'payment_status', 'completeness_percentage', 'is_complete'
        ]

class AdminUserSerializer(serializers.ModelSerializer):
    profile = UserProfileAdminSerializer(required=False)

    class Meta:
        model = User
        fields = [
            'id', 'mobile_number', 'first_name', 'middle_name', 'last_name',
            'email', 'age', 'gender', 'role', 'is_active', 'date_joined', 'profile'
        ]
        read_only_fields = ['id', 'date_joined']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update profile fields if provided
        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance
