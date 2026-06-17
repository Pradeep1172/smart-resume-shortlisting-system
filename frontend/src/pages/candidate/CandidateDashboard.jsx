import React, { useState, useEffect, useContext } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { 
  Upload, 
  Briefcase, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Search, 
  MapPin, 
  Award, 
  Trash2, 
  Star, 
  Compass, 
  ClipboardList, 
  Bell, 
  User, 
  ChevronRight, 
  Sliders, 
  Save, 
  Info,
  Calendar,
  Building,
  Check
} from 'lucide-react';
import CandidateDashboardHome from './CandidateDashboardHome';

export default function CandidateDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, notifications, markAsRead: markNotifRead } = useContext(AuthContext);

  const getInitialTab = () => {
    const path = location.pathname;
    if (path === '/upload' || path === '/resumes') return 'resumes';
    if (path === '/applications') return 'applications';
    if (path === '/saved-jobs') return 'saved-jobs';
    if (path === '/notifications') return 'notifications';
    if (path === '/profile') return 'profile';
    if (path === '/tracking') return 'tracking';
    if (path === '/jobs') return 'jobs';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Data states
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState([]);
  const [dashboardInsights, setDashboardInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Upload resume states
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Apply modal states
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');

  // Search/filter states for jobs
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [expFilter, setExpFilter] = useState(0);

  // Profile states
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    headline: '',
    bio: '',
    skills: '',
    experience_years: '',
    education: '',
    portfolio: ''
  });
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Active tracking state
  const [trackingAppId, setTrackingAppId] = useState('');
  const [previewResume, setPreviewResume] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const getProfileCompletion = () => {
    const fields = [
      profileData.name,
      profileData.email,
      profileData.phone,
      profileData.headline,
      profileData.bio,
      profileData.skills,
      profileData.experience_years,
      profileData.education,
      profileData.portfolio
    ];
    const filledFields = fields.filter(f => f && f.toString().trim() !== '');
    return Math.round((filledFields.length / fields.length) * 100);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resumesRes, jobsRes, appsRes, insightsRes] = await Promise.all([
        API.get('/resumes'),
        API.get('/jobs?status=open'),
        API.get('/applications'),
        API.get('/resumes/dashboard-insights').catch(err => {
          console.error("Failed to load dashboard insights", err);
          return { data: null };
        })
      ]);

      setResumes(resumesRes.data);
      setJobs(jobsRes.data);
      setApplications(appsRes.data);
      setDashboardInsights(insightsRes.data);

      // Auto-set tracking application if any exists
      if (appsRes.data.length > 0 && !trackingAppId) {
        setTrackingAppId(appsRes.data[0].id.toString());
      }
    } catch (err) {
      console.error("Error loading candidate dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  // Sync tab with route path
  useEffect(() => {
    setActiveTab(getInitialTab());
    setCurrentPage(1); // Reset page on navigation
  }, [location.pathname]);

  // Load initial candidate state
  useEffect(() => {
    fetchData();

    // Load saved jobs from localStorage
    const saved = localStorage.getItem(`saved_jobs_${user?.id}`);
    if (saved) {
      setSavedJobIds(JSON.parse(saved));
    }

    // Load profile from localStorage
    const localProfile = localStorage.getItem(`candidate_profile_${user?.id}`);
    if (localProfile) {
      setProfileData(JSON.parse(localProfile));
    } else {
      setProfileData(prev => ({
        ...prev,
        name: user?.name || '',
        email: user?.email || ''
      }));
    }
  }, [user]);

  const ACCEPTED_EXTS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp'];

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setUploadError('');
    setUploadSuccess('');

    if (!selected) {
      setFile(null);
      return;
    }

    const ext = selected.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_EXTS.includes(ext)) {
      setFile(null);
      e.target.value = '';
      setUploadError('Invalid file format. Accepted formats: PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP.');
      return;
    }

    setFile(selected);
  };

  const handleUploadResume = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a resume file first.');
      return;
    }
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await API.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setFile(null);
      const input = document.getElementById('resume-file-input');
      if (input) input.value = '';
      fetchData();

      // Case 2: uploaded but parsing was insufficient
      if (res.data?.parse_quality === 'insufficient') {
        setUploadError(res.data.message || 'Resume uploaded but could not be fully parsed.');
      } else {
        // Case 3: fully parsed
        setUploadSuccess('Resume uploaded and parsed successfully! AI scores are now available.');
      }
    } catch (err) {
      const errData = err.response?.data;
      // Case 1: image or invalid file type
      if (errData?.error_type === 'invalid_file_type') {
        setUploadError(`${errData.message} — ${errData.detail}`);
      } else {
        setUploadError(errData?.message || 'Failed to upload resume.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResume = async (id) => {
    if (!window.confirm("Are you sure you want to delete this resume? Applications using this resume may lose access.")) return;
    try {
      await API.delete(`/resumes/${id}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete resume: " + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenApplyModal = (job) => {
    setSelectedJob(job);
    setApplyError('');
    if (resumes.length > 0) {
      setSelectedResumeId(resumes[0].id.toString());
    } else {
      setSelectedResumeId('');
    }
  };

  const handleApply = async () => {
    if (!selectedResumeId) {
      setApplyError('Please upload a resume first.');
      return;
    }
    setApplying(true);
    setApplyError('');

    try {
      await API.post('/applications', {
        job_id: selectedJob.id,
        resume_id: parseInt(selectedResumeId)
      });
      setSelectedJob(null);
      await fetchData();
      navigate('/applications');
    } catch (err) {
      setApplyError(err.response?.data?.message || 'Failed to submit application.');
    } finally {
      setApplying(false);
    }
  };

  const toggleSaveJob = (jobId) => {
    let updated;
    if (savedJobIds.includes(jobId)) {
      updated = savedJobIds.filter(id => id !== jobId);
    } else {
      updated = [...savedJobIds, jobId];
    }
    setSavedJobIds(updated);
    localStorage.setItem(`saved_jobs_${user?.id}`, JSON.stringify(updated));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    try {
      localStorage.setItem(`candidate_profile_${user?.id}`, JSON.stringify(profileData));
      setProfileSuccess('Profile configurations saved successfully!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError('Failed to save profile configuration.');
    }
  };

  const handleProfileChange = (key, val) => {
    setProfileData(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'shortlisted':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-success/10 text-brand-success border border-brand-success/20"><CheckCircle className="w-3.5 h-3.5" /> Shortlisted</span>;
      case 'interview':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20"><Clock className="w-3.5 h-3.5" /> Interviewing</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-danger/10 text-brand-danger border border-brand-danger/20"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-success/20 text-brand-success border border-brand-success/40"><CheckCircle className="w-3.5 h-3.5" /> Selected</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20"><Clock className="w-3.5 h-3.5" /> Submitted</span>;
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSkill = skillFilter.trim() === '' || 
                          job.skills_required.some(s => s.toLowerCase().includes(skillFilter.toLowerCase()));
                          
    const matchesExp = job.experience_required >= expFilter;
    
    return matchesSearch && matchesSkill && matchesExp;
  });

  const hasApplied = (jobId) => {
    return applications.some(app => app.job_id === jobId);
  };

  // Sidebar items
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: Compass },
    { id: 'jobs', label: 'Browse Jobs', path: '/jobs', icon: Briefcase },
    { id: 'saved-jobs', label: 'Saved Jobs', path: '/saved-jobs', icon: Star },
    { id: 'applications', label: 'My Applications', path: '/applications', icon: ClipboardList },
    { id: 'resumes', label: 'Resume Manager', path: '/resumes', icon: FileText },
    { id: 'tracking', label: 'Status Tracking', path: '/tracking', icon: Sliders },
    { id: 'notifications', label: 'Notifications', path: '/notifications', icon: Bell },
    { id: 'profile', label: 'Profile Settings', path: '/profile', icon: User }
  ];

  // Paginated listings
  const getPaginatedList = (list) => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return list.slice(startIdx, startIdx + itemsPerPage);
  };

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

  const trackingApp = applications.find(app => app.id.toString() === trackingAppId);

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-brand-bg text-brand-textPrimary">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-brand-panel/40 backdrop-blur-md border-b md:border-b-0 md:border-r border-brand-border/60 p-4 shrink-0 flex flex-col justify-between md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:overflow-y-auto">
        <div className="space-y-6">
          <div className="px-3 py-2 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-ping"></div>
            <span className="text-xs font-bold text-brand-textSecondary uppercase tracking-widest block">Candidate Workstation</span>
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
                      ? 'bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 border-l-4 border-brand-primary text-brand-primary font-bold shadow-premium' 
                      : 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-brand-panelLight/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-primary' : 'text-brand-textSecondary'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden md:block border-t border-brand-border/40 pt-4 mt-6 text-xs text-brand-textSecondary">
          <p className="font-semibold text-brand-textPrimary">{profileData.name || user?.name}</p>
          <p className="mt-0.5 truncate text-[10px]" title={profileData.headline}>{profileData.headline || 'Job Seeker'}</p>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto relative">
        <div className="absolute top-1/4 left-1/3 w-[30rem] h-[30rem] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
            <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-brand-textSecondary font-semibold">Loading dashboard workstation...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: OVERVIEW DASHBOARD */}
            {activeTab === 'dashboard' && (
          <CandidateDashboardHome
            user={user}
            profileData={profileData}
            getProfileCompletion={getProfileCompletion}
            jobs={jobs}
            applications={applications}
            resumes={resumes}
            navigate={navigate}
            handleOpenApplyModal={handleOpenApplyModal}
            hasApplied={hasApplied}
            setTrackingAppId={setTrackingAppId}
            setPreviewResume={setPreviewResume}
            getStatusBadge={getStatusBadge}
            dashboardInsights={dashboardInsights}
          />
        )}


        {/* TAB 2: BROWSE JOBS */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">Explore Opportunities</h1>
              <p className="text-brand-textSecondary text-sm mt-1">Browse and search open recruiter vacancy listings matching your skillset.</p>
            </div>

            {/* Filter Panel */}
            <div className="glass-panel border border-brand-border/60 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Search Job Titles</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textSecondary" />
                  <input
                    type="text"
                    placeholder="Search by keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl pl-9 pr-4 py-2 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Required Skills</label>
                <input
                  type="text"
                  placeholder="e.g. Python, React..."
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">
                  <span>Experience Required</span>
                  <span className="text-brand-primary">{expFilter}+ Yrs</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={expFilter}
                  onChange={(e) => setExpFilter(parseInt(e.target.value))}
                  className="w-full accent-brand-primary bg-brand-border rounded-lg h-2 cursor-pointer mt-2"
                />
              </div>
            </div>

            {/* Listings Grid */}
            {filteredJobs.length === 0 ? (
              <div className="glass-panel rounded-3xl p-16 text-center text-brand-textSecondary border border-brand-border/40">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-brand-border" />
                <p className="text-lg font-semibold text-brand-textPrimary">No positions matched</p>
                <p className="text-xs mt-1">Try broadening your search query or adjusting experience filters.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {getPaginatedList(filteredJobs).map(job => (
                    <div key={job.id} className="glass-panel rounded-2xl p-6 border border-brand-border hover:border-brand-primary/40 transition-all duration-300 flex flex-col justify-between hover:shadow-premium">
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-lg font-bold text-brand-textPrimary hover:text-brand-primary cursor-pointer" onClick={() => handleOpenApplyModal(job)}>{job.title}</h3>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => toggleSaveJob(job.id)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                savedJobIds.includes(job.id) 
                                  ? 'bg-brand-secondary/15 border-brand-secondary/35 text-brand-secondary' 
                                  : 'bg-brand-bg/40 border-brand-border/40 text-brand-textSecondary hover:text-white'
                              }`}
                              title={savedJobIds.includes(job.id) ? "Remove from saved" : "Save job"}
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </button>
                            {hasApplied(job.id) ? (
                              <span className="bg-brand-success/15 border border-brand-success/35 text-brand-success text-[10px] font-bold px-2 py-0.5 rounded-lg">Applied</span>
                            ) : (
                              <span className="bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-bold px-2 py-0.5 rounded-lg">Open</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-[10px] text-brand-textSecondary mt-2">
                          <span className="flex items-center gap-1 font-semibold text-brand-secondary"><Building className="w-3.5 h-3.5" /> Posted by {job.recruiter_name}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location || 'Remote'}</span>
                          <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> {job.experience_required}+ Yrs Required</span>
                        </div>

                        <p className="text-xs text-brand-textSecondary mt-4 line-clamp-3 leading-relaxed">{job.description}</p>
                        
                        <div className="flex flex-wrap gap-1.5 mt-4">
                          {job.skills_required.map((skill, i) => (
                            <span key={i} className="text-[10px] bg-brand-bg border border-brand-border/60 px-2 py-0.5 rounded text-brand-textSecondary font-semibold">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-brand-border/40 flex justify-between items-center">
                        <span className="text-[10px] text-brand-textSecondary">
                          Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'N/A'}
                        </span>
                        
                        {hasApplied(job.id) ? (
                          <button disabled className="bg-brand-border text-brand-textSecondary text-xs font-semibold px-4 py-2 rounded-xl cursor-not-allowed">
                            Application Sent
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenApplyModal(job)}
                            className="bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-premium transition-all"
                          >
                            Apply Vacancy
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center pt-4">
                    <span className="text-xs text-brand-textSecondary">
                      Page {currentPage} of {totalPages} ({filteredJobs.length} Jobs)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg bg-brand-panel border border-brand-border text-xs font-semibold text-brand-textSecondary hover:text-brand-textPrimary disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-lg bg-brand-panel border border-brand-border text-xs font-semibold text-brand-textSecondary hover:text-brand-textPrimary disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: SAVED JOBS */}
        {activeTab === 'saved-jobs' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">Saved Vacancies</h1>
              <p className="text-brand-textSecondary text-sm mt-1">Bookmarked positions and roles you have saved to apply later.</p>
            </div>

            {savedJobIds.length === 0 ? (
              <div className="glass-panel rounded-3xl p-16 text-center text-brand-textSecondary border border-brand-border/40">
                <Star className="w-12 h-12 mx-auto mb-4 text-brand-border" />
                <p className="text-lg font-semibold text-brand-textPrimary">No saved positions</p>
                <p className="text-xs mt-1">Click the star bookmark button on Browse Jobs page to save vacancies.</p>
                <button onClick={() => navigate('/jobs')} className="mt-5 bg-brand-primary text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-premium">
                  Browse Positions
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {jobs.filter(j => savedJobIds.includes(j.id)).map(job => (
                  <div key={job.id} className="glass-panel rounded-2xl p-6 border border-brand-border hover:border-brand-primary/40 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-lg font-bold text-brand-textPrimary">{job.title}</h3>
                        <button
                          onClick={() => toggleSaveJob(job.id)}
                          className="p-1.5 rounded-lg bg-brand-secondary/15 border border-brand-secondary/35 text-brand-secondary transition-all"
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-brand-textSecondary mt-2">
                        <span className="flex items-center gap-1 font-semibold text-brand-secondary"><Building className="w-3.5 h-3.5" /> {job.recruiter_name}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location || 'Remote'}</span>
                        <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> {job.experience_required}+ Yrs Required</span>
                      </div>

                      <p className="text-xs text-brand-textSecondary mt-4 line-clamp-3 leading-relaxed">{job.description}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-brand-border/40 flex justify-between items-center">
                      <span className="text-[10px] text-brand-textSecondary">
                        Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'N/A'}
                      </span>
                      
                      {hasApplied(job.id) ? (
                        <button disabled className="bg-brand-border text-brand-textSecondary text-xs font-semibold px-4 py-2.5 rounded-xl cursor-not-allowed">
                          Applied
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenApplyModal(job)}
                          className="bg-gradient-to-r from-brand-primary to-brand-secondary text-white text-xs font-bold px-4 py-2 rounded-xl shadow-premium transition-all"
                        >
                          Apply Vacancy
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MY APPLICATIONS */}
        {activeTab === 'applications' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">My Job Applications</h1>
              <p className="text-brand-textSecondary text-sm mt-1">Track history and candidate evaluation status of all job applications.</p>
            </div>

            <div className="glass-panel rounded-2xl border border-brand-border overflow-hidden shadow-panel">
              {applications.length === 0 ? (
                <div className="p-16 text-center text-brand-textSecondary">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4 text-brand-border/80" />
                  <p className="text-base font-semibold text-brand-textPrimary">No submissions found</p>
                  <p className="text-xs mt-1">Submit job applications from Browse Jobs tab to see progress records.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-bg/50 border-b border-brand-border/60 text-xs font-semibold text-brand-textSecondary uppercase tracking-wider">
                        <th className="py-4 px-6">Applied vacancy</th>
                        <th className="py-4 px-6">Company / Recruiter</th>
                        <th className="py-4 px-6">Application Date</th>
                        <th className="py-4 px-6">Status State</th>
                        <th className="py-4 px-6 text-center">Pipeline Tracking</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40 text-sm">
                      {applications.map((app) => (
                        <tr key={app.id} className="hover:bg-brand-panelLight/20 transition-colors">
                          <td className="py-4 px-6 font-semibold text-brand-textPrimary">{app.job_title}</td>
                          <td className="py-4 px-6 text-brand-textSecondary">Smart Recruit Co / {app.candidate_name}</td>
                          <td className="py-4 px-6 text-brand-textSecondary">{new Date(app.applied_at).toLocaleDateString()}</td>
                          <td className="py-4 px-6">{getStatusBadge(app.status)}</td>
                          <td className="py-4 px-6 text-center">
                            <Link
                              to="/tracking"
                              onClick={() => setTrackingAppId(app.id.toString())}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary hover:bg-brand-primary hover:text-white transition-all text-xs font-semibold"
                            >
                              <Sliders className="w-3.5 h-3.5" /> Status Timeline
                            </Link>
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

        {/* TAB 5: RESUME MANAGEMENT */}
        {activeTab === 'resumes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Upload Box */}
            <div className="glass-panel rounded-2xl p-6 border border-brand-border space-y-4">
              <h3 className="text-lg font-bold text-brand-textPrimary">Upload Professional Resume</h3>
              <p className="text-xs text-brand-textSecondary leading-relaxed">
                Upload your PDF resume. Our ATS Parser automatically parses experience years, projects, and skills to matches.
              </p>
              
              {uploadSuccess && (
                <div className="p-3 bg-brand-success/15 border border-brand-success/30 rounded-xl text-brand-success text-xs font-semibold">
                  {uploadSuccess}
                </div>
              )}
              {uploadError && (
                <div className="p-3 bg-brand-danger/15 border border-brand-danger/30 rounded-xl text-brand-danger text-xs font-semibold">
                  {uploadError}
                </div>
              )}

              <form onSubmit={handleUploadResume} className="space-y-4">
                <div className="border-2 border-dashed border-brand-border hover:border-brand-primary rounded-2xl p-6 text-center cursor-pointer transition-colors relative flex flex-col items-center justify-center min-h-[160px] group bg-brand-bg/40">
                  <input
                    type="file"
                    id="resume-file-input"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <Upload className="w-8 h-8 text-brand-textSecondary group-hover:text-brand-primary transition-colors mb-2" />
                  <span className="text-xs font-bold text-brand-textPrimary block">
                    {file ? file.name : 'Select Resume Document'}
                  </span>
                  <span className="text-[10px] text-brand-textSecondary mt-1 block">
                    PDF, DOC, DOCX, JPG, PNG, WEBP &bull; Max 5MB
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white py-2.5 rounded-xl font-bold shadow-premium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Upload & Parse Resume'
                  )}
                </button>
              </form>
            </div>

            {/* Resume list */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold text-brand-textPrimary">Your Uploaded Resumes ({resumes.length})</h3>
              
              {resumes.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center text-brand-textSecondary border border-brand-border/40">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-brand-border" />
                  <p className="text-base font-semibold text-brand-textPrimary">No resumes registered</p>
                  <p className="text-xs mt-1">Upload your resume on the left to start applying for jobs.</p>
                </div>
              ) : (
                resumes.map(resume => (
                  <div key={resume.id} className="glass-panel rounded-2xl p-5 border border-brand-border flex items-start gap-4 justify-between hover:border-brand-primary/30 transition-all duration-300">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-5 h-5 text-brand-secondary shrink-0" />
                        <h4 className="text-sm font-bold text-brand-textPrimary truncate">{resume.file_name}</h4>
                      </div>
                      
                      <div className="flex items-center gap-4 text-[10px] text-brand-textSecondary mt-2">
                        <span>Parsed Exp: <strong className="text-brand-textPrimary">{resume.experience_years} Years</strong></span>
                        <span>Parsed on: <strong>{new Date(resume.parsed_at).toLocaleDateString()}</strong></span>
                      </div>

                      {/* Extracted skills */}
                      {resume.skills && resume.skills.length > 0 && (
                        <div className="mt-3">
                          <span className="text-[9px] uppercase font-bold text-brand-primary block tracking-wider mb-1">Extracted Skillset</span>
                          <div className="flex flex-wrap gap-1">
                            {resume.skills.map((skill, idx) => (
                              <span key={idx} className="text-[9px] bg-brand-primary/10 border border-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded font-semibold">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Extracted projects */}
                      {resume.projects && resume.projects.length > 0 && (
                        <div className="mt-3">
                          <span className="text-[9px] uppercase font-bold text-brand-secondary block tracking-wider mb-1">Parsed Projects</span>
                          <ul className="list-disc pl-4 text-[10px] text-brand-textSecondary space-y-0.5">
                            {resume.projects.map((p, idx) => (
                              <li key={idx} className="truncate max-w-lg">{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        onClick={() => setPreviewResume(resume)}
                        className="p-2 text-brand-textSecondary hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                        title="Preview Parsed Content"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteResume(resume.id)}
                        className="p-2 text-brand-textSecondary hover:text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors"
                        title="Delete Resume"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">System Alerts</h1>
              <p className="text-brand-textSecondary text-sm mt-1">Keep track of updates regarding matching calculations and applications.</p>
            </div>

            <div className="glass-panel border border-brand-border/60 rounded-2xl overflow-hidden divide-y divide-brand-border/40 shadow-panel">
              {notifications.length === 0 ? (
                <div className="p-16 text-center text-brand-textSecondary">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-brand-border/60" />
                  <p className="text-base font-semibold text-brand-textPrimary">No new notifications</p>
                  <p className="text-xs mt-1">You are all caught up with application status updates!</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} className={`p-5 flex items-start justify-between gap-4 transition-colors ${!notif.is_read ? 'bg-brand-primary/5 border-l-4 border-brand-primary' : ''}`}>
                    <div className="space-y-1">
                      <p className={`text-xs ${!notif.is_read ? 'text-white font-semibold' : 'text-brand-textSecondary'}`}>
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-brand-textSecondary block">
                        Received: {new Date(notif.created_at || notif.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    {!notif.is_read && (
                      <button 
                        onClick={() => markNotifRead(notif.id)}
                        className="text-[10px] bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary px-2.5 py-1 rounded-lg border border-brand-primary/20 font-bold transition-all"
                      >
                        Read
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 7: PROFILE SETTINGS */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">Candidate Profile</h1>
              <p className="text-brand-textSecondary text-sm mt-1">Edit professional settings and bio details stored on this platform.</p>
            </div>

            {profileSuccess && (
              <div className="bg-brand-success/10 border border-brand-success/20 text-brand-success p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 shrink-0" /> {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Info className="w-5 h-5 shrink-0" /> {profileError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="glass-panel border border-brand-border/60 rounded-3xl p-6 md:p-8 space-y-6 shadow-panel">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                    required
                    disabled
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +1 (555) 000-0000"
                    value={profileData.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Professional Headline</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Backend Engineer"
                    value={profileData.headline}
                    onChange={(e) => handleProfileChange('headline', e.target.value)}
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    value={profileData.experience_years}
                    onChange={(e) => handleProfileChange('experience_years', e.target.value)}
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Education / Degree</label>
                  <input
                    type="text"
                    placeholder="e.g. B.S. in Computer Science"
                    value={profileData.education}
                    onChange={(e) => handleProfileChange('education', e.target.value)}
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Skills (Comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Python, SQL, React, Node.js"
                  value={profileData.skills}
                  onChange={(e) => handleProfileChange('skills', e.target.value)}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Professional Summary / Bio</label>
                <textarea
                  rows="4"
                  placeholder="Brief overview of your experience, skills, and background..."
                  value={profileData.bio}
                  onChange={(e) => handleProfileChange('bio', e.target.value)}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Portfolio / Website URL</label>
                <input
                  type="text"
                  placeholder="e.g. https://portfolio.github.io"
                  value={profileData.portfolio}
                  onChange={(e) => handleProfileChange('portfolio', e.target.value)}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white py-3 rounded-xl font-bold shadow-premium flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
              >
                <Save className="w-4 h-4" /> Save profile details
              </button>
            </form>
          </div>
        )}

        {/* TAB 8: STATUS TRACKING */}
        {activeTab === 'tracking' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">Application Tracker</h1>
              <p className="text-brand-textSecondary text-sm mt-1">Review live screening and status stages of your submitted job applications.</p>
            </div>

            {applications.length === 0 ? (
              <div className="glass-panel border border-brand-border p-12 text-center text-brand-textSecondary rounded-3xl">
                <Sliders className="w-12 h-12 mx-auto mb-4 text-brand-border" />
                <p className="text-lg font-semibold text-brand-textPrimary">No applications available</p>
                <p className="text-xs mt-1 font-medium">Submit applications to explore hiring timeline status here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selector */}
                <div className="glass-panel border border-brand-border/60 rounded-2xl p-5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Select Application to Track</label>
                  <select
                    value={trackingAppId}
                    onChange={(e) => setTrackingAppId(e.target.value)}
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary text-xs focus:outline-none focus:border-brand-primary font-semibold font-sans"
                  >
                    {applications.map(app => (
                      <option key={app.id} value={app.id}>{app.job_title} (Applied: {new Date(app.applied_at).toLocaleDateString()})</option>
                    ))}
                  </select>
                </div>

                {trackingApp && (
                  <div className="glass-panel border border-brand-border/60 rounded-3xl p-6 md:p-8 space-y-8 shadow-panel">
                    <div className="flex justify-between items-start pb-4 border-b border-brand-border/40">
                      <div>
                        <h3 className="text-xl font-bold text-brand-textPrimary leading-tight">{trackingApp.job_title}</h3>
                        <span className="text-xs text-brand-textSecondary mt-1 block">Recruiter Review Status: {getStatusBadge(trackingApp.status)}</span>
                      </div>
                      <span className="text-[10px] text-brand-textSecondary font-medium">Applied {new Date(trackingApp.applied_at).toLocaleDateString()}</span>
                    </div>

                    {/* Timeline stepper */}
                    <div className="relative pl-8 space-y-8 select-none">
                      {/* Vertical line connecting steps */}
                      <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-brand-border"></div>

                      {(() => {
                        const status = trackingApp.status;
                        const timelineSteps = [
                          {
                            label: 'Application Submitted',
                            desc: 'Candidate successfully submitted credentials to system.',
                            completed: true,
                            active: status === 'applied'
                          },
                          {
                            label: 'Resume Parsed & Screened',
                            desc: 'ATS scanned matches against job skills and experience.',
                            completed: true,
                            active: false
                          },
                          {
                            label: 'Shortlisted / Recruiter Review',
                            desc: 'Recruiter reviewed matches and verified alignment.',
                            completed: status === 'shortlisted' || status === 'interview' || status === 'approved',
                            active: status === 'shortlisted'
                          },
                          {
                            label: 'Interview Scheduling',
                            desc: 'Verification loops or interview schedules arranged.',
                            completed: status === 'interview' || status === 'approved',
                            active: status === 'interview'
                          },
                          {
                            label: 'Hiring Decision',
                            desc: status === 'rejected' ? 'Application was not selected at this time.' : status === 'approved' ? 'Congratulations! Offer released.' : 'Awaiting final selection outcome.',
                            completed: status === 'approved' || status === 'rejected',
                            active: status === 'approved' || status === 'rejected',
                            isFinal: true
                          }
                        ];

                        return timelineSteps.map((step, idx) => {
                          const isGreen = step.completed && status !== 'rejected';
                          const isRed = step.isFinal && status === 'rejected';
                          const isBlue = step.active && status !== 'rejected';
                          
                          let circleStyle = 'bg-brand-bg border-brand-border text-brand-textSecondary';
                          if (isRed) {
                            circleStyle = 'bg-brand-danger/20 border-brand-danger text-brand-danger scale-110';
                          } else if (isGreen) {
                            circleStyle = 'bg-brand-success/20 border-brand-success text-brand-success';
                          } else if (isBlue) {
                            circleStyle = 'bg-brand-primary/20 border-brand-primary text-brand-primary scale-110 shadow-premium animate-pulse';
                          }

                          return (
                            <div key={idx} className="relative flex gap-4 text-xs">
                              {/* Circle icon */}
                              <div className={`absolute -left-8 top-0.5 w-7.5 h-7.5 rounded-full border flex items-center justify-center text-xs font-bold transition-all z-10 ${circleStyle}`}>
                                {isRed ? '✗' : step.completed ? '✓' : idx + 1}
                              </div>
                              <div className="space-y-1">
                                <h4 className={`font-bold text-sm ${step.active || step.completed ? 'text-white' : 'text-brand-textSecondary'}`}>
                                  {step.label}
                                </h4>
                                <p className="text-xs text-brand-textSecondary leading-relaxed">{step.desc}</p>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
          </>
        )}
      </main>

      {/* APPLY MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-brand-bg/85 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setSelectedJob(null)}></div>
          
          <div className="glass-panel rounded-3xl border border-brand-border max-w-md w-full p-6 z-10 shadow-premium animate-scale-up">
            <div className="flex justify-between items-center pb-4 border-b border-brand-border/60 mb-4">
              <h3 className="text-lg font-bold text-brand-textPrimary">Apply for Position</h3>
              <button onClick={() => setSelectedJob(null)} className="text-brand-textSecondary hover:text-brand-textPrimary bg-brand-bg p-1.5 rounded-xl border border-brand-border">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6">
              <h4 className="font-bold text-brand-textPrimary text-base leading-tight">{selectedJob.title}</h4>
              <p className="text-xs text-brand-textSecondary mt-1 flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> Posted by {selectedJob.recruiter_name}</p>
            </div>

            {applyError && (
              <div className="mb-4 p-3 bg-brand-danger/15 border border-brand-danger/30 rounded-xl text-brand-danger text-xs font-semibold">
                {applyError}
              </div>
            )}

            {resumes.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-brand-textSecondary mb-4 leading-relaxed">You must upload a resume before you can apply for jobs.</p>
                <button
                  onClick={() => {
                    setSelectedJob(null);
                    navigate('/resumes');
                  }}
                  className="bg-brand-primary text-white text-xs font-bold px-4 py-2 rounded-xl shadow-premium"
                >
                  Upload Resume First
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">
                    Select Submission Resume
                  </label>
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl px-3 py-2.5 text-brand-textPrimary text-xs focus:outline-none focus:border-brand-primary font-semibold"
                  >
                    {resumes.map(r => (
                      <option key={r.id} value={r.id}>{r.file_name} ({r.experience_years} Yrs Exp)</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-brand-border/40">
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="text-brand-textSecondary hover:text-brand-textPrimary text-xs font-semibold px-4 py-2.5 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="bg-gradient-to-r from-brand-primary to-brand-secondary text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-premium disabled:opacity-50"
                  >
                    {applying ? 'Submitting...' : 'Confirm Submission'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESUME PREVIEW DRAWER/OVERLAY */}
      {previewResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-0 animate-fade-in">
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 190 }}
            className="w-full max-w-2xl h-full bg-brand-panel border-l border-brand-border p-6 shadow-premium flex flex-col justify-between"
          >
            <div className="flex items-center justify-between pb-4 border-b border-brand-border/40">
              <div>
                <h3 className="text-lg font-bold text-brand-textPrimary truncate max-w-md">{previewResume.filename}</h3>
                <span className="text-xs text-brand-textSecondary">Parsed credentials and content summary</span>
              </div>
              <button 
                onClick={() => setPreviewResume(null)}
                className="text-brand-textSecondary hover:text-brand-textPrimary bg-brand-bg hover:bg-brand-panelLight p-2 rounded-xl border border-brand-border transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Resume Details Scroll Area */}
            <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-1">
              {/* File Info */}
              <div className="glass-panel border border-brand-border/40 p-4 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider block">Document Information</span>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-brand-textSecondary block">Parsed Experience:</span>
                    <strong className="text-brand-textPrimary">{previewResume.experience_years} Years</strong>
                  </div>
                  <div>
                    <span className="text-brand-textSecondary block">Upload Date:</span>
                    <strong className="text-brand-textPrimary">{new Date(previewResume.parsed_at).toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Skills */}
              {previewResume.skills && previewResume.skills.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider block">Extracted Skillset</span>
                  <div className="flex flex-wrap gap-1.5">
                    {previewResume.skills.map((skill, idx) => (
                      <span key={idx} className="text-xs bg-brand-primary/10 border border-brand-primary/20 text-brand-primary px-2.5 py-1 rounded-lg font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {previewResume.projects && previewResume.projects.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider block">Extracted Projects</span>
                  <div className="space-y-2.5">
                    {previewResume.projects.map((proj, idx) => (
                      <div key={idx} className="bg-brand-bg/40 p-3 rounded-lg border border-brand-border/40 text-xs text-brand-textSecondary leading-relaxed">
                        • {proj}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Text Summary */}
              {previewResume.raw_text && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider block">Raw Document Content</span>
                  <div className="bg-brand-bg/60 p-4 rounded-xl border border-brand-border/50 text-[11px] text-brand-textSecondary font-mono leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto pr-2">
                    {previewResume.raw_text}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-brand-border/40 flex justify-end">
              <button 
                onClick={() => setPreviewResume(null)}
                className="bg-brand-panel hover:bg-brand-panelLight border border-brand-border text-brand-textSecondary hover:text-brand-textPrimary px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                Close Drawer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
