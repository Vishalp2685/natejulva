from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator

class CustomUserManager(BaseUserManager):
    def create_user(self, mobile_number, first_name, last_name, age, gender, password=None, middle_name=None, **extra_fields):
        if not mobile_number:
            raise ValueError('The Mobile Number must be set')
        if not first_name:
            raise ValueError('The First Name must be set')
        if not last_name:
            raise ValueError('The Last Name must be set')
        if not age:
            raise ValueError('The Age must be set')
        if not gender:
            raise ValueError('The Gender must be set')
            
        extra_fields.setdefault('is_active', True)
        
        user = self.model(
            mobile_number=mobile_number,
            first_name=first_name,
            middle_name=middle_name,
            last_name=last_name,
            age=age,
            gender=gender,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, mobile_number, first_name, last_name, age, gender, password=None, middle_name=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(
            mobile_number=mobile_number,
            first_name=first_name,
            middle_name=middle_name,
            last_name=last_name,
            age=age,
            gender=gender,
            password=password,
            **extra_fields
        )

class CustomUser(AbstractBaseUser, PermissionsMixin):
    mobile_regex = RegexValidator(
        regex=r'^\d{10}$',
        message="Mobile number must be exactly 10 digits."
    )
    mobile_number = models.CharField(
        validators=[mobile_regex],
        max_length=10,
        unique=True,
        verbose_name='Mobile Number'
    )
    first_name = models.CharField(max_length=50)
    middle_name = models.CharField(max_length=50, blank=True, null=True)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(unique=True, blank=True, null=True)
    age = models.PositiveIntegerField()
    
    GENDER_CHOICES = (
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    )
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('user', 'User'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    
    date_joined = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = 'mobile_number'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'age', 'gender']

    def __str__(self):
        full = f"{self.first_name}"
        if self.middle_name:
            full += f" {self.middle_name}"
        full += f" {self.last_name}"
        return f"{full} ({self.mobile_number}) - {self.role.upper()}"
