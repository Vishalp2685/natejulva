from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.validators import MinValueValidator, MaxValueValidator


EDUCATION_LEVEL_CHOICES = (
    ('10th Pass', '10th Pass'),
    ('12th Pass', '12th Pass'),
    ('ITI', 'ITI'),
    ('Diploma', 'Diploma'),
    ('Undergraduate (Pursuing)', 'Undergraduate (Pursuing)'),
    ('Bachelor\'s Degree (B.A., B.Com., B.Sc., B.E./B.Tech, BBA, BCA, etc.)', 'Bachelor\'s Degree (B.A., B.Com., B.Sc., B.E./B.Tech, BBA, BCA, etc.)'),
    ('Postgraduate (Pursuing)', 'Postgraduate (Pursuing)'),
    ('Master\'s Degree (M.A., M.Com., M.Sc., M.E./M.Tech, MBA, MCA, etc.)', 'Master\'s Degree (M.A., M.Com., M.Sc., M.E./M.Tech, MBA, MCA, etc.)'),
    ('M.Phil.', 'M.Phil.'),
    ('Ph.D.', 'Ph.D.'),
    ('Other', 'Other'),
)

OCCUPATION_CATEGORY_CHOICES = (
    ('Student', 'Student'),
    ('Software Engineer / Developer', 'Software Engineer / Developer'),
    ('Teacher / Professor', 'Teacher / Professor'),
    ('Doctor', 'Doctor'),
    ('Nurse', 'Nurse'),
    ('Pharmacist', 'Pharmacist'),
    ('Lawyer', 'Lawyer'),
    ('Chartered Accountant', 'Chartered Accountant'),
    ('Banker', 'Banker'),
    ('Government Employee', 'Government Employee'),
    ('Business Owner', 'Business Owner'),
    ('Entrepreneur', 'Entrepreneur'),
    ('Farmer', 'Farmer'),
    ('Sales Professional', 'Sales Professional'),
    ('Marketing Professional', 'Marketing Professional'),
    ('Designer', 'Designer'),
    ('Architect', 'Architect'),
    ('Civil Engineer', 'Civil Engineer'),
    ('Mechanical Engineer', 'Mechanical Engineer'),
    ('Electrical Engineer', 'Electrical Engineer'),
    ('Data Analyst', 'Data Analyst'),
    ('Data Scientist', 'Data Scientist'),
    ('Consultant', 'Consultant'),
    ('Police / Defense Personnel', 'Police / Defense Personnel'),
    ('Content Creator', 'Content Creator'),
    ('Freelancer', 'Freelancer'),
    ('Homemaker', 'Homemaker'),
    ('Skilled Worker / Technician', 'Skilled Worker / Technician'),
    ('Retired', 'Retired'),
    ('Unemployed', 'Unemployed'),
    ('Other', 'Other'),
)

ANNUAL_SALARY_RANGE_CHOICES = (
    ('Prefer Not to Say', 'Prefer Not to Say'),
    ('Below ₹2 LPA', 'Below ₹2 LPA'),
    ('₹2–4 LPA', '₹2–4 LPA'),
    ('₹4–6 LPA', '₹4–6 LPA'),
    ('₹6–8 LPA', '₹6–8 LPA'),
    ('₹8–12 LPA', '₹8–12 LPA'),
    ('₹12–18 LPA', '₹12–18 LPA'),
    ('₹18–25 LPA', '₹18–25 LPA'),
    ('₹25–40 LPA', '₹25–40 LPA'),
    ('₹40–60 LPA', '₹40–60 LPA'),
    ('₹60 LPA–₹1 Crore', '₹60 LPA–₹1 Crore'),
    ('Above ₹1 Crore', 'Above ₹1 Crore'),
)

