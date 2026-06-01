from django.core.management.base import BaseCommand
from accounts.models import CustomUser
from profiles.models import UserProfile, PartnerPreferences

class Command(BaseCommand):
    help = 'Seeds opposite-gender 100% completed profiles and partner preferences'

    def handle(self, *args, **options):
        # 1. Aarav Kumar (Male, 29)
        aarav_user, created = CustomUser.objects.get_or_create(
            mobile_number='9876543210',
            defaults={
                'first_name': 'Aarav',
                'middle_name': 'Kumar',
                'last_name': 'Mehta',
                'age': 29,
                'gender': 'Male'
            }
        )
        if created:
            aarav_user.set_password('password123')
            aarav_user.save()
            self.stdout.write(self.style.SUCCESS('Created CustomUser Aarav Kumar'))
            
        aarav_profile = UserProfile.objects.get(user=aarav_user)
        aarav_profile.height = "5'9\""
        aarav_profile.religion = "Hindu"
        aarav_profile.caste = "Brahmin"
        aarav_profile.marital_status = "Unmarried"
        aarav_profile.blood_group = "O+"
        aarav_profile.city = "Bengaluru"
        aarav_profile.hometown = "Pune"
        aarav_profile.current_place_of_living = "Indiranagar, Bengaluru"
        aarav_profile.education = "B.Tech in Computer Science"
        aarav_profile.occupation = "Senior Software Engineer"
        aarav_profile.working_status = "Employed"
        aarav_profile.annual_salary = "24 LPA"
        aarav_profile.about_me = "A quiet optimist who loves books, badminton, and weekend road trips. Building a life with intention and looking for a kind, curious partner."
        aarav_profile.family_type = "Nuclear"
        aarav_profile.profile_photo = "profile_photos/seed_male.jpg"
        aarav_profile.save()
        self.stdout.write(self.style.SUCCESS('Populated profile for Aarav Kumar'))

        # Aarav's Preferences
        aarav_prefs, created = PartnerPreferences.objects.get_or_create(user=aarav_user)
        aarav_prefs.religion = "Hindu"
        aarav_prefs.caste = "Brahmin"
        aarav_prefs.location = "Mumbai" # Looking for someone in Mumbai (matches Ananya!)
        aarav_prefs.working_status = "Employed"
        aarav_prefs.family_type = "Joint"
        aarav_prefs.save()
        self.stdout.write(self.style.SUCCESS('Seeded partner preferences for Aarav Kumar'))

        # 2. Ananya Sharma (Female, 27)
        ananya_user, created = CustomUser.objects.get_or_create(
            mobile_number='8765432109',
            defaults={
                'first_name': 'Ananya',
                'middle_name': '',
                'last_name': 'Sharma',
                'age': 27,
                'gender': 'Female'
            }
        )
        if created:
            ananya_user.set_password('password123')
            ananya_user.save()
            self.stdout.write(self.style.SUCCESS('Created CustomUser Ananya Sharma'))
            
        ananya_profile = UserProfile.objects.get(user=ananya_user)
        ananya_profile.height = "5'4\""
        ananya_profile.religion = "Hindu"
        ananya_profile.caste = "Brahmin"
        ananya_profile.marital_status = "Unmarried"
        ananya_profile.blood_group = "A+"
        ananya_profile.city = "Mumbai"
        ananya_profile.hometown = "Mumbai"
        ananya_profile.current_place_of_living = "Andheri, Mumbai"
        ananya_profile.education = "M.D. in Pediatrics"
        ananya_profile.occupation = "Pediatric Doctor"
        ananya_profile.working_status = "Employed"
        ananya_profile.annual_salary = "18 LPA"
        ananya_profile.about_me = "Passionate about healthcare and children. Love classical music, painting on canvases, and exploring beach destinations. Searching for an honest partner with family values."
        ananya_profile.family_type = "Joint"
        ananya_profile.profile_photo = "profile_photos/seed_female_1.jpg"
        ananya_profile.save()
        self.stdout.write(self.style.SUCCESS('Populated profile for Ananya Sharma'))

        # Ananya's Preferences
        ananya_prefs, created = PartnerPreferences.objects.get_or_create(user=ananya_user)
        ananya_prefs.religion = "Hindu"
        ananya_prefs.caste = "Brahmin"
        ananya_prefs.location = "Bengaluru" # Looking for someone in Bengaluru (matches Aarav!)
        ananya_prefs.working_status = "Employed"
        ananya_prefs.family_type = "Nuclear"
        ananya_prefs.save()
        self.stdout.write(self.style.SUCCESS('Seeded partner preferences for Ananya Sharma'))

        # 3. Riya Joshi (Female, 28)
        riya_user, created = CustomUser.objects.get_or_create(
            mobile_number='7654321098',
            defaults={
                'first_name': 'Riya',
                'middle_name': '',
                'last_name': 'Joshi',
                'age': 28,
                'gender': 'Female'
            }
        )
        if created:
            riya_user.set_password('password123')
            riya_user.save()
            self.stdout.write(self.style.SUCCESS('Created CustomUser Riya Joshi'))
            
        riya_profile = UserProfile.objects.get(user=riya_user)
        riya_profile.height = "5'6\""
        riya_profile.religion = "Hindu"
        riya_profile.caste = "Gujarati"
        riya_profile.marital_status = "Divorced"
        riya_profile.blood_group = "B+"
        riya_profile.city = "Pune"
        riya_profile.hometown = "Ahmedabad"
        riya_profile.current_place_of_living = "Koregaon Park, Pune"
        riya_profile.education = "MBA in Human Resources"
        riya_profile.occupation = "Talent Acquisition Manager"
        riya_profile.working_status = "Employed"
        riya_profile.annual_salary = "12 LPA"
        riya_profile.about_me = "Independent, family-oriented, and bubbly. Love baking pastries, playing board games, and running half-marathons. Looking for a fresh, beautiful chapter in life."
        riya_profile.family_type = "Nuclear"
        riya_profile.profile_photo = "profile_photos/seed_female_2.jpg"
        riya_profile.save()
        self.stdout.write(self.style.SUCCESS('Populated profile for Riya Joshi'))

        # Riya's Preferences
        riya_prefs, created = PartnerPreferences.objects.get_or_create(user=riya_user)
        riya_prefs.religion = "Hindu"
        riya_prefs.working_status = "Employed"
        riya_prefs.family_type = "Nuclear"
        riya_prefs.save()
        self.stdout.write(self.style.SUCCESS('Seeded partner preferences for Riya Joshi'))

        self.stdout.write(self.style.SUCCESS('Matrimonial seed profiles & partner preferences created successfully!'))
