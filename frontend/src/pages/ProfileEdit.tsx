import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import {
  User as UserIcon, Briefcase, Plus, Upload,
  Save, CheckCircle, HeartHandshake, ArrowRight
} from 'lucide-react';
import { API_URL } from '../config';
import { SearchableSelect } from '../components/SearchableSelect';

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionKey = 'personal' | 'professional' | 'additional' | 'preferences';

const RELIGION_OPTIONS = [
  'Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain',
  'Zoroastrian', 'Jewish', 'Spiritual', 'Atheist', 'Agnostic',
  'Other', 'Prefer Not to Say'
];

const BLOOD_GROUP_OPTIONS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown', 'Prefer Not to Say'
];

const CASTE_MAPPING: Record<string, string[]> = {
  'Hindu': ['Brahmin', 'Kshatriya', 'Vaishya', 'Shudra', 'Jat', 'Rajput', 'Maratha', 'General', 'OBC', 'SC', 'ST', 'Other', 'Prefer Not to Say'],
  'Muslim': ['Sunni', 'Shia', 'General', 'OBC', 'SC', 'ST', 'Other', 'Prefer Not to Say'],
  'Christian': ['Catholic', 'Protestant', 'Orthodox', 'General', 'OBC', 'SC', 'ST', 'Other', 'Prefer Not to Say'],
  'Sikh': ['Jat', 'Khatri', 'Arora', 'Ramgarhia', 'General', 'OBC', 'SC', 'ST', 'Other', 'Prefer Not to Say'],
  'Jain': ['Digambara', 'Shvetambara', 'General', 'OBC', 'SC', 'ST', 'Other', 'Prefer Not to Say'],
};

const DEFAULT_CASTES = ['General', 'OBC', 'SC', 'ST', 'Other', 'Prefer Not to Say'];

const EDUCATION_LEVEL_OPTIONS = [
  '10th Pass',
  '12th Pass',
  'ITI',
  'Diploma',
  'Undergraduate (Pursuing)',
  "Bachelor's Degree (B.A., B.Com., B.Sc., B.E./B.Tech, BBA, BCA, etc.)",
  'Postgraduate (Pursuing)',
  "Master's Degree (M.A., M.Com., M.Sc., M.E./M.Tech, MBA, MCA, etc.)",
  'M.Phil.',
  'Ph.D.',
  'Other'
];

const OCCUPATION_CATEGORY_OPTIONS = [
  'Student',
  'Software Engineer / Developer',
  'Teacher / Professor',
  'Doctor',
  'Nurse',
  'Pharmacist',
  'Lawyer',
  'Chartered Accountant',
  'Banker',
  'Government Employee',
  'Business Owner',
  'Entrepreneur',
  'Farmer',
  'Sales Professional',
  'Marketing Professional',
  'Designer',
  'Architect',
  'Civil Engineer',
  'Mechanical Engineer',
  'Electrical Engineer',
  'Data Analyst',
  'Data Scientist',
  'Consultant',
  'Police / Defense Personnel',
  'Content Creator',
  'Freelancer',
  'Homemaker',
  'Skilled Worker / Technician',
  'Retired',
  'Unemployed',
  'Other'
];

const ANNUAL_SALARY_RANGE_OPTIONS = [
  'Prefer Not to Say',
  'Below ₹2 LPA',
  '₹2–4 LPA',
  '₹4–6 LPA',
  '₹6–8 LPA',
  '₹8–12 LPA',
  '₹12–18 LPA',
  '₹18–25 LPA',
  '₹25–40 LPA',
  '₹40–60 LPA',
  '₹60 LPA–₹1 Crore',
  'Above ₹1 Crore'
];

// ─── Component ────────────────────────────────────────────────────────────────

