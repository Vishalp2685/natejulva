import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

export interface AdminUser {
  id: number;
  mobile_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email?: string;
  role: string;
}

interface AdminAuthContextType {
  adminToken: string | null;
  adminUser: AdminUser | null;
  loginAdmin: (token: string, user: AdminUser) => void;
  logoutAdmin: () => void;
  isAdminAuthenticated: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('admin_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Additional safety check for role
        if (parsed.role === 'admin') {
          setAdminUser(parsed);
        } else {
          // Log out if they are not an admin
          logoutAdmin();
        }
      } catch (e) {
        localStorage.removeItem('admin_user');
      }
    }
  }, []);

  const loginAdmin = (newToken: string, newUser: AdminUser) => {
    localStorage.setItem('admin_token', newToken);
    localStorage.setItem('admin_user', JSON.stringify(newUser));
    setAdminToken(newToken);
    setAdminUser(newUser);
  };

  const logoutAdmin = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdminToken(null);
    setAdminUser(null);
  }, []);

  useEffect(() => {
    const handleAdminUnauthorized = () => {
      logoutAdmin();
    };

    window.addEventListener('admin:unauthorized', handleAdminUnauthorized);
    return () => window.removeEventListener('admin:unauthorized', handleAdminUnauthorized);
  }, [logoutAdmin]);

  return (
    <AdminAuthContext.Provider 
      value={{ 
        adminToken, 
        adminUser, 
        loginAdmin, 
        logoutAdmin, 
        isAdminAuthenticated: !!adminToken 
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
