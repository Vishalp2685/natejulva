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
            'education', 'occupation', 'occupation_other', 'working_status', 'annual_salary',
            'education_level', 'occupation_category', 'annual_salary_range',
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
            'education', 'occupation', 'occupation_other', 'working_status', 'annual_salary',
            'education_level', 'occupation_category', 'annual_salary_range',
            'about_me', 'family_type', 'profile_photo',
            'completeness_percentage', 'is_complete'
        ]

# ↓ ONLY THIS CLASS CHANGES
class UserProfileUpdateSerializer(serializers.ModelSerializer):
    profile_photo = serializers.ImageField(required=False, allow_null=True)

    # Choice-constrained fields that allow blank/null on the model.
    # When clients send '' (empty string) for these fields, Django's ChoiceField
    # raises "not a valid choice". We coerce '' → None here so the DB stores NULL
    # (allowed by blank=True, null=True) instead of rejecting the whole request.
    CHOICE_FIELDS = [
        'blood_group', 'education_level', 'occupation_category',
        'working_status', 'annual_salary_range', 'marital_status', 'family_type',
    ]

    class Meta:
        model = UserProfile
        exclude = ['user']

    def to_internal_value(self, data):
        # Mutable copy so we can modify without side effects
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        for field in self.CHOICE_FIELDS:
            if field in data and data[field] == '':
                data[field] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        # 1. Occupation Validation
        occupation_category = attrs.get('occupation_category', getattr(self.instance, 'occupation_category', None))
        occupation_other = attrs.get('occupation_other', getattr(self.instance, 'occupation_other', None))

        if occupation_category == 'Other' and not (occupation_other or '').strip():
            raise serializers.ValidationError({'occupation_other': 'Please specify the occupation when Other is selected.'})

        if occupation_category != 'Other':
            attrs['occupation_other'] = ''

        # 2. Height Validation (100 - 250 cm)
        height = attrs.get('height', getattr(self.instance, 'height', None))
        if height is not None:
            try:
                height_val = int(height)
                if not (100 <= height_val <= 250):
                    raise serializers.ValidationError({'height': 'Height must be between 100 cm and 250 cm.'})
            except (ValueError, TypeError):
                raise serializers.ValidationError({'height': 'Height must be a valid number in centimeters.'})

        # 3. Religion Validation
        religion_category = attrs.get('religion_category', getattr(self.instance, 'religion_category', None))
        religion_other = attrs.get('religion_other', getattr(self.instance, 'religion_other', None))

        ALLOWED_RELIGIONS = [
            'Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain',
            'Zoroastrian', 'Jewish', 'Spiritual', 'Atheist', 'Agnostic',
            'Other', 'Prefer Not to Say'
        ]

        if religion_category:
            if religion_category not in ALLOWED_RELIGIONS:
                raise serializers.ValidationError({'religion_category': 'Invalid religion selected.'})

            if religion_category == 'Other' and not (religion_other or '').strip():
                raise serializers.ValidationError({'religion_other': 'Please specify the religion when Other is selected.'})

            if religion_category != 'Other':
                attrs['religion_other'] = ''

        # 4. Caste Validation
        caste_category = attrs.get('caste_category', getattr(self.instance, 'caste_category', None))
        caste_other = attrs.get('caste_other', getattr(self.instance, 'caste_other', None))

        CASTE_MAPPING = {
            'Hindu': ['Brahmin', 'Kshatriya', 'Vaishya', 'Shudra', 'Jat', 'Rajput', 'Maratha', 'General', 'OBC', 'SC', 'ST', 'Other', 'Prefer Not to Say'],
            'Muslim': ['Sunni', 'Shia', 'General', 'OBC', 'SC', 'ST', 'Other', 'Prefer Not to Say'],
            'Christian': ['Catholic', 'Protestant', 'Orthodox', 'General', 'OBC', 'SC', 'ST', 'Other', 'Prefer Not to Say'],
            'Sikh': ['Jat', 'Khatri', 'Arora', 'Ramgarhia', 'General', 'OBC', 'SC', 'ST', 'Other', 'Prefer Not to Say'],
            'Jain': ['Digambara', 'Shvetambara', 'General', 'OBC', 'SC', 'ST', 'Other', 'Prefer Not to Say'],
        }
        DEFAULT_CASTES = ['General', 'OBC', 'SC', 'ST', 'Other', 'Prefer Not to Say']

        if caste_category:
            # Determine the active religion category to filter allowed castes
            active_religion = religion_category or getattr(self.instance, 'religion_category', None)
            allowed_castes = CASTE_MAPPING.get(active_religion, DEFAULT_CASTES)

            if caste_category not in allowed_castes:
                raise serializers.ValidationError({'caste_category': f'Caste is invalid for religion {active_religion}.'})

            if caste_category == 'Other' and not (caste_other or '').strip():
                raise serializers.ValidationError({'caste_other': 'Please specify the caste when Other is selected.'})

            if caste_category != 'Other':
                attrs['caste_other'] = ''

        return attrs

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

        instance = super().update(instance, validated_data)

        if instance.education_level:
            instance.education = instance.education_level
        if instance.occupation_category:
            instance.occupation = instance.occupation_other if instance.occupation_category == 'Other' and instance.occupation_other else instance.occupation_category
        if instance.annual_salary_range:
            instance.annual_salary = instance.annual_salary_range
        if instance.religion_category:
            instance.religion = instance.religion_other if instance.religion_category == 'Other' and instance.religion_other else instance.religion_category
        if instance.caste_category:
            instance.caste = instance.caste_other if instance.caste_category == 'Other' and instance.caste_other else instance.caste_category
        instance.save(update_fields=['education', 'occupation', 'annual_salary', 'religion', 'caste'])
        return instance

    def create(self, validated_data):
        photo_file = validated_data.pop("profile_photo", None)
        if photo_file is not None:
            try:
                validated_data["profile_photo"] = compress_and_upload_to_cloudinary(photo_file)
            except ValueError as e:
                raise serializers.ValidationError({"profile_photo": str(e)})
            except Exception as e:
                raise serializers.ValidationError({"profile_photo": f"Upload failed: {str(e)}"})
        instance = super().create(validated_data)
        if instance.education_level:
            instance.education = instance.education_level
        if instance.occupation_category:
            instance.occupation = instance.occupation_other if instance.occupation_category == 'Other' and instance.occupation_other else instance.occupation_category
        if instance.annual_salary_range:
            instance.annual_salary = instance.annual_salary_range
        if instance.religion_category:
            instance.religion = instance.religion_other if instance.religion_category == 'Other' and instance.religion_other else instance.religion_category
        if instance.caste_category:
            instance.caste = instance.caste_other if instance.caste_category == 'Other' and instance.caste_other else instance.caste_category
        instance.save(update_fields=['education', 'occupation', 'annual_salary', 'religion', 'caste'])
        return instance

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.first_name')
    receiver_name = serializers.ReadOnlyField(source='receiver.first_name')

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_name', 'receiver', 'receiver_name', 'content', 'timestamp', 'is_read']