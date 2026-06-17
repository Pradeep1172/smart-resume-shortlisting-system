import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Bell, LogOut, Briefcase, FileText, Users, Menu, X, Check, Eye, Plus, Search } from 'lucide-react';
import API from '../../services/api';
import Logo from './Logo';

export default function Navbar() {
  const { user, logout, notifications, unreadCount, markAsRead, markAllRead } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    // Click outside to close notifications dropdown
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-brand-border/80 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Search */}
          <div className="flex items-center">
            <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2 group">
              <div className="group-hover:scale-105 transition-transform">
                <Logo size="h-8" showText={false} />
              </div>
              <span className="text-xl font-bold tracking-tight text-brand-textPrimary">
                Shortlist<span className="text-brand-primary">IQ</span>
              </span>
            </Link>

            {/* Global Search for Recruiters */}
            {user && user.role === 'recruiter' && (
              <div className="hidden md:flex items-center relative ml-6 w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Global candidate search..."
                  value={new URLSearchParams(location.search).get('search') || ''}
                  onChange={(e) => {
                    navigate(`/dashboard?search=${encodeURIComponent(e.target.value)}`, { replace: true });
                  }}
                  className="w-full bg-slate-50 border border-brand-border/60 focus:border-brand-primary/50 text-brand-textPrimary placeholder-slate-400 text-xs rounded-xl pl-9 pr-3 py-1.5 focus:outline-none transition-all"
                />
              </div>
            )}
          </div>

          {/* Desktop Navigation Links */}
          {user && (
            <div className="hidden md:flex items-center space-x-1">
              {user.role !== 'recruiter' && (
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive('/dashboard') 
                      ? 'text-brand-primary bg-brand-primary/10 shadow-sm' 
                      : 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-slate-100'
                  }`}
                >
                  Dashboard
                </Link>
              )}

              {user.role === 'candidate' && (
                <>
                  <Link
                    to="/jobs"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive('/jobs')
                        ? 'text-brand-primary bg-brand-primary/10'
                        : 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-slate-100'
                    }`}
                  >
                    Browse Jobs
                  </Link>
                  <Link
                    to="/upload"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive('/upload')
                        ? 'text-brand-primary bg-brand-primary/10'
                        : 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-slate-100'
                    }`}
                  >
                    Upload Resume
                  </Link>
                </>
              )}

              {user.role === 'admin' && (
                <>
                  <Link
                    to="/users"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive('/users')
                        ? 'text-brand-primary bg-brand-primary/10'
                        : 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-slate-100'
                    }`}
                  >
                    Manage Users
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Right Action Icons */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Quick Post Job for Recruiters */}
                {user.role === 'recruiter' && (
                  <Link
                    to="/jobs/create"
                    className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-brand-accent to-indigo-600 hover:opacity-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-glow shrink-0 mr-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Post Job
                  </Link>
                )}

                {/* Notifications Bell Dropdown */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="p-1.5 rounded-full text-brand-textSecondary hover:text-brand-textPrimary hover:bg-slate-100 focus:outline-none transition-all duration-200 relative"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-brand-danger rounded-full ring-2 ring-brand-bg">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown panel */}
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-brand-border shadow-lg z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between">
                        <span className="font-semibold text-sm text-brand-textPrimary">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-brand-primary hover:text-brand-secondary font-medium flex items-center gap-1 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-brand-border/40">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-xs text-brand-textSecondary">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-3 text-xs transition-colors hover:bg-slate-50 flex items-start justify-between gap-2 cursor-pointer ${
                                !notif.is_read ? 'bg-brand-primary/5 border-l-2 border-brand-primary' : ''
                              }`}
                            >
                              <p className={`flex-1 ${!notif.is_read ? 'text-brand-textPrimary font-semibold' : 'text-brand-textSecondary'}`}>
                                {notif.message}
                              </p>
                              {!notif.is_read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notif.id);
                                  }}
                                  title="Mark as read"
                                  className="text-brand-primary hover:text-brand-secondary shrink-0 p-1 rounded hover:bg-slate-200"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Widget */}
                <div className="hidden md:flex items-center gap-3 pl-2 border-l border-brand-border/60">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-brand-textPrimary leading-tight">{user.name}</div>
                    <div className="text-xs text-gradient-primary uppercase tracking-wider font-semibold">
                      {user.role}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-full text-brand-textSecondary hover:text-brand-danger hover:bg-brand-danger/10 transition-all duration-200"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-1.5 rounded-lg text-brand-textSecondary hover:text-brand-textPrimary hover:bg-slate-100 focus:outline-none transition-colors"
                >
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-brand-textSecondary hover:text-brand-textPrimary px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 text-white px-4 py-2 rounded-lg shadow-premium transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {user && mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-brand-border px-4 pt-2 pb-4 space-y-1">
          {user.role !== 'recruiter' && (
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-brand-textSecondary hover:text-brand-textPrimary hover:bg-slate-100"
            >
              Dashboard
            </Link>
          )}
          {user.role === 'candidate' && (
            <>
              <Link
                to="/jobs"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-brand-textSecondary hover:text-brand-textPrimary hover:bg-slate-100"
              >
                Browse Jobs
              </Link>
              <Link
                to="/upload"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-brand-textSecondary hover:text-brand-textPrimary hover:bg-slate-100"
              >
                Upload Resume
              </Link>
            </>
          )}
          {user.role === 'admin' && (
            <Link
              to="/users"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-brand-textSecondary hover:text-brand-textPrimary hover:bg-slate-100"
            >
              Manage Users
            </Link>
          )}
          <div className="pt-4 border-t border-brand-border/60 flex items-center justify-between px-3">
            <div>
              <div className="text-base font-semibold text-brand-textPrimary">{user.name}</div>
              <div className="text-xs text-brand-primary uppercase font-bold">{user.role}</div>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="flex items-center gap-2 text-brand-danger hover:bg-brand-danger/10 px-3 py-2 rounded-lg transition-colors text-sm font-semibold"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
