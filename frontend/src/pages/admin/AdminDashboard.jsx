import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Briefcase,
  FileText,
  Clock,
  Trash2,
  Search,
  Filter,
  ShieldAlert,
  Settings,
  Sliders,
  Compass,
  Activity,
  Cpu,
  Lock,
  Globe,
  Database,
  RefreshCw,
  TrendingUp,
  Award,
  X,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle
} from 'lucide-react';

import DashboardPage from './dashboard/DashboardPage';
import RecruitersPage from './accounts/RecruitersPage';
import CandidatesPage from './accounts/CandidatesPage';
import JobsPage from './jobs/JobsPage';
import ApplicationsPage from './applications/ApplicationsPage';
import ExportsPage from './exports/ExportsPage';
import SettingsPage from './settings/SettingsPage';
import AdminFooter from '../../components/common/AdminFooter';

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialTab = () => {
    const path = location.pathname;
    if (path === '/users') return 'candidates';
    if (path === '/recruiters') return 'recruiters';
    if (path === '/candidates') return 'candidates';
    if (path.startsWith('/jobs-monitoring')) return 'jobs-monitoring';
    if (path === '/applications') return 'applications';
    if (path === '/exports') return 'exports';
    if (path === '/system-config') return 'system-config';
    if (path === '/ai-config') return 'ai-config';
    if (path === '/logs') return 'logs';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Data states
  const [metrics, setMetrics] = useState({
    total_candidates: 0,
    total_recruiters: 0,
    total_admins: 0,
    total_jobs: 0,
    total_resumes: 0,
    total_applications: 0,
    average_match_score: 0.0,
    pending_approvals: 0,
    active_jobs: 0,
    shortlisted_count: 0,
    hired_count: 0,
    applications_by_status: {}
  });

  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({});
  const [sysConfig, setSysConfig] = useState({
    SITE_NAME: 'Smart Resume ATS',
    DEFAULT_SCREENING_THRESHOLD: 60,
    ALLOW_CANDIDATE_REGISTRATION: 'true',
    GEMINI_API_KEY: '',
    GEMINI_MODEL_VERSION: 'gemini-1.5-flash'
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accountsExpanded, setAccountsExpanded] = useState(() => {
    const tab = getInitialTab();
    return tab === 'candidates' || tab === 'recruiters';
  });
  const [settingsExpanded, setSettingsExpanded] = useState(() => {
    const tab = getInitialTab();
    return tab === 'system-config' || tab === 'ai-config';
  });

  // Log filtering states
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState('all');

  // Config Action States
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(null);
  const [configError, setConfigError] = useState(null);

  // Sync tab with URL path changes
  useEffect(() => {
    const tab = getInitialTab();
    setActiveTab(tab);
    if (tab === 'candidates' || tab === 'recruiters') {
      setAccountsExpanded(true);
    }
    if (tab === 'system-config' || tab === 'ai-config') {
      setSettingsExpanded(true);
    }
  }, [location.pathname]);

  const fetchData = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError(null);
    }
    try {
      const [dbMetrics, dbUsers, dbJobs, dbLogs, dbConfig, dbAnalytics] = await Promise.all([
        API.get('/admin/dashboard'),
        API.get('/admin/users'),
        API.get('/jobs'),
        API.get('/admin/logs'),
        API.get('/admin/config'),
        API.get('/admin/analytics').catch(() => ({ data: {} })) // fallback if analytics endpoint fails
      ]);

      if (dbMetrics.data?.metrics) setMetrics(dbMetrics.data.metrics);
      setUsers(dbUsers.data || []);
      setJobs(dbJobs.data || []);
      setLogs(dbLogs.data || []);
      setSysConfig(dbConfig.data || {});
      setAnalyticsData(dbAnalytics.data || {});
    } catch (err) {
      console.error('Error fetching admin data:', err);
      if (!isBackground) {
        setError('System connection error. Unable to load workspace analytics.');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, [activeTab]);

  // Periodic background polling for admin dashboard data
  useEffect(() => {
    const timer = setInterval(() => {
      fetchData(true);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveConfig = async (configPayload) => {
    setSavingConfig(true);
    setConfigSuccess(null);
    setConfigError(null);
    try {
      const res = await API.post('/admin/config', configPayload);
      setSysConfig(res.data.config || sysConfig);
      setConfigSuccess(res.data.message || 'Configuration saved successfully.');
      setTimeout(() => setConfigSuccess(null), 4000);
      await fetchData();
    } catch (err) {
      console.error('Error saving config:', err);
      setConfigError(err.response?.data?.message || 'Failed to persist configuration.');
      setTimeout(() => setConfigError(null), 5000);
    } finally {
      setSavingConfig(false);
    }
  };

  // Activity logs inline filter logic
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.message?.toLowerCase().includes(logSearch.toLowerCase());
    const matchesFilter = logFilter === 'all' || log.type === logFilter;
    return matchesSearch && matchesFilter;
  });

  // Sidebar navigation options
  const sidebarItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Compass,
      path: '/'
    },
    {
      id: 'accounts-group',
      label: 'Accounts',
      icon: Users,
      isGroup: true,
      expanded: accountsExpanded,
      setExpanded: setAccountsExpanded,
      children: [
        { id: 'candidates', label: 'Candidates', icon: Users, path: '/candidates' },
        { id: 'recruiters', label: 'Recruiters', icon: UserCheck, path: '/recruiters' }
      ]
    },
    {
      id: 'jobs-monitoring',
      label: 'Jobs',
      icon: Briefcase,
      path: '/jobs-monitoring'
    },
    {
      id: 'exports',
      label: 'Export Center',
      icon: Download,
      path: '/exports'
    },
    {
      id: 'settings-group',
      label: 'Settings',
      icon: Settings,
      isGroup: true,
      expanded: settingsExpanded,
      setExpanded: setSettingsExpanded,
      children: [
        { id: 'system-config', label: 'System Config', icon: Globe, path: '/system-config' },
        { id: 'ai-config', label: 'AI Config', icon: Cpu, path: '/ai-config' }
      ]
    },
    {
      id: 'logs',
      label: 'Activity Logs',
      icon: Activity,
      path: '/logs'
    }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-brand-bg flex flex-col text-brand-textPrimary font-sans">
      <div className="flex-grow flex-1 flex">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-64 bg-brand-panel border-r border-brand-border/60 shrink-0 hidden md:flex flex-col justify-between py-6 px-4 sticky top-16 h-[calc(100vh-4rem)]">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="px-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center text-white font-extrabold text-sm shadow-md">
              A
            </div>
            <div>
              <h2 className="font-extrabold text-xs tracking-wider uppercase text-brand-textPrimary">Admin Portal</h2>
              <span className="text-[9px] text-brand-textSecondary font-bold">V1.2 PRODUCTION</span>
            </div>
          </div>

          {/* Navigation Menu Links */}
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              if (item.isGroup) {
                return (
                  <div key={item.id} className="space-y-1">
                    <button
                      onClick={() => item.setExpanded(!item.expanded)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-brand-textSecondary hover:text-brand-textPrimary transition-all rounded-lg"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-brand-textSecondary" />
                        <span>{item.label}</span>
                      </div>
                      {item.expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <AnimatePresence initial={false}>
                      {item.expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden pl-4 space-y-0.5"
                        >
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const isChildActive = activeTab === child.id;
                            return (
                              <Link
                                key={child.id}
                                to={child.path}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                                  isChildActive
                                    ? 'bg-brand-primary/10 text-brand-primary border-l-2 border-brand-primary font-bold'
                                    : 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-brand-panelLight/45'
                                }`}
                              >
                                <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                                <span>{child.label}</span>
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              const isActive = activeTab === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                    isActive
                      ? 'bg-brand-primary/10 text-brand-primary border-l-2 border-brand-primary font-extrabold'
                      : 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-brand-panelLight/45'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* System Status indicator */}
        <div className="bg-brand-panelLight/40 border border-brand-border/60 py-2.5 px-3 rounded-xl space-y-2 mx-2">
          <div className="flex items-center justify-between pb-1 border-b border-brand-border/45">
            <span className="text-sm font-bold uppercase tracking-wider text-brand-textPrimary flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-brand-primary animate-pulse" /> System Status
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-success animate-ping"></span>
          </div>

          <div className="space-y-1.5 text-xs">
            {/* AI Engine */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-brand-textSecondary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-success shrink-0"></span>
                AI Engine
              </span>
              <span className="font-semibold text-brand-textPrimary">Active</span>
            </div>

            {/* Database */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-brand-textSecondary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-success shrink-0"></span>
                Database
              </span>
              <span className="font-semibold text-brand-textPrimary">Connected</span>
            </div>

            {/* Server Status */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-brand-textSecondary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-success shrink-0"></span>
                API Server
              </span>
              <span className="font-semibold text-brand-textPrimary">Online</span>
            </div>

            {/* Last Sync */}
            <div className="flex items-center justify-between pt-1 border-t border-brand-border/30">
              <span className="flex items-center gap-1.5 text-brand-textSecondary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-success shrink-0"></span>
                Last Sync
              </span>
              <span className="font-semibold text-brand-textPrimary">Just Now</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT PORT */}
      <main className="flex-grow flex flex-col justify-between flex-1 min-w-0">
        <div className="p-6 md:p-8 space-y-6 flex-grow">
          {loading ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-brand-textSecondary text-xs">
              <span className="w-10 h-10 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-3"></span>
              <span>Synchronizing workspace databases...</span>
            </div>
          ) : error ? (
            <div className="glass-panel border border-brand-danger/30 bg-brand-danger/5 rounded-3xl p-8 text-center max-w-md mx-auto mt-12 space-y-3">
              <AlertCircle className="w-12 h-12 text-brand-danger mx-auto" />
              <h3 className="text-lg font-bold text-brand-textPrimary">Connection Refused</h3>
              <p className="text-brand-textSecondary text-xs leading-relaxed">{error}</p>
              <button
                onClick={fetchData}
                className="mt-2 bg-brand-primary text-white py-2 px-4 rounded-xl text-xs font-bold shadow-md hover:bg-brand-primary/95 transition-all"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <>
            {/* Tab Rendering Router */}
            {activeTab === 'dashboard' && (
              <DashboardPage
                metrics={metrics}
                users={users}
                jobs={jobs}
                logs={logs}
                sysConfig={sysConfig}
                analyticsData={analyticsData}
                setActiveTab={(tab) => {
                  setActiveTab(tab);
                  // Find path in sidebarItems to navigate properly
                  const found = sidebarItems.find(item => item.id === tab) || 
                                sidebarItems.flatMap(i => i.children || []).find(c => c.id === tab);
                  if (found && found.path) navigate(found.path);
                }}
              />
            )}

            {activeTab === 'recruiters' && (
              <RecruitersPage
                users={users}
                jobs={jobs}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'candidates' && (
              <CandidatesPage
                users={users}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'jobs-monitoring' && (
              <JobsPage
                jobs={jobs}
                users={users}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'applications' && (
              <ApplicationsPage users={users} />
            )}

            {activeTab === 'exports' && (
              <ExportsPage />
            )}

            {(activeTab === 'system-config' || activeTab === 'ai-config') && (
              <SettingsPage
                sysConfig={sysConfig}
                setSysConfig={setSysConfig}
                onSaveConfig={handleSaveConfig}
                savingConfig={savingConfig}
                configSuccess={configSuccess}
                configError={configError}
                activeSection={activeTab === 'system-config' ? 'system' : 'ai'}
              />
            )}

            {activeTab === 'logs' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">System Activity Logs</h1>
                    <p className="text-brand-textSecondary text-sm mt-1">
                      Real-time trace logs capturing system registrations, uploads, and evaluations.
                    </p>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textSecondary" />
                      <input
                        type="text"
                        placeholder="Search logs..."
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                        className="w-full bg-brand-panel border border-brand-border rounded-xl pl-9 pr-4 py-2 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                      />
                    </div>

                    <select
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      className="bg-brand-panel border border-brand-border rounded-xl px-4 py-2 text-brand-textPrimary text-xs focus:outline-none focus:border-brand-primary font-semibold"
                    >
                      <option value="all">All Events</option>
                      <option value="user">User Registrations</option>
                      <option value="job">Vacancies posted</option>
                      <option value="resume">Resume Uploads</option>
                      <option value="application">Submissions</option>
                    </select>
                  </div>
                </div>

                {/* Log list container */}
                <div className="glass-panel border border-brand-border rounded-2xl overflow-hidden divide-y divide-brand-border/40 shadow-panel max-h-[60vh] overflow-y-auto">
                  {filteredLogs.length === 0 ? (
                    <div className="p-16 text-center text-brand-textSecondary">
                      <Activity className="w-12 h-12 mx-auto mb-4 text-brand-border animate-pulse" />
                      <p className="text-base font-semibold text-brand-textPrimary">No logs found</p>
                    </div>
                  ) : (
                    filteredLogs.map((log, idx) => (
                      <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-brand-panelLight/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            log.type === 'user' 
                              ? 'bg-blue-500' 
                              : log.type === 'job' 
                                ? 'bg-emerald-500' 
                                : log.type === 'resume' 
                                  ? 'bg-cyan-500' 
                                  : 'bg-purple-500'
                          }`}></span>
                          <span className="text-xs text-brand-textSecondary leading-relaxed font-sans">{log.message}</span>
                        </div>
                        <span className="text-[10px] text-brand-textSecondary shrink-0 font-medium">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </main>
    </div>
    {!loading && !error && <AdminFooter />}
  </div>
  );
}
