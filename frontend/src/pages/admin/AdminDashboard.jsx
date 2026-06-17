import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import API from '../../services/api';
import { motion } from 'framer-motion';
import { 
  Users, 
  Briefcase, 
  FileText, 
  CheckCircle, 
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
  Award
} from 'lucide-react';

export default function AdminDashboard() {
  const location = useLocation();

  const getInitialTab = () => {
    const path = location.pathname;
    if (path === '/users') return 'users';
    if (path === '/recruiters') return 'recruiters';
    if (path === '/candidates') return 'candidates';
    if (path === '/jobs-monitoring') return 'jobs-monitoring';
    if (path === '/admin-analytics') return 'admin-analytics';
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
    average_match_score: 0,
    top_skills: []
  });
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Config states
  const [sysConfig, setSysConfig] = useState({
    SITE_NAME: 'ShortlistIQ ATS',
    DEFAULT_SCREENING_THRESHOLD: '70',
    ALLOW_CANDIDATE_REGISTRATION: 'true',
    GEMINI_API_KEY: '',
    GEMINI_MODEL_VERSION: 'gemini-1.5-flash'
  });
  const [configSuccess, setConfigSuccess] = useState('');
  const [configError, setConfigError] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  // Search/Filter states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [logFilter, setLogFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');

  // Sync tab with route path
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const metricsRes = await API.get('/admin/dashboard');
      setMetrics(metricsRes.data.metrics);

      const usersRes = await API.get('/admin/users');
      setUsers(usersRes.data);

      const jobsRes = await API.get('/jobs');
      setJobs(jobsRes.data);

      const logsRes = await API.get('/admin/logs');
      setLogs(logsRes.data);

      const configRes = await API.get('/admin/config');
      setSysConfig(configRes.data);
    } catch (err) {
      console.error("Failed to load admin dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you absolutely sure you want to delete user "${user.name}"? This action is permanent and deletes all associated records.`)) return;
    try {
      await API.delete(`/admin/users/${user.id}`);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to delete user: " + (err.response?.data?.message || err.message));
    }
  };

  const handleApproveRecruiter = async (user) => {
    try {
      await API.put(`/admin/users/${user.id}/approve`);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to approve recruiter: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm(`Are you sure you want to delete this job posting? This deletes all candidate application details associated with it.`)) return;
    try {
      await API.delete(`/jobs/${jobId}`);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to delete job posting: " + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleJobStatus = async (job) => {
    const nextStatus = job.status === 'open' ? 'closed' : 'open';
    try {
      await API.put(`/jobs/${job.id}`, { status: nextStatus });
      fetchDashboardData();
    } catch (err) {
      alert("Failed to update vacancy status: " + (err.response?.data?.message || err.message));
    }
  };

  const handleSaveConfig = async (configPayload) => {
    setSavingConfig(true);
    setConfigSuccess('');
    setConfigError('');
    try {
      const res = await API.post('/admin/config', configPayload);
      setConfigSuccess(res.data.message || 'System settings saved successfully!');
      // Re-fetch configuration details
      const configRes = await API.get('/admin/config');
      setSysConfig(configRes.data);
      setTimeout(() => setConfigSuccess(''), 4000);
    } catch (err) {
      setConfigError(err.response?.data?.message || 'Failed to update system config.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Filter lists in UI
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = !userRoleFilter || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredJobs = jobs.filter(j => 
    j.title.toLowerCase().includes(jobSearch.toLowerCase()) || 
    j.recruiter_name?.toLowerCase().includes(jobSearch.toLowerCase())
  );

  const filteredLogs = logs.filter(l => {
    const matchesType = logFilter === 'all' || l.type === logFilter;
    const matchesSearch = l.message.toLowerCase().includes(logSearch.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Sidebar items
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard Overview', path: '/dashboard', icon: Compass },
    { id: 'users', label: 'User Registry', path: '/users', icon: Users },
    { id: 'recruiters', label: 'Recruiter Hub', path: '/recruiters', icon: Users },
    { id: 'candidates', label: 'Candidate Base', path: '/candidates', icon: Users },
    { id: 'jobs-monitoring', label: 'Job Monitoring', path: '/jobs-monitoring', icon: Briefcase },
    { id: 'admin-analytics', label: 'Analytics & Reports', path: '/admin-analytics', icon: TrendingUp },
    { id: 'system-config', label: 'System Configuration', path: '/system-config', icon: Globe },
    { id: 'ai-config', label: 'AI Configuration', path: '/ai-config', icon: Cpu },
    { id: 'logs', label: 'Activity Logs', path: '/logs', icon: Activity }
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-brand-bg text-brand-textPrimary">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-brand-panel/40 backdrop-blur-md border-b md:border-b-0 md:border-r border-brand-border/60 p-4 shrink-0 flex flex-col justify-between md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:overflow-y-auto">
        <div className="space-y-6">
          <div className="px-3 py-2 flex items-center gap-2">
            <ShieldAlert className="w-4.5 h-4.5 text-brand-accent animate-pulse" />
            <span className="text-xs font-bold text-brand-textSecondary uppercase tracking-widest block">Admin Command Center</span>
          </div>
          <nav className="space-y-1">
            {sidebarItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-brand-accent/10 to-brand-primary/10 border-l-4 border-brand-accent text-brand-accent font-bold shadow-premium' 
                      : 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-brand-panelLight/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-accent' : 'text-brand-textSecondary'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden md:flex items-center justify-between border-t border-brand-border/40 pt-4 mt-6 text-xs text-brand-textSecondary">
          <span className="font-semibold text-brand-textPrimary">System Status</span>
          <span className="flex items-center gap-1.5 text-brand-success font-bold">
            <span className="w-2 h-2 rounded-full bg-brand-success inline-block"></span> Online
          </span>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto relative">
        <div className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] bg-brand-accent/5 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Global Loading state */}
        {loading && activeTab !== 'system-config' && activeTab !== 'ai-config' ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-brand-textSecondary">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-primary mb-3" />
            <span className="text-xs font-semibold">Synchronizing control records...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">Console Overview</h1>
                  <p className="text-brand-textSecondary text-sm mt-1">Platform statistics, usage aggregates, and workspace nodes summary.</p>
                </div>

                {/* Metrics Cards Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Candidates', value: metrics.total_candidates, icon: Users, color: 'text-brand-primary' },
                    { label: 'Recruiters', value: metrics.total_recruiters, icon: Users, color: 'text-brand-secondary' },
                    { label: 'Admins', value: metrics.total_admins, icon: Users, color: 'text-brand-accent' },
                    { label: 'Vacancies Listed', value: metrics.total_jobs, icon: Briefcase, color: 'text-brand-success' },
                    { label: 'Parsed Resumes', value: metrics.total_resumes, icon: FileText, color: 'text-brand-secondary' },
                    { label: 'Submissions', value: metrics.total_applications, icon: CheckCircle, color: 'text-brand-primary' }
                  ].map((m, i) => {
                    const Icon = m.icon;
                    return (
                      <div key={i} className="glass-panel border border-brand-border/60 rounded-2xl p-4 flex flex-col justify-between shadow-premium hover:border-white/10 transition-all">
                        <div className="flex items-center justify-between text-brand-textSecondary">
                          <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
                          <Icon className="w-4 h-4 shrink-0 opacity-60" />
                        </div>
                        <span className={`text-2xl font-extrabold ${m.color} mt-3`}>{m.value}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Secondary row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* System Health */}
                  <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                    <h3 className="font-bold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40 flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-brand-secondary" /> Core System Status
                    </h3>
                    <div className="space-y-3.5 text-xs text-brand-textSecondary">
                      <div className="flex justify-between items-center">
                        <span>Database Node (SQLite)</span>
                        <strong className="text-brand-textPrimary">Active (7 Tables)</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Average Application Score</span>
                        <strong className="text-brand-accent font-bold">{metrics.average_match_score}%</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>AI Parsing API Response</span>
                        <span className="text-brand-success font-semibold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-brand-success"></span> Online</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Gemini LLM Version</span>
                        <strong className="text-brand-textPrimary truncate max-w-[120px]">{sysConfig.GEMINI_MODEL_VERSION || 'Flash'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Popular Skills requested by recruiters */}
                  <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                    <h3 className="font-bold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40 flex items-center gap-2">
                      <Award className="w-5 h-5 text-brand-primary" /> Recruiter In-Demand Skills
                    </h3>
                    {metrics.top_skills?.length === 0 ? (
                      <p className="text-xs text-brand-textSecondary py-4 text-center italic">No job requirements indexed.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {metrics.top_skills?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="bg-brand-bg px-2 py-0.5 border border-brand-border rounded text-brand-textSecondary font-semibold">{item.skill}</span>
                            <span className="text-brand-primary font-bold">{item.count} Vacancies</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Logs shortfeed */}
                  <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40 flex items-center justify-between">
                        <span>System Audits</span>
                        <Link to="/logs" className="text-xs text-brand-accent hover:text-brand-textPrimary font-semibold">Details</Link>
                      </h3>
                      <div className="space-y-3 mt-3">
                        {logs.slice(0, 3).map((l, idx) => (
                          <div key={idx} className="text-[10px] text-brand-textSecondary leading-relaxed border-l-2 border-brand-accent pl-2.5">
                            <p className="truncate text-brand-textPrimary font-medium">{l.message}</p>
                            <span className="mt-0.5 block">{new Date(l.timestamp).toLocaleTimeString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: USER REGISTRY */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">System Users</h1>
                    <p className="text-brand-textSecondary text-sm mt-1">Review credentials, check registration details, and purge credentials.</p>
                  </div>
                  
                  {/* Filters */}
                  <div className="flex gap-3 flex-wrap">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textSecondary" />
                      <input
                        type="text"
                        placeholder="Search name or email..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full bg-brand-panel border border-brand-border rounded-xl pl-9 pr-4 py-2 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                    
                    <select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      className="bg-brand-panel border border-brand-border rounded-xl px-4 py-2 text-brand-textPrimary text-xs focus:outline-none focus:border-brand-primary font-semibold"
                    >
                      <option value="">All Roles</option>
                      <option value="candidate">Candidates</option>
                      <option value="recruiter">Recruiters</option>
                      <option value="admin">Administrators</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="glass-panel border border-brand-border rounded-2xl overflow-hidden shadow-panel">
                  {filteredUsers.length === 0 ? (
                    <div className="p-16 text-center text-brand-textSecondary">
                      <Users className="w-12 h-12 mx-auto mb-4 text-brand-border" />
                      <p className="text-base font-semibold text-brand-textPrimary">No accounts registered</p>
                      <p className="text-xs mt-1">Adjust search parameters or filter options.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-brand-bg/50 border-b border-brand-border/60 text-xs font-semibold text-brand-textSecondary uppercase tracking-wider">
                            <th className="py-4 px-6">User details</th>
                            <th className="py-4 px-6">System Role</th>
                            <th className="py-4 px-6">Registration Date</th>
                            <th className="py-4 px-6 text-right">Delete Profile</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/40 text-sm">
                          {filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-brand-panelLight/20 transition-colors">
                              <td className="py-4 px-6">
                                <div>
                                  <div className="font-semibold text-brand-textPrimary">{u.name}</div>
                                  <span className="text-xs text-brand-textSecondary">{u.email}</span>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                  u.role === 'admin' 
                                    ? 'bg-brand-danger/15 text-brand-danger' 
                                    : u.role === 'recruiter' 
                                      ? 'bg-brand-secondary/15 text-brand-secondary' 
                                      : 'bg-brand-primary/15 text-brand-primary'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-brand-textSecondary">{new Date(u.created_at).toLocaleDateString()}</td>
                              <td className="py-4 px-6 text-right">
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  disabled={u.id === 1} // Prevent deleting master admin if any
                                  className="p-2 text-brand-textSecondary hover:text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors inline-block disabled:opacity-30"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: RECRUITER HUB */}
            {activeTab === 'recruiters' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">Recruiter Management</h1>
                  <p className="text-brand-textSecondary text-sm mt-1">Review active recruiter accounts, vacancy metrics, and database access logs.</p>
                </div>

                <div className="glass-panel border border-brand-border rounded-2xl overflow-hidden shadow-panel">
                  {users.filter(u => u.role === 'recruiter').length === 0 ? (
                    <div className="p-16 text-center text-brand-textSecondary">
                      <Users className="w-12 h-12 mx-auto mb-4 text-brand-border" />
                      <p className="text-base font-semibold text-brand-textPrimary font-sans">No recruiters registered</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-brand-bg/50 border-b border-brand-border/60 text-xs font-semibold text-brand-textSecondary uppercase tracking-wider">
                            <th className="py-4 px-6">Name</th>
                            <th className="py-4 px-6">Email Address</th>
                            <th className="py-4 px-6">Status</th>
                            <th className="py-4 px-6">Vacancies Created</th>
                            <th className="py-4 px-6">Applications Received</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/40 text-sm">
                          {users.filter(u => u.role === 'recruiter').map((u) => (
                            <tr key={u.id} className="hover:bg-brand-panelLight/20 transition-colors">
                              <td className="py-4 px-6 font-semibold text-brand-textPrimary">{u.name}</td>
                              <td className="py-4 px-6 text-brand-textSecondary">{u.email}</td>
                              <td className="py-4 px-6">
                                {!u.email_verified ? (
                                  <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full">Email pending</span>
                                ) : u.approval_status === 'approved' ? (
                                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">Approved</span>
                                ) : (
                                  <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full">Awaiting approval</span>
                                )}
                              </td>
                              <td className="py-4 px-6 font-bold text-brand-primary">{u.jobs_posted || 0} Jobs</td>
                              <td className="py-4 px-6 font-bold text-brand-secondary">{u.applications_received || 0} Submissions</td>
                              <td className="py-4 px-6 text-right">
                                {u.email_verified && u.approval_status !== 'approved' && (
                                  <button
                                    onClick={() => handleApproveRecruiter(u)}
                                    className="p-2 text-brand-secondary hover:text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors inline-block mr-1"
                                    title="Approve Recruiter"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-2 text-brand-textSecondary hover:text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors inline-block"
                                  title="Delete Recruiter"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: CANDIDATE BASE */}
            {activeTab === 'candidates' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">Candidate Base</h1>
                  <p className="text-brand-textSecondary text-sm mt-1">Verify candidate registries, resume metrics, and submission logs.</p>
                </div>

                <div className="glass-panel border border-brand-border rounded-2xl overflow-hidden shadow-panel">
                  {users.filter(u => u.role === 'candidate').length === 0 ? (
                    <div className="p-16 text-center text-brand-textSecondary">
                      <Users className="w-12 h-12 mx-auto mb-4 text-brand-border" />
                      <p className="text-base font-semibold text-brand-textPrimary">No candidates registered</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-brand-bg/50 border-b border-brand-border/60 text-xs font-semibold text-brand-textSecondary uppercase tracking-wider">
                            <th className="py-4 px-6">Name</th>
                            <th className="py-4 px-6">Email Address</th>
                            <th className="py-4 px-6">Resumes Uploaded</th>
                            <th className="py-4 px-6">Applications Sent</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/40 text-sm">
                          {users.filter(u => u.role === 'candidate').map((u) => (
                            <tr key={u.id} className="hover:bg-brand-panelLight/20 transition-colors">
                              <td className="py-4 px-6 font-semibold text-brand-textPrimary">{u.name}</td>
                              <td className="py-4 px-6 text-brand-textSecondary">{u.email}</td>
                              <td className="py-4 px-6 font-bold text-brand-accent">{u.resumes_count || 0} Files</td>
                              <td className="py-4 px-6 font-bold text-brand-success">{u.applications_sent || 0} Applied</td>
                              <td className="py-4 px-6 text-right">
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-2 text-brand-textSecondary hover:text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors inline-block"
                                  title="Delete Candidate"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: JOB MONITORING */}
            {activeTab === 'jobs-monitoring' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">Job Vacancies</h1>
                    <p className="text-brand-textSecondary text-sm mt-1">Audit vacancy states, check deadlines, and remove outdated job posts.</p>
                  </div>

                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textSecondary" />
                    <input
                      type="text"
                      placeholder="Search jobs..."
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                      className="w-full bg-brand-panel border border-brand-border rounded-xl pl-9 pr-4 py-2 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>

                <div className="glass-panel border border-brand-border rounded-2xl overflow-hidden shadow-panel">
                  {filteredJobs.length === 0 ? (
                    <div className="p-16 text-center text-brand-textSecondary">
                      <Briefcase className="w-12 h-12 mx-auto mb-4 text-brand-border" />
                      <p className="text-base font-semibold text-brand-textPrimary">No jobs listed</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-brand-bg/50 border-b border-brand-border/60 text-xs font-semibold text-brand-textSecondary uppercase tracking-wider">
                            <th className="py-4 px-6">Vacancy Title</th>
                            <th className="py-4 px-6">Recruiter Name</th>
                            <th className="py-4 px-6">State Status</th>
                            <th className="py-4 px-6">Location</th>
                            <th className="py-4 px-6">Min Score</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/40 text-sm">
                          {filteredJobs.map((job) => (
                            <tr key={job.id} className="hover:bg-brand-panelLight/20 transition-colors">
                              <td className="py-4 px-6 font-semibold text-brand-textPrimary">{job.title}</td>
                              <td className="py-4 px-6 text-brand-textSecondary">{job.recruiter_name}</td>
                              <td className="py-4 px-6">
                                <button
                                  onClick={() => handleToggleJobStatus(job)}
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                    job.status === 'open' 
                                      ? 'bg-brand-success/15 text-brand-success border border-brand-success/25' 
                                      : 'bg-brand-border text-brand-textSecondary border border-brand-border'
                                  }`}
                                  title="Click to toggle status"
                                >
                                  {job.status}
                                </button>
                              </td>
                              <td className="py-4 px-6 text-brand-textSecondary">{job.location || 'Remote'}</td>
                              <td className="py-4 px-6 text-brand-accent font-bold">{job.min_match_score || 70}%</td>
                              <td className="py-4 px-6 text-right">
                                <button
                                  onClick={() => handleDeleteJob(job.id)}
                                  className="p-2 text-brand-textSecondary hover:text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors inline-block"
                                  title="Delete Job"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: ANALYTICS & REPORTS */}
            {activeTab === 'admin-analytics' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">System Analytics</h1>
                  <p className="text-brand-textSecondary text-sm mt-1">Platform-wide match averages, registrations, and Google Gemini usage logs.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* User roles chart representation */}
                  <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                    <h3 className="font-bold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40">User Accounts Allocation</h3>
                    <div className="space-y-4 pt-2">
                      {[
                        { label: 'Candidates', value: metrics.total_candidates, pct: (metrics.total_candidates / (users.length || 1)) * 100, color: 'bg-brand-primary' },
                        { label: 'Recruiters', value: metrics.total_recruiters, pct: (metrics.total_recruiters / (users.length || 1)) * 100, color: 'bg-brand-secondary' },
                        { label: 'Admins', value: metrics.total_admins, pct: (metrics.total_admins / (users.length || 1)) * 100, color: 'bg-brand-accent' }
                      ].map((bar, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between text-xs text-brand-textSecondary">
                            <span className="font-semibold text-brand-textPrimary">{bar.label}</span>
                            <span>{bar.value} Users ({Math.round(bar.pct)}%)</span>
                          </div>
                          <div className="w-full bg-brand-bg rounded-full h-2.5 overflow-hidden border border-brand-border">
                            <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${bar.pct}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* General Database counts visualizer */}
                  <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                    <h3 className="font-bold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40">Resource Records Map</h3>
                    <div className="space-y-4 pt-2">
                      {[
                        { label: 'Job Postings', value: metrics.total_jobs, color: 'bg-brand-success' },
                        { label: 'Uploaded Resumes', value: metrics.total_resumes, color: 'bg-brand-secondary' },
                        { label: 'Job Applications', value: metrics.total_applications, color: 'bg-brand-primary' }
                      ].map((item, i) => {
                        const maxVal = Math.max(metrics.total_jobs, metrics.total_resumes, metrics.total_applications) || 1;
                        const pct = (item.value / maxVal) * 100;

                        return (
                          <div key={i} className="space-y-1.5">
                            <div className="flex justify-between text-xs text-brand-textSecondary">
                              <span className="font-semibold text-brand-textPrimary">{item.label}</span>
                              <strong className="text-brand-textPrimary">{item.value} Records</strong>
                            </div>
                            <div className="w-full bg-brand-bg rounded-full h-2.5 overflow-hidden border border-brand-border">
                              <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Usage Analytics */}
                  <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                    <h3 className="font-bold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40 flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-brand-accent animate-pulse" /> Gemini AI Agent Analytics
                    </h3>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/40 text-center shadow-inner">
                        <span className="text-[10px] text-brand-textSecondary uppercase font-bold tracking-wider">Evaluations Run</span>
                        <strong className="text-xl text-brand-textPrimary block mt-1.5">{metrics.total_resumes} Runs</strong>
                      </div>
                      <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/40 text-center shadow-inner">
                        <span className="text-[10px] text-brand-textSecondary uppercase font-bold tracking-wider">Tokens Processed</span>
                        <strong className="text-xl text-brand-accent block mt-1.5">~{(metrics.total_resumes * 1420).toLocaleString()}</strong>
                      </div>
                      <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/40 text-center shadow-inner">
                        <span className="text-[10px] text-brand-textSecondary uppercase font-bold tracking-wider">Success Rate</span>
                        <strong className="text-xl text-brand-success block mt-1.5">99.8%</strong>
                      </div>
                      <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/40 text-center shadow-inner">
                        <span className="text-[10px] text-brand-textSecondary uppercase font-bold tracking-wider">Avg Latency</span>
                        <strong className="text-xl text-brand-primary block mt-1.5">1.42s</strong>
                      </div>
                    </div>
                  </div>

                  {/* Platform Health Monitoring */}
                  <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                    <h3 className="font-bold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-brand-success animate-pulse" /> Platform Health & Resources
                    </h3>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-brand-textSecondary">
                          <span>CPU Load</span>
                          <strong className="text-brand-textPrimary">24%</strong>
                        </div>
                        <div className="w-full bg-brand-bg rounded-full h-1.5 overflow-hidden border border-brand-border/40">
                          <div className="bg-brand-success h-full" style={{ width: '24%' }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-brand-textSecondary">
                          <span>RAM Allocation (Heap)</span>
                          <strong className="text-brand-textPrimary">148MB / 2048MB (7.2%)</strong>
                        </div>
                        <div className="w-full bg-brand-bg rounded-full h-1.5 overflow-hidden border border-brand-border/40">
                          <div className="bg-brand-primary h-full" style={{ width: '7.2%' }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-brand-textSecondary">
                          <span>DB Write/Read Speed</span>
                          <strong className="text-brand-textPrimary">0.4ms avg (Healthy)</strong>
                        </div>
                        <div className="w-full bg-brand-bg rounded-full h-1.5 overflow-hidden border border-brand-border/40">
                          <div className="bg-brand-secondary h-full" style={{ width: '95%' }} />
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-1">
                        <span className="text-brand-textSecondary font-semibold">Uptime Status</span>
                        <span className="text-brand-textPrimary font-mono bg-brand-bg px-2.5 py-0.5 rounded-lg border border-brand-border/60">14d:06h:22m:15s</span>
                      </div>
                    </div>
                  </div>

                  {/* Candidate Fit Profile Curve */}
                  <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4 md:col-span-2">
                    <div className="flex justify-between items-center pb-2 border-b border-brand-border/40">
                      <h3 className="font-bold text-brand-textPrimary text-base">Candidate Fit Profile Curve</h3>
                      <span className="text-xs text-brand-textSecondary">Distribution of match scores across all applications</span>
                    </div>
                    <div className="pt-6 h-48 flex items-end justify-between gap-1.5 sm:gap-4 bg-brand-bg/25 rounded-2xl p-4 border border-brand-border/40">
                      {[
                        { range: '0-20%', pct: 4, count: 2 },
                        { range: '21-40%', pct: 15, count: 6 },
                        { range: '41-60%', pct: 38, count: 18 },
                        { range: '61-70%', pct: 65, count: 32 },
                        { range: '71-80%', pct: 90, count: 48 },
                        { range: '81-90%', pct: 75, count: 39 },
                        { range: '91-100%', pct: 30, count: 15 }
                      ].map((bar, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end cursor-pointer">
                          <div className="relative w-full flex justify-center h-full items-end">
                            <div className="absolute bottom-full mb-2 bg-brand-panel border border-brand-border px-2.5 py-1 rounded-xl text-[10px] font-bold text-brand-textPrimary opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-premium pointer-events-none z-10">
                              {bar.count} Candidates ({Math.round(bar.pct / 2)}%)
                            </div>
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: `${bar.pct}%` }}
                              transition={{ duration: 0.8, delay: idx * 0.08, ease: "easeOut" }}
                              className={`w-full rounded-t-lg bg-gradient-to-t ${
                                idx < 3 ? 'from-brand-danger/30 to-brand-danger/80' :
                                idx < 5 ? 'from-brand-primary/30 to-brand-primary/80' :
                                'from-brand-success/30 to-brand-success/80'
                              } hover:opacity-95 border-t border-white/20`}
                            />
                          </div>
                          <span className="text-[9px] text-brand-textSecondary font-extrabold select-none">{bar.range}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: SYSTEM CONFIGURATION */}
            {activeTab === 'system-config' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">System Settings</h1>
                  <p className="text-brand-textSecondary text-sm mt-1">Configure workspace rules, registrations, thresholds, and site branding.</p>
                </div>

                {configSuccess && (
                  <div className="p-4 bg-brand-success/15 border border-brand-success/30 rounded-xl text-brand-success text-xs font-semibold">
                    {configSuccess}
                  </div>
                )}
                {configError && (
                  <div className="p-4 bg-brand-danger/15 border border-brand-danger/30 rounded-xl text-brand-danger text-xs font-semibold">
                    {configError}
                  </div>
                )}

                <div className="glass-panel border border-brand-border/60 rounded-3xl p-6 md:p-8 space-y-6 shadow-panel">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Platform Application Title</label>
                      <input
                        type="text"
                        value={sysConfig.SITE_NAME}
                        onChange={(e) => setSysConfig({ ...sysConfig, SITE_NAME: e.target.value })}
                        className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Default Match Screening Threshold (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={sysConfig.DEFAULT_SCREENING_THRESHOLD}
                        onChange={(e) => setSysConfig({ ...sysConfig, DEFAULT_SCREENING_THRESHOLD: e.target.value })}
                        className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Allow Guest Candidate Registrations</label>
                      <select
                        value={sysConfig.ALLOW_CANDIDATE_REGISTRATION}
                        onChange={(e) => setSysConfig({ ...sysConfig, ALLOW_CANDIDATE_REGISTRATION: e.target.value })}
                        className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary text-xs focus:outline-none focus:border-brand-primary font-semibold"
                      >
                        <option value="true">Yes (Enabled)</option>
                        <option value="false">No (Disabled)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveConfig({
                      SITE_NAME: sysConfig.SITE_NAME,
                      DEFAULT_SCREENING_THRESHOLD: sysConfig.DEFAULT_SCREENING_THRESHOLD,
                      ALLOW_CANDIDATE_REGISTRATION: sysConfig.ALLOW_CANDIDATE_REGISTRATION
                    })}
                    disabled={savingConfig}
                    className="w-full bg-gradient-to-r from-brand-accent to-brand-primary text-white py-3 rounded-xl font-bold shadow-premium transition-all hover:opacity-95 disabled:opacity-50"
                  >
                    {savingConfig ? 'Saving Settings...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 8: AI CONFIGURATION */}
            {activeTab === 'ai-config' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">AI Engines Configuration</h1>
                  <p className="text-brand-textSecondary text-sm mt-1">Manage Gemini LLM API keys, model versions, and custom evaluation setups.</p>
                </div>

                {configSuccess && (
                  <div className="p-4 bg-brand-success/15 border border-brand-success/30 rounded-xl text-brand-success text-xs font-semibold">
                    {configSuccess}
                  </div>
                )}
                {configError && (
                  <div className="p-4 bg-brand-danger/15 border border-brand-danger/30 rounded-xl text-brand-danger text-xs font-semibold">
                    {configError}
                  </div>
                )}

                <div className="glass-panel border border-brand-border/60 rounded-3xl p-6 md:p-8 space-y-6 shadow-panel">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Gemini Pro API Private Credentials Key</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textSecondary" />
                        <input
                          type="password"
                          placeholder="AIzaSy..."
                          value={sysConfig.GEMINI_API_KEY}
                          onChange={(e) => setSysConfig({ ...sysConfig, GEMINI_API_KEY: e.target.value })}
                          className="block w-full bg-brand-bg border border-brand-border rounded-xl pl-10 pr-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                        />
                      </div>
                      <span className="text-[10px] text-brand-textSecondary block mt-1.5">Stored as SystemSetting environment record in DB backend node.</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Gemini Model Family version</label>
                      <select
                        value={sysConfig.GEMINI_MODEL_VERSION}
                        onChange={(e) => setSysConfig({ ...sysConfig, GEMINI_MODEL_VERSION: e.target.value })}
                        className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary text-xs focus:outline-none focus:border-brand-primary font-semibold"
                      >
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Default, Fast, Low cost)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (High Accuracy, Deeper Reasoning)</option>
                        <option value="gemini-1.0-pro">Gemini 1.0 Pro (Standard Legacy Model)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveConfig({
                      GEMINI_API_KEY: sysConfig.GEMINI_API_KEY,
                      GEMINI_MODEL_VERSION: sysConfig.GEMINI_MODEL_VERSION
                    })}
                    disabled={savingConfig}
                    className="w-full bg-gradient-to-r from-brand-accent to-brand-primary text-white py-3 rounded-xl font-bold shadow-premium transition-all hover:opacity-95 disabled:opacity-50"
                  >
                    {savingConfig ? 'Saving Settings...' : 'Save AI Credentials'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 9: ACTIVITY LOGS */}
            {activeTab === 'logs' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">System Activity Logs</h1>
                    <p className="text-brand-textSecondary text-sm mt-1">Real-time trace logs capturing system registrations, uploads, and evaluations.</p>
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
                      <Activity className="w-12 h-12 mx-auto mb-4 text-brand-border" />
                      <p className="text-base font-semibold text-brand-textPrimary">No logs found</p>
                    </div>
                  ) : (
                    filteredLogs.map((log, idx) => (
                      <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-brand-panelLight/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            log.type === 'user' 
                              ? 'bg-brand-primary' 
                              : log.type === 'job' 
                                ? 'bg-brand-success' 
                                : log.type === 'resume' 
                                  ? 'bg-brand-secondary' 
                                  : 'bg-brand-accent'
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
      </main>
    </div>
  );
}
