import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { CacheProvider } from './context/CacheContext';
import { DialogProvider } from './context/DialogContext';

import { Landing } from './pages/Landing';
import { Register } from './pages/Register';
import { VerifyOtp } from './pages/VerifyOtp';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { ProfileEdit } from './pages/ProfileEdit';
import { FindMatch } from './pages/FindMatch';
import { LikesMatches } from './pages/LikesMatches';
import { Chats } from './pages/Chats';
import { MobileBottomNav } from './components/MobileBottomNav';

// Admin Pages
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUserManagement } from './pages/AdminUserManagement';
import { AdminProfileVerification } from './pages/AdminProfileVerification';
import { AdminMembershipManagement } from './pages/AdminMembershipManagement';
import { AdminReports } from './pages/AdminReports';

// Protected Route wrapper component for standard users
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/register?tab=login" />;
  
  return (
    <>
      {children}
      <MobileBottomNav />
    </>
  );
};

// Protected Route wrapper component for admin users
const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdminAuthenticated } = useAdminAuth();
  return isAdminAuthenticated ? <>{children}</> : <Navigate to="/admin/login" />;
};

// Scroll to top on route change
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function AppRoutes() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        
        {/* Protected Dashboard, Search, Likes and Profile pages */}
        <Route 
          path="/home" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/search" 
          element={
            <ProtectedRoute>
              <FindMatch />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/likes" 
          element={
            <ProtectedRoute>
              <LikesMatches />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/chats" 
          element={
            <ProtectedRoute>
              <Chats />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile/edit" 
          element={
            <ProtectedRoute>
              <ProfileEdit />
            </ProtectedRoute>
          } 
        />

        {/* Admin Portal Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route 
          path="/admin/dashboard" 
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/admin/users" 
          element={
            <AdminProtectedRoute>
              <AdminUserManagement />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/admin/verification" 
          element={
            <AdminProtectedRoute>
              <AdminProfileVerification />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/admin/memberships" 
          element={
            <AdminProtectedRoute>
              <AdminMembershipManagement />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/admin/reports" 
          element={
            <AdminProtectedRoute>
              <AdminReports />
            </AdminProtectedRoute>
          } 
        />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <CacheProvider>
        <DialogProvider>
          <AdminAuthProvider>
            <AppRoutes />
          </AdminAuthProvider>
        </DialogProvider>
      </CacheProvider>
    </AuthProvider>
  );
}

export default App;
