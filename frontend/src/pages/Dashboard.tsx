import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { useDialog } from '../context/DialogContext';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ProfilePreview } from '../components/ProfilePreview';
import {
  MapPin, Search, Heart,
  Compass, ShieldAlert, ArrowRight,
  Bell
} from 'lucide-react';
import { API_URL } from '../config';

interface RecommendedProfile {
  id: number;
  user: {
    id: number;
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
  working_status?: string;
  about_me: string;
  profile_photo: string | null;
  match_percentage?: number;
  blood_group?: string;
  hometown?: string;
  current_place_of_living?: string;
  family_type?: string;
  annual_salary?: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { cachedFetch, getCachedData } = useCache();
  const { showLoading, hideLoading, showAlert } = useDialog();

  const cachedProfile = getCachedData(`${API_URL}/api/profiles/me/`);
  const cachedRecs = getCachedData(`${API_URL}/api/profiles/recommendations/`);

  const [profileLoading, setProfileLoading] = useState(!cachedProfile || !cachedRecs);
  const [completeness, setCompleteness] = useState(cachedProfile?.completeness_percentage || 0);
  const [recommendations, setRecommendations] = useState<RecommendedProfile[]>(cachedRecs?.results || []);
  const [recMessage, setRecMessage] = useState(cachedRecs?.message || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<RecommendedProfile | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());

  const getProfilePhoto = (photoUrl: string | null) => {
    if (!photoUrl) return '';
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }
    return `${API_URL}${photoUrl}`;
  };

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
      const { data: pData, ok: pOk } = await cachedFetch(`${API_URL}/api/profiles/me/`, {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (pOk && pData) {
        setCompleteness(pData.completeness_percentage || 0);
      }

      // 2. Fetch recommendations
      const { data: rData, ok: rOk } = await cachedFetch(`${API_URL}/api/profiles/recommendations/`, {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (rOk && rData) {
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

  const handleConnect = async (profileId: number, name: string, e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (sentRequests.has(profileId) || connectLoading) return;
    setConnectLoading(true);
    showLoading(`Sending connection request to ${name}...`);
    try {
      const { data, ok } = await cachedFetch(`${API_URL}/api/profiles/like/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ receiver_id: profileId })
      });
      hideLoading();
      if (ok) {
        // Mark as sent in session state
        setSentRequests(prev => new Set(prev).add(profileId));
        if (data?.mutual_match) {
          showAlert("Mutual Connection Established!", `Congratulations! You and ${name} are now mutually connected!`);
        } else {
          showAlert("Request Sent", `Connection request sent to ${name} successfully.`);
        }
      } else {
        showAlert("Error", "Failed to send connection request. Please try again.");
      }
    } catch (err) {
      hideLoading();
      console.error('Failed to send connection request', err);
      showAlert("Error", "A network error occurred. Please try again.");
    } finally {
      setConnectLoading(false);
    }
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
    <>
      {/* Profile Popup Modal — rendered above everything */}
      <ProfilePreview
        profile={selectedProfile}
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onConnect={(userId, e) => handleConnect(userId, `${selectedProfile?.user.first_name} ${selectedProfile?.user.last_name}`, e)}
        isConnected={selectedProfile ? sentRequests.has(selectedProfile.user.id) : false}
        isConnectLoading={connectLoading}
      />

      {/* DESKTOP VIEW */}
      <div className="app-container desktop-only">
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
                  Complete your details to get recommended profiles
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
                  onClick={() => navigate('/profile/edit')}
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

              {/* Premium service block removed */}

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
                  /* 3-column grid, max 6 cards, no scrolling */
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '2rem',
                    width: '100%'
                  }}>
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
                      .slice(0, 6)
                      .map((rec) => {
                        const fullName = `${rec.user.first_name} ${rec.user.last_name}`;
                        return (
                          <div
                            key={rec.id}
                            className="premium-card"
                            onClick={() => { setSelectedProfile(rec); }}
                            style={{
                              padding: 0,
                              borderRadius: '24px',
                              overflow: 'hidden',
                              cursor: 'pointer',
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
                                  src={getProfilePhoto(rec.profile_photo)}
                                  alt={fullName}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', zIndex: 1 }}
                                />
                              ) : (
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
                                  <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Religion</span>
                                  <strong style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{rec.religion}</strong>
                                </div>
                              </div>

                              <div style={{ borderBottom: '1px solid rgba(128,10,63,0.05)', paddingBottom: '0.6rem' }}>
                                <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Profession</span>
                                <strong style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{rec.occupation || "Not specified"}</strong>
                              </div>

                              <div style={{ marginTop: '0.25rem' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedProfile(rec); }}
                                  className="btn btn-primary"
                                  disabled={sentRequests.has(rec.user.id)}
                                  style={{
                                    width: '100%',
                                    padding: '0.65rem',
                                    borderRadius: '12px',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    opacity: sentRequests.has(rec.user.id) ? 0.6 : 1,
                                    cursor: sentRequests.has(rec.user.id) ? 'default' : 'pointer'
                                  }}
                                >
                                  <Heart size={14} fill="#FFF" />
                                  {sentRequests.has(rec.user.id) ? 'Request Sent' : 'Connect Now'}
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

      {/* MOBILE VIEW */}
      <div className="mobile-only mobile-dashboard">
        {/* Mobile Header */}
        <div className="mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#8B184F', fontSize: '1.2rem' }}>
            <Heart size={20} fill="#8B184F" />
            Natejulva
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ background: '#FCE8E6', padding: '6px 12px', borderRadius: '20px', color: '#8B184F', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>A/文</span> English
            </div>
            <div style={{ background: '#FCE8E6', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B184F' }}>
              <Bell size={18} />
            </div>
          </div>
        </div>

        {/* Greetings */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#7E7E7E', letterSpacing: '1px', fontWeight: 700, marginBottom: '4px' }}>NAMASTE</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 400, color: '#2B1D24', margin: 0, lineHeight: 1.2 }}>
            {user?.first_name}, <span style={{ color: '#901C53' }}>your journey awaits.</span>
          </h1>
        </div>

        {isProfileComplete ? (
          <>
            {/* Search */}
            <div className="mobile-search-bar" onClick={() => navigate('/search')}>
              <Search size={18} />
              <span style={{ fontSize: '0.9rem' }}>Search by name, city, profession...</span>
            </div>

            {/* Suggested Matches */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 400, margin: '0 0 4px 0', color: '#2B1D24' }}>Suggested for you</h2>
                <p style={{ fontSize: '0.85rem', color: '#7E7E7E', margin: 0 }}>Curated matches based on your profile</p>
              </div>
              <span style={{ color: '#901C53', fontWeight: 600, fontSize: '0.9rem' }} onClick={() => navigate('/search')}>See all</span>
            </div>

            {/* Cards Grid 2-col on mobile */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.85rem',
              width: '100%'
            }}>
              {recommendations.length > 0 ? recommendations.slice(0, 6).map(rec => {
                const fullName = `${rec.user.first_name} ${rec.user.last_name}`;
                return (
                  <div key={rec.id}
                    onClick={() => { setSelectedProfile(rec); }}
                    style={{
                      borderRadius: '20px',
                      background: rec.profile_photo ? 'transparent' : 'linear-gradient(135deg, #8B184F 0%, #D4A373 100%)',
                      overflow: 'hidden',
                      position: 'relative',
                      aspectRatio: '3/4',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      cursor: 'pointer',
                    }}>
                    {rec.profile_photo ? (
                      <img src={getProfilePhoto(rec.profile_photo)} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontFamily: 'var(--font-serif)', color: 'white', fontWeight: 700 }}>
                        {rec.user.first_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Gradient overlay with name */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.75rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                      <div style={{ color: 'white', fontFamily: 'var(--font-serif)', fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.2 }}>{rec.user.first_name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <MapPin size={9} /> {rec.city || rec.user.age + ' yrs'}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#7E7E7E', fontSize: '0.9rem' }}>
                  No recommendations yet.
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem 1.5rem', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <Compass size={40} style={{ color: '#B23B44', marginBottom: '1rem', margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: '#8B184F', marginBottom: '0.5rem' }}>Profile Incomplete</h2>
            <p style={{ color: '#7E7E7E', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Complete your profile ({completeness}%) to unlock recommendations, search features, and begin connecting.
            </p>
            <button
              onClick={() => navigate('/profile/edit')}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.9rem', borderRadius: '30px', fontSize: '1rem' }}
            >
              Complete Profile
            </button>
          </div>
        )}
      </div>
    </>
  );
};
