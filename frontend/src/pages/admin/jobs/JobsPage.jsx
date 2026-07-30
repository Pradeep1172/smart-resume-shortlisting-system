import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../../../services/api';
import {
  Search, Eye, Trash2, Calendar, Briefcase, MapPin,
  FileText, User, Mail, ChevronLeft, Building, Users,
  Tag, AlertCircle, Phone, X, XCircle, ArrowRight, Clock,
  CheckCircle2, Inbox, Filter, ArrowDownUp
} from 'lucide-react';

export default function JobsPage({ jobs = [], users = [], onRefresh, onDeleteJob, onToggleJobStatus }) {
  const navigate = useNavigate();
  const location = useLocation();
  const jobFilter = location.state?.filter || 'all';
  const { id: recruiterIdParam, jobId: jobIdParam } = useParams();

  const isJobApplicants = !!jobIdParam;
  const isRecruiterDetails = !!recruiterIdParam && !isJobApplicants;
  const view = isJobApplicants ? 'job-applicants' : isRecruiterDetails ? 'recruiter-details' : 'recruiters';

  const [searchTerm, setSearchTerm] = useState('');
  
  // Job Actions
  const [actionLoading, setActionLoading] = useState(null);

  // Applications View State
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appSearchTerm, setAppSearchTerm] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('all');
  const [appSortBy, setAppSortBy] = useState('highest_score');
  
  // Candidate Profile Modal State
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [candidateDetails, setCandidateDetails] = useState(null);

  // 1. Group jobs by recruiter
  const groupedData = useMemo(() => {
    const map = {};
    
    // Initialize map with all recruiters from users array
    users?.filter(u => u.role === 'recruiter').forEach(r => {
      map[r.id] = {
        recruiter: r,
        jobs: [],
        totalJobs: 0,
        activeJobs: 0,
        closedJobs: 0,
        totalApplications: 0
      };
    });
    
    // Distribute jobs into the map
    jobs.forEach(job => {
      if (jobFilter === 'active' && job.status !== 'open') return;

      const rId = job.recruiter_id;
      if (rId && map[rId]) {
        map[rId].jobs.push(job);
        map[rId].totalJobs += 1;
        if (job.status === 'open') map[rId].activeJobs += 1;
        else map[rId].closedJobs += 1;
        map[rId].totalApplications += (job.applications_count || 0);
      } else {
        // Fallback for system or external jobs
        const fallbackId = 'system';
        if (!map[fallbackId]) {
          map[fallbackId] = {
            recruiter: {
              id: fallbackId,
              name: 'System / Independent',
              email: '-',
              company: 'Independent',
              created_at: new Date().toISOString(),
              approval_status: 'approved'
            },
            jobs: [],
            totalJobs: 0,
            activeJobs: 0,
            closedJobs: 0,
            totalApplications: 0
          };
        }
        map[fallbackId].jobs.push(job);
        map[fallbackId].totalJobs += 1;
        if (job.status === 'open') map[fallbackId].activeJobs += 1;
        else map[fallbackId].closedJobs += 1;
        map[fallbackId].totalApplications += (job.applications_count || 0);
      }
    });

    // Only return recruiters that have jobs OR are actual recruiters
    return Object.values(map).filter(item => item.totalJobs > 0 || item.recruiter.id !== 'system');
  }, [jobs, users]);

  const selectedRecruiter = useMemo(() => {
    if (!recruiterIdParam) return null;
    return groupedData.find(g => g.recruiter.id.toString() === recruiterIdParam);
  }, [groupedData, recruiterIdParam]);

  const selectedJob = useMemo(() => {
    if (!selectedRecruiter || !jobIdParam) return null;
    return selectedRecruiter.jobs.find(j => j.id.toString() === jobIdParam);
  }, [selectedRecruiter, jobIdParam]);

  useEffect(() => {
    if (view === 'job-applicants' && selectedJob) {
      setLoadingApps(true);
      API.get('/admin/export/applications')
        .then(res => {
          const allApps = res.data || [];
          const filtered = allApps.filter(app => app.job_title === selectedJob.title && (app.recruiter_name === selectedJob.recruiter_name || !app.recruiter_name));
          setApplications(filtered);
        })
        .catch(err => {
          console.error(err);
          alert('Unable to load applicants for this job.');
        })
        .finally(() => {
          setLoadingApps(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedJob?.id]);

  // Handle job status toggles
  const handleToggleStatus = async (job) => {
    if (onToggleJobStatus) {
      await onToggleJobStatus(job);
      return;
    }
    setActionLoading(job.id);
    try {
      const nextStatus = job.status === 'open' ? 'closed' : 'open';
      await API.put(`/jobs/${job.id}`, { status: nextStatus });
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Error toggling job status:', err);
      alert('Failed to change job status.');
    } finally {
      setActionLoading(null);
    }
  };

  // Application Filtering, Sorting and Stats
  const processedApplications = useMemo(() => {
    let result = [...applications];
    
    if (appSearchTerm) {
      const lower = appSearchTerm.toLowerCase();
      result = result.filter(app => 
        app.candidate_name?.toLowerCase().includes(lower) ||
        app.candidate_email?.toLowerCase().includes(lower)
      );
    }
    
    if (appStatusFilter !== 'all') {
      result = result.filter(app => app.status?.toLowerCase() === appStatusFilter.toLowerCase());
    }
    
    result.sort((a, b) => {
      if (appSortBy === 'highest_score') return (b.match_score || 0) - (a.match_score || 0);
      if (appSortBy === 'lowest_score') return (a.match_score || 0) - (b.match_score || 0);
      if (appSortBy === 'latest') return new Date(b.applied_at || 0) - new Date(a.applied_at || 0);
      if (appSortBy === 'oldest') return new Date(a.applied_at || 0) - new Date(b.applied_at || 0);
      if (appSortBy === 'name') return (a.candidate_name || '').localeCompare(b.candidate_name || '');
      return 0;
    });
    
    return result;
  }, [applications, appSearchTerm, appStatusFilter, appSortBy]);

  const appStats = useMemo(() => {
    return {
      total: applications.length,
      shortlisted: applications.filter(a => a.status === 'shortlisted').length,
      interviewed: applications.filter(a => ['interview', 'interview_scheduled'].includes(a.status)).length,
      hired: applications.filter(a => ['hired', 'selected'].includes(a.status)).length,
      rejected: applications.filter(a => a.status === 'rejected').length
    };
  }, [applications]);

  // Views navigation
  const goToRecruitersList = () => {
    navigate('/jobs-monitoring');
    setSearchTerm('');
  };

  const handleViewRecruiterDetails = (data) => {
    navigate(`/jobs-monitoring/recruiters/${data.recruiter.id}`);
    setSearchTerm('');
  };

  const handleViewJobApplicants = async (job) => {
    navigate(`/jobs-monitoring/recruiters/${selectedRecruiter.recruiter.id}/jobs/${job.id}/applicants`);
  };

  const handleViewCandidateProfile = async (app) => {
    // Find the candidate from the users array using email
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

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

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

  // Filtering for recruiter view
  const filteredRecruiters = groupedData.filter(data => 
    data.recruiter.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.recruiter.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Common UI Components
  const Breadcrumbs = ({ items }) => (
    <nav className="flex items-center text-xs font-semibold text-brand-textSecondary mb-6 space-x-1.5 bg-brand-panelLight/40 px-4 py-2 rounded-xl inline-flex border border-brand-border/40">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-brand-textSecondary/40 mx-1">/</span>}
          {item.onClick ? (
            <button onClick={item.onClick} className="hover:text-brand-primary transition-colors flex items-center gap-1">
              {item.label}
            </button>
          ) : (
            <span className="text-brand-textPrimary font-bold flex items-center gap-1">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );

  const pageVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
    transition: { duration: 0.3, ease: 'easeOut' }
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {/* ---------------- VIEW 1: RECRUITERS LIST ---------------- */}
        {view === 'recruiters' && (
          <motion.div key="recruiters" {...pageVariants} className="space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">Jobs Monitoring</h1>
              <p className="text-brand-textSecondary text-sm mt-1">
                Browse corporate vacancy postings grouped by recruiter accounts.
              </p>
            </div>

            <div className="glass-panel border border-brand-border/60 rounded-3xl p-6 shadow-panel space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-textSecondary">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search recruiters or companies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-brand-panelLight border border-brand-border/80 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 text-brand-textPrimary placeholder:text-brand-textSecondary outline-none transition-all"
                  />
                </div>
                <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider self-end sm:self-center px-3 py-1.5 bg-brand-panelLight rounded-lg border border-brand-border">
                  Showing {filteredRecruiters.length} Recruiters
                </span>
              </div>

              <div className="hidden md:block overflow-x-auto rounded-xl border border-brand-border/40">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-brand-panelLight/40 border-b border-brand-border/60 text-xs font-semibold text-brand-textSecondary uppercase tracking-wider">
                      <th className="py-4 px-6">Recruiter Name</th>
                      <th className="py-4 px-6">Company Name</th>
                      <th className="py-4 px-6 text-center">Total Jobs</th>
                      <th className="py-4 px-6 text-center">Active Jobs</th>
                      <th className="py-4 px-6 text-center">Closed Jobs</th>
                      <th className="py-4 px-6 text-center">Total Apps</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/40 text-sm">
                    {filteredRecruiters.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-16 text-center text-brand-textSecondary text-xs">
                          <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
                          No recruiters found matching requirements.
                        </td>
                      </tr>
                    ) : (
                      filteredRecruiters.map((data, idx) => (
                        <tr key={data.recruiter.id || idx} className="hover:bg-brand-panelLight/30 transition-colors group">
                          <td className="py-5 px-6 font-semibold text-brand-textPrimary flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-sm font-bold text-brand-primary shrink-0 group-hover:scale-105 transition-transform">
                              {getInitials(data.recruiter.name)}
                            </div>
                            <span className="truncate max-w-[150px]">{data.recruiter.name}</span>
                          </td>
                          <td className="py-5 px-6 text-brand-textSecondary text-xs font-medium">
                            <div className="flex items-center gap-1.5">
                              <Building className="w-4 h-4 text-brand-secondary/70" />
                              <span className="truncate max-w-[150px]">{data.recruiter.company || 'Independent'}</span>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-center font-bold text-brand-textPrimary text-sm">
                            {data.totalJobs}
                          </td>
                          <td className="py-5 px-6 text-center">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-brand-success/15 text-brand-success border border-brand-success/25">
                              {data.activeJobs}
                            </span>
                          </td>
                          <td className="py-5 px-6 text-center">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-brand-border text-brand-textSecondary border border-brand-border/80">
                              {data.closedJobs}
                            </span>
                          </td>
                          <td className="py-5 px-6 text-center font-bold text-brand-accent text-sm">
                            {data.totalApplications}
                          </td>
                          <td className="py-5 px-6 text-right">
                            <button
                              onClick={() => handleViewRecruiterDetails(data)}
                              className="px-4 py-2 bg-brand-primary text-white hover:bg-brand-primary/90 hover:shadow-md hover:-translate-y-0.5 rounded-xl transition-all inline-flex items-center gap-2 text-xs font-bold"
                            >
                              View Details <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards for Recruiters */}
              <div className="md:hidden space-y-4">
                {filteredRecruiters.length === 0 ? (
                  <div className="py-16 text-center text-brand-textSecondary text-xs border border-brand-border/40 rounded-xl">
                    <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No recruiters found matching requirements.
                  </div>
                ) : (
                  filteredRecruiters.map((data, idx) => (
                    <div key={data.recruiter.id || idx} className="bg-white border border-brand-border/60 rounded-2xl p-4 flex flex-col space-y-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-sm font-bold text-brand-primary shrink-0">
                          {getInitials(data.recruiter.name)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-brand-textPrimary truncate">{data.recruiter.name}</h4>
                          <p className="text-[10px] text-brand-textSecondary truncate flex items-center gap-1">
                            <Building className="w-3 h-3" /> {data.recruiter.company || 'Independent'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs border-y border-brand-border/40 py-3">
                        <div>
                          <span className="block text-brand-textSecondary mb-1 font-semibold">Jobs (Active/Total)</span>
                          <span className="font-bold text-brand-success">{data.activeJobs}</span>
                          <span className="text-brand-border/80 mx-1">/</span>
                          <span className="font-bold text-brand-textPrimary">{data.totalJobs}</span>
                        </div>
                        <div>
                          <span className="block text-brand-textSecondary mb-1 font-semibold">Total Apps</span>
                          <span className="font-bold text-brand-accent">{data.totalApplications}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleViewRecruiterDetails(data)}
                        className="w-full py-2.5 bg-brand-primary text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        View Details <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ---------------- VIEW 2: RECRUITER DETAILS & JOBS ---------------- */}
        {view === 'recruiter-details' && selectedRecruiter && (
          <motion.div key="recruiter-details" {...pageVariants} className="space-y-6">
            <Breadcrumbs 
              items={[
                { label: 'Jobs Monitoring', onClick: goToRecruitersList },
                { label: selectedRecruiter.recruiter.name }
              ]} 
            />

            <div className="flex items-center gap-4">
              <button
                onClick={goToRecruitersList}
                className="p-2 bg-brand-panelLight hover:bg-brand-border rounded-xl text-brand-textSecondary transition-colors hover:text-brand-textPrimary"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">Recruiter Profile</h1>
                <p className="text-brand-textSecondary text-sm mt-1">
                  Comprehensive overview of {selectedRecruiter.recruiter.name}'s account activity.
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-5 flex flex-col justify-center shadow-sm">
                <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider mb-1 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Total Jobs</span>
                <span className="text-2xl font-extrabold text-brand-textPrimary">{selectedRecruiter.totalJobs}</span>
              </div>
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-5 flex flex-col justify-center shadow-sm">
                <span className="text-[10px] font-bold text-brand-success uppercase tracking-wider mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Active Jobs</span>
                <span className="text-2xl font-extrabold text-brand-textPrimary">{selectedRecruiter.activeJobs}</span>
              </div>
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-5 flex flex-col justify-center shadow-sm">
                <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider mb-1 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Closed Jobs</span>
                <span className="text-2xl font-extrabold text-brand-textPrimary">{selectedRecruiter.closedJobs}</span>
              </div>
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-5 flex flex-col justify-center shadow-sm">
                <span className="text-[10px] font-bold text-brand-accent uppercase tracking-wider mb-1 flex items-center gap-1.5"><Inbox className="w-3.5 h-3.5" /> Total Applications</span>
                <span className="text-2xl font-extrabold text-brand-textPrimary">{selectedRecruiter.totalApplications}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Recruiter Information Card */}
              <div className="md:col-span-1 glass-panel border border-brand-border/60 rounded-3xl p-6 shadow-panel space-y-6">
                <div className="flex items-center gap-4 border-b border-brand-border/40 pb-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shrink-0">
                    {getInitials(selectedRecruiter.recruiter.name)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-brand-textPrimary leading-tight">{selectedRecruiter.recruiter.name}</h3>
                    <span className="text-[10px] font-bold text-brand-success uppercase tracking-wider bg-brand-success/10 border border-brand-success/20 px-2.5 py-0.5 rounded-full mt-2 inline-block">
                      {selectedRecruiter.recruiter.approval_status || 'Approved'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-brand-panelLight/30 border border-brand-border/30">
                    <Building className="w-4 h-4 text-brand-secondary shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[10px] font-bold text-brand-textSecondary uppercase tracking-wide">Company</span>
                      <span className="text-sm text-brand-textPrimary font-semibold mt-0.5 block">{selectedRecruiter.recruiter.company || 'Independent'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-brand-panelLight/30 border border-brand-border/30">
                    <Mail className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[10px] font-bold text-brand-textSecondary uppercase tracking-wide">Email</span>
                      <span className="text-sm text-brand-textPrimary font-semibold mt-0.5 block break-all">{selectedRecruiter.recruiter.email}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-brand-panelLight/30 border border-brand-border/30">
                    <Phone className="w-4 h-4 text-brand-textSecondary shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[10px] font-bold text-brand-textSecondary uppercase tracking-wide">Phone</span>
                      <span className="text-sm text-brand-textPrimary font-semibold mt-0.5 block text-brand-textSecondary/50 italic">N/A</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-brand-panelLight/30 border border-brand-border/30">
                    <MapPin className="w-4 h-4 text-brand-textSecondary shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[10px] font-bold text-brand-textSecondary uppercase tracking-wide">Company Location</span>
                      <span className="text-sm text-brand-textPrimary font-semibold mt-0.5 block text-brand-textSecondary/50 italic">N/A</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-brand-panelLight/30 border border-brand-border/30">
                    <Calendar className="w-4 h-4 text-brand-textSecondary shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[10px] font-bold text-brand-textSecondary uppercase tracking-wide">Registration Date</span>
                      <span className="text-sm text-brand-textPrimary font-semibold mt-0.5 block">
                        {selectedRecruiter.recruiter.created_at ? new Date(selectedRecruiter.recruiter.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Jobs Table */}
              <div className="md:col-span-2 glass-panel border border-brand-border/60 rounded-3xl p-6 shadow-panel flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-brand-textPrimary flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-brand-primary" />
                    Posted Jobs Directory
                  </h3>
                  <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider px-3 py-1 bg-brand-panelLight rounded-lg border border-brand-border">
                    {selectedRecruiter.jobs.length} Records
                  </span>
                </div>
                
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-brand-border/50 max-h-[600px] overflow-y-auto flex-1 shadow-inner bg-brand-panelLight/10">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-brand-panel/95 backdrop-blur-md z-10">
                      <tr className="border-b border-brand-border/60 text-[11px] font-bold text-brand-textSecondary uppercase tracking-wider">
                        <th className="py-4 px-6">Job Snapshot</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-center">Apps</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40 text-sm">
                      {selectedRecruiter.jobs.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-20 text-center text-brand-textSecondary text-sm">
                            <Briefcase className="w-10 h-10 mx-auto mb-4 opacity-20" />
                            No jobs have been posted by this recruiter yet.
                          </td>
                        </tr>
                      ) : (
                        selectedRecruiter.jobs.map(job => (
                          <tr key={job.id} className="hover:bg-brand-panelLight/40 transition-colors">
                            <td className="py-5 px-6">
                              <div className="font-bold text-brand-textPrimary text-[15px] truncate max-w-[250px] mb-1">{job.title}</div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-[10px] text-brand-textSecondary font-semibold">
                                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-brand-secondary" /> {job.location || 'Remote'}</span>
                                <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-brand-primary/70" /> Full-Time</span>
                                <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-brand-textSecondary/70" /> Not Disclosed</span>
                                <span className="flex items-center gap-1.5 bg-brand-panelLight px-2 py-0.5 rounded-md border border-brand-border/60"><Clock className="w-3.5 h-3.5 text-brand-warning" /> {job.experience_required} Yrs</span>
                                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(job.created_at).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-center">
                              <button
                                onClick={() => handleToggleStatus(job)}
                                disabled={actionLoading === job.id}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:opacity-85 active:scale-95 border shadow-sm ${
                                  job.status === 'open'
                                    ? 'bg-brand-success/15 text-brand-success border-brand-success/25 hover:bg-brand-success/25'
                                    : 'bg-brand-panelLight text-brand-textSecondary border-brand-border/80 hover:bg-brand-border'
                                }`}
                              >
                                {job.status}
                              </button>
                            </td>
                            <td className="py-5 px-6 text-center">
                              <span className="bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-3 py-1 rounded-full text-xs font-bold inline-block min-w-[32px]">
                                {job.applications_count ?? 0}
                              </span>
                            </td>
                            <td className="py-5 px-6 text-right">
                              <button
                                onClick={() => handleViewJobApplicants(job)}
                                className="px-4 py-2 bg-brand-panelLight text-brand-textPrimary hover:bg-brand-primary hover:text-white border border-brand-border hover:border-brand-primary shadow-sm rounded-xl transition-all inline-flex items-center gap-2 text-[11px] font-bold group"
                              >
                                <Users className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> View Applicants
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards for Recruiter Jobs */}
                <div className="md:hidden space-y-4">
                  {selectedRecruiter.jobs.length === 0 ? (
                    <div className="py-12 text-center text-brand-textSecondary text-sm border border-brand-border/40 rounded-xl">
                      <Briefcase className="w-8 h-8 mx-auto mb-4 opacity-20" />
                      No jobs have been posted yet.
                    </div>
                  ) : (
                    selectedRecruiter.jobs.map(job => (
                      <div key={job.id} className="bg-white border border-brand-border/60 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                        <div>
                          <h4 className="font-bold text-brand-textPrimary text-sm">{job.title}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-brand-textSecondary">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-brand-secondary" /> {job.location || 'Remote'}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-brand-warning" /> {job.experience_required} Yrs</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between border-y border-brand-border/40 py-2">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-brand-textSecondary font-semibold">Status</span>
                            <button
                              onClick={() => handleToggleStatus(job)}
                              disabled={actionLoading === job.id}
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase mt-0.5 ${
                                job.status === 'open'
                                  ? 'bg-brand-success/15 text-brand-success border border-brand-success/25'
                                  : 'bg-brand-panelLight text-brand-textSecondary border border-brand-border/80'
                              }`}
                            >
                              {job.status}
                            </button>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-brand-textSecondary font-semibold">Applicants</span>
                            <span className="font-bold text-brand-primary">{job.applications_count ?? 0}</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleViewJobApplicants(job)}
                          className="w-full py-2 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                        >
                          <Users className="w-4 h-4" /> View Applicants
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ---------------- VIEW 3: JOB APPLICANTS ---------------- */}
        {view === 'job-applicants' && selectedJob && (
          <motion.div key="job-applicants" {...pageVariants} className="space-y-6">
            <Breadcrumbs 
              items={[
                { label: 'Jobs Monitoring', onClick: goToRecruitersList },
                { label: selectedRecruiter?.recruiter.name, onClick: () => navigate(`/jobs-monitoring/recruiters/${selectedRecruiter?.recruiter.id}`) },
                { label: selectedJob.title },
                { label: 'Applicants' }
              ]} 
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(`/jobs-monitoring/recruiters/${selectedRecruiter?.recruiter.id}`)}
                  className="p-2.5 bg-brand-panelLight hover:bg-brand-border rounded-xl text-brand-textSecondary transition-colors hover:text-brand-textPrimary"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">Job Applicants</h1>
                  <p className="text-brand-textSecondary text-sm mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-brand-secondary" /> <strong className="text-brand-textPrimary">{selectedJob.title}</strong></span>
                    <span className="text-brand-border">•</span>
                    <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-brand-primary" /> <strong className="text-brand-textPrimary">{selectedRecruiter?.recruiter.name}</strong></span>
                  </p>
                </div>
              </div>
            </div>

            {/* Applicant Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-4 flex flex-col shadow-sm">
                <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider mb-1">Total Applicants</span>
                <span className="text-2xl font-extrabold text-brand-textPrimary">{appStats.total}</span>
              </div>
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-4 flex flex-col shadow-sm">
                <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider mb-1">Shortlisted</span>
                <span className="text-2xl font-extrabold text-brand-textPrimary">{appStats.shortlisted}</span>
              </div>
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-4 flex flex-col shadow-sm">
                <span className="text-[10px] font-bold text-brand-warning uppercase tracking-wider mb-1">Interviewed</span>
                <span className="text-2xl font-extrabold text-brand-textPrimary">{appStats.interviewed}</span>
              </div>
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-4 flex flex-col shadow-sm">
                <span className="text-[10px] font-bold text-brand-success uppercase tracking-wider mb-1">Hired</span>
                <span className="text-2xl font-extrabold text-brand-textPrimary">{appStats.hired}</span>
              </div>
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-4 flex flex-col shadow-sm">
                <span className="text-[10px] font-bold text-brand-danger uppercase tracking-wider mb-1">Rejected</span>
                <span className="text-2xl font-extrabold text-brand-textPrimary">{appStats.rejected}</span>
              </div>
            </div>

            <div className="glass-panel border border-brand-border/60 rounded-3xl p-6 shadow-panel space-y-4">
              {/* ATS Toolbar */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-textSecondary" />
                  <input
                    type="text"
                    placeholder="Search applicants by name or email..."
                    value={appSearchTerm}
                    onChange={(e) => setAppSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-brand-panelLight border border-brand-border/80 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 text-brand-textPrimary placeholder:text-brand-textSecondary outline-none transition-all"
                  />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative">
                    <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-textSecondary pointer-events-none" />
                    <select
                      value={appStatusFilter}
                      onChange={(e) => setAppStatusFilter(e.target.value)}
                      className="appearance-none pl-9 pr-8 py-2 text-sm font-semibold rounded-xl bg-brand-panelLight border border-brand-border/80 focus:border-brand-primary text-brand-textPrimary outline-none transition-all cursor-pointer min-w-[140px]"
                    >
                      <option value="all">All Statuses</option>
                      <option value="applied">Applied</option>
                      <option value="evaluated">Evaluated</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="interview">Interview</option>
                      <option value="selected">Selected</option>
                      <option value="hired">Hired</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="relative">
                    <ArrowDownUp className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-textSecondary pointer-events-none" />
                    <select
                      value={appSortBy}
                      onChange={(e) => setAppSortBy(e.target.value)}
                      className="appearance-none pl-9 pr-8 py-2 text-sm font-semibold rounded-xl bg-brand-panelLight border border-brand-border/80 focus:border-brand-primary text-brand-textPrimary outline-none transition-all cursor-pointer min-w-[180px]"
                    >
                      <option value="highest_score">Highest Match Score</option>
                      <option value="lowest_score">Lowest Match Score</option>
                      <option value="latest">Latest Applied</option>
                      <option value="oldest">Oldest Applied</option>
                      <option value="name">Candidate Name</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="hidden md:block overflow-x-auto rounded-2xl border border-brand-border/40 shadow-inner bg-brand-panelLight/10 max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-brand-panel/95 backdrop-blur-md">
                    <tr className="border-b border-brand-border/60 text-[11px] font-bold text-brand-textSecondary uppercase tracking-wider">
                      <th className="py-4 px-6">Candidate Details</th>
                      <th className="py-4 px-6 text-center">Current Status</th>
                      <th className="py-4 px-6 text-center">AI Match Score</th>
                      <th className="py-4 px-6">Applied Date</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/40 text-sm">
                    {loadingApps ? (
                      <tr>
                        <td colSpan="5" className="py-24 text-center text-brand-textSecondary text-sm">
                          <span className="w-10 h-10 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-4 mx-auto block"></span>
                          <span className="font-semibold tracking-wide">Retrieving applicants...</span>
                        </td>
                      </tr>
                    ) : processedApplications.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-24 text-center text-brand-textSecondary text-sm">
                          <Inbox className="w-12 h-12 mx-auto mb-4 opacity-20" />
                          <span className="font-semibold block">No applicants match your criteria.</span>
                          <span className="text-xs opacity-70 mt-1 block">Try adjusting your filters or search terms.</span>
                        </td>
                      </tr>
                    ) : (
                      processedApplications.map((app, idx) => (
                        <tr key={idx} className="hover:bg-brand-panelLight/40 transition-colors group">
                          <td className="py-5 px-6">
                            <div className="font-bold text-brand-textPrimary text-[15px] mb-1.5">{app.candidate_name}</div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] text-brand-textSecondary font-semibold flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-brand-primary/70" /> {app.candidate_email}</span>
                              <span className="text-[11px] text-brand-textSecondary font-semibold flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-brand-secondary/70" /> <span className="italic opacity-50">N/A</span></span>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider shadow-sm ${getStatusColor(app.status)}`}>
                              {app.status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-5 px-6">
                            {app.match_score !== null && app.match_score !== undefined ? (
                              <div className="flex items-center justify-center gap-3">
                                <div className="w-20 h-2 bg-brand-panelLight rounded-full overflow-hidden border border-brand-border/40 shadow-inner">
                                  <div className={`h-full ${getScoreColorClass(app.match_score)} transition-all duration-1000 ease-out`} style={{ width: `${app.match_score}%` }} />
                                </div>
                                <strong className={`font-bold text-sm ${getScoreTextClass(app.match_score)}`}>
                                  {app.match_score}%
                               </strong>
                              </div>
                            ) : (
                              <span className="text-[11px] text-brand-textSecondary/50 italic font-semibold block text-center bg-brand-panelLight/50 rounded-md py-1 border border-brand-border/30">
                                Unevaluated
                              </span>
                            )}
                          </td>
                          <td className="py-5 px-6 text-brand-textSecondary text-xs font-semibold">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 opacity-50" />
                              {app.applied_at ? new Date(app.applied_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}
                            </div>
                          </td>
                          <td className="py-5 px-6 text-right">
                            <button
                              onClick={() => handleViewCandidateProfile(app)}
                              className="px-4 py-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all inline-flex items-center gap-2 text-xs font-bold border border-brand-primary/20 hover:border-brand-primary shadow-sm group-hover:shadow-md"
                              title="View Complete Profile"
                            >
                              <Eye className="w-4 h-4" /> View Profile
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards for Job Applicants */}
              <div className="md:hidden space-y-4">
                {loadingApps ? (
                  <div className="py-12 text-center text-brand-textSecondary text-sm border border-brand-border/40 rounded-xl">
                    <span className="w-8 h-8 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-3 mx-auto block"></span>
                    Retrieving applicants...
                  </div>
                ) : processedApplications.length === 0 ? (
                  <div className="py-12 text-center text-brand-textSecondary text-sm border border-brand-border/40 rounded-xl">
                    <Inbox className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No applicants match your criteria.
                  </div>
                ) : (
                  processedApplications.map((app, idx) => (
                    <div key={idx} className="bg-white border border-brand-border/60 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                      <div>
                        <h4 className="font-bold text-brand-textPrimary text-sm">{app.candidate_name}</h4>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-brand-textSecondary">
                          <Mail className="w-3 h-3 text-brand-primary/70" /> {app.candidate_email}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs border-y border-brand-border/40 py-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-brand-textSecondary font-semibold">Status</span>
                          <span className={`self-start px-2 py-0.5 rounded-md text-[9px] font-bold border uppercase tracking-wider ${getStatusColor(app.status)}`}>
                            {app.status?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] text-brand-textSecondary font-semibold">AI Match</span>
                          {app.match_score !== null && app.match_score !== undefined ? (
                            <strong className={`font-bold ${getScoreTextClass(app.match_score)}`}>{app.match_score}%</strong>
                          ) : (
                            <span className="text-[10px] italic">Unevaluated</span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleViewCandidateProfile(app)}
                        className="w-full py-2 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" /> View Profile
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- CANDIDATE DETAILS MODAL ---------------- */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 bg-brand-bg/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="glass-panel border border-brand-border/60 bg-brand-panel rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <button
                onClick={() => setSelectedCandidate(null)}
                className="absolute top-4 right-4 p-2 text-brand-textSecondary hover:text-brand-danger hover:bg-brand-danger/10 rounded-xl transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-extrabold text-brand-textPrimary border-b border-brand-border/40 pb-4 flex items-center gap-3 shrink-0">
                <div className="p-1.5 bg-brand-primary/10 rounded-lg">
                  <FileText className="w-5 h-5 text-brand-primary" />
                </div>
                Candidate Master Profile
              </h3>

              <div className="mt-5 overflow-y-auto pr-2 space-y-6 flex-1 scrollbar-thin">
                {detailsLoading ? (
                  <div className="py-24 flex flex-col items-center justify-center text-brand-textSecondary text-sm">
                    <span className="w-10 h-10 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-4"></span>
                    <span className="font-semibold tracking-wide">Retrieving full profile details...</span>
                  </div>
                ) : candidateDetails ? (
                  <div className="space-y-8 pb-4">
                    <div className="flex items-center gap-5 bg-gradient-to-br from-brand-panelLight/40 to-brand-panelLight/10 border border-brand-border/40 p-5 rounded-2xl shadow-sm">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center text-xl font-extrabold text-white shadow-md">
                        {getInitials(candidateDetails.user?.name)}
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-xl font-extrabold text-brand-textPrimary">{candidateDetails.user?.name}</h4>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-brand-textSecondary font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-brand-primary/70" />
                            {candidateDetails.user?.email}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-brand-secondary/70" />
                            Platform Member Since: {candidateDetails.user?.created_at ? new Date(candidateDetails.user?.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'}) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-base font-bold text-brand-textPrimary flex items-center gap-2 border-b border-brand-border/40 pb-2">
                        <FileText className="w-4 h-4 text-brand-secondary" />
                        Uploaded Resumes ({candidateDetails.resumes?.length ?? 0})
                      </h4>
                      {(!candidateDetails.resumes || candidateDetails.resumes.length === 0) ? (
                        <p className="text-sm text-brand-textSecondary italic bg-brand-panelLight/20 border border-brand-border/30 p-5 rounded-xl text-center">
                          No resumes uploaded to this account yet.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {candidateDetails.resumes.map((resume, rIdx) => (
                            <div key={resume.id || rIdx} className="border border-brand-border/50 p-5 rounded-xl bg-brand-panelLight/15 hover:bg-brand-panelLight/30 transition-colors shadow-sm space-y-4">
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                  <h5 className="font-bold text-brand-textPrimary text-sm truncate max-w-md flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-brand-primary/70" /> {resume.file_name}
                                  </h5>
                                  <span className="text-[11px] text-brand-textSecondary font-semibold flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 opacity-50" /> Parsed on: {resume.parsed_at ? new Date(resume.parsed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'}) : 'Unknown'}
                                  </span>
                                </div>
                                <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20 uppercase whitespace-nowrap shadow-sm">
                                  {resume.experience_years ?? 0} Yrs Experience
                                </span>
                              </div>

                              {resume.skills && (
                                <div className="space-y-2 pt-2 border-t border-brand-border/30">
                                  <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5 text-brand-primary/70" /> Parsed Skills:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(Array.isArray(resume.skills) ? resume.skills : JSON.parse(resume.skills || '[]')).map((skill, sIdx) => (
                                      <span key={sIdx} className="bg-brand-panelLight/80 text-brand-textPrimary border border-brand-border/50 px-2.5 py-1 rounded-md text-[11px] font-semibold hover:border-brand-primary/40 transition-colors cursor-default">
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

                    <div className="space-y-4">
                      <h4 className="text-base font-bold text-brand-textPrimary flex items-center gap-2 border-b border-brand-border/40 pb-2">
                        <Briefcase className="w-4 h-4 text-brand-accent" />
                        Application History ({candidateDetails.applications?.length ?? 0})
                      </h4>
                      {(!candidateDetails.applications || candidateDetails.applications.length === 0) ? (
                        <p className="text-sm text-brand-textSecondary italic bg-brand-panelLight/20 border border-brand-border/30 p-5 rounded-xl text-center">
                          Candidate has not submitted any job applications across the platform yet.
                        </p>
                      ) : (
                        <>
                          <div className="hidden md:block overflow-x-auto border border-brand-border/50 rounded-xl shadow-inner bg-brand-panelLight/10">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead className="bg-brand-panel/95">
                                <tr className="border-b border-brand-border/60 font-bold text-[11px] text-brand-textSecondary uppercase tracking-wider">
                                  <th className="py-3 px-4">Job Title</th>
                                  <th className="py-3 px-4">Company</th>
                                  <th className="py-3 px-4 text-center">Status</th>
                                  <th className="py-3 px-4 text-center">AI Match Score</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-brand-border/40">
                                {candidateDetails.applications.map((app, aIdx) => (
                                  <tr key={app.id || aIdx} className="hover:bg-brand-panelLight/40 transition-colors">
                                    <td className="py-3 px-4 font-bold text-brand-textPrimary truncate max-w-[180px] text-[13px]">
                                      {app.job_title}
                                    </td>
                                    <td className="py-3 px-4 text-brand-textSecondary font-semibold truncate max-w-[150px]">
                                      {app.company || '-'}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider shadow-sm ${getStatusColor(app.status)}`}>
                                        {app.status?.replace('_', ' ')}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className={`font-extrabold text-[13px] ${getScoreTextClass(app.match_score)}`}>
                                        {app.match_score ? `${app.match_score}%` : 'N/A'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="md:hidden space-y-3">
                            {candidateDetails.applications.map((app, aIdx) => (
                              <div key={app.id || aIdx} className="border border-brand-border/50 bg-brand-panelLight/10 rounded-xl p-4 shadow-sm flex flex-col gap-2">
                                <div>
                                  <h5 className="font-bold text-brand-textPrimary text-[13px]">{app.job_title}</h5>
                                  <p className="text-brand-textSecondary text-[11px] font-semibold mt-0.5">{app.company || '-'}</p>
                                </div>
                                <div className="flex items-center justify-between text-[11px] border-t border-brand-border/30 pt-2 mt-1">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusColor(app.status)}`}>
                                    {app.status?.replace('_', ' ')}
                                  </span>
                                  <span className={`font-extrabold ${getScoreTextClass(app.match_score)}`}>
                                    Match: {app.match_score ? `${app.match_score}%` : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-brand-textSecondary text-sm">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50 text-brand-danger" />
                    <span className="font-semibold block">Failed to load candidate details.</span>
                    <span className="text-xs opacity-70 mt-1 block">Please try again later or contact support.</span>
                  </div>
                )}
              </div>

              <div className="border-t border-brand-border/50 pt-5 mt-2 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="px-8 py-2.5 bg-brand-panelLight text-brand-textPrimary border border-brand-border rounded-xl text-sm font-bold hover:bg-brand-border/80 transition-all hover:shadow-sm"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
