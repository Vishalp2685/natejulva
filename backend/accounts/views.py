import random
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.core.cache import cache
from .serializers import RegisterSerializer, CustomUserSerializer
from .models import CustomUser

class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate a 6-digit mock OTP
            otp_code = str(random.randint(100000, 999999))
            
            # Store in Django cache for 5 minutes (300 seconds)
            cache.set(f"otp_{user.mobile_number}", otp_code, 300)
            
            # Print for server side debugging visibility
            print("\n" + "="*40)
            print(f" MOCK OTP FOR {user.mobile_number}: {otp_code}")
            print("="*40 + "\n")
            
            return Response({
                "message": "Registration successful. OTP sent.",
                "mobile_number": user.mobile_number,
                "mock_otp": otp_code  # Return it in response for rapid testing
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyOTPView(APIView):
    def post(self, request):
        mobile_number = request.data.get('mobile_number')
        otp_entered = request.data.get('otp')
        
        if not mobile_number or not otp_entered:
            return Response({"error": "Mobile number and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        cached_otp = cache.get(f"otp_{mobile_number}")
        
        # Permit 123456 as a master test bypass or the actual generated code
        if otp_entered == "123456" or otp_entered == cached_otp:
            try:
                user = CustomUser.objects.get(mobile_number=mobile_number)
                token, created = Token.objects.get_or_create(user=user)
                return Response({
                    "message": "OTP verified successfully.",
                    "token": token.key,
                    "user": CustomUserSerializer(user).data
                }, status=status.HTTP_200_OK)
            except CustomUser.DoesNotExist:
                return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({"error": "Invalid OTP code."}, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    def post(self, request):
        mobile_number = request.data.get('mobile_number')
        password = request.data.get('password')
        
        if not mobile_number or not password:
            return Response({"error": "Mobile number and password are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        user = authenticate(username=mobile_number, password=password)
        if user:
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                "message": "Login successful.",
                "token": token.key,
                "user": CustomUserSerializer(user).data
            }, status=status.HTTP_200_OK)
        return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
