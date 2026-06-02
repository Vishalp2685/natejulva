import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Shield, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { loginAdmin } = useAdminAuth();
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumber || !password) {
      setError('Please enter both mobile number and password.');
      return;
    }

    if (mobileNumber.length !== 10) {
      setError('Mobile number must be exactly 10 digits.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:8000/api/auth/login/', {
        mobile_number: mobileNumber,
        password: password
      });

      const { token, user } = response.data;

      if (user && (user.role === 'admin' || user.is_superuser)) {
        loginAdmin(token, user);
        navigate('/admin/dashboard');
      } else {
        setError('Access denied. This login portal is restricted to administrator accounts only.');
      }
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Invalid credentials. Please verify your mobile number and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-cream)',
      padding: '2rem'
    }}>
      <div className="premium-card" style={{
        maxWidth: '460px',
        width: '100%',
        padding: '3rem 2.5rem',
        animation: 'fade-in 0.6s cubic-bezier(0.165, 0.84, 0.44, 1)'
      }}>
        {/* Header Icon & Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'rgba(128, 10, 63, 0.05)',
            color: 'var(--primary-burgundy)',
            marginBottom: '1rem'
          }}>
            <Shield size={32} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', color: 'var(--primary-burgundy)', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
            Admin Portal
          </h2>
          <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
            Marriage Bureau Administrative Panel login.
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'var(--accent-pink)',
            color: 'var(--accent-pink-text)',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            border: '1px solid rgba(178, 59, 68, 0.1)',
            lineHeight: 1.5
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Mobile number */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Mobile Number</label>
            <input
              type="text"
              maxLength={10}
              className="form-control"
              placeholder="Enter 10-digit mobile number"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div className="form-group" style={{ margin: 0, position: 'relative' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                style={{ paddingRight: '3.5rem' }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.25rem'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.9rem',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 700,
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
};
