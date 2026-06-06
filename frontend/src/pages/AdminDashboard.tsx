import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminLayout } from '../components/AdminLayout';
import { 
  Users, UserCheck, Clock, UserPlus, 
  CircleAlert, CheckCircle, ArrowRight
} from 'lucide-react';
import axios from 'axios';

interface RecentUser {
  id: number;
  name: string;
  mobile_number: string;
  email: string;
  gender: string;
  date_joined: string;
  is_active: boolean;
}

interface DashboardStats {
  total_users: number;
  total_male: number;
  total_female: number;
  total_premium: number;
  new_registrations_this_month: number;
  pending_profile_approvals: number;
  recent_activity: RecentUser[];
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { adminToken } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchDashboardStats();
  }, [adminToken, navigate]);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/auth/admin/dashboard/', {
        headers: { 'Authorization': `Token ${adminToken}` }
      });
      setStats(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ color: 'var(--primary-burgundy)', fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            Loading dashboard data...
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !stats) {
    return (
      <AdminLayout>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-pink-text)' }}>
          {error || 'Error loading dashboard data.'}
        </div>
      </AdminLayout>
    );
  }

  const cards = [
    {
      title: 'Total Bureau Users',
      value: stats.total_users,
      icon: <Users size={24} />,
      bg: 'linear-gradient(135deg, #FFFDF9 0%, #FDF4EB 100%)',
      color: '#A85A28',
      desc: 'All registered profiles'
    },
    {
      title: 'Male Profiles',
      value: stats.total_male,
      icon: <Users size={24} />,
      bg: 'linear-gradient(135deg, #E8F0FE 0%, #D2E3FC 100%)',
      color: '#1A73E8',
      desc: 'Registered males'
    },
    {
      title: 'Female Profiles',
      value: stats.total_female,
      icon: <Users size={24} />,
      bg: 'linear-gradient(135deg, #FCE8E6 0%, #FAD2CF 100%)',
      color: '#D93025',
      desc: 'Registered females'
    },
    {
      title: 'Premium Members',
      value: stats.total_premium,
      icon: <UserCheck size={24} />,
      bg: 'linear-gradient(135deg, #E6F4EA 0%, #CEEAD6 100%)',
      color: '#137333',
      desc: 'Active subscriptions'
    },
    {
      title: 'Registrations This Month',
      value: stats.new_registrations_this_month,
      icon: <UserPlus size={24} />,
      bg: 'linear-gradient(135deg, #F3E8FD 0%, #E8D0FC 100%)',
      color: '#A142F4',
      desc: 'New registrations'
    },
    {
      title: 'Pending Verification',
      value: stats.pending_profile_approvals,
      icon: <Clock size={24} />,
      bg: stats.pending_profile_approvals > 0 ? 'linear-gradient(135deg, #FEF7E0 0%, #FEEFC3 100%)' : 'linear-gradient(135deg, #F1F3F4 0%, #E8EAED 100%)',
      color: stats.pending_profile_approvals > 0 ? '#B06000' : '#5F6368',
      desc: 'Awaiting profile approvals'
    }
  ];

  return (
    <AdminLayout>
      <div style={{ marginBottom: '2.5rem', animation: 'fade-in 0.5s ease' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--primary-burgundy)', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
          Overview Dashboard
        </h1>
        <p style={{ color: 'var(--text-medium)', fontSize: '1rem', margin: 0 }}>
          Real-time metrics and registration details for the Marriage Bureau system.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '3rem'
      }}>
        {cards.map((card, idx) => (
          <div 
            key={idx} 
            className="premium-card" 
            style={{
              padding: '1.75rem',
              background: card.bg,
              border: '1px solid rgba(128,10,63,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '160px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-medium)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {card.title}
                </span>
                <h3 style={{ fontSize: '2.2rem', fontWeight: 700, color: card.color, margin: '0.5rem 0 0 0', fontFamily: 'var(--font-display)' }}>
                  {card.value}
                </h3>
              </div>
              <div style={{
                color: card.color,
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                padding: '0.75rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {card.icon}
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '0.6rem', marginTop: '0.5rem' }}>
              {card.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Action items banner if there are profiles to verify */}
      {stats.pending_profile_approvals > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, var(--primary-burgundy) 0%, #5E062D 100%)',
          color: 'var(--white)',
          borderRadius: '16px',
          padding: '1.75rem 2rem',
          marginBottom: '3rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--card-shadow)'
        }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: '#F3DFCC', margin: '0 0 0.25rem 0' }}>
              Profile Verification Needed
            </h3>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
              There are {stats.pending_profile_approvals} profile photo submission(s) awaiting verification reviews.
            </p>
          </div>
          <button 
            onClick={() => navigate('/admin/verification')}
            className="btn btn-primary" 
            style={{ backgroundColor: 'var(--white)', color: 'var(--primary-burgundy)', padding: '0.65rem 1.5rem', borderRadius: '30px', fontWeight: 700, fontSize: '0.9rem' }}
          >
            Review Now
          </button>
        </div>
      )}

      {/* Recent Activity Table */}
      <div className="premium-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--primary-burgundy)', margin: 0 }}>
            Recent System Registrations
          </h2>
          <button 
            onClick={() => navigate('/admin/users')}
            className="btn btn-text" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            View All Users
            <ArrowRight size={16} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid rgba(128, 10, 63, 0.08)' }}>
                <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Full Name</th>
                <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Mobile Number</th>
                <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Email Address</th>
                <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Gender</th>
                <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Date Joined</th>
                <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_activity.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid rgba(128, 10, 63, 0.04)', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '1rem 0.75rem', fontWeight: 600, color: 'var(--text-dark)' }}>{user.name}</td>
                  <td style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)' }}>{user.mobile_number}</td>
                  <td style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)' }}>{user.email}</td>
                  <td style={{ padding: '1rem 0.75rem' }}>
                    <span style={{
                      backgroundColor: user.gender === 'Male' ? '#E8F0FE' : user.gender === 'Female' ? '#FCE8E6' : '#F1F3F4',
                      color: user.gender === 'Male' ? '#1A73E8' : user.gender === 'Female' ? '#D93025' : '#5F6368',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}>
                      {user.gender}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 0.75rem', color: 'var(--text-light)', fontSize: '0.85rem' }}>{user.date_joined}</td>
                  <td style={{ padding: '1rem 0.75rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backgroundColor: user.is_active ? 'var(--accent-success)' : 'var(--accent-pink)',
                      color: user.is_active ? 'var(--accent-success-text)' : 'var(--accent-pink-text)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      {user.is_active ? <CheckCircle size={12} /> : <CircleAlert size={12} />}
                      {user.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};
