import React, { createContext, useState, useEffect } from 'react';
import API from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    let token = sessionStorage.getItem('token');
    
    // If opening a new tab, inherit from the last active window's session
    if (!token) {
      token = localStorage.getItem('token');
      if (token) {
        sessionStorage.setItem('token', token);
      }
    }

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const response = await API.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Session validation failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    // Sync session to localStorage on focus so new tabs inherit this window's session
    const handleFocus = () => {
      const currentToken = sessionStorage.getItem('token');
      if (currentToken) {
        localStorage.setItem('token', currentToken);
      } else {
        localStorage.removeItem('token');
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await API.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
      sessionStorage.setItem('token', token);
      localStorage.setItem('token', token);
      sessionStorage.setItem('pendingPostLoginSplash', 'true');
      setUser(userData);
      return { success: true };
    } catch (error) {
      setUser(null);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check credentials.'
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role, companyDetails = null, logoFile = null) => {
    setLoading(true);
    try {
      let response;
      if (role === 'recruiter' && companyDetails) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('role', role);
        formData.append('company_details', JSON.stringify(companyDetails));
        if (logoFile) {
          formData.append('logo', logoFile);
        }
        response = await API.post('/auth/register', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        response = await API.post('/auth/register', { name, email, password, role });
      }
      return {
        success: true,
        needsVerification: response.data.needs_verification,
        email: response.data.email,
        role: response.data.role,
        message: response.data.message,
        otp: response.data.otp,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed.'
      };
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOtp = async (email, otp) => {
    setLoading(true);
    try {
      const response = await API.post('/auth/verify-otp', { email, otp });
      return {
        success: true,
        message: response.data.message,
        role: response.data.role,
        awaitingApproval: response.data.awaiting_approval,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Verification failed.'
      };
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async (email) => {
    try {
      const response = await API.post('/auth/resend-otp', { email });
      return { success: true, message: response.data.message, otp: response.data.otp };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to resend verification code.'
      };
    }
  };

  const [notifications, setNotifications] = useState([]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await API.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [user]);

  const logout = () => {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    sessionStorage.removeItem('pendingPostLoginSplash');
    setUser(null);
    setNotifications([]);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyEmailOtp, resendOtp, logout, checkAuth, notifications, unreadCount, fetchNotifications, markAsRead, markAllRead }}>
      {children}
    </AuthContext.Provider>
  );
};
