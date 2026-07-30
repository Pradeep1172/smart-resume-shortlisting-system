import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API from '../../../services/api';
import {
  X,
  Briefcase,
  User,
  Mail,
  Calendar,
  MapPin,
  TrendingUp,
  Award,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Bookmark,
  ChevronRight,
  TrendingDown
} from 'lucide-react';

export default function JobDetailModal({ jobId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobData, setJobData] = useState(null);

  useEffect(() => {
    if (!jobId) return;

    const fetchJobDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await API.get(`/admin/jobs/${jobId}/details`);
        setJobData(res.data);
      } catch (err) {
        console.error('Error fetching job details:', err);
        setError('Failed to retrieve job details and application pipeline.');
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [jobId]);

  if (!jobId) return null;

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

  const getScoreColor = (score) => {
    if (score >= 70) return 'bg-brand-success';
    if (score >= 40) return 'bg-brand-warning';
    return 'bg-brand-danger';
  };

  const getScoreTextColor = (score) => {
    if (score >= 70) return 'text-brand-success';
    if (score >= 40) return 'text-brand-warning';
    return 'text-brand-danger';
  };

  return (
    <div className="fixed inset-0 bg-brand-bg/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel border border-brand-border/60 bg-brand-panel rounded-3xl p-6 w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-brand-textSecondary hover:text-brand-textPrimary hover:bg-brand-panelLight/40 rounded-xl transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title Header */}
        <h3 className="text-lg font-extrabold text-brand-textPrimary border-b border-brand-border/40 pb-3 flex items-center gap-2 shrink-0">
          <Briefcase className="w-5 h-5 text-brand-primary" />
          Job details & Application Analytics
        </h3>

        {/* Content Area */}
        <div className="mt-4 overflow-y-auto pr-1 space-y-6 flex-1 scrollbar-thin">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-brand-textSecondary text-xs">
              <span className="w-8 h-8 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-3"></span>
              <span>Retrieving job profile and metrics...</span>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-brand-textSecondary text-xs">
              <XCircle className="w-8 h-8 mx-auto mb-2 text-brand-danger opacity-60" />
              <span>{error}</span>
            </div>
          ) : jobData ? (
            <>
              {/* 1. Job & Recruiter Information Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Job Info */}
                <div className="md:col-span-2 space-y-3 bg-brand-panelLight/15 border border-brand-border/30 p-5 rounded-2xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-extrabold text-brand-textPrimary">{jobData.title}</h4>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-brand-textSecondary mt-1 font-semibold">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                          {jobData.location || 'Remote'}
                        </span>
                        <span>•</span>
                        <span>{jobData.experience_required} Years Exp Req</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      jobData.status === 'open'
                        ? 'bg-brand-success/15 text-brand-success border border-brand-success/25'
                        : 'bg-brand-border text-brand-textSecondary border border-brand-border'
                    }`}>
                      {jobData.status}
                    </span>
                  </div>

                  <div className="text-xs text-brand-textSecondary leading-relaxed">
                    <p className="line-clamp-4">{jobData.description}</p>
                  </div>

                  {jobData.skills_required && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider">Required Skills:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(typeof jobData.skills_required === 'string' ? JSON.parse(jobData.skills_required) : jobData.skills_required).map((skill, sIdx) => (
                          <span key={sIdx} className="bg-brand-panelLight/80 text-brand-textPrimary border border-brand-border/40 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recruiter Info */}
                <div className="bg-brand-panelLight/15 border border-brand-border/30 p-5 rounded-2xl flex flex-col justify-between">
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider border-b border-brand-border/30 pb-1.5">
                      Recruiter Account
                    </h5>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-secondary/15 border border-brand-secondary/30 flex items-center justify-center text-brand-secondary font-bold text-sm shrink-0">
                        {jobData.recruiter_name ? jobData.recruiter_name[0].toUpperCase() : 'R'}
                      </div>
                      <div className="overflow-hidden">
                        <strong className="block text-xs font-bold text-brand-textPrimary truncate">{jobData.recruiter_name || 'System Recruiter'}</strong>
                        <span className="text-[10px] text-brand-textSecondary truncate block mt-0.5 font-semibold">🏢 {jobData.company_name || 'Independent'}</span>
                        <span className="text-[10px] text-brand-textSecondary/80 truncate block mt-0.5">{jobData.recruiter_email || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-brand-textSecondary font-semibold space-y-1 mt-4">
                    <div className="flex justify-between">
                      <span>Posted Date:</span>
                      <span className="text-brand-textPrimary">{new Date(jobData.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Min Match Threshold:</span>
                      <span className="text-brand-textPrimary">{jobData.min_match_score}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Application Pipeline Stat Cards */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-brand-textPrimary flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-primary" />
                  Application Pipeline Summary
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
                  {[
                    { label: 'Total', value: jobData.pipeline_counts?.total ?? 0, color: 'text-brand-textPrimary', bg: 'bg-brand-panelLight/40', border: 'border-brand-border/40' },
                    { label: 'Pending', value: jobData.pipeline_counts?.pending ?? 0, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
                    { label: 'Evaluated', value: jobData.pipeline_counts?.evaluated ?? 0, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'Shortlisted', value: jobData.pipeline_counts?.shortlisted ?? 0, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                    { label: 'Interview', value: jobData.pipeline_counts?.interview ?? 0, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                    { label: 'Selected', value: jobData.pipeline_counts?.selected ?? 0, color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
                    { label: 'Hired', value: jobData.pipeline_counts?.hired ?? 0, color: 'text-brand-success', bg: 'bg-brand-success/10', border: 'border-brand-success/20' },
                    { label: 'Rejected', value: jobData.pipeline_counts?.rejected ?? 0, color: 'text-brand-danger', bg: 'bg-brand-danger/10', border: 'border-brand-danger/20' }
                  ].map((p, pIdx) => (
                    <div key={pIdx} className={`p-3 rounded-xl border ${p.border} ${p.bg} text-center flex flex-col justify-center`}>
                      <span className="text-[9px] font-bold text-brand-textSecondary uppercase tracking-wider block">{p.label}</span>
                      <strong className={`text-base font-extrabold block mt-1 ${p.color}`}>{p.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Hiring Pipeline Visualization & 5. AI Evaluation Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Funnel chart */}
                <div className="glass-panel border border-brand-border/60 rounded-2xl p-5 space-y-4 shadow-panel">
                  <h5 className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider border-b border-brand-border/40 pb-2">
                    Hiring Stage Funnel
                  </h5>
                  <div className="space-y-2.5 pt-1">
                    {[
                      { label: 'Applied', count: jobData.pipeline_counts?.total ?? 0, color: 'bg-blue-500' },
                      { label: 'Evaluated', count: jobData.pipeline_counts?.evaluated ?? 0, color: 'bg-emerald-500' },
                      { label: 'Shortlisted', count: jobData.pipeline_counts?.shortlisted ?? 0, color: 'bg-purple-500' },
                      { label: 'Interview', count: jobData.pipeline_counts?.interview ?? 0, color: 'bg-amber-500' },
                      { label: 'Hired', count: jobData.pipeline_counts?.hired ?? 0, color: 'bg-brand-success' }
                    ].map((step, idx) => {
                      const maxCount = Math.max(jobData.pipeline_counts?.total ?? 1, 1);
                      const baseWidth = 100 - idx * 12;
                      const countRatio = step.count / maxCount;
                      const widthPct = Math.max(20, Math.round(baseWidth * (0.3 + 0.7 * countRatio)));

                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="w-16 text-[10px] font-bold text-brand-textSecondary text-right">{step.label}</span>
                          <div className="flex-1 flex justify-start">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${widthPct}%` }}
                              transition={{ duration: 0.7 }}
                              className={`h-6.5 ${step.color} rounded-lg flex items-center justify-between px-3 text-[9px] font-bold text-white shadow-sm border border-white/5`}
                            >
                              <span>{step.label}</span>
                              <span>{step.count}</span>
                            </motion.div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Stats */}
                <div className="glass-panel border border-brand-border/60 rounded-2xl p-5 space-y-4 shadow-panel flex flex-col justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider border-b border-brand-border/40 pb-2">
                      AI Match Performance
                    </h5>
                    <div className="flex items-center gap-4 py-2">
                      <div className="text-center p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl min-w-[90px]">
                        <span className="text-[8px] font-bold text-brand-textSecondary uppercase">Avg Score</span>
                        <strong className="block text-xl font-extrabold text-brand-primary mt-0.5">
                          {jobData.ai_stats?.avg_score ?? 0.0}%
                        </strong>
                      </div>
                      <p className="text-[11px] text-brand-textSecondary font-semibold leading-relaxed">
                        Platform average matching score across all processed applications for this job posting. Threshold set to <strong className="text-brand-textPrimary">{jobData.min_match_score}%</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Range distribution */}
                  <div className="space-y-1.5 mt-2">
                    <span className="text-[9px] font-bold text-brand-textSecondary uppercase tracking-wider">Score Range Distribution:</span>
                    <div className="space-y-1.5">
                      {[
                        { label: '80-100% (High)', count: jobData.ai_stats?.score_distribution?.['80-100'] ?? 0, color: 'bg-brand-success' },
                        { label: '60-80% (Med-High)', count: jobData.ai_stats?.score_distribution?.['60-80'] ?? 0, color: 'bg-brand-secondary' },
                        { label: '40-60% (Medium)', count: jobData.ai_stats?.score_distribution?.['40-60'] ?? 0, color: 'bg-brand-warning' },
                        { label: '20-40% (Low-Med)', count: jobData.ai_stats?.score_distribution?.['20-40'] ?? 0, color: 'bg-orange-500' },
                        { label: '0-20% (Low)', count: jobData.ai_stats?.score_distribution?.['0-20'] ?? 0, color: 'bg-brand-danger' }
                      ].map((range, idx) => {
                        const totalDist = Object.values(jobData.ai_stats?.score_distribution || {}).reduce((a, b) => a + b, 0) || 1;
                        const widthPct = Math.max(2, Math.round((range.count / totalDist) * 100));

                        return (
                          <div key={idx} className="flex items-center text-[10px] gap-2">
                            <span className="w-28 text-brand-textSecondary font-medium truncate">{range.label}</span>
                            <div className="flex-1 h-2 bg-brand-panelLight border border-brand-border/20 rounded-full overflow-hidden">
                              <div className={`h-full ${range.color}`} style={{ width: `${widthPct}%` }} />
                            </div>
                            <span className="w-5 font-bold text-brand-textPrimary text-right">{range.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Recent Applications (last 10) */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-brand-textPrimary flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-accent" />
                  Recent Applications (Last 10)
                </h4>
                {(!jobData.recent_applications || jobData.recent_applications.length === 0) ? (
                  <p className="text-xs text-brand-textSecondary italic bg-brand-panelLight/10 border border-brand-border/25 p-4 rounded-xl">
                    No applications submitted for this vacancy yet.
                  </p>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto border border-brand-border/40 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-brand-panelLight/40 border-b border-brand-border/60 font-semibold text-brand-textSecondary uppercase">
                            <th className="py-3 px-4">Candidate Name</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4 text-center">AI Match Score</th>
                            <th className="py-3 px-4">Applied Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/40">
                          {jobData.recent_applications.map((app, aIdx) => (
                            <tr key={app.id || aIdx} className="hover:bg-brand-panelLight/20">
                              <td className="py-3 px-4 font-bold text-brand-textPrimary">
                                {app.candidate_name}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusColor(app.status)}`}>
                                  {app.status?.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {app.match_score !== null ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-12 h-1.5 bg-brand-panelLight rounded-full overflow-hidden border border-brand-border/30">
                                      <div className={`h-full ${getScoreColor(app.match_score)}`} style={{ width: `${app.match_score}%` }} />
                                    </div>
                                    <strong className={`font-bold text-xs ${getScoreTextColor(app.match_score)}`}>{app.match_score}%</strong>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-brand-textSecondary/60 italic font-semibold">Unevaluated</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-brand-textSecondary font-semibold">
                                {app.applied_at ? new Date(app.applied_at).toLocaleString() : 'Unknown'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="md:hidden space-y-3">
                      {jobData.recent_applications.map((app, aIdx) => (
                        <div key={app.id || aIdx} className="bg-brand-panelLight/15 border border-brand-border/40 p-4 rounded-xl space-y-3">
                          <div className="flex items-start justify-between">
                            <h5 className="font-bold text-brand-textPrimary text-xs">{app.candidate_name}</h5>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusColor(app.status)}`}>
                              {app.status?.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <div>
                              <span className="block font-bold text-brand-textSecondary uppercase">AI Match Score</span>
                              {app.match_score !== null ? (
                                <strong className={`font-bold ${getScoreTextColor(app.match_score)}`}>{app.match_score}%</strong>
                              ) : (
                                <span className="italic text-brand-textSecondary/60">Unevaluated</span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="block font-bold text-brand-textSecondary uppercase">Applied Date</span>
                              <span className="text-brand-textSecondary font-semibold">
                                {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'Unknown'}
                              </span>
                            </div>
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
              <span>No details found.</span>
            </div>
          )}
        </div>

        {/* Modal Footer Close Button */}
        <div className="border-t border-brand-border/40 pt-4 mt-4 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-brand-panelLight text-brand-textPrimary border border-brand-border rounded-xl text-xs font-bold hover:bg-brand-panelLight/80 transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
