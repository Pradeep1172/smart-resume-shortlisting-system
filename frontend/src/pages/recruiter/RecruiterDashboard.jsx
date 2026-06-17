import React, { useState, useEffect, useContext } from 'react';
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
  Sparkles
} from 'lucide-react';
import API from '../../services/api';

export default function RecruiterDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, notifications, markAsRead: markNotifRead } = useContext(AuthContext);

  // Route mapping helper
  const getInitialTab = () => {
    const path = location.pathname;
    if (path === '/jobs/create') return 'create';
    if (path === '/jobs') return 'jobs';
    if (path === '/selected') return 'selected';
    if (path === '/rejected') return 'rejected';
    if (path === '/interviews') return 'interviews';
    if (path === '/applications') return 'applications';
    if (path === '/notifications') return 'notifications';
    if (path === '/settings') return 'settings';
    if (path === '/analytics') return 'recruiter-analytics';
    if (path === '/profile') return 'profile';
    return 'analytics';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Profile management states
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: 'Smart Recruit Co',
    title: 'Senior Recruiter',
    focus: 'React, Node, Python, SQL',
    bio: 'Looking for top engineering talent.'
  });
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Sync profile data on mount or user update
  useEffect(() => {
    const localProfile = localStorage.getItem(`recruiter_profile_${user?.id}`);
    if (localProfile) {
      setProfileData(JSON.parse(localProfile));
    } else if (user) {
      setProfileData(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email
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

  // Modal detail view states
  const [selectedApp, setSelectedApp] = useState(null);
  const [weights, setWeights] = useState({ skills: 50, experience: 20, projects: 20, resume_quality: 10 });
  const [rescoring, setRescoring] = useState(false);
  const [modalTab, setModalTab] = useState('overview');

  // Settings page states
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Bulk Evaluation & Action States
  const [evaluatingJob, setEvaluatingJob] = useState(null);
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [evaluationStep, setEvaluationStep] = useState(0);

  // Threshold / Generate Results States
  const [generatingResultsJobId, setGeneratingResultsJobId] = useState(null);
  const [customThreshold, setCustomThreshold] = useState(70);
  const [resultsLoading, setResultsLoading] = useState(false);

  const [evaluatingApps, setEvaluatingApps] = useState({});

  const handleEvaluateIndividual = async (appId) => {
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
  };

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

  const getActivityTimeline = () => {
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
  };

  // Fetch all recruiter data
  const fetchRecruiterData = async () => {
    try {
      const dashboardRes = await API.get('/recruiter/dashboard');
      setMetrics(dashboardRes.data.metrics);
      
      const appsRes = await API.get('/applications');
      setApplications(appsRes.data);

      const jobsRes = await API.get('/jobs');
      setJobs(jobsRes.data);
    } catch (err) {
      console.error("Error loading recruiter dashboard data", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const settingsRes = await API.get('/recruiter/settings');
      if (settingsRes.data.default_weights) {
        setWeights(settingsRes.data.default_weights);
      }
    } catch (err) {
      console.error("Error loading settings", err);
    }
  };

  const handleSaveSettings = async (e) => {
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
  };

  useEffect(() => {
    fetchRecruiterData();
    fetchSettings();
  }, []);

  // Sync slider min score filter with job's DB threshold when a specific job is selected
  useEffect(() => {
    if (filterJobId === 'all') {
      setFilterMinScore(70);
    } else {
      const selectedJobObj = jobs.find(j => j.id === parseInt(filterJobId));
      if (selectedJobObj) {
        setFilterMinScore(selectedJobObj.min_match_score || 70);
      }
    }
  }, [filterJobId, jobs]);

  // Update active tab when path changes
  useEffect(() => {
    setActiveTab(getInitialTab());
    setCurrentPage(1); // Reset page on tab change
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
        ai_insights_enabled: jobAiInsightsEnabled
      });
      setJobSuccess('Job posting created successfully!');
      setJobTitle('');
      setJobDescription('');
      setJobLocation('');
      setJobExp(0);
      setJobSkills('');
      setJobDeadline('');
      setJobAiInsightsEnabled(true);
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

  const handleOpenAppDetails = (app) => {
    setSelectedApp(app);
    setModalTab('overview');
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
    try {
      const res = await API.put(`/applications/${appId}/status`, { status });
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp(res.data.application);
      }
      fetchRecruiterData();
    } catch (err) {
      alert("Failed to update status: " + (err.response?.data?.message || err.message));
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
    const token = localStorage.getItem('token');
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
    try {
      await API.put('/applications/bulk-status', {
        application_ids: selectedAppIds,
        status: status
      });
      alert(`Successfully updated ${selectedAppIds.length} applications to ${status.toUpperCase()}!`);
      setSelectedAppIds([]);
      fetchRecruiterData();
    } catch (err) {
      alert("Bulk update failed: " + (err.response?.data?.message || err.message));
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
      await API.post(`/jobs/${evaluatingJob.id}/evaluate`, {});
      
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

  const handleGenerateResults = async (jobId, thresholdVal) => {
    setResultsLoading(true);
    try {
      await API.post(`/jobs/${jobId}/generate-results`, {
        threshold: parseInt(thresholdVal)
      });
      alert("Shortlist and Rejected candidate lists successfully generated based on target threshold!");
      setGeneratingResultsJobId(null);
      fetchRecruiterData();
    } catch (err) {
      alert("Failed to generate results: " + (err.response?.data?.message || err.message));
    } finally {
      setResultsLoading(false);
    }
  };

  const getJobAnalytics = () => {
    let appsForJob = [];
    if (filterJobId === 'all') {
      appsForJob = applications;
    } else {
      appsForJob = applications.filter(a => a.job_id === parseInt(filterJobId));
    }

    const totalApps = appsForJob.length;
    const selectedApps = appsForJob.filter(app => {
      const score = app.match_score ? app.match_score.final_score : 0;
      const exp = app.resume?.experience_years !== undefined 
        ? app.resume.experience_years 
        : (app.match_score?.details?.experience_years !== undefined ? app.match_score.details.experience_years : 0);
      
      const meetsScore = score >= filterMinScore;
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
      
      return meetsScore && meetsExp && meetsSkills && app.status !== 'rejected';
    });

    const rejectedApps = appsForJob.filter(app => {
      const score = app.match_score ? app.match_score.final_score : 0;
      const exp = app.resume?.experience_years !== undefined 
        ? app.resume.experience_years 
        : (app.match_score?.details?.experience_years !== undefined ? app.match_score.details.experience_years : 0);
      
      const meetsScore = score >= filterMinScore;
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
      
      return !(meetsScore && meetsExp && meetsSkills) || app.status === 'rejected';
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
  };



  const getStatusBadge = (status, hasScore) => {
    switch (status) {
      case 'shortlisted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-success/15 text-brand-success border border-brand-success/20">⭐ Shortlisted</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-success/25 text-brand-textPrimary border border-brand-success/45">✓ Selected</span>;
      case 'interview':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-secondary/15 text-brand-secondary border border-brand-secondary/20">📅 Interview Scheduled</span>;
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
      
      const score = app.match_score ? app.match_score.final_score : 0;
      // Experience from serialized resume object or details fallback
      const exp = app.resume?.experience_years !== undefined 
        ? app.resume.experience_years 
        : (app.match_score?.details?.experience_years !== undefined ? app.match_score.details.experience_years : 0);
      
      // 2. Score threshold check (only filters evaluated candidates)
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
      if (activeStatusFilter === 'pending') {
        return !app.match_score && meetsExp && meetsSkills;
      }
      if (activeStatusFilter === 'evaluated') {
        return !!app.match_score && meetsAllDynamicFilters;
      }
      if (activeStatusFilter === 'shortlisted') {
        return app.status === 'shortlisted' && meetsExp && meetsSkills;
      }
      if (activeStatusFilter === 'interview') {
        return app.status === 'interview' && meetsExp && meetsSkills;
      }
      if (activeStatusFilter === 'selected' || activeStatusFilter === 'approved') {
        return app.status === 'approved' && meetsExp && meetsSkills;
      }
      if (activeStatusFilter === 'rejected') {
        return app.status === 'rejected' && meetsExp && meetsSkills;
      }
      if (activeStatusFilter === 'applied') {
        return (app.status === 'applied' || !app.status) && meetsExp && meetsSkills;
      }
      
      // Score ranges (only for evaluated candidates)
      if (activeStatusFilter === 'score-85-100') {
        return !!app.match_score && app.match_score.final_score >= 85;
      }
      if (activeStatusFilter === 'score-70-85') {
        return !!app.match_score && app.match_score.final_score >= 70 && app.match_score.final_score < 85;
      }
      if (activeStatusFilter === 'score-50-70') {
        return !!app.match_score && app.match_score.final_score >= 50 && app.match_score.final_score < 70;
      }
      if (activeStatusFilter === 'score-0-50') {
        return !app.match_score || app.match_score.final_score < 50;
      }

      // Monthly filter
      if (activeStatusFilter && activeStatusFilter.startsWith('month-')) {
        const monthShort = activeStatusFilter.replace('month-', '');
        const appDate = app.applied_at ? new Date(app.applied_at) : new Date();
        const appMonth = appDate.toLocaleString('default', { month: 'short' });
        return appMonth === monthShort;
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
    { id: 'interviews', label: 'Evaluations', path: '/interviews', icon: Clock },
    { id: 'selected', label: 'Candidates', path: '/selected', icon: CheckCircle },
    { id: 'recruiter-analytics', label: 'Analytics', path: '/analytics', icon: Award },
    { id: 'settings', label: 'Settings', path: '/settings', icon: Sliders }
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
      <div className="flex justify-between items-center px-6 py-4 border-t border-brand-border/40">
        <span className="text-xs text-brand-textSecondary">
          Showing Page {currentPage} of {totalPages} ({list.length} Total candidates)
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded bg-brand-panel border border-brand-border text-xs font-semibold text-brand-textSecondary hover:text-brand-textPrimary disabled:opacity-40 transition-all"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded bg-brand-panel border border-brand-border text-xs font-semibold text-brand-textSecondary hover:text-brand-textPrimary disabled:opacity-40 transition-all"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  // Reusable filtering panel
  const renderFilterPanel = () => {
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <input
              type="text"
              placeholder="e.g. Python, React"
              value={filterSkills}
              onChange={(e) => setFilterSkills(e.target.value)}
              className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary placeholder-brand-textSecondary focus:outline-none focus:border-brand-primary text-sm"
            />
          </div>
        </div>

        {/* Dynamic Job Analytics section */}
        {(() => {
          const analytics = getJobAnalytics();
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
                  <button onClick={() => handleBulkStatusUpdate('approved')} className="bg-brand-success text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all hover:bg-brand-success/90">
                    Approve Selected
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
                            {getStatusBadge(app.status, hasScore)}
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
                          <div className="text-2xl font-extrabold text-brand-primary tracking-tight">
                            {score}% Match
                          </div>
                          <div className="flex items-center gap-1.5">
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
          <p className="font-semibold text-brand-textPrimary">{profileData.name || user?.name || 'Jane Recruiter'}</p>
          <p className="mt-0.5">Role: {profileData.title || 'Head Recruiter'}</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto relative">
        <div className="absolute top-1/4 left-1/3 w-[30rem] h-[30rem] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

        {/* TAB 1: DASHBOARD STATS OVERVIEW */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fade-in">
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
                    onClick={() => navigate('/jobs/create')}
                    className="flex-1 xl:flex-none bg-gradient-to-r from-brand-accent to-indigo-600 hover:opacity-95 text-white text-[11px] font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-glow"
                  >
                    <Plus className="w-3.5 h-3.5" /> Post Job
                  </button>
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
                { label: 'Active Jobs', value: jobs.filter(j => j.status === 'open').length, color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20', icon: Briefcase, action: () => { navigate('/jobs'); } },
                { label: 'Total Apps', value: applications.length, color: 'text-brand-secondary bg-brand-secondary/10 border-brand-secondary/20', icon: Users, action: () => { setFilterStatus('all'); navigate('/applications'); } },
                { label: 'Pending Eval', value: applications.filter(a => !a.match_score).length, color: 'text-brand-warning bg-brand-warning/10 border-brand-warning/20', icon: Cpu, action: () => { setFilterStatus('pending'); navigate('/applications'); } },
                { label: 'Shortlisted', value: applications.filter(a => a.status === 'shortlisted').length, color: 'text-brand-accent bg-brand-accent/10 border-brand-accent/20', icon: Award, action: () => { setFilterStatus('shortlisted'); navigate('/applications'); } },
                { label: 'Selected', value: applications.filter(a => a.status === 'approved').length, color: 'text-brand-success bg-brand-success/10 border-brand-success/20', icon: CheckCircle, action: () => { setFilterStatus('selected'); navigate('/applications'); } },
                { label: 'Rejected', value: applications.filter(a => a.status === 'rejected').length, color: 'text-brand-danger bg-brand-danger/10 border-brand-danger/20', icon: XCircle, action: () => { setFilterStatus('rejected'); navigate('/applications'); } },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div 
                    key={i}
                    onClick={card.action}
                    className="glass-panel border border-brand-border/60 rounded-2xl p-4 flex items-center justify-between hover:border-brand-primary/45 hover:shadow-premium transition-all duration-300 cursor-pointer group"
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
                      <div className="py-6 text-center text-brand-textSecondary italic text-xs">
                        No candidates, jobs, or skills match your query.
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
                                <span className="text-xs font-extrabold px-2.5 py-1 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
                                  {score}% Match
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-brand-warning/10 border border-brand-warning/20 text-brand-warning">
                                  Unevaluated
                                </span>
                              )}
                              {getStatusBadge(app.status, !!app.match_score)}
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
            <div className="glass-panel border border-brand-border rounded-3xl p-6 shadow-premium relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-extrabold text-brand-textPrimary flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-primary animate-pulse" /> Visual Hiring Pipeline
                  </h3>
                  <p className="text-xs text-brand-textSecondary mt-0.5">Click any stage to filter candidate lists instantly.</p>
                </div>
              </div>
              
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 select-none px-4">
                {/* Connecting Progress Line (Hidden on mobile) */}
                <div className="absolute top-[34px] left-[5%] right-[5%] h-[3px] bg-brand-border/40 hidden md:block z-0">
                  <div className="h-full bg-gradient-to-r from-brand-primary via-brand-accent to-brand-success w-full rounded-full opacity-60"></div>
                </div>

                {[
                  { label: 'Applied', value: applications.length, status: 'all', tab: 'applications', emoji: '📥', color: 'border-brand-primary/30 text-brand-primary bg-brand-primary/5 hover:border-brand-primary' },
                  { label: 'Evaluated', value: applications.filter(a => a.match_score).length, status: 'evaluated', tab: 'applications', emoji: '📊', color: 'border-brand-secondary/30 text-brand-secondary bg-brand-secondary/5 hover:border-brand-secondary' },
                  { label: 'Shortlisted', value: applications.filter(a => a.status === 'shortlisted').length, status: 'shortlisted', tab: 'applications', emoji: '⭐', color: 'border-brand-accent/30 text-brand-accent bg-brand-accent/5 hover:border-brand-accent' },
                  { label: 'Interview', value: applications.filter(a => a.status === 'interview').length, status: 'interview', tab: 'applications', emoji: '📅', color: 'border-brand-warning/30 text-brand-warning bg-brand-warning/5 hover:border-brand-warning' },
                  { label: 'Selected', value: applications.filter(a => a.status === 'approved').length, status: 'approved', tab: 'applications', emoji: '🏆', color: 'border-brand-success/30 text-brand-success bg-brand-success/5 hover:border-brand-success' }
                ].map((step, idx, arr) => (
                  <React.Fragment key={idx}>
                    <div 
                      onClick={() => { setFilterStatus(step.status); setActiveTab(step.tab); }}
                      className={`z-10 flex-1 w-full md:w-auto border p-4 rounded-2xl flex items-center justify-between gap-4 transition-all duration-300 hover:scale-[1.03] hover:shadow-premium cursor-pointer relative group overflow-hidden ${step.color}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-brand-border/60 flex items-center justify-center text-lg shadow-sm group-hover:rotate-6 transition-transform">
                          {step.emoji}
                        </div>
                        <div>
                          <span className="text-[10px] text-brand-textSecondary uppercase font-extrabold tracking-wider block leading-tight">{step.label}</span>
                          <strong className="text-xl text-brand-textPrimary block mt-1 font-extrabold">{step.value}</strong>
                        </div>
                      </div>
                      <span className="text-[10px] bg-white/80 border border-brand-border/40 px-2 py-0.5 rounded-lg text-brand-textSecondary font-bold shrink-0">
                        {applications.length > 0 ? Math.round((step.value / applications.length) * 100) : 0}%
                      </span>
                    </div>

                    {/* Connecting Chevron Arrow (Hidden on mobile and last element) */}
                    {idx < arr.length - 1 && (
                      <div className="hidden md:flex items-center justify-center z-10 bg-brand-bg w-6 h-6 rounded-full border border-brand-border/60 shadow-sm text-brand-textSecondary text-[10px] font-bold">
                        →
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Recruiter Today's Action Desk */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Action Items & Scheduled Interviews (col-span-2) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-panel border border-brand-border rounded-3xl p-6 shadow-premium">
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
                      activeJobsWithoutEval.forEach(job => {
                        const count = applications.filter(a => a.job_id === job.id && !a.match_score).length;
                        actions.push({
                          title: `Bulk Screening Awaiting for ${job.title}`,
                          desc: `${count} candidates applied. Run the unified match engine to score and rank them.`,
                          badge: "Job Screening",
                          badgeColor: "bg-brand-warning/10 border-brand-warning/20 text-brand-warning",
                          btnText: "Run Evaluation",
                          onClick: () => {
                            setEvaluatingJob(job);
                            setSelectedJob(job);
                            setEvalModalOpen(true);
                            setEvaluationStep(0);
                          }
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

                {/* Upcoming Interviews widget */}
                <div className="glass-panel border border-brand-border rounded-3xl p-6 shadow-premium">
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
                                onClick={() => handleUpdateStatus(app.id, 'approved')}
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
              </div>

              {/* Right Column: Checklist */}
              <div className="space-y-6">
                <div className="glass-panel border border-brand-border rounded-3xl p-6 shadow-premium h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-brand-textPrimary flex items-center gap-2 mb-4 border-b border-brand-border/45 pb-3">
                      <CheckCircle className="w-5 h-5 text-brand-success" /> Recruiter Tasks Checklist
                    </h3>
                    <div className="space-y-3.5">
                      {[
                        { id: 1, text: "Review new resumes in queue", done: applications.filter(a => !a.match_score).length === 0 },
                        { id: 2, text: "Shortlist candidates above threshold", done: applications.some(a => a.status === 'shortlisted') },
                        { id: 3, text: "Set interview times for candidates", done: applications.some(a => a.status === 'interview') },
                        { id: 4, text: "Finalize selections & send offers", done: applications.some(a => a.status === 'approved') },
                      ].map(task => (
                        <div key={task.id} className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                            task.done 
                              ? 'bg-brand-success/20 border-brand-success/40 text-brand-success' 
                              : 'bg-brand-bg border-brand-border/60'
                          }`}>
                            {task.done && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <span className={`text-xs font-semibold ${task.done ? 'text-brand-textSecondary line-through font-medium' : 'text-brand-textPrimary'}`}>
                            {task.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-brand-border/40 mt-6 text-[10px] text-brand-textSecondary font-semibold">
                    💡 Tip: Evaluating resumes updates this checklist automatically based on your database state.
                  </div>
                </div>
              </div>
            </div>

            {/* MAIN ATS RECRUITER WORKSPACE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Part: Evaluation Workspace (col-span-2) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Evaluation Queue */}
                <div id="evaluation-queue-section" className="glass-panel border border-brand-border rounded-3xl p-6 shadow-premium">
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

                {/* 2. Recent Evaluations Section */}
                <div className="glass-panel border border-brand-border rounded-3xl p-6 shadow-premium">
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

              </div>

              {/* Right Part: Recruiter Insights & Active Campaigns (col-span-1) */}
              <div className="space-y-6">
                
                {/* Insights Widget */}
                {(() => {
                  const newApps = applications.filter(a => {
                    const diff = new Date() - new Date(a.applied_at);
                    return diff <= 7 * 24 * 60 * 60 * 1000;
                  }).length;
                  const awaitCount = applications.filter(a => !a.match_score).length;
                  const intCount = applications.filter(a => a.status === 'interview').length;
                  const maxScore = applications.filter(a => a.match_score).length > 0
                    ? Math.max(...applications.filter(a => a.match_score).map(a => Math.round(a.match_score.final_score)))
                    : 0;
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

                {/* Top Candidates Leaderboard */}
                <div className="glass-panel border border-brand-border rounded-3xl p-5 shadow-premium">
                  <div className="flex justify-between items-center mb-3 border-b border-brand-border/45 pb-2">
                    <h3 className="text-sm font-extrabold text-brand-textPrimary flex items-center gap-2">
                      <Award className="w-5 h-5 text-brand-accent" /> Top Candidates
                    </h3>
                  </div>
                  {(() => {
                    const topCand = applications
                      .filter(a => a.match_score)
                      .sort((a, b) => b.match_score.final_score - a.match_score.final_score)
                      .slice(0, 3);
                    
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

                {/* Recent Activity Timeline */}
                <div className="glass-panel border border-brand-border rounded-3xl p-5 shadow-premium">
                  <div className="flex justify-between items-center mb-3 border-b border-brand-border/45 pb-2">
                    <h3 className="text-sm font-extrabold text-brand-textPrimary flex items-center gap-2">
                      <Clock className="w-5 h-5 text-brand-primary" /> Recent Activity
                    </h3>
                  </div>
                  
                  {(() => {
                    const activities = getActivityTimeline();
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

                {/* Active Campaigns */}
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
                    <div className="py-6 text-center text-xs text-brand-textSecondary bg-slate-50/50 border border-brand-border/40 rounded-2xl border-dashed">
                      No active job campaigns.
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
                            className="p-3 bg-brand-panel hover:bg-slate-50 border border-brand-border/60 hover:border-brand-primary/40 rounded-2xl transition-all duration-300 space-y-2.5 shadow-sm"
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
                                  onClick={() => {
                                    setEvaluatingJob(job);
                                    setSelectedJob(job);
                                    setEvalModalOpen(true);
                                    setEvaluationStep(0);
                                  }}
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

              </div>
            </div>


            {/* TWO-COLUMN GRID FOR CANDIDATES LEADERBOARD & TIMELINE FEED */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Column 1 & 2: Leaderboard & Recent Applicants (col-span-2) */}
              <div className="xl:col-span-2 space-y-6">
                
                {/* 4. Top Candidates Section (Leaderboard) */}
                <div className="glass-panel border border-brand-border rounded-3xl p-6 shadow-premium">
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

                {/* Recent Applicants */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-brand-textPrimary">Recent Applicants</h3>
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
                            <th className="py-3.5 px-6">Name</th>
                            <th className="py-3.5 px-6">Job</th>
                            <th className="py-3.5 px-6">Match Score</th>
                            <th className="py-3.5 px-6">Status</th>
                            <th className="py-3.5 px-6 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/40 text-sm">
                          {applications.slice(0, 4).map(app => (
                            <tr key={app.id} className="hover:bg-brand-panelLight/10 transition-colors">
                              <td className="py-3.5 px-6 font-semibold text-brand-textPrimary">{app.candidate_name}</td>
                              <td className="py-3.5 px-6 text-brand-textSecondary">{app.job_title}</td>
                              <td className="py-3.5 px-6">
                                <span className="text-brand-primary font-bold">{app.match_score ? `${Math.round(app.match_score.final_score)}%` : '—'}</span>
                              </td>
                              <td className="py-3.5 px-6">{getStatusBadge(app.status, !!app.match_score)}</td>
                              <td className="py-3.5 px-6 text-center flex items-center justify-center gap-1.5">
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

              </div>

              {/* Column 3: Live Activity Feed (col-span-1) */}
              <div className="space-y-6">
                
                {/* 5. Live Activity Feed */}
                <div className="glass-panel border border-brand-border rounded-3xl p-6 shadow-premium flex flex-col justify-between">
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
                          if (app.status === 'approved') {
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

                        const sortedFeed = feed.sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);

                        if (sortedFeed.length === 0) {
                          return (
                            <p className="text-xs text-brand-textSecondary italic py-4">No recent activity detected.</p>
                          );
                        }

                        return sortedFeed.map((act, i) => (
                          <div 
                            key={i} 
                            onClick={() => handleOpenAppDetails(act.app)}
                            className="relative group cursor-pointer hover:bg-slate-55 p-2 rounded-xl border border-transparent hover:border-brand-border/40 transition-all duration-300"
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
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-16 text-center text-brand-textSecondary">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-brand-border" />
                <p className="text-lg font-semibold text-brand-textPrimary">No jobs posted yet</p>
                <p className="text-sm mt-1">Click the "Post a Job" button above to publish your first role.</p>
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
                                {applications.filter(a => a.job_id === job.id && (a.status === 'shortlisted' || a.status === 'approved')).length} Shortlisted
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
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-bold text-brand-secondary uppercase tracking-wider flex items-center gap-1.5 select-none">
                                <BarChart3 className="w-3.5 h-3.5 text-brand-secondary" /> AI Pool Analysis & Metrics
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
                                <strong className="block text-sm text-brand-primary mt-0.5">{job.pool_analysis.recommended_threshold}%</strong>
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
                              {generatingResultsJobId === job.id ? (
                                <div className="flex items-center gap-2 w-full justify-between" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-brand-textPrimary font-medium whitespace-nowrap">Threshold (%):</span>
                                    <input 
                                      type="number" 
                                      min="0" 
                                      max="100"
                                      value={customThreshold}
                                      onChange={(e) => setCustomThreshold(e.target.value)}
                                      className="w-16 bg-brand-bg border border-brand-border rounded-lg px-2 py-1 text-xs text-brand-textPrimary font-bold focus:outline-none focus:border-brand-primary"
                                    />
                                  </div>
                                  <div className="flex gap-1.5 shrink-0">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleGenerateResults(job.id, customThreshold); }}
                                      disabled={resultsLoading}
                                      className="bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-premium"
                                    >
                                      {resultsLoading ? 'Saving...' : 'Confirm'}
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setGeneratingResultsJobId(null); }}
                                      className="bg-brand-panel hover:bg-brand-panelLight border border-brand-border text-brand-textSecondary hover:text-brand-textPrimary text-xs font-medium px-3 py-1.5 rounded-lg"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-xs text-brand-textSecondary italic select-none">
                                    {job.results_generated 
                                      ? "Results generated and active." 
                                      : "Commit results to selected candidates."}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setGeneratingResultsJobId(job.id);
                                      setCustomThreshold(job.min_match_score || job.pool_analysis?.recommended_threshold || 70);
                                    }}
                                    className="bg-brand-secondary hover:bg-brand-secondary/95 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-lg shadow-premium transition-all"
                                  >
                                    {job.results_generated ? "Modify Threshold" : "Generate Results"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 pt-4 border-t border-brand-border/40 flex justify-between items-center gap-2">
                        <div>
                          {expired || job.status === 'closed' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEvaluatingJob(job);
                                setEvalModalOpen(true);
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

                <div className="flex items-center gap-3 bg-brand-bg/40 p-4 rounded-xl border border-brand-border/30">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={jobAiInsightsEnabled}
                      onChange={(e) => setJobAiInsightsEnabled(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-brand-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
                  </label>
                  <div>
                    <span className="text-xs font-bold text-brand-textPrimary block">Enable Gemini AI Insights</span>
                    <span className="text-[10px] text-brand-textSecondary">Generates contextual suitability reports, strengths & weaknesses for candidates.</span>
                  </div>
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
            {renderFilterPanel()}
            {renderCandidateTable(getFilteredApps(null), "No applicants currently match the selected job or query filters.")}
          </div>
        )}

        {/* TAB 5: SELECTED CANDIDATES */}
        {activeTab === 'selected' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-brand-success tracking-tight">Selected Candidates</h1>
              <p className="text-brand-textSecondary mt-1">Auto-filtered list of applicants who meet your dynamic match criteria.</p>
            </div>
            {renderFilterPanel()}
            {renderCandidateTable(getFilteredApps('selected'), "Change criteria or sliders above to auto-select matching resumes.")}
          </div>
        )}

        {/* TAB 6: REJECTED CANDIDATES */}
        {activeTab === 'rejected' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-brand-danger tracking-tight">Rejected / Under-Threshold</h1>
              <p className="text-brand-textSecondary mt-1">Applicants filtered out dynamically based on match percentage, experience, or skills.</p>
            </div>
            {renderFilterPanel()}
            {renderCandidateTable(getFilteredApps('rejected'), "Excellent! No candidates fall below the currently set screening thresholds.")}
          </div>
        )}

        {/* TAB 7: INTERVIEWS */}
        {activeTab === 'interviews' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-brand-accent tracking-tight">Interview Scheduled</h1>
              <p className="text-brand-textSecondary mt-1">Candidates marked manually for further evaluation and recruitment rounds.</p>
            </div>
            {renderCandidateTable(getFilteredApps('interview'), "No candidates are currently scheduled for an interview.")}
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
                      <p className={`text-sm ${!notif.is_read ? 'text-white font-semibold' : 'text-brand-textSecondary'}`}>
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

        {/* TAB 9: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-brand-textPrimary tracking-tight">Weights & Scoring Configurations</h1>
              <p className="text-brand-textSecondary mt-1">Configure weights and defaults used during candidate matching computations.</p>
            </div>

            {settingsSuccess && (
              <div className="bg-brand-success/10 border border-brand-success/20 text-brand-success p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 shrink-0" /> {settingsSuccess}
              </div>
            )}
            {settingsError && (
              <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" /> {settingsError}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-bold text-brand-textPrimary flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-brand-primary" /> Default Weighted Match Logic
                </h3>
                <p className="text-xs text-brand-textSecondary font-medium">These weights define match computation allocations when using Weighted evaluations.</p>

                <div className="space-y-6 pt-2">
                  <div>
                    <div className="flex justify-between text-xs text-brand-textSecondary mb-2 font-bold uppercase tracking-wider">
                      <span>Skills Matching Allocation</span>
                      <strong className="text-brand-primary">{weights.skills}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weights.skills}
                      onChange={(e) => handleWeightChange('skills', e.target.value)}
                      className="w-full accent-brand-primary bg-brand-border rounded-lg h-2 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-brand-textSecondary mb-2 font-bold uppercase tracking-wider">
                      <span>Projects Matching Allocation</span>
                      <strong className="text-brand-secondary">{weights.projects}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weights.projects}
                      onChange={(e) => handleWeightChange('projects', e.target.value)}
                      className="w-full accent-brand-secondary bg-brand-border rounded-lg h-2 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-brand-textSecondary mb-2 font-bold uppercase tracking-wider">
                      <span>Experience Years Allocation</span>
                      <strong className="text-brand-accent">{weights.experience}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weights.experience}
                      onChange={(e) => handleWeightChange('experience', e.target.value)}
                      className="w-full accent-brand-accent bg-brand-border rounded-lg h-2 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-brand-textSecondary mb-2 font-bold uppercase tracking-wider">
                      <span>Resume Quality Allocation</span>
                      <strong className="text-white">{weights.resume_quality || 0}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weights.resume_quality || 0}
                      onChange={(e) => handleWeightChange('resume_quality', e.target.value)}
                      className="w-full accent-brand-accent bg-brand-border rounded-lg h-2 cursor-pointer"
                    />
                  </div>

                  <div className="pt-4 border-t border-brand-border/40 flex justify-between items-center text-xs">
                    <span className={`font-semibold ${(weights.skills + weights.projects + weights.experience + (weights.resume_quality || 0)) === 100 ? 'text-brand-success' : 'text-brand-danger'}`}>
                      {(weights.skills + weights.projects + weights.experience + (weights.resume_quality || 0)) === 100 
                        ? '✓ Valid Weight Distribution (Sums to 100%)' 
                        : `⚠ Invalid Distribution (Must sum to 100%. Currently: ${weights.skills + weights.projects + weights.experience + (weights.resume_quality || 0)}%)`}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={settingsLoading || (weights.skills + weights.projects + weights.experience + (weights.resume_quality || 0)) !== 100}
                className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white py-3 rounded-xl font-semibold shadow-premium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {settingsLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Save Configurations'
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 10: ANALYTICS & REPORTS */}
        {activeTab === 'recruiter-analytics' && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold text-brand-textPrimary tracking-tight">Hiring Intelligence</h1>
              <p className="text-brand-textSecondary mt-1">Real-time candidate evaluation graphs, recommendation indexes, and match rates.</p>
            </div>

            {/* Metrics widgets */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest">Total Positions</span>
                <span className="text-3xl font-extrabold text-brand-primary mt-2">{jobs.length} Jobs</span>
              </div>
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest">Received Resumes</span>
                <span className="text-3xl font-extrabold text-brand-secondary mt-2">{applications.length} Applicants</span>
              </div>
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest">Evaluation Coverage</span>
                <span className="text-3xl font-extrabold text-brand-success mt-2">
                  {applications.length > 0 ? Math.round((applications.filter(a => a.match_score).length / applications.length) * 100) : 0}%
                </span>
              </div>
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest">Average Fit Score</span>
                <span className="text-3xl font-extrabold text-brand-accent mt-2">
                  {applications.filter(a => a.match_score).length > 0
                    ? Math.round(applications.reduce((acc, a) => acc + (a.match_score?.final_score || 0), 0) / applications.filter(a => a.match_score).length)
                    : 0}%
                </span>
              </div>
            </div>

            {/* Visual breakdown and details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recommendation pool breakdown */}
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40 flex items-center gap-2">
                  <Award className="w-5 h-5 text-brand-primary" /> Recommendation Index
                </h3>
                <div className="space-y-4 pt-2">
                  {[
                    { label: 'Highly Recommended (95%+)', value: applications.filter(a => a.match_score?.final_score >= 95).length, color: 'bg-brand-success' },
                    { label: 'Recommended (85%-94%)', value: applications.filter(a => a.match_score?.final_score >= 85 && a.match_score?.final_score < 95).length, color: 'bg-brand-primary' },
                    { label: 'Consider (70%-84%)', value: applications.filter(a => a.match_score?.final_score >= 70 && a.match_score?.final_score < 85).length, color: 'bg-brand-warning' },
                    { label: 'Low Match (<70%)', value: applications.filter(a => a.match_score && a.match_score?.final_score < 70).length, color: 'bg-brand-danger' }
                  ].map((item, idx) => {
                    const totalEvaluated = applications.filter(a => a.match_score).length || 1;
                    const pct = (item.value / totalEvaluated) * 100;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs text-brand-textSecondary">
                          <span className="font-semibold text-brand-textPrimary">{item.label}</span>
                          <span>{item.value} Candidates ({Math.round(pct)}%)</span>
                        </div>
                        <div className="w-full bg-brand-bg rounded-full h-2 overflow-hidden border border-brand-border/40">
                          <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Vacancy applicant count distributions */}
              <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40">
                  Application Rates by Vacancy
                </h3>
                {jobs.length === 0 ? (
                  <p className="text-xs text-brand-textSecondary text-center py-6 italic">No jobs posted yet.</p>
                ) : (
                  <div className="space-y-3 pt-1 max-h-[220px] overflow-y-auto pr-1">
                    {jobs.map(j => {
                      const count = applications.filter(a => a.job_id === j.id).length;
                      const maxCount = Math.max(...jobs.map(jb => applications.filter(ab => ab.job_id === jb.id).length)) || 1;
                      const pct = (count / maxCount) * 100;
                      return (
                        <div key={j.id} className="space-y-1">
                          <div className="flex justify-between text-xs text-brand-textSecondary">
                            <span className="font-semibold text-brand-textPrimary truncate max-w-[180px]">{j.title}</span>
                            <span>{count} Apps</span>
                          </div>
                          <div className="w-full bg-brand-bg rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-brand-secondary rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 11: PROFILE SETTINGS */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold text-brand-textPrimary tracking-tight">Recruiter Profile</h1>
              <p className="text-brand-textSecondary mt-1">Manage title, contact info, focused skills, and company credentials.</p>
            </div>

            {profileSuccess && (
              <div className="bg-brand-success/15 border border-brand-success/35 text-brand-success p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 shrink-0" /> {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="bg-brand-danger/15 border border-brand-danger/35 text-brand-danger p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" /> {profileError}
              </div>
            )}

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                setProfileSuccess('');
                setProfileError('');
                try {
                  localStorage.setItem(`recruiter_profile_${user?.id}`, JSON.stringify(profileData));
                  setProfileSuccess('Recruiter profile updated successfully!');
                  setTimeout(() => setProfileSuccess(''), 4000);
                } catch(err) {
                  setProfileError('Failed to save profile details.');
                }
              }} 
              className="space-y-6"
            >
              <div className="glass-panel border border-brand-border/60 rounded-3xl p-6 md:p-8 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Full Name</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Email Address</label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="block w-full bg-brand-bg/40 border border-brand-border rounded-xl px-4 py-3 text-brand-textSecondary text-xs cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Title / Designation</label>
                    <input
                      type="text"
                      value={profileData.title}
                      onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                      className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Company / Division</label>
                    <input
                      type="text"
                      value={profileData.company}
                      onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                      className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Focus Skills (comma separated)</label>
                  <input
                    type="text"
                    value={profileData.focus}
                    onChange={(e) => setProfileData({ ...profileData, focus: e.target.value })}
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Short Bio</label>
                  <textarea
                    rows="3"
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="pt-4 border-t border-brand-border/40 flex justify-between items-center text-xs text-brand-textSecondary">
                  <span>Hiring Footprint: <strong>{jobs.length} Published Vacancies</strong></span>
                  <span>Evaluations Conducted: <strong>{applications.filter(a => a.match_score).length} Candidates</strong></span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white py-3 rounded-xl font-bold shadow-premium flex items-center justify-center gap-2 transition-all"
              >
                <Save className="w-4.5 h-4.5" /> Save Profile Settings
              </button>
            </form>
          </div>
        )}
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
              {/* Left pane: Resume PDF Viewer */}
              <div className="lg:w-7/12 flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-center mb-3 shrink-0">
                  <h4 className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-brand-primary" /> Resume PDF Document
                  </h4>
                  <a
                    href={`http://localhost:5000/api/resumes/${selectedApp.resume_id}/file?token=${localStorage.getItem('token')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-primary hover:text-brand-textPrimary flex items-center gap-1.5 font-medium transition-all"
                  >
                    Open In New Tab <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                {selectedApp.resume?.file_name && (
                  selectedApp.resume.file_name.toLowerCase().endsWith('.png') ||
                  selectedApp.resume.file_name.toLowerCase().endsWith('.jpg') ||
                  selectedApp.resume.file_name.toLowerCase().endsWith('.jpeg')
                ) ? (
                  <div className="w-full flex-1 rounded-2xl border border-brand-border/60 bg-brand-bg shadow-premium overflow-auto p-2 flex items-center justify-center">
                    <img
                      src={`http://localhost:5000/api/resumes/${selectedApp.resume_id}/file?token=${localStorage.getItem('token')}`}
                      className="max-w-full max-h-[75vh] object-contain rounded-xl"
                      alt="Candidate Resume image"
                    />
                  </div>
                ) : (
                  <iframe
                    src={`http://localhost:5000/api/resumes/${selectedApp.resume_id}/file?token=${localStorage.getItem('token')}`}
                    className="w-full flex-1 rounded-2xl border border-brand-border/60 bg-brand-bg shadow-premium"
                    title="Resume PDF Document Viewer"
                  />
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
                    {(() => {
                      const curJob = jobs.find(j => j.id === selectedApp?.job_id);
                      const isAiEnabled = curJob ? curJob.ai_insights_enabled !== false : true;
                      return isAiEnabled && (
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
                              { label: 'Pending Eval', key: 'pending_eval', activeColor: 'text-brand-warning bg-brand-warning/10 border-brand-warning/40' },
                              { label: 'Evaluated', key: 'evaluated', activeColor: 'text-brand-success bg-brand-success/15 border-brand-success/40' },
                              { label: 'Shortlisted', key: 'shortlisted', activeColor: 'text-brand-accent bg-brand-accent/15 border-brand-accent/40' },
                              { label: 'Interview Scheduled', key: 'interview', activeColor: 'text-brand-warning bg-brand-warning/15 border-brand-warning/40' },
                              { label: 'Selected', key: 'approved', activeColor: 'text-brand-success bg-brand-success/20 border-brand-success/60' },
                            ];
                            const currentStatus = selectedApp.status;
                            const hasScore = !!selectedApp.match_score;
                            
                            let statusIdx = 0; // Submitted
                            if (!hasScore) {
                              statusIdx = 1; // Pending Eval
                            } else if (hasScore && currentStatus === 'applied') {
                              statusIdx = 2; // Evaluated
                            } else if (currentStatus === 'shortlisted') {
                              statusIdx = 3; // Shortlisted
                            } else if (currentStatus === 'interview') {
                              statusIdx = 4; // Interview Scheduled
                            } else if (currentStatus === 'approved') {
                              statusIdx = 5; // Selected
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
                                <span className="text-xs text-brand-textSecondary uppercase font-semibold">Final Match Score</span>
                                <div className="text-3xl font-extrabold text-brand-primary mt-1">
                                  {Math.round(selectedApp.match_score.final_score)}%
                                </div>
                              </div>
                              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border text-center mt-2 select-none ${getRecommendationLabel(selectedApp.match_score.final_score).style}`}>
                                {getRecommendationLabel(selectedApp.match_score.final_score).text}
                              </span>
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
                              <>⏳ Recalculating AI Score...</>
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
                              <>⚡ Evaluate Candidate</>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Manual Status Pipeline Controls */}
                      <div className="bg-brand-bg/20 p-5 rounded-2xl border border-brand-border/40 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-brand-textSecondary uppercase tracking-wider block">Set Candidate Pipeline Stage</span>
                          {!selectedApp.match_score && (
                            <span className="text-[10px] text-brand-danger font-bold uppercase tracking-wider bg-brand-danger/10 px-2 py-0.5 rounded border border-brand-danger/20">
                              Evaluation Required
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            onClick={() => handleUpdateStatus(selectedApp.id, 'approved')}
                            disabled={!selectedApp.match_score}
                            className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                              selectedApp.status === 'approved'
                                ? 'bg-brand-success text-white border-brand-success shadow-premium'
                                : 'bg-brand-success/10 border-brand-success/20 text-brand-success hover:bg-brand-success/20'
                            } disabled:opacity-45 disabled:cursor-not-allowed`}
                          >
                            Mark as Selected
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(selectedApp.id, 'shortlisted')}
                            disabled={!selectedApp.match_score}
                            className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                              selectedApp.status === 'shortlisted'
                                ? 'bg-brand-success text-white border-brand-success shadow-premium'
                                : 'bg-brand-success/5 border-brand-success/15 text-brand-success hover:bg-brand-success/10'
                            } disabled:opacity-45 disabled:cursor-not-allowed`}
                          >
                            Shortlist
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(selectedApp.id, 'interview')}
                            disabled={!selectedApp.match_score}
                            className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                              selectedApp.status === 'interview'
                                ? 'bg-brand-secondary text-white border-brand-secondary shadow-premium'
                                : 'bg-brand-secondary/10 border-brand-secondary/20 text-brand-secondary hover:bg-brand-secondary/20'
                            } disabled:opacity-45 disabled:cursor-not-allowed`}
                          >
                            Move to Interview
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                            disabled={!selectedApp.match_score}
                            className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                              selectedApp.status === 'rejected'
                                ? 'bg-brand-danger text-white border-brand-danger shadow-premium'
                                : 'bg-brand-danger/10 border-brand-danger/20 text-brand-danger hover:bg-brand-danger/20'
                            } disabled:opacity-45 disabled:cursor-not-allowed`}
                          >
                            Mark as Rejected
                          </button>
                        </div>
                      </div>

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
                              <p className="font-semibold text-brand-textPrimary">Hybrid Scoring Calculated</p>
                              <p className="text-[10px] text-brand-textSecondary mt-0.5">
                                Match percentage: <span className="font-bold text-brand-primary">{Math.round(selectedApp.match_score.final_score)}%</span>
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
                              <span className="text-xl font-extrabold text-white block mt-1">
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

            <h3 className="text-xl font-bold text-brand-textPrimary mb-2">Generate Match Evaluation</h3>
            <p className="text-xs text-brand-textSecondary mb-6">
              {evalLoading ? `Processing candidate pool matching for ${evaluatingJob.title}...` : `Evaluate and rank candidates for ${evaluatingJob.title}. Select your preferred screening model.`}
            </p>

            {evalLoading ? (
              <div className="py-2 space-y-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 bg-brand-primary/20 rounded-full animate-ping"></div>
                    <div className="absolute inset-2 bg-brand-panel border border-brand-border rounded-full flex items-center justify-center">
                      <Brain className="w-6 h-6 text-brand-primary animate-pulse" />
                    </div>
                  </div>
                  <h4 className="text-base font-bold text-brand-textPrimary">AI Recruiting Intelligence Engine</h4>
                  <p className="text-[11px] text-brand-textSecondary mt-0.5">Evaluating applications via Google Gemini LLM</p>
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
                  {[
                    "🧠 Parsing Resume Credentials...",
                    "🔍 Extracting Skills & Experience...",
                    "📊 Evaluating Experience Relevance...",
                    "🤖 Matching Candidates to Job Metrics...",
                    "🏆 Generating Staggered Leaderboard...",
                    "🎉 Evaluation Complete!"
                  ].map((stepLabel, idx) => {
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
                {/* Unified Match Engine Explanation */}
                <div className="space-y-4 bg-brand-bg/40 p-5 rounded-2xl border border-brand-border/60">
                  <h4 className="text-sm font-bold text-brand-textPrimary">Unified Evaluation Engine</h4>
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

      {/* FLOATING BULK ACTIONS BAR */}
      {selectedAppIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-brand-panel border border-brand-border/80 rounded-2xl px-6 py-4 flex items-center gap-6 shadow-premium backdrop-blur-md animate-fade-in">
          <span className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider">
            {selectedAppIds.length} Selected
          </span>
          <div className="h-6 w-px bg-brand-border/60"></div>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkStatusUpdate('approved')}
              className="bg-brand-success/15 hover:bg-brand-success/25 border border-brand-success/35 text-brand-success px-4 py-2 rounded-xl text-xs font-bold transition-all"
            >
              Approve Selected
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
                          {applications.filter(a => a.job_id === selectedJob.id && (a.status === 'shortlisted' || a.status === 'approved')).length}
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
                      <h4 className="text-xs font-bold text-brand-secondary uppercase tracking-wider flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-brand-secondary" /> AI Assessment Insights
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
                              <span className="text-brand-primary font-bold">{app.match_score ? `${Math.round(app.match_score.final_score)}%` : '—'}</span>
                            </td>
                            <td className="py-3 px-4">{getStatusBadge(app.status, !!app.match_score)}</td>
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
