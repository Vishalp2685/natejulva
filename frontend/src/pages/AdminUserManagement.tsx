import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminLayout } from '../components/AdminLayout';
import { 
  Search, Eye, Edit2, Trash2, ShieldAlert, ShieldCheck, 
  ChevronLeft, ChevronRight, X
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import { useDialog } from '../context/DialogContext';

interface ProfileDetails {
  id: number;
  height: string;
  religion: string;
  caste: string;
  marital_status: string;
  city: string;
  hometown?: string;
  blood_group?: string;
  education: string;
  occupation: string;
  working_status: string;
  annual_salary: string;
  about_me: string;
  family_type: string;
  verification_status: string;
  is_verified: boolean;
  is_premium: boolean;
}

interface User {
  id: number;
  mobile_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  age: number;
  gender: string;
  role: string;
  is_active: boolean;
  date_joined: string;
  profile?: ProfileDetails;
}

export const AdminUserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { adminToken } = useAdminAuth();
  const { showLoading, hideLoading, showAlert, showConfirm } = useDialog();
  
  // State variables
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit fields state
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAge, setEditAge] = useState<number>(18);
  const [editGender, setEditGender] = useState('Male');

  useEffect(() => {
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchUsers();
  }, [adminToken, page, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/auth/admin/users/`, {
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
      setError('Failed to fetch user list.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    showLoading(user.is_active ? "Suspending user..." : "Activating user...");
    try {
      const response = await axios.post(`${API_URL}/api/auth/admin/users/${user.id}/toggle-status/`, {}, {
        headers: { 'Authorization': `Token ${adminToken}` }
      });
      hideLoading();
      
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: response.data.is_active } : u));
      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser({ ...selectedUser, is_active: response.data.is_active });
      }
      showAlert("Success", `User account ${response.data.is_active ? 'activated' : 'suspended'} successfully.`);
    } catch (err) {
      hideLoading();
      showAlert('Error', 'Error toggling user suspension status.');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    showConfirm(
      'Delete Account',
      'Are you absolutely sure you want to permanently delete this user account? All associated profile preferences and data will be destroyed.',
      async () => {
        showLoading("Deleting user account...");
        try {
          await axios.delete(`${API_URL}/api/auth/admin/users/${userId}/`, {
            headers: { 'Authorization': `Token ${adminToken}` }
          });
          hideLoading();
          
          showAlert('Success', 'User deleted successfully.');
          setIsViewModalOpen(false);
          fetchUsers();
        } catch (err) {
          hideLoading();
          showAlert('Error', 'Error deleting user account.');
        }
      }
    );
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditFirstName(user.first_name);
    setEditLastName(user.last_name);
    setEditEmail(user.email || '');
    setEditMobile(user.mobile_number);
    setEditAge(user.age);
    setEditGender(user.gender);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    showLoading("Saving changes...");
    try {
      const response = await axios.patch(`${API_URL}/api/auth/admin/users/${selectedUser.id}/`, {
        first_name: editFirstName,
        last_name: editLastName,
        email: editEmail || null,
        mobile_number: editMobile,
        age: editAge,
        gender: editGender
      }, {
        headers: { 'Authorization': `Token ${adminToken}` }
      });

      hideLoading();
      showAlert('Success', 'User updated successfully.');
      setIsEditModalOpen(false);
      setUsers(users.map(u => u.id === selectedUser.id ? response.data : u));
    } catch (err: any) {
      hideLoading();
      if (err.response && err.response.data) {
        showAlert('Error', JSON.stringify(err.response.data));
      } else {
        showAlert('Error', 'Error updating user.');
      }
    }
  };

  return (
    <AdminLayout>
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', animation: 'fade-in 0.5s ease' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--primary-burgundy)', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
            User Management
          </h1>
          <p style={{ color: 'var(--text-medium)', fontSize: '1rem', margin: 0 }}>
            Search, modify, suspend, or delete customer accounts from the system.
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="premium-card" style={{ padding: '1.5rem 2rem', marginBottom: '2.5rem' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input 
            type="text" 
            className="form-control" 
            style={{ paddingLeft: '3rem', margin: 0 }}
            placeholder="Search users by name, email, phone, city, caste, religion..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset page on new search
            }}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="premium-card" style={{ padding: '2rem' }}>
        {error && (
          <div style={{ color: 'var(--accent-pink-text)', padding: '1rem 0', textAlign: 'center' }}>{error}</div>
        )}
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--primary-burgundy)', fontWeight: 600 }}>Loading users list...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-medium)' }}>No users found matching your search.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid rgba(128, 10, 63, 0.08)' }}>
                    <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Name</th>
                    <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Mobile Number</th>
                    <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Email Address</th>
                    <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Gender / Age</th>
                    <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Subscription</th>
                    <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(128, 10, 63, 0.04)' }}>
                      <td style={{ padding: '1rem 0.75rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                        {user.first_name} {user.last_name}
                      </td>
                      <td style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)' }}>{user.mobile_number}</td>
                      <td style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)' }}>{user.email || '—'}</td>
                      <td style={{ padding: '1rem 0.75rem', color: 'var(--text-medium)' }}>{user.gender} ({user.age} yrs)</td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        {user.profile?.is_premium ? (
                          <span className="badge-premium" style={{ fontSize: '0.7rem' }}>Premium</span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Free User</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <span style={{
                          backgroundColor: user.is_active ? 'var(--accent-success)' : 'var(--accent-pink)',
                          color: user.is_active ? 'var(--accent-success-text)' : 'var(--accent-pink-text)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {user.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => {
                              setSelectedUser(user);
                              setIsViewModalOpen(true);
                            }}
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.6rem', borderRadius: '8px' }}
                            title="View Profile"
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            onClick={() => openEditModal(user)}
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.6rem', borderRadius: '8px' }}
                            title="Edit User Info"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(user)}
                            className="btn btn-outline"
                            style={{ 
                              padding: '0.4rem 0.6rem', 
                              borderRadius: '8px',
                              borderColor: user.is_active ? 'rgba(178, 59, 68, 0.2)' : 'rgba(19, 115, 51, 0.2)',
                              color: user.is_active ? 'var(--accent-pink-text)' : 'var(--accent-success-text)' 
                            }}
                            title={user.is_active ? "Suspend User" : "Activate User"}
                          >
                            {user.is_active ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', color: 'var(--accent-pink-text)', borderColor: 'rgba(178, 59, 68, 0.2)' }}
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-medium)' }}>
                  Showing page {page} of {totalPages} ({totalCount} total users)
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

      {/* VIEW USER PROFILE DETAILS MODAL */}
      {isViewModalOpen && selectedUser && (
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
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2.5rem',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsViewModalOpen(false)}
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--primary-burgundy)', marginBottom: '0.5rem' }}>
              User & Profile Details
            </h2>
            <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Full profile summary for system auditing.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block', textTransform: 'uppercase' }}>Full Name</span>
                <strong style={{ color: 'var(--text-dark)' }}>{selectedUser.first_name} {selectedUser.middle_name} {selectedUser.last_name}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block', textTransform: 'uppercase' }}>Mobile / Email</span>
                <strong style={{ color: 'var(--text-dark)' }}>{selectedUser.mobile_number} / {selectedUser.email || 'None'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block', textTransform: 'uppercase' }}>Gender & Age</span>
                <strong style={{ color: 'var(--text-dark)' }}>{selectedUser.gender} ({selectedUser.age} yrs)</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block', textTransform: 'uppercase' }}>Membership Account</span>
                <strong style={{ color: 'var(--text-dark)' }}>
                  {selectedUser.profile?.is_premium ? 'Premium Subscriber' : 'Standard (Free)'}
                </strong>
              </div>
            </div>

            {selectedUser.profile ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>City / Hometown</span>
                  <strong>{selectedUser.profile.city || '—'} / {selectedUser.profile.hometown || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Religion / Caste</span>
                  <strong>{selectedUser.profile.religion || '—'} ({selectedUser.profile.caste || '—'})</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Marital Status</span>
                  <strong>{selectedUser.profile.marital_status || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Height & Blood Group</span>
                  <strong>{selectedUser.profile.height || '—'} / {selectedUser.profile.blood_group || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Education / Occupation</span>
                  <strong>{selectedUser.profile.education || '—'} / {selectedUser.profile.occupation || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Working Status / Salary</span>
                  <strong>{selectedUser.profile.working_status || '—'} ({selectedUser.profile.annual_salary || '—'})</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>About User</span>
                  <p style={{ margin: '0.25rem 0 0 0', lineHeight: 1.5, color: 'var(--text-medium)' }}>
                    {selectedUser.profile.about_me || 'No personal bio uploaded.'}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '1rem' }}>
                No completed profile exists for this account.
              </div>
            )}

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditModal(selectedUser);
                }}
                className="btn btn-secondary" 
                style={{ padding: '0.6rem 1.5rem', borderRadius: '8px' }}
              >
                Edit Information
              </button>
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="btn btn-outline" 
                style={{ padding: '0.6rem 1.5rem', borderRadius: '8px' }}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER ACCOUNT MODAL */}
      {isEditModalOpen && selectedUser && (
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
            maxWidth: '520px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2.5rem',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsEditModalOpen(false)}
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--primary-burgundy)', marginBottom: '0.5rem' }}>
              Edit User Account
            </h2>
            <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Modify standard credentials below.
            </p>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">First Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={editFirstName} 
                  onChange={(e) => setEditFirstName(e.target.value)} 
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Last Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={editLastName} 
                  onChange={(e) => setEditLastName(e.target.value)} 
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)} 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Mobile Number</label>
                <input 
                  type="text" 
                  maxLength={10}
                  className="form-control" 
                  value={editMobile} 
                  onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, ''))} 
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Age</label>
                <input 
                  type="number" 
                  min={18}
                  className="form-control" 
                  value={editAge} 
                  onChange={(e) => setEditAge(parseInt(e.target.value))} 
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Gender</label>
                <select 
                  className="form-control" 
                  value={editGender} 
                  onChange={(e) => setEditGender(e.target.value)}
                  style={{ appearance: 'auto' }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="submit"
                  className="btn btn-primary" 
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px' }}
                >
                  Save Changes
                </button>
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn btn-outline" 
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px' }}
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
