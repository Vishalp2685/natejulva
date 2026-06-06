import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Heart, User, MessageSquare } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="mobile-bottom-nav mobile-only-flex">
      <div className={`nav-item ${isActive('/home') ? 'active' : ''}`} onClick={() => navigate('/home')}>
        <Home size={22} />
        <span>Home</span>
      </div>
      <div className={`nav-item ${isActive('/search') ? 'active' : ''}`} onClick={() => navigate('/search')}>
        <Search size={22} />
        <span>Search</span>
      </div>
      <div className={`nav-item ${isActive('/likes') ? 'active' : ''}`} onClick={() => navigate('/likes')}>
        <Heart size={22} />
        <span>Matches</span>
      </div>
      <div className={`nav-item ${isActive('/chats') ? 'active' : ''}`} onClick={() => navigate('/chats')}>
        <MessageSquare size={22} />
        <span>Chats</span>
      </div>
      <div className={`nav-item ${isActive('/profile') ? 'active' : ''}`} onClick={() => navigate('/profile')}>
        <User size={22} />
        <span>Profile</span>
      </div>
    </div>
  );
};
