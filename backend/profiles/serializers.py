from rest_framework import serializers
from .models import UserProfile, PartnerPreferences, ProfileLike, Message
from accounts.serializers import CustomUserSerializer
from accounts.models import CustomUser
from utils.cloudinary_upload import compress_and_upload_to_cloudinary  # ← ADD THIS

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

# ↓ ONLY THIS CLASS CHANGES
class UserProfileUpdateSerializer(serializers.ModelSerializer):
    profile_photo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = UserProfile
        exclude = ['user']

    def validate_profile_photo(self, value):
        if value is None:
            return value
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Image must be under 10MB.")
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
        if hasattr(value, 'content_type') and value.content_type not in allowed_types:
            raise serializers.ValidationError("Only JPEG, PNG, WEBP, or GIF allowed.")
        return value

    def update(self, instance, validated_data):
        photo_file = validated_data.pop("profile_photo", None)
        if photo_file is not None:
            try:
                validated_data["profile_photo"] = compress_and_upload_to_cloudinary(photo_file)
            except ValueError as e:
                raise serializers.ValidationError({"profile_photo": str(e)})
            except Exception as e:
                raise serializers.ValidationError({"profile_photo": f"Upload failed: {str(e)}"})
        return super().update(instance, validated_data)

    def create(self, validated_data):
        photo_file = validated_data.pop("profile_photo", None)
        if photo_file is not None:
            try:
                validated_data["profile_photo"] = compress_and_upload_to_cloudinary(photo_file)
            except ValueError as e:
                raise serializers.ValidationError({"profile_photo": str(e)})
            except Exception as e:
                raise serializers.ValidationError({"profile_photo": f"Upload failed: {str(e)}"})
        return super().create(validated_data)

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.first_name')
    receiver_name = serializers.ReadOnlyField(source='receiver.first_name')

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_name', 'receiver', 'receiver_name', 'content', 'timestamp', 'is_read']