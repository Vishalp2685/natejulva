import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  User as UserIcon, Briefcase, Plus, Upload, 
  Save, CheckCircle, HeartHandshake
} from 'lucide-react';

export const ProfileEdit: React.FC = () => {
  const navigate = useNavigate();
  const { token, user, updateUser } = useAuth();
  
  const [activeSection, setActiveSection] = useState<'personal' | 'professional' | 'additional' | 'preferences'>('personal');
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Profile state matching Personal, Professional, Additional fields
  const [height, setHeight] = useState('');
  const [religion, setReligion] = useState('');
  const [caste, setCaste] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<'Unmarried' | 'Divorced'>('Unmarried');
  const [bloodGroup, setBloodGroup] = useState('');
  const [city, setCity] = useState('');
  const [hometown, setHometown] = useState('');
  const [currentPlace, setCurrentPlace] = useState('');
  
  const [education, setEducation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [workingStatus, setWorkingStatus] = useState<'Employed' | 'Self-employed' | 'Business' | 'Unemployed'>('Employed');
  const [annualSalary, setAnnualSalary] = useState('');
  
  const [aboutMe, setAboutMe] = useState('');
  const [familyType, setFamilyType] = useState<'Nuclear' | 'Joint'>('Nuclear');
  
  // Partner Preferences states
  const [prefCaste, setPrefCaste] = useState('');
  const [prefReligion, setPrefReligion] = useState('');
  const [prefHeight, setPrefHeight] = useState('');
  const [prefOccupation, setPrefOccupation] = useState('');
  const [prefSalary, setPrefSalary] = useState('');
  const [prefBloodGroup, setPrefBloodGroup] = useState('');
  const [prefFamilyType, setPrefFamilyType] = useState<string>('Nuclear');
  const [prefLocation, setPrefLocation] = useState('');
  const [prefWorkingStatus, setPrefWorkingStatus] = useState<string>('Employed');
  
  // Photo states
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [dbPhotoUrl, setDbPhotoUrl] = useState<string | null>(null);
  
  // Completeness indicator state
  const [completeness, setCompleteness] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) {
      navigate('/register?tab=login');
      return;
    }
    fetchProfileAndPreferences();
  }, [token, navigate]);

  const fetchProfileAndPreferences = async () => {
    try {
      // 1. Fetch profile details
      const response = await fetch('http://localhost:8000/api/profiles/me/', {
        headers: { 'Authorization': `Token ${token}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        setHeight(data.height || '');
        setReligion(data.religion || '');
        setCaste(data.caste || '');
        setMaritalStatus(data.marital_status || 'Unmarried');
        setBloodGroup(data.blood_group || '');
        setCity(data.city || '');
        setHometown(data.hometown || '');
        setCurrentPlace(data.current_place_of_living || '');
        
        setEducation(data.education || '');
        setOccupation(data.occupation || '');
        setWorkingStatus(data.working_status || 'Employed');
        setAnnualSalary(data.annual_salary || '');
        
        setAboutMe(data.about_me || '');
        setFamilyType(data.family_type || 'Nuclear');
        setCompleteness(data.completeness_percentage || 0);
        
        if (data.profile_photo) {
          setDbPhotoUrl(data.profile_photo);
        }
      }

      // 2. Fetch preferences
      const prefResponse = await fetch('http://localhost:8000/api/profiles/preferences/', {
        headers: { 'Authorization': `Token ${token}` }
      });
      const prefData = await prefResponse.json();
      if (prefResponse.ok) {
        setPrefCaste(prefData.caste || '');
        setPrefReligion(prefData.religion || '');
        setPrefHeight(prefData.height || '');
        setPrefOccupation(prefData.occupation || '');
        setPrefSalary(prefData.annual_salary || '');
        setPrefBloodGroup(prefData.blood_group || '');
        setPrefFamilyType(prefData.family_type || 'Nuclear');
        setPrefLocation(prefData.location || '');
        setPrefWorkingStatus(prefData.working_status || 'Employed');
      }
    } catch (err) {
      console.error("Failed to load profile/preferences details", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setMessage(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaveLoading(true);

    if (activeSection === 'preferences') {
      // SAVE PARTNER PREFERENCES
      try {
        const response = await fetch('http://localhost:8000/api/profiles/preferences/', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}` 
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
            working_status: prefWorkingStatus
          })
        });

        if (response.ok) {
          setMessage({ type: 'success', text: "Partner preferences updated successfully!" });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setMessage({ type: 'error', text: "Failed to update preferences. Please verify details." });
        }
      } catch (err) {
        setMessage({ type: 'error', text: "Could not save preferences to server." });
      } finally {
        setSaveLoading(false);
      }
      return;
    }

    // SAVE PROFILE DETAILS (Tabs 1, 2, 3)
    const formData = new FormData();
    formData.append('height', height);
    formData.append('religion', religion);
    formData.append('caste', caste);
    formData.append('marital_status', maritalStatus);
    formData.append('blood_group', bloodGroup);
    formData.append('city', city);
    formData.append('hometown', hometown);
    formData.append('current_place_of_living', currentPlace);
    
    formData.append('education', education);
    formData.append('occupation', occupation);
    formData.append('working_status', workingStatus);
    formData.append('annual_salary', annualSalary);
    
    formData.append('about_me', aboutMe);
    formData.append('family_type', familyType);

    if (photoFile) {
      formData.append('profile_photo', photoFile);
    }

    try {
      const response = await fetch('http://localhost:8000/api/profiles/me/', {
        method: 'PUT',
        headers: { 'Authorization': `Token ${token}` },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: "Profile details updated successfully!" });
        setCompleteness(data.completeness_percentage);
        if (data.profile_photo) {
          setDbPhotoUrl(data.profile_photo);
        }
        if (data.user) {
          updateUser(data.user);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMessage({ type: 'error', text: "Failed to update profile. Please verify your fields." });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Could not save details to the server." });
    } finally {
      setSaveLoading(false);
    }
  };

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
            animation: 'fade-in 0.4s ease'
          }}>
            <CheckCircle size={18} />
            <span>{message.text}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          
          {/* Left Panel - User Info Card */}
          <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="premium-card" style={{ padding: '2rem', textAlign: 'center' }}>
              
              <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0, zIndex: 2 }}>
                  <circle cx="60" cy="60" r="50" fill="transparent" stroke="#F4EAE1" strokeWidth="6" />
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="transparent" 
                    stroke="var(--primary-burgundy)" 
                    strokeWidth="6" 
                    strokeDasharray={314.16} 
                    strokeDashoffset={314.16 - (314.16 * completeness) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: '#FDFBF7',
                  border: '1.5px solid rgba(128,10,63,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                  position: 'relative'
                }}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : dbPhotoUrl ? (
                    <img src={`http://localhost:8000${dbPhotoUrl}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-burgundy)', fontFamily: 'var(--font-serif)' }}>
                      {user ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase() : 'U'}
                    </div>
                  )}
                </div>
                <div style={{ 
                  position: 'absolute', 
                  bottom: '-5px', 
                  backgroundColor: 'var(--primary-burgundy)',
                  color: 'var(--white)',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem', 
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  zIndex: 3,
                  boxShadow: '0 3px 8px rgba(128, 10, 63, 0.25)',
                  border: '1.5px solid var(--white)'
                }}>
                  {completeness}%
                </div>
              </div>

              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--primary-burgundy)', marginBottom: '0.25rem' }}>
                {user?.first_name} {user?.last_name}
              </h2>
              <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '1.5rem' }}>
                {occupation ? `${occupation}` : "Profile Holder"}
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

            {/* Sidebar Navigation Section Tabs */}
            <div className="premium-card" style={{ padding: '1rem', gap: '0.25rem', display: 'flex', flexDirection: 'column' }}>
              <button 
                onClick={() => { setActiveSection('personal'); setMessage(null); }}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: activeSection === 'personal' ? 'rgba(128, 10, 63, 0.05)' : 'transparent',
                  color: activeSection === 'personal' ? 'var(--primary-burgundy)' : 'var(--text-medium)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.3s ease'
                }}
              >
                <UserIcon size={18} />
                Personal Information
              </button>
              
              <button 
                onClick={() => { setActiveSection('professional'); setMessage(null); }}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: activeSection === 'professional' ? 'rgba(128, 10, 63, 0.05)' : 'transparent',
                  color: activeSection === 'professional' ? 'var(--primary-burgundy)' : 'var(--text-medium)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.3s ease'
                }}
              >
                <Briefcase size={18} />
                Professional Information
              </button>
              
              <button 
                onClick={() => { setActiveSection('additional'); setMessage(null); }}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: activeSection === 'additional' ? 'rgba(128, 10, 63, 0.05)' : 'transparent',
                  color: activeSection === 'additional' ? 'var(--primary-burgundy)' : 'var(--text-medium)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.3s ease'
                }}
              >
                <Plus size={18} />
                Additional Info & Photo
              </button>

              <button 
                onClick={() => { setActiveSection('preferences'); setMessage(null); }}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: activeSection === 'preferences' ? 'rgba(128, 10, 63, 0.05)' : 'transparent',
                  color: activeSection === 'preferences' ? 'var(--primary-burgundy)' : 'var(--text-medium)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.3s ease'
                }}
              >
                <HeartHandshake size={18} />
                Partner Preferences
              </button>
            </div>
          </div>

          {/* Right Panel - Form inputs */}
          <div style={{ flex: 2.2, minWidth: '350px', width: '100%' }}>
            <form onSubmit={handleSaveProfile} className="premium-card" style={{ padding: '3.5rem 3rem' }}>
              
              {activeSection === 'personal' && (
                /* PERSONAL INFORMATION */
                <div style={{ animation: 'fade-in 0.4s ease' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--primary-burgundy)', marginBottom: '0.5rem' }}>
                    Personal Details
                  </h3>
                  <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
                    Provide basic personal traits to introduce yourself to potential matches.
                  </p>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Height (e.g. 5'9" or 175 cm)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. 5'9"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Religion</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Hindu, Sikh"
                        value={religion}
                        onChange={(e) => setReligion(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Caste</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Brahmin, Rajput"
                        value={caste}
                        onChange={(e) => setCaste(e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Marital Status</label>
                      <div className="gender-tabs">
                        {(['Unmarried', 'Divorced'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            className={`gender-tab-btn ${maritalStatus === m ? 'active' : ''}`}
                            onClick={() => setMaritalStatus(m)}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Blood Group</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. B+, O-"
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Current City</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Bengaluru"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Hometown</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Pune, Patna"
                        value={hometown}
                        onChange={(e) => setHometown(e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Current Place of Living</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Indiranagar, Bengaluru"
                        value={currentPlace}
                        onChange={(e) => setCurrentPlace(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setActiveSection('professional')}
                      className="btn btn-outline"
                      style={{ padding: '0.85rem 2rem' }}
                    >
                      Next: Professional Details
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'professional' && (
                /* PROFESSIONAL INFORMATION */
                <div style={{ animation: 'fade-in 0.4s ease' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--primary-burgundy)', marginBottom: '0.5rem' }}>
                    Professional Details
                  </h3>
                  <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
                    Detail your educational achievements and career to display economic stability.
                  </p>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Highest Education</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. B.Tech / MBA / Medicine"
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Occupation</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Senior Software Engineer"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Working Status</label>
                      <select 
                        className="form-control"
                        value={workingStatus}
                        onChange={(e) => setWorkingStatus(e.target.value as any)}
                        style={{ height: '53px' }}
                      >
                        <option value="Employed">Employed</option>
                        <option value="Self-employed">Self-employed</option>
                        <option value="Business">Business</option>
                        <option value="Unemployed">Unemployed</option>
                      </select>
                    </div>
                    
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Annual Salary (e.g. 15 LPA)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. 12 LPA or ₹1,200,000"
                        value={annualSalary}
                        onChange={(e) => setAnnualSalary(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setActiveSection('personal')}
                      className="btn btn-text"
                    >
                      Back
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setActiveSection('additional')}
                      className="btn btn-outline"
                      style={{ padding: '0.85rem 2rem' }}
                    >
                      Next: Additional Info
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'additional' && (
                /* ADDITIONAL INFORMATION */
                <div style={{ animation: 'fade-in 0.4s ease' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--primary-burgundy)', marginBottom: '0.5rem' }}>
                    Additional Info & Photo
                  </h3>
                  <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
                    Upload a premium photo and write a summary describing your character and family background.
                  </p>

                  <div className="form-group">
                    <label className="form-label">About Me *</label>
                    <textarea 
                      className="form-control" 
                      rows={4}
                      style={{ resize: 'vertical' }}
                      placeholder="Share details about your lifestyle, interests, goals..."
                      value={aboutMe}
                      onChange={(e) => setAboutMe(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Family Type</label>
                      <div className="gender-tabs">
                        {(['Nuclear', 'Joint'] as const).map((f) => (
                          <button
                            key={f}
                            type="button"
                            className={`gender-tab-btn ${familyType === f ? 'active' : ''}`}
                            onClick={() => setFamilyType(f)}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="form-group" style={{ flex: 1.2, minWidth: '240px' }}>
                      <label className="form-label">Profile Photo *</label>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handlePhotoChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                      
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ 
                          width: '72px', 
                          height: '72px', 
                          borderRadius: '16px', 
                          border: '1.5px solid rgba(128,10,63,0.1)', 
                          backgroundColor: '#FDFBF7',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {photoPreview ? (
                            <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : dbPhotoUrl ? (
                            <img src={`http://localhost:8000${dbPhotoUrl}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <UserIcon size={32} style={{ color: 'var(--text-light)' }} />
                          )}
                        </div>

                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn btn-outline"
                          style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <Upload size={14} />
                          Upload Photo
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setActiveSection('professional')}
                      className="btn btn-text"
                    >
                      Back
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setActiveSection('preferences')}
                      className="btn btn-outline"
                      style={{ padding: '0.85rem 2rem' }}
                    >
                      Next: Partner Preferences
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'preferences' && (
                /* PARTNER PREFERENCES INFORMATION */
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
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Brahmin or Rajput (leave blank for any)"
                        value={prefCaste}
                        onChange={(e) => setPrefCaste(e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Religion</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Hindu or Sikh (leave blank for any)"
                        value={prefReligion}
                        onChange={(e) => setPrefReligion(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Height</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. 5'6 or any"
                        value={prefHeight}
                        onChange={(e) => setPrefHeight(e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Working Status</label>
                      <select 
                        className="form-control"
                        value={prefWorkingStatus}
                        onChange={(e) => setPrefWorkingStatus(e.target.value)}
                        style={{ height: '53px' }}
                      >
                        <option value="Employed">Employed</option>
                        <option value="Self-employed">Self-employed</option>
                        <option value="Business">Business</option>
                        <option value="Unemployed">Unemployed</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Occupation</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Engineer, Doctor (leave blank for any)"
                        value={prefOccupation}
                        onChange={(e) => setPrefOccupation(e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Salary (e.g. 10 LPA+)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. 15 LPA (leave blank for any)"
                        value={prefSalary}
                        onChange={(e) => setPrefSalary(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Blood Group</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. B+ or any"
                        value={prefBloodGroup}
                        onChange={(e) => setPrefBloodGroup(e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Preferred Location (City/Hometown)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Mumbai (leave blank for any)"
                        value={prefLocation}
                        onChange={(e) => setPrefLocation(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Preferred Family Type</label>
                    <div className="gender-tabs">
                      {(['Nuclear', 'Joint'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          className={`gender-tab-btn ${prefFamilyType === f ? 'active' : ''}`}
                          onClick={() => setPrefFamilyType(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setActiveSection('additional')}
                      className="btn btn-text"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

              {/* Universal Save Button */}
              <div style={{ borderTop: '1px solid rgba(128,10,63,0.05)', marginTop: '2rem', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                  {activeSection === 'preferences' ? "Saving Partner Preferences" : `Fields filled: ${completeness === 100 ? "15 / 15 (Completed)" : `${Math.round((completeness / 100) * 15)} / 15`}`}
                </span>
                
                <button 
                  type="submit" 
                  disabled={saveLoading}
                  className="btn btn-primary"
                  style={{ 
                    padding: '0.85rem 2.5rem', 
                    borderRadius: '30px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    boxShadow: 'var(--button-shadow)' 
                  }}
                >
                  <Save size={16} />
                  {saveLoading ? "Saving..." : "Save Details"}
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
