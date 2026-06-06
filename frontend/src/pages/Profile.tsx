import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Bell, Edit2, LogOut, Camera } from 'lucide-react';
import { API_URL } from '../config';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const { cachedFetch, getCachedData } = useCache();
  
  const cachedProfile = getCachedData(`${API_URL}/api/profiles/me/`);
  const [profile, setProfile] = useState<any>(cachedProfile || null);
  const [loading, setLoading] = useState(!cachedProfile);

  useEffect(() => {
    if (!token) {
      navigate('/register?tab=login');
      return;
    }
    fetchProfile();
  }, [token]);

  const fetchProfile = async () => {
    try {
      const { data, ok } = await cachedFetch(`${API_URL}/api/profiles/me/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (ok && data) {
        setProfile(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getInitials = () => {
    if (user?.first_name) {
      return user.first_name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  if (loading) return <div className="app-container"><Header /><main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>Loading profile...</main><Footer /></div>;

  return (
    <>
      <div className="app-container desktop-only">
        <Header />
        <main className="main-content" style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 2rem', textAlign: 'center' }}>
          <h2>Please view this page on a mobile device or resize your window.</h2>
          <button className="btn btn-primary" onClick={() => navigate('/profile/edit')}>Edit Profile Details</button>
        </main>
        <Footer />
      </div>

      {/* MOBILE VIEW */}
      <div className="mobile-only mobile-dashboard" style={{ background: '#FEF6F0', minHeight: '100vh', paddingBottom: '90px' }}>
        {/* Mobile Header */}
        <div className="mobile-header" style={{ marginBottom: '1rem', padding: '0 0.5rem' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 500, color: '#2B1D24', fontFamily: 'var(--font-serif)' }}>
            My Profile
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ background: '#FCE8E6', padding: '4px 10px', borderRadius: '20px', color: '#8B184F', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>A/文</span> English
            </div>
            <div style={{ background: '#FCE8E6', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B184F' }}>
              <Bell size={16} />
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', marginBottom: '1.5rem', position: 'relative' }}>
          <div style={{ background: 'linear-gradient(135deg, #8B184F 0%, #680530 100%)', height: '100px', width: '100%' }}></div>
          
          <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', position: 'relative' }}>
            <div style={{ 
              width: '100px', height: '100px', borderRadius: '50%', 
              background: 'linear-gradient(180deg, #FF9BBA 0%, #FF6B9B 100%)',
              border: '4px solid white',
              position: 'absolute', top: '-50px', left: '1.5rem',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              color: 'white', fontSize: '2.5rem', fontFamily: 'var(--font-serif)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}>
              {profile?.profile_photo ? (
                <img src={`${API_URL}${profile.profile_photo}`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : getInitials()}
              <div style={{ 
                position: 'absolute', bottom: '0', right: '0', 
                background: '#8B184F', width: '28px', height: '28px', 
                borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center',
                border: '2px solid white'
              }}>
                <Camera size={12} color="white" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '60px' }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: '#2B1D24', fontWeight: 500 }}>{user?.first_name}</h2>
                <p style={{ margin: '4px 0 12px 0', fontSize: '0.85rem', color: '#7E7E7E' }}>Complete your profile</p>
              </div>
              <button 
                onClick={() => navigate('/profile/edit')}
                style={{ background: '#FEF6F0', color: '#8B184F', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              >
                <Edit2 size={14} /> Edit
              </button>
            </div>
          </div>
        </div>

        {/* Info Sections */}
        <InfoSection title="Personal" items={[
          { label: 'Age', value: user?.age ? `${user.age}` : '—' },
          { label: 'Gender', value: user?.gender || '—' },
          { label: 'Height', value: profile?.height || '—' },
          { label: 'Religion', value: profile?.religion || '—' },
          { label: 'Caste', value: profile?.caste || '—' },
          { label: 'Marital Status', value: profile?.marital_status || '—' },
          { label: 'Blood Group', value: profile?.blood_group || '—' }
        ]} />

        <InfoSection title="Professional" items={[
          { label: 'Education', value: profile?.education || '—' },
          { label: 'Occupation', value: profile?.occupation || '—' },
          { label: 'Working', value: profile?.working_status || '—' },
          { label: 'Salary', value: profile?.annual_salary || '—' }
        ]} />

        <InfoSection title="Location & Family" items={[
          { label: 'Current City', value: profile?.city || '—' },
          { label: 'Hometown', value: profile?.hometown || '—' },
          { label: 'Family Type', value: profile?.family_type || '—' }
        ]} />

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', marginBottom: '1rem' }}>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#7E7E7E', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </>
  );
};

const InfoSection: React.FC<{ title: string, items: {label: string, value: string}[] }> = ({ title, items }) => (
  <div style={{ background: 'white', borderRadius: '24px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: '#2B1D24', margin: '0 0 1.2rem 0', fontWeight: 600 }}>{title}</h3>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((item, index) => (
        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 0', borderBottom: index < items.length - 1 ? '1px solid #F5F5F5' : 'none' }}>
          <span style={{ color: '#7E7E7E', fontSize: '0.85rem' }}>{item.label}</span>
          <span style={{ color: '#2B1D24', fontSize: '0.9rem', fontWeight: 500 }}>{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);
