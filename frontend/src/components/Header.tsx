import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Heart,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isActive = (path: string): string =>
    location.pathname === path ? 'active' : '';

  return (
    <header className="premium-header">
      <Link
        to={isAuthenticated ? '/home' : '/'}
        className="header-brand"
      >
        <Heart
          className="brand-logo-heart"
          fill="#800A3F"
          size={24}
          style={{ marginRight: '0.25rem' }}
        />

        <span>NateJulva</span>
      </Link>

      {/* Hamburger Button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Navigation */}
      <nav
        className={`header-nav ${mobileMenuOpen ? 'mobile-open' : ''
          }`}
      >
        {isAuthenticated ? (
          <>
            <Link
              to="/home"
              className={`nav-link ${isActive('/home')}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>

            <Link
              to="/search"
              className={`nav-link ${isActive('/search')}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Find Matches
            </Link>

            <Link
              to="/likes"
              className={`nav-link ${isActive('/likes')}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Connections & Requests
            </Link>

            <Link
              to="/chats"
              className={`nav-link ${isActive('/chats')}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Chats
            </Link>

            <Link
              to="/profile"
              className={`nav-link ${isActive('/profile')}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              My Profile
            </Link>

            <button
              onClick={handleLogout}
              className="btn btn-outline mobile-logout-btn"
            >
              <LogOut size={14} />
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/"
              className={`nav-link ${isActive('/')}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Welcome
            </Link>

            <Link
              to="/register"
              className={`nav-link ${isActive('/register')}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Register
            </Link>
          </>
        )}
      </nav>

      {/* Desktop Actions */}
      <div className="header-actions">
        {isAuthenticated && user ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >


            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--text-dark)',
              }}
            >
              {user.first_name} {user.last_name}
            </span>

            <button
              onClick={handleLogout}
              className="btn btn-outline"
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/register')}
            className="btn btn-primary"
          >
            Create Profile
          </button>
        )}
      </div>
    </header>
  );
};