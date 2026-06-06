import os
import random
import urllib.request
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from accounts.models import CustomUser
from profiles.models import UserProfile, PartnerPreferences
from PIL import Image, ImageDraw, ImageFont

# -------------------------------------------------------------
# DUMMY DATA POOLS FOR REALISTIC INDIAN PROFILES
# -------------------------------------------------------------

MALE_FIRST_NAMES = [
    'Aarav', 'Kabir', 'Vivaan', 'Vihaan', 'Aditya', 'Arjun', 'Sai', 'Reyansh', 
    'Krishna', 'Ishan', 'Shaurya', 'Atharva', 'Aryan', 'Dev', 'Sameer', 'Rohan', 
    'Sanjay', 'Rajesh', 'Amit', 'Vikrant', 'Vikram', 'Rahul', 'Vishal', 'Siddharth', 
    'Yash', 'Pranav', 'Nikhil', 'Ritvik', 'Varun', 'Akash', 'Mohit', 'Gaurav', 'Karan',
    'Abhishek', 'Manish', 'Harsh', 'Anuj', 'Piyush', 'Rajat', 'Mayank', 'Rohan',
    'Kunal', 'Sumeet', 'Alok', 'Sandeep', 'Deepak'
]

FEMALE_FIRST_NAMES = [
    'Aanya', 'Diya', 'Pihu', 'Prisha', 'Ananya', 'Aaradhya', 'Saanvi', 'Sarah', 
    'Kiara', 'Zara', 'Anika', 'Riya', 'Priya', 'Sneha', 'Neha', 'Pooja', 'Shreya', 
    'Tanvi', 'Kavya', 'Ishita', 'Divya', 'Aditi', 'Meghna', 'Nisha', 'Swati', 
    'Preeti', 'Shruti', 'Meera', 'Nikita', 'Deepa', 'Payal', 'Komal', 'Ritu', 
    'Shilpa', 'Kajal', 'Simran', 'Priyanka', 'Poonam', 'Nidhi', 'Kirti', 'Megha',
    'Kavita', 'Sonia', 'Rupali', 'Aarti', 'Kiran'
]

MALE_MIDDLE_NAMES = ['Kumar', 'Chandra', 'Lal', 'Dev', 'Prasad', 'Nath', 'Pratap', 'Singh']

LAST_NAMES = [
    'Sharma', 'Verma', 'Gupta', 'Mehta', 'Joshi', 'Patel', 'Trivedi', 'Shah', 'Rao', 
    'Iyer', 'Iyengar', 'Reddy', 'Nair', 'Maratha', 'Yadav', 'Chaudhary', 'Singh', 
    'Das', 'Chatterjee', 'Banerjee', 'Mukherjee', 'Sen', 'Bhat', 'Kulkarni', 
    'Deshmukh', 'Deshpande', 'Patil', 'Shinde', 'Mishra', 'Pandey', 'Saxena', 'Kapoor',
    'Grover', 'Bhasin', 'Malhotra', 'Srinivasan', 'Naidu'
]

