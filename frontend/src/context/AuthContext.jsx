import React, { createContext, useState, useEffect } from 'react';
import API from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
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
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await API.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
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

  const register = async (name, email, password, role) => {
    setLoading(true);
    try {
      const response = await API.post('/auth/register', { name, email, password, role });
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
