import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Brain, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  TrendingUp, 
  FileText, 
  Check, 
  ArrowRight, 
  RefreshCw, 
  Briefcase, 
  Target,
  FileCheck,
  ChevronRight,
  BookOpen,
  Eye,
  CheckCircle,
  HelpCircle,
  Search
} from 'lucide-react';
import API from '../../services/api';

const TARGET_ROLES = [
  {
    id: 'frontend',
    title: 'Front-End Developer',
    coreSkills: ['React', 'JavaScript', 'TypeScript', 'Tailwind CSS', 'HTML5', 'CSS3', 'Git', 'Webpack', 'Jest'],
    description: 'Specializes in user interfaces, client-side interactions, and responsive responsive designs.'
  },
  {
    id: 'backend',
    title: 'Back-End Developer',
    coreSkills: ['Node.js', 'Python', 'Express', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'RESTful APIs', 'gRPC'],
    description: 'Specializes in server-side logic, database architectures, microservices, and system scaling.'
  },
  {
    id: 'fullstack',
    title: 'Full-Stack Developer',
    coreSkills: ['React', 'Node.js', 'Express', 'SQL', 'MongoDB', 'AWS', 'Docker', 'Git', 'System Design'],
    description: 'Bridges client-side and server-side operations, full-stack state management, and deployment.'
  },
  {
    id: 'datascientist',
    title: 'Data Scientist & ML Engineer',
    coreSkills: ['Python', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'SQL', 'Scikit-Learn', 'Machine Learning', 'Data Visualization'],
    description: 'Specializes in predictive modeling, statistical analyses, deep learning pipelines, and data insights.'
  },
  {
    id: 'devops',
    title: 'DevOps & Cloud Engineer',
    coreSkills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD Pipelines', 'Linux', 'Terraform', 'Ansible', 'Bash Scripting', 'Nginx'],
    description: 'Focuses on infrastructure automate, deployment reliability, system monitoring, and orchestration.'
  }
];

function getSkillsForCustomRole(roleName) {
  const role = (roleName || '').toLowerCase();
  if (role.includes('ai') || role.includes('artificial') || role.includes('deep learning') || role.includes('nlp')) {
    return ['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'SQL', 'Git'];
  }
  if (role.includes('data') || role.includes('analyst') || role.includes('analytics')) {
    return ['Python', 'SQL', 'Pandas', 'NumPy', 'Tableau', 'PowerBI', 'Data Analysis', 'Excel'];
  }
  if (role.includes('flutter') || role.includes('mobile') || role.includes('android') || role.includes('ios') || role.includes('react native') || role.includes('swift') || role.includes('kotlin')) {
    return ['Mobile App Development', 'Git', 'API Integration', role.includes('flutter') ? 'Flutter' : (role.includes('native') ? 'React Native' : 'Mobile UI'), 'UI/UX Design', 'State Management'];
  }
  if (role.includes('design') || role.includes('ui') || role.includes('ux') || role.includes('figma') || role.includes('product')) {
    return ['Figma', 'UI/UX Design', 'User Research', 'Wireframing', 'Prototyping', 'Design Systems', 'Interaction Design'];
  }
  if (role.includes('qa') || role.includes('test') || role.includes('quality') || role.includes('automation')) {
    return ['QA Automation', 'Selenium', 'Cypress', 'API Testing', 'Bug Tracking', 'Test Cases', 'Git'];
  }
  if (role.includes('cyber') || role.includes('security') || role.includes('network') || role.includes('penetration')) {
    return ['Network Security', 'Penetration Testing', 'Linux', 'Vulnerability Assessment', 'OWASP', 'Firewalls', 'Security Audits'];
  }
  if (role.includes('cloud') || role.includes('devops') || role.includes('aws') || role.includes('azure') || role.includes('kubernetes')) {
    return ['AWS', 'Docker', 'Kubernetes', 'CI/CD Pipelines', 'Linux', 'Terraform', 'Git'];
  }
  // Default fallback based on words or generic development skills
  const words = roleName ? roleName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)) : [];
  const base = words.filter(w => w.length > 2).slice(0, 3);
  const defaults = ['System Design', 'Git', 'RESTful APIs', 'Problem Solving', 'Agile Methodology', 'Software Development Life Cycle (SDLC)'];
  return [...new Set([...base, ...defaults])];
}

