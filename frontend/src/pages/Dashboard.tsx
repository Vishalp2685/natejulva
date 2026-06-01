import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  MapPin, Search, Heart, 
  Compass, ShieldAlert, ArrowRight 
} from 'lucide-react';

interface RecommendedProfile {
  id: number;
  user: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    age: number;
    gender: string;
    mobile_number: string;
  };
  height: string;
  religion: string;
  caste: string;
  marital_status: string;
  city: string;
  education: string;
  occupation: string;
  about_me: string;
  profile_photo: string | null;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  
  const [profileLoading, setProfileLoading] = useState(true);
  const [completeness, setCompleteness] = useState(0);
  const [recommendations, setRecommendations] = useState<RecommendedProfile[]>([]);
  const [recMessage, setRecMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/register?tab=login');
      return;
    }
    fetchDashboardData();
  }, [token, navigate]);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch current profile completeness
      const pResponse = await fetch('http://localhost:8000/api/profiles/me/', {
        headers: { 'Authorization': `Token ${token}` }
      });
      const pData = await pResponse.json();
      
      if (pResponse.ok) {
        setCompleteness(pData.completeness_percentage || 0);
      }

      // 2. Fetch recommendations
      const rResponse = await fetch('http://localhost:8000/api/profiles/recommendations/', {
        headers: { 'Authorization': `Token ${token}` }
      });
      const rData = await rResponse.json();
      
      if (rResponse.ok) {
        setRecommendations(rData.results || []);
        setRecMessage(rData.message || '');
      }
    } catch (err) {
      console.error("Error loading dashboard data", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleConnect = (profileId: number, name: string) => {
    alert(`Connection request sent to ${name}! (ID: ${profileId})`);
  };

  if (profileLoading) {
    return (
      <div className="app-container">
        <Header />
        <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ color: 'var(--primary-burgundy)', fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            Loading your dashboard details...
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isProfileComplete = completeness === 100;

  return (
    <div className="app-container">
      <Header />
      
      <main className="main-content" style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '3rem 2rem' }}>
        
        {/* Greetings Section banner */}
        <div style={{ marginBottom: '2.5rem', animation: 'fade-in 0.5s ease' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
            NAMASTE
          </span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.8rem', color: 'var(--primary-burgundy)', fontWeight: 700, lineHeight: 1.2 }}>
            {user?.first_name}, <span style={{ fontStyle: 'italic', color: 'var(--secondary-gold)' }}>your journey awaits.</span>
          </h1>
        </div>

        {/* PROFILE INCOMPLETE WARNING BLOCK */}
        {!isProfileComplete && (
          <div style={{
            background: 'linear-gradient(135deg, #FFFDF9 0%, #FFF5EB 100%)',
            border: '1.5px solid rgba(212, 163, 115, 0.25)',
            borderRadius: '24px',
            padding: '3rem',
            marginBottom: '3rem',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            alignItems: 'center',
            gap: '3rem',
            flexWrap: 'wrap',
            animation: 'fade-in 0.6s cubic-bezier(0.165, 0.84, 0.44, 1)'
          }}>
            <div style={{ flex: 1.8, minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#B23B44', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                <ShieldAlert size={18} />
                Profile Incomplete ({completeness}%)
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--primary-burgundy)', marginBottom: '0.8rem', lineHeight: 1.3 }}>
                Complete your details to get premium recommended profiles
              </h2>
              <p style={{ color: 'var(--text-medium)', fontSize: '1rem', marginBottom: '1.8rem', lineHeight: 1.6 }}>
                Under your current subscription, we require a 100% completed profile before revealing prospective partners. Complete all categories (Personal, Professional, and Additional Details) to unlock high-legibility compatibility matches.
              </p>

              {/* Progress bar container */}
              <div style={{ marginBottom: '1.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-medium)', marginBottom: '0.5rem' }}>
                  <span>Completeness Progress</span>
                  <span>{completeness}%</span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--secondary-gold-light)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${completeness}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, var(--secondary-gold) 0%, var(--primary-burgundy) 100%)', 
                    borderRadius: '10px',
                    transition: 'width 0.8s ease'
                  }}></div>
                </div>
              </div>

              <button 
                onClick={() => navigate('/profile')} 
                className="btn btn-primary"
                style={{ padding: '0.9rem 2.2rem', borderRadius: '30px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                Complete Profile
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Incomplete placeholder recommendations */}
            <div style={{ 
              flex: 1, 
              minWidth: '280px', 
              backgroundColor: 'rgba(255,255,255,0.7)', 
              border: '1px dashed rgba(128,10,63,0.1)', 
              borderRadius: '20px', 
              padding: '2rem', 
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '220px'
            }}>
              <Compass size={40} style={{ color: 'var(--text-light)', marginBottom: '1rem', strokeWidth: 1.5 }} />
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>
                Recommendations Locked
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-medium)', lineHeight: 1.5 }}>
                {recMessage || "Please complete all fields under Personal, Professional and Additional details to view compatible matches."}
              </p>
            </div>
          </div>
        )}

        {/* 100% COMPLETE DASHBOARD CONTENT */}
        {isProfileComplete && (
          <div style={{ animation: 'fade-in 0.6s ease' }}>
            
            {/* Elegant Search Panel */}
            <div className="premium-card" style={{ padding: '1.8rem 2.5rem', marginBottom: '3.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '3rem' }}
                  placeholder="Search matches by city, education, religion..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" style={{ padding: '0.85rem 2.2rem', borderRadius: '30px' }}>
                Search Matches
              </button>
            </div>

            {/* Premium feature highlight block */}
            <div style={{
              background: 'linear-gradient(135deg, var(--primary-burgundy) 0%, #5E062D 100%)',
              color: 'var(--white)',
              borderRadius: '24px',
              padding: '2.5rem 3rem',
              marginBottom: '3.5rem',
              boxShadow: 'var(--card-shadow)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '2rem'
            }}>
              <div>
                <span className="badge-premium" style={{ display: 'inline-block', marginBottom: '0.75rem' }}>Premium Service</span>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: '#F3DFCC', marginBottom: '0.4rem' }}>
                  Unlock verified private conversations.
                </h2>
                <p style={{ opacity: 0.85, fontSize: '0.95rem' }}>
                  Premium subscription unlocks direct video calling, unlimited connection invites, and direct contact numbers.
                </p>
              </div>
              <button className="btn btn-primary" style={{ backgroundColor: 'var(--white)', color: 'var(--primary-burgundy)', padding: '0.85rem 2rem', borderRadius: '30px', fontWeight: 700 }}>
                Upgrade to Premium
              </button>
            </div>

            {/* Suggested Matches Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--primary-burgundy)' }}>
                  Suggested for you
                </h2>
                <span style={{ fontSize: '0.9rem', color: 'var(--primary-burgundy)', fontWeight: 600, cursor: 'pointer' }}>
                  See all matches
                </span>
              </div>
              <p style={{ color: 'var(--text-medium)', fontSize: '0.95rem', marginBottom: '2rem' }}>
                Curated compatibility matches based on your detailed preferences.
              </p>

              {recommendations.length === 0 ? (
                <div className="premium-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-medium)' }}>
                  No compatible matches are currently available with 100% profile completeness in your opposite gender. We will notify you when new users register!
                </div>
              ) : (
                /* Horizontal matches cards grid */
                <div className="scroll-container">
                  {recommendations
                    .filter(rec => {
                      const search = searchQuery.toLowerCase();
                      return (
                        rec.user.first_name.toLowerCase().includes(search) ||
                        rec.user.last_name.toLowerCase().includes(search) ||
                        rec.city.toLowerCase().includes(search) ||
                        rec.religion.toLowerCase().includes(search) ||
                        rec.education.toLowerCase().includes(search)
                      );
                    })
                    .map((rec) => {
                      const fullName = `${rec.user.first_name} ${rec.user.last_name}`;
                      return (
                        <div 
                          key={rec.id} 
                          className="premium-card"
                          style={{
                            minWidth: '310px',
                            maxWidth: '310px',
                            padding: 0,
                            borderRadius: '24px',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}
                        >
                          {/* Banner background / Photo container */}
                          <div style={{
                            height: '180px',
                            background: 'linear-gradient(to bottom, rgba(128,10,63,0.1), rgba(128,10,63,0.85))',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            color: 'var(--white)'
                          }}>
                            {rec.profile_photo ? (
                              <img 
                                src={`http://localhost:8000${rec.profile_photo}`} 
                                alt={fullName} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', zIndex: 1 }} 
                              />
                            ) : (
                              /* Circular large initials card backdrop */
                              <div style={{
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(135deg, var(--primary-burgundy) 0%, #D4A373 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '4.5rem',
                                fontFamily: 'var(--font-serif)',
                                fontWeight: 700,
                                opacity: 0.9,
                                letterSpacing: '0.05em',
                                color: '#FFFDF9'
                              }}>
                                {getInitials(rec.user.first_name, rec.user.last_name)}
                              </div>
                            )}
                            
                            {/* Visual gradient overlay to ensure text contrast */}
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: '80px',
                              background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
                              zIndex: 2
                            }}></div>

                            <div style={{ position: 'relative', zIndex: 3, padding: '1rem', width: '100%', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--white)', margin: 0 }}>
                                {fullName}
                              </h3>
                              <span style={{ fontSize: '0.8rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <MapPin size={12} />
                                {rec.city || "Not specified"}
                              </span>
                            </div>
                          </div>

                          {/* Profile Quick Parameters Details */}
                          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.85rem' }}>
                            <div style={{ borderBottom: '1px solid rgba(128,10,63,0.05)', paddingBottom: '0.6rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                              <div>
                                <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Age / Height</span>
                                <strong style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{rec.user.age} yrs / {rec.height}</strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Religion / Caste</span>
                                <strong style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{rec.religion} ({rec.caste})</strong>
                              </div>
                            </div>

                            <div style={{ borderBottom: '1px solid rgba(128,10,63,0.05)', paddingBottom: '0.6rem' }}>
                              <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Profession</span>
                              <strong style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{rec.occupation || "Not specified"}</strong>
                            </div>

                            <div style={{ borderBottom: '1px solid rgba(128,10,63,0.05)', paddingBottom: '0.6rem' }}>
                              <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Education</span>
                              <strong style={{ color: 'var(--text-dark)', fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {rec.education || "Not specified"}
                              </strong>
                            </div>

                            <div style={{ marginTop: '0.5rem' }}>
                              <button 
                                onClick={() => handleConnect(rec.id, fullName)}
                                className="btn btn-primary" 
                                style={{ width: '100%', padding: '0.65rem', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                              >
                                <Heart size={14} fill="#FFF" />
                                Connect Now
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      <Footer />
    </div>
  );
};
