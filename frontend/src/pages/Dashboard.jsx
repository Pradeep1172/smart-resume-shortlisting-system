import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import CandidateDashboard from './candidate/CandidateDashboard';
import RecruiterDashboard from './recruiter/RecruiterDashboard';
import AdminDashboard from './admin/AdminDashboard';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-brand-textPrimary mb-2">Session Expired</h2>
        <p className="text-brand-textSecondary max-w-sm mb-6">Please log in to your account to access the Shortlisting System dashboard.</p>
      </div>
    );
  }

  const renderDashboard = () => {
    if (user.role === 'candidate') {
      return <CandidateDashboard />;
    } else if (user.role === 'recruiter') {
      return <RecruiterDashboard />;
    } else if (user.role === 'admin') {
      return <AdminDashboard />;
    }
    return (
      <div className="p-10 text-center">
        <p className="text-brand-danger font-semibold">Unknown/Invalid system role detected.</p>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {renderDashboard()}
    </motion.div>
  );
}