export const ProfileEdit: React.FC = () => {
  const navigate = useNavigate();
  const { token, user, updateUser } = useAuth();
  const { cachedFetch, getCachedData } = useCache();

  const cachedProfile = getCachedData(`${API_URL}/api/profiles/me/`);
  const cachedPrefs = getCachedData(`${API_URL}/api/profiles/preferences/`);

  const [activeSection, setActiveSection] = useState<SectionKey>('personal');
  const [loading, setLoading] = useState(!cachedProfile || !cachedPrefs);
  const [saveLoading, setSaveLoading] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Helper functions for height parsing & conversion
  const cmToFtIn = (cmVal: number) => {
    const totalInches = cmVal / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet: feet.toString(), inches: inches.toString() };
  };

  const parseFeetInches = (str: string) => {
    const match = str.match(/(\d+)\s*'\s*(\d+)?/);
    if (match) {
      return { feet: match[1], inches: match[2] || '0' };
    }
    return { feet: '5', inches: '7' };
  };

  const ftInToCm = (ft: number, inch: number) => {
    return Math.round((ft * 30.48) + (inch * 2.54));
  };

  const getInitialHeight = () => {
    const raw = cachedProfile?.height;
    if (!raw) return { opt: 'ft', ft: '5', in: '7', cm: '170' };
    const num = parseInt(raw);
    if (!isNaN(num) && num >= 100) {
      const { feet, inches } = cmToFtIn(num);
      return { opt: 'cm', ft: feet, in: inches, cm: num.toString() };
    }
    const { feet, inches } = parseFeetInches(raw);
    const computedCm = ftInToCm(parseInt(feet), parseInt(inches));
    return { opt: 'ft', ft: feet, in: inches, cm: computedCm.toString() };
  };

  const initHeight = getInitialHeight();
  const [heightOption, setHeightOption] = useState<'ft' | 'cm'>(initHeight.opt as any);
  const [heightFeet, setHeightFeet] = useState(initHeight.ft);
  const [heightInches, setHeightInches] = useState(initHeight.in);
  const [heightCm, setHeightCm] = useState(initHeight.cm);

  const [religionCategory, setReligionCategory] = useState(
    cachedProfile?.religion_category || 
    (RELIGION_OPTIONS.includes(cachedProfile?.religion) ? cachedProfile?.religion : (cachedProfile?.religion ? 'Other' : '')) || 
    ''
  );
  const [religionOther, setReligionOther] = useState(
    cachedProfile?.religion_other || 
    (RELIGION_OPTIONS.includes(cachedProfile?.religion) ? '' : (cachedProfile?.religion || '')) || 
    ''
  );

  const activeReligion = religionCategory;
  const allowedCastes = CASTE_MAPPING[activeReligion] || DEFAULT_CASTES;

  const [casteCategory, setCasteCategory] = useState(
    cachedProfile?.caste_category || 
    (allowedCastes.includes(cachedProfile?.caste) ? cachedProfile?.caste : (cachedProfile?.caste ? 'Other' : '')) || 
    ''
  );
  const [casteOther, setCasteOther] = useState(
    cachedProfile?.caste_other || 
    (allowedCastes.includes(cachedProfile?.caste) ? '' : (cachedProfile?.caste || '')) || 
    ''
  );

  const [maritalStatus, setMaritalStatus] = useState<'Unmarried' | 'Divorced'>(cachedProfile?.marital_status || 'Unmarried');
  const [bloodGroup, setBloodGroup] = useState(cachedProfile?.blood_group || '');
  const [city, setCity] = useState(cachedProfile?.city || '');
  const [hometown, setHometown] = useState(cachedProfile?.hometown || '');

  // Professional Information
  const initialEducationLevel = cachedProfile?.education_level || (EDUCATION_LEVEL_OPTIONS.includes(cachedProfile?.education) ? cachedProfile?.education : '') || '';
  const initialOccupationCategory = cachedProfile?.occupation_category || (OCCUPATION_CATEGORY_OPTIONS.includes(cachedProfile?.occupation) ? cachedProfile?.occupation : (cachedProfile?.occupation ? 'Other' : '')) || '';
  const initialOccupationOther = cachedProfile?.occupation_other || (initialOccupationCategory === 'Other' ? cachedProfile?.occupation : '') || '';
  const initialAnnualSalaryRange = cachedProfile?.annual_salary_range || (ANNUAL_SALARY_RANGE_OPTIONS.includes(cachedProfile?.annual_salary) ? cachedProfile?.annual_salary : '') || '';

  const [educationLevel, setEducationLevel] = useState(initialEducationLevel);
  const [occupationCategory, setOccupationCategory] = useState(initialOccupationCategory);
  const [occupationOther, setOccupationOther] = useState(initialOccupationOther);
  const [workingStatus, setWorkingStatus] = useState<'Employed' | 'Self-employed' | 'Business' | 'Unemployed'>(cachedProfile?.working_status || 'Employed');
  const [annualSalaryRange, setAnnualSalaryRange] = useState(initialAnnualSalaryRange);

  // Additional Information
  const [aboutMe, setAboutMe] = useState(cachedProfile?.about_me || '');
  const [familyType, setFamilyType] = useState<'Nuclear' | 'Joint'>(cachedProfile?.family_type || 'Nuclear');

  // Partner Preferences
  const [prefCaste, setPrefCaste] = useState(cachedPrefs?.caste || '');
  const [prefReligion, setPrefReligion] = useState(cachedPrefs?.religion || '');
  const [prefHeight, setPrefHeight] = useState(cachedPrefs?.height || '');
  const [prefOccupation, setPrefOccupation] = useState(cachedPrefs?.occupation || '');
  const [prefSalary, setPrefSalary] = useState(cachedPrefs?.annual_salary || '');
  const [prefBloodGroup, setPrefBloodGroup] = useState(cachedPrefs?.blood_group || '');
  const [prefFamilyType, setPrefFamilyType] = useState<string>(cachedPrefs?.family_type || 'Nuclear');
  const [prefLocation, setPrefLocation] = useState(cachedPrefs?.location || '');
  const [prefWorkingStatus, setPrefWorkingStatus] = useState<string>(cachedPrefs?.working_status || 'Employed');
  const [prefMinAge, setPrefMinAge] = useState<number>(cachedPrefs?.min_age !== undefined ? cachedPrefs?.min_age : 18);
  const [prefMaxAge, setPrefMaxAge] = useState<number>(cachedPrefs?.max_age !== undefined ? cachedPrefs?.max_age : 100);

  // Photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [dbPhotoUrl, setDbPhotoUrl] = useState<string | null>(cachedProfile?.profile_photo || null);

  // Completeness
  const [completeness, setCompleteness] = useState(cachedProfile?.completeness_percentage || 0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) {
      navigate('/register?tab=login');
      return;
    }
    fetchProfileAndPreferences();
  }, [token, navigate]);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchProfileAndPreferences = async () => {
    try {
      const { data, ok } = await cachedFetch(`${API_URL}/api/profiles/me/`, {
        headers: { Authorization: `Token ${token}` },
      });

      if (ok && data) {
        const rawH = data.height;
        if (rawH) {
          const num = parseInt(rawH);
          if (!isNaN(num) && num >= 100) {
            setHeightCm(num.toString());
            const { feet, inches } = cmToFtIn(num);
            setHeightFeet(feet);
            setHeightInches(inches);
          } else {
            const { feet, inches } = parseFeetInches(rawH);
            setHeightFeet(feet);
            setHeightInches(inches);
            setHeightCm(ftInToCm(parseInt(feet), parseInt(inches)).toString());
          }
        }

        const fetchedReligionCategory = data.religion_category || (RELIGION_OPTIONS.includes(data.religion) ? data.religion : (data.religion ? 'Other' : '')) || '';
        const fetchedReligionOther = data.religion_other || (RELIGION_OPTIONS.includes(data.religion) ? '' : (data.religion || '')) || '';
        
        const currentAllowedCastes = CASTE_MAPPING[fetchedReligionCategory] || DEFAULT_CASTES;
        const fetchedCasteCategory = data.caste_category || (currentAllowedCastes.includes(data.caste) ? data.caste : (data.caste ? 'Other' : '')) || '';
        const fetchedCasteOther = data.caste_other || (currentAllowedCastes.includes(data.caste) ? '' : (data.caste || '')) || '';

        setReligionCategory(fetchedReligionCategory);
        setReligionOther(fetchedReligionOther);
        setCasteCategory(fetchedCasteCategory);
        setCasteOther(fetchedCasteOther);

        setMaritalStatus(data.marital_status || 'Unmarried');
        setBloodGroup(data.blood_group || '');
        setCity(data.city || '');
        setHometown(data.hometown || '');
        const fetchedEducationLevel = data.education_level || (EDUCATION_LEVEL_OPTIONS.includes(data.education) ? data.education : '') || '';
        const fetchedOccupationCategory = data.occupation_category || (OCCUPATION_CATEGORY_OPTIONS.includes(data.occupation) ? data.occupation : (data.occupation ? 'Other' : '')) || '';
        const fetchedOccupationOther = data.occupation_other || (fetchedOccupationCategory === 'Other' ? data.occupation : '') || '';
        const fetchedAnnualSalaryRange = data.annual_salary_range || (ANNUAL_SALARY_RANGE_OPTIONS.includes(data.annual_salary) ? data.annual_salary : '') || '';

        setEducationLevel(fetchedEducationLevel);
        setOccupationCategory(fetchedOccupationCategory);
        setOccupationOther(fetchedOccupationOther);
        setWorkingStatus(data.working_status || 'Employed');
        setAnnualSalaryRange(fetchedAnnualSalaryRange);
        setAboutMe(data.about_me || '');
        setFamilyType(data.family_type || 'Nuclear');
        setCompleteness(data.completeness_percentage || 0);
        if (data.profile_photo) setDbPhotoUrl(data.profile_photo);
      }

      const { data: prefData, ok: prefOk } = await cachedFetch(`${API_URL}/api/profiles/preferences/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (prefOk && prefData) {
        setPrefCaste(prefData.caste || '');
        setPrefReligion(prefData.religion || '');
        setPrefHeight(prefData.height || '');
        setPrefOccupation(prefData.occupation || '');
        setPrefSalary(prefData.annual_salary || '');
        setPrefBloodGroup(prefData.blood_group || '');
        setPrefFamilyType(prefData.family_type || 'Nuclear');
        setPrefLocation(prefData.location || '');
        setPrefWorkingStatus(prefData.working_status || 'Employed');
        setPrefMinAge(prefData.min_age !== undefined ? prefData.min_age : 18);
        setPrefMaxAge(prefData.max_age !== undefined ? prefData.max_age : 100);
      }
    } catch (err) {
      console.error('Failed to load profile/preferences details', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Validation ─────────────────────────────────────────────────────────────

  const validatePersonal = (): string | null => {
    const heightVal = heightOption === 'cm' 
      ? parseInt(heightCm) 
      : ftInToCm(parseInt(heightFeet), parseInt(heightInches));
      
    if (isNaN(heightVal) || heightVal < 100 || heightVal > 250) {
      return 'Height must be a valid number between 100 cm and 250 cm.';
    }
    if (!religionCategory) return 'Religion is required in Personal Information.';
    if (religionCategory === 'Other' && !religionOther.trim()) return 'Please specify your religion since "Other" is selected.';
    if (!casteCategory) return 'Caste is required in Personal Information.';
    if (casteCategory === 'Other' && !casteOther.trim()) return 'Please specify your caste since "Other" is selected.';
    if (!bloodGroup) return 'Blood Group is required in Personal Information.';
    if (!city.trim()) return 'Current City is required in Personal Information.';
    if (!hometown.trim()) return 'Hometown is required in Personal Information.';
    return null;
  };

  const validateProfessional = (): string | null => {
    if (!educationLevel) return 'Highest Education is required in Professional Information.';
    if (!occupationCategory) return 'Occupation is required in Professional Information.';
    if (occupationCategory === 'Other' && !occupationOther.trim()) {
      return 'Please specify your occupation since "Other" is selected.';
    }
    if (!annualSalaryRange) return 'Annual Salary is required in Professional Information.';
    return null;
  };

  const validateAdditional = (): string | null => {
    if (!aboutMe.trim()) return 'About Me is required in Additional Information.';
    if (!photoFile && !dbPhotoUrl) return 'Profile Photo is required in Additional Information.';
    return null;
  };

  const validateUpTo = (target: SectionKey): { error: string; failedSection: SectionKey } | null => {
    const personalError = validatePersonal();
    if (personalError) return { error: personalError, failedSection: 'personal' };
    if (target === 'personal') return null;

    const professionalError = validateProfessional();
    if (professionalError) return { error: professionalError, failedSection: 'professional' };
    if (target === 'professional') return null;

    const additionalError = validateAdditional();
    if (additionalError) return { error: additionalError, failedSection: 'additional' };

    return null;
  };

  // ─── Auto-save Profile (sections 1-3) ──────────────────────────────────────

  const saveProfileData = async (): Promise<boolean> => {
    const finalHeight = heightOption === 'cm' 
      ? parseInt(heightCm) 
      : ftInToCm(parseInt(heightFeet), parseInt(heightInches));

    const formData = new FormData();
    formData.append('height', finalHeight.toString());
    formData.append('religion_category', religionCategory);
    formData.append('religion_other', religionCategory === 'Other' ? religionOther : '');
    formData.append('caste_category', casteCategory);
    formData.append('caste_other', casteCategory === 'Other' ? casteOther : '');
    formData.append('city', city);
    formData.append('hometown', hometown);
    formData.append('about_me', aboutMe);
    formData.append('occupation_other', occupationCategory === 'Other' ? occupationOther : '');

    // Choice-constrained fields: only append when non-empty to avoid
    // Django ChoiceField rejecting '' (empty string) with "not a valid choice".
    if (maritalStatus) formData.append('marital_status', maritalStatus);
    if (bloodGroup) formData.append('blood_group', bloodGroup);
    if (educationLevel) formData.append('education_level', educationLevel);
    if (occupationCategory) formData.append('occupation_category', occupationCategory);
    if (workingStatus) formData.append('working_status', workingStatus);
    if (annualSalaryRange) formData.append('annual_salary_range', annualSalaryRange);
    if (familyType) formData.append('family_type', familyType);

    if (photoFile) formData.append('profile_photo', photoFile);

    try {
      const { data, ok } = await cachedFetch(`${API_URL}/api/profiles/me/`, {
        method: 'PUT',
        headers: { Authorization: `Token ${token}` },
        body: formData,
      });

      if (ok && data) {
        setCompleteness(data.completeness_percentage);
        if (data.profile_photo) setDbPhotoUrl(data.profile_photo);
        if (data.user) updateUser(data.user);
        return true;
      } else {
        console.error('[ProfileEdit] Save failed. Server errors:', JSON.stringify(data));
        const errorMsg = data 
          ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
          : 'Unknown error';
        setMessage({ type: 'error', text: `Save failed: ${errorMsg}` });
        return false;
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not save details to the server.' });
      return false;
    }
  };

  // ─── Next Button Handler ────────────────────────────────────────────────────

  const handleNextTo = async (target: SectionKey) => {
    setMessage(null);

    const order: SectionKey[] = ['personal', 'professional', 'additional', 'preferences'];
    const currentIndex = order.indexOf(activeSection);
    const prerequisite = order[currentIndex] as SectionKey;

    const validationResult = validateUpTo(prerequisite);
    if (validationResult) {
      setMessage({ type: 'error', text: validationResult.error });
      setActiveSection(validationResult.failedSection);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setNextLoading(true);
    const saved = await saveProfileData();
    setNextLoading(false);

    if (!saved) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setActiveSection(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Sidebar Navigation Handler ─────────────────────────────────────────────

  const navigateToSection = async (target: SectionKey) => {
    const order: SectionKey[] = ['personal', 'professional', 'additional', 'preferences'];
    const currentIndex = order.indexOf(activeSection);
    const targetIndex = order.indexOf(target);

    if (targetIndex <= currentIndex) {
      setMessage(null);
      setActiveSection(target);
      return;
    }

    setMessage(null);
    const prerequisite = order[targetIndex - 1] as SectionKey;
    const validationResult = validateUpTo(prerequisite);
    if (validationResult) {
      setMessage({ type: 'error', text: validationResult.error });
      setActiveSection(validationResult.failedSection);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setNextLoading(true);
    const saved = await saveProfileData();
    setNextLoading(false);

    if (!saved) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setActiveSection(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Photo Handler ──────────────────────────────────────────────────────────

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setMessage(null);
    }
  };

  // ─── Manual Save Button Handler ──────────────────────────────────────────────

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaveLoading(true);

    if (activeSection === 'preferences') {
      try {
        const { ok } = await cachedFetch(`${API_URL}/api/profiles/preferences/`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({
            caste: prefCaste,
            religion: prefReligion,
            height: prefHeight,
            occupation: prefOccupation,
            annual_salary: prefSalary,
            blood_group: prefBloodGroup,
            family_type: prefFamilyType,
            location: prefLocation,
            working_status: prefWorkingStatus,
            min_age: prefMinAge,
            max_age: prefMaxAge,
          }),
        });

        if (ok) {
          setMessage({ type: 'success', text: 'Partner preferences updated successfully!' });
        } else {
          setMessage({ type: 'error', text: 'Failed to update preferences. Please verify details.' });
        }
      } catch {
        setMessage({ type: 'error', text: 'Could not save preferences to server.' });
      } finally {
        setSaveLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    const saved = await saveProfileData();
    setSaveLoading(false);
    if (saved) {
      setMessage({ type: 'success', text: 'Profile details saved successfully!' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Loading State ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="app-container">
        <Header />
        <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ color: 'var(--primary-burgundy)', fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            Loading your profile details...
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="app-container">
      <Header />

      <main className="main-content" style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '3rem 2rem' }}>

        {message && (
          <div style={{
            backgroundColor: message.type === 'success' ? 'var(--accent-success)' : 'var(--accent-pink)',
            color: message.type === 'success' ? 'var(--accent-success-text)' : 'var(--accent-pink-text)',
            padding: '1rem 1.5rem',
            borderRadius: '16px',
            fontSize: '0.95rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: `1px solid ${message.type === 'success' ? 'rgba(19, 115, 51, 0.15)' : 'rgba(178, 59, 68, 0.15)'}`,
            fontWeight: 600,
            boxShadow: 'var(--card-shadow)',
            animation: 'fade-in 0.4s ease',
          }}>
            <CheckCircle size={18} />
            <span>{message.text}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* ── Left Panel ── */}
          <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* User Info Card */}
            <div className="premium-card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0, zIndex: 2 }}>
                  <circle cx="60" cy="60" r="50" fill="transparent" stroke="#F4EAE1" strokeWidth="6" />
                  <circle
                    cx="60" cy="60" r="50" fill="transparent"
                    stroke="var(--primary-burgundy)" strokeWidth="6"
                    strokeDasharray={314.16}
                    strokeDashoffset={314.16 - (314.16 * completeness) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div style={{
                  width: '88px', height: '88px', borderRadius: '50%',
                  overflow: 'hidden', backgroundColor: '#FDFBF7',
                  border: '1.5px solid rgba(128,10,63,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1, position: 'relative',
                }}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : dbPhotoUrl ? (
                    <img src={dbPhotoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-burgundy)', fontFamily: 'var(--font-serif)' }}>
                      {user ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase() : 'U'}
                    </div>
                  )}
                </div>
                <div style={{
                  position: 'absolute', bottom: '-5px',
                  backgroundColor: 'var(--primary-burgundy)', color: 'var(--white)',
                  padding: '3px 10px', borderRadius: '12px',
                  fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-display)',
                  zIndex: 3, boxShadow: '0 3px 8px rgba(128, 10, 63, 0.25)',
                  border: '1.5px solid var(--white)',
                }}>
                  {completeness}%
                </div>
              </div>

              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--primary-burgundy)', marginBottom: '0.25rem' }}>
                {user?.first_name} {user?.last_name}
              </h2>
              <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '1.5rem' }}>
                {((occupationCategory === 'Other' ? occupationOther : occupationCategory) || 'Profile Holder')}
              </p>

              <div style={{ borderTop: '1px solid rgba(128,10,63,0.05)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', textAlign: 'left', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-medium)' }}>Mobile:</span>
                  <span style={{ fontWeight: 600 }}>{user?.mobile_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-medium)' }}>Age:</span>
                  <span style={{ fontWeight: 600 }}>{user?.age} yrs</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-medium)' }}>Gender:</span>
                  <span style={{ fontWeight: 600 }}>{user?.gender}</span>
                </div>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <div className="premium-card" style={{ padding: '1rem', gap: '0.25rem', display: 'flex', flexDirection: 'column' }}>

              <button
                onClick={() => navigateToSection('personal')}
                disabled={nextLoading}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
                  backgroundColor: activeSection === 'personal' ? 'rgba(128, 10, 63, 0.05)' : 'transparent',
                  color: activeSection === 'personal' ? 'var(--primary-burgundy)' : 'var(--text-medium)',
                  fontFamily: 'var(--font-display)', fontWeight: 700, textAlign: 'left',
                  cursor: nextLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  transition: 'all 0.3s ease',
                }}
              >
                <UserIcon size={18} />
                Personal Information
              </button>

              <button
                onClick={() => navigateToSection('professional')}
                disabled={nextLoading}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
                  backgroundColor: activeSection === 'professional' ? 'rgba(128, 10, 63, 0.05)' : 'transparent',
                  color: activeSection === 'professional' ? 'var(--primary-burgundy)' : 'var(--text-medium)',
                  fontFamily: 'var(--font-display)', fontWeight: 700, textAlign: 'left',
                  cursor: nextLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  transition: 'all 0.3s ease',
                }}
              >
                <Briefcase size={18} />
                Professional Information
              </button>

              <button
                onClick={() => navigateToSection('additional')}
                disabled={nextLoading}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
                  backgroundColor: activeSection === 'additional' ? 'rgba(128, 10, 63, 0.05)' : 'transparent',
                  color: activeSection === 'additional' ? 'var(--primary-burgundy)' : 'var(--text-medium)',
                  fontFamily: 'var(--font-display)', fontWeight: 700, textAlign: 'left',
                  cursor: nextLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  transition: 'all 0.3s ease',
                }}
              >
                <Plus size={18} />
                Additional Info & Photo
              </button>

              <button
                onClick={() => navigateToSection('preferences')}
                disabled={nextLoading}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
                  backgroundColor: activeSection === 'preferences' ? 'rgba(128, 10, 63, 0.05)' : 'transparent',
                  color: activeSection === 'preferences' ? 'var(--primary-burgundy)' : 'var(--text-medium)',
                  fontFamily: 'var(--font-display)', fontWeight: 700, textAlign: 'left',
                  cursor: nextLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  transition: 'all 0.3s ease',
                }}
              >
                <HeartHandshake size={18} />
                Partner Preferences
              </button>

            </div>
          </div>

          {/* ── Right Panel — Form ── */}
          <div style={{ flex: 2.2, minWidth: '350px', width: '100%' }}>
            <form onSubmit={handleSaveProfile} className="premium-card" style={{ padding: '3.5rem 3rem' }}>

              {/* ── PERSONAL INFORMATION ── */}
              {activeSection === 'personal' && (
                <div style={{ animation: 'fade-in 0.4s ease' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--primary-burgundy)', marginBottom: '0.5rem' }}>
                    Personal Details
                  </h3>
                  <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
                    Provide basic personal traits to introduce yourself to potential matches.
                  </p>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1.2, minWidth: '260px', marginBottom: '1.5rem' }}>
                      <label className="form-label">Height Option *</label>
                      <div className="gender-tabs" style={{ marginBottom: '0.8rem' }}>
                        <button type="button"
                          className={`gender-tab-btn ${heightOption === 'ft' ? 'active' : ''}`}
                          onClick={() => setHeightOption('ft')}>Feet & Inches</button>
                        <button type="button"
                          className={`gender-tab-btn ${heightOption === 'cm' ? 'active' : ''}`}
                          onClick={() => setHeightOption('cm')}>Centimeters</button>
                      </div>
                      
                      {heightOption === 'ft' ? (
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '-0.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <SearchableSelect
                              label="Feet"
                              value={heightFeet ? `${heightFeet} ft` : ''}
                              options={['3 ft', '4 ft', '5 ft', '6 ft', '7 ft', '8 ft']}
                              onChange={(val) => setHeightFeet(val.split(' ')[0])}
                              placeholder="Select Feet"
                              searchable={false}
                              required
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <SearchableSelect
                              label="Inches"
                              value={heightInches !== undefined ? `${heightInches} in` : ''}
                              options={['0 in', '1 in', '2 in', '3 in', '4 in', '5 in', '6 in', '7 in', '8 in', '9 in', '10 in', '11 in']}
                              onChange={(val) => setHeightInches(val.split(' ')[0])}
                              placeholder="Select Inches"
                              searchable={false}
                              required
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: '-0.5rem' }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Height (cm)</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            min={100} 
                            max={250} 
                            placeholder="e.g. 175"
                            value={heightCm} 
                            onChange={(e) => setHeightCm(e.target.value)} 
                            style={{ height: '53px' }}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <SearchableSelect
                        label="Religion"
                        value={religionCategory}
                        options={RELIGION_OPTIONS}
                        onChange={(val) => {
                          setReligionCategory(val);
                          setCasteCategory('');
                          setCasteOther('');
                        }}
                        placeholder="Select Religion"
                        required
                      />
                    </div>
                  </div>

                  {religionCategory === 'Other' && (
                    <div className="form-group" style={{ animation: 'fade-in 0.3s ease', marginTop: '-0.5rem' }}>
                      <label className="form-label">Specify Religion *</label>
                      <input type="text" className="form-control" placeholder="Specify your religion"
                        value={religionOther} onChange={(e) => setReligionOther(e.target.value)} />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <SearchableSelect
                        label="Caste"
                        value={casteCategory}
                        options={allowedCastes}
                        onChange={(val) => setCasteCategory(val)}
                        placeholder="Select Caste"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Marital Status</label>
                      <div className="gender-tabs">
                        {(['Unmarried', 'Divorced'] as const).map((m) => (
                          <button key={m} type="button"
                            className={`gender-tab-btn ${maritalStatus === m ? 'active' : ''}`}
                            onClick={() => setMaritalStatus(m)}>{m}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {casteCategory === 'Other' && (
                    <div className="form-group" style={{ animation: 'fade-in 0.3s ease', marginTop: '-0.5rem' }}>
                      <label className="form-label">Specify Caste *</label>
                      <input type="text" className="form-control" placeholder="Specify your caste"
                        value={casteOther} onChange={(e) => setCasteOther(e.target.value)} />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <SearchableSelect
                        label="Blood Group"
                        value={bloodGroup}
                        options={BLOOD_GROUP_OPTIONS}
                        onChange={(val) => setBloodGroup(val)}
                        placeholder="Select Blood Group"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Current City *</label>
                      <input type="text" className="form-control" placeholder="e.g. Bengaluru"
                        value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Hometown *</label>
                      <input type="text" className="form-control" placeholder="e.g. Pune, Patna"
                        value={hometown} onChange={(e) => setHometown(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => handleNextTo('professional')}
                      disabled={nextLoading}
                      className="btn btn-outline"
                      style={{ padding: '0.85rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {nextLoading ? 'Saving...' : (<>Save & Next <ArrowRight size={16} /></>)}
                    </button>
                  </div>
                </div>
              )}

              {/* ── PROFESSIONAL INFORMATION ── */}
              {activeSection === 'professional' && (
                <div style={{ animation: 'fade-in 0.4s ease' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--primary-burgundy)', marginBottom: '0.5rem' }}>
                    Professional Details
                  </h3>
                  <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
                    Detail your educational achievements and career to display economic stability.
                  </p>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <SearchableSelect
                        label="Highest Education"
                        value={educationLevel}
                        options={EDUCATION_LEVEL_OPTIONS}
                        onChange={(val) => setEducationLevel(val)}
                        placeholder="Select Education Level"
                        searchable={true}
                        required
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <SearchableSelect
                        label="Occupation"
                        value={occupationCategory}
                        options={OCCUPATION_CATEGORY_OPTIONS}
                        onChange={(val) => {
                          setOccupationCategory(val);
                          if (val !== 'Other') {
                            setOccupationOther('');
                          }
                        }}
                        placeholder="Select Occupation"
                        searchable={true}
                        required
                      />
                    </div>
                  </div>

                  {occupationCategory === 'Other' && (
                    <div className="form-group" style={{ animation: 'fade-in 0.3s ease', marginBottom: '1.5rem' }}>
                      <label className="form-label">Specify Occupation *</label>
                      <input type="text" className="form-control" placeholder="e.g. Space Researcher, Astrologist"
                        value={occupationOther} onChange={(e) => setOccupationOther(e.target.value)} />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <SearchableSelect
                        label="Working Status"
                        value={workingStatus}
                        options={['Employed', 'Self-employed', 'Business', 'Unemployed']}
                        onChange={(val) => setWorkingStatus(val as any)}
                        placeholder="Select Working Status"
                        searchable={false}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <SearchableSelect
                        label="Annual Salary"
                        value={annualSalaryRange}
                        options={ANNUAL_SALARY_RANGE_OPTIONS}
                        onChange={(val) => setAnnualSalaryRange(val)}
                        placeholder="Select Salary Range"
                        searchable={false}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                    <button type="button"
                      onClick={() => { setMessage(null); setActiveSection('personal'); }}
                      className="btn btn-text">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNextTo('additional')}
                      disabled={nextLoading}
                      className="btn btn-outline"
                      style={{ padding: '0.85rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {nextLoading ? 'Saving...' : (<>Save & Next <ArrowRight size={16} /></>)}
                    </button>
                  </div>
                </div>
              )}

              {/* ── ADDITIONAL INFORMATION ── */}
              {activeSection === 'additional' && (
                <div style={{ animation: 'fade-in 0.4s ease' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--primary-burgundy)', marginBottom: '0.5rem' }}>
                    Additional Info & Photo
                  </h3>
                  <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
                    Upload a premium photo and write a summary describing your character and family background.
                  </p>

                  <div className="form-group">
                    <label className="form-label">About Me *</label>
                    <textarea className="form-control" rows={4} style={{ resize: 'vertical' }}
                      placeholder="Share details about your lifestyle, interests, goals..."
                      value={aboutMe} onChange={(e) => setAboutMe(e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Family Type</label>
                      <div className="gender-tabs">
                        {(['Nuclear', 'Joint'] as const).map((f) => (
                          <button key={f} type="button"
                            className={`gender-tab-btn ${familyType === f ? 'active' : ''}`}
                            onClick={() => setFamilyType(f)}>{f}</button>
                        ))}
                      </div>
                    </div>
                    <div className="form-group" style={{ flex: 1.2, minWidth: '240px' }}>
                      <label className="form-label">Profile Photo *</label>
                      <input type="file" ref={fileInputRef} onChange={handlePhotoChange}
                        accept="image/*" style={{ display: 'none' }} />
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{
                          width: '72px', height: '72px', borderRadius: '16px',
                          border: '1.5px solid rgba(128,10,63,0.1)', backgroundColor: '#FDFBF7',
                          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {photoPreview ? (
                            <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : dbPhotoUrl ? (
                            <img src={dbPhotoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <UserIcon size={32} style={{ color: 'var(--text-light)' }} />
                          )}
                        </div>
                        <button type="button" onClick={() => fileInputRef.current?.click()}
                          className="btn btn-outline"
                          style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Upload size={14} />
                          Upload Photo
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                    <button type="button"
                      onClick={() => { setMessage(null); setActiveSection('professional'); }}
                      className="btn btn-text">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNextTo('preferences')}
                      disabled={nextLoading}
                      className="btn btn-outline"
                      style={{ padding: '0.85rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {nextLoading ? 'Saving...' : (<>Save & Next <ArrowRight size={16} /></>)}
                    </button>
                  </div>
                </div>
              )}

              {/* ── PARTNER PREFERENCES ── */}
              {activeSection === 'preferences' && (
                <div style={{ animation: 'fade-in 0.4s ease' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--primary-burgundy)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Partner Preferences
                  </h3>
                  <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
                    What are you looking for in a prospective partner? We use these traits for compatibility matching.
                  </p>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Caste</label>
                      <input type="text" className="form-control" placeholder="e.g. Brahmin or Rajput (leave blank for any)"
                        value={prefCaste} onChange={(e) => setPrefCaste(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Religion</label>
                      <input type="text" className="form-control" placeholder="e.g. Hindu or Sikh (leave blank for any)"
                        value={prefReligion} onChange={(e) => setPrefReligion(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Minimum Age *</label>
                      <input type="number" className="form-control" min={18} max={100}
                        value={prefMinAge} onChange={(e) => setPrefMinAge(parseInt(e.target.value) || 18)} />
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Maximum Age *</label>
                      <input type="number" className="form-control" min={18} max={100}
                        value={prefMaxAge} onChange={(e) => setPrefMaxAge(parseInt(e.target.value) || 100)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Height</label>
                      <input type="text" className="form-control" placeholder="e.g. 5'6 or any"
                        value={prefHeight} onChange={(e) => setPrefHeight(e.target.value)} />
                    </div>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <SearchableSelect
                        label="Preferred Working Status"
                        value={prefWorkingStatus}
                        options={['Employed', 'Self-employed', 'Business', 'Unemployed']}
                        onChange={(val) => setPrefWorkingStatus(val)}
                        placeholder="Select Working Status"
                        searchable={false}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Occupation</label>
                      <input type="text" className="form-control" placeholder="e.g. Engineer, Doctor (leave blank for any)"
                        value={prefOccupation} onChange={(e) => setPrefOccupation(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Salary (e.g. 10 LPA+)</label>
                      <input type="text" className="form-control" placeholder="e.g. 15 LPA (leave blank for any)"
                        value={prefSalary} onChange={(e) => setPrefSalary(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Blood Group</label>
                      <input type="text" className="form-control" placeholder="e.g. B+ or any"
                        value={prefBloodGroup} onChange={(e) => setPrefBloodGroup(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Location (City/Hometown)</label>
                      <input type="text" className="form-control" placeholder="e.g. Mumbai (leave blank for any)"
                        value={prefLocation} onChange={(e) => setPrefLocation(e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Preferred Family Type</label>
                    <div className="gender-tabs">
                      {(['Nuclear', 'Joint'] as const).map((f) => (
                        <button key={f} type="button"
                          className={`gender-tab-btn ${prefFamilyType === f ? 'active' : ''}`}
                          onClick={() => setPrefFamilyType(f)}>{f}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                    <button type="button"
                      onClick={() => { setMessage(null); setActiveSection('additional'); }}
                      className="btn btn-text">
                      Back
                    </button>
                  </div>
                </div>
              )}

              {/* ── Universal Save Button ── */}
              <div style={{ borderTop: '1px solid rgba(128,10,63,0.05)', marginTop: '2rem', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                  {activeSection === 'preferences'
                    ? 'Saving Partner Preferences'
                    : `Fields filled: ${completeness === 100 ? '15 / 15 (Completed)' : `${Math.round((completeness / 100) * 15)} / 15`}`}
                </span>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="btn btn-primary"
                  style={{
                    padding: '0.85rem 2.5rem', borderRadius: '30px',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    boxShadow: 'var(--button-shadow)',
                  }}
                >
                  <Save size={16} />
                  {saveLoading ? 'Saving...' : 'Save Details'}
                </button>
              </div>

            </form>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};