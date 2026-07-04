import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, 
  Users, 
  Upload, 
  Cpu, 
  Brain, 
  Sparkles, 
  Plus, 
  Trash2, 
  Download, 
  Eye, 
  Check, 
  X, 
  ArrowLeft, 
  FileText,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  Phone,
  BarChart3,
  Calendar,
  Search,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  ChevronRight,
  Sparkle,
  Filter,
  FileArchive,
  ExternalLink,
  MapPin,
  Zap,
  FolderOpen
} from 'lucide-react';
import API from '../../services/api';

export default function ExternalHiringTab() {
  const [activeSubView, setActiveSubView] = useState('jobs-list'); // 'jobs-list' | 'job-details'
  const [externalJobs, setExternalJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  
  // Search & Filter state for Jobs
  const [jobSearch, setJobSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'evaluated' | 'evaluating'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'intelligent' | 'quick'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'resumes_desc' | 'resumes_asc'

  // Candidate Search
  const [candidateSearch, setCandidateSearch] = useState('');
  
  // Loading & Progress states
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [shortlisting, setShortlisting] = useState(false);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showBatchSelectModal, setShowBatchSelectModal] = useState(false);
  const [showEvalStrategyModal, setShowEvalStrategyModal] = useState(false);
  const [selectedEvalStrategy, setSelectedEvalStrategy] = useState('intelligent');
  const [evalShortlistedOnly, setEvalShortlistedOnly] = useState(false);
  
  // Form states
  const [createForm, setCreateForm] = useState({
    title: '',
    company_name: '',
    description: '',
    skills_required: '',
    experience_required: 0,
    location: '',
    evaluation_strategy: 'intelligent'
  });
  const [createError, setCreateError] = useState('');
  
  // Upload states
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadStep, setUploadStep] = useState(0);

  const uploadStepsList = useMemo(() => [
    { icon: <Upload className="w-4 h-4" />, text: "Uploading resumes..." },
    { icon: <FolderOpen className="w-4 h-4" />, text: "Reading resume files..." },
    { icon: <FileText className="w-4 h-4" />, text: "Extracting text from resumes..." },
    { icon: <Brain className="w-4 h-4" />, text: "Parsing candidate information..." },
    { icon: <CheckCircle2 className="w-4 h-4" />, text: "Saving structured candidate data..." },
    { icon: <Sparkles className="w-4 h-4" />, text: "Preparing candidates for AI evaluation..." }
  ], []);

  useEffect(() => {
    let interval;
    if (uploading) {
      interval = setInterval(() => {
        setUploadStep((prev) => (prev < uploadStepsList.length - 1 ? prev + 1 : prev));
      }, 1200);
    } else {
      setUploadStep(0);
    }
    return () => clearInterval(interval);
  }, [uploading, uploadStepsList]);

  // Selected candidate for AI detail modal
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Shortlisting Criteria
  const [shortlistMethod, setShortlistMethod] = useState('cutoff'); // 'cutoff' | 'top_n'
  const [shortlistCutoff, setShortlistCutoff] = useState(70);
  const [shortlistTopN, setShortlistTopN] = useState(5);
  const [shortlistResult, setShortlistResult] = useState(null);

  // Confirmation state
  const [shortlistConfirmed, setShortlistConfirmed] = useState(true);
  const [sendEmails, setSendEmails] = useState(true);
  const [confirming, setConfirming] = useState(false);

  // Load external jobs on mount
  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await API.get('/external-hiring/jobs');
      setExternalJobs(res.data);
    } catch (err) {
      console.error("Failed to load external jobs:", err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchCandidates = async (jobId) => {
    setLoadingCandidates(true);
    try {
      const res = await API.get(`/external-hiring/jobs/${jobId}/candidates`);
      setCandidates(res.data);
    } catch (err) {
      console.error("Failed to load candidates:", err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleSelectJob = (job) => {
    setSelectedJob(job);
    setUploadResult(null);
    setShortlistResult(null);
    setShortlistConfirmed(true);
    setActiveSubView('job-details');
    fetchCandidates(job.id);
  };

  const handleBackToJobs = () => {
    setSelectedJob(null);
    setCandidates([]);
    setActiveSubView('jobs-list');
    fetchJobs(); // refresh dashboard statistics
  };

  // Create Job
  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!createForm.title || !createForm.description || !createForm.company_name) {
      setCreateError('Title, company name, and description are required.');
      return;
    }
    setCreateError('');
    try {
      const skillsArray = createForm.skills_required
        ? createForm.skills_required.split(',').map(s => s.trim()).filter(s => s)
        : [];
      
      const payload = {
        ...createForm,
        skills_required: skillsArray,
        experience_required: parseInt(createForm.experience_required) || 0,
        min_match_score: 70
      };

      const res = await API.post('/external-hiring/jobs', payload);
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        company_name: '',
        description: '',
        skills_required: '',
        experience_required: 0,
        location: '',
        evaluation_strategy: 'intelligent'
      });
      fetchJobs();
      if (res.data?.job) {
        handleSelectJob(res.data.job);
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create job.');
    }
  };

  // Delete Job
  const handleDeleteJob = async (jobId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this job posting? All uploaded candidate resumes and evaluation details will be permanently deleted.")) {
      return;
    }
    try {
      await API.delete(`/external-hiring/jobs/${jobId}`);
      fetchJobs();
    } catch (err) {
      alert("Failed to delete job: " + (err.response?.data?.message || err.message));
    }
  };

  // Drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload resumes
  const handleUploadResumes = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setUploadError('');
    setUploadResult(null);

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await API.post(`/external-hiring/jobs/${selectedJob.id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult(res.data);
      setSelectedFiles([]);
      fetchCandidates(selectedJob.id);
      setSelectedJob(prev => ({
        ...prev,
        scores_outdated: true,
        evaluation_status: 'pending'
      }));
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to upload resumes.');
    } finally {
      setUploading(false);
    }
  };

  // Evaluate resumes
  const handleEvaluate = async (strategy) => {
    if (candidates.length === 0) {
      alert("No candidates available to evaluate. Please upload resumes first.");
      return;
    }
    setEvaluating(true);
    try {
      const res = await API.post(`/external-hiring/jobs/${selectedJob.id}/evaluate`, {
        evaluation_strategy: strategy,
        shortlisted_only: evalShortlistedOnly
      });
      setCandidates(res.data.candidates);
      if (res.data.job) {
        setSelectedJob(res.data.job);
      }
      setShortlistResult(null);
    } catch (err) {
      alert("Evaluation failed: " + (err.response?.data?.message || err.message));
    } finally {
      setEvaluating(false);
    }
  };

  // Update candidate status manually
  const handleUpdateStatus = async (candId, newStatus) => {
    try {
      const res = await API.post(`/external-hiring/candidates/${candId}/status`, { status: newStatus });
      setCandidates(prev => prev.map(c => c.id === candId ? { ...c, status: res.data.candidate.status } : c));
    } catch (err) {
      alert("Failed to update status: " + (err.response?.data?.message || err.message));
    }
  };

  // Delete single candidate
  const handleDeleteCandidate = async (candId) => {
    if (!window.confirm("Are you sure you want to delete this candidate?")) return;
    try {
      await API.delete(`/external-hiring/candidates/${candId}`);
      setCandidates(prev => prev.filter(c => c.id !== candId));
      setSelectedJob(prev => ({ ...prev, scores_outdated: true }));
    } catch (err) {
      alert("Failed to delete candidate: " + (err.response?.data?.message || err.message));
    }
  };

  // View Resume file
  const handleViewResume = (candId) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    window.open(`http://localhost:5000/api/external-hiring/candidates/${candId}/resume?token=${token}`, '_blank');
  };

  // Shortlisting generation
  const handleGenerateShortlist = async () => {
    setShortlisting(true);
    setShortlistResult(null);
    try {
      const payload = {
        threshold: shortlistMethod === 'cutoff' ? shortlistCutoff : null,
        max_candidates: shortlistMethod === 'top_n' ? shortlistTopN : null
      };

      const res = await API.post(`/external-hiring/jobs/${selectedJob.id}/shortlist`, payload);
      setShortlistResult(res.data);
      fetchCandidates(selectedJob.id);
      if (res.data.job) {
        setSelectedJob(res.data.job);
      }
      setShortlistConfirmed(false);
    } catch (err) {
      alert("Failed to generate shortlist: " + (err.response?.data?.message || err.message));
    } finally {
      setShortlisting(false);
    }
  };

  // Export results to CSV (All Candidates)
  const handleExportCSV = () => {
    if (candidates.length === 0) {
      alert("No candidates to export.");
      return;
    }

    const headers = ['Rank', 'Candidate Name', 'External ID', 'Email', 'Phone', 'File Name', 'Status', 'Match Score', 'Experience (Years)', 'Skills'];
    const sorted = [...candidates].sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
    const rows = sorted.map((c, index) => [
      index + 1,
      c.name || 'N/A',
      c.external_candidate_id,
      c.email || 'N/A',
      c.phone || 'N/A',
      c.file_name,
      c.status,
      c.match_percentage !== null ? `${Math.round(c.match_percentage)}%` : 'Not Evaluated',
      c.experience_years,
      (c.skills || []).join('; ')
    ]);

    const csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `external_hiring_${selectedJob.title.toLowerCase().replace(/\s+/g, '_')}_all_evaluation.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Shortlisted Candidates to CSV
  const handleExportShortlistedCSV = () => {
    const shortlistedCandidates = candidates.filter(c => c.status === 'shortlisted');
    if (shortlistedCandidates.length === 0) {
      alert("No shortlisted candidates found to export.");
      return;
    }

    const headers = ['Rank', 'Candidate Name', 'External ID', 'Email', 'Phone', 'File Name', 'Match Score', 'Experience (Years)', 'Skills'];
    const sorted = [...shortlistedCandidates].sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
    const rows = sorted.map((c, index) => [
      index + 1,
      c.name || 'N/A',
      c.external_candidate_id,
      c.email || 'N/A',
      c.phone || 'N/A',
      c.file_name,
      c.match_percentage !== null ? `${Math.round(c.match_percentage)}%` : 'N/A',
      c.experience_years,
      (c.skills || []).join('; ')
    ]);

    const csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `shortlisted_candidates_${selectedJob.title.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Shortlisted Resumes as ZIP
  const handleDownloadShortlistedResumes = () => {
    const shortlistedCount = candidates.filter(c => c.status === 'shortlisted').length;
    if (shortlistedCount === 0) {
      alert("There are no shortlisted candidates. Please generate a shortlist first.");
      return;
    }
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    window.open(`http://localhost:5000/api/external-hiring/jobs/${selectedJob.id}/download-shortlisted-resumes?token=${token}`, '_blank');
  };

  // Stats Calculations for Landing Dashboard
  const stats = useMemo(() => {
    const totalJobsCount = externalJobs.length;
    const totalResumesCount = externalJobs.reduce((acc, job) => acc + (job.applications_count || 0), 0);
    const completedJobsCount = externalJobs.filter(job => job.evaluation_status === 'evaluated' && !job.scores_outdated).length;
    const pendingJobsCount = externalJobs.filter(job => job.applications_count > 0 && (job.evaluation_status !== 'evaluated' || job.scores_outdated)).length;
    return { totalJobsCount, totalResumesCount, completedJobsCount, pendingJobsCount };
  }, [externalJobs]);
  
  const recentlyEvaluatedJobs = useMemo(() => {
    return [...externalJobs]
      .filter(job => job.evaluation_status === 'evaluated' && job.evaluated_at)
      .sort((a, b) => new Date(b.evaluated_at) - new Date(a.evaluated_at))
      .slice(0, 3);
  }, [externalJobs]);

  // Job Search, Filtering, and Sorting logic
  const filteredJobs = useMemo(() => {
    return externalJobs.filter(job => {
      const matchesSearch = 
        job.title.toLowerCase().includes(jobSearch.toLowerCase()) || 
        job.description.toLowerCase().includes(jobSearch.toLowerCase()) ||
        (job.location || '').toLowerCase().includes(jobSearch.toLowerCase());

      const isJobPending = job.evaluation_status !== 'evaluated' || job.scores_outdated;
      const isJobEvaluated = job.evaluation_status === 'evaluated' && !job.scores_outdated;
      const isJobEvaluating = job.evaluation_status === 'evaluating';

      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'pending' && isJobPending) ||
        (statusFilter === 'evaluated' && isJobEvaluated) ||
        (statusFilter === 'evaluating' && isJobEvaluating);

      const matchesType = 
        typeFilter === 'all' || 
        job.evaluation_strategy === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [externalJobs, jobSearch, statusFilter, typeFilter]);

  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'resumes_desc') return (b.applications_count || 0) - (a.applications_count || 0);
      if (sortBy === 'resumes_asc') return (a.applications_count || 0) - (b.applications_count || 0);
      return 0;
    });
  }, [filteredJobs, sortBy]);

  // Stats Calculations for Evaluated Job
  const candidateStats = useMemo(() => {
    const evaluatedCandidates = candidates.filter(c => c.final_score !== null);
    const totalCandidatesCount = candidates.length;
    
    let highestScore = 0;
    let lowestScore = 0;
    let averageScore = 0;
    
    if (evaluatedCandidates.length > 0) {
      const scores = evaluatedCandidates.map(c => c.final_score);
      highestScore = Math.max(...scores);
      lowestScore = Math.min(...scores);
      averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    const distribution = {
      excellent: 0, // 90-100
      veryGood: 0,  // 80-89
      good: 0,      // 70-79
      average: 0,   // 50-69
      belowAvg: 0   // <50
    };

    evaluatedCandidates.forEach(c => {
      const score = c.final_score;
      if (score >= 90) distribution.excellent++;
      else if (score >= 80) distribution.veryGood++;
      else if (score >= 70) distribution.good++;
      else if (score >= 50) distribution.average++;
      else distribution.belowAvg++;
    });

    return { totalCandidatesCount, highestScore, lowestScore, averageScore, distribution };
  }, [candidates]);

  const getRecommendationLabel = (score) => {
    const rounded = Math.round(score);
    if (rounded >= 90) return { text: "Highly Recommended", style: "bg-emerald-50 border-emerald-200 text-emerald-700", emoji: "🟢" };
    if (rounded >= 80) return { text: "Recommended", style: "bg-blue-50 border-blue-200 text-blue-700", emoji: "🟢" };
    if (rounded >= 65) return { text: "Consider", style: "bg-amber-50 border-amber-200 text-amber-700", emoji: "🟡" };
    return { text: "Not Recommended", style: "bg-rose-50 border-rose-200 text-rose-700", emoji: "🔴" };
  };

  // Enterprise Status Badges (Draft, Uploading, Evaluating, Completed, Archived)
  const getJobStatus = (job) => {
    if (job.is_archived) return { label: 'Archived', style: 'bg-slate-100 text-slate-700 border-slate-200' };
    if (job.evaluation_status === 'evaluating') return { label: 'Evaluating', style: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 animate-pulse font-extrabold' };
    if (job.evaluation_status === 'uploading') return { label: 'Uploading', style: 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse font-extrabold' };
    if (job.evaluation_status === 'evaluated' && !job.scores_outdated) return { label: 'Completed', style: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-extrabold' };
    if (!job.applications_count || job.applications_count === 0) return { label: 'Draft', style: 'bg-indigo-100 text-indigo-800 border-indigo-200 font-bold' };
    return { label: 'Pending Eval', style: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold' };
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending_evaluation':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'evaluated':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'shortlisted':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold';
      case 'interview':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'selected':
      case 'hired':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'rejected':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Filtered candidate list based on search
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const term = candidateSearch.toLowerCase();
      return (
        (c.name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.external_candidate_id || '').toLowerCase().includes(term) ||
        (c.file_name || '').toLowerCase().includes(term)
      );
    });
  }, [candidates, candidateSearch]);

  // Sort candidates by final score descending
  const sortedCandidates = useMemo(() => {
    return [...filteredCandidates].sort((a, b) => {
      if (a.final_score === null) return 1;
      if (b.final_score === null) return -1;
      return b.final_score - a.final_score;
    });
  }, [filteredCandidates]);

  // Render Horizontal Stepped Timeline
  const renderProgressTracker = (job) => {
    const steps = [
      { label: 'Uploaded', active: job.applications_count > 0 },
      { label: 'Extracted', active: job.applications_count > 0 },
      { label: 'Evaluated', active: job.evaluation_status === 'evaluated' && !job.scores_outdated },
      { label: 'Shortlisted', active: !!job.has_shortlisted }
    ];

    return (
      <div className="pt-3 pb-1 border-t border-slate-100">
        <span className="text-[9px] text-brand-textSecondary uppercase font-black tracking-widest block mb-2">Evaluation Progress</span>
        <div className="flex items-center justify-between w-full relative px-2">
          {/* Connection line */}
          <div className="absolute left-4 right-4 top-[11px] h-[3px] bg-slate-100 -z-1"></div>
          <div 
            className="absolute left-4 top-[11px] h-[3px] bg-gradient-to-r from-brand-primary to-emerald-500 transition-all duration-500 -z-1"
            style={{ 
              width: `${
                steps[3].active ? '92%' :
                steps[2].active ? '61%' :
                steps[1].active ? '30%' : '0%'
              }`
            }}
          ></div>

          {steps.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center relative z-10 shrink-0">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-black transition-all ${
                step.active 
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs' 
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                {step.active ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : idx + 1}
              </div>
              <span className={`text-[8px] mt-1 font-extrabold ${step.active ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleOpenBatchUpload = () => {
    if (externalJobs.length === 0) {
      alert("Please create an evaluation job first before uploading resumes.");
      return;
    }
    setShowBatchSelectModal(true);
  };

  const handleShowCompleted = () => {
    setStatusFilter('evaluated');
    // Scroll down to job cards grid
    const element = document.getElementById('evaluation-jobs-grid');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ======================================= */}
      {/* PROGRESS / LOADING OVERLAYS */}
      {/* ======================================= */}
      {uploading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-brand-border/60 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-premium">
            <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center mx-auto text-brand-primary">
              <Upload className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-brand-textPrimary text-base">Uploading Resumes</h3>
              <p className="text-xs text-brand-textSecondary leading-relaxed">Extracting layout formats, reading file streams, and auto-populating candidates...</p>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
              <div className="bg-brand-primary h-full rounded-full transition-all duration-300 animate-pulse" style={{ width: '80%' }}></div>
            </div>
          </div>
        </div>
      )}

      {evaluating && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-brand-border/60 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-premium">
            <div className="w-16 h-16 rounded-full bg-brand-secondary/15 flex items-center justify-center mx-auto text-brand-secondary">
              <Cpu className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-brand-textPrimary text-base">Running AI Match Engine</h3>
              <p className="text-xs text-brand-textSecondary leading-relaxed">Analyzing structured skills alignment, computing experience weights, and grading candidates...</p>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-brand-secondary h-full rounded-full animate-pulse" style={{ width: '65%' }}></div>
            </div>
          </div>
        </div>
      )}

      {shortlisting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-brand-border/60 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-premium">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
              <Sliders className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-brand-textPrimary text-base">Applying Shortlist Criteria</h3>
              <p className="text-xs text-brand-textSecondary leading-relaxed">Filtering match scores, sorting by rank constraints, and updating applicant records...</p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 1. LANDING DASHBOARD VIEW */}
      {/* ======================================= */}
      {activeSubView === 'jobs-list' && (
        <div className="space-y-6">
          {/* Header & Quick Action Buttons */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black text-brand-textPrimary tracking-tight">External Hiring</h1>
              <p className="text-brand-textSecondary mt-1 text-sm">Manage private resume pipeline evaluations, extract zip batch files, and run AI match algorithms.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto md:justify-end">
              <button
                onClick={handleOpenBatchUpload}
                className="flex items-center gap-1.5 bg-white border border-brand-border text-brand-textPrimary px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 transition-all btn-pressable shrink-0"
              >
                <Upload className="w-4 h-4 text-brand-primary" /> Upload Resume Batch
              </button>
              
              <button
                onClick={handleShowCompleted}
                className="flex items-center gap-1.5 bg-white border border-brand-border text-brand-textPrimary px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 transition-all btn-pressable shrink-0"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> View Completed Evaluations
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-brand-primary to-brand-secondary text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-premium hover:opacity-95 transition-all btn-pressable shrink-0"
              >
                <Plus className="w-4 h-4" /> Create Evaluation Job
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel rounded-2xl p-6 border border-brand-border/60 flex items-center gap-4 bg-white shadow-sm hover:shadow-premium transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-brand-textSecondary font-bold uppercase tracking-wider block">Total Private Jobs</span>
                <span className="text-2xl font-black text-brand-textPrimary mt-0.5 block">{stats.totalJobsCount}</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-brand-border/60 flex items-center gap-4 bg-white shadow-sm hover:shadow-premium transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-brand-textSecondary font-bold uppercase tracking-wider block">Uploaded Resumes</span>
                <span className="text-2xl font-black text-brand-textPrimary mt-0.5 block">{stats.totalResumesCount}</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-brand-border/60 flex items-center gap-4 bg-white shadow-sm hover:shadow-premium transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 animate-pulse">
                <Sparkles className="w-6 h-6" style={{ animationDuration: '4s' }} />
              </div>
              <div>
                <span className="text-[10px] text-brand-textSecondary font-bold uppercase tracking-wider block">Pending Evaluation</span>
                <span className="text-2xl font-black text-amber-600 mt-0.5 block">{stats.pendingJobsCount} Jobs</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-brand-border/60 flex items-center gap-4 bg-white shadow-sm hover:shadow-premium transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-brand-textSecondary font-bold uppercase tracking-wider block">Completed Evaluations</span>
                <span className="text-2xl font-black text-emerald-600 mt-0.5 block">{stats.completedJobsCount} Jobs</span>
              </div>
            </div>
          </div>

          {/* Job Search & Filter Toolbar */}
          <div className="bg-white border border-brand-border/60 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            {/* Search Input */}
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-brand-textSecondary/80" />
              <input
                type="text"
                placeholder="Search evaluation jobs..."
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl text-xs focus:outline-none focus:border-brand-primary"
              />
            </div>

            {/* Filter Group */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-40 bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">📁 All Statuses</option>
                <option value="pending">⏳ Pending Eval</option>
                <option value="evaluated">✓ Evaluated</option>
                <option value="evaluating">⚙️ Evaluating</option>
              </select>

              {/* Strategy Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full sm:w-40 bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">🧠 All Engines</option>
                <option value="intelligent">🧠 Intelligent AI</option>
                <option value="quick">⚡ Keyword Match</option>
              </select>

              {/* Sorting options */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-44 bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="newest">📅 Newest Created</option>
                <option value="oldest">📅 Oldest Created</option>
                <option value="resumes_desc">👥 Resumes (High)</option>
                <option value="resumes_asc">👥 Resumes (Low)</option>
              </select>
            </div>
          </div>

          {/* Two Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="evaluation-jobs-grid">
            {/* Left Column: Evaluation Jobs List (Refactored to Professional Job Cards) */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-extrabold text-brand-textPrimary text-lg">Evaluation Jobs</h3>

              {loadingJobs ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-64 bg-slate-50 border border-brand-border/40 rounded-2xl animate-pulse"></div>
                  ))}
                </div>
              ) : sortedJobs.length === 0 ? (
                <div className="border border-brand-border/60 rounded-2xl p-10 text-center text-brand-textSecondary bg-white shadow-sm flex flex-col items-center justify-center min-h-[260px]">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/5 flex items-center justify-center text-brand-primary/60 mb-3 border border-brand-primary/10">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-brand-textPrimary">No Evaluation Jobs Yet</h4>
                  <p className="text-xs text-brand-textSecondary max-w-sm mx-auto mt-1 leading-relaxed">
                    Create your first evaluation job, upload resumes, and let AI evaluate candidates automatically.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sortedJobs.map((job) => {
                    const statusInfo = getJobStatus(job);
                    const avgScore = job.pool_analysis?.average_score;
                    const hasAvg = avgScore !== undefined && avgScore !== null && job.evaluation_status === 'evaluated' && !job.scores_outdated;

                    return (
                      <div
                        key={job.id}
                        onClick={() => handleSelectJob(job)}
                        className="bg-white border border-brand-border/60 rounded-2xl p-5 hover:border-brand-primary/40 transition-all hover:shadow-premium cursor-pointer group flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden"
                      >
                        {/* Header Details */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-extrabold ${statusInfo.style}`}>
                              {statusInfo.label}
                            </span>
                            
                            <button
                              onClick={(e) => handleDeleteJob(job.id, e)}
                              className="text-slate-300 hover:text-rose-600 transition-colors p-1 rounded-lg hover:bg-rose-50"
                              title="Delete Job"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div>
                            <h4 className="font-extrabold text-brand-textPrimary group-hover:text-brand-primary transition-colors text-sm truncate" title={job.title}>
                              {job.title}
                            </h4>
                            <p className="text-[10px] text-brand-textSecondary font-semibold mt-0.5 truncate">{job.location || 'Remote'}</p>
                          </div>
                        </div>

                        {/* Mid statistics row */}
                        <div className="grid grid-cols-3 gap-2 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-center shrink-0">
                          <div>
                            <span className="text-[8px] text-brand-textSecondary font-bold uppercase block">Resumes</span>
                            <span className="text-xs font-black text-slate-700 block mt-0.5">
                              {job.applications_count || 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-brand-textSecondary font-bold uppercase block">Engine</span>
                            <span className="text-[9px] font-black text-slate-600 block mt-1 capitalize truncate px-1">
                              {job.evaluation_status === 'evaluated'
                                ? (job.evaluation_strategy === 'intelligent' ? '🧠 AI' : '⚡ Key')
                                : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-brand-textSecondary font-bold uppercase block">Avg Match</span>
                            <span className={`text-xs font-black block mt-0.5 ${hasAvg ? 'text-brand-primary' : 'text-slate-400'}`}>
                              {hasAvg ? `${Math.round(avgScore)}%` : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Progress Stepped indicator */}
                        {renderProgressTracker(job)}

                        {/* Footer details & Action */}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px] shrink-0">
                          <span className="text-slate-400 font-semibold flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}
                          </span>

                          <button
                            onClick={() => handleSelectJob(job)}
                            className="bg-brand-primary/10 hover:bg-brand-primary hover:text-white border border-brand-primary/20 text-brand-primary font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-0.5 text-[10px]"
                          >
                            Open Evaluation <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Recent Evaluations */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-brand-textPrimary text-lg flex items-center gap-1.5">
                <TrendingUp className="w-5 h-5 text-brand-secondary" /> Recent Evaluations
              </h3>

              {recentlyEvaluatedJobs.length === 0 ? (
                <div className="border border-brand-border/60 rounded-2xl p-8 text-center text-brand-textSecondary text-xs bg-white shadow-sm flex flex-col items-center justify-center min-h-[260px] space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-brand-secondary/5 flex items-center justify-center text-brand-secondary/60 mb-1 border border-brand-secondary/10">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-slate-500">No completed evaluations found</p>
                  <p className="text-[10px] text-slate-400 leading-normal max-w-[15rem] mx-auto">
                    When you run match algorithms on resume batches, summary metrics and score analytics will display here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentlyEvaluatedJobs.map(job => {
                    const avg = job.pool_analysis?.average_score || 0;
                    const high = job.pool_analysis?.highest_score || 0;
                    
                    return (
                      <div 
                        key={job.id}
                        onClick={() => handleSelectJob(job)}
                        className="bg-white border border-brand-border/60 rounded-2xl p-4 space-y-3 hover:border-brand-primary/30 transition-all cursor-pointer shadow-sm group"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-brand-textPrimary text-xs truncate group-hover:text-brand-primary transition-all max-w-[10rem]">{job.title}</h4>
                          <span className="text-[9px] text-brand-textSecondary font-bold shrink-0">{new Date(job.evaluated_at).toLocaleDateString()}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 bg-brand-bg/50 p-2 rounded-xl border border-brand-border/40 text-center">
                          <div>
                            <span className="text-[8px] text-brand-textSecondary font-bold uppercase block">Avg Score</span>
                            <span className="text-[10px] font-black text-brand-primary">{Math.round(avg)}%</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-brand-textSecondary font-bold uppercase block">Highest</span>
                            <span className="text-[10px] font-black text-brand-success">{Math.round(high)}%</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-brand-textSecondary font-bold uppercase block">Candidates</span>
                            <span className="text-[10px] font-black text-brand-textPrimary">{job.applications_count}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] pt-1">
                          <span className="text-[8px] text-slate-400 capitalize">{job.evaluation_strategy} Engine</span>
                          <button
                            onClick={() => handleSelectJob(job)}
                            className="font-bold text-brand-secondary hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            View Results <ChevronRight className="w-3 h-3" />
                          </button>
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

      {/* ======================================= */}
      {/* 2. JOB DETAILS / CANDIDATES & EVALUATION VIEW */}
      {/* ======================================= */}
      {activeSubView === 'job-details' && (
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4 border-b border-brand-border/60 pb-6">
            <button 
              onClick={handleBackToJobs}
              className="flex items-center gap-1.5 text-xs font-bold text-brand-textSecondary hover:text-brand-primary transition-all self-start"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Evaluation Jobs
            </button>
            
            <div className="flex flex-col lg:flex-row justify-between items-start gap-6 w-full">
              <div className="flex-1 w-full space-y-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black text-brand-textPrimary">{selectedJob?.title}</h1>
                    <span className="bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Private Board</span>
                    {selectedJob?.evaluation_status === 'evaluated' && (
                      <span className="bg-brand-warning/10 border border-brand-warning/20 text-brand-warning text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                        <Zap className="w-3 h-3" /> {selectedJob?.evaluation_strategy === 'intelligent' ? 'AI Scored' : 'Key Scored'}
                      </span>
                    )}
                  </div>
                  {selectedJob?.company_name && (
                    <div className="text-sm font-semibold text-slate-500">
                      {selectedJob.company_name}
                    </div>
                  )}
                </div>
                
                <div className="bg-white border border-brand-border/60 rounded-2xl p-5 shadow-sm">
                  <div className="mb-4 pb-4 border-b border-brand-border/40">
                    <h4 className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest mb-2">Job Description</h4>
                    <p className="text-xs text-brand-textPrimary leading-relaxed whitespace-pre-wrap">{selectedJob?.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="col-span-2 md:col-span-1">
                      <h4 className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest mb-2">Required Skills</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedJob?.skills_required && selectedJob.skills_required.length > 0 ? (
                          (Array.isArray(selectedJob.skills_required)
                            ? selectedJob.skills_required
                            : selectedJob.skills_required.split(',')
                          ).map((skill, i) => (
                            <span key={i} className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
                              {typeof skill === 'string' ? skill.trim() : String(skill)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">None specified</span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest mb-2">Min Experience</h4>
                      <div className="text-xs font-bold text-brand-textPrimary flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-brand-secondary" /> {selectedJob?.experience_required} Years
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest mb-2">Location</h4>
                      <div className="text-xs font-bold text-brand-textPrimary flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand-primary" /> {selectedJob?.location || 'Remote'}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest mb-2">Created On</h4>
                      <div className="text-xs font-bold text-brand-textPrimary flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> 
                        {selectedJob?.created_at ? new Date(selectedJob.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 w-full lg:w-auto">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="w-full lg:w-auto flex items-center justify-center gap-1.5 bg-brand-panel hover:bg-brand-panelLight border border-brand-border text-brand-textPrimary px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Upload className="w-4 h-4 text-brand-primary" /> Upload Resumes
                </button>
                
                {candidates.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedEvalStrategy(selectedJob?.evaluation_strategy || 'intelligent');
                      setEvalShortlistedOnly(false);
                      setShowEvalStrategyModal(true);
                    }}
                    disabled={evaluating}
                    className="w-full lg:w-auto flex items-center justify-center gap-1.5 bg-gradient-to-r from-brand-primary to-brand-secondary text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-premium hover:opacity-95 disabled:opacity-50 transition-all"
                  >
                    {evaluating ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Brain className="w-4 h-4" />
                    )}
                    Generate Scores
                  </button>
                )}
              </div>
            </div>
          </div>

          {selectedJob?.scores_outdated && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-xs font-semibold animate-pulse shadow-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Pipeline changes detected (new resumes added). Please click "Generate Scores" to run evaluation algorithms and synchronize analytics.</span>
            </div>
          )}

          {/* NO CANDIDATES UPLOADED STATE */}
          {candidates.length === 0 && (
            <div className="glass-panel border border-brand-border/60 rounded-3xl p-16 text-center text-brand-textSecondary flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto shadow-premium bg-white">
              <div className="relative">
                <div className="absolute inset-0 bg-brand-primary/10 rounded-full blur-xl animate-pulse"></div>
                <div className="w-16 h-16 rounded-3xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20 relative z-10 mx-auto">
                  <Upload className="w-8 h-8 text-brand-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-brand-textPrimary">No candidate resumes uploaded</h3>
                <p className="text-xs text-brand-textSecondary max-w-sm leading-relaxed">
                  To get started, click the "Upload Resumes" button in the upper right. You can select multiple PDFs/DOCX files or upload a single ZIP folder containing candidate resumes.
                </p>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* 3. EVALUATION SUMMARY DASHBOARD */}
          {/* ======================================= */}
          {candidates.length > 0 && selectedJob?.evaluation_status === 'evaluated' && !selectedJob?.scores_outdated && (
            <div className="space-y-8 animate-fade-in">
              <h3 className="font-extrabold text-brand-textPrimary text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-secondary" /> Evaluation Summary Dashboard
              </h3>

              {/* Stats Widgets */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-50 border border-brand-border/60 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] text-brand-textSecondary uppercase font-bold tracking-wider">Total Evaluated</span>
                  <div className="text-3xl font-black text-brand-textPrimary mt-1">{candidateStats.totalCandidatesCount}</div>
                  <span className="text-[9px] text-brand-textSecondary mt-1 block">Parsed Profiles</span>
                </div>

                <div className="bg-slate-50 border border-brand-border/60 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] text-brand-textSecondary uppercase font-bold tracking-wider">Average Match</span>
                  <div className="text-3xl font-black text-brand-primary mt-1">{Math.round(candidateStats.averageScore)}%</div>
                  <span className="text-[9px] text-brand-textSecondary mt-1 block">Pool mean score</span>
                </div>

                <div className="bg-slate-50 border border-brand-border/60 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] text-brand-textSecondary uppercase font-bold tracking-wider">Highest Match</span>
                  <div className="text-3xl font-black text-emerald-600 mt-1">{Math.round(candidateStats.highestScore)}%</div>
                  <span className="text-[9px] text-brand-textSecondary mt-1 block">Top candidate grade</span>
                </div>

                <div className="bg-slate-50 border border-brand-border/60 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] text-brand-textSecondary uppercase font-bold tracking-wider">Lowest Match</span>
                  <div className="text-3xl font-black text-rose-600 mt-1">{Math.round(candidateStats.lowestScore)}%</div>
                  <span className="text-[9px] text-brand-textSecondary mt-1 block">Bottom candidate grade</span>
                </div>
              </div>

              {/* Score Distribution & Shortlist Wizard */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Score Distribution */}
                <div className="lg:col-span-2 bg-white border border-brand-border/60 rounded-3xl p-6 space-y-6 shadow-sm">
                  <h4 className="font-extrabold text-brand-textPrimary text-base flex items-center gap-2">
                    <Layers className="w-5 h-5 text-brand-primary" /> Score Distribution
                  </h4>
                  
                  <div className="space-y-4">
                    {/* Excellent */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-emerald-700">Excellent Match (90-100%)</span>
                        <span className="font-bold text-slate-700">{candidateStats.distribution.excellent} ({Math.round(candidateStats.distribution.excellent / candidateStats.totalCandidatesCount * 100) || 0}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(candidateStats.distribution.excellent / candidateStats.totalCandidatesCount * 100) || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Very Good */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-blue-700">Strong Match (80-89%)</span>
                        <span className="font-bold text-slate-700">{candidateStats.distribution.veryGood} ({Math.round(candidateStats.distribution.veryGood / candidateStats.totalCandidatesCount * 100) || 0}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(candidateStats.distribution.veryGood / candidateStats.totalCandidatesCount * 100) || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Good */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-amber-700">Good Match (70-79%)</span>
                        <span className="font-bold text-slate-700">{candidateStats.distribution.good} ({Math.round(candidateStats.distribution.good / candidateStats.totalCandidatesCount * 100) || 0}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(candidateStats.distribution.good / candidateStats.totalCandidatesCount * 100) || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Average */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">Fair Match (50-69%)</span>
                        <span className="font-bold text-slate-700">{candidateStats.distribution.average} ({Math.round(candidateStats.distribution.average / candidateStats.totalCandidatesCount * 100) || 0}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-slate-400 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(candidateStats.distribution.average / candidateStats.totalCandidatesCount * 100) || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Below Average */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-rose-700">Poor Match (&lt;50%)</span>
                        <span className="font-bold text-slate-700">{candidateStats.distribution.belowAvg} ({Math.round(candidateStats.distribution.belowAvg / candidateStats.totalCandidatesCount * 100) || 0}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(candidateStats.distribution.belowAvg / candidateStats.totalCandidatesCount * 100) || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shortlist Wizard */}
                <div className="bg-white border border-brand-border/60 rounded-3xl p-6 space-y-5 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-brand-textPrimary text-base flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-brand-secondary" /> Auto Shortlist Wizard
                    </h4>
                    
                    <p className="text-xs text-brand-textSecondary leading-relaxed">
                      Now that you've reviewed the scores, determine your shortlisting logic. Candidates meeting your criteria will be marked as "Shortlisted", others as "Rejected".
                    </p>

                    {/* Selector */}
                    <div className="flex border border-brand-border rounded-xl overflow-hidden text-xs font-bold w-full">
                      <button
                        type="button"
                        onClick={() => setShortlistMethod('cutoff')}
                        className={`flex-1 py-2 text-center transition-all ${
                          shortlistMethod === 'cutoff' 
                            ? 'bg-slate-900 text-white' 
                            : 'bg-brand-bg text-brand-textSecondary hover:bg-slate-50'
                        }`}
                      >
                        Score Cutoff
                      </button>
                      <button
                        type="button"
                        onClick={() => setShortlistMethod('top_n')}
                        className={`flex-1 py-2 text-center transition-all ${
                          shortlistMethod === 'top_n' 
                            ? 'bg-slate-900 text-white' 
                            : 'bg-brand-bg text-brand-textSecondary hover:bg-slate-50'
                        }`}
                      >
                        Top N Candidates
                      </button>
                    </div>

                    {/* Inputs */}
                    {shortlistMethod === 'cutoff' ? (
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-xs font-bold text-brand-textSecondary">
                          <span>SCORE THRESHOLD</span>
                          <span className="text-brand-primary">{shortlistCutoff}%</span>
                        </div>
                        <input
                          type="range"
                          min="30"
                          max="95"
                          value={shortlistCutoff}
                          onChange={(e) => setShortlistCutoff(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-2">
                        <label className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest block">Number of top candidates</label>
                        <input
                          type="number"
                          min="1"
                          max={candidateStats.totalCandidatesCount}
                          placeholder="e.g. 5"
                          value={shortlistTopN}
                          onChange={(e) => setShortlistTopN(parseInt(e.target.value) || '')}
                          className="w-full px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-primary"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-brand-border/40">
                    {shortlistResult && (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                        <span>Shortlisted {shortlistResult.shortlisted_count} and rejected {shortlistResult.rejected_count} candidates!</span>
                      </div>
                    )}

                    <button
                      onClick={handleGenerateShortlist}
                      disabled={shortlisting}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl text-xs font-bold shadow-premium hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      {shortlisting ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      ⭐ Generate Shortlist
                    </button>
                  </div>
                </div>
              </div>

              {/* POST-SHORTLIST ACTIONS */}
              {candidates.filter(c => c.status === 'shortlisted').length > 0 && (
                <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-3xl space-y-4 shadow-sm animate-fade-in">
                  {!shortlistConfirmed ? (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="font-extrabold text-emerald-900 text-base flex items-center gap-1.5">
                          ⚠️ Review & Confirm Shortlist
                        </h4>
                        <p className="text-emerald-700 text-xs mt-0.5">
                          Please review the candidates below. When you are ready, confirm the shortlist to finalize.
                        </p>
                        <div className="mt-4">
                          <button
                            onClick={() => {
                              setSelectedEvalStrategy(selectedJob?.evaluation_strategy || 'intelligent');
                              setEvalShortlistedOnly(true);
                              setShowEvalStrategyModal(true);
                            }}
                            className="flex items-center gap-1.5 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                          >
                            <Brain className="w-4 h-4 text-emerald-600 animate-pulse" /> Evaluate Shortlisted Candidates (Optional)
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                        <label className="flex items-center gap-2 text-xs font-bold text-emerald-800 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={sendEmails} 
                            onChange={(e) => setSendEmails(e.target.checked)} 
                            className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer" 
                          />
                          Send email notifications to shortlisted candidates
                        </label>
                        <button
                          onClick={async () => {
                            setConfirming(true);
                            try {
                              if (sendEmails) {
                                await API.post(`/external-hiring/jobs/${selectedJob.id}/send-shortlist-emails`);
                              }
                              setShortlistConfirmed(true);
                              setConfirming(false);
                            } catch (error) {
                              setConfirming(false);
                              alert("Confirmation succeeded, but emails failed: " + (error.response?.data?.message || error.message));
                              setShortlistConfirmed(true);
                            }
                          }}
                          disabled={confirming}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-premium transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                          {confirming ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Confirm Shortlist
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
                      <div>
                        <h4 className="font-extrabold text-emerald-900 text-base flex items-center gap-1.5">
                          🏆 Shortlisted Candidates Actions
                        </h4>
                        <p className="text-emerald-700 text-xs mt-0.5">
                          Actions for the {candidates.filter(c => c.status === 'shortlisted').length} candidates officially shortlisted.
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2.5">
                        {/* Download Shortlisted ZIP */}
                        <button
                          onClick={handleDownloadShortlistedResumes}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
                        >
                          <FileArchive className="w-4 h-4" /> Download Resumes (ZIP)
                        </button>

                        {/* Export Shortlisted CSV */}
                        <button
                          onClick={handleExportShortlistedCSV}
                          className="flex items-center gap-1.5 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/50 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <Download className="w-4 h-4" /> Export CSV (Shortlist Only)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================= */}
          {/* 4. CANDIDATES LISTING / RANKING TABLE */}
          {/* ======================================= */}
          {candidates.length > 0 && (
            <div className="space-y-6">
              {/* Filter and export toolbar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-brand-border/60 rounded-2xl p-4 shadow-sm">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-brand-textSecondary/80" />
                  <input
                    type="text"
                    placeholder="Search name, ID, email, resume file..."
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 bg-brand-panel hover:bg-brand-panelLight border border-brand-border text-brand-textPrimary px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4 text-brand-secondary" /> Export CSV Ranking (All)
                  </button>
                </div>
              </div>

              {/* Ranking Table */}
              <div className="bg-white border border-brand-border/60 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-bg/50 border-b border-brand-border/80 text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest">
                        <th className="py-4 px-6 w-12 text-center">Rank</th>
                        <th className="py-4 px-4">Candidate Profile</th>
                        <th className="py-4 px-4 text-center">External ID</th>
                        <th className="py-4 px-4">Email</th>
                        <th className="py-4 px-4">Phone</th>
                        <th className="py-4 px-4">Resume File</th>
                        <th className="py-4 px-4 text-center">Match Score</th>
                        <th className="py-4 px-4 text-center">Recommendation</th>
                        <th className="py-4 px-4 text-center">Status</th>
                        <th className="py-4 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40 text-xs text-brand-textPrimary">
                      {sortedCandidates.map((cand, index) => {
                        const hasScore = cand.match_percentage !== null;
                        const score = hasScore ? Math.round(cand.match_percentage) : 0;
                        const rec = hasScore ? getRecommendationLabel(cand.match_percentage) : null;

                        return (
                          <tr key={cand.id} className="hover:bg-slate-50/50 transition-colors">
                            {/* Rank */}
                            <td className="py-4 px-6 text-center font-bold text-brand-textSecondary">
                              {hasScore ? index + 1 : '-'}
                            </td>
                            
                            {/* Candidate Profile */}
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-extrabold text-xs uppercase shrink-0">
                                  {(cand.name || 'C')[0]}
                                </div>
                                <div className="font-bold text-brand-textPrimary truncate max-w-[10rem]">{cand.name || 'Unknown Candidate'}</div>
                              </div>
                            </td>

                            {/* External ID */}
                            <td className="py-4 px-4 font-mono text-center font-semibold text-brand-secondary">
                              {cand.external_candidate_id}
                            </td>

                            {/* Email */}
                            <td className="py-4 px-4 max-w-[8rem] truncate font-semibold text-slate-600">
                              {cand.email || 'N/A'}
                            </td>

                            {/* Phone */}
                            <td className="py-4 px-4 font-semibold text-slate-600">
                              {cand.phone || 'N/A'}
                            </td>

                            {/* File Name */}
                            <td className="py-4 px-4 max-w-[10rem] truncate">
                              <button
                                onClick={() => handleViewResume(cand.id)}
                                className="inline-flex items-center gap-1 text-brand-primary hover:underline font-semibold text-left"
                              >
                                <FileText className="w-3.5 h-3.5 shrink-0 text-brand-secondary" />
                                <span className="truncate max-w-[8rem]">{cand.file_name}</span>
                              </button>
                            </td>

                            {/* Match Score */}
                            <td className="py-4 px-4 text-center">
                              {hasScore ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className={`px-2 py-0.5 rounded-full font-black border ${
                                    score >= 85 ? 'text-brand-success bg-brand-success/10 border-brand-success/20' : 
                                    score >= 70 ? 'text-brand-primary bg-brand-primary/10 border-brand-primary/20' : 
                                    score >= 50 ? 'text-brand-secondary bg-brand-secondary/10 border-brand-secondary/20' : 
                                    'text-brand-danger bg-brand-danger/10 border-brand-danger/20'
                                  }`}>
                                    {score}% Match
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 font-semibold">Not Evaluated</span>
                              )}
                            </td>

                            {/* Recommendation */}
                            <td className="py-4 px-4 text-center">
                              {hasScore && rec ? (
                                <span className={`inline-flex px-2 py-0.5 rounded-full font-bold border ${rec.style}`}>
                                  {rec.emoji} {rec.text}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            {/* Status overrides */}
                            <td className="py-4 px-4 text-center">
                              {cand.status === 'shortlisted' && !shortlistConfirmed ? (
                                <span className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap inline-flex items-center shadow-sm">
                                  ⏳ Pending Confirmation
                                </span>
                              ) : (
                                <select
                                  value={cand.status}
                                  onChange={(e) => handleUpdateStatus(cand.id, e.target.value)}
                                  className={`border rounded-lg px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer ${getStatusBadgeClass(cand.status)}`}
                                >
                                  <option value="pending_evaluation">⏳ Pending Evaluation</option>
                                  <option value="evaluated">✓ Evaluated</option>
                                  <option value="shortlisted">⭐ Shortlisted</option>
                                  <option value="interview">📅 Interview Scheduled</option>
                                  <option value="selected">🏆 Selected</option>
                                  <option value="hired">🎉 Hired</option>
                                  <option value="rejected">✗ Rejected</option>
                                </select>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-5 text-right shrink-0">
                              <div className="inline-flex gap-1.5">
                                {hasScore && (
                                  <button
                                    onClick={() => {
                                      setSelectedCandidate(cand);
                                      setShowMatchModal(true);
                                    }}
                                    className="bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/15 text-brand-primary p-1.5 rounded-lg transition-all"
                                    title="View AI Match Insights"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteCandidate(cand.id)}
                                  className="bg-brand-bg border border-brand-border hover:bg-rose-50 hover:border-rose-200 text-brand-textSecondary hover:text-brand-danger p-1.5 rounded-lg transition-all"
                                  title="Delete Candidate"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* POOL ANALYSIS DETAILS */}
          {selectedJob?.pool_analysis && !selectedJob?.scores_outdated && (
            <div className="glass-panel border border-brand-border/60 rounded-3xl p-6 space-y-6 bg-white shadow-sm">
              <h3 className="font-extrabold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40 flex items-center gap-2">
                <Sparkle className="w-5 h-5 text-brand-primary animate-pulse" /> Overall Candidate Pool AI Summary
              </h3>

              {selectedJob.pool_analysis.summary && (
                <div className="bg-brand-primary/[0.03] border border-brand-primary/10 rounded-2xl p-5 space-y-2">
                  <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider block">AI Generated Pool Insights</span>
                  <p className="text-xs text-brand-textPrimary leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedJob.pool_analysis.summary}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================= */}
      {/* 5. CREATE PRIVATE JOB MODAL */}
      {/* ======================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in animate-duration-200">
          <div className="bg-white border border-brand-border/60 rounded-3xl max-w-3xl w-full overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-scale-up animate-duration-300 max-h-[90vh] flex flex-col relative">
            
            {/* Header */}
            <div className="flex justify-between items-start p-6 md:p-8 border-b border-brand-border/60 bg-gradient-to-b from-slate-50 to-white shrink-0">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
                  <Briefcase className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-brand-textPrimary tracking-tight">Create Private Evaluation Job</h2>
                  <p className="text-sm text-brand-textSecondary mt-1 leading-relaxed max-w-lg">
                    Set up a new isolated workspace to batch upload and evaluate resumes against specific job requirements.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="bg-brand-bg hover:bg-slate-200 text-brand-textSecondary hover:text-brand-textPrimary p-2 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateJob} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                {createError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm font-semibold flex gap-3 animate-fade-in">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
                    <span>{createError}</span>
                  </div>
                )}

                {/* Section 1: Basic Info */}
                <div className="space-y-5">
                  <h3 className="text-xs font-black text-brand-textSecondary uppercase tracking-widest flex items-center gap-2 border-b border-brand-border/60 pb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span> Basic Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-1">
                      <label className="text-xs font-bold text-brand-textPrimary block">Job Title <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Senior Frontend Developer"
                        value={createForm.title}
                        onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                        className="w-full px-4 py-3 bg-brand-bg/50 border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-primary focus:bg-white transition-all shadow-sm"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-1">
                      <label className="text-xs font-bold text-brand-textPrimary block">Company Name <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Acme Corp"
                        value={createForm.company_name}
                        onChange={(e) => setCreateForm({...createForm, company_name: e.target.value})}
                        className="w-full px-4 py-3 bg-brand-bg/50 border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-primary focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-brand-textPrimary block">Job Description <span className="text-rose-500">*</span></label>
                      <textarea
                        required
                        placeholder="Describe the duties, role expectations, and details..."
                        rows="4"
                        value={createForm.description}
                        onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                        className="w-full px-4 py-3 bg-brand-bg/50 border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-primary focus:bg-white transition-all shadow-sm resize-y"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Requirements */}
                <div className="space-y-5">
                  <h3 className="text-xs font-black text-brand-textSecondary uppercase tracking-widest flex items-center gap-2 border-b border-brand-border/60 pb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-secondary"></span> Job Requirements
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-brand-textPrimary block">Min Experience (Years)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={createForm.experience_required}
                          onChange={(e) => setCreateForm({...createForm, experience_required: e.target.value})}
                          className="w-full px-4 py-3 bg-brand-bg/50 border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-primary focus:bg-white transition-all shadow-sm"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-brand-textSecondary tracking-wider">YRS</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-brand-textPrimary block">Location (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Remote / New York"
                        value={createForm.location}
                        onChange={(e) => setCreateForm({...createForm, location: e.target.value})}
                        className="w-full px-4 py-3 bg-brand-bg/50 border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-primary focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-brand-textPrimary flex justify-between">
                        <span>Required Skills</span>
                        <span className="text-brand-textSecondary text-[9px] font-semibold tracking-widest uppercase">Comma Separated</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. React, TypeScript, Node.js"
                        value={createForm.skills_required}
                        onChange={(e) => setCreateForm({...createForm, skills_required: e.target.value})}
                        className="w-full px-4 py-3 bg-brand-bg/50 border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-primary focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="p-6 md:px-8 md:py-5 border-t border-brand-border/60 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 border border-brand-border bg-white text-brand-textPrimary rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-premium hover:bg-slate-800 transition-all transform hover:-translate-y-0.5"
                >
                  Create Job Posting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 6. UPLOAD RESUMES MODAL */}
      {/* ======================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-brand-border/60 rounded-3xl max-w-xl w-full overflow-hidden shadow-premium animate-fade-in animate-duration-300">
            <div className="flex justify-between items-center px-6 py-5 border-b border-brand-border/60">
              <div>
                <h2 className="text-base font-black text-brand-textPrimary">Upload Batch Resumes</h2>
                <p className="text-[10px] text-brand-textSecondary font-semibold mt-0.5">Target Job: {selectedJob?.title}</p>
              </div>
              <button 
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadResult(null);
                  setSelectedFiles([]);
                  setUploadError('');
                }} 
                className="text-brand-textSecondary hover:text-brand-textPrimary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadResult ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-bold animate-fade-in">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <span>{uploadResult.message}</span>
                  </div>

                  {uploadResult.skipped && uploadResult.skipped.length > 0 && (
                    <div className="space-y-2 animate-fade-in">
                      <h4 className="text-xs font-bold text-brand-textSecondary uppercase tracking-widest">Skipped Files ({uploadResult.skipped.length})</h4>
                      <div className="max-h-36 overflow-y-auto border border-brand-border/60 rounded-xl divide-y divide-brand-border/40 text-xs">
                        {uploadResult.skipped.map((file, idx) => (
                          <div key={idx} className="p-2.5 flex justify-between gap-4 items-center bg-rose-50/20">
                            <span className="font-semibold text-slate-700 truncate">{file.filename}</span>
                            <span className="text-[10px] bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-bold shrink-0">{file.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setUploadResult(null);
                      setShowUploadModal(false);
                    }}
                    className="w-full bg-brand-primary text-white text-xs font-bold py-3 rounded-xl transition-all"
                  >
                    Done & View Candidates
                  </button>
                </div>
              ) : uploading ? (
                <div className="py-8 px-4 flex flex-col items-center justify-center space-y-8 animate-fade-in">
                  <div className="relative">
                    <div className="absolute inset-0 bg-brand-primary/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="w-20 h-20 bg-brand-primary/10 border-2 border-brand-primary/30 rounded-3xl flex items-center justify-center relative z-10 mx-auto animate-pulse">
                      <div className="text-brand-primary">
                        {uploadStepsList[uploadStep].icon}
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full max-w-sm space-y-4">
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-brand-primary">{uploadStepsList[uploadStep].text}</span>
                      <span className="text-brand-textSecondary">{Math.round(((uploadStep + 1) / uploadStepsList.length) * 100)}%</span>
                    </div>
                    
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all duration-700 ease-out"
                        style={{ width: `${((uploadStep + 1) / uploadStepsList.length) * 100}%` }}
                      ></div>
                    </div>

                    <div className="space-y-3 mt-6 border-t border-brand-border/40 pt-6">
                      {uploadStepsList.map((step, idx) => (
                        <div key={idx} className={`flex items-center gap-3 text-xs font-semibold transition-all duration-300 ${idx < uploadStep ? 'text-brand-success' : idx === uploadStep ? 'text-brand-textPrimary' : 'text-slate-300'}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${idx < uploadStep ? 'bg-brand-success/10 text-brand-success' : idx === uploadStep ? 'bg-brand-primary/10 text-brand-primary animate-pulse' : 'bg-slate-100 text-slate-300'}`}>
                            {idx < uploadStep ? <Check className="w-3 h-3" /> : step.icon}
                          </div>
                          <span>{step.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* DRAG AND DROP ZONE */}
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
                      dragActive ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border/80 hover:border-slate-400 bg-slate-50/50'
                    }`}
                  >
                    <Upload className="w-10 h-10 text-brand-primary/60 mx-auto mb-3 animate-bounce" />
                    <h3 className="text-sm font-extrabold text-brand-textPrimary">Drag and drop resumes here</h3>
                    <p className="text-xs text-brand-textSecondary mt-1">Supports PDF, DOCX, Images, or a ZIP folder containing multiple resumes</p>
                    
                    <div className="relative mt-4">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        id="batch-resume-file-picker"
                      />
                      <label
                        htmlFor="batch-resume-file-picker"
                        className="inline-flex bg-white border border-brand-border hover:border-brand-primary hover:text-brand-primary text-brand-textPrimary text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-sm transition-all"
                      >
                        Browse Files
                      </label>
                    </div>
                  </div>

                  {/* SELECTED FILES LIST */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-brand-textSecondary uppercase tracking-widest">Files Selected ({selectedFiles.length})</h4>
                        <button 
                          onClick={() => setSelectedFiles([])}
                          className="text-[10px] font-bold text-brand-danger hover:underline"
                        >
                          Clear All
                        </button>
                      </div>
                      
                      <div className="max-h-40 overflow-y-auto border border-brand-border/60 rounded-xl divide-y divide-brand-border/40 text-xs">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="p-2.5 flex justify-between items-center bg-slate-50/50">
                            <span className="font-semibold text-slate-700 truncate max-w-[15rem]">{file.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
                              <button 
                                onClick={() => removeFile(idx)} 
                                className="text-slate-400 hover:text-brand-danger transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-brand-border/40 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUploadModal(false);
                        setSelectedFiles([]);
                        setUploadError('');
                      }}
                      className="px-4 py-2 border border-brand-border text-brand-textPrimary rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUploadResumes}
                      disabled={selectedFiles.length === 0}
                      className="px-5 py-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl text-xs font-bold shadow-premium hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Start Parsing</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 7. TARGET SELECTION MODAL (QUICK ACTION) */}
      {/* ======================================= */}
      {showBatchSelectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-brand-border/60 rounded-3xl max-w-sm w-full overflow-hidden shadow-premium animate-fade-in animate-duration-300">
            <div className="flex justify-between items-center px-6 py-5 border-b border-brand-border/60">
              <h2 className="text-sm font-black text-brand-textPrimary">Select Evaluation Job</h2>
              <button onClick={() => setShowBatchSelectModal(false)} className="text-brand-textSecondary hover:text-brand-textPrimary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-brand-textSecondary leading-normal">Choose which private evaluation job you want to upload candidate resumes to:</p>
              <select
                onChange={(e) => {
                  const job = externalJobs.find(j => j.id === parseInt(e.target.value));
                  if (job) {
                    setSelectedJob(job);
                    fetchCandidates(job.id);
                    setShowBatchSelectModal(false);
                    setShowUploadModal(true);
                  }
                }}
                defaultValue=""
                className="w-full px-3 py-2.5 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-brand-primary"
              >
                <option value="" disabled>-- Select Evaluation Job --</option>
                {externalJobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title} ({job.applications_count || 0} resumes)</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 8. MATCH ANALYSIS INSIGHTS MODAL */}
      {/* ======================================= */}
      {showMatchModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-brand-border/60 rounded-3xl max-w-2xl w-full overflow-hidden shadow-premium animate-fade-in flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center px-6 py-5 border-b border-brand-border/60 shrink-0">
              <div>
                <h2 className="text-lg font-black text-brand-textPrimary">{selectedCandidate.name || 'Candidate Details'}</h2>
                <p className="text-xs text-brand-textSecondary mt-0.5">Parsed details & match analysis for {selectedCandidate.external_candidate_id}</p>
              </div>
              <button onClick={() => setShowMatchModal(false)} className="text-brand-textSecondary hover:text-brand-textPrimary">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-grow">
              {/* Score card */}
              <div className="flex justify-between items-center bg-brand-bg border border-brand-border/60 rounded-2xl p-5">
                <div>
                  <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest block">MATCH SCORE</span>
                  <div className="text-3xl font-black text-brand-primary mt-1">{Math.round(selectedCandidate.match_percentage)}% Match</div>
                  <div className="text-xs text-brand-textSecondary mt-1">
                    Evaluation Strategy: <span className="font-bold text-slate-700 capitalize">{selectedCandidate.evaluation_type}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="text-xs font-bold px-3 py-1 rounded-full border border-brand-border bg-white shadow-sm inline-block">
                    {getRecommendationLabel(selectedCandidate.match_percentage).emoji} {getRecommendationLabel(selectedCandidate.match_percentage).text}
                  </span>
                </div>
              </div>

              {/* Skills analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-brand-border/60 rounded-2xl p-5 space-y-3">
                  <span className="text-[10px] font-bold text-brand-success uppercase tracking-wider block">Matched Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCandidate.evaluation_details?.matched_skills && selectedCandidate.evaluation_details.matched_skills.length > 0 ? (
                      selectedCandidate.evaluation_details.matched_skills.map((skill, i) => (
                        <span key={i} className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-success/15 border border-brand-success/20 text-brand-success">
                          ✓ {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-brand-textSecondary">No matched skills.</span>
                    )}
                  </div>
                </div>

                <div className="border border-brand-border/60 rounded-2xl p-5 space-y-3">
                  <span className="text-[10px] font-bold text-brand-danger uppercase tracking-wider block">Missing Required Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCandidate.evaluation_details?.missing_skills && selectedCandidate.evaluation_details.missing_skills.length > 0 ? (
                      selectedCandidate.evaluation_details.missing_skills.map((skill, i) => (
                        <span key={i} className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-danger/15 border border-brand-danger/20 text-brand-danger">
                          ✗ {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-brand-success font-bold flex items-center gap-1">✓ Meets all skill requirements!</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Experience and details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-brand-border/60 rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest block">Work Experience</span>
                  <div className="text-lg font-extrabold text-brand-textPrimary mt-1">{selectedCandidate.experience_years} Years</div>
                </div>
                
                <div className="border border-brand-border/60 rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest block">Parsed Email</span>
                  <div className="text-xs font-bold text-brand-textPrimary mt-1.5 truncate" title={selectedCandidate.email}>
                    {selectedCandidate.email || 'Not Extracted'}
                  </div>
                </div>
              </div>

              {/* AI Insight content */}
              {selectedCandidate.evaluation_details?.ai_insights && (
                <div className="bg-brand-primary/[0.03] border border-brand-primary/10 rounded-2xl p-5 space-y-2">
                  <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider block">AI Match Analysis</span>
                  <p className="text-xs text-brand-textPrimary leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedCandidate.evaluation_details.ai_insights}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-brand-border/60 flex justify-end shrink-0">
              <button
                onClick={() => setShowMatchModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EVALUATION STRATEGY MODAL FOR EXTERNAL HIRING */}
      {showEvalStrategyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-brand-border/60 rounded-3xl max-w-lg w-full overflow-hidden shadow-premium animate-scale-up relative animate-duration-300">
            <button 
              onClick={() => setShowEvalStrategyModal(false)} 
              className="absolute top-4 right-4 text-brand-textSecondary hover:text-brand-textPrimary bg-brand-bg hover:bg-slate-100 p-2 rounded-xl border border-brand-border transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-brand-textPrimary mb-2">
                  {evalShortlistedOnly ? 'Refine Evaluation for Shortlisted' : 'Select Evaluation Strategy'}
                </h3>
                <p className="text-xs text-brand-textSecondary leading-relaxed">
                  {evalShortlistedOnly 
                    ? `Choose the evaluation strategy to re-evaluate and refine only the shortlisted candidates for ${selectedJob?.title}.`
                    : `Choose the evaluation method for the candidate pool of ${selectedJob?.title}.`
                  }
                </p>
              </div>
              {evalShortlistedOnly && (
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-brand-success/10 border-brand-success/25 text-brand-success">
                    🎯 Shortlisted Candidates Only
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Check className="w-2.5 h-2.5 text-white" />
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
                      <Check className="w-2.5 h-2.5 text-white" />
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

              <div className="pt-4 border-t border-brand-border/40 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEvalStrategyModal(false)}
                  className="px-4 py-2 border border-brand-border text-brand-textPrimary rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowEvalStrategyModal(false);
                    handleEvaluate(selectedEvalStrategy);
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl text-xs font-bold shadow-premium hover:opacity-95 transition-all"
                >
                  Start Evaluation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
