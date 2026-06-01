import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, LogOut, Award } from 'lucide-react';

export const Header: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <header className="premium-header">
      <Link to={isAuthenticated ? "/home" : "/"} className="header-brand">
        <Heart className="brand-logo-heart" fill="#800A3F" size={24} style={{ marginRight: '0.25rem' }} />
        <span>natejulva</span>
        <span style={{ 
          fontSize: '0.9rem', 
          color: '#D4A373', 
          marginLeft: '0.4rem', 
          fontFamily: 'var(--font-body)', 
          fontWeight: 400,
          background: 'rgba(212, 163, 115, 0.1)',
          padding: '2px 8px',
          borderRadius: '12px'
        }}>Saaथी</span>
      </Link>

      <nav className="header-nav">
        {isAuthenticated ? (
          <>
            <Link to="/home" className={`nav-link ${isActive('/home')}`}>Home</Link>
            <Link to="/search" className={`nav-link ${isActive('/search')}`}>Find Matches</Link>
            <Link to="/likes" className={`nav-link ${isActive('/likes')}`}>Connections & Requests</Link>
            <Link to="/profile" className={`nav-link ${isActive('/profile')}`}>My Profile</Link>
          </>
        ) : (
          <>
            <Link to="/" className={`nav-link ${isActive('/')}`}>Welcome</Link>
            <Link to="/register" className={`nav-link ${isActive('/register')}`}>Register</Link>
          </>
        )}
      </nav>

      <div className="header-actions">
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="badge-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Award size={13} />
              Free Member
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)' }}>
              {user.first_name} {user.last_name}
            </span>
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', borderRadius: '10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <LogOut size={14} />
              Logout
            </button>
          </div>
        ) : (
          <button onClick={() => navigate('/register')} className="btn btn-primary">
            Create Profile
          </button>
        )}
      </div>
    </header>
  );
};
