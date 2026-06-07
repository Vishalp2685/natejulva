import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import {
  Heart, MapPin, X, Filter, ShieldClose
} from 'lucide-react';
import { API_URL } from '../config';
interface PublicProfile {
  id: number;
  user: {
    id: number;
    first_name: string;
    middle_name?: string;
    last_name: string;
    age: number;
    gender: string;
  };
  height: string;
  religion: string;
  caste: string;
  marital_status: string;
  blood_group: string;
  city: string;
  hometown: string;
  education: string;
  occupation: string;
  working_status: string;
  annual_salary: string;
  about_me: string;
  family_type: string;
  profile_photo: string | null;
  liked_by_me?: boolean;
}

export const FindMatch: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { cachedFetch, getCachedData } = useCache();

  // Helper to build initial search URL
  const getInitialSearchUrl = () => {
    const params = new URLSearchParams();
    if (user) {
      const targetGender = user.gender === 'Male' ? 'Female' : user.gender === 'Female' ? 'Male' : '';
      if (targetGender) params.append('gender', targetGender);
    }
    return `${API_URL}/api/profiles/search/?${params.toString()}`;
  };

  const initialUrl = getInitialSearchUrl();
  const cachedData = getCachedData(initialUrl);

  const [loading, setLoading] = useState(!cachedData);
  const [profiles, setProfiles] = useState<PublicProfile[]>(cachedData?.results || []);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(cachedData?.next || null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Search filter states
  const [religion, setReligion] = useState('');
  const [caste, setCaste] = useState('');
  const [city, setCity] = useState('');
  const [workingStatus, setWorkingStatus] = useState('');
  const [familyType, setFamilyType] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');

  // Mobile filter toggle states
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      navigate('/register?tab=login');
      return;
    }
    fetchMatches();
  }, [token, navigate]);

  // Infinite Scroll Trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextPageUrl && !loadingMore) {
          fetchMoreMatches();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTargetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [nextPageUrl, loadingMore, token]);

  const fetchMatches = async () => {
    // Build dynamic query parameters
    const params = new URLSearchParams();
    if (religion) params.append('religion', religion);
    if (caste) params.append('caste', caste);
    if (city) params.append('city', city);
    if (workingStatus) params.append('working_status', workingStatus);
    if (familyType) params.append('family_type', familyType);
    if (bloodGroup) params.append('blood_group', bloodGroup);

    // Enforce showing opposite gender
    if (user) {
      const targetGender = user.gender === 'Male' ? 'Female' : user.gender === 'Female' ? 'Male' : '';
      if (targetGender) params.append('gender', targetGender);
    }

    const url = `${API_URL}/api/profiles/search/?${params.toString()}`;
    const cached = getCachedData(url);
    if (cached) {
      setProfiles(cached.results || []);
      setNextPageUrl(cached.next || null);
      setLoading(false);
      return;
    } else {
      setLoading(true);
    }

    try {
      const { data, ok } = await cachedFetch(url, {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (ok && data) {
        setProfiles(data.results || []);
        setNextPageUrl(data.next || null);
      }
    } catch (err) {
      console.error("Could not fetch compatible matches", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreMatches = async () => {
    if (!nextPageUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data, ok } = await cachedFetch(nextPageUrl, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (ok && data) {
        setProfiles(prev => [...prev, ...(data.results || [])]);
        setNextPageUrl(data.next || null);
      }
    } catch (err) {
      console.error("Could not fetch more matches", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLike = async (profileId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop from opening the details modal
    try {
      const { data, ok } = await cachedFetch(`${API_URL}/api/profiles/like/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ receiver_id: profileId })
      });

      if (ok && data) {
        if (data.mutual_match) {
          alert(`Mutual Connection Established! You and this partner are now connected!`);
        } else {
          alert("Connection request sent successfully!");
        }

        // Refresh profiles to update like button status
        setProfiles(prev => prev.map(p => {
          if (p.user.id === profileId) {
            return { ...p, liked_by_me: true };
          }
          return p;
        }));

        if (selectedProfile && selectedProfile.user.id === profileId) {
          setSelectedProfile(prev => prev ? { ...prev, liked_by_me: true } : null);
        }
      }
    } catch (err) {
      console.error("Failed to send connection request", err);
    }
  };

  const openProfileDetails = async (userId: number) => {
    setSelectedProfileId(userId);
    const url = `${API_URL}/api/profiles/${userId}/`;
    const cached = getCachedData(url);
    if (cached) {
      setSelectedProfile(cached);
      setDetailLoading(false);
    } else {
      setDetailLoading(true);
    }
    try {
      const { data, ok } = await cachedFetch(url, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (ok && data) {
        setSelectedProfile(data);
      }
    } catch (err) {
      console.error("Failed to fetch public details", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeProfileDetails = () => {
    setSelectedProfileId(null);
    setSelectedProfile(null);
  };

  const clearFilters = () => {
    setReligion('');
    setCaste('');
    setCity('');
    setWorkingStatus('');
    setFamilyType('');
    setBloodGroup('');
    if (isMobile) {
      setShowFilters(false);
    }
    setTimeout(() => fetchMatches(), 50);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="app-container">
      <Header />

      <main className="main-content" style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '3rem 2rem' }}>

        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: 'var(--primary-burgundy)', fontWeight: 700 }}>
            Find prospective partners
          </h1>
          <p style={{ color: 'var(--text-medium)', fontSize: '0.95rem' }}>
            Filter and connect with compatible matches in your opposite gender.
          </p>
        </div>

        {/* MOBILE FILTER TOGGLE BUTTON */}
        {isMobile && (
          <button
            className="btn btn-primary"
            onClick={() => setShowFilters(!showFilters)}
            style={{
              width: '100%',
              borderRadius: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.85rem',
              position: 'sticky',
              top: '0',
              zIndex: 100,
              transition: 'all 300ms ease',
            }}
          >
            <Filter size={18} />
            {showFilters ? "Hide Filters" : "Search Filters"}
          </button>
        )}

        <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* LEFT FILTER PANEL */}
          {(!isMobile || showFilters) && (
            <div
              style={{
                flex: 1,
                minWidth: '280px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                width: isMobile ? '100%' : undefined,
                overflow: 'hidden',
                transition: 'all 300ms ease',
                animation: isMobile && showFilters ? 'filterSlideDown 300ms ease forwards' : undefined,
              }}
            >
              <style>{`
                @keyframes filterSlideDown {
                  from {
                    opacity: 0;
                    transform: translateY(-12px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>
              <div className="premium-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(128,10,63,0.05)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--primary-burgundy)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Filter size={16} /> Search Filters
                  </h3>
                  <button onClick={clearFilters} className="btn-text" style={{ fontSize: '0.8rem', padding: 0 }}>
                    Clear All
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Religion</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Hindu, Sikh"
                      value={religion}
                      onChange={(e) => setReligion(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Caste</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Brahmin, Gujarati"
                      value={caste}
                      onChange={(e) => setCaste(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Mumbai, Pune"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Working Status</label>
                    <select
                      className="form-control"
                      value={workingStatus}
                      onChange={(e) => setWorkingStatus(e.target.value)}
                      style={{ height: '48px' }}
                    >
                      <option value="">Any working status</option>
                      <option value="Employed">Employed</option>
                      <option value="Self-employed">Self-employed</option>
                      <option value="Business">Business</option>
                      <option value="Unemployed">Unemployed</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Family Type</label>
                    <select
                      className="form-control"
                      value={familyType}
                      onChange={(e) => setFamilyType(e.target.value)}
                      style={{ height: '48px' }}
                    >
                      <option value="">Any family type</option>
                      <option value="Nuclear">Nuclear</option>
                      <option value="Joint">Joint</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Blood Group</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. B+, O-"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={() => {
                      fetchMatches();
                      if (isMobile) {
                        setShowFilters(false);
                      }
                    }}
                    className="btn btn-primary"
                    style={{ width: '100%', borderRadius: '20px', padding: '0.8rem', marginTop: '0.5rem' }}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MAIN RESULTS GRID */}
          <div style={{ flex: 2.8, minWidth: '350px', width: '100%' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--primary-burgundy)', fontWeight: 600 }}>
                Loading compatible matches...
              </div>
            ) : profiles.length === 0 ? (
              <div className="premium-card" style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-medium)' }}>
                No completed profiles match your search criteria. Try modifying your search filters!
              </div>
            ) : (
              <>
                <div className="grid-cols-3" style={{ gap: '1.5rem' }}>
                  {profiles.map((profile) => {
                    const fullName = `${profile.user.first_name} ${profile.user.last_name}`;
                    return (
                      <div
                        key={profile.user.id}
                        onClick={() => openProfileDetails(profile.user.id)}
                        className="premium-card animate-fade-in"
                        style={{
                          padding: 0,
                          borderRadius: '24px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        {/* Photo backdrop banner */}
                        <div style={{
                          height: '160px',
                          position: 'relative',
                          background: 'linear-gradient(135deg, var(--primary-burgundy) 0%, #D4A373 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {profile.profile_photo ? (
                            <img
                              src={`${profile.profile_photo}`}
                              alt={fullName}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ fontSize: '3.5rem', fontFamily: 'var(--font-serif)', color: '#FFFDF9', opacity: 0.9, fontWeight: 700 }}>
                              {getInitials(profile.user.first_name, profile.user.last_name)}
                            </div>
                          )}

                          <div style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', zIndex: 10 }}>
                            <button
                              onClick={(e) => handleLike(profile.user.id, e)}
                              className="btn btn-outline"
                              style={{
                                padding: '0.5rem',
                                borderRadius: '50%',
                                backgroundColor: profile.liked_by_me ? 'var(--primary-burgundy)' : 'var(--white)',
                                color: profile.liked_by_me ? 'var(--white)' : 'var(--primary-burgundy)',
                                border: 'none',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Heart size={16} fill={profile.liked_by_me ? '#FFF' : 'none'} />
                            </button>
                          </div>
                        </div>

                        {/* Card parameters details */}
                        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                          <div>
                            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--text-dark)', margin: 0 }}>
                              {fullName}
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <MapPin size={11} /> {profile.city}
                            </span>
                          </div>

                          <div style={{ borderTop: '1px solid rgba(128,10,63,0.05)', paddingTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                            <div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', display: 'block' }}>Age / Height</span>
                              <strong style={{ fontWeight: 600 }}>{profile.user.age} yrs / {profile.height}</strong>
                            </div>
                            <div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', display: 'block' }}>Religion</span>
                              <strong style={{ fontWeight: 600 }}>{profile.religion}</strong>
                            </div>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', display: 'block' }}>Occupation</span>
                            <strong style={{ fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {profile.occupation || "Not specified"}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Intersection Observer Trigger */}
                <div ref={observerTargetRef} style={{ height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '2rem' }}>
                  {loadingMore && <div className="spinner"></div>}
                  {!nextPageUrl && profiles.length > 0 && (
                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', fontWeight: 600 }}>No more profiles to display.</p>
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </main>

      {/* STUNNING DETAILS MODAL OVERLAY MASKING MOBILE */}
      {selectedProfileId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(43, 29, 36, 0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: '24px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
          >

            {/* Modal Close Button */}
            <button
              onClick={closeProfileDetails}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: 'var(--text-dark)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                zIndex: 20
              }}
            >
              <X size={18} />
            </button>

            {detailLoading || !selectedProfile ? (
              <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--primary-burgundy)', fontWeight: 600 }}>
                Loading profile details...
              </div>
            ) : (
              <div>
                {/* Visual header backdrop with image */}
                <div style={{
                  height: '240px',
                  background: 'linear-gradient(135deg, var(--primary-burgundy) 0%, #D4A373 100%)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '2rem',
                  color: 'var(--white)'
                }}>
                  {selectedProfile.profile_photo ? (
                    <img
                      src={`${selectedProfile.profile_photo}`}
                      alt={`${selectedProfile.user.first_name}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6rem', fontFamily: 'var(--font-serif)', color: 'rgba(255,255,255,0.15)', fontWeight: 700, position: 'absolute', top: 0, left: 0 }}>
                      {getInitials(selectedProfile.user.first_name, selectedProfile.user.last_name)}
                    </div>
                  )}

                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.75))',
                    zIndex: 2
                  }}></div>

                  <div style={{ position: 'relative', zIndex: 3, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                    <div>
                      <span className="badge-premium" style={{ display: 'inline-block', marginBottom: '0.5rem', background: 'rgba(212, 163, 115, 0.35)', color: 'var(--white)', border: 'none' }}>
                        100% Completed
                      </span>
                      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 700, margin: 0 }}>
                        {selectedProfile.user.first_name} {selectedProfile.user.last_name}
                      </h2>
                      <span style={{ fontSize: '0.9rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                        <MapPin size={14} />
                        {selectedProfile.city}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleLike(selectedProfile.user.id, e)}
                      className="btn btn-primary"
                      disabled={selectedProfile.liked_by_me}
                      style={{
                        borderRadius: '30px',
                        padding: '0.7rem 1.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: 'none',
                        background: selectedProfile.liked_by_me ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg, #a31d56 0%, var(--primary-burgundy) 100%)',
                        color: 'var(--white)',
                        border: selectedProfile.liked_by_me ? '1.5px solid rgba(255,255,255,0.3)' : 'none'
                      }}
                    >
                      <Heart size={15} fill={selectedProfile.liked_by_me ? '#FFF' : 'none'} />
                      {selectedProfile.liked_by_me ? "Connection Requested" : "Send Connection Request"}
                    </button>
                  </div>
                </div>

                {/* Body public details cards */}
                <div style={{ padding: '2.5rem 3rem' }}>

                  {/* About Me Section */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--primary-burgundy)', marginBottom: '0.5rem', borderBottom: '1px solid rgba(128,10,63,0.05)', paddingBottom: '0.4rem' }}>
                      About Me
                    </h4>
                    <p style={{ color: 'var(--text-medium)', fontSize: '0.95rem', lineHeight: 1.6, fontStyle: 'italic' }}>
                      "{selectedProfile.about_me}"
                    </p>
                  </div>

                  {/* Personal details info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', marginBottom: '2rem' }}>
                    <div>
                      <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--primary-burgundy)', marginBottom: '0.8rem', borderBottom: '1px solid rgba(128,10,63,0.05)', paddingBottom: '0.4rem' }}>
                        Personal Information
                      </h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <td style={{ padding: '0.6rem 0', color: 'var(--text-medium)' }}>Age</td>
                            <td style={{ padding: '0.6rem 0', fontWeight: 600, textAlign: 'right' }}>{selectedProfile.user.age} yrs</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <td style={{ padding: '0.6rem 0', color: 'var(--text-medium)' }}>Gender</td>
                            <td style={{ padding: '0.6rem 0', fontWeight: 600, textAlign: 'right' }}>{selectedProfile.user.gender}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <td style={{ padding: '0.6rem 0', color: 'var(--text-medium)' }}>Height</td>
                            <td style={{ padding: '0.6rem 0', fontWeight: 600, textAlign: 'right' }}>{selectedProfile.height}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <td style={{ padding: '0.6rem 0', color: 'var(--text-medium)' }}>Religion / Caste</td>
                            <td style={{ padding: '0.6rem 0', fontWeight: 600, textAlign: 'right' }}>{selectedProfile.religion} ({selectedProfile.caste})</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <td style={{ padding: '0.6rem 0', color: 'var(--text-medium)' }}>Marital Status</td>
                            <td style={{ padding: '0.6rem 0', fontWeight: 600, textAlign: 'right' }}>{selectedProfile.marital_status}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <td style={{ padding: '0.6rem 0', color: 'var(--text-medium)' }}>Blood Group</td>
                            <td style={{ padding: '0.6rem 0', fontWeight: 600, textAlign: 'right' }}>{selectedProfile.blood_group}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <td style={{ padding: '0.6rem 0', color: 'var(--text-medium)' }}>Hometown</td>
                            <td style={{ padding: '0.6rem 0', fontWeight: 600, textAlign: 'right' }}>{selectedProfile.hometown}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Professional details info */}
                    <div>
                      <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--primary-burgundy)', marginBottom: '0.8rem', borderBottom: '1px solid rgba(128,10,63,0.05)', paddingBottom: '0.4rem' }}>
                        Professional Information
                      </h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <td style={{ padding: '0.6rem 0', color: 'var(--text-medium)' }}>Education</td>
                            <td style={{ padding: '0.6rem 0', fontWeight: 600, textAlign: 'right' }}>{selectedProfile.education}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <td style={{ padding: '0.6rem 0', color: 'var(--text-medium)' }}>Occupation</td>
                            <td style={{ padding: '0.6rem 0', fontWeight: 600, textAlign: 'right' }}>{selectedProfile.occupation}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <td style={{ padding: '0.6rem 0', color: 'var(--text-medium)' }}>Working Status</td>
                            <td style={{ padding: '0.6rem 0', fontWeight: 600, textAlign: 'right' }}>{selectedProfile.working_status}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <td style={{ padding: '0.6rem 0', color: 'var(--text-medium)' }}>Annual Salary</td>
                            <td style={{ padding: '0.6rem 0', fontWeight: 600, textAlign: 'right' }}>{selectedProfile.annual_salary}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <td style={{ padding: '0.6rem 0', color: 'var(--text-medium)' }}>Family Type</td>
                            <td style={{ padding: '0.6rem 0', fontWeight: 600, textAlign: 'right' }}>{selectedProfile.family_type}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* PRIVACY WARNING BOX HIDING PHONE */}
                  <div style={{
                    backgroundColor: 'rgba(212,163,115,0.08)',
                    border: '1px dashed var(--secondary-gold)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    color: '#8c6031',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    marginBottom: '1rem'
                  }}>
                    <ShieldClose size={24} style={{ color: 'var(--primary-burgundy)' }} />
                    <div>
                      <span style={{ color: 'var(--primary-burgundy)', display: 'block', fontWeight: 700 }}>Mobile Number Masked for Privacy</span>
                      For security, you cannot view this person's phone number. Connect with them to initiate contact or request compatibility unlock!
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
