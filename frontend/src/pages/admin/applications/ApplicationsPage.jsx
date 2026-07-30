import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../../../services/api';
import {
  Search,
  Filter,
  FileText,
  Clock,
  RefreshCw,
  XCircle,
  Briefcase,
  User,
  AlertCircle,
  Eye,
  Mail,
  Calendar,
  Tag,
  X
} from 'lucide-react';

export default function ApplicationsPage({ users = [] }) {
  const location = useLocation();
  const initialFilter = location.state?.filter || 'all';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applications, setApplications] = useState([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [recruiterFilter, setRecruiterFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [jobTitleFilter, setJobTitleFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal states
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [candidateDetails, setCandidateDetails] = useState(null);

  useEffect(() => {
    if (location.state?.filter) {
      setStatusFilter(location.state.filter);
    }
  }, [location.state?.filter]);

  const recruiterCompanyMap = React.useMemo(() => {
    const map = {};
    users.filter(u => u.role === 'recruiter').forEach(r => {
      map[r.name] = r.company_name || r.company || '-';
    });
    return map;
  }, [users]);

  const getCompanyName = (recruiterName) => {
    if (!recruiterName) return '-';
    return recruiterCompanyMap[recruiterName] || '-';
  };

  const getInitials = (name) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleViewDetails = async (app) => {
    const candidateUser = users?.find(u => u.email === app.candidate_email && u.role === 'candidate');
    if (!candidateUser) {
      alert('Detailed profile not found for this candidate.');
      return;
    }
    
    setSelectedCandidate(candidateUser);
    setDetailsLoading(true);
    setCandidateDetails(null);
    try {
      const res = await API.get(`/admin/candidates/${candidateUser.id}/details`);
      setCandidateDetails(res.data);
    } catch (err) {
      console.error('Error fetching candidate details:', err);
      alert('Could not retrieve candidate profile details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch the flat list of applications directly from the admin export endpoint
      const res = await API.get('/admin/export/applications');
      setApplications(res.data || []);
    } catch (err) {
      console.error('Error fetching applications list:', err);
      setError('Unable to load applications list from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Extract unique options for filters
  const recruiters = [...new Set(applications.map(a => a.recruiter_name).filter(Boolean))].sort();
  const companies = [...new Set(applications.map(a => getCompanyName(a.recruiter_name)).filter(c => c && c !== '-'))].sort();
  const jobTitles = [...new Set(applications.map(a => a.job_title).filter(Boolean))].sort();

  // Filter applications
  const filteredApps = applications.filter(app => {
    const matchesSearch = 
      app.candidate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.candidate_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' || 
      app.status?.toLowerCase() === statusFilter.toLowerCase();

    const matchesRecruiter = recruiterFilter === 'all' || app.recruiter_name === recruiterFilter;
    const matchesCompany = companyFilter === 'all' || getCompanyName(app.recruiter_name) === companyFilter;
    const matchesJob = jobTitleFilter === 'all' || app.job_title === jobTitleFilter;

    let matchesScore = true;
    if (scoreFilter !== 'all') {
      if (app.match_score === null || app.match_score === undefined) {
        matchesScore = scoreFilter === 'unevaluated';
      } else {
        if (scoreFilter === '90+') matchesScore = app.match_score >= 90;
        else if (scoreFilter === '80-89') matchesScore = app.match_score >= 80 && app.match_score < 90;
        else if (scoreFilter === 'below-80') matchesScore = app.match_score < 80;
      }
    }

    let matchesDate = true;
    if (dateFrom || dateTo) {
      if (!app.applied_at) {
        matchesDate = false;
      } else {
        const appDate = new Date(app.applied_at);
        appDate.setHours(0,0,0,0);
        
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0,0,0,0);
          if (appDate < from) matchesDate = false;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23,59,59,999);
          if (appDate > to) matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesStatus && matchesRecruiter && matchesCompany && matchesJob && matchesScore && matchesDate;
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'applied': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'pending_evaluation': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'evaluated': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'shortlisted': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'interview': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'selected': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      case 'hired': return 'bg-brand-success/15 text-brand-success border-brand-success/25';
      case 'rejected': return 'bg-brand-danger/15 text-brand-danger border-brand-danger/25';
      default: return 'bg-brand-border text-brand-textSecondary border-brand-border';
    }
  };

  const getScoreColorClass = (score) => {
    if (score === null || score === undefined) return 'bg-brand-border';
    if (score >= 70) return 'bg-brand-success';
    if (score >= 40) return 'bg-brand-warning';
    return 'bg-brand-danger';
  };

  const getScoreTextClass = (score) => {
    if (score === null || score === undefined) return 'text-brand-textSecondary/60';
    if (score >= 70) return 'text-brand-success';
    if (score >= 40) return 'text-brand-warning';
    return 'text-brand-danger';
  };

  let pageTitle = "Applications Tracking";
  let pageDesc = "Browse and monitor candidate resumes submitted for all vacancies in the system.";
  let dateCol = "Applied Date";

  if (statusFilter === 'shortlisted') {
    pageTitle = "Shortlisted Candidates";
    pageDesc = "View candidates who have been successfully shortlisted for vacancies.";
    dateCol = "Shortlisted Date";
  } else if (statusFilter === 'hired') {
    pageTitle = "Hired Candidates";
    pageDesc = "View candidates who have been successfully hired.";
    dateCol = "Hired Date";
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">{pageTitle}</h1>
          <p className="text-brand-textSecondary text-sm mt-1">
            {pageDesc}
          </p>
        </div>

        <button
          onClick={fetchApplications}
          className="p-2 border border-brand-border bg-brand-panelLight text-brand-textPrimary rounded-xl transition-all hover:bg-brand-panelLight/80 flex items-center gap-1.5 text-xs font-semibold"
          title="Refresh Applications"
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Main filter interface */}
      <div className="glass-panel border border-brand-border/60 rounded-3xl p-6 shadow-panel space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
            {/* Search */}
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-textSecondary">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search by candidate, job role or recruiter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-brand-panelLight border border-brand-border/80 focus:border-brand-primary text-brand-textPrimary placeholder:text-brand-textSecondary outline-none transition-colors"
              />
            </div>

            {/* Status dropdown filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider whitespace-nowrap">
                Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 pl-3 pr-8 text-xs rounded-xl bg-brand-panelLight border border-brand-border/80 text-brand-textPrimary focus:border-brand-primary outline-none transition-colors cursor-pointer"
              >
                <option value="all">All Applications</option>
                <option value="applied">Applied</option>
                <option value="pending_evaluation">Pending Evaluation</option>
                <option value="evaluated">Evaluated</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview">Interview</option>
                <option value="selected">Selected</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider self-end md:self-center shrink-0">
            Showing {filteredApps.length} of {applications.length} Applications
          </span>
        </div>
        
        {/* Advanced Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-brand-border/40 mt-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider">Recruiter</label>
            <select
              value={recruiterFilter}
              onChange={(e) => setRecruiterFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-xl bg-brand-panelLight border border-brand-border/80 text-brand-textPrimary focus:border-brand-primary outline-none transition-colors cursor-pointer"
            >
              <option value="all">All Recruiters</option>
              {recruiters.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider">Company</label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-xl bg-brand-panelLight border border-brand-border/80 text-brand-textPrimary focus:border-brand-primary outline-none transition-colors cursor-pointer"
            >
              <option value="all">All Companies</option>
              {companies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider">Job Title</label>
            <select
              value={jobTitleFilter}
              onChange={(e) => setJobTitleFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-xl bg-brand-panelLight border border-brand-border/80 text-brand-textPrimary focus:border-brand-primary outline-none transition-colors cursor-pointer"
            >
              <option value="all">All Jobs</option>
              {jobTitles.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider">AI Score</label>
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-xl bg-brand-panelLight border border-brand-border/80 text-brand-textPrimary focus:border-brand-primary outline-none transition-colors cursor-pointer"
            >
              <option value="all">Any Score</option>
              <option value="90+">90% and above</option>
              <option value="80-89">80% - 89%</option>
              <option value="below-80">Below 80%</option>
              <option value="unevaluated">Unevaluated</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider">Date Range</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl bg-brand-panelLight border border-brand-border/80 text-brand-textPrimary focus:border-brand-primary outline-none transition-colors"
              />
              <span className="text-brand-textSecondary">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl bg-brand-panelLight border border-brand-border/80 text-brand-textPrimary focus:border-brand-primary outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Table representation */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-brand-border/40">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-panelLight/40 border-b border-brand-border/60 text-xs font-semibold text-brand-textSecondary uppercase tracking-wider">
                <th className="py-4 px-6">Candidate Name</th>
                <th className="py-4 px-6">Email</th>
                <th className="py-4 px-6">Job Title</th>
                <th className="py-4 px-6">Company Name</th>
                <th className="py-4 px-6">Recruiter Name</th>
                <th className="py-4 px-6 text-center">AI Match Score</th>
                <th className="py-4 px-6">{dateCol}</th>
                <th className="py-4 px-6 text-center">Current Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-20 text-center text-brand-textSecondary text-xs">
                    <span className="w-8 h-8 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin block mx-auto mb-3"></span>
                    <span>Retrieving systems applications...</span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-brand-textSecondary text-xs">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-brand-danger opacity-50" />
                    <span>{error}</span>
                  </td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-brand-textSecondary text-xs">
                    No applications found matching parameters.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app, idx) => (
                  <tr key={idx} className="hover:bg-brand-panelLight/20 transition-colors">
                    <td className="py-4 px-6 font-bold text-brand-textPrimary truncate max-w-[150px]">
                      {app.candidate_name}
                    </td>
                    <td className="py-4 px-6 text-brand-textSecondary text-xs truncate max-w-[150px]">
                      {app.candidate_email}
                    </td>
                    <td className="py-4 px-6 font-semibold text-brand-textPrimary truncate max-w-[200px]">
                      {app.job_title}
                    </td>
                    <td className="py-4 px-6 text-brand-textSecondary text-xs truncate max-w-[150px]">
                      {getCompanyName(app.recruiter_name)}
                    </td>
                    <td className="py-4 px-6 text-brand-textSecondary text-xs truncate max-w-[150px]">
                      {app.recruiter_name || 'System'}
                    </td>
                    <td className="py-4 px-6">
                      {app.match_score !== null && app.match_score !== undefined ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 bg-brand-panelLight rounded-full overflow-hidden border border-brand-border/30">
                            <div className={`h-full ${getScoreColorClass(app.match_score)}`} style={{ width: `${app.match_score}%` }} />
                          </div>
                          <strong className={`font-bold text-xs ${getScoreTextClass(app.match_score)}`}>
                            {app.match_score}%
                          </strong>
                        </div>
                      ) : (
                        <span className="text-[10px] text-brand-textSecondary/50 italic font-semibold block text-center">
                          Unevaluated
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-brand-textSecondary text-xs">
                      {app.applied_at ? new Date(app.applied_at).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric'}) : 'Unknown'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider shadow-sm ${getStatusColor(app.status)}`}>
                        {app.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleViewDetails(app)}
                        className="p-1.5 text-brand-textSecondary hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors inline-block"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards Representation */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="py-20 text-center text-brand-textSecondary text-xs border border-brand-border/40 rounded-xl">
              <span className="w-8 h-8 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin block mx-auto mb-3"></span>
              <span>Retrieving systems applications...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-brand-textSecondary text-xs border border-brand-border/40 rounded-xl">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-brand-danger opacity-50" />
              <span>{error}</span>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="py-12 text-center text-brand-textSecondary text-xs border border-brand-border/40 rounded-xl">
              No applications found matching parameters.
            </div>
          ) : (
            filteredApps.map((app, idx) => (
              <div key={idx} className="bg-white border border-brand-border/60 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-bold text-brand-textPrimary text-sm truncate">{app.candidate_name}</h4>
                    <p className="text-[10px] text-brand-textSecondary truncate mt-0.5">{app.candidate_email}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-md text-[9px] font-bold border uppercase tracking-wider shadow-sm ${getStatusColor(app.status)}`}>
                    {app.status?.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="bg-brand-panelLight/30 border border-brand-border/40 rounded-xl p-3 space-y-2">
                  <div>
                    <span className="block text-[9px] font-bold text-brand-textSecondary uppercase">Job Title</span>
                    <span className="text-xs font-semibold text-brand-textPrimary">{app.job_title}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="block text-[9px] font-bold text-brand-textSecondary uppercase">Company</span>
                      <span className="text-[10px] text-brand-textPrimary">{getCompanyName(app.recruiter_name)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-brand-textSecondary uppercase">Recruiter</span>
                      <span className="text-[10px] text-brand-textPrimary">{app.recruiter_name || 'System'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <div>
                    <span className="block text-[9px] font-bold text-brand-textSecondary uppercase">Match Score</span>
                    {app.match_score !== null && app.match_score !== undefined ? (
                      <strong className={`font-bold text-sm ${getScoreTextClass(app.match_score)}`}>{app.match_score}%</strong>
                    ) : (
                      <span className="text-[10px] italic">Unevaluated</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] font-bold text-brand-textSecondary uppercase">{dateCol}</span>
                    <span className="text-[10px] text-brand-textSecondary font-semibold">
                      {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleViewDetails(app)}
                  className="w-full mt-2 py-2 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" /> View Details
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Candidate Details Modal */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 bg-brand-bg/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel border border-brand-border/60 bg-brand-panel rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <button
                onClick={() => setSelectedCandidate(null)}
                className="absolute top-4 right-4 p-1.5 text-brand-textSecondary hover:text-brand-textPrimary hover:bg-brand-panelLight/40 rounded-xl transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-extrabold text-brand-textPrimary border-b border-brand-border/40 pb-3 flex items-center gap-2 shrink-0">
                <FileText className="w-5 h-5 text-brand-primary" />
                Candidate Full Profile
              </h3>

              <div className="mt-4 overflow-y-auto pr-1 space-y-6 flex-1 scrollbar-thin">
                {detailsLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-brand-textSecondary text-xs">
                    <span className="w-8 h-8 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-3"></span>
                    <span>Retrieving candidate details...</span>
                  </div>
                ) : candidateDetails ? (
                  <>
                    {/* Top Identity Block */}
                    <div className="flex items-center gap-4 bg-brand-panelLight/20 border border-brand-border/30 p-4 rounded-2xl">
                      <div className="w-14 h-14 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-lg font-bold text-brand-primary">
                        {getInitials(candidateDetails.name)}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-extrabold text-brand-textPrimary">{candidateDetails.name}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-textSecondary">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-brand-primary" />
                            {candidateDetails.email}
                          </span>
                          <span className="flex items-center gap-1 font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-brand-secondary" />
                            Joined: {new Date(candidateDetails.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Resume Uploaded History */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-brand-textPrimary flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-secondary" />
                        Uploaded Resumes ({candidateDetails.resumes?.length ?? 0})
                      </h4>
                      {(!candidateDetails.resumes || candidateDetails.resumes.length === 0) ? (
                        <p className="text-xs text-brand-textSecondary italic bg-brand-panelLight/10 border border-brand-border/20 p-4 rounded-xl">
                          No resumes uploaded to this account yet.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {candidateDetails.resumes.map((resume, rIdx) => (
                            <div key={resume.id || rIdx} className="border border-brand-border/40 p-4 rounded-xl bg-brand-panelLight/15 space-y-3">
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-0.5">
                                  <h5 className="font-bold text-brand-textPrimary text-xs truncate max-w-md">
                                    {resume.file_name}
                                  </h5>
                                  <span className="text-[10px] text-brand-textSecondary font-semibold">
                                    Parsed Date: {resume.parsed_at ? new Date(resume.parsed_at).toLocaleDateString() : 'Unknown'}
                                  </span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-secondary/15 text-brand-secondary border border-brand-secondary/20 uppercase whitespace-nowrap">
                                  {resume.experience_years ?? 0} Years Exp
                                </span>
                              </div>

                              {resume.skills && (
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold text-brand-textSecondary uppercase tracking-wider flex items-center gap-1">
                                    <Tag className="w-3 h-3 text-brand-primary" /> Parsed Skills:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(Array.isArray(resume.skills) ? resume.skills : JSON.parse(resume.skills || '[]')).map((skill, sIdx) => (
                                      <span key={sIdx} className="bg-brand-panelLight/80 text-brand-textPrimary border border-brand-border/50 px-2 py-0.5 rounded-md text-[10px] font-medium">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Applications Submitted */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-brand-textPrimary flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-brand-accent" />
                        Application History ({candidateDetails.applications?.length ?? 0})
                      </h4>
                      {(!candidateDetails.applications || candidateDetails.applications.length === 0) ? (
                        <p className="text-xs text-brand-textSecondary italic bg-brand-panelLight/10 border border-brand-border/20 p-4 rounded-xl">
                          Candidate has not submitted any job applications yet.
                        </p>
                      ) : (
                        <>
                          <div className="hidden md:block overflow-x-auto border border-brand-border/40 rounded-xl">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-brand-panelLight/40 border-b border-brand-border/60 font-semibold text-brand-textSecondary uppercase">
                                  <th className="py-3 px-4">Job Title</th>
                                  <th className="py-3 px-4">Company</th>
                                  <th className="py-3 px-4 text-center">Status</th>
                                  <th className="py-3 px-4 text-center">AI Match Score</th>
                                  <th className="py-3 px-4">Applied Date</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-brand-border/40">
                                {candidateDetails.applications.map((app, aIdx) => (
                                  <tr key={app.id || aIdx} className="hover:bg-brand-panelLight/20">
                                    <td className="py-3 px-4 font-semibold text-brand-textPrimary truncate max-w-[150px]">
                                      {app.job_title}
                                    </td>
                                    <td className="py-3 px-4 text-brand-textSecondary truncate max-w-[120px]">
                                      {app.company || '-'}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusColor(app.status)}`}>
                                        {app.status?.replace('_', ' ')}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center font-bold text-xs">
                                      <span className={getScoreColorClass(app.match_score)}>
                                        {app.match_score ? `${app.match_score}%` : 'N/A'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-brand-textSecondary">
                                      {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'Unknown'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="md:hidden space-y-3">
                            {candidateDetails.applications.map((app, aIdx) => (
                              <div key={app.id || aIdx} className="border border-brand-border/40 p-4 rounded-xl bg-brand-panelLight/15 space-y-3">
                                <div>
                                  <h5 className="font-bold text-brand-textPrimary text-xs">{app.job_title}</h5>
                                  <p className="text-brand-textSecondary text-[10px]">{app.company || '-'}</p>
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className={`px-2 py-0.5 rounded-md font-bold border uppercase tracking-wider ${getStatusColor(app.status)}`}>
                                    {app.status?.replace('_', ' ')}
                                  </span>
                                  <span className={`font-bold ${getScoreColorClass(app.match_score)}`}>
                                    Match: {app.match_score ? `${app.match_score}%` : 'N/A'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-brand-textSecondary">
                                  Applied: {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'Unknown'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-brand-textSecondary text-xs">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-brand-danger" />
                    <span>Failed to load details.</span>
                  </div>
                )}
              </div>

              <div className="border-t border-brand-border/40 pt-4 mt-4 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="px-6 py-2 bg-brand-panelLight text-brand-textPrimary border border-brand-border rounded-xl text-xs font-bold hover:bg-brand-panelLight/80 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
