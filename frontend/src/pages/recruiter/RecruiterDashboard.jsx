import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  X, 
  BarChart3, 
  Plus, 
  Sliders, 
  RefreshCw, 
  ChevronRight, 
  Eye, 
  MapPin, 
  Award, 
  ExternalLink, 
  Check, 
  Bell, 
  Settings, 
  Trash2, 
  Calendar, 
  AlertTriangle,
  Search,
  Filter,
  Download,
  User,
  Save,
  Cpu,
  Brain,
  Sparkles,
  TrendingUp,
  Trophy,
  Building2,
  Phone,
  Globe,
  Link2,
  Upload,
  ChevronDown,
  CheckCircle2,
  Camera,
  Hash,
  Send,
  Mail
} from 'lucide-react';
import API from '../../services/api';
const ExternalHiringTab = React.lazy(() => import('../../components/recruiter/ExternalHiringTab'));

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning, Recruiter';
  if (hour < 18) return 'Good Afternoon, Recruiter';
  return 'Good Evening, Recruiter';
};

const getRelativeTime = (date) => {
  if (!date) return 'Just now';
  const diffMs = new Date() - new Date(date);
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getRecommendationLabel = (score) => {
  const rounded = Math.round(score);
  if (rounded >= 90) return { text: "Highly Recommended", style: "bg-brand-success/15 border-brand-success/35 text-brand-success", emoji: "🟢" };
  if (rounded >= 80) return { text: "Recommended", style: "bg-brand-primary/15 border-brand-primary/35 text-brand-primary", emoji: "🟢" };
  if (rounded >= 65) return { text: "Consider", style: "bg-brand-warning/15 border-brand-warning/35 text-brand-warning", emoji: "🟡" };
  return { text: "Not Recommended", style: "bg-brand-danger/15 border-brand-danger/35 text-brand-danger", emoji: "🔴" };
};

export default function RecruiterDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, notifications, markAsRead: markNotifRead, checkAuth } = useContext(AuthContext);

  // Forced password change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPwError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    setPwError('');
    setPwSuccess('');
    setPwLoading(true);
    try {
      await API.post('/auth/change-password', { new_password: newPassword });
      setPwSuccess('Password updated successfully!');
      if (checkAuth) {
        await checkAuth();
      }
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPwLoading(false);
    }
  };

  const getInitialTab = () => {
    const path = location.pathname;
    if (path === '/jobs/create') return 'create';
    if (path === '/jobs') return 'jobs';
    if (path === '/applications') return 'applications';
    if (path === '/notifications') return 'notifications';
    if (path === '/settings') return 'settings';
    if (path === '/analytics') return 'recruiter-analytics';
    if (path === '/profile') return 'profile';
    if (path === '/external-hiring') return 'external-hiring';
    return 'analytics';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Profile management states
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: '',
    title: '',
    focus: '',
    bio: '',
    phone: '',
    company_website: '',
    company_description: '',
    industry: '',
    company_type: '',
    company_size: '',
    established_year: '',
    headquarters: '',
    company_address: '',
    hr_contact_email: '',
    linkedin_url: '',
    twitter_url: '',
    default_eval_strategy: 'intelligent'
  });
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Sync profile data on mount or user update
  useEffect(() => {
    if (user) {
      const details = user.company_details || {};
      const localProfileStr = localStorage.getItem(`recruiter_profile_${user?.id}`);
      let localProfile = {};
      try {
        localProfile = localProfileStr ? JSON.parse(localProfileStr) : {};
      } catch (e) {
        localProfile = {};
      }

      setProfileData(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        company: user.company || details.company_name || prev.company,
        phone: details.phone || prev.phone,
        company_website: details.company_website || prev.company_website,
        company_description: details.company_description || prev.company_description,
        industry: details.industry || prev.industry,
        company_type: details.company_type || prev.company_type,
        company_size: details.company_size || prev.company_size,
        established_year: details.established_year || prev.established_year,
        headquarters: details.headquarters || prev.headquarters,
        company_address: details.company_address || prev.company_address,
        hr_contact_email: details.hr_email || prev.hr_contact_email,
        linkedin_url: details.linkedin_url || prev.linkedin_url,
        twitter_url: details.twitter_url || prev.twitter_url,
        default_eval_strategy: details.default_eval_strategy || prev.default_eval_strategy,
        ...localProfile
      }));
    }
  }, [user]);

  // Dynamic filter states
  const [filterMinScore, setFilterMinScore] = useState(70);
  const [filterMinExp, setFilterMinExp] = useState(0);
  const [filterJobId, setFilterJobId] = useState('all');
  const [filterSkills, setFilterSkills] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);
  const [dashboardSearch, setDashboardSearch] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Main data states
  const [metrics, setMetrics] = useState({
    total_jobs: 0,
    active_jobs: 0,
    total_applications: 0,
    pending_evaluations: 0,
    evaluated_candidates: 0,
    shortlisted_applications: 0,
    approved_applications: 0,
    interview_applications: 0,
    rejected_applications: 0
  });
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);

  // Create Job Form States
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobExp, setJobExp] = useState(0);
  const [jobSkills, setJobSkills] = useState('');
  const [jobDeadline, setJobDeadline] = useState('');
  const [jobLoading, setJobLoading] = useState(false);
  const [jobSuccess, setJobSuccess] = useState('');
  const [jobError, setJobError] = useState('');
  const [jobAiInsightsEnabled, setJobAiInsightsEnabled] = useState(true);
  const [jobEvalStrategy, setJobEvalStrategy] = useState('intelligent');

  // Modal detail view states
  const [selectedApp, setSelectedApp] = useState(null);
  const [weights, setWeights] = useState({ skills: 50, experience: 20, projects: 20, resume_quality: 10 });
  const [rescoring, setRescoring] = useState(false);
  const [modalTab, setModalTab] = useState('overview');

  // Settings page states
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Bulk Evaluation & Action States
  const [evaluatingJob, setEvaluatingJob] = useState(null);
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [evaluationStep, setEvaluationStep] = useState(0);
  const [selectedEvalStrategy, setSelectedEvalStrategy] = useState('intelligent');
  const [evalShortlistedOnly, setEvalShortlistedOnly] = useState(false);

  // Threshold / Generate Results States
  const [generatingResultsJobId, setGeneratingResultsJobId] = useState(null);
  const [customThreshold, setCustomThreshold] = useState(70);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Results Preview Modal States
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewJob, setPreviewJob] = useState(null);
  const [previewThreshold, setPreviewThreshold] = useState(70);
  const [previewMaxCandidates, setPreviewMaxCandidates] = useState('');
  const [previewSendEmails, setPreviewSendEmails] = useState(true);
  const [shortlistingSummary, setShortlistingSummary] = useState(null);
  const [successSendEmails, setSuccessSendEmails] = useState(true);
  const [sendingEmails, setSendingEmails] = useState(false);

  // Company logo state
  const [companyLogoUrl, setCompanyLogoUrl] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Shortlist wizard state
  const [shortlistStep, setShortlistStep] = useState('stats'); // 'stats' | 'criteria' | 'preview' | 'summary'
  const [shortlistOverrides, setShortlistOverrides] = useState(new Set()); // Set of EXCLUDED app IDs

  // Candidate profile panel state (in application modal)
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [candidateProfileLoading, setCandidateProfileLoading] = useState(false);
  const [leftPaneTab, setLeftPaneTab] = useState('profile');
  const [evaluatingApps, setEvaluatingApps] = useState({});

  const pendingTasksList = useMemo(() => {
    const now = new Date();
    const tasks = [];

    // Jobs closing soon (within 3 days)
    jobs.filter(j => j.status === 'open' && j.deadline).forEach(job => {
      const daysLeft = Math.ceil((new Date(job.deadline) - now) / (1000 * 60 * 60 * 24));
      if (daysLeft >= 0 && daysLeft <= 3) {
        tasks.push({
          urgency: 1,
          icon: '⚠️',
          badgeColor: 'bg-brand-danger/10 border-brand-danger/20 text-brand-danger',
          badge: 'Urgent',
          title: `"${job.title}" closes in ${daysLeft === 0 ? 'today' : `${daysLeft}d`}`,
          desc: 'Evaluate and shortlist candidates before deadline.',
          btnText: 'View Job',
          onClick: () => setSelectedJob(job)
        });
      }
    });

    // Candidates awaiting evaluation (per job)
    jobs.forEach(job => {
      const unevaluated = applications.filter(a => a.job_id === job.id && !a.match_score);
      if (unevaluated.length > 0) {
        tasks.push({
          urgency: 2,
          icon: '⏳',
          badgeColor: 'bg-brand-warning/10 border-brand-warning/20 text-brand-warning',
          badge: 'Evaluation',
          title: `${unevaluated.length} candidate${unevaluated.length > 1 ? 's' : ''} awaiting evaluation`,
          desc: `For "${job.title}". Run AI screening to score and rank them.`,
          btnText: 'Evaluate',
          onClick: () => { setFilterJobId(String(job.id)); setFilterStatus('pending_evaluation'); setActiveTab('applications'); }
        });
      }
    });

    // New applications (last 48h)
    jobs.forEach(job => {
      const newApps = applications.filter(a => {
        const diff = now - new Date(a.applied_at);
        return a.job_id === job.id && diff <= 48 * 60 * 60 * 1000;
      });
      if (newApps.length > 0) {
        tasks.push({
          urgency: 3,
          icon: '📥',
          badgeColor: 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary',
          badge: 'New Apps',
          title: `${newApps.length} new application${newApps.length > 1 ? 's' : ''} received`,
          desc: `For "${job.title}" in the last 48 hours.`,
          btnText: 'Review',
          onClick: () => { setFilterJobId(String(job.id)); setFilterStatus('applied'); setActiveTab('applications'); }
        });
      }
    });

    // Interviews scheduled
    const interviewApps = applications.filter(a => a.status === 'interview');
    if (interviewApps.length > 0) {
      tasks.push({
        urgency: 4,
        icon: '📅',
        badgeColor: 'bg-brand-secondary/10 border-brand-secondary/20 text-brand-secondary',
        badge: 'Interviews',
        title: `${interviewApps.length} interview${interviewApps.length > 1 ? 's' : ''} scheduled`,
        desc: 'Review and finalize hiring decisions for interviewed candidates.',
        btnText: 'View All',
        onClick: () => { setFilterStatus('interview'); setActiveTab('applications'); }
      });
    }

    // Pending follow-ups (shortlisted > 3 days)
    jobs.forEach(job => {
      const stale = applications.filter(a => {
        if (a.job_id !== job.id || a.status !== 'shortlisted') return false;
        const diff = now - new Date(a.applied_at);
        return diff > 3 * 24 * 60 * 60 * 1000;
      });
      if (stale.length > 0) {
        tasks.push({
          urgency: 5,
          icon: '🔔',
          badgeColor: 'bg-brand-accent/10 border-brand-accent/20 text-brand-accent',
          badge: 'Follow-up',
          title: `${stale.length} shortlisted candidate${stale.length > 1 ? 's' : ''} need follow-up`,
          desc: `For "${job.title}". Move them to Interview or Selected.`,
          btnText: 'Review',
          onClick: () => { setFilterJobId(String(job.id)); setFilterStatus('shortlisted'); setActiveTab('applications'); }
        });
      }
    });

    tasks.sort((a, b) => a.urgency - b.urgency);
    return tasks;
  }, [jobs, applications]);

  const todayInsights = useMemo(() => {
    const newApps = applications.filter(a => {
      const diff = new Date() - new Date(a.applied_at);
      return diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;
    const awaitCount = applications.filter(a => !a.match_score).length;
    const intCount = applications.filter(a => a.status === 'interview').length;
    const maxScore = applications.filter(a => a.match_score).length > 0
      ? Math.max(...applications.filter(a => a.match_score).map(a => Math.round(a.match_score.final_score)))
      : 0;
    return { newApps, awaitCount, intCount, maxScore };
  }, [applications]);

  const sidebarTopCandidates = useMemo(() => {
    return applications
      .filter(a => a.match_score)
      .sort((a, b) => b.match_score.final_score - a.match_score.final_score)
      .slice(0, 3);
  }, [applications]);

  const liveActivityFeed = useMemo(() => {
    const feed = [];
    applications.forEach(app => {
      if (app.applied_at) {
        feed.push({
          type: 'upload',
          message: `Resume Received`,
          detail: `${app.candidate_name} applied for ${app.job_title}`,
          timestamp: new Date(app.applied_at),
          color: 'bg-brand-primary',
          app
        });
      }
      if (app.match_score) {
        feed.push({
          type: 'evaluate',
          message: `Evaluation Generated`,
          detail: `AI score calculated: ${Math.round(app.match_score.final_score)}%`,
          timestamp: new Date(app.match_score.calculated_at || app.applied_at),
          color: 'bg-brand-secondary',
          app
        });
      }
      if (app.status === 'shortlisted') {
        feed.push({
          type: 'shortlist',
          message: `Candidate Shortlisted`,
          detail: `${app.candidate_name} moved to shortlists`,
          timestamp: new Date(app.applied_at),
          color: 'bg-brand-accent',
          app
        });
      }
      if (app.status === 'interview') {
        feed.push({
          type: 'interview',
          message: `Interview Scheduled`,
          detail: `Interview set up for ${app.candidate_name}`,
          timestamp: new Date(app.applied_at),
          color: 'bg-brand-warning',
          app
        });
      }
      if (app.status === 'selected' || app.status === 'approved') {
        feed.push({
          type: 'select',
          message: `Candidate Selected`,
          detail: `Offer letter approved for ${app.candidate_name}!`,
          timestamp: new Date(app.applied_at),
          color: 'bg-brand-success',
          app
        });
      }
    });

    return feed.sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);
  }, [applications]);

  const fetchRecruiterData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const dashboardRes = await API.get('/recruiter/dashboard');
      setMetrics(dashboardRes.data.metrics);
      
      const appsRes = await API.get('/applications');
      setApplications(appsRes.data);

      const jobsRes = await API.get('/jobs');
      setJobs(jobsRes.data);
    } catch (err) {
      console.error("Error loading recruiter dashboard data", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const settingsRes = await API.get('/recruiter/settings');
      if (settingsRes.data.default_weights) {
        setWeights(settingsRes.data.default_weights);
      }
    } catch (err) {
      console.error("Error loading settings", err);
    }
  }, []);

  const handleEvaluateIndividual = useCallback(async (appId) => {
    setEvaluatingApps(prev => ({ ...prev, [appId]: true }));
    try {
      await API.post(`/applications/${appId}/rescore`, {
        evaluation_type: 'ai'
      });
      fetchRecruiterData();
    } catch (err) {
      alert("Failed to evaluate candidate: " + (err.response?.data?.message || err.message));
    } finally {
      setEvaluatingApps(prev => ({ ...prev, [appId]: false }));
    }
  }, [fetchRecruiterData]);

  const activityTimeline = useMemo(() => {
    const activities = [];
    
    // Process notifications
    (notifications || []).forEach(notif => {
      const text = notif.message;
      let type = 'system';
      let icon = Bell;
      let iconColor = 'text-brand-primary bg-brand-primary/10';

      if (text.includes('New application') || text.includes('applied for') || text.includes('applied')) {
        type = 'applied';
        icon = Users;
        iconColor = 'text-brand-primary bg-brand-primary/10';
      } else if (text.includes('AI Evaluation generated') || text.includes('Evaluation generated')) {
        type = 'evaluated';
        icon = Cpu;
        iconColor = 'text-brand-warning bg-brand-warning/10 border-brand-warning/20';
      } else if (text.includes("status updated to 'Shortlisted'") || text.includes('shortlisted')) {
        type = 'shortlisted';
        icon = Award;
        iconColor = 'text-brand-accent bg-brand-accent/10 border-brand-accent/20';
      } else if (text.includes("status updated to 'Interview'") || text.includes('Interview Scheduled') || text.includes('interview')) {
        type = 'interview';
        icon = Calendar;
        iconColor = 'text-brand-secondary bg-brand-secondary/10 border-brand-secondary/20';
      } else if (text.includes("status updated to 'Selected'") || text.includes('selected for') || text.includes("status updated to 'Approved'")) {
        type = 'selected';
        icon = CheckCircle;
        iconColor = 'text-brand-success bg-brand-success/10 border-brand-success/20';
      } else if (text.includes("status updated to 'Rejected'") || text.includes('rejected')) {
        type = 'rejected';
        icon = XCircle;
        iconColor = 'text-brand-danger bg-brand-danger/10 border-brand-danger/20';
      } else if (text.includes('screening pipeline executed') || text.includes('threshold') || text.includes('threshold of')) {
        type = 'pipeline';
        icon = Sparkles;
        iconColor = 'text-brand-accent bg-brand-accent/10';
      }

      activities.push({
        type,
        text,
        time: new Date(notif.created_at || notif.timestamp),
        icon,
        iconColor
      });
    });

    // Fallback: if no notifications, use application state to simulate some items
    if (activities.length === 0) {
      applications.forEach(app => {
        if (app.applied_at) {
          activities.push({
            type: 'applied',
            text: `New application for '${app.job_title}' from '${app.candidate_name}'`,
            time: new Date(app.applied_at),
            icon: Users,
            iconColor: 'text-brand-primary bg-brand-primary/10'
          });
        }
        if (app.match_score && app.match_score.calculated_at) {
          activities.push({
            type: 'evaluated',
            text: `AI Evaluation generated for candidate '${app.candidate_name}' (${Math.round(app.match_score.final_score)}% Match) for job '${app.job_title}'`,
            time: new Date(app.match_score.calculated_at),
            icon: Cpu,
            iconColor: 'text-brand-warning bg-brand-warning/10 border-brand-warning/20'
          });
        }
      });
    }

    return activities
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);
  }, [notifications, applications]);

  const handleSaveSettings = useCallback(async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsSuccess('');
    setSettingsError('');
    try {
      await API.post('/recruiter/settings', {
        default_weights: weights
      });
      setSettingsSuccess('Settings saved successfully!');
      setTimeout(() => setSettingsSuccess(''), 4000);
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSettingsLoading(false);
    }
  }, [weights]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetchRecruiterData(false);
  }, [fetchRecruiterData, activeTab]);

  // Periodic background polling for recruiter dashboard data
  useEffect(() => {
    const timer = setInterval(() => {
      fetchRecruiterData(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [fetchRecruiterData]);

  // Sync slider min score filter with job's DB threshold when a specific job is selected
  useEffect(() => {
    if (activeTab === 'applications') {
      // Keep score filter at 0 by default on the master applications page
      return;
    }
    if (filterJobId === 'all') {
      setFilterMinScore(70);
    } else {
      const selectedJobObj = jobs.find(j => j.id === parseInt(filterJobId));
      if (selectedJobObj) {
        setFilterMinScore(selectedJobObj.min_match_score || 70);
      }
    }
  }, [filterJobId, jobs, activeTab]);

  // Update active tab when path changes
  useEffect(() => {
    const tab = getInitialTab();
    setActiveTab(tab);
    setCurrentPage(1); // Reset page on tab change
    
    // Set status filter based on the tab to ensure synchronization and distinct pages
    if (tab === 'applications' && location.pathname === '/applications') {
      setFilterStatus('all');
      setFilterMinScore(0); // Reset score filter to 0 to show all applicants on master page
    }
  }, [location.pathname]);

  // Sync search query parameter from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const searchVal = searchParams.get('search') || '';
    setDashboardSearch(searchVal);
  }, [location.search]);

  // Handle create job (no threshold input required now)
  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!jobTitle || !jobDescription || !jobSkills) {
      setJobError('Please fill in all required fields.');
      return;
    }
    setJobLoading(true);
    setJobError('');
    setJobSuccess('');

    const skillsList = jobSkills.split(',').map(s => s.trim()).filter(s => s.length > 0);

    try {
      await API.post('/jobs', {
        title: jobTitle,
        description: jobDescription,
        location: jobLocation,
        experience_required: parseInt(jobExp),
        skills_required: skillsList,
        deadline: jobDeadline || null,
        min_match_score: 70, // Default fallback score
        ai_insights_enabled: jobEvalStrategy === 'intelligent' ? jobAiInsightsEnabled : false,
        evaluation_strategy: jobEvalStrategy
      });
      setJobSuccess('Job posting created successfully!');
      setJobTitle('');
      setJobDescription('');
      setJobLocation('');
      setJobExp(0);
      setJobSkills('');
      setJobDeadline('');
      setJobAiInsightsEnabled(true);
      setJobEvalStrategy('intelligent');
      fetchRecruiterData();
      setTimeout(() => navigate('/jobs'), 1500);
    } catch (err) {
      setJobError(err.response?.data?.message || 'Failed to create job posting.');
    } finally {
      setJobLoading(false);
    }
  };

  const handleToggleJobStatus = async (job) => {
    const newStatus = job.status === 'open' ? 'closed' : 'open';
    try {
      await API.put(`/jobs/${job.id}`, { status: newStatus });
      fetchRecruiterData();
    } catch (err) {
      alert("Failed to update status: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm("Are you sure you want to delete this job posting? All applicant history will be lost.")) return;
    try {
      await API.delete(`/jobs/${id}`);
      fetchRecruiterData();
    } catch (err) {
      alert("Failed to delete job: " + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenAppDetails = async (app) => {
    setSelectedApp(app);
    setModalTab('overview');
    setLeftPaneTab('profile');
    setCandidateProfile(null);
    setCandidateProfileLoading(true);
    try {
      const response = await API.get(`/applications/${app.id}/candidate-profile`);
      setCandidateProfile(response.data);
    } catch (err) {
      console.error("Failed to load candidate profile:", err);
      setCandidateProfile(null);
    } finally {
      setCandidateProfileLoading(false);
    }

    if (app.match_score) {
      if (app.match_score.details?.weights_applied) {
        setWeights(app.match_score.details.weights_applied);
      } else {
        setWeights({ skills: 50, experience: 20, projects: 20, resume_quality: 10 });
      }
    } else {
      setWeights({ skills: 50, experience: 20, projects: 20, resume_quality: 10 });
    }
  };

  const handleUpdateStatus = async (appId, status) => {
    setStatusUpdating(true);
    try {
      const res = await API.put(`/applications/${appId}/status`, { status });
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp(res.data.application);
      }
      await fetchRecruiterData();
    } catch (err) {
      alert("Failed to update status: " + (err.response?.data?.message || err.message));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleRescore = async () => {
    setRescoring(true);
    try {
      const res = await API.post(`/applications/${selectedApp.id}/rescore`, {
        evaluation_type: 'ai'
      });
      setSelectedApp(res.data.application);
      fetchRecruiterData();
    } catch (err) {
      alert("Failed to recalculate score: " + (err.response?.data?.message || err.message));
    } finally {
      setRescoring(false);
    }
  };

  const handleToggleAiInsights = async (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    const newStatus = !job.ai_insights_enabled;
    try {
      await API.put(`/jobs/${jobId}`, { ai_insights_enabled: newStatus });
      fetchRecruiterData();
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(prev => ({ ...prev, ai_insights_enabled: newStatus }));
      }
      if (!newStatus && modalTab === 'ai') {
        setModalTab('overview');
      }
    } catch (err) {
      alert("Failed to toggle AI insights setting: " + (err.response?.data?.message || err.message));
    }
  };

  const handleWeightChange = (key, val) => {
    const numericVal = parseInt(val) || 0;
    setWeights(prev => ({
      ...prev,
      [key]: numericVal
    }));
  };

  const handleViewResume = (resumeId) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    window.open(`http://localhost:5000/api/resumes/${resumeId}/file?token=${token}`, '_blank');
  };

  const exportToCSV = (selectedApps) => {
    const headers = ['Name', 'Email', 'Applied Job', 'Match Score', 'Experience (Years)', 'Extracted Skills', 'Missing Skills', 'Status'];
    const rows = selectedApps.map(app => [
      app.candidate_name,
      app.candidate_email,
      app.job_title,
      app.match_score ? `${Math.round(app.match_score.final_score)}%` : '0%',
      app.resume?.experience_years || 0,
      (app.resume?.skills || []).join('; '),
      (app.match_score?.details?.missing_skills || []).join('; '),
      app.status
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `shortlist_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkStatusUpdate = async (status) => {
    if (selectedAppIds.length === 0) return;
    setStatusUpdating(true);
    try {
      await API.put('/applications/bulk-status', {
        application_ids: selectedAppIds,
        status: status
      });
      alert(`Successfully updated ${selectedAppIds.length} applications to ${status.toUpperCase()}!`);
      setSelectedAppIds([]);
      await fetchRecruiterData();
    } catch (err) {
      alert("Bulk update failed: " + (err.response?.data?.message || err.message));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedAppIds.length === 0) return;
    const selectedApps = applications.filter(app => selectedAppIds.includes(app.id));
    exportToCSV(selectedApps);
  };

  const handleGenerateEvaluation = async (e) => {
    e.preventDefault();
    if (!evaluatingJob) return;
    
    setEvalLoading(true);
    setEvaluationStep(0);
    
    const interval = setInterval(() => {
      setEvaluationStep(prev => (prev < 4 ? prev + 1 : prev));
    }, 1100);

    try {
      await API.post(`/jobs/${evaluatingJob.id}/evaluate`, {
        evaluation_strategy: selectedEvalStrategy,
        shortlisted_only: evalShortlistedOnly
      });
      
      clearInterval(interval);
      setEvaluationStep(5);
      
      // Wait for user to visualize checklist completion
      await new Promise(r => setTimeout(r, 1400));
      
      setEvalModalOpen(false);
      setEvaluatingJob(null);
      fetchRecruiterData();
    } catch (err) {
      clearInterval(interval);
      alert("Evaluation failed: " + (err.response?.data?.message || err.message));
    } finally {
      setEvalLoading(false);
    }
  };

  const handleOpenEvaluationModal = (job) => {
    if (job.evaluation_status === 'evaluated' && !job.scores_outdated) {
      const confirmRegen = window.confirm("Evaluation results already exist for this job. Regenerating will replace the existing scores. Do you want to continue?");
      if (!confirmRegen) return;
    }
    setEvaluatingJob(job);
    setSelectedJob(job);
    setSelectedEvalStrategy(job.evaluation_strategy || 'intelligent');
    setEvalShortlistedOnly(false);
    setEvalModalOpen(true);
    setEvaluationStep(0);
  };

  // Load company logo
  useEffect(() => {
    if (user?.id && user?.company_logo_path) {
      const apiBase = API.defaults.baseURL || 'http://localhost:5000/api';
      const hostBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
      const logoUrl = `${hostBase}/api/recruiter/logo/${user.id}?t=${encodeURIComponent(user.company_logo_path)}`;
      
      const img = new Image();
      img.onload = () => setCompanyLogoUrl(logoUrl);
      img.onerror = () => setCompanyLogoUrl(null);
      img.src = logoUrl;
    } else {
      setCompanyLogoUrl(null);
    }
  }, [user]);

  const handleGenerateResults = async (jobId, thresholdVal, maxCandidates, sendEmails, includedIds = null) => {
    setResultsLoading(true);
    try {
      await API.post(`/jobs/${jobId}/generate-results`, {
        threshold: parseInt(thresholdVal),
        max_candidates: maxCandidates ? parseInt(maxCandidates) : null,
        send_emails: false,
        ...(includedIds ? { included_ids: includedIds } : {})
      });

      const targetJob = jobs.find(j => j.id === jobId);
      const jobApps = applications.filter(a => a.job_id === jobId);
      const evaluatedApps = jobApps.filter(a => a.match_score);
      const shortlistedCount = includedIds ? includedIds.length : (
        (() => {
          const matchingCount = evaluatedApps.filter(a => a.match_score.final_score >= parseInt(thresholdVal || 0)).length;
          const maxLimit = parseInt(maxCandidates);
          return (!isNaN(maxLimit) && maxLimit > 0) ? Math.min(matchingCount, maxLimit) : matchingCount;
        })()
      );

      setShortlistingSummary({
        totalCandidates: jobApps.length,
        evaluatedCount: evaluatedApps.length,
        shortlistedCount,
        averageScore: targetJob?.pool_analysis?.average_score || 0,
        emailsSent: shortlistedCount
      });
      setSuccessSendEmails(sendEmails);
      setShortlistStep('summary');
      fetchRecruiterData();
    } catch (err) {
      alert("Failed to generate results: " + (err.response?.data?.message || err.message));
    } finally {
      setResultsLoading(false);
    }
  };

  const jobAnalytics = useMemo(() => {
    let appsForJob = [];
    if (filterJobId === 'all') {
      appsForJob = applications;
    } else {
      appsForJob = applications.filter(a => a.job_id === parseInt(filterJobId));
    }

    const totalApps = appsForJob.length;
    const selectedApps = appsForJob.filter(app => {
      const appJob = jobs.find(j => j.id === app.job_id);
      const resultsGenerated = appJob ? appJob.results_generated : false;

      const score = app.match_score ? app.match_score.final_score : 0;
      const exp = app.resume?.experience_years !== undefined 
        ? app.resume.experience_years 
        : (app.match_score?.details?.experience_years !== undefined ? app.match_score.details.experience_years : 0);
      
      const isQualified = resultsGenerated
        ? ['shortlisted', 'interview', 'selected', 'approved', 'hired'].includes(app.status)
        : (app.match_score && score >= filterMinScore);

      const meetsExp = exp >= filterMinExp;
      
      let meetsSkills = true;
      if (filterSkills.trim()) {
        const requiredSkillsList = filterSkills.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
        const candidateSkillsList = (app.resume?.skills || [])
          .concat(app.match_score?.details?.matched_skills || [])
          .map(s => s.toLowerCase());
        
        meetsSkills = requiredSkillsList.every(reqSkill => 
          candidateSkillsList.some(candSkill => candSkill.includes(reqSkill))
        );
      }
      
      return isQualified && meetsExp && meetsSkills;
    });

    const rejectedApps = appsForJob.filter(app => {
      const appJob = jobs.find(j => j.id === app.job_id);
      const resultsGenerated = appJob ? appJob.results_generated : false;

      const score = app.match_score ? app.match_score.final_score : 0;
      const exp = app.resume?.experience_years !== undefined 
        ? app.resume.experience_years 
        : (app.match_score?.details?.experience_years !== undefined ? app.match_score.details.experience_years : 0);
      
      const isRejected = resultsGenerated
        ? app.status === 'rejected'
        : (app.match_score && score < filterMinScore);

      const meetsExp = exp >= filterMinExp;
      
      let meetsSkills = true;
      if (filterSkills.trim()) {
        const requiredSkillsList = filterSkills.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
        const candidateSkillsList = (app.resume?.skills || [])
          .concat(app.match_score?.details?.matched_skills || [])
          .map(s => s.toLowerCase());
        
        meetsSkills = requiredSkillsList.every(reqSkill => 
          candidateSkillsList.some(candSkill => candSkill.includes(reqSkill))
        );
      }
      
      return isRejected || !(meetsExp && meetsSkills);
    });

    const avgScore = totalApps > 0 
      ? Math.round(appsForJob.reduce((sum, app) => sum + (app.match_score ? app.match_score.final_score : 0), 0) / totalApps)
      : 0;

    const missingSkillsMap = {};
    appsForJob.forEach(app => {
      const missing = app.match_score?.details?.missing_skills || [];
      missing.forEach(skill => {
        const lower = skill.trim().toLowerCase();
        missingSkillsMap[lower] = (missingSkillsMap[lower] || 0) + 1;
      });
    });

    let mostMissingSkill = 'None';
    let maxCount = 0;
    Object.keys(missingSkillsMap).forEach(skill => {
      if (missingSkillsMap[skill] > maxCount) {
        maxCount = missingSkillsMap[skill];
        mostMissingSkill = skill.charAt(0).toUpperCase() + skill.slice(1);
      }
    });

    if (maxCount > 0) {
      mostMissingSkill = `${mostMissingSkill} (${maxCount} candidates)`;
    }

    return {
      totalApplications: totalApps,
      qualifiedCandidates: selectedApps.length,
      rejectedCandidates: rejectedApps.length,
      averageMatchScore: avgScore,
      mostMissingSkill: mostMissingSkill
    };
  }, [applications, jobs, filterJobId, filterMinScore, filterMinExp, filterSkills]);



  const getStatusBadge = (status, hasScore, jobId = null) => {
    const jobObj = jobId ? jobs.find(j => j.id === jobId) : null;
    const isOutdated = jobObj ? jobObj.scores_outdated : false;
    
    if (isOutdated && (status === 'evaluated' || status === 'shortlisted')) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-danger/15 text-brand-danger border border-brand-danger/20">⚠️ Outdated Score</span>;
    }
    switch (status) {
      case 'applied':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">📥 Applied</span>;
      case 'pending_evaluation':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-warning/15 text-brand-warning border border-brand-warning/20">⏳ Pending Evaluation</span>;
      case 'evaluated':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-success/10 border border-brand-success/20 text-brand-success">✓ Evaluated</span>;
      case 'shortlisted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-success/15 text-brand-success border border-brand-success/20">⭐ Shortlisted</span>;
      case 'interview':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-secondary/15 text-brand-secondary border border-brand-secondary/20">📅 Interview Scheduled</span>;
      case 'selected':
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-success/25 text-brand-textPrimary border border-brand-success/45">🏆 Selected</span>;
      case 'hired':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-brand-primary/20 to-brand-success/20 border border-brand-success/40 text-brand-success">🎉 Hired</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-danger/15 text-brand-danger border border-brand-danger/20">✗ Rejected</span>;
      default:
        if (!hasScore) {
          return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-warning/15 text-brand-warning border border-brand-warning/20">⏳ Pending Evaluation</span>;
        } else {
          return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-success/10 border border-brand-success/20 text-brand-success">✓ Evaluated</span>;
        }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isJobExpired = (job) => {
    if (job.status === 'expired' || job.status === 'closed') return true;
    if (job.deadline) {
      return new Date(job.deadline) < new Date();
    }
    return false;
  };

  // Helper to filter applications based on dynamic screening settings
  const getFilteredApps = (statusFilter = null) => {
    const activeStatusFilter = statusFilter || filterStatus;
    const filtered = applications.filter(app => {
      // 1. Job selection filter
      if (filterJobId !== 'all' && app.job_id !== parseInt(filterJobId)) {
        return false;
      }

      // Global search query filter
      if (dashboardSearch && dashboardSearch.trim()) {
        const query = dashboardSearch.toLowerCase();
        const nameMatch = (app.candidate_name || '').toLowerCase().includes(query);
        const titleMatch = (app.job_title || '').toLowerCase().includes(query);
        const emailMatch = (app.candidate_email || '').toLowerCase().includes(query);
        const skillsList = (app.resume?.skills || []).concat(app.match_score?.details?.matched_skills || []).map(s => s.toLowerCase());
        const skillsMatch = skillsList.some(s => s.includes(query));
        if (!nameMatch && !titleMatch && !emailMatch && !skillsMatch) return false;
      }
      
      const score = app.match_score ? app.match_score.final_score : 0;
      // Experience from serialized resume object or details fallback
      const exp = app.resume?.experience_years !== undefined 
        ? app.resume.experience_years 
        : (app.match_score?.details?.experience_years !== undefined ? app.match_score.details.experience_years : 0);
      
      // 2. Score threshold check
      const meetsScore = !app.match_score || score >= filterMinScore;
      
      // 3. Experience check
      const meetsExp = exp >= filterMinExp;
      
      // 4. Skills match check
      let meetsSkills = true;
      if (filterSkills.trim()) {
        const requiredSkillsList = filterSkills.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
        const candidateSkillsList = (app.resume?.skills || [])
          .concat(app.match_score?.details?.matched_skills || [])
          .map(s => s.toLowerCase());
        
        meetsSkills = requiredSkillsList.every(reqSkill => 
          candidateSkillsList.some(candSkill => candSkill.includes(reqSkill))
        );
      }
      
      const meetsAllDynamicFilters = meetsScore && meetsExp && meetsSkills;
      
      // Filter by status or score category or monthly trend
      if (activeStatusFilter === 'applied') {
        const appJob = jobs.find(j => j.id === app.job_id);
        const resultsGenerated = appJob ? appJob.results_generated : false;
        const isApplied = resultsGenerated ? app.status === 'applied' : true;
        return isApplied && meetsExp && meetsSkills;
      }
      if (activeStatusFilter === 'pending_evaluation' || activeStatusFilter === 'pending') {
        return ['applied', 'pending_evaluation'].includes(app.status) && meetsExp && meetsSkills;
      }
      if (activeStatusFilter === 'evaluated') {
        return !['applied', 'pending_evaluation'].includes(app.status) && meetsAllDynamicFilters;
      }
      if (activeStatusFilter === 'shortlisted') {
        const appJob = jobs.find(j => j.id === app.job_id);
        const resultsGenerated = appJob ? appJob.results_generated : false;
        const isShortlisted = resultsGenerated
          ? ['shortlisted', 'interview', 'selected', 'approved', 'hired'].includes(app.status)
          : (app.match_score && score >= filterMinScore);
        return isShortlisted && meetsExp && meetsSkills;
      }
      if (activeStatusFilter === 'interview') {
        const appJob = jobs.find(j => j.id === app.job_id);
        const resultsGenerated = appJob ? appJob.results_generated : false;
        const isInterview = resultsGenerated
          ? ['interview', 'selected', 'approved', 'hired'].includes(app.status)
          : (app.match_score && score >= filterMinScore);
        return isInterview && meetsExp && meetsSkills;
      }
      if (activeStatusFilter === 'selected' || activeStatusFilter === 'approved') {
        const appJob = jobs.find(j => j.id === app.job_id);
        const resultsGenerated = appJob ? appJob.results_generated : false;
        const isQualified = resultsGenerated
          ? ['shortlisted', 'interview', 'selected', 'approved', 'hired'].includes(app.status)
          : (app.match_score && score >= filterMinScore);
        return isQualified && meetsExp && meetsSkills;
      }
      if (activeStatusFilter === 'hired') {
        return app.status === 'hired' && meetsExp && meetsSkills;
      }
      if (activeStatusFilter === 'rejected') {
        const appJob = jobs.find(j => j.id === app.job_id);
        const resultsGenerated = appJob ? appJob.results_generated : false;
        const isRejected = resultsGenerated
          ? app.status === 'rejected'
          : (app.match_score && score < filterMinScore);
        return isRejected || !(meetsExp && meetsSkills);
      }
      
      // Score ranges (only for evaluated candidates)
      if (activeStatusFilter === 'score-85-100') {
        return !!app.match_score && app.match_score.final_score >= 85 && meetsExp && meetsSkills;
      }
      if (activeStatusFilter === 'score-70-85') {
        return !!app.match_score && app.match_score.final_score >= 70 && app.match_score.final_score < 85 && meetsExp && meetsSkills;
      }
      if (activeStatusFilter === 'score-50-70') {
        return !!app.match_score && app.match_score.final_score >= 50 && app.match_score.final_score < 70 && meetsExp && meetsSkills;
      }
      if (activeStatusFilter === 'score-0-50') {
        return (!app.match_score || app.match_score.final_score < 50) && meetsExp && meetsSkills;
      }

      // Monthly filter
      if (activeStatusFilter && activeStatusFilter.startsWith('month-')) {
        const monthShort = activeStatusFilter.replace('month-', '');
        const appDate = app.applied_at ? new Date(app.applied_at) : new Date();
        const appMonth = appDate.toLocaleString('default', { month: 'short' });
        return appMonth === monthShort && meetsAllDynamicFilters;
      }
      
      return meetsAllDynamicFilters;
    });

    return filtered.sort((a, b) => {
      const hasScoreA = !!a.match_score;
      const hasScoreB = !!b.match_score;
      if (hasScoreA && !hasScoreB) return -1;
      if (!hasScoreA && hasScoreB) return 1;
      if (hasScoreA && hasScoreB) {
        return b.match_score.final_score - a.match_score.final_score;
      }
      // Neither has score: sort by applied_at latest first
      const dateA = new Date(a.applied_at || 0);
      const dateB = new Date(b.applied_at || 0);
      return dateB - dateA;
    });
  };

  // Sidebar list
  const sidebarItems = [
    { id: 'analytics', label: 'Dashboard', path: '/dashboard', icon: BarChart3 },
    { id: 'jobs', label: 'Jobs', path: '/jobs', icon: Briefcase },
    { id: 'applications', label: 'Applications', path: '/applications', icon: Users },
    { id: 'external-hiring', label: 'External Hiring', path: '/external-hiring', icon: Upload },
    { id: 'recruiter-analytics', label: 'Analytics', path: '/analytics', icon: Award },
    { id: 'settings', label: 'Profile', path: '/settings', icon: User }
  ];

  // Paginated candidates helper
  const getPaginatedList = (list) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return list.slice(startIndex, startIndex + itemsPerPage);
  };

  const renderPaginationControls = (list) => {
    const totalPages = Math.ceil(list.length / itemsPerPage);
    if (totalPages <= 1) return null;
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-brand-border/40">
        <span className="text-xs text-brand-textSecondary font-semibold">
          Showing Page <strong className="text-brand-textPrimary">{currentPage}</strong> of <strong className="text-brand-textPrimary">{totalPages}</strong> ({list.length} Total candidates)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-xl bg-brand-panel border border-brand-border text-xs font-bold text-brand-textSecondary hover:text-brand-textPrimary hover:border-brand-primary/40 disabled:opacity-40 disabled:hover:border-brand-border disabled:hover:text-brand-textSecondary disabled:cursor-not-allowed transition-all duration-200"
          >
            Previous
          </button>
          
          {/* Page numbers */}
          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1;
            const isCurrent = currentPage === pageNum;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all duration-200 ${
                  isCurrent 
                    ? 'bg-brand-primary text-white shadow-premium'
                    : 'bg-transparent border border-transparent hover:border-brand-border text-brand-textSecondary hover:text-brand-textPrimary'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-xl bg-brand-panel border border-brand-border text-xs font-bold text-brand-textSecondary hover:text-brand-textPrimary hover:border-brand-primary/40 disabled:opacity-40 disabled:hover:border-brand-border disabled:hover:text-brand-textSecondary disabled:cursor-not-allowed transition-all duration-200"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  // Reusable filtering panel
  const renderFilterPanel = (showAnalytics = true) => {
    return (
      <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 mb-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-brand-primary" />
            <div>
              <h3 className="text-lg font-bold text-brand-textPrimary">Dynamic ATS Screening Filters</h3>
              <p className="text-xs text-brand-textSecondary mt-0.5">Filter criteria automatically splits and routes candidates below.</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setFilterMinScore(70);
              setFilterMinExp(0);
              setFilterSkills('');
              setFilterJobId('all');
            }}
            className="bg-brand-panel border border-brand-border hover:border-brand-primary text-brand-textSecondary hover:text-brand-textPrimary px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Status dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-textSecondary mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary focus:outline-none focus:border-brand-primary text-sm"
            >
              <option value="all">All</option>
              <option value="applied">Applied</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview">Interview</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Job dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-textSecondary mb-2">Filter by Job Posting</label>
            <select
              value={filterJobId}
              onChange={(e) => setFilterJobId(e.target.value)}
              className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary focus:outline-none focus:border-brand-primary text-sm"
            >
              <option value="all">All Active Jobs ({jobs.length})</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>

          {/* Min Score slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-brand-textSecondary mb-2">
              <span className="uppercase tracking-wider">Min Match Score</span>
              <strong className="text-brand-primary">{filterMinScore}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={filterMinScore}
              onChange={(e) => setFilterMinScore(parseInt(e.target.value))}
              className="w-full accent-brand-primary bg-brand-border rounded-lg h-2 cursor-pointer mt-2"
            />
          </div>

          {/* Min Experience */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-textSecondary mb-2">Min Experience (Years)</label>
            <div className="flex items-center bg-brand-bg border border-brand-border rounded-xl px-3 py-1">
              <input
                type="number"
                min="0"
                max="30"
                value={filterMinExp}
                onChange={(e) => setFilterMinExp(parseInt(e.target.value) || 0)}
                className="w-full bg-transparent border-0 text-brand-textPrimary focus:outline-none focus:ring-0 text-sm py-1.5"
              />
              <span className="text-xs text-brand-textSecondary select-none">Yrs</span>
            </div>
          </div>

          {/* Required skills search tag */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-textSecondary mb-2">Required Skills (Comma separated)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Python, React"
                value={filterSkills}
                onChange={(e) => setFilterSkills(e.target.value)}
                className="block w-full bg-brand-bg border border-brand-border rounded-xl pl-4 pr-10 py-2.5 text-brand-textPrimary placeholder-brand-textSecondary focus:outline-none focus:border-brand-primary text-sm"
              />
              {filterSkills && (
                <button
                  type="button"
                  onClick={() => setFilterSkills('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-textSecondary hover:text-brand-textPrimary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Job Analytics section */}
        {showAnalytics && (() => {
          const analytics = jobAnalytics;
          return (
            <div className="pt-6 border-t border-brand-border/40">
              <div className="flex items-center gap-1.5 mb-4">
                <BarChart3 className="w-4 h-4 text-brand-secondary" />
                <h4 className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider">Job Analytics</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/50">
                  <span className="text-[10px] text-brand-textSecondary uppercase font-semibold">Total Applications</span>
                  <div className="text-xl font-bold text-brand-textPrimary mt-1">{analytics.totalApplications}</div>
                </div>
                <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/50">
                  <span className="text-[10px] text-brand-textSecondary uppercase font-semibold">Qualified Candidates</span>
                  <div className="text-xl font-bold text-brand-success mt-1">{analytics.qualifiedCandidates}</div>
                </div>
                <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/50">
                  <span className="text-[10px] text-brand-textSecondary uppercase font-semibold">Rejected Candidates</span>
                  <div className="text-xl font-bold text-brand-danger mt-1">{analytics.rejectedCandidates}</div>
                </div>
                <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/50">
                  <span className="text-[10px] text-brand-textSecondary uppercase font-semibold">Average Match Score</span>
                  <div className="text-xl font-bold text-brand-primary mt-1">{analytics.averageMatchScore}%</div>
                </div>
                <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/50 col-span-2 md:col-span-1">
                  <span className="text-[10px] text-brand-textSecondary uppercase font-semibold">Most Missing Skill</span>
                  <div className="text-sm font-bold text-brand-accent mt-1 truncate" title={analytics.mostMissingSkill}>
                    {analytics.mostMissingSkill}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  // Reusable empty state view
  const renderEmptyState = () => (
    <div className="glass-panel border border-brand-border/60 rounded-3xl p-16 text-center text-brand-textSecondary flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto shadow-premium bg-brand-panel mt-8">
      <div className="relative">
        <div className="absolute inset-0 bg-brand-primary/10 rounded-full blur-xl animate-pulse"></div>
        <div className="w-16 h-16 rounded-3xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20 relative z-10">
          <Briefcase className="w-8 h-8 text-brand-primary" />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-brand-textPrimary">No Jobs Created Yet</h3>
        <p className="text-xs text-brand-textSecondary max-w-sm leading-relaxed">
          You haven’t created any jobs yet. Create your first job to start receiving applications.
        </p>
      </div>
      <button
        onClick={() => {
          navigate('/jobs/create');
          setActiveTab('create');
        }}
        className="bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-glow transition-all flex items-center gap-1.5"
      >
        <Plus className="w-4 h-4" /> Create Job
      </button>
    </div>
  );

  // Reusable candidate list view (grid/table layout)
  const renderCandidateTable = (candidatesList, emptyMessage) => {
    const paginated = getPaginatedList(candidatesList);
    
    return (
      <div className="space-y-6">
        {candidatesList.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="p-16 text-center text-brand-textSecondary bg-white border border-brand-border rounded-2xl shadow-sm"
          >
            <Users className="w-12 h-12 mx-auto mb-4 text-brand-border/80 animate-pulse text-brand-secondary" />
            <p className="text-lg font-bold text-brand-textPrimary">No Candidates Match Active Filters</p>
            <p className="text-xs mt-1 max-w-sm mx-auto text-brand-textSecondary">{emptyMessage}</p>
          </motion.div>
        ) : (
          <>
            {/* Bulk Actions Header */}
            {selectedAppIds.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl animate-fade-in mb-4">
                <span className="text-xs font-semibold text-brand-primary">
                  {selectedAppIds.length} candidate(s) selected
                </span>
                <div className="flex gap-2">
                  <button onClick={() => handleBulkStatusUpdate('selected')} className="bg-brand-success text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all hover:bg-brand-success/90">
                    Select Selected
                  </button>
                  <button onClick={() => handleBulkStatusUpdate('interview')} className="bg-brand-secondary text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all hover:bg-brand-secondary/90">
                    Interview Selected
                  </button>
                  <button onClick={() => handleBulkStatusUpdate('rejected')} className="bg-brand-danger text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all hover:bg-brand-danger/90">
                    Reject Selected
                  </button>
                  <button onClick={handleBulkExport} className="bg-white border border-brand-border text-brand-textPrimary px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:bg-brand-panelLight">
                    Export CSV
                  </button>
                </div>
              </div>
            )}

            {/* Grid of Candidate Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((app) => {
                const hasScore = !!app.match_score;
                const score = hasScore ? Math.round(app.match_score.final_score) : 0;
                const exp = app.resume?.experience_years !== undefined 
                  ? app.resume.experience_years 
                  : (app.match_score?.details?.experience_years !== undefined ? app.match_score.details.experience_years : 0);
                
                const candSkills = app.resume?.skills || app.match_score?.details?.matched_skills || [];
                
                const scoreColor = score >= 85 ? 'text-brand-success bg-brand-success/10 border-brand-success/20' : 
                                   score >= 70 ? 'text-brand-primary bg-brand-primary/10 border-brand-primary/20' : 
                                   score >= 50 ? 'text-brand-secondary bg-brand-secondary/10 border-brand-secondary/20' : 
                                   'text-brand-danger bg-brand-danger/10 border-brand-danger/20';

                const globalIndex = candidatesList.findIndex(item => item.id === app.id);
                const rank = globalIndex !== -1 ? globalIndex + 1 : null;
                const showRank = hasScore;
                
                const isSelected = selectedAppIds.includes(app.id);

                return (
                  <motion.div
                    key={app.id}
                    whileHover={{ y: -4, boxShadow: '0 12px 24px -10px rgba(0, 0, 0, 0.08)' }}
                    className={`glass-panel border transition-all duration-300 rounded-3xl p-5 relative flex flex-col justify-between ${
                      isSelected ? 'border-brand-primary ring-1 ring-brand-primary/30' : 'border-brand-border hover:border-slate-300'
                    }`}
                  >
                    {/* Top Row: Rank/Avatar & Selection Checkbox */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 flex items-center justify-center text-brand-primary font-bold text-base border border-brand-primary/15 relative">
                          {app.candidate_name ? app.candidate_name.charAt(0) : 'C'}
                          {/* Rank badge */}
                          {showRank && (
                            <span className="absolute -top-1.5 -right-1.5 text-[9px] w-5 h-5 rounded-full bg-white flex items-center justify-center border border-brand-border shadow-sm font-bold text-brand-primary">
                              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-brand-textPrimary text-base line-clamp-1">{app.candidate_name}</h4>
                          <span className="text-[10px] text-brand-textSecondary block truncate max-w-[12rem]">{app.job_title}</span>
                          <div className="mt-1">
                            {getStatusBadge(app.status, hasScore, app.job_id)}
                          </div>
                        </div>
                      </div>
                      
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAppIds(prev => [...prev, app.id]);
                          } else {
                            setSelectedAppIds(prev => prev.filter(id => id !== app.id));
                          }
                        }}
                        className="rounded border-brand-border bg-brand-bg text-brand-primary focus:ring-brand-primary cursor-pointer w-4 h-4"
                      />
                    </div>

                    {/* Middle Row: Score and Recommendation Status */}
                    <div className="space-y-2 mb-5">
                      {hasScore ? (
                        <>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-extrabold text-brand-primary tracking-tight">
                              {score}% Match
                            </span>
                            {app.match_score && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-bg border border-brand-border text-brand-textSecondary font-semibold">
                                {app.match_score.evaluation_type === 'quick' ? '⚡ Quick' : '🧠 Intelligent'}
                              </span>
                            )}
                          </div>
                          {(() => {
                            const curJob = jobs.find(j => j.id === app.job_id);
                            if (curJob?.scores_outdated) {
                              return (
                                <div className="text-[10px] text-brand-danger font-bold mt-1">
                                  ⚠️ Score outdated due to criteria changes
                                </div>
                              );
                            }
                            return null;
                          })()}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs font-bold text-brand-textPrimary">
                              {getRecommendationLabel(score).emoji} {getRecommendationLabel(score).text}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-semibold text-brand-textSecondary flex items-center gap-1">
                            ⏳ Pending Evaluation
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-brand-textSecondary">
                              ⚪ Not Evaluated Yet
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Bottom Row: View Analysis Button */}
                    <div className="pt-3.5 border-t border-brand-border/60">
                      <button
                        onClick={() => handleOpenAppDetails(app)}
                        className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white py-2.5 rounded-xl font-bold shadow-premium text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Eye className="w-4 h-4" /> View Analysis
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Pagination Controls */}
            {renderPaginationControls(candidatesList)}
          </>
        )}
      </div>
    );
  };

  if (user?.must_change_password) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-brand-primary/[0.08] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-brand-success/[0.08] rounded-full blur-[120px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 backdrop-blur-xl shadow-2xl flex flex-col gap-6 relative"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-brand-primary" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Secure Your Account
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
              Your recruiter account has been approved. For security reasons, please change your temporary password to a secure one before proceeding.
            </p>
          </div>

          {pwError && (
            <div className="p-3.5 bg-brand-danger/10 border border-brand-danger/20 rounded-xl flex items-center gap-2.5 text-brand-danger text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-brand-danger" />
              <span>{pwError}</span>
            </div>
          )}

          {pwSuccess && (
            <div className="p-3.5 bg-brand-success/10 border border-brand-success/20 rounded-xl flex items-center gap-2.5 text-brand-success text-xs font-semibold">
              <Check className="w-4 h-4 shrink-0 text-brand-success" />
              <span>{pwSuccess}</span>
            </div>
          )}

          <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider ml-0.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary transition-all font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider ml-0.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary transition-all font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={pwLoading}
              className="w-full bg-brand-primary hover:bg-brand-primary/90 active:scale-[0.98] text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-brand-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {pwLoading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Update Password</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-brand-bg text-brand-textPrimary">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-brand-border/80 p-4 shrink-0 flex flex-col justify-between md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:overflow-y-auto">
        <div className="space-y-6">
          <div className="px-3 py-2 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-pulse"></div>
            <span className="text-xs font-bold text-brand-textSecondary uppercase tracking-widest block">ATS Workflow Panel</span>
          </div>
          <nav className="space-y-1">
            {sidebarItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
                    isActive 
                      ? 'text-brand-primary font-bold shadow-sm' 
                      : 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-brand-panelLight'
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="activeSidebarIndicator"
                      className="absolute inset-0 bg-brand-primary/10 rounded-xl border-l-2 border-brand-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-4 h-4 z-10 ${isActive ? 'text-brand-primary' : 'text-brand-textSecondary'}`} />
                  <span className="z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="hidden md:block border-t border-brand-border/40 pt-4 mt-6 text-xs text-brand-textSecondary">
          <div className="flex items-center gap-2 mb-2">
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt="Company Logo"
                className="w-8 h-8 rounded-lg object-contain border border-brand-border/40 bg-brand-bg shrink-0"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            {!companyLogoUrl && (
              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-xs shrink-0">
                {(profileData.company || user?.name || 'R')[0].toUpperCase()}
              </div>
            )}
            {companyLogoUrl && (
              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-xs shrink-0" style={{ display: 'none' }}>
                {(profileData.company || user?.name || 'R')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-brand-textPrimary leading-tight">{profileData.name || user?.name || 'Jane Recruiter'}</p>
              <p className="text-[10px]">{profileData.title || 'Recruiter'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto relative">
        <div className="absolute top-1/4 left-1/3 w-[30rem] h-[30rem] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Premium Dashboard Skeleton */}
              <div className="h-32 bg-slate-100 rounded-3xl border border-brand-border/60 animate-pulse"></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-20 bg-slate-50 rounded-2xl border border-brand-border/50 animate-pulse"></div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse"></div>
                  <div className="h-64 bg-slate-50 rounded-3xl border border-brand-border/40 animate-pulse"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-8 w-32 bg-slate-100 rounded-lg animate-pulse"></div>
                  <div className="h-64 bg-slate-50 rounded-3xl border border-brand-border/40 animate-pulse"></div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-5"
            >
              {/* TAB 1: DASHBOARD STATS OVERVIEW */}
              {activeTab === 'analytics' && (
          <div className="space-y-5 animate-fade-in">
            {/* Elegant Header Banner with Time-of-day Greeting */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white border border-slate-800/85 shadow-premium relative overflow-hidden rounded-3xl p-4 md:p-5">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-accent/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute right-1/4 -bottom-10 w-40 h-40 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 relative z-10 w-full">
                <div className="space-y-1.5 w-full xl:w-auto">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-brand-accent/25 border border-brand-accent/40 text-brand-accent">
                    <Sparkles className="w-3 h-3 text-brand-accent animate-pulse" /> AI Recruiting Hub
                  </span>
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                    {getGreeting()}
                  </h1>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap gap-2.5 w-full xl:w-auto shrink-0">
                  <button
                    onClick={() => { setFilterStatus('all'); setActiveTab('applications'); }}
                    className="flex-1 xl:flex-none bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all border border-slate-700/60"
                  >
                    <Users className="w-3.5 h-3.5" /> Review Candidates
                  </button>
                  <button
                    onClick={() => setActiveTab('jobs')}
                    className="flex-1 xl:flex-none bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all border border-slate-700/60"
                  >
                    <Cpu className="w-3.5 h-3.5" /> Generate Evaluations
                  </button>
                </div>
              </div>
            </div>

            {/* COMPACT KPI CARDS ROW */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                { label: 'Active Jobs', value: metrics.active_jobs ?? jobs.filter(j => j.status === 'open').length, color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20', icon: Briefcase, action: () => { setActiveTab('jobs'); } },
                { label: 'Total Applications', value: metrics.total_applications ?? applications.length, color: 'text-brand-secondary bg-brand-secondary/10 border-brand-secondary/20', icon: FileText, action: () => { setFilterStatus('all'); setActiveTab('applications'); } },
                { label: 'Shortlisted Resumes', value: metrics.shortlisted_applications ?? applications.filter(a => ['shortlisted','interview','selected','approved','hired'].includes(a.status)).length, color: 'text-brand-accent bg-brand-accent/10 border-brand-accent/20', icon: Award, action: () => { setFilterStatus('shortlisted'); setActiveTab('applications'); } },
                { label: 'Hired Candidates', value: metrics.hired_applications ?? applications.filter(a => a.status === 'hired').length, color: 'text-brand-success bg-brand-success/10 border-brand-success/20', icon: CheckCircle, action: () => { setFilterStatus('hired'); setActiveTab('applications'); } },
                { label: 'Rejected Candidates', value: metrics.rejected_applications ?? applications.filter(a => a.status === 'rejected').length, color: 'text-brand-danger bg-brand-danger/10 border-brand-danger/20', icon: XCircle, action: () => { setFilterStatus('rejected'); setActiveTab('applications'); } },
                { label: 'Evaluations', value: metrics.evaluated_candidates ?? applications.filter(a => a.match_score).length, color: 'text-brand-warning bg-brand-warning/10 border-brand-warning/20', icon: Cpu, action: () => { setFilterStatus('all'); setActiveTab('applications'); } },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div 
                    key={i}
                    onClick={card.action}
                    className="glass-panel border border-brand-border/60 rounded-2xl p-4 flex items-center justify-between cursor-pointer card-interactive group"
                  >
                    <div className="space-y-1 min-w-0 pr-1">
                      <span className="text-[9px] text-brand-textSecondary uppercase font-bold tracking-wider block leading-tight truncate">{card.label}</span>
                      <strong className="text-xl text-brand-textPrimary font-extrabold block">{card.value}</strong>
                    </div>
                    <div className={`p-2 rounded-xl border ${card.color} group-hover:scale-110 transition-transform shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>

            {jobs.length === 0 ? (
              renderEmptyState()
            ) : (
              <>
                {/* Dynamic Dashboard Search Results Section */}
                {dashboardSearch.trim() !== '' && (
              <div className="glass-panel border border-brand-primary/30 bg-brand-primary/[0.02] rounded-3xl p-6 shadow-premium animate-fade-in space-y-4">
                <div className="flex justify-between items-center border-b border-brand-border/60 pb-3">
                  <h3 className="text-sm font-extrabold text-brand-textPrimary flex items-center gap-2">
                    <Search className="w-4.5 h-4.5 text-brand-primary" /> Search Results for "{dashboardSearch}"
                  </h3>
                  <span className="text-[11px] text-brand-textSecondary">
                    Found {
                      applications.filter(a => 
                        a.candidate_name?.toLowerCase().includes(dashboardSearch.toLowerCase()) ||
                        a.job_title?.toLowerCase().includes(dashboardSearch.toLowerCase()) ||
                        (a.match_score?.skills_match?.matched?.some(s => s.toLowerCase().includes(dashboardSearch.toLowerCase())))
                      ).length
                    } matches
                  </span>
                </div>

                {/* Search results list */}
                {(() => {
                  const filtered = applications.filter(a => 
                    a.candidate_name?.toLowerCase().includes(dashboardSearch.toLowerCase()) ||
                    a.job_title?.toLowerCase().includes(dashboardSearch.toLowerCase()) ||
                    (a.match_score?.skills_match?.matched?.some(s => s.toLowerCase().includes(dashboardSearch.toLowerCase())))
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="py-8 px-6 rounded-2xl border border-brand-border/40 bg-brand-bg/50 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-brand-warning/10 flex items-center justify-center border border-brand-warning/20">
                          <Search className="w-6 h-6 text-brand-warning" />
                        </div>
                        <h4 className="text-sm font-bold text-brand-textPrimary">No matching candidates found</h4>
                        <p className="text-xs text-brand-textSecondary max-w-md leading-relaxed">
                          We couldn't find any candidate name, job title, or skill matching <strong className="text-brand-textPrimary">"{dashboardSearch}"</strong>. Try checking your spelling or adjusting your keywords.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filtered.slice(0, 8).map(app => {
                        const score = app.match_score ? Math.round(app.match_score.final_score) : null;
                        return (
                          <div 
                            key={app.id} 
                            onClick={() => handleOpenAppDetails(app)}
                            className="flex items-center justify-between p-4 bg-brand-panel hover:bg-slate-50 border border-brand-border/60 hover:border-brand-primary/40 rounded-2xl transition-all duration-300 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-sm">
                                {app.candidate_name?.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-brand-textPrimary text-sm">{app.candidate_name}</h4>
                                <p className="text-[11px] text-brand-textSecondary">{app.job_title}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {score !== null ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-extrabold px-2.5 py-1 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
                                    {score}% Match
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-bg border border-brand-border text-brand-textSecondary font-semibold">
                                    {app.match_score?.evaluation_type === 'quick' ? '⚡ Quick' : '🧠 Intelligent'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-brand-warning/10 border border-brand-warning/20 text-brand-warning">
                                  Unevaluated
                                </span>
                              )}
                              {getStatusBadge(app.status, !!app.match_score, app.job_id)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Visual Recruitment Funnel */}
            <div className="glass-panel border border-brand-border rounded-3xl p-5 shadow-premium relative overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-brand-textPrimary flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-primary animate-pulse" /> Visual Hiring Pipeline
                  </h3>
                  <p className="text-xs text-brand-textSecondary mt-0.5">Click any stage to filter candidate lists instantly.</p>
                </div>
              </div>
              
              <div className="relative grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 select-none px-2">
                {(() => {
                  const pipelineApps = filterJobId === 'all' ? applications : applications.filter(a => a.job_id === parseInt(filterJobId));
                  return [
                    { label: 'Applied', value: pipelineApps.length, status: 'applied', tab: 'applications', emoji: '📥', color: 'border-brand-primary/30 text-brand-primary bg-brand-primary/5 hover:border-brand-primary' },
                    { label: 'Pending Eval', value: pipelineApps.filter(a => ['applied', 'pending_evaluation'].includes(a.status)).length, status: 'pending_evaluation', tab: 'applications', emoji: '⏳', color: 'border-brand-warning/30 text-brand-warning bg-brand-warning/5 hover:border-brand-warning' },
                    { label: 'Evaluated', value: pipelineApps.filter(a => !['applied', 'pending_evaluation'].includes(a.status)).length, status: 'evaluated', tab: 'applications', emoji: '📊', color: 'border-brand-secondary/30 text-brand-secondary bg-brand-secondary/5 hover:border-brand-secondary' },
                    { label: 'Shortlisted', value: pipelineApps.filter(a => ['shortlisted', 'interview', 'selected', 'approved', 'hired'].includes(a.status)).length, status: 'shortlisted', tab: 'applications', emoji: '⭐', color: 'border-brand-accent/30 text-brand-accent bg-brand-accent/5 hover:border-brand-accent' },
                    { label: 'Interview', value: pipelineApps.filter(a => ['interview', 'selected', 'approved', 'hired'].includes(a.status)).length, status: 'interview', tab: 'applications', emoji: '📅', color: 'border-brand-secondary/30 text-brand-secondary bg-brand-secondary/5 hover:border-brand-secondary' },
                    { label: 'Selected', value: pipelineApps.filter(a => ['selected', 'approved', 'hired'].includes(a.status)).length, status: 'selected', tab: 'applications', emoji: '🏆', color: 'border-brand-success/30 text-brand-success bg-brand-success/5 hover:border-brand-success' },
                    { label: 'Hired', value: pipelineApps.filter(a => a.status === 'hired').length, status: 'hired', tab: 'applications', emoji: '🎉', color: 'border-brand-success/40 text-brand-success bg-brand-success/10 hover:border-brand-success' },
                    { label: 'Rejected', value: pipelineApps.filter(a => a.status === 'rejected').length, status: 'rejected', tab: 'applications', emoji: '✗', color: 'border-brand-danger/30 text-brand-danger bg-brand-danger/5 hover:border-brand-danger' }
                  ].map((step, idx) => (
                    <div 
                      key={idx}
                      onClick={() => { setFilterStatus(step.status); setActiveTab(step.tab); }}
                      className={`z-10 w-full border p-3 rounded-2xl flex flex-col justify-between items-center text-center transition-all duration-300 hover:scale-[1.03] hover:shadow-premium cursor-pointer h-[110px] relative group overflow-hidden ${step.color}`}
                    >
                      <div className="flex flex-col items-center gap-1.5 w-full">
                        <div className="w-9 h-9 rounded-xl bg-white border border-brand-border/60 flex items-center justify-center text-base shadow-sm group-hover:scale-110 transition-transform duration-200">
                          {step.emoji}
                        </div>
                        <span className="text-[10px] text-brand-textSecondary uppercase font-extrabold tracking-wider block leading-tight truncate w-full px-1">{step.label}</span>
                      </div>
                      <div className="flex items-baseline justify-center gap-1.5 mt-auto">
                        <strong className="text-lg text-brand-textPrimary font-black leading-none">{step.value}</strong>
                        <span className="text-[9px] bg-white/90 border border-brand-border/40 px-1 py-0.5 rounded text-brand-textSecondary font-bold shrink-0">
                          {pipelineApps.length > 0 ? Math.round((step.value / pipelineApps.length) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
            {/* MAIN ATS RECRUITER WORKSPACE GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              {/* Left Column: Actions, Queue, Evaluations, Leaderboard & Recent Applicants (col-span-2) */}
              <div className="lg:col-span-2 space-y-5">
                
                {/* 1. Today's Action Desk */}
                <div className="glass-panel border border-brand-border rounded-3xl p-5 shadow-premium">
                  <div className="flex justify-between items-center mb-4 border-b border-brand-border/45 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-brand-textPrimary flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-brand-primary animate-pulse" /> Today's Action Desk
                      </h3>
                      <p className="text-xs text-brand-textSecondary mt-0.5">Urgent recruiter tasks and upcoming candidate checkpoints for today.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(() => {
                      const pendingCount = applications.filter(a => !a.match_score).length;
                      const activeJobsWithoutEval = jobs.filter(j => j.status === 'open' && applications.filter(a => a.job_id === j.id && !a.match_score).length > 0);
                      
                      const actions = [];
                      if (pendingCount > 0) {
                        actions.push({
                          title: "Evaluate New Candidates",
                          desc: `You have ${pendingCount} candidate applications awaiting hybrid ATS and AI evaluation.`,
                          badge: "Urgent",
                          badgeColor: "bg-brand-danger/10 border-brand-danger/20 text-brand-danger",
                          btnText: "Go to Queue",
                          onClick: () => {
                            const queueEl = document.getElementById('evaluation-queue-section');
                            if (queueEl) queueEl.scrollIntoView({ behavior: 'smooth' });
                          }
                        });
                      }
                      
                      const outdatedJobs = jobs.filter(j => j.scores_outdated);
                      outdatedJobs.forEach(job => {
                        actions.push({
                          title: `Re-evaluate Candidates for ${job.title}`,
                          desc: `Evaluation criteria was modified. Regeneration is required to update candidate scores.`,
                          badge: "Outdated Scores",
                          badgeColor: "bg-brand-danger/10 border-brand-danger/20 text-brand-danger",
                          btnText: "Re-evaluate",
                          onClick: () => handleOpenEvaluationModal(job)
                        });
                      });

                      activeJobsWithoutEval.forEach(job => {
                        const count = applications.filter(a => a.job_id === job.id && !a.match_score).length;
                        actions.push({
                          title: `Bulk Screening Awaiting for ${job.title}`,
                          desc: `${count} candidates applied. Run the unified match engine to score and rank them.`,
                          badge: "Job Screening",
                          badgeColor: "bg-brand-warning/10 border-brand-warning/20 text-brand-warning",
                          btnText: "Run Evaluation",
                          onClick: () => handleOpenEvaluationModal(job)
                        });
                      });
                      
                      if (actions.length === 0) {
                        return (
                          <div className="p-4 bg-brand-success/5 border border-brand-success/25 rounded-2xl flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-brand-success shrink-0" />
                            <div>
                              <h4 className="font-bold text-brand-textPrimary text-xs">All Actions Complete!</h4>
                              <p className="text-[10px] text-brand-textSecondary">You have resolved all outstanding evaluation queues and job screenings for today.</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {actions.slice(0, 3).map((act, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-brand-panel hover:bg-slate-50 border border-brand-border/60 rounded-2xl transition-all duration-300">
                              <div className="space-y-1 pr-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${act.badgeColor}`}>
                                    {act.badge}
                                  </span>
                                  <h4 className="font-bold text-brand-textPrimary text-sm">{act.title}</h4>
                                </div>
                                <p className="text-xs text-brand-textSecondary">{act.desc}</p>
                              </div>
                              <button
                                onClick={act.onClick}
                                className="bg-white hover:bg-brand-panelLight text-brand-textPrimary border border-brand-border text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shrink-0 shadow-sm"
                              >
                                {act.btnText}
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 2. Scheduled Interviews */}
                <div className="glass-panel border border-brand-border rounded-3xl p-5 shadow-premium">
                  <div className="flex justify-between items-center mb-4 border-b border-brand-border/45 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-brand-textPrimary flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-brand-secondary" /> Scheduled Interviews
                      </h3>
                      <p className="text-xs text-brand-textSecondary mt-0.5">Candidates currently in interview status. Review resume, score, or make hiring decisions.</p>
                    </div>
                    <span className="bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20 text-xs font-bold px-2.5 py-0.5 rounded-lg shrink-0">
                      {applications.filter(a => a.status === 'interview').length} Active
                    </span>
                  </div>

                  {(() => {
                    const interviewApps = applications.filter(a => a.status === 'interview');
                    if (interviewApps.length === 0) {
                      return (
                        <div className="py-8 text-center text-brand-textSecondary bg-slate-50/50 border border-brand-border/40 rounded-2xl border-dashed text-xs">
                          📅 No interviews scheduled for today. Move candidates to Interview in the Candidate Detail view.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {interviewApps.slice(0, 3).map((app) => (
                          <div key={app.id} className="flex items-center justify-between p-4 bg-brand-panel hover:bg-slate-50 border border-brand-border/60 rounded-2xl transition-all duration-300">
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <div className="w-9 h-9 rounded-xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary font-bold text-sm shrink-0">
                                {app.candidate_name?.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-brand-textPrimary text-sm truncate">{app.candidate_name}</h4>
                                <p className="text-xs text-brand-textSecondary truncate">{app.job_title}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleOpenAppDetails(app)}
                                className="bg-white hover:bg-brand-panelLight text-brand-textPrimary border border-brand-border text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm"
                              >
                                View analysis
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(app.id, 'selected')}
                                className="bg-brand-success text-white hover:opacity-95 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm"
                              >
                                Select
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* 3. Evaluation Queue */}
                <div id="evaluation-queue-section" className="glass-panel border border-brand-border rounded-3xl p-5 shadow-premium">
                  <div className="flex justify-between items-center mb-4 border-b border-brand-border/45 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-brand-textPrimary flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-brand-primary" /> Evaluation Queue
                      </h3>
                      <p className="text-xs text-brand-textSecondary mt-0.5">Process new applicant resumes through our keyword, ATS, and Gemini AI pipeline.</p>
                    </div>
                    <span className="bg-brand-warning/10 text-brand-warning border border-brand-warning/20 text-xs font-bold px-2.5 py-0.5 rounded-lg shrink-0 animate-pulse">
                      {applications.filter(a => !a.match_score).length} Awaiting
                    </span>
                  </div>

                  {/* Queue Items in a professional ATS table layout */}
                  {(() => {
                    const pending = applications.filter(a => !a.match_score);
                    if (pending.length === 0) {
                      return (
                        <div className="py-12 text-center text-brand-textSecondary bg-slate-50/50 border border-brand-border/40 rounded-2xl border-dashed">
                          🎉 No candidates awaiting evaluation. All applications have been processed.
                        </div>
                      );
                    }
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-brand-border/45 text-[10px] font-extrabold text-brand-textSecondary uppercase tracking-wider">
                              <th className="pb-3 px-2">Candidate Name</th>
                              <th className="pb-3 px-2">Applied Role</th>
                              <th className="pb-3 px-2">Applied Time</th>
                              <th className="pb-3 px-2 text-center">Resume</th>
                              <th className="pb-3 px-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-border/40 text-xs">
                            {pending.slice(0, 10).map((app) => (
                              <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-2 font-bold text-brand-textPrimary flex items-center gap-2 min-w-[12rem]">
                                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-warning/10 to-brand-danger/10 flex items-center justify-center text-brand-warning font-black text-xs border border-brand-warning/15 shrink-0">
                                    {app.candidate_name ? app.candidate_name.charAt(0) : 'C'}
                                  </div>
                                  <span className="truncate">{app.candidate_name}</span>
                                </td>
                                <td className="py-3 px-2 text-brand-textSecondary truncate max-w-[10rem]">{app.job_title}</td>
                                <td className="py-3 px-2 text-brand-textSecondary min-w-[8rem]">
                                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-brand-primary shrink-0" /> {getRelativeTime(app.applied_at)}</span>
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <button
                                    onClick={() => handleViewResume(app.resume_id)}
                                    className="p-1.5 bg-brand-panel hover:bg-brand-panelLight border border-brand-border rounded-lg text-brand-textSecondary hover:text-brand-textPrimary transition-all inline-flex items-center justify-center shadow-sm"
                                    title="View Resume File"
                                  >
                                    <FileText className="w-4 h-4 text-brand-primary" />
                                  </button>
                                </td>
                                <td className="py-3 px-2 text-right">
                                  <button
                                    onClick={() => handleEvaluateIndividual(app.id)}
                                    disabled={evaluatingApps[app.id]}
                                    className="bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1 shadow-sm disabled:opacity-50"
                                  >
                                    {evaluatingApps[app.id] ? (
                                      <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Evaluating...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3.5 h-3.5" /> Generate Evaluation
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>

                {/* 4. Recent Evaluations Section */}
                <div className="glass-panel border border-brand-border rounded-3xl p-5 shadow-premium">
                  <div className="flex justify-between items-center mb-4 border-b border-brand-border/45 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-brand-textPrimary flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-brand-success" /> Recent Evaluations
                      </h3>
                      <p className="text-xs text-brand-textSecondary mt-0.5">Quick overview of recent system evaluations and final fit scores.</p>
                    </div>
                  </div>

                  {(() => {
                    const evaluated = applications
                      .filter(a => a.match_score)
                      .sort((a, b) => new Date(b.match_score.calculated_at || b.applied_at) - new Date(a.match_score.calculated_at || a.applied_at))
                      .slice(0, 4);

                    if (evaluated.length === 0) {
                      return (
                        <div className="py-8 text-center text-brand-textSecondary bg-slate-50/50 border border-brand-border/40 rounded-2xl border-dashed text-xs">
                          No evaluations calculated yet. Run evaluation above to populate.
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {evaluated.map((app) => {
                          const score = Math.round(app.match_score.final_score);
                          const label = getRecommendationLabel(app.match_score.final_score);
                          return (
                            <div 
                              key={app.id}
                              onClick={() => handleOpenAppDetails(app)}
                              className="flex items-center justify-between p-3.5 bg-brand-panel hover:bg-slate-50 border border-brand-border/60 hover:border-brand-primary/45 rounded-2xl transition-all duration-300 cursor-pointer shadow-sm group"
                            >
                              <div className="min-w-0 pr-2">
                                <h4 className="font-bold text-brand-textPrimary text-xs truncate group-hover:text-brand-primary transition-colors">{app.candidate_name}</h4>
                                <p className="text-[10px] text-brand-textSecondary truncate max-w-[10rem] mt-0.5">{app.job_title}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${label.style}`}>
                                  {label.text}
                                </span>
                                <strong className="text-xs text-brand-primary font-black min-w-[2.5rem] text-right">
                                  {score}%
                                </strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* 5. Top Candidates Leaderboard */}
                <div className="glass-panel border border-brand-border rounded-3xl p-5 shadow-premium">
                  <div className="flex justify-between items-center mb-4 border-b border-brand-border/45 pb-3">
                    <h3 className="text-base font-extrabold text-brand-textPrimary flex items-center gap-2">
                      <Award className="w-5 h-5 text-brand-primary" /> Top Candidates Leaderboard
                    </h3>
                    <span className="text-[10px] bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2.5 py-0.5 rounded-lg font-bold">
                      Top Rated
                    </span>
                  </div>

                  {applications.filter(a => a.match_score).length === 0 ? (
                    <div className="py-8 text-center text-brand-textSecondary bg-slate-50/50 border border-brand-border/40 rounded-2xl border-dashed">
                      No candidates evaluated yet. Run evaluations to populate the leaderboard.
                    </div>
                  ) : (
                    <div className="divide-y divide-brand-border/40">
                      {applications
                        .filter(a => a.match_score)
                        .sort((a, b) => b.match_score.final_score - a.match_score.final_score)
                        .slice(0, 5)
                        .map((app, idx) => {
                          const score = Math.round(app.match_score.final_score);
                          const badge = getRecommendationLabel(app.match_score.final_score);
                          return (
                            <div 
                              key={app.id} 
                              className="flex items-center justify-between py-3 group hover:bg-slate-50/50 px-2 rounded-xl transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="text-xs font-extrabold w-6 h-6 rounded-full bg-slate-100/80 flex items-center justify-center text-brand-textSecondary shrink-0">
                                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-brand-textPrimary text-xs truncate">{app.candidate_name}</h4>
                                  <p className="text-[10px] text-brand-textSecondary truncate max-w-[12rem]">{app.job_title}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${badge.style}`}>
                                  {badge.text}
                                </span>
                                <span className="text-xs font-extrabold text-brand-primary min-w-[3rem] text-right">
                                  {score}% Match
                                </span>
                                <button
                                  onClick={() => handleOpenAppDetails(app)}
                                  className="p-1.5 bg-brand-panel hover:bg-brand-primary hover:text-white border border-brand-border rounded-lg text-brand-textSecondary transition-all"
                                  title="Quick View Analysis"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* 6. Recent Applicants */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-extrabold text-brand-textPrimary">Recent Applicants</h3>
                    <Link to="/applications" className="text-xs text-brand-primary hover:text-brand-secondary font-semibold flex items-center gap-1">
                      View All Candidates <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                  
                  {applications.length === 0 ? (
                    <div className="glass-panel border border-brand-border p-10 text-center text-brand-textSecondary rounded-2xl">
                      No applicants registered in the database yet.
                    </div>
                  ) : (
                    <div className="glass-panel border border-brand-border/60 rounded-2xl overflow-hidden font-sans shadow-premium">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-brand-bg/50 border-b border-brand-border/60 text-xs font-bold text-brand-textSecondary uppercase tracking-wider">
                            <th className="py-2.5 px-4">Name</th>
                            <th className="py-2.5 px-4">Job</th>
                            <th className="py-2.5 px-4">Match Score</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/40 text-xs">
                          {applications.slice(0, 4).map(app => (
                            <tr key={app.id} className="hover:bg-brand-panelLight/10 transition-colors">
                              <td className="py-2.5 px-4 font-semibold text-brand-textPrimary">{app.candidate_name}</td>
                              <td className="py-2.5 px-4 text-brand-textSecondary">{app.job_title}</td>
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  {app.match_score ? (
                                    <span className="text-brand-primary font-bold">{Math.round(app.match_score.final_score)}%</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-warning/15 text-brand-warning border border-brand-warning/20">⏳ Pending</span>
                                  )}
                                  {app.match_score && (
                                    <span className="text-[9px] px-1 rounded bg-brand-bg border border-brand-border text-brand-textSecondary font-semibold">
                                      {app.match_score.evaluation_type === 'quick' ? '⚡' : '🧠'}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-4">{getStatusBadge(app.status, !!app.match_score, app.job_id)}</td>
                              <td className="py-2.5 px-4 text-center flex items-center justify-center gap-1.5">
                                <button 
                                  onClick={() => handleViewResume(app.resume_id)} 
                                  title="View PDF Resume"
                                  className="p-1.5 bg-brand-panel hover:bg-brand-panelLight border border-brand-border rounded-lg text-brand-textSecondary hover:text-brand-textPrimary transition-all"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleOpenAppDetails(app)} 
                                  title="View Evaluation Details"
                                  className="p-1.5 bg-brand-panel hover:bg-brand-panelLight border border-brand-border rounded-lg text-brand-textSecondary hover:text-brand-textPrimary transition-all"
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Widget A: Recent Applications Feed */}
                <div className="glass-panel border border-brand-border rounded-3xl p-5 shadow-premium">
                  <div className="flex justify-between items-center mb-4 border-b border-brand-border/45 pb-3">
                    <h3 className="text-sm font-extrabold text-brand-textPrimary flex items-center gap-2">
                      <FileText className="w-4.5 h-4.5 text-brand-primary" /> Recent Applications
                    </h3>
                    <button
                      onClick={() => { setFilterStatus('all'); setActiveTab('applications'); }}
                      className="text-[10px] text-brand-primary font-bold hover:underline flex items-center gap-0.5"
                    >
                      View All <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  {(() => {
                    const recent = [...applications]
                      .sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at))
                      .slice(0, 5);
                    if (recent.length === 0) {
                      return (
                        <div className="py-10 flex flex-col items-center justify-center text-center">
                          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mb-3">
                            <FileText className="w-6 h-6 text-brand-primary/50" />
                          </div>
                          <h4 className="font-bold text-brand-textPrimary text-sm">No Applications Yet</h4>
                          <p className="text-xs text-brand-textSecondary mt-1">Applications will appear here once candidates apply.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {recent.map(app => (
                          <div key={app.id} className="flex items-center justify-between p-3 bg-brand-bg/40 hover:bg-brand-panelLight border border-brand-border/50 rounded-xl transition-all group">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-xs shrink-0">
                                {app.candidate_name?.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-brand-textPrimary text-xs truncate">{app.candidate_name}</h4>
                                <p className="text-[10px] text-brand-textSecondary truncate">{app.job_title} · {getRelativeTime(app.applied_at)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {getStatusBadge(app.status, !!app.match_score)}
                              <button
                                onClick={() => handleOpenAppDetails(app)}
                                title="Quick View"
                                className="p-1.5 bg-brand-panel hover:bg-brand-primary/10 border border-brand-border rounded-lg text-brand-textSecondary hover:text-brand-primary transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

              </div>

              {/* Right Column: Pending Tasks, Insights, Top Candidates, Timeline, Campaigns & Live Activity (col-span-1) */}
              <div className="space-y-5">
                
                {/* 1. Pending Tasks */}
                <div className="glass-panel border border-brand-border rounded-3xl p-5 shadow-premium flex flex-col">
                  <h3 className="text-base font-extrabold text-brand-textPrimary flex items-center gap-2 mb-4 border-b border-brand-border/45 pb-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-primary" /> Pending Tasks
                  </h3>
                  {(() => {
                    const tasks = pendingTasksList;
                    const displayTasks = tasks.slice(0, 7);

                    if (displayTasks.length === 0) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-brand-success/10 border border-brand-success/20 flex items-center justify-center text-2xl mb-3">
                            ✅
                          </div>
                          <h4 className="font-bold text-brand-textPrimary text-sm">You're All Caught Up!</h4>
                          <p className="text-xs text-brand-textSecondary mt-1 max-w-[180px]">No pending tasks right now. Check back after candidates apply.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3 flex-1">
                        {displayTasks.map((task, i) => (
                          <div
                            key={i}
                            onClick={task.onClick}
                            className="flex items-center justify-between p-3.5 bg-brand-bg/40 hover:bg-brand-panelLight border border-brand-border/60 hover:border-brand-primary/30 rounded-2xl transition-all duration-200 cursor-pointer group"
                          >
                            <div className="flex items-start gap-2.5 min-w-0 pr-2">
                              <span className="text-base shrink-0">{task.icon}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${task.badgeColor}`}>{task.badge}</span>
                                </div>
                                <h4 className="font-bold text-brand-textPrimary text-xs truncate group-hover:text-brand-primary transition-colors">{task.title}</h4>
                                <p className="text-[10px] text-brand-textSecondary truncate">{task.desc}</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-brand-primary font-bold shrink-0 flex items-center gap-0.5">
                              {task.btnText} <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        ))}
                        {tasks.length > 7 && (
                          <p className="text-[10px] text-brand-textSecondary text-center">+{tasks.length - 7} more tasks</p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* 2. Today's Insights */}
                {(() => {
                  const { newApps, awaitCount, intCount, maxScore } = todayInsights;
                  return (
                    <div className="glass-panel border border-brand-border rounded-3xl p-5 shadow-premium">
                      <div className="flex justify-between items-center mb-4 border-b border-brand-border/45 pb-3">
                        <h3 className="text-sm font-extrabold text-brand-textPrimary flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-brand-accent animate-pulse" /> Today's Insights
                        </h3>
                        <span className="text-[9px] bg-brand-accent/10 text-brand-accent border border-brand-accent/20 px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider">
                          AI Insights
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-brand-bg/40 border border-brand-border/60 rounded-xl space-y-1">
                          <span className="text-[10px] text-brand-textSecondary font-bold uppercase tracking-wider block">New Apps</span>
                          <strong className="text-sm text-brand-primary font-black block">{newApps} Received</strong>
                          <span className="text-[8px] text-brand-textSecondary block">Last 7 days</span>
                        </div>
                        <div className="p-3 bg-brand-bg/40 border border-brand-border/60 rounded-xl space-y-1">
                          <span className="text-[10px] text-brand-textSecondary font-bold uppercase tracking-wider block">Needs Eval</span>
                          <strong className="text-sm text-brand-warning font-black block">{awaitCount} Candidates</strong>
                          <span className="text-[8px] text-brand-textSecondary block">Awaiting AI run</span>
                        </div>
                        <div className="p-3 bg-brand-bg/40 border border-brand-border/60 rounded-xl space-y-1">
                          <span className="text-[10px] text-brand-textSecondary font-bold uppercase tracking-wider block">Interviews</span>
                          <strong className="text-sm text-brand-accent font-black block">{intCount} Scheduled</strong>
                          <span className="text-[8px] text-brand-textSecondary block">Upcoming</span>
                        </div>
                        <div className="p-3 bg-brand-bg/40 border border-brand-border/60 rounded-xl space-y-1">
                          <span className="text-[10px] text-brand-textSecondary font-bold uppercase tracking-wider block">Top Match</span>
                          <strong className="text-sm text-brand-success font-black block">{maxScore > 0 ? `${maxScore}%` : '—'}</strong>
                          <span className="text-[8px] text-brand-textSecondary block">Highest score</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Top Candidates */}
                <div className="glass-panel border border-brand-border rounded-3xl p-5 shadow-premium">
                  <div className="flex justify-between items-center mb-3 border-b border-brand-border/45 pb-2">
                    <h3 className="text-sm font-extrabold text-brand-textPrimary flex items-center gap-2">
                      <Award className="w-5 h-5 text-brand-accent" /> Top Candidates
                    </h3>
                  </div>
                  {(() => {
                    const topCand = sidebarTopCandidates;
                    
                    if (topCand.length === 0) {
                      return (
                        <div className="py-4 text-center text-xs text-brand-textSecondary italic">
                          No evaluations calculated yet.
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {topCand.map((app, idx) => {
                          const score = Math.round(app.match_score.final_score);
                          return (
                            <div 
                              key={app.id} 
                              onClick={() => handleOpenAppDetails(app)}
                              className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-brand-border/60 hover:border-brand-primary/45 transition-all cursor-pointer shadow-sm group"
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <span className="text-[10px] font-black w-4 text-brand-primary">#{idx + 1}</span>
                                <span className="font-bold text-brand-textPrimary text-xs truncate group-hover:text-brand-primary transition-colors">{app.candidate_name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[9px] text-brand-textSecondary truncate max-w-[5rem]">{app.job_title}</span>
                                <strong className="text-xs text-brand-success font-extrabold">{score}%</strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* 4. Recent Activity Timeline */}
                <div className="glass-panel border border-brand-border rounded-3xl p-5 shadow-premium">
                  <div className="flex justify-between items-center mb-3 border-b border-brand-border/45 pb-2">
                    <h3 className="text-sm font-extrabold text-brand-textPrimary flex items-center gap-2">
                      <Clock className="w-5 h-5 text-brand-primary" /> Recent Activity
                    </h3>
                  </div>
                  
                  {(() => {
                    const activities = activityTimeline;
                    if (activities.length === 0) {
                      return (
                        <div className="py-6 text-center text-xs text-brand-textSecondary">
                          No recent activities recorded.
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-3.5 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-brand-border/60">
                        {activities.map((act, idx) => {
                          const Icon = act.icon;
                          return (
                            <div key={idx} className="flex gap-2.5 items-start relative z-10">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border border-brand-border/30 ${act.iconColor}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-semibold text-brand-textPrimary leading-tight">{act.text}</p>
                                <span className="text-[8px] text-brand-textSecondary mt-0.5 block">{getRelativeTime(act.time)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* 5. Active Campaigns */}
                <div className="glass-panel border border-brand-border rounded-3xl p-5 shadow-premium">
                  <div className="flex justify-between items-center mb-3 border-b border-brand-border/45 pb-2">
                    <h3 className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-4.5 h-4.5 text-brand-primary" /> Active Campaigns
                    </h3>
                    <span className="text-[9px] bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2 py-0.5 rounded-lg font-bold">
                      {jobs.filter(j => j.status === 'open').length} Active
                    </span>
                  </div>

                  {jobs.filter(j => j.status === 'open').length === 0 ? (
                    <div className="py-8 px-4 text-center text-brand-textSecondary bg-slate-50/40 border border-brand-border/50 rounded-2xl border-dashed flex flex-col items-center justify-center space-y-3">
                      <Briefcase className="w-8 h-8 text-brand-border/80" />
                      <div className="space-y-1">
                        <h4 className="font-bold text-brand-textPrimary text-xs">No active job campaigns</h4>
                        <p className="text-[10px] text-brand-textSecondary max-w-[200px] mx-auto leading-normal">Create your first job campaign to start receiving and evaluating candidate resumes.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {jobs.filter(j => j.status === 'open').slice(0, 2).map((job) => {
                        const jobApps = applications.filter(a => a.job_id === job.id);
                        const pendingCount = jobApps.filter(a => !a.match_score).length;
                        const shortlistedCount = jobApps.filter(a => a.status === 'shortlisted').length;
                        return (
                          <div 
                            key={job.id} 
                            className="p-3 bg-brand-panel hover:bg-slate-55 border border-brand-border/60 hover:border-brand-primary/40 rounded-2xl transition-all duration-300 space-y-2.5 shadow-sm"
                          >
                            <div className="flex justify-between items-start min-w-0 gap-2">
                              <h4 className="font-bold text-brand-textPrimary text-xs truncate" title={job.title}>{job.title}</h4>
                              <span className="text-[8px] bg-brand-success/10 border border-brand-success/20 text-brand-success font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0">
                                Active
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-center bg-slate-50/50 p-1.5 rounded-xl border border-brand-border/40">
                              <div>
                                <span className="text-[8px] text-brand-textSecondary uppercase block font-semibold">Total</span>
                                <strong className="text-xs text-brand-textPrimary font-bold block">{jobApps.length}</strong>
                              </div>
                              <div>
                                <span className="text-[8px] text-brand-textSecondary uppercase block font-semibold">Pending</span>
                                <strong className={`text-xs font-bold block ${pendingCount > 0 ? 'text-brand-warning animate-pulse' : 'text-brand-textSecondary'}`}>
                                  {pendingCount}
                                </strong>
                              </div>
                              <div>
                                <span className="text-[8px] text-brand-textSecondary uppercase block font-semibold">Starred</span>
                                <strong className="text-xs text-brand-accent font-bold block">{shortlistedCount}</strong>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 pt-0.5">
                              <button
                                onClick={() => setDashboardSearch(job.title)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-brand-textPrimary text-[9px] font-bold py-1.5 rounded-lg transition-all border border-brand-border/40"
                              >
                                Quick View
                              </button>
                              {pendingCount > 0 && (
                                <button
                                  onClick={() => handleOpenEvaluationModal(job)}
                                  className="flex-1 bg-brand-primary text-white hover:opacity-90 text-[9px] font-bold py-1.5 rounded-lg transition-all shadow-sm"
                                >
                                  Evaluate ({pendingCount})
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 6. Live Activity Feed */}
                <div className="glass-panel border border-brand-border rounded-3xl p-5 shadow-premium flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4 border-b border-brand-border/45 pb-3">
                      <h3 className="text-base font-extrabold text-brand-textPrimary flex items-center gap-2">
                        <Bell className="w-5 h-5 text-brand-primary" /> Live Activity Feed
                      </h3>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-success"></span>
                      </span>
                    </div>

                    <div className="relative border-l border-brand-border/80 ml-2.5 pl-6 space-y-4 max-h-[32rem] overflow-y-auto pr-1">
                      {(() => {
                        const sortedFeed = liveActivityFeed;

                        if (sortedFeed.length === 0) {
                          return (
                            <p className="text-xs text-brand-textSecondary italic py-4">No recent activity detected.</p>
                          );
                        }

                        return sortedFeed.map((act, i) => (
                          <div 
                            key={i} 
                            onClick={() => handleOpenAppDetails(act.app)}
                            className="relative group cursor-pointer hover:bg-slate-50 p-2 rounded-xl border border-transparent hover:border-brand-border/40 transition-all duration-300"
                          >
                            {/* Dot */}
                            <span className={`absolute -left-[31px] top-4.5 w-2.5 h-2.5 rounded-full border-2 border-white ring-4 ring-brand-bg ${act.color}`}></span>
                            
                            <span className="text-[9px] text-brand-textSecondary font-semibold block uppercase tracking-wider">{getRelativeTime(act.timestamp)}</span>
                            <p className="text-xs font-bold text-brand-textPrimary mt-0.5 group-hover:text-brand-primary transition-colors">{act.message}</p>
                            <p className="text-[11px] text-brand-textSecondary mt-0.5 leading-relaxed">{act.detail}</p>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </>
        )}
      </div>
    )}

        {/* TAB 2: MY JOB POSTS */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-brand-textPrimary tracking-tight">Active Job Posts</h1>
                <p className="text-brand-textSecondary mt-1">Manage active vacancies, change deadlines, or toggle open status.</p>
              </div>
              <button 
                onClick={() => navigate('/jobs/create')}
                className="bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-premium transition-all"
              >
                <Plus className="w-4 h-4" /> Post a Job
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="glass-panel border border-brand-border/60 rounded-3xl p-16 text-center text-brand-textSecondary flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto shadow-premium bg-brand-panel">
                <div className="relative">
                  <div className="absolute inset-0 bg-brand-primary/10 rounded-full blur-xl animate-pulse"></div>
                  <div className="w-16 h-16 rounded-3xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20 relative z-10">
                    <Briefcase className="w-8 h-8 text-brand-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-brand-textPrimary">No Jobs Created Yet</h3>
                  <p className="text-xs text-brand-textSecondary max-w-sm leading-relaxed">
                    You haven’t created any jobs yet. Create your first job to start receiving applications.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/jobs/create')}
                  className="bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-glow transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Create Job
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {jobs.map(job => {
                  const expired = isJobExpired(job);
                  const activeAppsCount = applications.filter(a => a.job_id === job.id).length;
                  
                  return (
                    <div 
                      key={job.id} 
                      onClick={() => setSelectedJob(job)}
                      className="glass-panel border border-brand-border rounded-2xl p-6 flex flex-col justify-between hover:border-brand-primary/50 transition-all duration-300 cursor-pointer"
                    >
                      <div>
                        <div>
                          {/* Company Logo in Job Card */}
                          <div className="flex items-center gap-2 mb-2">
                            {user?.company_logo_path ? (
                              <img
                                src={(() => {
                                  const apiBase = API.defaults.baseURL || 'http://localhost:5000/api';
                                  const hostBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
                                  return `${hostBase}/api/recruiter/logo/${user.id}?t=${encodeURIComponent(user.company_logo_path)}`;
                                })()}
                                alt=""
                                className="w-8 h-8 rounded-lg object-contain border border-brand-border/40 bg-brand-bg shrink-0"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            {!user?.company_logo_path && (
                              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-xs shrink-0">
                                {(user?.company || user?.name || 'C')[0].toUpperCase()}
                              </div>
                            )}
                            {user?.company_logo_path && (
                              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-xs shrink-0" style={{ display: 'none' }}>
                                {(user?.company || user?.name || 'C')[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          <h3 className="text-xl font-bold text-brand-textPrimary mb-3">{job.title}</h3>
                          {/* Pipeline Stepper */}
                          <div className="flex items-center gap-1 select-none flex-wrap">
                            {(() => {
                              const isClosed = expired || job.status === 'closed';
                              const isEvaluated = job.evaluation_status === 'evaluated';
                              const hasResults = job.results_generated;
                              const steps = [
                                { label: 'Open', done: true, active: !isClosed },
                                { label: 'Closed', done: isClosed, active: isClosed && !isEvaluated },
                                { label: 'Evaluated', done: isEvaluated, active: isEvaluated && !hasResults },
                                { label: 'Results', done: hasResults, active: hasResults },
                              ];
                              return steps.map((step, idx) => (
                                <React.Fragment key={idx}>
                                  {idx > 0 && (
                                    <div className={`w-3 h-px flex-shrink-0 ${step.done ? 'bg-brand-primary' : 'bg-brand-border/50'}`} />
                                  )}
                                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border transition-all whitespace-nowrap ${
                                    step.active
                                      ? 'bg-brand-primary/15 border-brand-primary/40 text-brand-primary shadow-sm'
                                      : step.done
                                        ? 'bg-brand-success/10 border-brand-success/25 text-brand-success/80'
                                        : 'bg-brand-bg/40 border-brand-border/30 text-brand-textSecondary/50'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                      step.active ? 'bg-brand-primary animate-pulse' : step.done ? 'bg-brand-success/70' : 'bg-brand-border/40'
                                    }`} />
                                    {step.label}
                                  </div>
                                </React.Fragment>
                              ));
                            })()}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-brand-textSecondary mt-2">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location || 'Remote'}</span>
                          <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> {job.experience_required}+ Yrs Required</span>
                          {job.evaluation_status === 'evaluated' && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                              job.evaluation_strategy === 'quick'
                                ? 'bg-brand-warning/10 border-brand-warning/20 text-brand-warning'
                                : 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'
                            }`}>
                              {job.evaluation_strategy === 'quick' ? '⚡ Quick' : '🧠 Intelligent'}
                            </span>
                          )}
                          {job.scores_outdated && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-brand-danger/10 border-brand-danger/20 text-brand-danger animate-pulse">
                              ⚠ Scores Outdated
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-brand-textSecondary mt-4 line-clamp-3 leading-relaxed">{job.description}</p>
                        
                        <div className="flex flex-wrap gap-1.5 mt-4">
                          {job.skills_required.map((skill, sIdx) => (
                            <span key={sIdx} className="text-xs bg-brand-bg border border-brand-border px-2 py-0.5 rounded text-brand-textSecondary">
                              {skill}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-brand-border/40 space-y-2">
                          <div className="flex justify-between items-center text-xs text-brand-textSecondary">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-brand-primary" /> Deadline: {formatDate(job.deadline)}</span>
                            <span className="flex items-center gap-1 font-semibold text-brand-textPrimary">{activeAppsCount} Applicants</span>
                          </div>
                          {activeAppsCount > 0 && (
                            <div className="flex items-center gap-3 text-[10px] font-bold">
                              <span className="flex items-center gap-1 text-brand-success">
                                <CheckCircle className="w-3 h-3" />
                                {applications.filter(a => a.job_id === job.id && (a.status === 'shortlisted' || a.status === 'selected' || a.status === 'approved')).length} Shortlisted
                              </span>
                              <span className="flex items-center gap-1 text-brand-danger">
                                <XCircle className="w-3 h-3" />
                                {applications.filter(a => a.job_id === job.id && a.status === 'rejected').length} Rejected
                              </span>
                              <span className="flex items-center gap-1 text-brand-secondary">
                                <Clock className="w-3 h-3" />
                                {applications.filter(a => a.job_id === job.id && a.status === 'interview').length} Interview
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Pre-evaluation info when closed but not yet evaluated */}
                        {(expired || job.status === 'closed') && job.evaluation_status !== 'evaluated' && activeAppsCount > 0 && (
                          <div className="mt-4 pt-4 border-t border-brand-border/40 bg-brand-bg/25 p-4 rounded-xl border border-brand-border/30">
                            <div className="flex items-center gap-1.5 mb-3">
                              <AlertTriangle className="w-3.5 h-3.5 text-brand-warning" />
                              <h4 className="text-xs font-bold text-brand-warning uppercase tracking-wider">Awaiting Evaluation</h4>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center select-none">
                              <div className="bg-brand-bg/40 p-2.5 rounded-lg border border-brand-border/40">
                                <span className="text-[9px] text-brand-textSecondary uppercase font-semibold block">Applications</span>
                                <strong className="text-sm text-brand-textPrimary mt-0.5 block">{activeAppsCount}</strong>
                              </div>
                              <div className="bg-brand-bg/40 p-2.5 rounded-lg border border-brand-border/40">
                                <span className="text-[9px] text-brand-textSecondary uppercase font-semibold block">Deadline</span>
                                <strong className="text-[10px] text-brand-danger mt-0.5 block">Passed</strong>
                              </div>
                              <div className="bg-brand-bg/40 p-2.5 rounded-lg border border-brand-border/40">
                                <span className="text-[9px] text-brand-textSecondary uppercase font-semibold block">Evaluation</span>
                                <strong className="text-[10px] text-brand-warning mt-0.5 block">Pending</strong>
                              </div>
                            </div>
                            <p className="text-[10px] text-brand-textSecondary mt-3 italic">Click "Generate Evaluation" below to score and rank all {activeAppsCount} candidates.</p>
                          </div>
                        )}

                        {job.evaluation_status === 'evaluated' && job.pool_analysis && (
                          <div className="mt-4 pt-4 border-t border-brand-border/40 space-y-4 bg-brand-bg/25 p-4 rounded-xl border border-brand-border/30">
                            {job.scores_outdated && (
                              <div className="bg-brand-danger/10 border border-brand-danger/25 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 select-none mb-2">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-brand-danger" />
                                  <span className="text-[11px] font-bold text-brand-danger">Evaluation results are outdated due to changes in criteria.</span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEvaluationModal(job);
                                  }}
                                  className="bg-brand-danger text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-all shadow-sm shrink-0"
                                >
                                  Re-evaluate Candidates
                                </button>
                              </div>
                            )}
                            
                            {/* Evaluation Metadata Display */}
                            {job.evaluated_at && (
                              <div className="bg-brand-bg/50 p-3 rounded-lg border border-brand-border/40 text-[10px] space-y-1.5 select-none text-brand-textSecondary mb-2">
                                <div className="flex justify-between">
                                  <span>Last Evaluated:</span>
                                  <strong className="text-brand-textPrimary font-bold">
                                    {new Date(job.evaluated_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                  </strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>Strategy:</span>
                                  <strong className="text-brand-primary font-bold">
                                    {job.evaluation_strategy === 'quick' ? '⚡ Quick Evaluation' : '🧠 Intelligent Evaluation'}
                                  </strong>
                                </div>
                                {job.evaluated_by && (
                                  <div className="flex justify-between">
                                    <span>Evaluated By:</span>
                                    <strong className="text-brand-textPrimary font-semibold">{job.evaluated_by}</strong>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-bold text-brand-secondary uppercase tracking-wider flex items-center gap-1.5 select-none">
                                <BarChart3 className="w-3.5 h-3.5 text-brand-secondary" />
                                {job.evaluation_strategy === 'quick' ? 'Quick Match Pool Analysis' : 'AI Pool Analysis & Metrics'}
                              </h4>
                              {job.results_generated && (
                                <span className="bg-brand-success/15 border border-brand-success/35 text-brand-success text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded select-none animate-pulse">
                                  Results Generated
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center select-none">
                              <div className="bg-brand-bg/40 p-2.5 rounded-lg border border-brand-border/40">
                                <span className="text-[9px] text-brand-textSecondary uppercase font-semibold">Avg Score</span>
                                <strong className="block text-sm text-brand-textPrimary mt-0.5">{job.pool_analysis.average_score}%</strong>
                              </div>
                              <div className="bg-brand-bg/40 p-2.5 rounded-lg border border-brand-border/40">
                                <span className="text-[9px] text-brand-textSecondary uppercase font-semibold">High / Low</span>
                                <strong className="block text-sm text-brand-textPrimary mt-0.5">{job.pool_analysis.highest_score}% / {job.pool_analysis.lowest_score}%</strong>
                              </div>
                              <div className="bg-brand-bg/40 p-2.5 rounded-lg border border-brand-primary/30 bg-brand-primary/5">
                                <span className="text-[9px] text-brand-textSecondary uppercase font-semibold">AI Threshold</span>
                                <strong className="block text-sm text-brand-primary mt-0.5">{job.min_match_score || job.pool_analysis.recommended_threshold}%</strong>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[9px] text-brand-textSecondary uppercase font-bold tracking-wider select-none">AI Executive Summary</span>
                              <p className="text-xs text-brand-textSecondary leading-relaxed bg-brand-bg/40 p-3 rounded-lg border border-brand-border/30 italic">
                                "{job.pool_analysis.ai_summary}"
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-1">
                              <div>
                                <span className="text-[9px] text-brand-success uppercase font-semibold block mb-1 select-none">Top Skills Found</span>
                                <div className="flex flex-wrap gap-1">
                                  {job.pool_analysis.top_skills_found && job.pool_analysis.top_skills_found.length > 0 ? (
                                    job.pool_analysis.top_skills_found.map((s, idx) => (
                                      <span key={idx} className="text-[9px] bg-brand-success/10 border border-brand-success/20 text-brand-success px-2 py-0.5 rounded font-semibold">{s}</span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-brand-textSecondary italic">None</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <span className="text-[9px] text-brand-danger uppercase font-semibold block mb-1 select-none">Most Missing Skills</span>
                                <div className="flex flex-wrap gap-1">
                                  {job.pool_analysis.most_missing_skills && job.pool_analysis.most_missing_skills.length > 0 ? (
                                    job.pool_analysis.most_missing_skills.map((s, idx) => (
                                      <span key={idx} className="text-[9px] bg-brand-danger/10 border border-brand-danger/20 text-brand-danger px-2 py-0.5 rounded font-semibold">{s}</span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-brand-textSecondary italic">None</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-[11px] text-brand-textSecondary flex justify-between items-center bg-brand-bg/40 px-3 py-2 rounded-lg border border-brand-border/40 select-none">
                              <span>AI Recommends Shortlisting: <strong className="text-brand-textPrimary">{job.pool_analysis.recommended_count}</strong> candidates</span>
                              <span>Target Threshold: <strong className="text-brand-primary">{job.min_match_score || job.pool_analysis.recommended_threshold}%</strong></span>
                            </div>

                            <div className="pt-2 border-t border-brand-border/30 flex items-center justify-between gap-4">
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs text-brand-textSecondary italic select-none">
                                  {job.results_generated 
                                    ? "Shortlist generated and active." 
                                    : "Commit shortlist results to selected candidates."}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewJob(job);
                                    setPreviewThreshold(job.min_match_score || job.pool_analysis?.recommended_threshold || 70);
                                    setPreviewMaxCandidates("");
                                    setPreviewModalOpen(true);
                                  }}
                                  className="bg-brand-secondary hover:bg-brand-secondary/95 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-lg shadow-premium transition-all"
                                >
                                  {job.results_generated ? "Modify Shortlist" : "Generate Shortlist"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 pt-4 border-t border-brand-border/40 flex justify-between items-center gap-2">
                        <div>
                          {job.evaluation_status === 'evaluating' ? (
                            <button
                              disabled
                              onClick={(e) => e.stopPropagation()}
                              className="bg-brand-panelLight border border-brand-border/60 text-brand-textSecondary opacity-75 px-4 py-2 rounded-xl text-xs font-semibold cursor-not-allowed flex items-center gap-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-warning animate-ping"></span>
                              Evaluating...
                            </button>
                          ) : job.evaluation_status === 'evaluated' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewJob(job);
                                  setPreviewThreshold(job.min_match_score || job.pool_analysis?.recommended_threshold || 70);
                                  setPreviewMaxCandidates("");
                                  setPreviewModalOpen(true);
                                }}
                                className="bg-gradient-to-r from-brand-secondary to-indigo-600 hover:opacity-95 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-premium"
                              >
                                {job.results_generated ? "Modify Shortlist" : "Generate Shortlist"}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEvaluationModal(job);
                                }}
                                className="bg-brand-panel hover:bg-brand-panelLight border border-brand-border text-brand-textPrimary px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                              >
                                Re-evaluate
                              </button>
                            </div>
                          ) : expired || job.status === 'closed' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEvaluationModal(job);
                              }}
                              className="bg-brand-primary hover:bg-brand-primary/95 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-premium"
                            >
                              Generate Evaluation
                            </button>
                          ) : (
                            <button
                              disabled
                              onClick={(e) => e.stopPropagation()}
                              title="Applications are still active. Evaluation will unlock after deadline or when status is closed."
                              className="bg-brand-panelLight border border-brand-border/60 text-brand-textSecondary opacity-50 px-4 py-2 rounded-xl text-xs font-semibold cursor-not-allowed"
                            >
                              Evaluation Locked
                            </button>
                          )}
                          {job.scores_outdated && job.evaluation_status === 'evaluated' && (
                            <span className="text-[9px] text-brand-danger font-semibold italic ml-2">Strategy changed — re-evaluate to update scores</span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleJobStatus(job);
                            }}
                            className="bg-brand-panel hover:bg-brand-panelLight border border-brand-border px-4 py-2 rounded-xl text-xs font-semibold text-brand-textSecondary hover:text-brand-textPrimary transition-all"
                          >
                            {job.status === 'open' ? 'Close Job' : 'Re-open Job'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteJob(job.id);
                            }}
                            className="bg-brand-danger/10 border border-brand-danger/20 hover:bg-brand-danger/20 text-brand-danger px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CREATE JOB POST */}
        {activeTab === 'create' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-brand-textPrimary tracking-tight">Create Job Posting</h1>
              <p className="text-brand-textSecondary mt-1">Submit new details to launch dynamic screening for the role.</p>
            </div>

            <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 md:p-8">
              {jobSuccess && (
                <div className="mb-6 bg-brand-success/10 border border-brand-success/20 text-brand-success p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 shrink-0" /> {jobSuccess}
                </div>
              )}
              {jobError && (
                <div className="mb-6 bg-brand-danger/10 border border-brand-danger/20 text-brand-danger p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" /> {jobError}
                </div>
              )}

              <form onSubmit={handleCreateJob} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-textSecondary mb-2">Job Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Software Engineer"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary focus:outline-none focus:border-brand-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-textSecondary mb-2">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Remote / New York"
                      value={jobLocation}
                      onChange={(e) => setJobLocation(e.target.value)}
                      className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-textSecondary mb-2">Experience Required (Years)</label>
                    <input
                      type="number"
                      min="0"
                      value={jobExp}
                      onChange={(e) => setJobExp(e.target.value)}
                      className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-textSecondary mb-2">Application Deadline</label>
                    <input
                      type="date"
                      value={jobDeadline}
                      onChange={(e) => setJobDeadline(e.target.value)}
                      className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary focus:outline-none focus:border-brand-primary text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-textSecondary mb-2">Required Skills (Comma separated) *</label>
                  <input
                    type="text"
                    placeholder="e.g. Python, React, SQL, Flask"
                    value={jobSkills}
                    onChange={(e) => setJobSkills(e.target.value)}
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-textSecondary mb-2">Job Description *</label>
                  <textarea
                    rows="5"
                    placeholder="Provide comprehensive details about the role, key responsibilities, and benefits..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary focus:outline-none focus:border-brand-primary resize-none"
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={jobLoading}
                  className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white py-3 rounded-xl font-semibold shadow-premium flex items-center justify-center gap-2 transition-all"
                >
                  {jobLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Publish Job Post'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: ALL APPLICATIONS */}
        {activeTab === 'applications' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-brand-textPrimary tracking-tight">Master Candidate Evaluation</h1>
              <p className="text-brand-textSecondary mt-1">Review the complete applicant list and adjust screening filters dynamically.</p>
            </div>
            {jobs.length === 0 ? (
              renderEmptyState()
            ) : (
              <>
                {renderFilterPanel()}
                {renderCandidateTable(getFilteredApps(null), "No applicants currently match the selected job or query filters.")}
              </>
            )}
          </div>
        )}

        {/* TAB 8: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h1 className="text-3xl font-bold text-brand-textPrimary tracking-tight">System Logs & Notifications</h1>
              <p className="text-brand-textSecondary mt-1">Stay updated with latest applications, resume uploads, and scoring evaluations.</p>
            </div>

            <div className="glass-panel border border-brand-border/60 rounded-2xl overflow-hidden divide-y divide-brand-border/40">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-brand-textSecondary">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-brand-border/60" />
                  <p className="text-lg font-semibold text-brand-textPrimary">All caught up!</p>
                  <p className="text-sm mt-1">No alerts or candidate logs registered.</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} className={`p-5 flex items-start justify-between gap-4 transition-colors ${!notif.is_read ? 'bg-brand-primary/5 border-l-4 border-brand-primary' : ''}`}>
                    <div className="space-y-1">
                      <p className={`text-sm ${!notif.is_read ? 'text-brand-textPrimary font-semibold' : 'text-brand-textSecondary'}`}>
                        {notif.message}
                      </p>
                      <span className="text-xs text-brand-textSecondary block">
                        Logged on: {formatDate(notif.created_at || notif.timestamp)}
                      </span>
                    </div>
                    {!notif.is_read && (
                      <button 
                        onClick={() => markNotifRead(notif.id)}
                        className="text-xs bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary px-3 py-1 rounded-lg border border-brand-primary/20 font-bold transition-all"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 9: RECRUITER PROFILE */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-brand-textPrimary tracking-tight">Recruiter Profile</h1>
              <p className="text-brand-textSecondary mt-1">Manage your professional and company information.</p>
            </div>

            {profileSuccess && (
              <div className="bg-brand-success/10 border border-brand-success/20 text-brand-success p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 shrink-0" /> {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" /> {profileError}
              </div>
            )}

            {/* Company Logo */}
            <div className="glass-panel border border-brand-border/60 rounded-2xl p-6">
              <h3 className="text-base font-bold text-brand-textPrimary flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-brand-primary" /> Company Logo
              </h3>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {companyLogoUrl ? (
                    <img src={companyLogoUrl} alt="Company Logo" className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-border" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-brand-primary/10 border-2 border-brand-primary/20 flex items-center justify-center text-brand-primary font-black text-2xl animate-pulse">
                      {(user?.company || profileData.company || user?.name || 'R')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    id="logo-upload-input"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
                      if (!allowedTypes.includes(file.type)) {
                        alert('Invalid file type. Please upload a JPG, PNG, WEBP, or GIF image.');
                        return;
                      }
                      setLogoUploading(true);
                      try {
                        const formData = new FormData();
                        formData.append('logo', file);
                        await API.post('/recruiter/upload-logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                        
                        // Refresh auth session
                        if (checkAuth) {
                          await checkAuth();
                        }
                        
                        // Re-sync image URL
                        const apiBase = API.defaults.baseURL || 'http://localhost:5000/api';
                        const hostBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
                        const newUrl = `${hostBase}/api/recruiter/logo/${user.id}?t=${Date.now()}`;
                        setCompanyLogoUrl(newUrl);
                        
                        setProfileSuccess('Logo uploaded successfully!');
                        setTimeout(() => setProfileSuccess(''), 4000);
                      } catch (err) {
                        alert('Failed to upload logo: ' + (err.response?.data?.message || err.message));
                      } finally {
                        setLogoUploading(false);
                      }
                    }}
                  />
                  <label
                    htmlFor="logo-upload-input"
                    className="cursor-pointer inline-flex items-center gap-2 text-xs bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/25 px-4 py-2 rounded-xl font-bold transition-all shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {logoUploading ? 'Uploading...' : 'Upload Logo'}
                  </label>
                  <p className="text-[10px] text-brand-textSecondary">JPG, PNG, WEBP, GIF. Displayed on job cards and candidate portal.</p>
                </div>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setProfileSuccess('');
                setProfileError('');
                try {
                  // Call new backend PUT route
                  await API.put('/recruiter/profile', {
                    name: profileData.name,
                    company: profileData.company,
                    phone: profileData.phone,
                    company_website: profileData.company_website,
                    company_description: profileData.company_description,
                    industry: profileData.industry,
                    company_type: profileData.company_type,
                    company_size: profileData.company_size,
                    established_year: profileData.established_year,
                    headquarters: profileData.headquarters,
                    company_address: profileData.company_address,
                    hr_contact_email: profileData.hr_contact_email,
                    linkedin_url: profileData.linkedin_url,
                    twitter_url: profileData.twitter_url,
                    default_eval_strategy: profileData.default_eval_strategy
                  });
                  
                  // Keep rest in local storage for fields not in DB user schema
                  localStorage.setItem(`recruiter_profile_${user?.id}`, JSON.stringify(profileData));
                  
                  // Refresh auth context so it propagates to header/navbar immediately
                  if (checkAuth) {
                    await checkAuth();
                  }
                  
                  setProfileSuccess('Profile saved successfully!');
                  setTimeout(() => setProfileSuccess(''), 4000);
                } catch (err) {
                  setProfileError(err.response?.data?.message || 'Failed to save profile settings.');
                }
              }}
              className="space-y-6"
            >
              {/* Personal Info */}
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-brand-textPrimary flex items-center gap-2">
                  <User className="w-5 h-5 text-brand-primary" /> Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name', key: 'name', placeholder: 'Your full name' },
                    { label: 'Email Address', key: 'email', placeholder: 'your@email.com', readOnly: true },
                    { label: 'Title / Designation', key: 'title', placeholder: 'e.g. Senior HR Manager' },
                    { label: 'Phone Number', key: 'phone', placeholder: '+91 9876543210' },
                  ].map(field => (
                    <div key={field.key} className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary">{field.label}</label>
                      <input
                        type="text"
                        value={profileData[field.key] || ''}
                        onChange={e => setProfileData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        readOnly={field.readOnly}
                        className={`block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary placeholder-brand-textSecondary/50 focus:outline-none focus:border-brand-primary text-sm transition-all ${
                          field.readOnly ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary">Short Bio</label>
                  <textarea
                    rows={3}
                    value={profileData.bio || ''}
                    onChange={e => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell candidates a bit about yourself..."
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary placeholder-brand-textSecondary/50 focus:outline-none focus:border-brand-primary text-sm transition-all resize-none"
                  />
                </div>
              </div>

              {/* Company Details */}
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-brand-textPrimary flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand-secondary" /> Company Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Company Name', key: 'company', placeholder: 'e.g. TechCorp India' },
                    { label: 'Company Website', key: 'company_website', placeholder: 'https://company.com' },
                    { label: 'Industry', key: 'industry', placeholder: 'e.g. Software, Finance, Healthcare' },
                    { label: 'HR Contact Email', key: 'hr_contact_email', placeholder: 'hr@company.com' },
                    { label: 'Established Year', key: 'established_year', placeholder: 'e.g. 2015' },
                    { label: 'Office / Headquarters', key: 'headquarters', placeholder: 'e.g. Bangalore, India' },
                  ].map(field => (
                    <div key={field.key} className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary">{field.label}</label>
                      <input
                        type="text"
                        value={profileData[field.key] || ''}
                        onChange={e => setProfileData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary placeholder-brand-textSecondary/50 focus:outline-none focus:border-brand-primary text-sm transition-all"
                      />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary">Company Type</label>
                    <select
                      value={profileData.company_type || ''}
                      onChange={e => setProfileData(prev => ({ ...prev, company_type: e.target.value }))}
                      className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary focus:outline-none focus:border-brand-primary text-sm transition-all"
                    >
                      <option value="">Select type...</option>
                      {['Startup', 'Product', 'Service', 'MNC', 'Consultancy', 'Government', 'NGO'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary">Company Size</label>
                    <select
                      value={profileData.company_size || ''}
                      onChange={e => setProfileData(prev => ({ ...prev, company_size: e.target.value }))}
                      className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary focus:outline-none focus:border-brand-primary text-sm transition-all"
                    >
                      <option value="">Select size...</option>
                      {['1–10', '11–50', '51–200', '201–1000', '1000+'].map(s => (
                        <option key={s} value={s}>{s} employees</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary">Company Description</label>
                  <textarea
                    rows={3}
                    value={profileData.company_description || ''}
                    onChange={e => setProfileData(prev => ({ ...prev, company_description: e.target.value }))}
                    placeholder="Brief description of your company, culture, and mission..."
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary placeholder-brand-textSecondary/50 focus:outline-none focus:border-brand-primary text-sm transition-all resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary">Company Address</label>
                  <textarea
                    rows={2}
                    value={profileData.company_address || ''}
                    onChange={e => setProfileData(prev => ({ ...prev, company_address: e.target.value }))}
                    placeholder="Full mailing address..."
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary placeholder-brand-textSecondary/50 focus:outline-none focus:border-brand-primary text-sm transition-all resize-none"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-brand-textPrimary flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-brand-accent" /> Social Links <span className="text-xs text-brand-textSecondary font-medium">(Optional)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'LinkedIn URL', key: 'linkedin_url', placeholder: 'https://linkedin.com/company/...' },
                    { label: 'Twitter / X URL', key: 'twitter_url', placeholder: 'https://twitter.com/...' },
                  ].map(field => (
                    <div key={field.key} className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary">{field.label}</label>
                      <input
                        type="url"
                        value={profileData[field.key] || ''}
                        onChange={e => setProfileData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary placeholder-brand-textSecondary/50 focus:outline-none focus:border-brand-primary text-sm transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Preferences */}
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-brand-textPrimary flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-brand-warning" /> Preferences
                </h3>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary">Default Evaluation Strategy</label>
                  <div className="flex gap-3">
                    {['quick', 'intelligent'].map(strategy => (
                      <button
                        key={strategy}
                        type="button"
                        onClick={() => setProfileData(prev => ({ ...prev, default_eval_strategy: strategy }))}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          (profileData.default_eval_strategy || 'intelligent') === strategy
                            ? 'bg-brand-primary text-white border-brand-primary'
                            : 'bg-brand-bg border-brand-border text-brand-textSecondary hover:border-brand-primary/40'
                        }`}
                      >
                        {strategy === 'quick' ? '⚡ Quick' : '🧠 Intelligent'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white py-3 rounded-xl font-semibold shadow-premium flex items-center justify-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" /> Save Profile
              </button>
            </form>
          </div>
        )}

        {/* TAB 10: ANALYTICS & REPORTS */}
        {activeTab === 'recruiter-analytics' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-brand-textPrimary tracking-tight">Hiring Intelligence</h1>
                <p className="text-brand-textSecondary mt-1">Real-time candidate evaluation graphs, recommendation indexes, and match rates.</p>
              </div>
              <div className="flex flex-col gap-1 w-full md:w-auto">
                <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest">Select Job View</span>
                <select
                  value={filterJobId}
                  onChange={e => setFilterJobId(e.target.value)}
                  className="bg-white border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary focus:outline-none focus:border-brand-primary text-xs font-bold w-full md:w-64"
                >
                  <option value="all">Overall Analytics</option>
                  {jobs.map(job => (
                    <option key={job.id} value={String(job.id)}>{job.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {(() => {
              const analyticsApps = filterJobId === 'all' ? applications : applications.filter(a => a.job_id === parseInt(filterJobId));
              const analyticsJobs = filterJobId === 'all' ? jobs : jobs.filter(j => j.id === parseInt(filterJobId));
              const totalEvaluated = analyticsApps.filter(a => a.match_score).length;

              return (
                <>
                  {/* Metrics widgets */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div 
                      onClick={() => setActiveTab('jobs')}
                      className="glass-panel border border-brand-border/60 rounded-2xl p-6 flex flex-col justify-between cursor-pointer hover:border-brand-primary hover:shadow-premium transition-all card-interactive group"
                    >
                      <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest">Active Positions</span>
                      <span className="text-3xl font-extrabold text-brand-primary mt-2 group-hover:scale-105 transition-transform">{analyticsJobs.length} Jobs</span>
                    </div>
                    <div 
                      onClick={() => { setFilterStatus('all'); setActiveTab('applications'); }}
                      className="glass-panel border border-brand-border/60 rounded-2xl p-6 flex flex-col justify-between cursor-pointer hover:border-brand-primary hover:shadow-premium transition-all card-interactive group"
                    >
                      <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest">Received Resumes</span>
                      <span className="text-3xl font-extrabold text-brand-secondary mt-2 group-hover:scale-105 transition-transform">{analyticsApps.length} Applicants</span>
                    </div>
                    <div 
                      onClick={() => setActiveTab('jobs')}
                      className="glass-panel border border-brand-border/60 rounded-2xl p-6 flex flex-col justify-between cursor-pointer hover:border-brand-primary hover:shadow-premium transition-all card-interactive group"
                    >
                      <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest">Evaluation Coverage</span>
                      <span className="text-3xl font-extrabold text-brand-success mt-2 group-hover:scale-105 transition-transform">
                        {analyticsApps.length > 0 ? Math.round((totalEvaluated / analyticsApps.length) * 100) : 0}%
                      </span>
                    </div>
                    <div 
                      onClick={() => { setFilterStatus('all'); setActiveTab('applications'); }}
                      className="glass-panel border border-brand-border/60 rounded-2xl p-6 flex flex-col justify-between cursor-pointer hover:border-brand-primary hover:shadow-premium transition-all card-interactive group"
                    >
                      <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest">Average Fit Score</span>
                      <span className="text-3xl font-extrabold text-brand-accent mt-2 group-hover:scale-105 transition-transform">
                        {totalEvaluated > 0
                          ? Math.round(analyticsApps.reduce((acc, a) => acc + (a.match_score?.final_score || 0), 0) / totalEvaluated)
                          : 0}%
                      </span>
                    </div>
                  </div>

                  {analyticsJobs.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <>
                      {/* Visual breakdown and details */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recommendation pool breakdown - SVG Donut Chart */}
                        <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4 card-interactive">
                          <h3 className="font-bold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40 flex items-center gap-2">
                            <Award className="w-5 h-5 text-brand-primary" /> Recommendation Index
                          </h3>
                          {(() => {
                            const counts = [
                              { label: 'Highly Recommended (90%+)', value: analyticsApps.filter(a => a.match_score?.final_score >= 90).length, color: '#10B981' },
                              { label: 'Recommended (80%-89%)', value: analyticsApps.filter(a => a.match_score?.final_score >= 80 && a.match_score?.final_score < 90).length, color: '#2563EB' },
                              { label: 'Consider (65%-79%)', value: analyticsApps.filter(a => a.match_score?.final_score >= 65 && a.match_score?.final_score < 80).length, color: '#F59E0B' },
                              { label: 'Not Recommended (<65%)', value: analyticsApps.filter(a => a.match_score && a.match_score?.final_score < 65).length, color: '#EF4444' }
                            ];

                            const radius = 38;
                            const circ = 2 * Math.PI * radius; // ~238.76
                            let cumulativeOffset = 0;
                            const totalEvaluatedOrOne = totalEvaluated || 1;

                            return (
                              <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                                <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                                  <svg width="100%" height="100%" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="12" />
                                    {counts.map((item, idx) => {
                                      const pct = totalEvaluated > 0 ? (item.value / totalEvaluatedOrOne) : 0;
                                      const strokeDash = pct * circ;
                                      const offset = -cumulativeOffset;
                                      cumulativeOffset += strokeDash;
                                      if (item.value === 0) return null;
                                      return (
                                        <circle
                                          key={idx}
                                          cx="60"
                                          cy="60"
                                          r={radius}
                                          fill="none"
                                          stroke={item.color}
                                          strokeWidth="12"
                                          strokeDasharray={`${strokeDash} ${circ}`}
                                          strokeDashoffset={offset}
                                          transform="rotate(-90 60 60)"
                                          className="transition-all duration-500 hover:stroke-[15px] cursor-pointer"
                                        >
                                          <title>{item.label}: {item.value} candidates ({Math.round(pct * 100)}%)</title>
                                        </circle>
                                      );
                                    })}
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-[10px] font-bold text-brand-textSecondary uppercase">Total</span>
                                    <strong className="text-lg font-extrabold text-brand-textPrimary">{totalEvaluated}</strong>
                                  </div>
                                </div>
                                <div className="flex-1 space-y-3 w-full">
                                  {counts.map((item, idx) => {
                                    const pct = totalEvaluated > 0 ? Math.round((item.value / totalEvaluatedOrOne) * 100) : 0;
                                    return (
                                      <div key={idx} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                          <span className="text-xs font-semibold text-brand-textPrimary">{item.label}</span>
                                        </div>
                                        <span className="text-xs font-bold text-brand-textSecondary">{item.value} ({pct}%)</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Application Trends - SVG Area Chart */}
                        <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4 card-interactive">
                          <h3 className="font-bold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-brand-secondary" /> Application & Match Trends
                          </h3>
                          {(() => {
                            const getTrendData = (appsList) => {
                              const trendMonths = [];
                              const values = [];
                              const today = new Date();
                              for (let i = 5; i >= 0; i--) {
                                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                                const monthName = d.toLocaleString('default', { month: 'short' });
                                trendMonths.push(monthName);
                                
                                const count = appsList.filter(app => {
                                  if (!app.applied_at) return false;
                                  const appDate = new Date(app.applied_at);
                                  return appDate.getMonth() === d.getMonth() && appDate.getFullYear() === d.getFullYear();
                                }).length;
                                values.push(count);
                              }
                              return { trendMonths, values };
                            };

                            const { trendMonths, values } = getTrendData(analyticsApps);
                            const maxVal = Math.max(...values, 10) || 10;
                            const points = values.map((val, idx) => {
                              const x = 35 + idx * 62;
                              const y = 110 - (val / maxVal) * 80;
                              return { x, y, val, month: trendMonths[idx] };
                            });
                            const pathD = points.reduce((acc, p, idx) => acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '');
                            const areaD = pathD + ` L ${points[points.length-1].x} 120 L ${points[0].x} 120 Z`;

                            return (
                              <div className="w-full pt-1">
                                <svg width="100%" height="135" viewBox="0 0 380 135" preserveAspectRatio="none">
                                  <defs>
                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                                    </linearGradient>
                                  </defs>
                                  {/* Horizontal grid lines */}
                                  <line x1="30" y1="30" x2="360" y2="30" stroke="#F1F5F9" strokeWidth="1" />
                                  <line x1="30" y1="75" x2="360" y2="75" stroke="#F1F5F9" strokeWidth="1" />
                                  <line x1="30" y1="120" x2="360" y2="120" stroke="#E2E8F0" strokeWidth="1" />
                                  
                                  {/* Area path */}
                                  <path d={areaD} fill="url(#areaGrad)" />
                                  {/* Line path */}
                                  <path d={pathD} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
                                  
                                  {/* Chart points */}
                                  {points.map((p, idx) => (
                                    <circle
                                      key={idx}
                                      cx={p.x}
                                      cy={p.y}
                                      r="4"
                                      className="fill-white stroke-brand-primary stroke-2 cursor-pointer hover:r-6 hover:fill-brand-secondary transition-all"
                                    >
                                      <title>{p.month}: {p.val} applications</title>
                                    </circle>
                                  ))}
                                </svg>
                                {/* X labels */}
                                <div className="flex justify-between px-6 pt-1">
                                  {trendMonths.map((m, idx) => (
                                    <span key={idx} className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider">{m}</span>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {activeTab === 'external-hiring' && (
          <React.Suspense fallback={<div className="p-8 text-center text-xs text-brand-textSecondary"><div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>Loading...</div>}>
            <ExternalHiringTab />
          </React.Suspense>
        )}

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* EVALUATION MODAL DRAWER */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-[95rem] h-full bg-brand-panel border-l border-brand-border/80 p-6 md:p-8 flex flex-col shadow-premium relative animate-slide-in">
            {/* Modal header */}
            <div className="flex justify-between items-start border-b border-brand-border/60 pb-4 mb-6 shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-brand-textPrimary">{selectedApp.candidate_name}</h3>
                <p className="text-sm text-brand-textSecondary mt-0.5">Application Detail & Scoring Controls</p>
              </div>
              <button 
                onClick={() => setSelectedApp(null)} 
                className="text-brand-textSecondary hover:text-brand-textPrimary bg-brand-bg hover:bg-brand-panelLight p-2 rounded-xl border border-brand-border transition-all"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
              {/* Left pane: Tabbed Profile & Resume Viewer */}
              <div className="lg:w-7/12 flex flex-col h-full overflow-hidden">
                {/* Tabs Selection Header */}
                <div className="flex border-b border-brand-border/60 mb-4 gap-2 shrink-0 select-none items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLeftPaneTab('profile')}
                      className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-300 flex items-center gap-2 ${
                        leftPaneTab === 'profile'
                          ? 'border-brand-primary text-brand-primary'
                          : 'border-transparent text-brand-textSecondary hover:text-brand-textPrimary'
                      }`}
                    >
                      <User className="w-4 h-4" /> Candidate Profile
                    </button>
                    <button
                      onClick={() => setLeftPaneTab('resume')}
                      className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-300 flex items-center gap-2 ${
                        leftPaneTab === 'resume'
                          ? 'border-brand-primary text-brand-primary'
                          : 'border-transparent text-brand-textSecondary hover:text-brand-textPrimary'
                      }`}
                    >
                      <FileText className="w-4 h-4" /> Original Resume PDF
                    </button>
                  </div>
                  {leftPaneTab === 'resume' && (
                    <a
                      href={`http://localhost:5000/api/resumes/${selectedApp.resume_id}/file?token=${sessionStorage.getItem('token') || localStorage.getItem('token')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-brand-primary hover:text-brand-textPrimary flex items-center gap-1.5 font-bold transition-all pr-2"
                    >
                      Open PDF <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {leftPaneTab === 'profile' ? (
                  candidateProfileLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <div className="w-10 h-10 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-brand-textSecondary">Loading Candidate Profile...</span>
                    </div>
                  ) : !candidateProfile ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <AlertTriangle className="w-10 h-10 text-brand-warning animate-pulse" />
                      <div>
                        <h4 className="text-sm font-extrabold text-brand-textPrimary">Profile Sync Failed</h4>
                        <p className="text-xs text-brand-textSecondary mt-1">Unable to load the complete profile. Please use the original Resume PDF tab.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-6">
                      {/* Premium Profile Header Card */}
                      <div className="glass-panel border border-brand-border rounded-2xl p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center bg-brand-bg/30">
                        {/* Profile Photo */}
                        <div className="relative shrink-0 select-none">
                          {candidateProfile.has_photo ? (
                            <img
                              src={`http://localhost:5000/api/profile/photo/${candidateProfile.candidate_id}`}
                              alt={candidateProfile.candidate_name}
                              className="w-20 h-20 rounded-full border-4 border-brand-primary/30 object-cover shadow-premium bg-brand-bg"
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <div
                            className="w-20 h-20 rounded-full bg-brand-primary/10 border-2 border-brand-primary/25 items-center justify-center text-brand-primary font-black text-2xl flex"
                            style={{ display: candidateProfile.has_photo ? 'none' : 'flex' }}
                          >
                            {candidateProfile.candidate_name?.charAt(0).toUpperCase()}
                          </div>
                        </div>

                        {/* Name and headline */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <h4 className="text-xl font-black text-brand-textPrimary truncate">{candidateProfile.candidate_name}</h4>
                          {candidateProfile.profile?.headline && (
                            <p className="text-xs font-semibold text-brand-primary truncate">{candidateProfile.profile.headline}</p>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-brand-textSecondary font-medium">
                            <span className="flex items-center gap-1.5 truncate">
                              <Mail className="w-3.5 h-3.5 shrink-0 text-brand-primary/70" /> {candidateProfile.candidate_email}
                            </span>
                            {candidateProfile.profile?.phone && (
                              <span className="flex items-center gap-1.5 truncate">
                                <Phone className="w-3.5 h-3.5 shrink-0 text-brand-primary/70" /> {candidateProfile.profile.phone}
                              </span>
                            )}
                          </div>

                          {/* Social Icons Row */}
                          <div className="flex items-center gap-2.5 pt-1.5">
                            {candidateProfile.profile?.linkedin_url && (
                              <a
                                href={candidateProfile.profile.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-brand-bg hover:bg-brand-primary/15 border border-brand-border rounded-lg text-brand-textSecondary hover:text-brand-primary transition-all text-[10px] font-bold"
                                title="LinkedIn Profile"
                              >
                                LinkedIn
                              </a>
                            )}
                            {candidateProfile.profile?.github_url && (
                              <a
                                href={candidateProfile.profile.github_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-brand-bg hover:bg-brand-primary/15 border border-brand-border rounded-lg text-brand-textSecondary hover:text-brand-primary transition-all text-[10px] font-bold"
                                title="GitHub Profile"
                              >
                                GitHub
                              </a>
                            )}
                            {candidateProfile.profile?.leetcode_url && (
                              <a
                                href={candidateProfile.profile.leetcode_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-brand-bg hover:bg-brand-primary/15 border border-brand-border rounded-lg text-brand-textSecondary hover:text-brand-primary transition-all text-[10px] font-bold"
                                title="LeetCode Profile"
                              >
                                LeetCode
                              </a>
                            )}
                            {candidateProfile.profile?.portfolio_url && (
                              <a
                                href={candidateProfile.profile.portfolio_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-brand-bg hover:bg-brand-primary/15 border border-brand-border rounded-lg text-brand-textSecondary hover:text-brand-primary transition-all"
                                title="Portfolio Website"
                              >
                                <Globe className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Detail Sections Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
                          {/* Bio */}
                          <div className="bg-brand-bg/25 border border-brand-border/60 rounded-2xl p-5 space-y-2.5">
                            <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider block">Professional Bio</span>
                            <p className="text-xs text-brand-textPrimary leading-relaxed whitespace-pre-wrap font-medium">
                              {candidateProfile.profile?.bio || 'No professional bio provided.'}
                            </p>
                          </div>

                          {/* Skills */}
                          <div className="bg-brand-bg/25 border border-brand-border/60 rounded-2xl p-5 space-y-3">
                            <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider block">Key Expertise & Skills</span>
                            <div className="flex flex-wrap gap-1.5">
                              {candidateProfile.resume?.skills && candidateProfile.resume.skills.length > 0 ? (
                                candidateProfile.resume.skills.map((skill, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-brand-primary/15 border border-brand-primary/25 text-brand-primary"
                                  >
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-brand-textSecondary font-semibold">No skills extracted.</span>
                              )}
                            </div>
                          </div>

                          {/* Certifications */}
                          {candidateProfile.profile?.certifications && (
                            <div className="bg-brand-bg/25 border border-brand-border/60 rounded-2xl p-5 space-y-2.5">
                              <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider block">Certifications & Achievements</span>
                              <p className="text-xs text-brand-textPrimary leading-relaxed whitespace-pre-wrap font-semibold">
                                {candidateProfile.profile.certifications}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                          {/* Experience */}
                          <div className="bg-brand-bg/25 border border-brand-border/60 rounded-2xl p-5 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider block">Professional Experience</span>
                              <span className="text-xs font-bold text-brand-accent bg-brand-accent/15 px-2.5 py-0.5 rounded-xl border border-brand-accent/20">
                                {candidateProfile.resume?.experience_years || 0} Yrs Experience
                              </span>
                            </div>
                            {candidateProfile.resume?.projects && (
                              <div className="text-xs text-brand-textPrimary leading-relaxed whitespace-pre-wrap font-medium">
                                {candidateProfile.resume.projects}
                              </div>
                            )}
                          </div>

                          {/* Education */}
                          <div className="bg-brand-bg/25 border border-brand-border/60 rounded-2xl p-5 space-y-2.5">
                            <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider block">Education Background</span>
                            <p className="text-xs text-brand-textPrimary leading-relaxed whitespace-pre-wrap font-semibold">
                              {candidateProfile.profile?.education || 'No education details provided.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-3 shrink-0">
                      <h4 className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-brand-primary" /> Resume PDF Document
                      </h4>
                    </div>
                    {selectedApp.resume?.file_name && (
                      selectedApp.resume.file_name.toLowerCase().endsWith('.png') ||
                      selectedApp.resume.file_name.toLowerCase().endsWith('.jpg') ||
                      selectedApp.resume.file_name.toLowerCase().endsWith('.jpeg')
                    ) ? (
                      <div className="w-full flex-1 rounded-2xl border border-brand-border/60 bg-brand-bg shadow-premium overflow-auto p-2 flex items-center justify-center">
                        <img
                          src={`http://localhost:5000/api/resumes/${selectedApp.resume_id}/file?token=${sessionStorage.getItem('token') || localStorage.getItem('token')}`}
                          className="max-w-full max-h-[75vh] object-contain rounded-xl"
                          alt="Candidate Resume image"
                        />
                      </div>
                    ) : (
                      <iframe
                        src={`http://localhost:5000/api/resumes/${selectedApp.resume_id}/file?token=${sessionStorage.getItem('token') || localStorage.getItem('token')}`}
                        className="w-full flex-1 rounded-2xl border border-brand-border/60 bg-brand-bg shadow-premium"
                        title="Resume PDF Document Viewer"
                      />
                    )}
                  </>
                )}
              </div>
              
              {/* Right pane: Details, parsed stats, scoring controls */}
              <div className="lg:w-5/12 flex flex-col h-full overflow-hidden pr-2">
                {/* Tabs selection header */}
                <div className="flex border-b border-brand-border/60 mb-6 gap-2 shrink-0 select-none items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModalTab('overview')}
                      className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-300 ${
                        modalTab === 'overview'
                          ? 'border-brand-primary text-brand-primary'
                          : 'border-transparent text-brand-textSecondary hover:text-brand-textPrimary'
                      }`}
                    >
                      Overview
                    </button>
                    {/* Only show ATS & AI tabs for intelligent-evaluated applications */}
                    {(() => {
                      const curJob = jobs.find(j => j.id === selectedApp?.job_id);
                      const isQuickEval = selectedApp.match_score?.evaluation_type === 'quick' || curJob?.evaluation_strategy === 'quick';
                      return !isQuickEval && (
                        <button
                          onClick={() => setModalTab('ats')}
                          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-300 ${
                            modalTab === 'ats'
                              ? 'border-brand-primary text-brand-primary'
                              : 'border-transparent text-brand-textSecondary hover:text-brand-textPrimary'
                          }`}
                        >
                          ATS Analysis
                        </button>
                      );
                    })()}
                    {(() => {
                      const curJob2 = jobs.find(j => j.id === selectedApp?.job_id);
                      const isAiEnabled = curJob2 ? curJob2.ai_insights_enabled !== false : true;
                      const isQuickEval2 = selectedApp.match_score?.evaluation_type === 'quick' || curJob2?.evaluation_strategy === 'quick';
                      return isAiEnabled && !isQuickEval2 && (
                        <button
                          onClick={() => setModalTab('ai')}
                          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-300 ${
                            modalTab === 'ai'
                              ? 'border-brand-primary text-brand-primary'
                              : 'border-transparent text-brand-textSecondary hover:text-brand-textPrimary'
                          }`}
                        >
                          AI Analysis
                        </button>
                      );
                    })()}
                  </div>

                  {/* Quick AI Toggle */}
                  {(() => {
                    const curJob = jobs.find(j => j.id === selectedApp?.job_id);
                    if (!curJob) return null;
                    const isAiEnabled = curJob.ai_insights_enabled !== false;
                    return (
                      <div className="flex items-center gap-1.5 pr-2 select-none" title="Toggle AI Insights tab">
                        <span className="text-[10px] font-bold text-brand-textSecondary uppercase">AI</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isAiEnabled}
                            onChange={() => handleToggleAiInsights(selectedApp.job_id)}
                            className="sr-only peer" 
                          />
                          <div className="w-7 h-4 bg-brand-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-primary"></div>
                        </label>
                      </div>
                    );
                  })()}
                </div>

                {/* Tab Content Panels (Scrollable) */}
                <div className="flex-1 overflow-y-auto space-y-6 pb-6 pr-1">
                  {modalTab === 'overview' && (
                    <div className="space-y-6 animate-fade-in">
                      {/* Candidate Status Pipeline Stepper */}
                      <div className="bg-brand-bg/30 p-4 rounded-xl border border-brand-border/40 shadow-premium">
                        <span className="text-[10px] font-bold text-brand-textPrimary uppercase tracking-wider block mb-3">Candidate Status Pipeline</span>
                        <div className="flex items-center justify-between w-full select-none">
                          {(() => {
                            const statusSteps = [
                              { label: 'Submitted', key: 'applied', activeColor: 'text-brand-primary bg-brand-primary/10 border-brand-primary/40' },
                              { label: 'Pending Eval', key: 'pending_evaluation', activeColor: 'text-brand-warning bg-brand-warning/10 border-brand-warning/40' },
                              { label: 'Evaluated', key: 'evaluated', activeColor: 'text-brand-success bg-brand-success/15 border-brand-success/40' },
                              { label: 'Shortlisted', key: 'shortlisted', activeColor: 'text-brand-accent bg-brand-accent/15 border-brand-accent/40' },
                              { label: 'Interview Scheduled', key: 'interview', activeColor: 'text-brand-warning bg-brand-warning/15 border-brand-warning/40' },
                              { label: 'Selected', key: 'selected', activeColor: 'text-brand-success bg-brand-success/20 border-brand-success/60' },
                              { label: 'Hired', key: 'hired', activeColor: 'text-brand-success bg-brand-success/35 border-brand-success/70' }
                            ];
                            const currentStatus = selectedApp.status;
                            const hasScore = !!selectedApp.match_score;
                            
                            let statusIdx = 0;
                            if (currentStatus === 'rejected') {
                              statusIdx = hasScore ? 2 : 0;
                            } else {
                              statusIdx = statusSteps.findIndex(s => s.key === currentStatus);
                              if (statusIdx === -1) {
                                if (currentStatus === 'approved') {
                                  statusIdx = 5; // selected/approved
                                } else {
                                  statusIdx = 0;
                                }
                              }
                            }
                            const isRejected = currentStatus === 'rejected';

                            return statusSteps.map((step, idx) => (
                              <React.Fragment key={idx}>
                                {idx > 0 && (
                                  <div className={`flex-1 h-[2px] mx-1 ${
                                    statusIdx >= idx && !isRejected ? 'bg-brand-success' : 'bg-brand-border/40'
                                  }`} />
                                )}
                                <div className="flex flex-col items-center gap-1">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${
                                    isRejected && idx === statusIdx
                                      ? 'bg-brand-danger/25 border-brand-danger/55 text-brand-danger animate-pulse'
                                      : idx === statusIdx
                                        ? step.activeColor + ' scale-110 shadow-premium'
                                        : statusIdx > idx && !isRejected
                                          ? 'bg-brand-success/20 border-brand-success/45 text-brand-success'
                                          : 'bg-brand-bg border-brand-border/40 text-brand-textSecondary'
                                  }`}>
                                    {isRejected && idx === statusIdx ? '✗' : statusIdx > idx ? '✓' : idx + 1}
                                  </div>
                                  <span className={`text-[9px] font-bold uppercase tracking-wider text-center ${
                                    isRejected && idx === statusIdx
                                      ? 'text-brand-danger'
                                      : idx === statusIdx
                                        ? 'text-brand-primary'
                                        : 'text-brand-textSecondary'
                                  }`}>
                                    {isRejected && idx === statusIdx ? 'Rejected' : step.label}
                                  </span>
                                </div>
                              </React.Fragment>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Score and Recommendation Card / Evaluation trigger */}
                      {selectedApp.match_score ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/50 flex flex-col justify-between">
                              <div>
                                <span className="text-xs text-brand-textSecondary uppercase font-semibold">
                                  {selectedApp.match_score.evaluation_type === 'quick' ? 'Quick Match Score' : 'Final Match Score'}
                                </span>
                                <div className={`text-3xl font-extrabold mt-1 ${selectedApp.match_score.evaluation_type === 'quick' ? 'text-brand-warning' : 'text-brand-primary'}`}>
                                  {Math.round(selectedApp.match_score.final_score)}%
                                </div>
                              </div>
                              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border text-center mt-2 select-none ${getRecommendationLabel(selectedApp.match_score.final_score).style}`}>
                                {getRecommendationLabel(selectedApp.match_score.final_score).text}
                              </span>
                              {selectedApp.match_score.evaluation_type === 'quick' ? (
                                <span className="text-[9px] text-brand-warning/80 font-medium mt-1.5 block">⚡ Quick Evaluation (Keyword Only)</span>
                              ) : (
                                <span className="text-[9px] text-brand-primary/80 font-medium mt-1.5 block">🧠 Intelligent Evaluation (Keyword + ATS + AI)</span>
                              )}
                            </div>
                            <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/50">
                              <span className="text-xs text-brand-textSecondary uppercase font-semibold">Experience</span>
                              <div className="text-3xl font-extrabold text-brand-accent mt-1">
                                {selectedApp.resume?.experience_years !== undefined ? selectedApp.resume.experience_years : 0} Yrs
                              </div>
                              <span className="text-[10px] text-brand-textSecondary mt-1 block">
                                Target Job: {selectedApp.job_title}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={handleRescore}
                            disabled={rescoring}
                            className="w-full bg-gradient-to-r from-brand-primary/80 to-brand-secondary/80 hover:opacity-95 text-white py-2.5 rounded-xl font-bold shadow-premium text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            {rescoring ? (
                              <>⏳ {(() => { const rJob = jobs.find(j => j.id === selectedApp?.job_id); return rJob?.evaluation_strategy === 'quick' ? 'Recalculating Score...' : 'Recalculating AI Score...'; })()}</>
                            ) : (
                              <>🔄 Recalculate Score</>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-brand-bg/40 p-5 rounded-2xl border border-brand-border/60 text-center space-y-4">
                          <Cpu className="w-9 h-9 text-brand-primary mx-auto animate-pulse" />
                          <div>
                            <h4 className="text-sm font-extrabold text-brand-textPrimary">Evaluation Required</h4>
                            <p className="text-[11px] text-brand-textSecondary mt-1 max-w-sm mx-auto">
                              This candidate's resume has been uploaded but their fit scores and qualitative AI analysis have not been computed yet.
                            </p>
                          </div>
                          <button
                            onClick={handleRescore}
                            disabled={rescoring}
                            className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white py-3 rounded-xl font-bold shadow-premium text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            {rescoring ? (
                              <>⏳ Generating AI Evaluation...</>
                            ) : (
                              <>🧠 Run AI Evaluation</>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Audit Log / Timeline */}
                      <div className="bg-brand-bg/10 p-5 rounded-2xl border border-brand-border/40 space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider">Activity History Timeline</h4>
                        </div>
                        <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-brand-border/60 pl-6 text-xs">
                          <div className="relative">
                            <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-primary border border-white"></span>
                            <p className="font-semibold text-brand-textPrimary">Resume Received & Extracted</p>
                            <p className="text-[10px] text-brand-textSecondary mt-0.5">
                              {selectedApp.applied_at ? new Date(selectedApp.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now'} — File: <span className="font-mono text-brand-primary">{selectedApp.resume_file_name || 'resume.pdf'}</span>
                            </p>
                          </div>
                          {selectedApp.match_score && (
                            <div className="relative">
                              <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-secondary border border-white"></span>
                              <p className="font-semibold text-brand-textPrimary">
                                {selectedApp.match_score.evaluation_type === 'quick' ? 'Quick Skills Match Calculated' : 'Hybrid Scoring Calculated'}
                              </p>
                              <p className="text-[10px] text-brand-textSecondary mt-0.5">
                                Match percentage: <span className="font-bold text-brand-primary">{Math.round(selectedApp.match_score.final_score)}%</span>
                                {selectedApp.match_score.evaluation_type === 'quick' && (
                                  <span className="ml-2 text-brand-warning font-semibold">(Quick Evaluation)</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {modalTab === 'ats' && (
                    <div className="space-y-6 animate-fade-in">
                      {!selectedApp.match_score ? (
                        <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 min-h-[300px]">
                          <Cpu className="w-12 h-12 text-brand-textSecondary animate-pulse" />
                          <div>
                            <h3 className="text-base font-bold text-brand-textPrimary">Analysis Not Available</h3>
                            <p className="text-xs text-brand-textSecondary mt-1 max-w-xs leading-relaxed">
                              Fit scores, ATS matched parameters, and skills breakdown are generated during evaluation. Please trigger evaluation on the Overview tab first.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* ATS Scores overview */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/50">
                              <span className="text-[10px] text-brand-textSecondary uppercase font-bold block">Keyword Match</span>
                              <span className="text-xl font-extrabold text-brand-primary block mt-1">
                                {selectedApp.match_score?.match_percentage !== undefined
                                  ? Math.round(selectedApp.match_score.match_percentage)
                                  : 0}%
                              </span>
                            </div>
                            <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/50">
                              <span className="text-[10px] text-brand-textSecondary uppercase font-bold block">ATS Score</span>
                              <span className="text-xl font-extrabold text-brand-secondary block mt-1">
                                {selectedApp.match_score?.details?.ats_score !== undefined
                                  ? Math.round(selectedApp.match_score.details.ats_score)
                                  : 0}%
                              </span>
                            </div>
                            <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/50">
                              <span className="text-[10px] text-brand-textSecondary uppercase font-bold block">Skills Match</span>
                              <span className="text-xl font-extrabold text-brand-primary block mt-1">
                                {selectedApp.match_score?.details?.skills_score !== undefined
                                  ? Math.round(selectedApp.match_score.details.skills_score)
                                  : 0}%
                              </span>
                            </div>
                            <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/50">
                              <span className="text-[10px] text-brand-textSecondary uppercase font-bold block">Experience Match</span>
                              <span className="text-xl font-extrabold text-brand-accent block mt-1">
                                {selectedApp.match_score?.details?.experience_score !== undefined
                                  ? Math.round(selectedApp.match_score.details.experience_score)
                                  : 0}%
                              </span>
                            </div>
                            <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/50">
                              <span className="text-[10px] text-brand-textSecondary uppercase font-bold block">Projects Match</span>
                              <span className="text-xl font-extrabold text-brand-secondary block mt-1">
                                {selectedApp.match_score?.details?.projects_score !== undefined
                                  ? Math.round(selectedApp.match_score.details.projects_score)
                                  : 0}%
                              </span>
                            </div>
                            <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/50">
                              <span className="text-[10px] text-brand-textSecondary uppercase font-bold block">Resume Quality</span>
                              <span className="text-xl font-extrabold text-brand-success block mt-1">
                                {selectedApp.match_score?.details?.resume_quality_score !== undefined
                                  ? Math.round(selectedApp.match_score.details.resume_quality_score)
                                  : 0}%
                              </span>
                            </div>
                          </div>

                          <div className="bg-brand-primary/5 p-4 rounded-xl border border-brand-primary/20 flex justify-between items-center">
                            <div>
                              <span className="text-xs text-brand-textSecondary uppercase font-semibold block">Total Objective ATS Score</span>
                              <span className="text-[10px] text-brand-textSecondary block mt-0.5">
                                Weighted combination based on job requirements
                              </span>
                            </div>
                            <span className="text-2xl font-extrabold text-brand-primary">
                              {selectedApp.match_score?.details?.recruiter_score !== undefined
                                ? Math.round(selectedApp.match_score.details.recruiter_score)
                                : 0}%
                            </span>
                          </div>

                          {/* Experience Comparison */}
                          <div className="bg-brand-bg/30 p-4 rounded-xl border border-brand-border/40 space-y-2.5">
                            <span className="text-[10px] font-bold text-brand-textPrimary uppercase tracking-wider block">Experience Match Details</span>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-brand-textSecondary">Candidate Experience:</span>
                              <strong className="text-brand-textPrimary font-bold">
                                {selectedApp.resume?.experience_years !== undefined ? selectedApp.resume.experience_years : 0} Years
                              </strong>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-brand-textSecondary">Job Required Experience:</span>
                              <strong className="text-brand-textPrimary font-bold">
                                {selectedApp.match_score?.details?.experience_required !== undefined
                                  ? selectedApp.match_score.details.experience_required
                                  : 0} Years
                              </strong>
                            </div>
                            <div className="w-full bg-brand-bg rounded-full h-1.5 overflow-hidden border border-brand-border/30 mt-2">
                              <div
                                className="h-full rounded-full bg-brand-accent transition-all duration-500"
                                style={{
                                  width: `${Math.min(
                                    (((selectedApp.resume?.experience_years || 0) /
                                      Math.max(selectedApp.match_score?.details?.experience_required || 1, 1)) *
                                      100),
                                    100
                                  )}%`
                                }}
                              />
                            </div>
                          </div>

                          {/* Skills Tags Matched and Missing */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-xs font-bold text-brand-success uppercase tracking-wider mb-2">Matched Skills ({selectedApp.match_score?.details?.matched_skills?.length || 0})</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedApp.match_score?.details?.matched_skills && selectedApp.match_score.details.matched_skills.length > 0 ? (
                                  selectedApp.match_score.details.matched_skills.map((s, i) => (
                                    <span key={i} className="text-xs bg-brand-success/10 border border-brand-success/20 text-brand-success px-2.5 py-1 rounded-lg font-medium">{s}</span>
                                  ))
                                ) : (
                                  <p className="text-xs text-brand-textSecondary italic">No matched skills extracted.</p>
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-xs font-bold text-brand-danger uppercase tracking-wider mb-2">Missing Skills ({selectedApp.match_score?.details?.missing_skills?.length || 0})</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedApp.match_score?.details?.missing_skills && selectedApp.match_score.details.missing_skills.length > 0 ? (
                                  selectedApp.match_score.details.missing_skills.map((s, i) => (
                                    <span key={i} className="text-xs bg-brand-danger/10 border border-brand-danger/20 text-brand-danger px-2.5 py-1 rounded-lg font-medium">{s}</span>
                                  ))
                                ) : (
                                  <p className="text-xs text-brand-textSecondary italic">All required skills present.</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Dynamic Recalculation Section */}
                          <div className="border-t border-brand-border/60 pt-6 space-y-4">
                            <div>
                              <h4 className="text-sm font-bold text-brand-textPrimary uppercase">Recalculate Fit Metrics</h4>
                              <p className="text-xs text-brand-textSecondary mt-0.5">Force a backend re-scoring calculation using the Smart Resume Unified Engine.</p>
                            </div>

                            <button
                              onClick={handleRescore}
                              disabled={rescoring}
                              className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-premium disabled:opacity-50 transition-all"
                            >
                              {rescoring ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" /> Re-calculate Match Score
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {modalTab === 'ai' && (
                    <div className="space-y-6 animate-fade-in">
                      {!selectedApp.match_score ? (
                        <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 min-h-[300px]">
                          <Cpu className="w-12 h-12 text-brand-textSecondary animate-pulse" />
                          <div>
                            <h3 className="text-base font-bold text-brand-textPrimary">Analysis Not Available</h3>
                            <p className="text-xs text-brand-textSecondary mt-1 max-w-xs leading-relaxed">
                              Gemini AI report, strengths, weaknesses, and improvement suggestions are generated during evaluation. Please trigger evaluation on the Overview tab first.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* AI Score Card */}
                          <div className="bg-brand-bg/40 p-5 rounded-2xl border border-brand-border/50 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-brand-textSecondary uppercase font-semibold">Gemini AI Match Score</span>
                              <div className="text-3xl font-extrabold text-brand-primary mt-1">
                                {selectedApp.match_score?.details?.ai_score !== undefined
                                  ? Math.round(selectedApp.match_score.details.ai_score)
                                  : selectedApp.match_score?.ai_score !== undefined
                                    ? Math.round(selectedApp.match_score.ai_score)
                                    : 0}%
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-brand-textSecondary uppercase font-bold tracking-wider block mb-1">Hiring Recommendation</span>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold border uppercase tracking-wider ${
                                selectedApp.match_score?.details?.ai_recommendation
                                  ? getRecommendationLabel(selectedApp.match_score.details.ai_score || 85).style
                                  : 'bg-brand-panel border-brand-border text-brand-textSecondary'
                              }`}>
                                {selectedApp.match_score?.details?.ai_recommendation || 'Consider'}
                              </span>
                            </div>
                          </div>

                          {/* 1. Contextual Resume Analysis */}
                          <div className="bg-brand-bg/30 p-5 rounded-2xl border border-brand-border/50 space-y-2">
                            <span className="text-xs font-bold text-brand-secondary uppercase tracking-wider block">Contextual Resume Analysis</span>
                            <p className="text-xs text-brand-textSecondary leading-relaxed whitespace-pre-wrap">
                              {selectedApp.match_score?.details?.contextual_resume_analysis || selectedApp.match_score?.details?.ai_analysis || "AI analysis details are currently not available for this candidate."}
                            </p>
                          </div>

                          {/* 2. Project Relevance Analysis */}
                          <div className="bg-brand-bg/30 p-5 rounded-2xl border border-brand-border/50 space-y-2">
                            <span className="text-xs font-bold text-brand-accent uppercase tracking-wider block">Project Relevance Analysis</span>
                            <p className="text-xs text-brand-textSecondary leading-relaxed whitespace-pre-wrap">
                              {selectedApp.match_score?.details?.project_relevance_analysis || "No project relevance details are currently available for this candidate."}
                            </p>
                          </div>

                          {/* Missing Skills from AI */}
                          {selectedApp.match_score?.details?.missing_skills_ai && selectedApp.match_score.details.missing_skills_ai.length > 0 && (
                            <div className="bg-brand-danger/5 border border-brand-danger/25 p-4 rounded-xl space-y-2">
                              <span className="text-xs font-bold text-brand-danger uppercase tracking-wider block">Missing Skills Identified by AI</span>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedApp.match_score.details.missing_skills_ai.map((s, i) => (
                                  <span key={i} className="text-xs bg-brand-danger/10 border border-brand-danger/20 text-brand-danger px-2.5 py-1 rounded-lg font-medium">✗ {s}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Strengths & Weaknesses lists */}
                          <div className="space-y-4">
                            {/* Strengths list */}
                            <div className="bg-brand-success/5 border border-brand-success/20 p-4 rounded-xl space-y-2">
                              <span className="text-xs font-bold text-brand-success uppercase tracking-wider block">Candidate Strengths</span>
                              {selectedApp.match_score?.details?.strengths && selectedApp.match_score.details.strengths.length > 0 ? (
                                <ul className="list-none text-xs text-brand-textPrimary space-y-1.5">
                                  {selectedApp.match_score.details.strengths.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5">
                                      <span>{item.startsWith('✓') ? '' : '✓'}</span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-brand-textSecondary italic">No specific strengths listed. Re-run AI analysis if needed.</p>
                              )}
                            </div>

                            {/* Weaknesses list */}
                            <div className="bg-brand-danger/5 border border-brand-danger/20 p-4 rounded-xl space-y-2">
                              <span className="text-xs font-bold text-brand-danger uppercase tracking-wider block">Areas of Improvement / Weaknesses</span>
                              {selectedApp.match_score?.details?.weaknesses && selectedApp.match_score.details.weaknesses.length > 0 ? (
                                <ul className="list-none text-xs text-brand-textPrimary space-y-1.5">
                                  {selectedApp.match_score.details.weaknesses.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5">
                                      <span>{item.startsWith('✗') ? '' : '✗'}</span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-brand-textSecondary italic">No specific weaknesses listed.</p>
                              )}
                            </div>

                            {/* Improvement Suggestions */}
                            <div className="bg-brand-secondary/5 border border-brand-secondary/20 p-4 rounded-xl space-y-2">
                              <span className="text-xs font-bold text-brand-secondary uppercase tracking-wider block">Bridge Gaps Suggestions</span>
                              {selectedApp.match_score?.details?.improvement_suggestions && selectedApp.match_score.details.improvement_suggestions.length > 0 ? (
                                <ul className="list-none text-xs text-brand-textPrimary space-y-1.5">
                                  {selectedApp.match_score.details.improvement_suggestions.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5">
                                      <span>{item.startsWith('✓') ? '' : '✓'}</span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-brand-textSecondary italic">No suggestions available.</p>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Sticky Manual Status Pipeline Controls Panel */}
                <div className="border-t border-brand-border/60 pt-4 pb-1 bg-brand-panel shrink-0 space-y-3 z-20">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider block">Set Candidate Pipeline Stage</span>
                      {statusUpdating && (
                        <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin shrink-0"></div>
                      )}
                    </div>
                    {!selectedApp.match_score && (
                      <span className="text-[10px] text-brand-danger font-bold uppercase tracking-wider bg-brand-danger/10 px-2 py-0.5 rounded border border-brand-danger/20 animate-pulse">
                        Evaluation Required
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-2 select-none">
                    <button
                      onClick={() => handleUpdateStatus(selectedApp.id, 'selected')}
                      disabled={!selectedApp.match_score || statusUpdating}
                      className={`px-1 py-2.5 rounded-xl text-[10px] font-bold border transition-all truncate text-center ${
                        selectedApp.status === 'selected' || selectedApp.status === 'approved'
                          ? 'bg-brand-success text-white border-brand-success shadow-premium'
                          : 'bg-brand-success/15 border-brand-success/20 text-brand-success hover:bg-brand-success/25'
                      } disabled:opacity-45 disabled:cursor-not-allowed btn-pressable`}
                    >
                      Select
                    </button>
                    {(() => {
                      const curJob = jobs.find(j => j.id === selectedApp.job_id);
                      const threshold = curJob?.min_match_score || curJob?.pool_analysis?.recommended_threshold || 70;
                      const isBelowThreshold = selectedApp.match_score && selectedApp.match_score.final_score < threshold;
                      return (
                        <button
                          onClick={() => handleUpdateStatus(selectedApp.id, 'shortlisted')}
                          disabled={!selectedApp.match_score || statusUpdating}
                          className={`px-1 py-2.5 rounded-xl text-[10px] font-bold border transition-all truncate text-center ${
                            selectedApp.status === 'shortlisted'
                              ? 'bg-brand-success text-white border-brand-success shadow-premium'
                              : isBelowThreshold
                                ? 'bg-brand-warning/15 border-brand-warning/20 text-brand-warning hover:bg-brand-warning/25'
                                : 'bg-brand-success/10 border-brand-success/20 text-brand-success hover:bg-brand-success/15'
                          } disabled:opacity-45 disabled:cursor-not-allowed btn-pressable`}
                        >
                          {selectedApp.status === 'shortlisted' ? 'Shortlisted' : 'Shortlist'}
                        </button>
                      );
                    })()}
                    <button
                      onClick={() => handleUpdateStatus(selectedApp.id, 'interview')}
                      disabled={!selectedApp.match_score || statusUpdating}
                      className={`px-1 py-2.5 rounded-xl text-[10px] font-bold border transition-all truncate text-center ${
                        selectedApp.status === 'interview'
                          ? 'bg-brand-secondary text-white border-brand-secondary shadow-premium'
                          : 'bg-brand-secondary/15 border-brand-secondary/20 text-brand-secondary hover:bg-brand-secondary/25'
                      } disabled:opacity-45 disabled:cursor-not-allowed btn-pressable`}
                    >
                      Interview
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedApp.id, 'hired')}
                      disabled={!selectedApp.match_score || statusUpdating}
                      className={`px-1 py-2.5 rounded-xl text-[10px] font-bold border transition-all truncate text-center ${
                        selectedApp.status === 'hired'
                          ? 'bg-brand-success text-white border-brand-success shadow-premium'
                          : 'bg-brand-success/15 border-brand-success/20 text-brand-success hover:bg-brand-success/25'
                      } disabled:opacity-45 disabled:cursor-not-allowed btn-pressable`}
                    >
                      Hire
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                      disabled={!selectedApp.match_score || statusUpdating}
                      className={`px-1 py-2.5 rounded-xl text-[10px] font-bold border transition-all truncate text-center ${
                        selectedApp.status === 'rejected'
                          ? 'bg-brand-danger text-white border-brand-danger shadow-premium'
                          : 'bg-brand-danger/15 border-brand-danger/20 text-brand-danger hover:bg-brand-danger/25'
                      } disabled:opacity-45 disabled:cursor-not-allowed btn-pressable`}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK EVALUATION GENERATION MODAL */}
      {evalModalOpen && evaluatingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-brand-panel border border-brand-border rounded-2xl p-6 md:p-8 shadow-premium relative animate-scale-up">
            {!evalLoading && (
              <button 
                onClick={() => {
                  setEvalModalOpen(false);
                  setEvaluatingJob(null);
                }}
                className="absolute top-4 right-4 text-brand-textSecondary hover:text-brand-textPrimary bg-brand-bg hover:bg-brand-panelLight p-2 rounded-xl border border-brand-border transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}

            <h3 className="text-xl font-bold text-brand-textPrimary mb-2">
              {evalShortlistedOnly ? 'Refine Evaluation for Shortlisted' : 'Generate Match Evaluation'}
            </h3>
            <p className="text-xs text-brand-textSecondary mb-1">
              {evalLoading 
                ? (evalShortlistedOnly 
                    ? `Refining evaluation for shortlisted candidates of ${evaluatingJob.title}...`
                    : `Processing candidate pool matching for ${evaluatingJob.title}...`)
                : (evalShortlistedOnly
                    ? `Re-evaluate and refine only the shortlisted candidates for ${evaluatingJob.title}.`
                    : `Evaluate and rank candidates for ${evaluatingJob.title}.`
                  )
              }
            </p>
            {/* Show active strategy badge */}
            <div className="mb-6">
              {evalShortlistedOnly && (
                <span className="mr-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-brand-success/10 border-brand-success/25 text-brand-success">
                  🎯 Shortlisted Only
                </span>
              )}
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                selectedEvalStrategy === 'quick'
                  ? 'bg-brand-warning/10 border-brand-warning/25 text-brand-warning'
                  : 'bg-brand-primary/10 border-brand-primary/25 text-brand-primary'
              }`}>
                {selectedEvalStrategy === 'quick' ? '⚡ Quick Evaluation' : '🧠 Intelligent Evaluation'}
              </span>
              {evaluatingJob.scores_outdated && (
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-brand-danger/10 border-brand-danger/25 text-brand-danger">
                  ⚠ Scores Outdated
                </span>
              )}
            </div>

            {evalLoading ? (
              <div className="py-2 space-y-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 bg-brand-primary/20 rounded-full animate-ping"></div>
                    <div className="absolute inset-2 bg-brand-panel border border-brand-border rounded-full flex items-center justify-center">
                      {selectedEvalStrategy === 'quick'
                        ? <Sparkles className="w-6 h-6 text-brand-warning animate-pulse" />
                        : <Brain className="w-6 h-6 text-brand-primary animate-pulse" />}
                    </div>
                  </div>
                  <h4 className="text-base font-bold text-brand-textPrimary">
                    {selectedEvalStrategy === 'quick' ? 'Quick Screening Engine' : 'AI Recruiting Intelligence Engine'}
                  </h4>
                  <p className="text-[11px] text-brand-textSecondary mt-0.5">
                    {selectedEvalStrategy === 'quick'
                      ? 'Matching candidate skills against job requirements'
                      : 'Evaluating applications via Google Gemini LLM'}
                  </p>
                </div>

                {/* Progress bar scanner effect */}
                <div className="relative w-full h-2 bg-brand-bg rounded-full overflow-hidden border border-brand-border/40">
                  <motion.div 
                    className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ 
                      width: evaluationStep === 0 ? "20%" :
                             evaluationStep === 1 ? "45%" :
                             evaluationStep === 2 ? "65%" :
                             evaluationStep === 3 ? "80%" :
                             evaluationStep === 4 ? "92%" : "100%"
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/3 animate-pulse"></div>
                </div>

                {/* Checklist Stepper */}
                <div className="space-y-3 bg-brand-bg/50 p-4 rounded-2xl border border-brand-border/40">
                  {(selectedEvalStrategy === 'quick' ? [
                    "📄 Scanning Resume Skills...",
                    "🔍 Matching Against Requirements...",
                    "📊 Computing Quick Match Scores...",
                    "🏆 Building Rankings...",
                    "✅ Quick Evaluation Complete!"
                  ] : [
                    "🧠 Parsing Resume Credentials...",
                    "🔍 Extracting Skills & Experience...",
                    "📊 Evaluating Experience Relevance...",
                    "🤖 Matching Candidates to Job Metrics...",
                    "🏆 Generating Staggered Leaderboard...",
                    "🎉 Evaluation Complete!"
                  ]).map((stepLabel, idx) => {
                    const isDone = evaluationStep > idx || (evaluationStep === 5 && idx === 5);
                    const isActive = evaluationStep === idx;

                    return (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        {isDone ? (
                          <div className="w-5 h-5 rounded-full bg-brand-success/20 border border-brand-success/40 flex items-center justify-center text-brand-success text-[10px] font-bold">
                            ✓
                          </div>
                        ) : isActive ? (
                          <div className="w-5 h-5 rounded-full bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-brand-primary">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-ping"></span>
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-brand-bg border border-brand-border/60 flex items-center justify-center text-brand-textSecondary/40 text-[9px]">
                            •
                          </div>
                        )}
                        <span className={`font-semibold ${
                          isDone ? "text-brand-success" :
                          isActive ? "text-white animate-pulse" :
                          "text-brand-textSecondary/60"
                        }`}>
                          {stepLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateEvaluation} className="space-y-6">
                {/* Evaluation Strategy Choice */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-textSecondary">Select Evaluation Strategy</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedEvalStrategy('quick')}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                        selectedEvalStrategy === 'quick'
                          ? 'border-brand-warning bg-brand-warning/5 shadow-md'
                          : 'border-brand-border/40 bg-brand-bg/30 hover:border-brand-border'
                      }`}
                    >
                      {selectedEvalStrategy === 'quick' && (
                        <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-brand-warning flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white animate-scale-up" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">⚡</span>
                        <span className={`text-xs font-bold ${selectedEvalStrategy === 'quick' ? 'text-brand-warning' : 'text-brand-textPrimary'}`}>Quick Evaluation</span>
                      </div>
                      <p className="text-[10px] text-brand-textSecondary leading-relaxed">
                        Fast keyword-only screening. Matches required skills against resume skills. No AI calls.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedEvalStrategy('intelligent')}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                        selectedEvalStrategy === 'intelligent'
                          ? 'border-brand-primary bg-brand-primary/5 shadow-md'
                          : 'border-brand-border/40 bg-brand-bg/30 hover:border-brand-border'
                      }`}
                    >
                      {selectedEvalStrategy === 'intelligent' && (
                        <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-brand-primary flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white animate-scale-up" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">🧠</span>
                        <span className={`text-xs font-bold ${selectedEvalStrategy === 'intelligent' ? 'text-brand-primary' : 'text-brand-textPrimary'}`}>Intelligent Evaluation</span>
                      </div>
                      <p className="text-[10px] text-brand-textSecondary leading-relaxed">
                        Full AI-powered pipeline: 20% Keyword + 60% ATS + 20% Gemini AI. Deep contextual insights.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Unified Match Engine Explanation */}
                <div className="space-y-4 bg-brand-bg/40 p-5 rounded-2xl border border-brand-border/60">
                  {selectedEvalStrategy === 'quick' ? (
                    <>
                      <h4 className="text-sm font-bold text-brand-warning">⚡ Quick Evaluation Engine</h4>
                      <p className="text-xs text-brand-textSecondary leading-relaxed">
                        This performs fast keyword-only screening for all applicant resumes:
                      </p>
                      <ul className="space-y-2.5 text-xs text-brand-textSecondary">
                        <li className="flex items-start gap-2">
                          <span className="text-brand-warning font-bold">• Skills Matching:</span>
                          <span>Compares each candidate's resume skills against the required skills for this job.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-brand-warning font-bold">• Quick Match %:</span>
                          <span>(Matched Skills ÷ Total Required Skills) × 100. No AI calls, no ATS scoring — results are instant.</span>
                        </li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <h4 className="text-sm font-bold text-brand-textPrimary">🧠 Intelligent Evaluation Engine</h4>
                      <p className="text-xs text-brand-textSecondary leading-relaxed">
                        This launches a comprehensive three-pronged screening pipeline for all applicant resumes:
                      </p>
                      <ul className="space-y-2.5 text-xs text-brand-textSecondary">
                        <li className="flex items-start gap-2">
                          <span className="text-brand-primary font-bold">1. Keyword Matching (20%):</span>
                          <span>Analyzes exact matches for required skills.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-brand-secondary font-bold">2. ATS Weighted Score (60%):</span>
                          <span>Evaluates Skills, Projects, and Resume Quality. Experience weight is automatically optimized (<strong>{evaluatingJob.experience_required === 0 ? "0%" : evaluatingJob.experience_required >= 5 ? "50%" : evaluatingJob.experience_required <= 2 ? "15%" : "40%"}</strong>) based on required experience to ensure fair treatment.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-brand-accent font-bold">3. Gemini AI Analysis (20%):</span>
                          <span>Generates deep contextual insights, strengths, weaknesses, and hiring recommendations.</span>
                        </li>
                      </ul>
                    </>
                  )}
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-brand-border/40">
                  <button
                    type="button"
                    onClick={() => {
                      setEvalModalOpen(false);
                      setEvaluatingJob(null);
                    }}
                    className="bg-brand-panel hover:bg-brand-panelLight border border-brand-border px-5 py-2.5 rounded-xl text-xs font-semibold text-brand-textSecondary hover:text-brand-textPrimary transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-brand-primary to-brand-secondary text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-premium"
                  >
                    Generate Evaluation
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* RESULTS PREVIEW MODAL — 4-Step Wizard */}
      {previewModalOpen && previewJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-lg bg-brand-panel border border-brand-border rounded-2xl shadow-premium relative animate-scale-up overflow-hidden">
            <button
              onClick={() => { setPreviewModalOpen(false); setPreviewJob(null); setShortlistingSummary(null); setShortlistStep('stats'); setShortlistOverrides(new Set()); }}
              className="absolute top-4 right-4 z-10 text-brand-textSecondary hover:text-brand-textPrimary bg-brand-bg hover:bg-brand-panelLight p-2 rounded-xl border border-brand-border transition-all"
            >
              <XCircle className="w-5 h-5" />
            </button>

            {/* Progress Bar */}
            {shortlistStep !== 'summary' && (
              <div className="px-6 pt-6 pb-0">
                <div className="flex items-center gap-2 mb-6">
                  {[{ key: 'stats', label: 'Statistics' }, { key: 'criteria', label: 'Criteria' }, { key: 'preview', label: 'Preview' }, { key: 'summary', label: 'Confirm' }].map((step, idx, arr) => {
                    const stepOrder = ['stats', 'criteria', 'preview', 'summary'];
                    const currentIdx = stepOrder.indexOf(shortlistStep);
                    const stepIdx = stepOrder.indexOf(step.key);
                    const isDone = stepIdx < currentIdx;
                    const isCurrent = stepIdx === currentIdx;
                    return (
                      <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all ${
                            isDone ? 'bg-brand-success border-brand-success text-white' :
                            isCurrent ? 'bg-brand-primary border-brand-primary text-white' :
                            'bg-brand-bg border-brand-border/60 text-brand-textSecondary'
                          }`}>
                            {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <span className={`text-[9px] mt-1 font-bold ${isCurrent ? 'text-brand-primary' : 'text-brand-textSecondary'}`}>{step.label}</span>
                        </div>
                        {idx < arr.length - 1 && (
                          <div className={`flex-1 h-0.5 mb-4 transition-all ${isDone ? 'bg-brand-success' : 'bg-brand-border/40'}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="px-6 pb-6 max-h-[75vh] overflow-y-auto space-y-4">

              {/* STEP 1: STATISTICS */}
              {shortlistStep === 'stats' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-brand-textPrimary flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-brand-primary" /> Candidate Pool Statistics
                    </h3>
                    <p className="text-xs text-brand-textSecondary mt-1">Overview for <strong>{previewJob.title}</strong></p>
                  </div>
                  {previewJob.pool_analysis ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Total Candidates', value: applications.filter(a => a.job_id === previewJob.id).length, color: 'text-brand-primary' },
                        { label: 'Avg Score', value: `${previewJob.pool_analysis.average_score}%`, color: 'text-brand-secondary' },
                        { label: 'Highest Score', value: `${previewJob.pool_analysis.highest_score}%`, color: 'text-brand-success' },
                        { label: 'Lowest Score', value: `${previewJob.pool_analysis.lowest_score}%`, color: 'text-brand-danger' },
                      ].map(stat => (
                        <div key={stat.label} className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border/40 text-center">
                          <span className="text-[9px] text-brand-textSecondary uppercase font-bold block">{stat.label}</span>
                          <strong className={`text-2xl font-black block mt-1 ${stat.color}`}>{stat.value}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-brand-danger/10 p-4 rounded-xl border border-brand-danger/25 text-center text-xs text-brand-danger">
                      No pool analysis available. Please run evaluation first.
                    </div>
                  )}
                  {previewJob.pool_analysis?.recommended_threshold && (
                    <div className="bg-brand-primary/5 border border-brand-primary/25 p-4 rounded-xl flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-brand-primary shrink-0 animate-pulse" />
                      <div>
                        <span className="text-xs font-bold text-brand-primary block">AI Recommended Threshold</span>
                        <span className="text-[10px] text-brand-textSecondary">Based on pool quality, shortlist candidates scoring ≥ <strong className="text-brand-primary">{previewJob.pool_analysis.recommended_threshold}%</strong></span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => { setPreviewThreshold(previewJob.pool_analysis?.recommended_threshold || 70); setShortlistStep('criteria'); }}
                    className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-premium flex items-center justify-center gap-2"
                  >
                    Configure Shortlist <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* STEP 2: CRITERIA */}
              {shortlistStep === 'criteria' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-brand-textPrimary">Set Shortlist Criteria</h3>
                    <p className="text-xs text-brand-textSecondary mt-1">Configure thresholds for <strong>{previewJob.title}</strong></p>
                  </div>
                  {previewJob.scores_outdated && (
                    <div className="bg-brand-danger/10 border border-brand-danger/30 rounded-xl p-4 text-xs text-brand-danger flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div><strong className="block font-bold uppercase mb-0.5">Scores Outdated</strong>Re-evaluate candidates before generating a shortlist.</div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-brand-textSecondary">Min Match Score (%)</label>
                      <input type="number" min="0" max="100" value={previewThreshold}
                        onChange={e => setPreviewThreshold(e.target.value)}
                        className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary focus:outline-none focus:border-brand-primary font-bold text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-brand-textSecondary">Max Candidates Limit</label>
                      <input type="number" min="1" placeholder="No limit" value={previewMaxCandidates}
                        onChange={e => setPreviewMaxCandidates(e.target.value)}
                        className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary placeholder-brand-textSecondary focus:outline-none focus:border-brand-primary font-bold text-sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-brand-bg/40 p-4 rounded-xl border border-brand-border/30">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={previewSendEmails} onChange={e => setPreviewSendEmails(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-brand-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
                    </label>
                    <div>
                      <span className="text-xs font-bold text-brand-textPrimary block">Send Invitation Emails</span>
                      <span className="text-[9px] text-brand-textSecondary">Notify shortlisted candidates by email after confirmation.</span>
                    </div>
                  </div>
                  {(() => {
                    const jobApps = applications.filter(a => a.job_id === previewJob.id);
                    const evaluatedApps = jobApps.filter(a => a.match_score);
                    const matchingCount = evaluatedApps.filter(a => a.match_score.final_score >= parseInt(previewThreshold || 0)).length;
                    const maxLimit = parseInt(previewMaxCandidates);
                    const toShortlistCount = (!isNaN(maxLimit) && maxLimit > 0) ? Math.min(matchingCount, maxLimit) : matchingCount;
                    return (
                      <div className="bg-brand-primary/5 p-4 rounded-xl border border-brand-primary/25 flex justify-between items-center">
                        <span className="text-xs text-brand-textSecondary">Candidates to be shortlisted:</span>
                        <strong className="text-brand-success text-lg font-black">{toShortlistCount}</strong>
                      </div>
                    );
                  })()}
                  <div className="flex gap-3">
                    <button onClick={() => setShortlistStep('stats')} className="flex-1 bg-brand-panel border border-brand-border py-2.5 rounded-xl text-xs font-semibold text-brand-textSecondary hover:text-brand-textPrimary transition-all">← Back</button>
                    <button
                      onClick={() => { setShortlistOverrides(new Set()); setShortlistStep('preview'); }}
                      disabled={previewJob.scores_outdated}
                      className="flex-1 bg-gradient-to-r from-brand-primary to-brand-secondary text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-premium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Preview Candidates →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PREVIEW & MANUAL OVERRIDE */}
              {shortlistStep === 'preview' && (() => {
                const jobApps = applications.filter(a => a.job_id === previewJob.id && a.match_score);
                const threshold = parseInt(previewThreshold || 0);
                const maxLimit = parseInt(previewMaxCandidates);
                let qualifying = jobApps
                  .filter(a => a.match_score.final_score >= threshold)
                  .sort((a, b) => b.match_score.final_score - a.match_score.final_score);
                if (!isNaN(maxLimit) && maxLimit > 0) qualifying = qualifying.slice(0, maxLimit);
                const includedIds = qualifying.filter(a => !shortlistOverrides.has(a.id)).map(a => a.id);

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-brand-textPrimary">Preview & Adjust</h3>
                        <p className="text-xs text-brand-textSecondary mt-0.5">Toggle to include/exclude individual candidates</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-brand-success">{includedIds.length}</span>
                        <span className="text-[10px] text-brand-textSecondary">/{qualifying.length} selected</span>
                      </div>
                    </div>

                    {qualifying.length === 0 ? (
                      <div className="py-8 text-center text-brand-textSecondary">
                        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs">No candidates meet the current threshold.</p>
                        <button onClick={() => setShortlistStep('criteria')} className="mt-3 text-xs text-brand-primary font-bold hover:underline">Adjust Criteria</button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {qualifying.map((app, idx) => {
                          const excluded = shortlistOverrides.has(app.id);
                          return (
                            <div
                              key={app.id}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                excluded ? 'bg-brand-bg/30 border-brand-border/40 opacity-50' : 'bg-brand-bg/60 border-brand-border/60'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-[10px] font-black text-brand-primary w-5 shrink-0">#{idx + 1}</span>
                                <div className="w-7 h-7 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-xs shrink-0">
                                  {app.candidate_name?.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <h4 className={`font-bold text-xs truncate ${excluded ? 'line-through text-brand-textSecondary' : 'text-brand-textPrimary'}`}>{app.candidate_name}</h4>
                                  <p className="text-[9px] text-brand-textSecondary">{Math.round(app.match_score.final_score)}% Match</p>
                                </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                                <input
                                  type="checkbox"
                                  checked={!excluded}
                                  onChange={() => setShortlistOverrides(prev => {
                                    const next = new Set(prev);
                                    if (next.has(app.id)) next.delete(app.id); else next.add(app.id);
                                    return next;
                                  })}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-brand-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-success"></div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setShortlistStep('criteria')} className="flex-1 bg-brand-panel border border-brand-border py-2.5 rounded-xl text-xs font-semibold text-brand-textSecondary hover:text-brand-textPrimary transition-all">← Back</button>
                      <button
                        onClick={() => handleGenerateResults(previewJob.id, previewThreshold, previewMaxCandidates, previewSendEmails, includedIds)}
                        disabled={resultsLoading || includedIds.length === 0}
                        className="flex-1 bg-gradient-to-r from-brand-success to-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-premium disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {resultsLoading ? 'Shortlisting...' : `Confirm Shortlist (${includedIds.length})`}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* STEP 4: SUMMARY */}
              {(shortlistStep === 'summary' && shortlistingSummary) && (
                <div className="text-center py-4 space-y-5">
                  <div className="mx-auto w-14 h-14 rounded-full bg-brand-success/15 border border-brand-success/30 flex items-center justify-center text-brand-success text-2xl">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-brand-textPrimary">Shortlisting Complete!</h3>
                    <p className="text-xs text-brand-textSecondary mt-1">Shortlist for <strong>{previewJob.title}</strong> has been confirmed.</p>
                  </div>
                  <div className="bg-brand-bg/40 p-5 rounded-2xl border border-brand-border/40 text-left text-xs divide-y divide-brand-border/40">
                    {[
                      { label: 'Total Candidates', value: shortlistingSummary.totalCandidates },
                      { label: 'Evaluated', value: shortlistingSummary.evaluatedCount },
                      { label: 'Shortlisted', value: shortlistingSummary.shortlistedCount, bold: true, color: 'text-brand-success' },
                      { label: 'Average Match Score', value: `${shortlistingSummary.averageScore}%` },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between py-2.5">
                        <span className="text-brand-textSecondary">{row.label}:</span>
                        <strong className={`font-bold ${row.color || 'text-brand-textPrimary'}`}>{row.value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 bg-brand-bg/40 p-4 rounded-xl border border-brand-border/30 text-left">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={successSendEmails} onChange={e => setSuccessSendEmails(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-brand-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
                    </label>
                    <div>
                      <span className="text-xs font-bold text-brand-textPrimary block">Send Invitation Emails</span>
                      <span className="text-[9px] text-brand-textSecondary">Notify shortlisted candidates of their selection.</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {shortlistingSummary.shortlistedCount > 0 && (
                      <button
                        onClick={async () => {
                          const jobToEval = previewJob;
                          if (successSendEmails) {
                            setSendingEmails(true);
                            try {
                              await API.post(`/jobs/${jobToEval.id}/send-shortlist-emails`);
                            } catch (err) {
                              console.error('Failed to send emails:', err);
                            } finally {
                              setSendingEmails(false);
                            }
                          }
                          setPreviewModalOpen(false);
                          setPreviewJob(null);
                          setShortlistingSummary(null);
                          setShortlistStep('stats');
                          setShortlistOverrides(new Set());

                          setEvaluatingJob(jobToEval);
                          setEvalShortlistedOnly(true);
                          setSelectedEvalStrategy(jobToEval.evaluation_strategy || 'intelligent');
                          setEvalModalOpen(true);
                          setEvaluationStep(0);
                        }}
                        disabled={sendingEmails}
                        className="w-full bg-brand-panel hover:bg-slate-50 border border-brand-border py-2.5 rounded-xl text-xs font-semibold text-brand-textSecondary hover:text-brand-textPrimary transition-all flex items-center justify-center gap-2"
                      >
                        <Brain className="w-4 h-4 text-brand-warning animate-pulse" />
                        Evaluate Shortlisted Candidates (Optional)
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (successSendEmails && shortlistingSummary.shortlistedCount > 0) {
                          setSendingEmails(true);
                          try {
                            await API.post(`/jobs/${previewJob.id}/send-shortlist-emails`);
                            alert('Successfully sent invitation emails!');
                          } catch (err) {
                            alert('Failed to send emails: ' + (err.response?.data?.message || err.message));
                          } finally {
                            setSendingEmails(false);
                          }
                        }
                        setPreviewModalOpen(false);
                        setPreviewJob(null);
                        setShortlistingSummary(null);
                        setShortlistStep('stats');
                        setShortlistOverrides(new Set());
                      }}
                      disabled={sendingEmails}
                      className="w-full bg-gradient-to-r from-brand-success to-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-premium disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {sendingEmails ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : successSendEmails ? (
                        <Send className="w-4 h-4" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {sendingEmails ? 'Sending...' : successSendEmails ? 'Confirm & Send Emails' : 'Confirm Shortlist'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* FLOATING BULK ACTIONS BAR */}
      {selectedAppIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-brand-panel border border-brand-border/80 rounded-2xl px-6 py-4 flex items-center gap-6 shadow-premium backdrop-blur-md animate-fade-in">
          <span className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider">
            {selectedAppIds.length} Selected
          </span>
          <div className="h-6 w-px bg-brand-border/60"></div>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkStatusUpdate('selected')}
              className="bg-brand-success/15 hover:bg-brand-success/25 border border-brand-success/35 text-brand-success px-4 py-2 rounded-xl text-xs font-bold transition-all"
            >
              Select Selected
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('rejected')}
              className="bg-brand-danger/15 hover:bg-brand-danger/25 border border-brand-danger/35 text-brand-danger px-4 py-2 rounded-xl text-xs font-bold transition-all"
            >
              Reject Selected
            </button>
            <button
              onClick={handleBulkExport}
              className="bg-brand-primary/15 hover:bg-brand-primary/25 border border-brand-primary/35 text-brand-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => setSelectedAppIds([])}
              className="bg-brand-panel hover:bg-brand-panelLight border border-brand-border px-3 py-2 rounded-xl text-xs font-semibold text-brand-textSecondary hover:text-brand-textPrimary transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* JOB DETAIL DRAWER / MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedJob(null)}>
          <div 
            className="w-full max-w-4xl bg-brand-panel border-l border-brand-border shadow-2xl flex flex-col h-full animate-slide-left overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-brand-border/60 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-brand-textPrimary">{selectedJob.title}</h3>
                <div className="flex items-center gap-4 text-xs text-brand-textSecondary mt-1">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {selectedJob.location || 'Remote'}</span>
                  <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> {selectedJob.experience_required}+ Yrs Required</span>
                  {selectedJob.evaluation_status === 'evaluated' && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                      selectedJob.evaluation_strategy === 'quick'
                        ? 'bg-brand-warning/10 border-brand-warning/20 text-brand-warning'
                        : 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'
                    }`}>
                      {selectedJob.evaluation_strategy === 'quick' ? '⚡ Quick' : '🧠 Intelligent'}
                    </span>
                  )}
                  {selectedJob.scores_outdated && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-brand-danger/10 border-brand-danger/20 text-brand-danger animate-pulse">
                      ⚠ Scores Outdated
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setSelectedJob(null)}
                className="text-brand-textSecondary hover:text-brand-textPrimary bg-brand-bg hover:bg-brand-panelLight p-2 rounded-xl border border-brand-border transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
              {/* 7-Stat Quick Summary Row */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 bg-brand-bg/50 p-3 rounded-2xl border border-brand-border/40">
                {[
                  { label: 'Applied', status: 'applied', count: applications.filter(a => a.job_id === selectedJob.id).length, color: 'text-brand-primary', bg: 'bg-brand-primary/10 border-brand-primary/20' },
                  { label: 'Pending', status: 'pending_evaluation', count: applications.filter(a => a.job_id === selectedJob.id && a.status === 'pending_evaluation').length, color: 'text-brand-warning', bg: 'bg-brand-warning/10 border-brand-warning/20' },
                  { label: 'Evaluated', status: 'evaluated', count: applications.filter(a => a.job_id === selectedJob.id && a.status === 'evaluated').length, color: 'text-brand-secondary', bg: 'bg-brand-secondary/10 border-brand-secondary/20' },
                  { label: 'Shortlisted', status: 'shortlisted', count: applications.filter(a => a.job_id === selectedJob.id && a.status === 'shortlisted').length, color: 'text-brand-success', bg: 'bg-brand-success/10 border-brand-success/20' },
                  { label: 'Interview', status: 'interview', count: applications.filter(a => a.job_id === selectedJob.id && a.status === 'interview').length, color: 'text-brand-accent', bg: 'bg-brand-accent/10 border-brand-accent/20' },
                  { label: 'Selected', status: 'selected', count: applications.filter(a => a.job_id === selectedJob.id && (a.status === 'selected' || a.status === 'approved')).length, color: 'text-brand-success', bg: 'bg-brand-success/15 border-brand-success/30' },
                  { label: 'Hired', status: 'hired', count: applications.filter(a => a.job_id === selectedJob.id && a.status === 'hired').length, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                ].map(stat => (
                  <button
                    key={stat.status}
                    onClick={() => { setFilterJobId(String(selectedJob.id)); setFilterStatus(stat.status); setSelectedJob(null); setActiveTab('applications'); }}
                    className={`flex flex-col items-center p-2 rounded-xl border text-center cursor-pointer hover:opacity-80 transition-all ${stat.bg}`}
                    title={`View ${stat.label} candidates`}
                  >
                    <strong className={`text-lg font-black ${stat.color}`}>{stat.count}</strong>
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${stat.color} opacity-80`}>{stat.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Pane: Job Details */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider mb-2">Job Description</h4>
                    <p className="text-xs text-brand-textSecondary leading-relaxed whitespace-pre-wrap bg-brand-bg/40 p-4 rounded-xl border border-brand-border/30">
                      {selectedJob.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider mb-2">Required Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedJob.skills_required?.map((skill, idx) => (
                        <span key={idx} className="text-xs bg-brand-primary/10 border border-brand-primary/20 text-brand-primary px-3 py-1.5 rounded-lg font-semibold">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider mb-3">Pipeline Status</h4>
                    <div className="flex items-center gap-1 select-none flex-wrap bg-brand-bg/40 p-4 rounded-xl border border-brand-border/30">
                      {(() => {
                        const expired = isJobExpired(selectedJob);
                        const isClosed = expired || selectedJob.status === 'closed';
                        const isEvaluated = selectedJob.evaluation_status === 'evaluated';
                        const hasResults = selectedJob.results_generated;
                        const steps = [
                          { label: 'Open', done: true, active: !isClosed },
                          { label: 'Closed', done: isClosed, active: isClosed && !isEvaluated },
                          { label: 'Evaluated', done: isEvaluated, active: isEvaluated && !hasResults },
                          { label: 'Results', done: hasResults, active: hasResults },
                        ];
                        return steps.map((step, idx) => (
                          <React.Fragment key={idx}>
                            {idx > 0 && (
                              <div className={`w-4 h-px flex-shrink-0 ${step.done ? 'bg-brand-primary' : 'bg-brand-border/50'}`} />
                            )}
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border transition-all whitespace-nowrap ${
                              step.active
                                ? 'bg-brand-primary/15 border-brand-primary/45 text-brand-primary shadow-sm'
                                : step.done
                                  ? 'bg-brand-success/15 border-brand-success/35 text-brand-success'
                                  : 'bg-brand-bg/40 border-brand-border/30 text-brand-textSecondary/50'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                step.active ? 'bg-brand-primary animate-pulse' : step.done ? 'bg-brand-success/70' : 'bg-brand-border/40'
                              }`} />
                              {step.label}
                            </div>
                          </React.Fragment>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* AI Insights Toggle */}
                  <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-brand-textPrimary block">AI Evaluation Insights</span>
                      <span className="text-[10px] text-brand-textSecondary">Show/hide Gemini AI contextual analysis and suggestions for candidates.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedJob.ai_insights_enabled !== false}
                        onChange={() => handleToggleAiInsights(selectedJob.id)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-brand-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
                    </label>
                  </div>
                </div>

                {/* Right Pane: AI Pool Analytics & Statistics */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider mb-3">Hiring Pool Summary</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/30 text-center">
                        <span className="text-[10px] text-brand-textSecondary uppercase font-bold block">Total Applied</span>
                        <strong className="text-2xl text-brand-textPrimary block mt-1">{applications.filter(a => a.job_id === selectedJob.id).length}</strong>
                      </div>
                      <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/30 text-center">
                        <span className="text-[10px] text-brand-success uppercase font-bold block">Shortlisted</span>
                        <strong className="text-2xl text-brand-success block mt-1">
                          {applications.filter(a => a.job_id === selectedJob.id && (a.status === 'shortlisted' || a.status === 'selected' || a.status === 'approved')).length}
                        </strong>
                      </div>
                      <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/30 text-center">
                        <span className="text-[10px] text-brand-secondary uppercase font-bold block">Interviewing</span>
                        <strong className="text-2xl text-brand-secondary block mt-1">
                          {applications.filter(a => a.job_id === selectedJob.id && a.status === 'interview').length}
                        </strong>
                      </div>
                      <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border/30 text-center">
                        <span className="text-[10px] text-brand-danger uppercase font-bold block">Rejected</span>
                        <strong className="text-2xl text-brand-danger block mt-1">
                          {applications.filter(a => a.job_id === selectedJob.id && a.status === 'rejected').length}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {selectedJob.evaluation_status === 'evaluated' && selectedJob.pool_analysis ? (
                    <div className="bg-brand-bg/40 p-5 rounded-2xl border border-brand-border/50 space-y-4">
                      {selectedJob.scores_outdated && (
                        <div className="bg-brand-danger/10 border border-brand-danger/25 rounded-xl p-3.5 flex flex-col gap-2 select-none">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-brand-danger shrink-0" />
                            <span className="text-[11px] font-bold text-brand-danger">Evaluation results are outdated due to changes in criteria.</span>
                          </div>
                          <button
                            onClick={() => handleOpenEvaluationModal(selectedJob)}
                            className="w-full bg-brand-danger text-white text-[10px] font-bold py-2 rounded-lg hover:opacity-90 transition-all shadow-sm"
                          >
                            Re-evaluate Candidates
                          </button>
                        </div>
                      )}
                      
                      {/* Evaluation Metadata Display */}
                      {selectedJob.evaluated_at && (
                        <div className="bg-brand-bg/60 p-3 rounded-lg border border-brand-border/30 text-[10px] space-y-1.5 text-brand-textSecondary select-none">
                          <div className="flex justify-between">
                            <span>Last Evaluated:</span>
                            <strong className="text-brand-textPrimary">
                              {new Date(selectedJob.evaluated_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Strategy:</span>
                            <strong className="text-brand-primary">
                              {selectedJob.evaluation_strategy === 'quick' ? '⚡ Quick Evaluation' : '🧠 Intelligent Evaluation'}
                            </strong>
                          </div>
                          {selectedJob.evaluated_by && (
                            <div className="flex justify-between">
                              <span>Evaluated By:</span>
                              <strong className="text-brand-textPrimary">{selectedJob.evaluated_by}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      <h4 className="text-xs font-bold text-brand-secondary uppercase tracking-wider flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-brand-secondary" /> {selectedJob.evaluation_strategy === 'quick' ? 'Quick Match Insights' : 'AI Assessment Insights'}
                      </h4>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-brand-bg/60 p-3 rounded-lg border border-brand-border/30">
                          <span className="text-[9px] text-brand-textSecondary uppercase font-semibold block">Avg Score</span>
                          <strong className="text-sm text-brand-textPrimary block mt-0.5">{selectedJob.pool_analysis.average_score}%</strong>
                        </div>
                        <div className="bg-brand-bg/60 p-3 rounded-lg border border-brand-border/30">
                          <span className="text-[9px] text-brand-textSecondary uppercase font-semibold block">Range</span>
                          <strong className="text-xs text-brand-textPrimary block mt-1">{selectedJob.pool_analysis.highest_score}% - {selectedJob.pool_analysis.lowest_score}%</strong>
                        </div>
                        <div className="bg-brand-primary/5 p-3 rounded-lg border border-brand-primary/30">
                          <span className="text-[9px] text-brand-textSecondary uppercase font-semibold block">Threshold</span>
                          <strong className="text-sm text-brand-primary block mt-0.5">{selectedJob.min_match_score || selectedJob.pool_analysis.recommended_threshold}%</strong>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] text-brand-textSecondary uppercase font-bold block">Executive Summary</span>
                        <p className="text-xs text-brand-textSecondary italic bg-brand-bg/60 p-3 rounded-lg border border-brand-border/30 leading-relaxed">
                          "{selectedJob.pool_analysis.ai_summary}"
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-brand-warning/10 p-5 rounded-2xl border border-brand-warning/20 flex flex-col items-center justify-center text-center">
                      <AlertTriangle className="w-8 h-8 text-brand-warning mb-2" />
                      <h5 className="text-sm font-bold text-brand-textPrimary">Evaluation Awaiting</h5>
                      <p className="text-xs text-brand-textSecondary mt-1 leading-relaxed">
                        To unlock match scoring and candidate ranking insights, close the job applications and generate AI screening.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Applicant Pool List */}
              <div className="pt-8 border-t border-brand-border/60 space-y-4">
                <h4 className="text-lg font-bold text-brand-textPrimary">Applicant Pool for this Job</h4>
                {applications.filter(a => a.job_id === selectedJob.id).length === 0 ? (
                  <p className="text-xs text-brand-textSecondary italic py-4">No candidates have applied to this role yet.</p>
                ) : (
                  <div className="border border-brand-border/60 rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-brand-bg/50 border-b border-brand-border/60 text-xs font-bold text-brand-textSecondary uppercase tracking-wider">
                          <th className="py-3 px-4">Candidate Name</th>
                          <th className="py-3 px-4">Match Score</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border/40 text-sm">
                        {applications.filter(a => a.job_id === selectedJob.id).map(app => (
                          <tr key={app.id} className="hover:bg-brand-panelLight/10 transition-colors">
                            <td 
                              onClick={() => { setSelectedJob(null); handleOpenAppDetails(app); }}
                              className="py-3 px-4 font-semibold text-brand-textPrimary cursor-pointer hover:text-brand-primary transition-colors"
                            >
                              {app.candidate_name}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                {app.match_score ? (
                                  <span className="text-brand-primary font-bold">{Math.round(app.match_score.final_score)}%</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-warning/15 text-brand-warning border border-brand-warning/20">⏳ Pending</span>
                                )}
                                {app.match_score && (
                                  <span className="text-[9px] px-1 rounded bg-brand-bg border border-brand-border text-brand-textSecondary font-semibold">
                                    {app.match_score.evaluation_type === 'quick' ? '⚡' : '🧠'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">{getStatusBadge(app.status, !!app.match_score, app.job_id)}</td>
                            <td className="py-3 px-4 text-center flex justify-center gap-1.5">
                              <button 
                                onClick={() => handleViewResume(app.resume_id)} 
                                title="View PDF Resume"
                                className="p-1.5 bg-brand-panel hover:bg-brand-panelLight border border-brand-border rounded-lg text-brand-textSecondary hover:text-brand-textPrimary transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => { setSelectedJob(null); handleOpenAppDetails(app); }} 
                                title="View Evaluation Details"
                                className="p-1.5 bg-brand-panel hover:bg-brand-panelLight border border-brand-border rounded-lg text-brand-textSecondary hover:text-brand-textPrimary transition-all"
                              >
                                <Sliders className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}
    </div>
  );
}
