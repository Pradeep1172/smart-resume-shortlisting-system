import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, FileText, ClipboardList, MapPin, Award, Clock } from 'lucide-react';

/**
 * CandidateDashboardHome
 * ──────────────────────
 * Rendered only when activeTab === 'dashboard'.
 * Receives all the data + handlers it needs as props so the parent
 * CandidateDashboard.jsx doesn't need to change its state shape.
 */
export default function CandidateDashboardHome({
  user,
  profileData,
  getProfileCompletion,
  jobs,
  applications,
  resumes,
  navigate,
  handleOpenApplyModal,
  hasApplied,
  setTrackingAppId,
  setPreviewResume,
  getStatusBadge,
  dashboardInsights,
}) {
  const pc = getProfileCompletion();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? '☀️ Good Morning' : hour < 17 ? '🌤️ Good Afternoon' : '🌙 Good Evening';
  const firstName = (profileData?.name || user?.name || 'there').split(' ')[0];

  /* Resume parse quality gate:
     - No resume → all AI metrics are N/A
     - Resume uploaded but text < 150 chars (scanned/image PDF) → N/A
     - Properly parsed PDF → show real scores              */
  const hasResume = resumes.length > 0;
  const latestResume = hasResume ? resumes[0] : null;
  const resumeIsValid = hasResume && (latestResume?.extracted_text?.length ?? 0) >= 150;

  const resumeStrengthValue = resumeIsValid ? (dashboardInsights?.resume_strength ?? null) : null;
  const atsCompatibilityValue = resumeIsValid ? (dashboardInsights?.ats_compatibility ?? null) : null;
  const jobMatchesValue = resumeIsValid && dashboardInsights?.recommended_jobs?.length
    ? Math.round(dashboardInsights.recommended_jobs.reduce((acc, curr) => acc + curr.match_score, 0) / dashboardInsights.recommended_jobs.length)
    : null;

  const aiScores = [
    { label: 'Resume Strength',   value: resumeStrengthValue,   color: resumeIsValid ? '#6366f1' : '#475569', note: resumeIsValid ? 'Good — add more skills' : hasResume ? 'Could not parse resume text' : 'Upload a resume to unlock', emoji: '📄' },
    { label: 'ATS Compatibility', value: atsCompatibilityValue, color: resumeIsValid ? '#8b5cf6' : '#475569', note: resumeIsValid ? 'Excellent ATS readability'       : hasResume ? 'N/A — resume not parseable'     : 'Upload a resume to unlock', emoji: '⚙️' },
    { label: 'Profile Score',     value: pc,                    color: '#06b6d4',                            note: pc < 100 ? 'Add more details to rank higher' : 'Profile is complete!',                                                                    emoji: '👤' },
    { label: 'Job Matches',       value: jobMatchesValue,       color: resumeIsValid ? '#10b981' : '#475569', note: resumeIsValid ? `Average alignment across ${jobs.length} jobs` : hasResume ? 'N/A — resume required for matching' : 'Upload a resume for job matching', emoji: '🎯' },
  ];

  /* Stat cards */
  const metrics = [
    { label: 'Profile Score',          value: `${pc}%`,      sub: pc < 100 ? 'Incomplete' : 'Complete',    icon: '👤', color: 'text-brand-primary',   glow: 'from-brand-primary/20',   to: '/profile'      },
    { label: 'Matching Jobs',           value: jobs.length,   sub: 'Open positions',                        icon: '🎯', color: 'text-brand-secondary',  glow: 'from-brand-secondary/20', to: '/jobs'         },
    { label: 'Applications Sent',       value: applications.length, sub: `${applications.filter(a => ['shortlisted','approved'].includes(a.status)).length} shortlisted`, icon: '📋', color: 'text-brand-accent', glow: 'from-brand-accent/20', to: '/applications' },
    { label: 'Interview Invitations',   value: applications.filter(a => a.status === 'interview').length, sub: 'Scheduled', icon: '🗓️', color: 'text-brand-warning', glow: 'from-brand-warning/20', to: '/tracking' },
  ];

  /* Activity feed entries */
  const activity = [
    ...(hasResume ? [{ icon: '📄', text: `Resume uploaded: ${resumes[0].filename?.slice(0, 22) || 'CV'}`, time: new Date(resumes[0].parsed_at).toLocaleDateString(), color: 'text-brand-success' }] : []),
    ...applications.slice(0, 2).map(app => ({ icon: '📋', text: `Applied for ${app.job_title}`, time: new Date(app.applied_at).toLocaleDateString(), color: 'text-brand-primary' })),
    ...(pc > 22 ? [{ icon: '👤', text: 'Profile updated', time: 'This session', color: 'text-brand-secondary' }] : []),
    { icon: '🤖', text: 'AI scoring engine active', time: 'Always on', color: 'text-brand-accent' },
  ].slice(0, 5);

  /* Match scores are handled job-by-job below */

  return (
    <div className="space-y-6">

      {/* ── Compact Hero ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-primary/15 via-brand-secondary/10 to-transparent border border-brand-primary/20 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent pointer-events-none" />

        <div className="z-10">
          <h1 className="text-xl font-extrabold text-brand-textPrimary tracking-tight">
            {greeting}, {firstName}!
          </h1>
          <p className="text-xs text-brand-textSecondary mt-1">
            {pc < 100
              ? `Your recruitment profile is ${pc}% complete. Complete it to improve recruiter visibility.`
              : 'Your profile is complete — recruiters can see your full background.'}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 max-w-[200px] h-1.5 bg-brand-bg rounded-full overflow-hidden border border-brand-border/40">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pc}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}
              />
            </div>
            <span className="text-[11px] font-bold text-brand-primary">{pc}%</span>
            {pc < 100 && (
              <button onClick={() => navigate('/profile')} className="text-[11px] font-semibold text-brand-primary hover:underline">
                Complete Profile →
              </button>
            )}
          </div>
        </div>

        <div className="z-10 flex gap-2 shrink-0">
          <Link to="/jobs" className="bg-gradient-to-r from-brand-primary to-brand-secondary text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-premium hover:-translate-y-0.5 transition-all">
            Browse Jobs
          </Link>
          <Link to="/resumes" className="bg-brand-panel border border-brand-border text-brand-textSecondary hover:text-brand-textPrimary text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-panelLight transition-all">
            {hasResume ? 'Manage Resume' : 'Upload Resume'}
          </Link>
        </div>
      </div>

      {/* ── Metric Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <button
            key={i}
            onClick={() => navigate(m.to)}
            className={`glass-panel border border-brand-border/60 rounded-2xl p-5 hover:border-white/10 transition-all duration-300 shadow-premium text-left bg-gradient-to-br ${m.glow} to-transparent hover:-translate-y-0.5`}
          >
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest leading-tight">{m.label}</span>
              <span className="text-lg">{m.icon}</span>
            </div>
            <span className={`text-3xl font-extrabold ${m.color} mt-2 block`}>{m.value}</span>
            <span className="text-[10px] text-brand-textSecondary mt-1 block">{m.sub}</span>
          </button>
        ))}
      </div>

      {/* ── AI Insights + Activity ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* AI Career Insights */}
        <div className="lg:col-span-2 glass-panel border border-brand-primary/30 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="flex items-center gap-2 mb-5">
            <div className="flex items-center gap-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-lg px-2.5 py-1">
              <span className="text-sm">🤖</span>
              <span className="text-xs font-bold text-brand-primary uppercase tracking-wider">AI Career Insights</span>
            </div>
            <span className="text-[10px] text-brand-textSecondary ml-auto">Powered by ShortlistIQ AI</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {aiScores.map((item, i) => {
              // Profile Score always has a real value; others may be null
              const isNA = item.value === null;
              const displayValue = isNA ? 'N/A' : `${item.value}%`;
              const ringColor = isNA ? '#334155' : item.color;
              const r = 28, circ = 2 * Math.PI * r;
              const dash = isNA ? 0 : ((item.value / 100) * circ).toFixed(1);
              return (
                <div key={i} className="bg-brand-bg/50 border border-brand-border/50 rounded-xl p-4 flex items-center gap-4 hover:border-brand-primary/30 transition-all">
                  <div className="relative shrink-0">
                    <svg width="68" height="68" viewBox="0 0 68 68">
                      <circle cx="34" cy="34" r={r} fill="none" stroke="#1e1b4b" strokeWidth="5" />
                      <circle
                        cx="34" cy="34" r={r} fill="none"
                        stroke={ringColor} strokeWidth="5"
                        strokeDasharray={`${dash} ${circ}`}
                        strokeLinecap="round"
                        transform="rotate(-90 34 34)"
                        style={{ transition: 'stroke-dasharray 1s ease' }}
                      />
                    </svg>
                    <span
                      className="absolute inset-0 flex items-center justify-center font-extrabold"
                      style={{ color: ringColor, fontSize: isNA ? '11px' : '12px' }}
                    >
                      {displayValue}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <span>{item.emoji}</span>
                      <span className="text-xs font-bold text-brand-textPrimary">{item.label}</span>
                    </div>
                    <p className="text-[10px] text-brand-textSecondary leading-relaxed">{item.note}</p>
                    {isNA && (
                      <span className="inline-block mt-1 text-[9px] font-bold text-brand-textSecondary bg-brand-bg border border-brand-border/50 px-1.5 py-0.5 rounded">
                        No analysis available
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warning banner — no resume OR insufficient parse */}
          {!hasResume && (
            <div className="mt-4 bg-brand-warning/10 border border-brand-warning/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span className="text-xs text-brand-warning font-semibold">Upload a resume to unlock AI analysis</span>
              </div>
              <button onClick={() => navigate('/resumes')} className="text-xs bg-brand-warning/20 border border-brand-warning/30 text-brand-warning font-bold px-3 py-1.5 rounded-lg hover:bg-brand-warning/30 transition-all shrink-0">
                Upload Now
              </button>
            </div>
          )}
          {hasResume && !resumeIsValid && (
            <div className="mt-4 bg-brand-danger/10 border border-brand-danger/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base">❌</span>
                <div>
                  <p className="text-xs text-brand-danger font-bold">Resume could not be fully parsed</p>
                  <p className="text-[10px] text-brand-textSecondary mt-0.5">ATS Score, Resume Strength &amp; Job Matches are N/A. Please upload a valid text-based resume.</p>
                </div>
              </div>
              <button onClick={() => navigate('/resumes')} className="text-xs bg-brand-danger/20 border border-brand-danger/30 text-brand-danger font-bold px-3 py-1.5 rounded-lg hover:bg-brand-danger/30 transition-all shrink-0">
                Replace Resume
              </button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="glass-panel border border-brand-border/60 rounded-2xl p-6">
          <h3 className="font-bold text-brand-textPrimary text-sm mb-4 flex items-center gap-2">
            <span className="text-base">⚡</span> Recent Activity
          </h3>
          {activity.length === 0 ? (
            <div className="text-center py-8 text-brand-textSecondary text-xs">
              <span className="text-3xl block mb-2">🚀</span>
              Upload a resume or apply to a job to see activity here.
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs bg-brand-bg border border-brand-border/60 shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${item.color} truncate`}>{item.text}</p>
                    <p className="text-[10px] text-brand-textSecondary">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recommended Jobs ───────────────────────────────────────────── */}
      <div className="glass-panel border border-brand-border/60 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-extrabold text-brand-textPrimary text-base flex items-center gap-2">
              <span>🎯</span> Recommended Jobs For You
            </h3>
            <p className="text-[11px] text-brand-textSecondary mt-0.5">AI-matched based on your resume &amp; profile skills</p>
          </div>
          <Link to="/jobs" className="text-xs font-semibold text-brand-primary hover:underline">Browse All →</Link>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-10 text-brand-textSecondary text-xs border border-dashed border-brand-border/40 rounded-xl">
            <span className="text-3xl block mb-2">🔍</span>
            No open positions right now. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {jobs.slice(0, 6).map((job) => {
              const matchDetail = resumeIsValid && dashboardInsights?.recommended_jobs?.find(rj => rj.job_id === job.id);
              const score = matchDetail ? Math.round(matchDetail.match_score) : null;
              const matchedSkills = matchDetail?.matched_skills || [];
              const missingSkills = matchDetail?.missing_skills || [];
              const applied = hasApplied(job.id);
              return (
                <div key={job.id} className="bg-brand-bg/60 border border-brand-border/60 rounded-xl p-4 hover:border-brand-primary/40 hover:shadow-premium transition-all duration-200 flex flex-col gap-3 group">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-brand-textPrimary text-sm leading-tight group-hover:text-brand-primary transition-colors">
                      {job.title}
                    </h4>
                    <span className={`shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${
                      score === null
                        ? 'bg-brand-textSecondary/10 border-brand-border text-brand-textSecondary'
                        : score >= 85 ? 'bg-brand-success/15 border-brand-success/30 text-brand-success'
                        : score >= 70 ? 'bg-brand-primary/15 border-brand-primary/30 text-brand-primary'
                        : 'bg-brand-textSecondary/10 border-brand-border text-brand-textSecondary'
                    }`}>
                      {score === null ? 'N/A' : `${score}% Match`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] text-brand-textSecondary">
                      <MapPin className="w-3 h-3" /> {job.location || 'Remote'}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-brand-textSecondary">
                      <Award className="w-3 h-3" /> {job.experience_required}+ yrs
                    </span>
                    {applied && (
                      <span className="text-[10px] bg-brand-success/15 border border-brand-success/25 text-brand-success font-bold px-1.5 py-0.5 rounded">
                        ✓ Applied
                      </span>
                    )}
                  </div>

                  {resumeIsValid ? (
                    <div className="space-y-1.5 mt-1">
                      {matchedSkills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[9px] text-brand-success font-bold mr-1 shrink-0">✓ Matched:</span>
                          {matchedSkills.slice(0, 3).map((s, si) => (
                            <span key={si} className="text-[8px] bg-brand-success/10 border border-brand-success/20 px-1.5 py-0.5 rounded text-brand-success font-medium">{s}</span>
                          ))}
                          {matchedSkills.length > 3 && (
                            <span className="text-[8px] text-brand-textSecondary font-medium">+{matchedSkills.length - 3}</span>
                          )}
                        </div>
                      )}
                      {missingSkills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[9px] text-brand-accent font-bold mr-1 shrink-0">✗ Missing:</span>
                          {missingSkills.slice(0, 3).map((s, si) => (
                            <span key={si} className="text-[8px] bg-brand-accent/10 border border-brand-accent/20 px-1.5 py-0.5 rounded text-brand-accent font-medium">{s}</span>
                          ))}
                          {missingSkills.length > 3 && (
                            <span className="text-[8px] text-brand-textSecondary font-medium">+{missingSkills.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {job.skills_required.slice(0, 3).map((s, si) => (
                        <span key={si} className="text-[9px] bg-brand-bg border border-brand-border/60 px-1.5 py-0.5 rounded text-brand-textSecondary font-semibold">{s}</span>
                      ))}
                      {job.skills_required.length > 3 && (
                        <span className="text-[9px] text-brand-textSecondary">+{job.skills_required.length - 3} more</span>
                      )}
                    </div>
                  )}

                  {resumeIsValid && missingSkills.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-brand-border/40 space-y-1">
                      <span className="text-[9px] font-extrabold text-brand-primary uppercase tracking-wider block">🤖 AI Skill Gap Advice:</span>
                      <p className="text-[9px] text-brand-textSecondary leading-normal">
                        Learn <span className="font-semibold text-brand-textPrimary">{missingSkills.slice(0, 2).join(' & ')}</span> to boost your match score by <span className="text-brand-success font-bold">+{Math.round((missingSkills.slice(0, 2).length / job.skills_required.length) * 50)}%</span>.
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-2 border-t border-brand-border/40">
                    {applied ? (
                      <Link to="/applications" className="text-xs font-semibold text-brand-textSecondary hover:text-brand-primary transition-colors">
                        View Application →
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleOpenApplyModal(job)}
                        className="text-xs font-bold text-brand-primary hover:text-white hover:bg-brand-primary px-3 py-1.5 rounded-lg border border-brand-primary/30 hover:border-brand-primary transition-all"
                      >
                        Apply Now →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Resume Status + Recent Applications ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Resume Status */}
        <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-brand-textPrimary text-sm flex items-center gap-2">
            <span>📄</span> Resume Status
          </h3>
          {!hasResume ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-brand-danger">
                <XCircle className="w-4 h-4" />
                <span className="text-xs font-bold">No Active CV Uploaded</span>
              </div>
              <p className="text-xs text-brand-textSecondary">Upload a resume to apply for jobs and unlock AI scoring.</p>
              <button onClick={() => navigate('/resumes')} className="bg-brand-danger/10 border border-brand-danger/20 hover:bg-brand-danger/20 text-brand-danger text-xs font-bold px-3 py-1.5 rounded-xl transition-all">
                Upload Resume
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-brand-success">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs font-bold truncate max-w-[200px]">{resumes[0].filename}</span>
                </div>
                <span className="text-[10px] text-brand-textSecondary">{new Date(resumes[0].parsed_at).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-brand-textSecondary">Resume indexed &amp; AI features fully unlocked.</p>
              <div className="flex gap-2">
                <button onClick={() => setPreviewResume(resumes[0])} className="bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/25 text-brand-primary text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Preview PDF
                </button>
                <button onClick={() => navigate('/resumes')} className="bg-brand-panel border border-brand-border hover:border-white text-brand-textSecondary hover:text-brand-textPrimary text-xs font-semibold px-3 py-1.5 rounded-xl transition-all">
                  Replace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Applications */}
        <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-brand-textPrimary text-sm flex items-center gap-2">
              <span>📋</span> Recent Applications
            </h3>
            <Link to="/applications" className="text-xs text-brand-primary hover:underline font-semibold">View All</Link>
          </div>
          {applications.length === 0 ? (
            <div className="text-center py-6 text-brand-textSecondary text-xs">
              No applications yet.{' '}
              <Link to="/jobs" className="text-brand-primary font-semibold hover:underline">Browse jobs →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.slice(0, 3).map(app => (
                <div key={app.id} className="bg-brand-bg/40 border border-brand-border/50 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-brand-primary/30 transition-all">
                  <div className="min-w-0">
                    <h4 className="font-bold text-brand-textPrimary text-xs truncate">{app.job_title}</h4>
                    <span className="text-[10px] text-brand-textSecondary">{new Date(app.applied_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusBadge(app.status)}
                    <Link
                      to="/tracking"
                      onClick={() => setTrackingAppId(app.id.toString())}
                      className="text-xs bg-brand-panel hover:bg-brand-panelLight border border-brand-border text-brand-textSecondary hover:text-brand-textPrimary px-2 py-1 rounded-lg transition-all"
                    >
                      Track
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
