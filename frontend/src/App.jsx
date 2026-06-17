import React, { useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import SplashScreen from './components/common/SplashScreen';
import Footer from './components/common/Footer';

function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RoleRoute({ children, allowedRoles }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppContent() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-textPrimary flex flex-col">
      {!isAuthPage && <Navbar />}
      <main className="flex-grow flex flex-col">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Candidate-specific and Shared paths */}
          {['/jobs', '/saved-jobs', '/applications', '/resumes', '/notifications', '/profile', '/tracking', '/upload', '/dashboard'].map(path => (
            <Route 
              key={path}
              path={path}
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['candidate', 'recruiter', 'admin']}>
                    <Dashboard />
                  </RoleRoute>
                </ProtectedRoute>
              } 
            />
          ))}

          {/* Recruiter-specific paths */}
          {['/jobs/create', '/selected', '/rejected', '/interviews', '/analytics', '/settings'].map(path => (
            <Route 
              key={path}
              path={path}
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['recruiter', 'admin']}>
                    <Dashboard />
                  </RoleRoute>
                </ProtectedRoute>
              } 
            />
          ))}

          {/* Admin-specific paths */}
          {['/users', '/recruiters', '/candidates', '/jobs-monitoring', '/admin-analytics', '/system-config', '/ai-config', '/logs'].map(path => (
            <Route 
              key={path}
              path={path}
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['admin']}>
                    <Dashboard />
                  </RoleRoute>
                </ProtectedRoute>
              } 
            />
          ))}

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('hasSeenSplash');
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
