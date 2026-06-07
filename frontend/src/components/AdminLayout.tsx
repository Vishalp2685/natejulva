import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { 
  Users, CheckSquare, CreditCard, 
  BarChart2, LogOut, LayoutDashboard, 
  Menu, X, Heart
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminUser, logoutAdmin } = useAdminAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'User Management', path: '/admin/users', icon: <Users size={20} /> },
    { name: 'Profile Verification', path: '/admin/verification', icon: <CheckSquare size={20} /> },
    { name: 'Membership Management', path: '/admin/memberships', icon: <CreditCard size={20} /> },
    { name: 'Reports', path: '/admin/reports', icon: <BarChart2 size={20} /> },
  ];

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  const getInitials = (first: string, last: string) => {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-cream)', fontFamily: 'var(--font-body)' }}>
      {/* Sidebar navigation for Desktop */}
      <aside style={{
        width: '280px',
        backgroundColor: 'var(--white)',
        borderRight: '1px solid rgba(128, 10, 63, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 90,
        transition: 'transform 0.3s ease',
        transform: 'translateX(0px)',
      }} className="desktop-sidebar">
        {/* Brand/Header */}
        <div style={{
          padding: '2rem 1.5rem',
          borderBottom: '1px solid rgba(128, 10, 63, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--primary-burgundy)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            Saaथी <span style={{ animation: 'heartbeat 1.5s infinite', display: 'inline-block' }}><Heart size={20} fill="var(--primary-burgundy)" /></span>
          </span>
          <span style={{
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            backgroundColor: 'var(--secondary-gold-light)',
            color: 'var(--secondary-gold)',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            fontWeight: 700
          }}>
            Admin
          </span>
        </div>

        {/* Menu Items */}
        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.path);
                  setIsMobileOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  width: '100%',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: isActive ? 'rgba(128, 10, 63, 0.04)' : 'transparent',
                  color: isActive ? 'var(--primary-burgundy)' : 'var(--text-medium)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: '25%',
                    bottom: '25%',
                    width: '4px',
                    backgroundColor: 'var(--primary-burgundy)',
                    borderRadius: '0 4px 4px 0'
                  }}></span>
                )}
                <span style={{ color: isActive ? 'var(--primary-burgundy)' : 'var(--text-light)' }}>
                  {item.icon}
                </span>
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Admin profile & logout */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid rgba(128, 10, 63, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-burgundy)',
              color: 'var(--white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.95rem'
            }}>
              {adminUser ? getInitials(adminUser.first_name, adminUser.last_name) : 'AD'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {adminUser ? `${adminUser.first_name} ${adminUser.last_name}` : 'Administrator'}
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'capitalize' }}>
                System Admin
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.75rem',
              borderRadius: '10px',
              border: '1px solid rgba(128, 10, 63, 0.1)',
              backgroundColor: 'var(--bg-cream)',
              color: 'var(--accent-pink-text)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all 0.2s ease'
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Menu Toggle Button */}
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 100,
          backgroundColor: 'var(--primary-burgundy)',
          color: 'var(--white)',
          border: 'none',
          width: '45px',
          height: '45px',
          borderRadius: '50%',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--button-shadow)'
        }}
        className="mobile-toggle-btn"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar overlay drawer for Mobile */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(43, 29, 36, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 85
          }}
        />
      )}

      {/* Mobile Drawer Menu style overrides */}
      {isMobileOpen && (
        <aside style={{
          width: '280px',
          backgroundColor: 'var(--white)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 90,
          boxShadow: '0 0 30px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Logo */}
          <div style={{
            padding: '2rem 1.5rem',
            borderBottom: '1px solid rgba(128, 10, 63, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--primary-burgundy)' }}>
              Saaथी
            </span>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    width: '100%',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: isActive ? 'rgba(128, 10, 63, 0.04)' : 'transparent',
                    color: isActive ? 'var(--primary-burgundy)' : 'var(--text-medium)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ color: isActive ? 'var(--primary-burgundy)' : 'var(--text-light)' }}>
                    {item.icon}
                  </span>
                  {item.name}
                </button>
              );
            })}
          </nav>

          {/* Footer inside mobile sidebar */}
          <div style={{
            padding: '1.5rem',
            borderTop: '1px solid rgba(128, 10, 63, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                border: '1px solid rgba(128, 10, 63, 0.1)',
                backgroundColor: 'var(--bg-cream)',
                color: 'var(--accent-pink-text)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </aside>
      )}

      {/* Main content wrapper */}
      <div style={{
        flex: 1,
        marginLeft: '280px',
        padding: '3rem',
        minHeight: '100vh',
        boxSizing: 'border-box',
        transition: 'margin 0.3s ease',
      }} className="admin-main-wrapper">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </div>

      {/* Responsive styling hook */}
      <style>{`
        @media (max-width: 992px) {
          .desktop-sidebar {
            transform: translateX(-280px) !important;
            display: none !important;
          }
          .admin-main-wrapper {
            margin-left: 0 !important;
            padding: 2rem 1.5rem !important;
          }
          .mobile-toggle-btn {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};