# Cities and neighborhoods/areas
CITIES_DATA = {
    'Bengaluru': {
        'hometowns': ['Pune', 'Mysuru', 'Hubli', 'Mangaluru', 'Bengaluru', 'Coimbatore'],
        'areas': ['Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'Jayanagar', 'Electronic City', 'Bellandur']
    },
    'Mumbai': {
        'hometowns': ['Nagpur', 'Nashik', 'Ahmedabad', 'Surat', 'Mumbai', 'Goa'],
        'areas': ['Andheri', 'Bandra', 'Powai', 'Juhu', 'Colaba', 'Worli', 'Chembur', 'Malad']
    },
    'Delhi': {
        'hometowns': ['Chandigarh', 'Jaipur', 'Lucknow', 'Dehradun', 'Delhi', 'Noida'],
        'areas': ['Connaught Place', 'South Extension', 'Dwarka', 'Vasant Kunj', 'Karol Bagh', 'Saket', 'Rajouri Garden']
    },
    'Pune': {
        'hometowns': ['Kolhapur', 'Solapur', 'Aurangabad', 'Mumbai', 'Pune', 'Belagavi'],
        'areas': ['Koregaon Park', 'Kalyani Nagar', 'Kothrud', 'Hinjewadi', 'Baner', 'Viman Nagar', 'Wakad']
    },
    'Hyderabad': {
        'hometowns': ['Vijayawada', 'Vizag', 'Warangal', 'Nizamabad', 'Hyderabad', 'Guntur'],
        'areas': ['Gachibowli', 'Jubilee Hills', 'Banjara Hills', 'Madhapur', 'Kondapur', 'Secunderabad']
    },
    'Chennai': {
        'hometowns': ['Coimbatore', 'Madurai', 'Trichy', 'Salem', 'Chennai', 'Vellore'],
        'areas': ['Adyar', 'T. Nagar', 'Mylapore', 'Velachery', 'Nungambakkam', 'Anna Nagar', 'OMR']
    }
}

# Religions and Castes mapping
RELIGIONS_CASTES = {
    'Hindu': ['Brahmin', 'Rajput', 'Patel', 'Maratha', 'Yadav', 'Kayastha', 'Bania', 'Reddy', 'Nair', 'Iyer', 'Iyengar', 'Saraswat'],
    'Muslim': ['Sunni', 'Shia', 'Khan', 'Syed', 'Pathan', 'Sheikh'],
    'Sikh': ['Jat', 'Khatri', 'Arora', 'Ramgarhia'],
    'Christian': ['Roman Catholic', 'Protestant', 'Syrian Christian', 'Pentecostal'],
    'Jain': ['Digambar', 'Shvetambar', 'Oswal', 'Agarwal']
}

# Educations & Occupations mappings
OCCUPATIONS_EDUCATION = [
    {
        'category': 'Tech/Engineering',
        'educations': ['B.Tech in Computer Science', 'M.Tech in Information Technology', 'B.E. in Electronics & Communication'],
        'occupations': ['Software Engineer', 'Senior Software Engineer', 'Product Manager', 'Data Scientist', 'DevOps Engineer', 'Security Analyst'],
        'salaries': ['8 LPA', '10 LPA', '12 LPA', '15 LPA', '18 LPA', '20 LPA', '25 LPA', '35 LPA', '45 LPA', '60 LPA']
    },
    {
        'category': 'Management/Business',
        'educations': ['MBA in Finance', 'MBA in Marketing', 'MBA in Human Resources', 'Chartered Accountant (CA)'],
        'occupations': ['Business Analyst', 'Marketing Manager', 'Financial Consultant', 'Investment Banker', 'Human Resources Manager', 'Operations Lead'],
        'salaries': ['8 LPA', '10 LPA', '12 LPA', '15 LPA', '18 LPA', '22 LPA', '30 LPA', '40 LPA', '50 LPA']
    },
    {
        'category': 'Medical',
        'educations': ['M.B.B.S.', 'M.D. in Pediatrics', 'B.D.S. (Dentistry)', 'M.S. in Orthopedics'],
        'occupations': ['General Physician', 'Dentist', 'Pediatrician', 'Surgeon', 'Radiologist'],
        'salaries': ['12 LPA', '15 LPA', '18 LPA', '24 LPA', '30 LPA', '50 LPA', '75 LPA']
    },
    {
        'category': 'Creative/Others',
        'educations': ['B.Arch (Architecture)', 'BFA (Fine Arts)', 'B.Sc in Biotechnology', 'M.A. in Psychology', 'L.L.B. (Law)'],
        'occupations': ['Graphic Designer', 'Professor', 'Architect', 'Consultant', 'Entrepreneur', 'Corporate Lawyer'],
        'salaries': ['6 LPA', '8 LPA', '10 LPA', '12 LPA', '15 LPA', '20 LPA', '35 LPA', '50 LPA']
    }
]

# Hobbies
HOBBIES = [
    'cooking new cuisines', 'reading self-help books', 'playing badminton', 'going on weekend road trips',
    'listening to classical music', 'canvas painting', 'exploring beach destinations', 'baking pastries',
    'playing board games', 'running half-marathons', 'photography', 'watching sci-fi movies',
    'trekking and hiking', 'gardening', 'practicing meditation', 'playing the guitar', 'fitness training'
]

# Personality traits
PARTNER_TRAITS = [
    'kind and curious', 'honest with family values', 'independent and supportive',
    'understanding and career-oriented', 'simple and down-to-earth', 'cheerful and caring',
    'mature and open-minded'
]

ABOUT_ME_TEMPLATES = [
    "I am a {adjective} {gender_noun} who loves {hobby1}, {hobby2}, and {hobby3}. Professionally, I work as a {occupation}. I value honesty and family, and I am looking for a partner who is {partner_trait}.",
    "Working as a {occupation} in {city}. I would describe myself as a {adjective} person who enjoys {hobby1} and {hobby2} in my free time. Looking for a compatibility-based relationship with someone who is {partner_trait}.",
    "A {adjective} soul who believes in simple living and high thinking. In my free time, you'll find me {hobby1} or {hobby2}. Seeking a {partner_trait} partner to share life's beautiful journey.",
    "Passionate about my career as a {occupation}, but equally focused on family. I love {hobby1}, {hobby2}, and exploring new places. Looking for an {partner_trait} and understanding partner."
]

# Helper to generate unique 10-digit mobile numbers
def generate_unique_mobile():
    while True:
        first_digit = random.choice(['6', '7', '8', '9'])
        rest = ''.join(random.choices('0123456789', k=9))
        mobile = first_digit + rest
        if not CustomUser.objects.filter(mobile_number=mobile).exists():
            return mobile

# Helper to generate beautiful initials avatars using Pillow
def generate_pillow_avatar(first_name, last_name, filename, filepath):
    # Ensure folder exists
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    # Premium modern color palette (RGB)
    COLORS = [
        (79, 70, 229),   # Indigo
        (13, 148, 136),  # Teal
        (220, 38, 38),   # Rose
        (217, 119, 6),   # Amber
        (8, 145, 178),   # Cyan
        (124, 58, 237),  # Violet
        (219, 39, 119),  # Pink
        (101, 163, 13),  # Lime
        (75, 85, 99),    # Slate grey
        (147, 51, 234),  # Plum
    ]
    bg_color = random.choice(COLORS)
    
    # Create image
    img = Image.new("RGB", (300, 300), color=bg_color)
    draw = ImageDraw.Draw(img)
    
    # Get initials
    initial_first = first_name[0].upper() if first_name else ''
    initial_last = last_name[0].upper() if last_name else ''
    initials = f"{initial_first}{initial_last}"
    if not initials:
        initials = "U"
        
    # Font path resolution (cross-platform)
    font = None
    font_paths = [
        r"C:\Windows\Fonts\segoeui.ttf", 
        r"C:\Windows\Fonts\arial.ttf", 
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
        "arial.ttf"
    ]
    for font_path in font_paths:
        try:
            if os.path.exists(font_path) or font_path == "arial.ttf":
                font = ImageFont.truetype(font_path, 120)
                break
        except Exception:
            continue
            
    if not font:
        font = ImageFont.load_default()
        
    # Draw centered text
    try:
        bbox = draw.textbbox((0, 0), initials, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        x = (300 - w) / 2 - bbox[0]
        y = (300 - h) / 2 - bbox[1]
    except AttributeError:
        try:
            w, h = draw.textsize(initials, font=font)
            x = (300 - w) / 2
            y = (300 - h) / 2
        except Exception:
            x, y = 100, 100
            
    draw.text((x, y), initials, fill=(255, 255, 255), font=font)
    img.save(filepath, "JPEG")
    return f"profile_photos/{filename}"

# Helper to download avatar with timeout and local Pillow fallback
def download_avatar(first_name, last_name, gender, user_id, mobile):
    num = (user_id % 99) + 1
    gender_str = 'men' if gender.lower() == 'male' else 'women'
    url = f"https://randomuser.me/api/portraits/{gender_str}/{num}.jpg"
    
    filename = f"random_{gender.lower()}_{mobile}.jpg"
    filepath = os.path.join(settings.MEDIA_ROOT, 'profile_photos', filename)
    
    # Ensure directories exist
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=4) as response:
            with open(filepath, 'wb') as f:
                f.write(response.read())
        return f"profile_photos/{filename}"
    except Exception:
        # If download fails (e.g. offline, timeout, network error), generate local avatar
        return generate_pillow_avatar(first_name, last_name, filename, filepath)


class Command(BaseCommand):
    help = 'Generates 100% complete random Male and Female profiles'

    def add_arguments(self, parser):
        parser.add_argument(
            '--total', 
            type=int, 
            default=10, 
            help='Total number of profiles to generate (split equally between male and female)'
        )
        parser.add_argument(
            '--male', 
            type=int, 
            default=None, 
            help='Number of male profiles to generate (overrides total split)'
        )
        parser.add_argument(
            '--female', 
            type=int, 
            default=None, 
            help='Number of female profiles to generate (overrides total split)'
        )
        parser.add_argument(
            '--verify', 
            type=str, 
            default='true', 
            choices=['true', 'false'], 
            help='Auto-approve and verify generated profiles'
        )
        parser.add_argument(
            '--clean', 
            action='store_true', 
            help='Clean/Delete all generated random profiles and users'
        )

    def handle(self, *args, **options):
        # -------------------------------------------------------------
        # CLEANUP MODE
        # -------------------------------------------------------------
        if options['clean']:
            self.stdout.write("Cleaning up previously generated random profiles...")
            profiles = UserProfile.objects.filter(admin_remarks='Generated by generate_random_profiles script')
            count = profiles.count()
            
            deleted_count = 0
            for profile in profiles:
                # Store user to delete since cascading delete is triggered
                user = profile.user
                
                # Delete profile photo file if it exists locally
                if profile.profile_photo:
                    try:
                        photo_path = os.path.join(settings.MEDIA_ROOT, str(profile.profile_photo))
                        if os.path.exists(photo_path):
                            os.remove(photo_path)
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f"Could not delete file {profile.profile_photo}: {e}"))
                
                user.delete()
                deleted_count += 1
                
            self.stdout.write(self.style.SUCCESS(f"Successfully deleted {deleted_count} generated profiles and their associated users."))
            return

        # -------------------------------------------------------------
        # GENERATE MODE
        # -------------------------------------------------------------
        total = options['total']
        male_count = options['male']
        female_count = options['female']
        verify = options['verify'].lower() == 'true'

        if male_count is None and female_count is None:
            male_count = total // 2
            female_count = total - male_count
        else:
            male_count = male_count or 0
            female_count = female_count or 0

        self.stdout.write(f"Preparing to generate {male_count} male and {female_count} female profiles...")

        created_users = []
        
        # Helper to generate a single profile
        def create_random_profile(gender):
            first_name = random.choice(MALE_FIRST_NAMES if gender == 'Male' else FEMALE_FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            middle_name = random.choice([None, '', random.choice(MALE_MIDDLE_NAMES) if gender == 'Male' else ''])
            mobile = generate_unique_mobile()
            age = random.randint(23, 35)

            # Create User
            user = CustomUser.objects.create_user(
                mobile_number=mobile,
                first_name=first_name,
                middle_name=middle_name or None,
                last_name=last_name,
                age=age,
                gender=gender,
                password='Password@123'
            )
            
            # Since CustomUser has a signal, UserProfile & PartnerPreferences are automatically created.
            profile = UserProfile.objects.get(user=user)
            preferences = PartnerPreferences.objects.get(user=user)

            # Populate Personal Details
            if gender == 'Male':
                height = random.choice(["5'5\"", "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "5'11\"", "6'0\"", "6'1\"", "6'2\""])
            else:
                height = random.choice(["5'0\"", "5'1\"", "5'2\"", "5'3\"", "5'4\"", "5'5\"", "5'6\"", "5'7\"", "5'8\""])
                
            religion = random.choice(list(RELIGIONS_CASTES.keys()))
            caste = random.choice(RELIGIONS_CASTES[religion])
            
            city = random.choice(list(CITIES_DATA.keys()))
            city_info = CITIES_DATA[city]
            hometown = random.choice(city_info['hometowns'])
            area = random.choice(city_info['areas'])
            current_place = f"{area}, {city}"

            # Populate Professional Details
            occ_info = random.choice(OCCUPATIONS_EDUCATION)
            education = random.choice(occ_info['educations'])
            occupation = random.choice(occ_info['occupations'])
            annual_salary = random.choice(occ_info['salaries'])
            working_status = random.choice(['Employed', 'Self-employed', 'Business'])

            # Generate About Me
            adjective = random.choice(['cheerful', 'quiet', 'passionate', 'down-to-earth', 'ambitious', 'creative', 'family-oriented', 'independent', 'easygoing', 'optimistic'])
            gender_noun = 'guy' if gender == 'Male' else 'girl'
            hobbies_subset = random.sample(HOBBIES, 3)
            partner_trait = random.choice(PARTNER_TRAITS)
            
            template = random.choice(ABOUT_ME_TEMPLATES)
            about_me = template.format(
                adjective=adjective,
                gender_noun=gender_noun,
                hobby1=hobbies_subset[0],
                hobby2=hobbies_subset[1],
                hobby3=hobbies_subset[2],
                occupation=occupation,
                city=city,
                partner_trait=partner_trait
            )

            # Save Profile fields
            profile.height = height
            profile.religion = religion
            profile.caste = caste
            profile.marital_status = random.choice(['Unmarried', 'Divorced'])
            profile.blood_group = random.choice(['O+', 'A+', 'B+', 'AB+', 'A-', 'B-', 'O-', 'AB-'])
            profile.city = city
            profile.hometown = hometown
            profile.current_place_of_living = current_place
            profile.education = education
            profile.occupation = occupation
            profile.working_status = working_status
            profile.annual_salary = annual_salary
            profile.about_me = about_me
            profile.family_type = random.choice(['Nuclear', 'Joint'])
            profile.admin_remarks = 'Generated by generate_random_profiles script'
            
            # Premium Subscription Fields
            profile.is_premium = random.choice([True, False, False, False, False])  # 20% premium chance
            if profile.is_premium:
                profile.payment_status = 'approved'
            
            # Avatar setup
            profile_photo_path = download_avatar(first_name, last_name, gender, user.id, mobile)
            profile.profile_photo = profile_photo_path

            # Verification fields
            if verify:
                profile.verification_status = 'approved'
                profile.is_verified = True
            else:
                profile.verification_status = 'pending'
                profile.is_verified = False

            profile.save()

            # Seed Partner Preferences
            preferences.religion = random.choice([religion, ''])
            preferences.caste = random.choice([caste, '']) if preferences.religion else ''
            
            if gender == 'Male':
                preferences.height = random.choice(["5'0\" to 5'6\"", "5'2\" to 5'7\"", "Any"])
            else:
                preferences.height = random.choice(["5'7\" to 6'0\"", "5'8\" to 6'2\"", "Any"])
            if preferences.height == "Any":
                preferences.height = ''
                
            preferences.occupation = random.choice([occupation, ''])
            preferences.working_status = random.choice(['Employed', ''])
            preferences.family_type = random.choice(['Nuclear', 'Joint', ''])
            
            pref_loc = random.choice([city, hometown, 'Any'])
            preferences.location = '' if pref_loc == 'Any' else pref_loc
            
            preferences.save()

            return user

        # Run within a database transaction to prevent partial states
        try:
            with transaction.atomic():
                for i in range(male_count):
                    user = create_random_profile('Male')
                    created_users.append(user)
                    self.stdout.write(self.style.SUCCESS(f"Generated Male Profile: {user.first_name} {user.last_name} ({user.mobile_number})"))

                for i in range(female_count):
                    user = create_random_profile('Female')
                    created_users.append(user)
                    self.stdout.write(self.style.SUCCESS(f"Generated Female Profile: {user.first_name} {user.last_name} ({user.mobile_number})"))

            self.stdout.write(self.style.SUCCESS(f"\nSuccessfully generated {len(created_users)} 100% complete profiles!"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error occurred during generation: {e}"))
            raise e
