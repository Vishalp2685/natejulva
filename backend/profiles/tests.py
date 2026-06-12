from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import CustomUser
from .models import ProfileLike

class RejectRequestViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create user A (the one sending the request)
        self.user_a = CustomUser.objects.create_user(
            mobile_number="1234567890",
            password="testpasswordA",
            first_name="Sender",
            last_name="User",
            age=25,
            gender="Male"
        )
        # Create user B (the one receiving/rejecting the request)
        self.user_b = CustomUser.objects.create_user(
            mobile_number="0987654321",
            password="testpasswordB",
            first_name="Receiver",
            last_name="User",
            age=24,
            gender="Female"
        )
        # Authenticate as User B (receiver)
        self.client.force_authenticate(user=self.user_b)
        # Setup url
        self.url = reverse('reject-request')

    def test_reject_request_success(self):
        # Create a like from A to B
        like = ProfileLike.objects.create(sender=self.user_a, receiver=self.user_b)
        
        # Verify like exists
        self.assertTrue(ProfileLike.objects.filter(sender=self.user_a, receiver=self.user_b).exists())
        
        # Send reject request
        response = self.client.post(self.url, {"sender_id": self.user_a.id}, format='json')
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Request rejected successfully.")
        
        # Verify like is deleted
        self.assertFalse(ProfileLike.objects.filter(sender=self.user_a, receiver=self.user_b).exists())

    def test_reject_request_missing_sender_id(self):
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_reject_request_invalid_sender(self):
        response = self.client.post(self.url, {"sender_id": 99999}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", response.data)

    def test_reject_request_no_pending_request(self):
        # User A hasn't liked User B
        response = self.client.post(self.url, {"sender_id": self.user_a.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "No pending request found from this user.")
