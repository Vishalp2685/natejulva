from rest_framework import serializers
from .models import CustomUser

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'mobile_number', 'first_name', 'middle_name', 'last_name', 'age', 'gender']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = CustomUser
        fields = ['mobile_number', 'first_name', 'middle_name', 'last_name', 'age', 'gender', 'password']
        
    def create(self, validated_data):
        return CustomUser.objects.create_user(**validated_data)
