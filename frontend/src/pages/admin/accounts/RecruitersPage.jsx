import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../../../services/api';
import {
  Search,
  Check,
  X,
  Eye,
  CheckCircle,
  Clock,
  Briefcase,
  Mail,
  Calendar,
  Building,
  UserCheck,
  AlertCircle,
  Users,
  Phone,
  Globe,
  MapPin,
  Trash2
} from 'lucide-react';

export default function RecruitersPage({ users = [], jobs = [], onRefresh }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSubTab, setActiveSubTab] = useState(location.state?.filter === 'pending' ? 'pending' : 'approved'); // 'pending' | 'approved'
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // stores user.id currently processing
  
  React.useEffect(() => {
    if (location.state?.filter) {
      setActiveSubTab(location.state.filter === 'pending' ? 'pending' : 'approved');
    }
  }, [location.state?.filter]);

  // Filter recruiters
  const recruiters = users.filter(u => u.role === 'recruiter');

  // Compute stats correctly from jobs array
  const computedRecruiters = useMemo(() => {
    return recruiters.map(r => {
      const rJobs = jobs.filter(j => j.recruiter_id === r.id);
      return {
        ...r,
        active_jobs: rJobs.filter(j => j.status === 'open').length,
        total_jobs: rJobs.length,
        applications_received: rJobs.reduce((acc, j) => acc + (j.applications_count || 0), 0)
      };
    });
  }, [recruiters, jobs]);

  // Pending: approval_status is 'pending' or (approval_status is null/empty and email_verified is true)
  const pendingRecruiters = computedRecruiters.filter(r => 
    r.approval_status === 'pending' || 
    (!r.approval_status && r.email_verified)
  );

  // Approved: approval_status is 'approved'
  const approvedRecruiters = computedRecruiters.filter(r => r.approval_status === 'approved');

  // Apply search filtering on approved recruiters
  const filteredApproved = approvedRecruiters.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name) => {
    if (!name) return 'R';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleApprove = async (recruiter) => {
    setActionLoading(recruiter.id);
    try {
      await API.put(`/admin/users/${recruiter.id}/approve`);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Error approving recruiter:', err);
      alert('Failed to approve recruiter. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (recruiter) => {
    if (!window.confirm(`Are you sure you want to REJECT the recruiter application for ${recruiter.name}?`)) {
      return;
    }
    setActionLoading(recruiter.id);
    try {
      await API.put(`/admin/users/${recruiter.id}/reject`);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Error rejecting recruiter:', err);
      alert('Failed to reject recruiter.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (recruiter) => {
    if (recruiter.active_jobs > 0) {
      if (!window.confirm(`WARNING: ${recruiter.name} has ${recruiter.active_jobs} active jobs. Deleting this account may disrupt ongoing recruitment. Are you absolutely sure you want to proceed?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete the recruiter account for ${recruiter.name}? This action cannot be undone.`)) {
        return;
      }
    }

    setActionLoading(recruiter.id);
    try {
      await API.delete(`/admin/users/${recruiter.id}`);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Error deleting recruiter:', err);
      alert('Failed to delete recruiter.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">Recruiter Management</h1>
          <p className="text-brand-textSecondary text-sm mt-1">
            Approve new recruiter requests or view active recruiter accounts and job statistics.
          </p>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex bg-brand-panelLight/40 p-1.5 rounded-xl border border-brand-border/60 self-start sm:self-center">
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'pending'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-brand-textSecondary hover:text-brand-textPrimary'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Approvals ({pendingRecruiters.length})
          </button>
          <button
            onClick={() => setActiveSubTab('approved')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'approved'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-brand-textSecondary hover:text-brand-textPrimary'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Approved Recruiters ({approvedRecruiters.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'pending' ? (
        /* PENDING APPROVALS TAB */
        pendingRecruiters.length === 0 ? (
          <div className="glass-panel border border-brand-border/60 rounded-3xl p-12 text-center max-w-lg mx-auto mt-6">
            <div className="w-16 h-16 bg-brand-success/15 border border-brand-success/30 text-brand-success rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-brand-textPrimary">All Caught Up!</h3>
            <p className="text-brand-textSecondary text-xs mt-2">
              There are no pending recruiter approvals at this time. All recruiters have been reviewed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingRecruiters.map((recruiter) => (
              <motion.div
                key={recruiter.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel border border-brand-border/60 rounded-2xl p-5 flex flex-col justify-between shadow-panel card-interactive"
              >
                <div className="space-y-4">
                  {/* Recruiter Identity Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-panelLight border border-brand-border flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src={recruiter.company_logo_path ? `${API.defaults.baseURL.endsWith('/api') ? API.defaults.baseURL.slice(0, -4) : API.defaults.baseURL}/api/recruiter/logo/${recruiter.id}?t=${encodeURIComponent(recruiter.company_logo_path)}` : ''}
                        alt={recruiter.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentNode.innerHTML = `<span class="text-sm font-bold text-brand-primary">${getInitials(recruiter.company || recruiter.name)}</span>`;
                        }}
                      />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-brand-textPrimary text-sm truncate">{recruiter.name}</h4>
                      <div className="flex items-center gap-1 text-[10px] text-brand-textSecondary">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>Joined: {new Date(recruiter.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recruiter Details Summary */}
                  <div className="space-y-2 text-xs border-y border-brand-border/40 py-3">
                    <div className="flex items-center gap-2 text-brand-textSecondary">
                      <Mail className="w-3.5 h-3.5 shrink-0 text-brand-primary" />
                      <span className="truncate">{recruiter.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-brand-textSecondary">
                      <Building className="w-3.5 h-3.5 shrink-0 text-brand-secondary" />
                      <span>Company: {recruiter.company_name || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-1">
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => handleApprove(recruiter)}
                    className="flex-1 py-2 px-3 bg-brand-success text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:bg-brand-success/90 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {actionLoading === recruiter.id ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </>
                    )}
                  </button>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => handleReject(recruiter)}
                    className="flex-1 py-2 px-3 bg-brand-danger text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:bg-brand-danger/90 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    onClick={() => navigate(`/jobs-monitoring/recruiters/${recruiter.id}`)}
                    className="p-2 border border-brand-border bg-brand-panelLight text-brand-textPrimary rounded-xl transition-colors hover:bg-brand-panelLight/80"
                    title="View Jobs & Analytics"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(recruiter)}
                    className="p-2 border border-brand-danger/30 bg-brand-danger/5 text-brand-danger rounded-xl transition-colors hover:bg-brand-danger hover:text-white"
                    title="Delete Recruiter"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        /* APPROVED RECRUITERS TAB */
        <div className="glass-panel border border-brand-border/60 rounded-3xl p-6 shadow-panel space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-textSecondary">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search recruiters by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-brand-panelLight border border-brand-border/80 focus:border-brand-primary text-brand-textPrimary placeholder:text-brand-textSecondary outline-none transition-colors"
              />
            </div>
            <span className="text-[10px] font-bold text-brand-textSecondary">
              Showing {filteredApproved.length} of {approvedRecruiters.length} Approved
            </span>
          </div>

          {/* Desktop Table Representation */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-brand-border/40">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-panelLight/40 border-b border-brand-border/60 text-xs font-semibold text-brand-textSecondary uppercase tracking-wider">
                  <th className="py-4 px-6">Recruiter Info</th>
                  <th className="py-4 px-6">Company Info</th>
                  <th className="py-4 px-6 text-center">Job Postings</th>
                  <th className="py-4 px-6 text-center">Apps Received</th>
                  <th className="py-4 px-6">Joined Date</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40 text-sm">
                {filteredApproved.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-brand-textSecondary text-xs">
                      No approved recruiters found matching search parameters.
                    </td>
                  </tr>
                ) : (
                  filteredApproved.map((recruiter) => (
                    <tr key={recruiter.id} className="hover:bg-brand-panelLight/20 transition-all duration-200">
                      <td className="py-4 px-6 font-semibold text-brand-textPrimary">
                        <div className="flex items-center gap-3">
                          {/* Recruiter Avatar */}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-primary/10 to-brand-secondary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary text-sm font-bold shrink-0 shadow-sm overflow-hidden">
                            {recruiter.company_logo_path ? (
                              <img
                                src={`${API.defaults.baseURL.endsWith('/api') ? API.defaults.baseURL.slice(0, -4) : API.defaults.baseURL}/api/recruiter/logo/${recruiter.id}?t=${encodeURIComponent(recruiter.company_logo_path)}`}
                                alt={recruiter.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentNode.innerHTML = `<span class="text-xs font-bold text-brand-primary">${getInitials(recruiter.name)}</span>`;
                                }}
                              />
                            ) : (
                              <span className="text-xs font-bold text-brand-primary">{getInitials(recruiter.name)}</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-brand-textPrimary font-bold text-sm tracking-tight">{recruiter.name}</span>
                            <span className="text-brand-textSecondary text-[10px] font-medium flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-brand-primary/60 shrink-0" />
                              {recruiter.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-600 text-xs font-bold">
                            🏢
                          </div>
                          <div className="flex flex-col">
                            <span className="text-brand-textPrimary font-semibold text-xs tracking-tight">{recruiter.company_name || recruiter.company || 'Independent Recruiter'}</span>
                            <span className="text-[9px] text-brand-textSecondary uppercase font-bold tracking-wider mt-0.5">
                              {recruiter.company_details?.industry || 'Enterprise'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-brand-success font-bold text-sm">{recruiter.active_jobs ?? 0}</span>
                          <span className="text-[9px] text-brand-textSecondary font-semibold mt-0.5">Active</span>
                        </div>
                        <span className="text-brand-border/80 mx-2">/</span>
                        <div className="inline-flex flex-col items-center">
                          <span className="text-brand-textPrimary font-bold text-sm">{recruiter.total_jobs ?? 0}</span>
                          <span className="text-[9px] text-brand-textSecondary font-semibold mt-0.5">Total</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex bg-brand-accent/10 border border-brand-accent/20 px-3 py-1 rounded-xl items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                          <span className="font-bold text-brand-accent text-sm">{recruiter.applications_received ?? 0}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-brand-textSecondary text-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold text-brand-textPrimary">{new Date(recruiter.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span className="text-[9px] text-brand-textSecondary mt-0.5">Joined</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {recruiter.email_verified && recruiter.approval_status === 'approved' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-success/15 text-brand-success border border-brand-success/25">
                            Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-border text-brand-textSecondary border border-brand-border">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/jobs-monitoring/recruiters/${recruiter.id}`)}
                            className="p-2 text-brand-textSecondary hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all duration-200"
                            title="View Jobs & Analytics"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(recruiter)}
                            className="p-2 text-brand-textSecondary hover:text-brand-danger hover:bg-brand-danger/10 rounded-xl transition-all duration-200"
                            title="Delete Recruiter"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards Representation */}
          <div className="md:hidden space-y-4">
            {filteredApproved.length === 0 ? (
              <div className="py-12 text-center text-brand-textSecondary text-xs border border-brand-border/40 rounded-xl">
                No approved recruiters found matching search parameters.
              </div>
            ) : (
              filteredApproved.map((recruiter) => (
                <div key={recruiter.id} className="bg-white border border-brand-border/60 rounded-2xl p-4 flex flex-col space-y-4 shadow-sm">
                  {/* Header: Avatar, Name, Email, Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-primary/10 to-brand-secondary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary text-sm font-bold shrink-0 shadow-sm overflow-hidden">
                        {recruiter.company_logo_path ? (
                          <img
                            src={`${API.defaults.baseURL.endsWith('/api') ? API.defaults.baseURL.slice(0, -4) : API.defaults.baseURL}/api/recruiter/logo/${recruiter.id}?t=${encodeURIComponent(recruiter.company_logo_path)}`}
                            alt={recruiter.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentNode.innerHTML = `<span class="text-xs font-bold text-brand-primary">${getInitials(recruiter.name)}</span>`;
                            }}
                          />
                        ) : (
                          <span className="text-xs font-bold text-brand-primary">{getInitials(recruiter.name)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-brand-textPrimary truncate">{recruiter.name}</h4>
                        <p className="text-[10px] text-brand-textSecondary truncate">{recruiter.email}</p>
                      </div>
                    </div>
                    {recruiter.email_verified && recruiter.approval_status === 'approved' ? (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-brand-success/15 text-brand-success border border-brand-success/25">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-brand-border text-brand-textSecondary border border-brand-border">
                        Inactive
                      </span>
                    )}
                  </div>
                  
                  {/* Company Info */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-600 text-xs font-bold">
                      🏢
                    </div>
                    <div className="flex flex-col">
                      <span className="text-brand-textPrimary font-semibold text-xs tracking-tight">{recruiter.company_name || recruiter.company || 'Independent Recruiter'}</span>
                      <span className="text-[9px] text-brand-textSecondary uppercase font-bold tracking-wider mt-0.5">
                        {recruiter.company_details?.industry || 'Enterprise'}
                      </span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs border-y border-brand-border/40 py-3">
                    <div>
                      <span className="block text-brand-textSecondary mb-1 font-semibold">Jobs (Active / Total)</span>
                      <span className="font-bold text-brand-success">{recruiter.active_jobs ?? 0}</span>
                      <span className="text-brand-border/80 mx-1">/</span>
                      <span className="font-bold text-brand-textPrimary">{recruiter.total_jobs ?? 0}</span>
                    </div>
                    <div>
                      <span className="block text-brand-textSecondary mb-1 font-semibold">Apps Received</span>
                      <span className="font-bold text-brand-accent">{recruiter.applications_received ?? 0}</span>
                    </div>
                  </div>
                  
                  {/* Actions & Join Date */}
                  <div className="flex items-center justify-between text-[10px] text-brand-textSecondary">
                    <span>Joined: {new Date(recruiter.created_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/jobs-monitoring/recruiters/${recruiter.id}`)}
                        className="p-1.5 text-brand-textSecondary hover:text-brand-primary bg-brand-panelLight rounded-lg transition-colors"
                        title="View Jobs & Analytics"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(recruiter)}
                        className="p-1.5 text-brand-textSecondary hover:text-brand-danger bg-brand-panelLight rounded-lg transition-colors"
                        title="Delete Recruiter"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
