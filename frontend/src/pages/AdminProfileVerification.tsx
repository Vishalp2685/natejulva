import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminLayout } from '../components/AdminLayout';
import { 
  Check, X, Image, User, Calendar, MapPin
} from 'lucide-react';
import axios from 'axios';

interface ProfileDetails {
  id: number;
  profile_photo: string | null;
  verification_status: string;
  is_verified: boolean;
  admin_remarks: string;
  city: string;
  religion: string;
  caste: string;
  education: string;
  occupation: string;
  about_me: string;
}

interface UserVerification {
  id: number;
  mobile_number: string;
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
  date_joined: string;
  profile?: ProfileDetails;
}

export const AdminProfileVerification: React.FC = () => {
  const navigate = useNavigate();
  const { adminToken } = useAdminAuth();
  
  const [users, setUsers] = useState<UserVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [remarksState, setRemarksState] = useState<{ [userId: number]: string }>({});

  useEffect(() => {
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchSubmissions();
  }, [adminToken, filter]);

  const fetchSubmissions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:8000/api/auth/admin/users/', {
        headers: { 'Authorization': `Token ${adminToken}` },
        params: {
          verification_status: filter
        }
      });
      
      const results = response.data.results || [];
      setUsers(results);
      
      // Pre-populate remarks state
      const initialRemarks: { [userId: number]: string } = {};
      results.forEach((u: UserVerification) => {
        if (u.profile) {
          initialRemarks[u.id] = u.profile.admin_remarks || '';
        }
      });
      setRemarksState(initialRemarks);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch verification list.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (userId: number, status: 'approved' | 'rejected') => {
    const remarks = remarksState[userId] || '';
    
    try {
      await axios.post(`http://localhost:8000/api/auth/admin/users/${userId}/verify-profile/`, {
        verification_status: status,
        admin_remarks: remarks
      }, {
        headers: { 'Authorization': `Token ${adminToken}` }
      });
      
      alert(`Profile ${status === 'approved' ? 'approved' : 'rejected'} successfully.`);
      fetchSubmissions();
    } catch (err) {
      alert('Error updating profile verification status.');
    }
  };

  const handleRemarksChange = (userId: number, text: string) => {
    setRemarksState({
      ...remarksState,
      [userId]: text
    });
  };

  return (
    <AdminLayout>
      <div style={{ marginBottom: '2.5rem', animation: 'fade-in 0.5s ease' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--primary-burgundy)', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
          Profile Verification Reviewer
        </h1>
        <p style={{ color: 'var(--text-medium)', fontSize: '1rem', margin: 0 }}>
          Inspect user-submitted details, verify uploaded photography, and update profile statuses.
        </p>
      </div>

      {/* Verification Filter Tabs */}
      <div className="premium-card" style={{ padding: '1.2rem 2rem', marginBottom: '2.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-medium)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter:</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['pending', 'approved', 'rejected'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                border: '1.5px solid rgba(128, 10, 63, 0.1)',
                backgroundColor: filter === t ? 'var(--primary-burgundy)' : 'var(--white)',
                color: filter === t ? 'var(--white)' : 'var(--text-medium)',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease'
              }}
            >
              {t} {t === 'pending' ? `(${users.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--accent-pink-text)', padding: '1rem 0', textAlign: 'center' }}>{error}</div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--primary-burgundy)', fontWeight: 600 }}>Loading review records...</div>
      ) : users.length === 0 ? (
        <div className="premium-card" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-medium)' }}>
          No user profiles are currently in the <strong>{filter}</strong> list.
        </div>
      ) : (
        /* Submission reviewers list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {users.map((user) => (
            <div key={user.id} className="premium-card" style={{ padding: '2rem', display: 'flex', gap: '2.5rem', flexWrap: 'wrap', animation: 'fade-in 0.5s ease' }}>
              
              {/* Photo review display block */}
              <div style={{
                flex: '0 0 240px',
                height: '300px',
                borderRadius: '16px',
                overflow: 'hidden',
                backgroundColor: 'rgba(128,10,63,0.03)',
                border: '1px solid rgba(128,10,63,0.08)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'flex-start'
              }}>
                {user.profile?.profile_photo ? (
                  <img 
                    src={`http://localhost:8000${user.profile.profile_photo}`} 
                    alt="Submission Profile Photo"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-light)' }}>
                    <Image size={40} style={{ strokeWidth: 1.5, marginBottom: '0.5rem', display: 'block', margin: '0 auto' }} />
                    <span style={{ fontSize: '0.8rem' }}>No Profile Photo Uploaded</span>
                  </div>
                )}
              </div>

              {/* Profile audit sheet */}
              <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.5rem' }}>
                <div>
                  {/* Account Name */}
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--primary-burgundy)', margin: '0 0 0.5rem 0' }}>
                    {user.first_name} {user.last_name}
                  </h3>
                  
                  {/* Basic meta parameters */}
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-medium)', marginBottom: '1.2rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <User size={14} />
                      {user.gender}, {user.age} yrs
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={14} />
                      {user.profile?.city || 'City: —'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={14} />
                      Joined: {new Date(user.date_joined).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Profile data grid details */}
                  {user.profile ? (
                    <div style={{ 
                      backgroundColor: 'rgba(253, 251, 247, 0.6)', 
                      border: '1.5px solid rgba(128, 10, 63, 0.04)', 
                      borderRadius: '12px', 
                      padding: '1.25rem',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.8rem',
                      fontSize: '0.85rem',
                      marginBottom: '1rem'
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Religion / Caste</span>
                        <strong>{user.profile.religion || '—'} ({user.profile.caste || '—'})</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Education / Profession</span>
                        <strong>{user.profile.education || '—'} / {user.profile.occupation || '—'}</strong>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Self Introduction</span>
                        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-medium)', lineHeight: 1.4 }}>
                          "{user.profile.about_me || 'No profile description available.'}"
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>No profile details completed.</p>
                  )}
                </div>

                {/* Audit Actions panel */}
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1.2rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Admin Remarks / Rejection Reason</label>
                    <input 
                      type="text"
                      className="form-control"
                      placeholder="Add observations, approval notes, or reasons for profile rejection..."
                      value={remarksState[user.id] || ''}
                      onChange={(e) => handleRemarksChange(user.id, e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {filter !== 'approved' && (
                      <button
                        onClick={() => handleVerification(user.id, 'approved')}
                        className="btn btn-primary"
                        style={{
                          background: 'none',
                          border: 'none',
                          backgroundColor: '#137333',
                          color: '#fff',
                          padding: '0.6rem 1.5rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.85rem'
                        }}
                      >
                        <Check size={16} />
                        Approve Profile
                      </button>
                    )}
                    {filter !== 'rejected' && (
                      <button
                        onClick={() => handleVerification(user.id, 'rejected')}
                        className="btn btn-primary"
                        style={{
                          background: 'none',
                          border: 'none',
                          backgroundColor: '#b23b44',
                          color: '#fff',
                          padding: '0.6rem 1.5rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.85rem'
                        }}
                      >
                        <X size={16} />
                        Reject Profile
                      </button>
                    )}
                    {filter === 'approved' && (
                      <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-success-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Check size={16} /> Verified Approved
                        </span>
                        <button
                          onClick={() => handleVerification(user.id, 'rejected')}
                          className="btn btn-outline"
                          style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--accent-pink-text)', borderColor: 'rgba(178, 59, 68, 0.15)' }}
                        >
                          Revoke Approval
                        </button>
                      </div>
                    )}
                    {filter === 'rejected' && (
                      <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-pink-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <X size={16} /> Rejected / Suspended
                        </span>
                        <button
                          onClick={() => handleVerification(user.id, 'approved')}
                          className="btn btn-outline"
                          style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--accent-success-text)', borderColor: 'rgba(19, 115, 51, 0.15)' }}
                        >
                          Re-approve Profile
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};
