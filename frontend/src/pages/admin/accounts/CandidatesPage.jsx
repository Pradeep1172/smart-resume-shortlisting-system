import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../../../services/api';
import {
  Search,
  Eye,
  Trash2,
  Calendar,
  Mail,
  Clock,
  FileText,
  Briefcase,
  TrendingUp,
  X,
  UserCheck,
  Tag,
  AlertCircle
} from 'lucide-react';

export default function CandidatesPage({ users = [], onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [resumeFilter, setResumeFilter] = useState('any'); // 'any' | 'atleast1' | 'twoPlus'
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [candidateDetails, setCandidateDetails] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // ID of user being deleted

  const location = useLocation();
  const candidateStatusFilter = location.state?.filter || 'all';
  const [appsData, setAppsData] = useState(null);
  
  useEffect(() => {
    if ((candidateStatusFilter === 'shortlisted' || candidateStatusFilter === 'hired') && !appsData) {
      API.get('/admin/export/applications').then(res => {
        setAppsData(res.data || []);
      }).catch(console.error);
    }
  }, [candidateStatusFilter, appsData]);

  // Filter candidates
  const candidates = users.filter(u => u.role === 'candidate');

  // Filter by search term and resume counts
  const filteredCandidates = candidates.filter(cand => {
    const matchesSearch = 
      cand.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cand.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const resumesCount = cand.resumes_count ?? 0;
    let matchesResume = true;
    if (resumeFilter === 'atleast1') {
      matchesResume = resumesCount >= 1;
    } else if (resumeFilter === 'twoPlus') {
      matchesResume = resumesCount >= 2;
    }

    let matchesAppStatus = true;
    if (candidateStatusFilter === 'shortlisted' || candidateStatusFilter === 'hired') {
      if (!appsData) {
        matchesAppStatus = false;
      } else {
        matchesAppStatus = appsData.some(app => 
          app.candidate_email === cand.email && app.status === candidateStatusFilter
        );
      }
    }

    return matchesSearch && matchesResume && matchesAppStatus;
  });

  const getInitials = (name) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleViewDetails = async (candidate) => {
    setSelectedCandidate(candidate);
    setDetailsLoading(true);
    setCandidateDetails(null);
    try {
      const res = await API.get(`/admin/candidates/${candidate.id}/details`);
      setCandidateDetails(res.data);
    } catch (err) {
      console.error('Error fetching candidate details:', err);
      alert('Could not retrieve candidate profile details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDelete = async (candidate) => {
    if (!window.confirm(`WARNING: Are you sure you want to permanently delete the candidate account for ${candidate.name}? This will delete all their resumes and job applications. This action cannot be undone.`)) {
      return;
    }
    setActionLoading(candidate.id);
    try {
      await API.delete(`/admin/users/${candidate.id}`);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Error deleting candidate:', err);
      alert('Failed to delete candidate account.');
    } finally {
      setActionLoading(null);
    }
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

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-brand-success';
    if (score >= 40) return 'text-brand-warning';
    return 'text-brand-danger';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">Candidate Directory</h1>
        <p className="text-brand-textSecondary text-sm mt-1">
          Monitor candidate profiles, resume parsed history, and active application statuses.
        </p>
      </div>

      {/* Filters and Controls */}
      <div className="glass-panel border border-brand-border/60 rounded-3xl p-6 shadow-panel space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Search and Resume Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-textSecondary">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search candidates by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-brand-panelLight border border-brand-border/80 focus:border-brand-primary text-brand-textPrimary placeholder:text-brand-textSecondary outline-none transition-colors"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider whitespace-nowrap">Resumes:</span>
              <select
                value={resumeFilter}
                onChange={(e) => setResumeFilter(e.target.value)}
                className="py-2 pl-3 pr-8 text-xs rounded-xl bg-brand-panelLight border border-brand-border/80 text-brand-textPrimary focus:border-brand-primary outline-none transition-colors cursor-pointer"
              >
                <option value="any">Any Amount</option>
                <option value="atleast1">At least 1</option>
                <option value="twoPlus">2 or more</option>
              </select>
            </div>
          </div>

          {/* Right: Counter */}
          <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider self-end md:self-center">
            Showing {filteredCandidates.length} of {candidates.length} Candidates
          </span>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto rounded-xl border border-brand-border/40">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-panelLight/40 border-b border-brand-border/60 text-xs font-semibold text-brand-textSecondary uppercase tracking-wider">
                <th className="py-4 px-6">Candidate</th>
                <th className="py-4 px-6">Email Address</th>
                <th className="py-4 px-6 text-center">Resume Status</th>
                <th className="py-4 px-6 text-center">Applications Sent</th>
                <th className="py-4 px-6">Joined Date</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40 text-sm">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-brand-textSecondary text-xs">
                    No candidates found matching the search criteria.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-brand-panelLight/20 transition-colors">
                    <td className="py-4 px-6 font-semibold text-brand-textPrimary flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-xs font-bold text-brand-primary shrink-0">
                        {getInitials(candidate.name)}
                      </div>
                      <span className="truncate max-w-[150px]">{candidate.name}</span>
                    </td>
                    <td className="py-4 px-6 text-brand-textSecondary text-xs truncate max-w-[200px]">{candidate.email}</td>
                    <td className="py-4 px-6 text-center">
                      {(candidate.resumes_count ?? 0) > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-success/15 text-brand-success border border-brand-success/25">
                          Uploaded ({candidate.resumes_count})
                        </span>
                      ) : (
                        <span className="text-xs text-brand-textSecondary/60 italic font-medium">
                          Not Uploaded
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-brand-secondary text-xs">
                      {candidate.applications_sent ?? 0}
                    </td>
                    <td className="py-4 px-6 text-brand-textSecondary text-xs">
                      {new Date(candidate.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right space-x-1">
                      <button
                        onClick={() => handleViewDetails(candidate)}
                        className="p-1.5 text-brand-textSecondary hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors inline-block"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        disabled={actionLoading === candidate.id}
                        onClick={() => handleDelete(candidate)}
                        className="p-1.5 text-brand-textSecondary hover:text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors inline-block"
                        title="Delete Candidate"
                      >
                        {actionLoading === candidate.id ? (
                          <span className="w-4 h-4 border-2 border-brand-danger/30 border-t-brand-danger rounded-full animate-spin block"></span>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
              {/* Modal Header */}
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

              {/* Scrollable details wrapper */}
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

                              {/* Skills Tags */}
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
                        <div className="overflow-x-auto border border-brand-border/40 rounded-xl">
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
                                    <span className={getScoreColor(app.match_score)}>
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

              {/* Modal Footer */}
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
