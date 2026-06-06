import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminLayout } from '../components/AdminLayout';
import { 
  Search, ChevronLeft, ChevronRight, X, Calendar
} from 'lucide-react';
import axios from 'axios';

interface ProfileDetails {
  id: number;
  is_premium: boolean;
  premium_expiry: string | null;
  payment_status: string;
}

interface UserSubscription {
  id: number;
  mobile_number: string;
  first_name: string;
  last_name: string;
  email: string;
  gender: string;
  profile?: ProfileDetails;
}

export const AdminMembershipManagement: React.FC = () => {
  const navigate = useNavigate();
  const { adminToken } = useAdminAuth();
  
  const [users, setUsers] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Upgrade Modal State
  const [selectedUser, setSelectedUser] = useState<UserSubscription | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeMonths, setUpgradeMonths] = useState(6);
  const [paymentStatus, setPaymentStatus] = useState('completed');

  useEffect(() => {
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchSubscriptions();
  }, [adminToken, page, search]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/auth/admin/users/', {
        headers: { 'Authorization': `Token ${adminToken}` },
        params: {
          page: page,
          search: search
        }
      });
      setUsers(response.data.results || []);
      setTotalCount(response.data.count || 0);
      setTotalPages(Math.ceil((response.data.count || 0) / 10));
    } catch (err) {
      console.error(err);
      setError('Failed to fetch memberships.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPremium = async (user: UserSubscription) => {
    if (!window.confirm(`Are you sure you want to cancel the Premium membership for ${user.first_name} ${user.last_name}?`)) {
      return;
    }

    try {
      const response = await axios.post(`http://localhost:8000/api/auth/admin/users/${user.id}/update-membership/`, {
        is_premium: false
      }, {
        headers: { 'Authorization': `Token ${adminToken}` }
      });

      alert(response.data.message);
      fetchSubscriptions();
    } catch (err) {
      alert('Error cancelling premium subscription.');
    }
  };

  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const response = await axios.post(`http://localhost:8000/api/auth/admin/users/${selectedUser.id}/update-membership/`, {
        is_premium: true,
        months: upgradeMonths,
        payment_status: paymentStatus
      }, {
        headers: { 'Authorization': `Token ${adminToken}` }
      });

      alert(response.data.message);
      setIsUpgradeModalOpen(false);
      fetchSubscriptions();
    } catch (err) {
      alert('Error upgrading subscription.');
    }
  };

  return (
    <AdminLayout>
      <div style={{ marginBottom: '2.5rem', animation: 'fade-in 0.5s ease' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--primary-burgundy)', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
          Membership & Subscriptions
        </h1>
        <p style={{ color: 'var(--text-medium)', fontSize: '1rem', margin: 0 }}>
          Manage user plan tiers, subscription expiries, and payment transaction states.
        </p>
      </div>

      {/* Search Filter Container */}
      <div className="premium-card" style={{ padding: '1.5rem 2rem', marginBottom: '2.5rem' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input 
            type="text" 
            className="form-control" 
            style={{ paddingLeft: '3rem', margin: 0 }}
            placeholder="Search users to manage membership..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Subscriptions data table */}
      <div className="premium-card" style={{ padding: '2rem' }}>
        {error && (
          <div style={{ color: 'var(--accent-pink-text)', padding: '1rem 0', textAlign: 'center' }}>{error}</div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--primary-burgundy)', fontWeight: 600 }}>Loading membership database...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-medium)' }}>No matching profiles found.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid rgba(128, 10, 63, 0.08)' }}>
                    <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>User Name</th>
                    <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Mobile Number</th>
                    <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Plan Tier</th>
                    <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Premium Expiry</th>
                    <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Billing Status</th>
                    <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isPremium = user.profile?.is_premium;
                    const expiry = user.profile?.premium_expiry;
                    const payment = user.profile?.payment_status || 'pending';

                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid rgba(128, 10, 63, 0.04)' }}>
                        <td style={{ padding: '1rem 0.75rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                          {user.first_name} {user.last_name}
                        </td>
                        <td style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)' }}>{user.mobile_number}</td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            backgroundColor: isPremium ? 'linear-gradient(135deg, #F9F3EA 0%, #F3DFCC 100%)' : '#F1F3F4',
                            border: isPremium ? '1px solid rgba(212,163,115,0.3)' : '1px solid transparent',
                            color: isPremium ? '#8c6031' : '#5f6368',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }} className={isPremium ? "badge-premium" : ""}>
                            {isPremium ? 'Premium Sub' : 'Free tier'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem' }}>
                          {isPremium && expiry ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Calendar size={12} />
                              {new Date(expiry).toLocaleDateString()}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <span style={{
                            backgroundColor: 
                              payment === 'completed' ? 'var(--accent-success)' :
                              payment === 'pending' ? '#FEF7E0' : '#FCE8E6',
                            color: 
                              payment === 'completed' ? 'var(--accent-success-text)' :
                              payment === 'pending' ? '#B06000' : 'var(--accent-pink-text)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}>
                            {payment}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            {isPremium ? (
                              <button
                                onClick={() => handleCancelPremium(user)}
                                className="btn btn-outline"
                                style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--accent-pink-text)', borderColor: 'rgba(178, 59, 68, 0.2)' }}
                              >
                                Cancel Premium
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsUpgradeModalOpen(true);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', borderWidth: '1px' }}
                              >
                                Upgrade Plan
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-medium)' }}>
                  Showing page {page} of {totalPages} ({totalCount} users)
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="btn btn-outline"
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="btn btn-outline"
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* UPGRADE PLAN MODAL */}
      {isUpgradeModalOpen && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0, bottom: 0, left: 0, right: 0,
          backgroundColor: 'rgba(43,29,36,0.5)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '2rem'
        }}>
          <div className="premium-card" style={{
            maxWidth: '440px',
            width: '100%',
            padding: '2.5rem',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsUpgradeModalOpen(false)}
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--primary-burgundy)', marginBottom: '0.5rem' }}>
              Upgrade Member
            </h2>
            <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Upgrade <strong>{selectedUser.first_name} {selectedUser.last_name}</strong> to premium tier.
            </p>

            <form onSubmit={handleUpgradeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Subscription Duration</label>
                <select 
                  className="form-control"
                  value={upgradeMonths}
                  onChange={(e) => setUpgradeMonths(parseInt(e.target.value))}
                  style={{ appearance: 'auto' }}
                >
                  <option value={1}>1 Month plan</option>
                  <option value={3}>3 Months plan</option>
                  <option value={6}>6 Months (Recommended)</option>
                  <option value={12}>12 Months (Annual)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Billing Transaction Status</label>
                <select 
                  className="form-control"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  style={{ appearance: 'auto' }}
                >
                  <option value="completed">Completed / Paid</option>
                  <option value="pending">Pending Approval</option>
                </select>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="submit"
                  className="btn btn-primary" 
                  style={{ padding: '0.65rem 1.5rem', borderRadius: '8px' }}
                >
                  Activate Premium
                </button>
                <button 
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="btn btn-outline" 
                  style={{ padding: '0.65rem 1.5rem', borderRadius: '8px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