class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    
    BLOOD_GROUP_CHOICES = (
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
        ('Unknown', 'Unknown'),
        ('Prefer Not to Say', 'Prefer Not to Say'),
    )

    # Personal Information
    height = models.PositiveIntegerField(
        blank=True, 
        null=True, 
        validators=[MinValueValidator(100), MaxValueValidator(250)]
    )  # Height in cm
    religion = models.CharField(max_length=50, blank=True, null=True)
    religion_category = models.CharField(max_length=50, blank=True, null=True)
    religion_other = models.CharField(max_length=50, blank=True, null=True)
    caste = models.CharField(max_length=50, blank=True, null=True)
    caste_category = models.CharField(max_length=50, blank=True, null=True)
    caste_other = models.CharField(max_length=50, blank=True, null=True)
    
    MARITAL_STATUS_CHOICES = (
        ('Unmarried', 'Unmarried'),
        ('Divorced', 'Divorced'),
    )
    marital_status = models.CharField(max_length=15, choices=MARITAL_STATUS_CHOICES, blank=True, null=True)
    blood_group = models.CharField(max_length=20, choices=BLOOD_GROUP_CHOICES, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    hometown = models.CharField(max_length=100, blank=True, null=True)
    current_place_of_living = models.CharField(max_length=100, blank=True, null=True)
    
    # Professional Information
    education = models.CharField(max_length=150, blank=True, null=True)
    occupation = models.CharField(max_length=150, blank=True, null=True)
    occupation_other = models.CharField(max_length=150, blank=True, null=True)
    education_level = models.CharField(max_length=150, choices=EDUCATION_LEVEL_CHOICES, blank=True, null=True)
    occupation_category = models.CharField(max_length=150, choices=OCCUPATION_CATEGORY_CHOICES, blank=True, null=True)
    
    WORKING_STATUS_CHOICES = (
        ('Employed', 'Employed'),
        ('Self-employed', 'Self-employed'),
        ('Business', 'Business'),
        ('Unemployed', 'Unemployed'),
    )
    working_status = models.CharField(max_length=20, choices=WORKING_STATUS_CHOICES, blank=True, null=True)
    annual_salary = models.CharField(max_length=50, blank=True, null=True)  # e.g. "12 LPA" or "₹1,200,000"
    annual_salary_range = models.CharField(max_length=50, choices=ANNUAL_SALARY_RANGE_CHOICES, blank=True, null=True)
    
    # Additional Information
    about_me = models.TextField(blank=True, null=True)
    
    FAMILY_TYPE_CHOICES = (
        ('Nuclear', 'Nuclear'),
        ('Joint', 'Joint'),
    )
    family_type = models.CharField(max_length=15, choices=FAMILY_TYPE_CHOICES, blank=True, null=True)
    profile_photo = models.URLField(
    max_length=1000,
    blank=True,
    null=True
    )   

    # Verification Fields
    VERIFICATION_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    verification_status = models.CharField(max_length=15, choices=VERIFICATION_CHOICES, default='pending')
    is_verified = models.BooleanField(default=False)
    admin_remarks = models.TextField(blank=True, null=True)

    # Premium Subscription Fields
    is_premium = models.BooleanField(default=False)
    premium_expiry = models.DateTimeField(blank=True, null=True)
    payment_status = models.CharField(max_length=20, default='pending')

    def __str__(self):
        return f"Profile of {self.user.first_name} ({self.user.mobile_number}) - Verified: {self.is_verified}, Premium: {self.is_premium}"

    @property
    def completeness_percentage(self):
        fields_to_check = [
            self.height,
            self.religion,
            self.caste,
            self.marital_status,
            self.blood_group,
            self.city,
            self.hometown,
            self.education,
            self.occupation,
            self.working_status,
            self.annual_salary,
            self.about_me,
            self.family_type,
            self.profile_photo
        ]
        
        total_fields = len(fields_to_check)
        filled_fields = sum(1 for field in fields_to_check if field not in (None, "", [], False))
        
        return int((filled_fields / total_fields) * 100)

    @property
    def is_complete(self):
        return self.completeness_percentage == 100

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
        PartnerPreferences.objects.create(user=instance)
class PartnerPreferences(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='partner_preferences')
    caste = models.CharField(max_length=50, blank=True, null=True)
    religion = models.CharField(max_length=50, blank=True, null=True)
    height = models.CharField(max_length=15, blank=True, null=True)
    occupation = models.CharField(max_length=150, blank=True, null=True)
    annual_salary = models.CharField(max_length=50, blank=True, null=True)
    blood_group = models.CharField(max_length=10, blank=True, null=True)
    family_type = models.CharField(max_length=15, blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)  # city or state
    working_status = models.CharField(max_length=30, blank=True, null=True)

    min_age = models.PositiveIntegerField(default=18)
    max_age = models.PositiveIntegerField(default=100)

    def __str__(self):
        return f"Preferences of {self.user.first_name} ({self.user.mobile_number})"

class ProfileLike(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes_sent')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes_received')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('sender', 'receiver')
        indexes = [
            models.Index(fields=['receiver', 'sender']),
        ]

    def __str__(self):
        return f"{self.sender.first_name} liked {self.receiver.first_name}"

class Message(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='messages_sent')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='messages_received')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['sender', 'receiver', 'timestamp']),
            models.Index(fields=['receiver', 'is_read']),
        ]

    def __str__(self):
        return f"Message from {self.sender.first_name} to {self.receiver.first_name} at {self.timestamp}"