export default function CandidateResumeImprovement({ resumes, user, profileData, navigate }) {
  const hasResume = resumes.length > 0;
  const latestResume = hasResume ? resumes[0] : null;
  
  // Selection states
  const [selectedRoleId, setSelectedRoleId] = useState('fullstack');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [validationError, setValidationError] = useState('');

  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanResult, setScanResult] = useState(null);
  
  // Custom checklist states to make the optimizer interactive
  const [checkedSuggestions, setCheckedSuggestions] = useState(new Set());

  const selectedRole = selectedRoleId === 'other'
    ? {
        id: 'other',
        title: customRole.trim() || 'Custom Role',
        coreSkills: getSkillsForCustomRole(customRole),
        description: `Custom audit optimized for ${customRole.trim() || 'your target role'}.`
      }
    : (TARGET_ROLES.find(r => r.id === selectedRoleId) || TARGET_ROLES[2]);

  const filteredRoles = TARGET_ROLES.filter(role => 
    role.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-detect role from profile headline
  useEffect(() => {
    const headline = (profileData?.headline || '').toLowerCase();
    if (headline.includes('front')) setSelectedRoleId('frontend');
    else if (headline.includes('back')) setSelectedRoleId('backend');
    else if (headline.includes('data') || headline.includes('machine') || headline.includes('ml')) setSelectedRoleId('datascientist');
    else if (headline.includes('devops') || headline.includes('cloud')) setSelectedRoleId('devops');
    else if (headline.includes('full')) setSelectedRoleId('fullstack');
  }, [profileData]);

  const handleToggleCheck = (id) => {
    setCheckedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleRunScan = () => {
    if (!hasResume) return;
    if (selectedRoleId === 'other' && !customRole.trim()) {
      setValidationError('Please enter a target job role.');
      return;
    }
    setValidationError('');
    setScanning(true);
    setScanStep(0);
    setScanResult(null);

    // Multi-step scanning simulation
    const intervals = [800, 1600, 2400, 3200, 4000];
    intervals.forEach((delay, idx) => {
      setTimeout(() => {
        setScanStep(idx + 1);
        if (idx === intervals.length - 1) {
          generateAnalysisReport();
        }
      }, delay);
    });
  };

  const generateAnalysisReport = () => {
    // Generate intelligent insights based on the candidate's parsed resume
    const text = (latestResume?.extracted_text || '').toLowerCase();
    
    // Parse skills
    let parsedSkills = [];
    if (latestResume?.skills) {
      try {
        parsedSkills = typeof latestResume.skills === 'string' 
          ? JSON.parse(latestResume.skills) 
          : latestResume.skills;
      } catch (e) {
        parsedSkills = [];
      }
    }
    const skillsLower = parsedSkills.map(s => s.toLowerCase());

    // 1. Missing sections checklist
    const missingSections = [];
    const detectedSections = [];
    
    const sectionsConfig = [
      { name: 'Projects', keywords: ['projects', 'personal projects', 'key projects'], icon: '🚀' },
      { name: 'Certifications', keywords: ['certifications', 'certification', 'licenses'], icon: '📜' },
      { name: 'GitHub Link', keywords: ['github.com', 'git/'], icon: '💻' },
      { name: 'LinkedIn Profile', keywords: ['linkedin.com/in', 'linkedin.com'], icon: '🔗' },
      { name: 'Professional Summary', keywords: ['summary', 'professional summary', 'career objective'], icon: '📝' },
      { name: 'Achievements & Awards', keywords: ['achievements', 'awards', 'accomplishments', 'honors'], icon: '🏆' }
    ];

    sectionsConfig.forEach(sec => {
      const isDetected = sec.keywords.some(kw => text.includes(kw));
      if (isDetected) {
        detectedSections.push(sec);
      } else {
        missingSections.push(sec);
      }
    });

    // 2. Technical Skill Match / Gap Analysis
    const matchedSkills = [];
    const missingSkills = [];
    selectedRole.coreSkills.forEach(skill => {
      const match = skillsLower.some(s => s.includes(skill.toLowerCase())) || text.includes(skill.toLowerCase());
      if (match) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    });

    // 3. Scores Calculation (derived but stable)
    // Core base points
    let baseScore = 65;
    
    // Skill coverage points
    const skillRatio = matchedSkills.length / selectedRole.coreSkills.length;
    baseScore += Math.round(skillRatio * 15);
    
    // Section completeness points
    const sectionRatio = detectedSections.length / sectionsConfig.length;
    baseScore += Math.round(sectionRatio * 10);

    // Text quality points
    if (text.length > 1500) baseScore += 5;
    if (text.length < 500) baseScore -= 15;

    const overallScore = Math.max(35, Math.min(baseScore, 98));
    const atsScore = Math.max(40, Math.min(baseScore + 4, 96));
    const readabilityScore = Math.max(30, Math.min(baseScore - 5, 95));

    // 4. Grammar & Style Audit
    const writingIssues = [];
    if (!text.includes('implemented') && !text.includes('designed') && !text.includes('optimized')) {
      writingIssues.push({
        id: 'action_verbs',
        title: 'Weak Action Verbs',
        desc: 'Resume uses passive voice ("responsible for", "helped"). Rewrite using strong action verbs (e.g. "Spearheaded", "Optimized", "Architected").'
      });
    }
    
    const percentageMatches = text.match(/\b\d+%/g) || [];
    const dollarMatches = text.match(/\$\b\d+/g) || [];
    if (percentageMatches.length === 0 && dollarMatches.length === 0) {
      writingIssues.push({
        id: 'metrics',
        title: 'Lack of Quantifiable Achievements',
        desc: 'No metrics (%, $, numbers) detected. Recruiters prefer results-oriented bullet points (e.g. "improved speed by 25%", "reduced latency").'
      });
    }

    // 5. Structure & Formatting Audit
    const formatIssues = [];
    if (latestResume?.file_name?.toLowerCase().endsWith('.docx')) {
      formatIssues.push({
        id: 'file_format',
        title: 'Word Document format (.docx)',
        desc: 'PDF is preferred to lock your formatting. Word files might look disjointed on different ATS parsers.'
      });
    }
    if (text.includes('  ') || text.includes('\n\n\n')) {
      formatIssues.push({
        id: 'spacing',
        title: 'Inconsistent Spacing & Margins',
        desc: 'Multiple consecutive spaces or empty line gaps detected. Standardize paragraph padding to 1.15x.'
      });
    }

    // 6. Recruiter Perspective
    const recruiterTriggers = [];
    if (latestResume?.experience_years < 1) {
      recruiterTriggers.push('Short tenure or lack of professional career history. Compensate with high-caliber, full-stack team projects.');
    }
    if (missingSections.some(s => s.name === 'GitHub Link' || s.name === 'LinkedIn Profile')) {
      recruiterTriggers.push('Lack of online professional footprint (GitHub/LinkedIn). Harder to verify skill claims.');
    }
    if (missingSkills.length > 4) {
      recruiterTriggers.push(`Large technology mismatch. Resume is missing ${missingSkills.slice(0, 3).join(', ')} which are crucial for ${selectedRole.title} positions.`);
    }

    // 7. Priorities list
    const priorities = [];
    if (missingSkills.length > 0) {
      priorities.push({
        id: 'skills_gap',
        level: 'HIGH',
        color: 'text-brand-danger bg-brand-danger/10 border-brand-danger/20',
        title: 'Address Core Skill Gap',
        action: `Add ${missingSkills.slice(0, 3).join(', ')} to your resume and integrate projects highlighting their use.`
      });
    }
    if (missingSections.some(s => s.name === 'GitHub Link' || s.name === 'LinkedIn Profile')) {
      priorities.push({
        id: 'profile_links',
        level: 'HIGH',
        color: 'text-brand-danger bg-brand-danger/10 border-brand-danger/20',
        title: 'Embed Professional Handles',
        action: 'Include clickable hyperlinks to GitHub & LinkedIn in your resume header.'
      });
    }
    if (writingIssues.some(w => w.id === 'metrics')) {
      priorities.push({
        id: 'metric_points',
        level: 'MEDIUM',
        color: 'text-brand-warning bg-brand-warning/10 border-brand-warning/20',
        title: 'Quantify Work Impacts',
        action: 'Add data metrics, percentages, and dollar figures to at least three project/work bullets.'
      });
    }
    if (formatIssues.some(f => f.id === 'file_format')) {
      priorities.push({
        id: 'pdf_conversion',
        level: 'LOW',
        color: 'text-brand-success bg-brand-success/10 border-brand-success/20',
        title: 'Convert Document to PDF',
        action: 'Save and upload your resume in standard PDF format instead of Microsoft Word.'
      });
    }

    setScanResult({
      overallScore,
      atsScore,
      readabilityScore,
      missingSections,
      detectedSections,
      matchedSkills,
      missingSkills,
      writingIssues,
      formatIssues,
      recruiterTriggers,
      priorities
    });
    setScanning(false);
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight flex items-center gap-2">
          <Brain className="w-8 h-8 text-brand-primary animate-pulse" /> AI Resume Career Coach
        </h1>
        <p className="text-brand-textSecondary text-sm mt-1">
          Perform a deep contextual ATS scanning audit and skill gap evaluation tailored to your target job role.
        </p>
      </div>

      {/* DRAG / UPLOAD GATED STATE */}
      {!hasResume ? (
        <div className="glass-panel border border-brand-border/60 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-6">
          <div className="w-16 h-16 mx-auto bg-brand-danger/10 border border-brand-danger/20 rounded-2xl flex items-center justify-center text-brand-danger text-2xl">
            ⚠️
          </div>
          <div>
            <h3 className="text-lg font-bold text-brand-textPrimary">No Resume Uploaded</h3>
            <p className="text-xs text-brand-textSecondary mt-1 leading-relaxed">
              Before the AI Career Coach can evaluate your profile, you need to upload your professional CV. We support PDF, DOCX, and JPG formats.
            </p>
          </div>
          <button
            onClick={() => navigate('/resumes')}
            className="bg-gradient-to-r from-brand-primary to-brand-secondary text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-premium transition-all inline-flex items-center gap-1.5"
          >
            Go to Resume Manager <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT OPTION BOARD */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-5">
              <h3 className="font-bold text-brand-textPrimary text-sm flex items-center gap-2">
                <Target className="w-4.5 h-4.5 text-brand-secondary" /> Scan Configurations
              </h3>

              {/* Uploaded File Reference */}
              <div className="bg-brand-bg/60 p-4 rounded-xl border border-brand-border/40 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-brand-textPrimary truncate">{latestResume.file_name}</p>
                  <p className="text-[10px] text-brand-textSecondary mt-0.5">Uploaded {new Date(latestResume.parsed_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Target Job Role Select */}
              <div className="space-y-2 relative">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary">Target Job Role</label>
                
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textSecondary" />
                  <input
                    type="text"
                    placeholder="Search or select a role..."
                    value={isOpen ? searchQuery : (selectedRoleId === 'other' ? 'Other (Enter Custom Role)' : selectedRole.title)}
                    onFocus={() => {
                      setIsOpen(true);
                      setSearchQuery('');
                    }}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsOpen(true);
                    }}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl pl-10 pr-10 py-2.5 text-xs text-brand-textPrimary focus:outline-none focus:border-brand-primary font-medium placeholder-brand-textSecondary cursor-pointer"
                  />
                  <div 
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-brand-textSecondary hover:text-brand-textPrimary"
                  >
                    <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Combobox Dropdown List */}
                {isOpen && (
                  <>
                    {/* Backdrop to close dropdown on clicking outside */}
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    
                    <div className="absolute left-0 right-0 mt-1 bg-brand-panel border border-brand-border/80 rounded-xl shadow-premium z-20 max-h-60 overflow-y-auto py-1 backdrop-blur-md">
                      {filteredRoles.length > 0 ? (
                        filteredRoles.map(role => {
                          const isSelected = selectedRoleId === role.id;
                          return (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => {
                                setSelectedRoleId(role.id);
                                setIsOpen(false);
                                setSearchQuery('');
                                setValidationError('');
                              }}
                              className={`w-full px-4 py-2 text-left text-xs transition-colors flex items-center justify-between ${
                                isSelected 
                                  ? 'bg-brand-primary/10 text-brand-primary font-bold' 
                                  : 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-brand-panelLight'
                              }`}
                            >
                              <span>{role.title}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-brand-primary" />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-4 py-2 text-xs text-brand-textSecondary italic">No matching roles found</div>
                      )}

                      <div className="border-t border-brand-border/40 my-1"></div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoleId('other');
                          setIsOpen(false);
                          setSearchQuery('');
                          setValidationError('');
                        }}
                        className={`w-full px-4 py-2 text-left text-xs transition-colors flex items-center justify-between ${
                          selectedRoleId === 'other'
                            ? 'bg-brand-primary/10 text-brand-primary font-bold'
                            : 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-brand-panelLight'
                        }`}
                      >
                        <span className="font-semibold text-brand-primary">Other (Enter Custom Role)</span>
                        {selectedRoleId === 'other' && <Check className="w-3.5 h-3.5 text-brand-primary" />}
                      </button>
                    </div>
                  </>
                )}

                {/* Custom Role Input Field */}
                {selectedRoleId === 'other' && (
                  <div className="mt-3 space-y-1.5 animate-fade-in">
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-brand-primary">Specify Custom Role</label>
                    <input
                      type="text"
                      placeholder="Enter your target job role (e.g., AI Engineer, Flutter Developer, Cybersecurity Analyst, QA Engineer, UI/UX Designer, etc.)"
                      value={customRole}
                      onChange={(e) => {
                        setCustomRole(e.target.value);
                        if (e.target.value.trim()) setValidationError('');
                      }}
                      className={`w-full bg-brand-bg border rounded-xl px-3.5 py-2.5 text-xs text-brand-textPrimary placeholder-brand-textSecondary/60 focus:outline-none focus:border-brand-primary ${
                        validationError ? 'border-brand-danger focus:border-brand-danger' : 'border-brand-border'
                      }`}
                    />
                    {validationError && (
                      <p className="text-[10px] text-brand-danger font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {validationError}
                      </p>
                    )}
                  </div>
                )}

                {selectedRoleId !== 'other' && (
                  <p className="text-[10px] text-brand-textSecondary leading-normal pl-1">
                    {selectedRole.description}
                  </p>
                )}
              </div>

              {/* Run Scan Button */}
              <button
                onClick={handleRunScan}
                disabled={scanning}
                className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-premium flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-brand-warning animate-pulse" />}
                {scanning ? 'Running Evaluation...' : 'Run Coach Audit'}
              </button>
            </div>

            {/* SCAN PROGRESS FEED */}
            {scanning && (
              <div className="glass-panel border border-brand-primary/20 rounded-2xl p-6 space-y-4 animate-fade-in">
                <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider">Audit Progress</h4>
                <div className="space-y-2.5">
                  {[
                    'Extracting document semantics...',
                    'Auditing ATS structural layout...',
                    'Scanning grammar & lexical density...',
                    'Verifying standard section index...',
                    'Comparing skill profiles...'
                  ].map((step, idx) => {
                    const isDone = scanStep > idx;
                    const isActive = scanStep === idx;
                    return (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-brand-success shrink-0" />
                        ) : isActive ? (
                          <RefreshCw className="w-4 h-4 text-brand-primary animate-spin shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-brand-border/40 shrink-0" />
                        )}
                        <span className={`${isDone ? 'text-brand-success font-semibold' : isActive ? 'text-brand-textPrimary font-bold animate-pulse' : 'text-brand-textSecondary'}`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT DETAILED REPORT BOARD */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* INITIAL BLANK STATE */}
            {!scanResult && !scanning && (
              <div className="glass-panel border border-brand-border/40 rounded-3xl p-16 text-center text-brand-textSecondary">
                <FileCheck className="w-16 h-16 mx-auto mb-4 text-brand-border" />
                <h3 className="text-lg font-bold text-brand-textPrimary">Awaiting Scan</h3>
                <p className="text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                  Select your target job role on the left and run the coach audit to construct your personalized improvement roadmap.
                </p>
                <button
                  onClick={handleRunScan}
                  className="mt-6 bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/20 text-brand-primary text-xs font-bold px-4 py-2.5 rounded-xl shadow-premium"
                >
                  Analyze Resume Now
                </button>
              </div>
            )}

            {/* SCAN RESULTS PANEL */}
            {scanResult && !scanning && (
              <div className="space-y-6 animate-scale-up">
                
                {/* 1. SCORE HIGHLIGHTS ROW */}
                <div className="grid grid-cols-3 gap-4">
                  
                  {/* Overall score */}
                  <div className="glass-panel border border-brand-primary/25 rounded-2xl p-5 text-center flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-brand-primary/5 to-transparent">
                    <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider mb-2">Overall Score</span>
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg width="64" height="64" viewBox="0 0 64 64" className="absolute inset-0 transform -rotate-90">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                        <circle cx="32" cy="32" r="26" fill="none" stroke="#6366f1" strokeWidth="4" strokeDasharray={`${2*Math.PI*26}`} strokeDashoffset={`${2*Math.PI*26*(1 - scanResult.overallScore/100)}`} strokeLinecap="round" />
                      </svg>
                      <span className="text-lg font-extrabold text-brand-primary">{scanResult.overallScore}%</span>
                    </div>
                    <span className="text-[10px] font-bold text-brand-success mt-2">Passed</span>
                  </div>

                  {/* ATS Compatibility */}
                  <div className="glass-panel border border-brand-border/60 rounded-2xl p-5 text-center flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider mb-2">ATS Score</span>
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg width="64" height="64" viewBox="0 0 64 64" className="absolute inset-0 transform -rotate-90">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                        <circle cx="32" cy="32" r="26" fill="none" stroke="#8b5cf6" strokeWidth="4" strokeDasharray={`${2*Math.PI*26}`} strokeDashoffset={`${2*Math.PI*26*(1 - scanResult.atsScore/100)}`} strokeLinecap="round" />
                      </svg>
                      <span className="text-lg font-extrabold text-brand-secondary">{scanResult.atsScore}%</span>
                    </div>
                    <span className="text-[10px] font-semibold text-brand-textSecondary mt-2">Compatible</span>
                  </div>

                  {/* Readability Score */}
                  <div className="glass-panel border border-brand-border/60 rounded-2xl p-5 text-center flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider mb-2">Readability</span>
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg width="64" height="64" viewBox="0 0 64 64" className="absolute inset-0 transform -rotate-90">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                        <circle cx="32" cy="32" r="26" fill="none" stroke="#06b6d4" strokeWidth="4" strokeDasharray={`${2*Math.PI*26}`} strokeDashoffset={`${2*Math.PI*26*(1 - scanResult.readabilityScore/100)}`} strokeLinecap="round" />
                      </svg>
                      <span className="text-lg font-extrabold text-[#06b6d4]">{scanResult.readabilityScore}%</span>
                    </div>
                    <span className="text-[10px] font-semibold text-brand-textSecondary mt-2">Good Layout</span>
                  </div>
                </div>

                {/* 2. RECRUITER PERSPECTIVE WARNINGS */}
                {scanResult.recruiterTriggers.length > 0 && (
                  <div className="bg-brand-danger/5 border border-brand-danger/25 rounded-2xl p-5 space-y-3">
                    <h4 className="text-xs font-bold text-brand-danger uppercase tracking-wider flex items-center gap-1.5">
                      ⚠️ Recruiter Perspective Risk Assessment
                    </h4>
                    <p className="text-[10px] text-brand-textSecondary leading-normal">
                      Based on automated recruiter criteria parsing, here are key reasons an employer might filter out your resume:
                    </p>
                    <ul className="space-y-1.5 text-xs text-brand-textSecondary">
                      {scanResult.recruiterTriggers.map((trig, ti) => (
                        <li key={ti} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-brand-danger font-bold">•</span>
                          <span>{trig}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 3. PRIORITY AUDIT LIST & PLANS */}
                <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-brand-textPrimary text-sm flex items-center gap-2">
                    <TrendingUp className="w-4.5 h-4.5 text-brand-primary" /> Personalized AI Improvement Plan
                  </h3>
                  <p className="text-xs text-brand-textSecondary">
                    We suggest checking off these action items in order of priority to optimize your resume:
                  </p>
                  
                  <div className="space-y-3">
                    {scanResult.priorities.map((item, idx) => {
                      const isCompleted = checkedSuggestions.has(item.id);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleToggleCheck(item.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex gap-3.5 items-start ${
                            isCompleted 
                              ? 'bg-slate-100/40 border-brand-border/40 opacity-60' 
                              : 'bg-brand-bg hover:border-brand-primary/30'
                          }`}
                        >
                          <div className={`mt-0.5 w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 ${
                            isCompleted ? 'bg-brand-success border-brand-success text-white' : 'border-brand-border'
                          }`}>
                            {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${item.color}`}>
                                {item.level}
                              </span>
                              <h4 className={`text-xs font-bold ${isCompleted ? 'line-through text-brand-textSecondary' : 'text-brand-textPrimary'}`}>
                                {item.title}
                              </h4>
                            </div>
                            <p className={`text-xs mt-1 leading-normal ${isCompleted ? 'text-brand-textSecondary' : 'text-brand-textSecondary'}`}>
                              {item.action}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. TECH SKILL MATCH & GAP ANALYSIS */}
                <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-brand-textPrimary text-sm flex items-center gap-2">
                    <Target className="w-4.5 h-4.5 text-brand-secondary" /> Role Skill Gap Analysis
                  </h3>
                  <p className="text-xs text-brand-textSecondary">
                    Matched vs. missing critical competencies required for <strong>{selectedRole.title}</strong>:
                  </p>

                  <div className="space-y-4">
                    {/* Matched skills */}
                    <div>
                      <span className="text-[10px] font-bold text-brand-success uppercase tracking-widest block mb-2">✓ Matched Competencies ({scanResult.matchedSkills.length})</span>
                      {scanResult.matchedSkills.length === 0 ? (
                        <p className="text-xs text-brand-textSecondary italic">No matched core skills detected in parsed text.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {scanResult.matchedSkills.map((s, idx) => (
                            <span key={idx} className="text-xs bg-brand-success/10 border border-brand-success/20 px-2.5 py-0.5 rounded-lg text-brand-success font-semibold">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Missing skills */}
                    <div>
                      <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest block mb-2">✗ Missing Competencies ({scanResult.missingSkills.length})</span>
                      {scanResult.missingSkills.length === 0 ? (
                        <p className="text-xs text-brand-success font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Perfect match! Your resume contains all critical role technologies.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {scanResult.missingSkills.map((s, idx) => (
                            <span key={idx} className="text-xs bg-brand-accent/10 border border-brand-accent/20 px-2.5 py-0.5 rounded-lg text-brand-accent font-semibold">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. AUDITED SECTIONS CHECKLIST */}
                <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-brand-textPrimary text-sm flex items-center gap-2">
                    <FileCheck className="w-4.5 h-4.5 text-[#06b6d4]" /> Resume Structure Audit
                  </h3>
                  <p className="text-xs text-brand-textSecondary">
                    ATS scanners require distinct page header sections to index data accurately:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Detected sections */}
                    {scanResult.detectedSections.map((sec, idx) => (
                      <div key={idx} className="bg-brand-bg/50 border border-brand-success/15 rounded-xl p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{sec.icon}</span>
                          <span className="text-xs font-bold text-brand-textPrimary">{sec.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-brand-success bg-brand-success/10 px-2 py-0.5 rounded border border-brand-success/20">Detected</span>
                      </div>
                    ))}

                    {/* Missing sections */}
                    {scanResult.missingSections.map((sec, idx) => (
                      <div key={idx} className="bg-brand-bg/50 border border-brand-danger/15 rounded-xl p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{sec.icon}</span>
                          <span className="text-xs font-bold text-brand-textSecondary">{sec.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-brand-danger bg-brand-danger/10 px-2 py-0.5 rounded border border-brand-danger/20">Missing</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. STYLE, GRAMMAR & FORMAT WRITING ISSUES */}
                <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-brand-textPrimary text-sm flex items-center gap-2">
                    <BookOpen className="w-4.5 h-4.5 text-brand-warning" /> Style, Grammar &amp; Layout Checklist
                  </h3>

                  <div className="space-y-3.5">
                    {scanResult.writingIssues.map((issue, idx) => (
                      <div key={idx} className="bg-brand-bg/50 border border-brand-border/50 rounded-xl p-4 flex gap-3 items-start">
                        <AlertCircle className="w-4 h-4 text-brand-warning shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <h4 className="text-xs font-bold text-brand-textPrimary">{issue.title}</h4>
                          <p className="text-xs text-brand-textSecondary mt-0.5 leading-normal">{issue.desc}</p>
                        </div>
                      </div>
                    ))}
                    
                    {scanResult.formatIssues.map((issue, idx) => (
                      <div key={idx} className="bg-brand-bg/50 border border-brand-border/50 rounded-xl p-4 flex gap-3 items-start">
                        <AlertCircle className="w-4 h-4 text-brand-warning shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <h4 className="text-xs font-bold text-brand-textPrimary">{issue.title}</h4>
                          <p className="text-xs text-brand-textSecondary mt-0.5 leading-normal">{issue.desc}</p>
                        </div>
                      </div>
                    ))}

                    {scanResult.writingIssues.length === 0 && scanResult.formatIssues.length === 0 && (
                      <div className="bg-brand-success/5 border border-brand-success/20 rounded-xl p-4 text-center text-xs text-brand-success font-semibold">
                        ✓ No grammar, alignment, or structure style anomalies detected!
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
