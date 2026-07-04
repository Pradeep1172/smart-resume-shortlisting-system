import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  Bell, LogOut, Briefcase, FileText, Users, Menu, X, Check, Eye, Plus, Search,
  User, Settings, BarChart3, Upload, ChevronDown, ExternalLink
} from 'lucide-react';
import API from '../../services/api';
import Logo from './Logo';

export default function Navbar() {
  const { user, logout, notifications, unreadCount, markAsRead, markAllRead } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero-section');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const notifRef = useRef(null);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('');
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, { threshold: 0.35, rootMargin: "-10% 0px -40% 0px" });

    const sections = ['hero-section', 'jobs-section', 'recruiters-section', 'candidate-features-section', 'faq-section', 'contact-section'];
    
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      sections.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.unobserve(el);
      });
    };
  }, [location.pathname]);

  useEffect(() => {
    setLogoError(false);
  }, [user]);

  useEffect(() => {
    // Click outside to close notifications dropdown
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) markAsRead(notif.id);
    setNotifOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  // Build profile photo URL for candidates
  const getProfilePhotoUrl = () => {
    if (!user || user.role !== 'candidate') return null;
    const apiBase = API.defaults.baseURL || 'http://localhost:5000/api';
    const hostBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
    return `${hostBase}/api/profile/photo/${user.id}?t=${encodeURIComponent(user.profile_updated_at || user.last_login_at || '')}`;
  };

  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        if (sectionId === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      if (sectionId === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const getNavLinkClass = (sectionId) => {
    const baseClass = "text-sm font-extrabold transition-all duration-300 px-4 py-2 rounded-full cursor-pointer";
    return activeSection === sectionId
      ? `${baseClass} bg-brand-primary/10 text-brand-primary`
      : `${baseClass} text-slate-600 hover:text-brand-primary hover:bg-slate-50`;
  };

  return (
    <nav className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      scrolled 
        ? 'bg-white/80 backdrop-blur-xl shadow-lg shadow-slate-100/80 border-b border-slate-200/50' 
        : 'bg-white border-b border-brand-border/40'
    }`}>
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
          </div>

          {/* Desktop Navigation Links */}
          {user ? (
            <div className="hidden md:flex items-center space-x-1">
              {/* Only render recruiter/admin specific top navigation links here if any, candidate links removed as they are in the sidebar */}
            </div>
          ) : (
            <div className="hidden lg:flex items-center space-x-8 mx-auto">
              <button onClick={(e) => handleNavClick(e, 'hero-section')} className={getNavLinkClass('hero-section')}>Home</button>
              <button onClick={(e) => handleNavClick(e, 'jobs-section')} className={getNavLinkClass('jobs-section')}>Find Jobs</button>
              <button onClick={(e) => handleNavClick(e, 'recruiters-section')} className={getNavLinkClass('recruiters-section')}>Post a Job</button>
              <button onClick={(e) => handleNavClick(e, 'candidate-features-section')} className={getNavLinkClass('candidate-features-section')}>Features</button>
              <button onClick={(e) => handleNavClick(e, 'faq-section')} className={getNavLinkClass('faq-section')}>About</button>
              <button onClick={(e) => handleNavClick(e, 'contact-section')} className={getNavLinkClass('contact-section')}>Contact</button>
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
                <div className="hidden md:flex items-center gap-3.5 pl-3 border-l border-brand-border/60">
                  {user.role === 'recruiter' ? (
                    <div className="relative" ref={profileDropdownRef}>
                      <button
                        onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                        className="flex items-center gap-2.5 px-1 py-1 rounded-xl hover:bg-slate-50 transition-all duration-200 select-none"
                      >
                        {user.company_logo_path && !logoError ? (
                          <img
                            src={(() => {
                              const apiBase = API.defaults.baseURL || 'http://localhost:5000/api';
                              const hostBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
                              return `${hostBase}/api/recruiter/logo/${user.id}?t=${encodeURIComponent(user.company_logo_path)}`;
                            })()}
                            alt="Company Logo"
                            className="w-9 h-9 rounded-xl object-contain border border-slate-200/80 bg-slate-50 p-0.5 shrink-0 shadow-sm"
                            onError={() => setLogoError(true)}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-sm shrink-0 shadow-sm">
                            {(user.company || user.name || 'C')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="text-left hidden lg:block">
                          <div className="text-sm font-bold text-slate-800 tracking-tight leading-tight max-w-[120px] truncate" title={user.company || user.name}>
                            {user.company || user.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none mt-0.5">
                            {user.name}
                          </div>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-brand-textSecondary transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {profileDropdownOpen && (
                        <div 
                          className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-brand-border/80 shadow-xl z-50 overflow-hidden"
                          style={{ animation: 'fadeInDown 0.18s ease-out' }}
                        >
                          {/* Profile Card Header */}
                          <div className="px-5 py-4 bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-secondary/5 border-b border-brand-border/40">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white flex items-center justify-center shrink-0 p-0.5">
                                {user.company_logo_path && !logoError ? (
                                  <img
                                    src={(() => {
                                      const apiBase = API.defaults.baseURL || 'http://localhost:5000/api';
                                      const hostBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
                                      return `${hostBase}/api/recruiter/logo/${user.id}?t=${encodeURIComponent(user.company_logo_path)}`;
                                    })()}
                                    alt="Logo"
                                    className="w-full h-full object-contain"
                                    onError={() => setLogoError(true)}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-brand-primary/15 to-brand-secondary/20 flex items-center justify-center text-brand-primary font-bold text-base rounded-lg">
                                    {(user.company || user.name || 'C')[0].toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-brand-textPrimary truncate" title={user.company || user.name}>{user.company || user.name}</div>
                                <div className="text-[10px] text-brand-textSecondary font-medium truncate">{user.email}</div>
                              </div>
                            </div>
                            <Link
                              to="/settings"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="mt-3 flex items-center justify-center gap-1.5 w-full text-[11px] font-semibold text-brand-primary hover:text-brand-secondary bg-white/80 border border-brand-primary/15 hover:border-brand-primary/30 px-3 py-1.5 rounded-lg transition-all"
                            >
                              View Profile <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>

                          {/* Menu Items */}
                          <div className="py-1.5">
                            {[
                              { icon: User, label: 'My Profile', path: '/settings' },
                              { icon: Settings, label: 'Account Settings', path: '/settings' },
                            ].map((item, idx) => (
                              <Link
                                key={idx}
                                to={item.path}
                                onClick={() => setProfileDropdownOpen(false)}
                                className={`flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium transition-colors hover:bg-slate-50 ${
                                  isActive(item.path) ? 'text-brand-primary bg-brand-primary/5' : 'text-brand-textSecondary hover:text-brand-textPrimary'
                                }`}
                              >
                                <item.icon className="w-4 h-4 shrink-0" />
                                <span className="flex-1">{item.label}</span>
                              </Link>
                            ))}
                          </div>

                          {/* Logout */}
                          <div className="border-t border-brand-border/40 py-1.5">
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                handleLogout();
                              }}
                              className="flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-brand-danger hover:bg-brand-danger/5 w-full transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
                              <span>Logout</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : user.role === 'candidate' ? (
                    /* ── Candidate Profile Dropdown ── */
                    <div className="relative" ref={profileDropdownRef}>
                      <button
                        onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                        className="flex items-center gap-2.5 px-1 py-1 rounded-xl hover:bg-slate-50 transition-all duration-200 select-none"
                      >
                        {/* Profile Photo or Initials */}
                        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-brand-border/60 bg-brand-bg flex items-center justify-center shrink-0 shadow-sm">
                          {user.has_photo ? (
                            <img
                              src={getProfilePhotoUrl()}
                              alt="Profile"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          {!user.has_photo && (
                            <div className="w-full h-full bg-gradient-to-br from-brand-primary/15 to-brand-secondary/20 flex items-center justify-center text-brand-primary font-bold text-sm">
                              {(user.name || 'C')[0].toUpperCase()}
                            </div>
                          )}
                          {user.has_photo && (
                            <div style={{ display: 'none' }} className="w-full h-full bg-gradient-to-br from-brand-primary/15 to-brand-secondary/20 flex items-center justify-center text-brand-primary font-bold text-sm">
                              {(user.name || 'C')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="text-left hidden lg:block">
                          <div className="text-sm font-semibold text-brand-textPrimary leading-tight max-w-[120px] truncate">{user.name}</div>
                          <div className="text-[10px] text-brand-primary font-bold uppercase tracking-wider">Candidate</div>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-brand-textSecondary transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {profileDropdownOpen && (
                        <div 
                          className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-brand-border/80 shadow-xl z-50 overflow-hidden"
                          style={{ animation: 'fadeInDown 0.18s ease-out' }}
                        >
                          {/* Profile Card Header */}
                          <div className="px-5 py-4 bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-secondary/5 border-b border-brand-border/40">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-sm bg-brand-bg flex items-center justify-center shrink-0">
                                {user.has_photo ? (
                                  <img
                                    src={getProfilePhotoUrl()}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-brand-primary/15 to-brand-secondary/20 flex items-center justify-center text-brand-primary font-bold text-base">
                                    {(user.name || 'C')[0].toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-brand-textPrimary truncate">{user.name}</div>
                                <div className="text-[10px] text-brand-textSecondary font-medium truncate">{user.email}</div>
                              </div>
                            </div>
                            <Link
                              to="/profile"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="mt-3 flex items-center justify-center gap-1.5 w-full text-[11px] font-semibold text-brand-primary hover:text-brand-secondary bg-white/80 border border-brand-primary/15 hover:border-brand-primary/30 px-3 py-1.5 rounded-lg transition-all"
                            >
                              View Profile <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>

                          {/* Menu Items */}
                          <div className="py-1.5">
                            {[
                              { icon: User, label: 'My Profile', path: '/profile' },
                              { icon: Settings, label: 'Profile Settings', path: '/profile' },
                              { icon: Upload, label: 'Resume Manager', path: '/resumes' },
                              { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
                              { icon: Bell, label: 'Notifications', path: '/notifications', badge: unreadCount > 0 ? unreadCount : null },
                            ].map((item) => (
                              <Link
                                key={item.path + item.label}
                                to={item.path}
                                onClick={() => setProfileDropdownOpen(false)}
                                className={`flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium transition-colors hover:bg-slate-50 ${
                                  isActive(item.path) ? 'text-brand-primary bg-brand-primary/5' : 'text-brand-textSecondary hover:text-brand-textPrimary'
                                }`}
                              >
                                <item.icon className="w-4 h-4 shrink-0" />
                                <span className="flex-1">{item.label}</span>
                                {item.badge && (
                                  <span className="text-[10px] font-bold text-white bg-brand-danger px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                                    {item.badge}
                                  </span>
                                )}
                              </Link>
                            ))}
                          </div>

                          {/* Logout */}
                          <div className="border-t border-brand-border/40 py-1.5">
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                handleLogout();
                              }}
                              className="flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-brand-danger hover:bg-brand-danger/5 w-full transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
                              <span>Logout</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Admin or other roles - simple display */
                    <>
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
                    </>
                  )}
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
                  className="text-sm font-semibold text-brand-textSecondary hover:text-brand-textPrimary px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all duration-300"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 hover:shadow-lg hover:shadow-brand-primary/20 text-white px-4 py-2 rounded-xl shadow-md hover:-translate-y-0.5 transition-all duration-300"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {user && mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-brand-border px-4 pt-2 pb-4 space-y-1">
          {user.role === 'candidate' && (
            <div className="text-xs text-brand-textSecondary px-3 py-1 font-semibold">
              Use sidebar navigation for all actions.
            </div>
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

      {/* Dropdown animation keyframes */}
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </nav>
  );
}
