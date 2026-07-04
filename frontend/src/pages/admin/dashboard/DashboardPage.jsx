import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Briefcase,
  FileText,
  Clock,
  TrendingUp,
  CheckCircle,
  Award,
  Activity,
  UserCheck,
  ChevronRight
} from 'lucide-react';

export default function DashboardPage({ metrics = {}, users = [], jobs = [], logs = [], sysConfig = {}, analyticsData = {}, setActiveTab }) {
  const navigate = useNavigate();

  // Applications status chart data
  const appStatusCounts = metrics.applications_by_status || analyticsData.applications_by_status || {};
  const appStatusColors = {
    applied: '#3B82F6', // Blue
    pending_evaluation: '#6B7280', // Gray
    evaluated: '#10B981', // Green
    shortlisted: '#8B5CF6', // Purple
    interview: '#F59E0B', // Orange
    selected: '#EC4899', // Pink
    hired: '#10B981', // Darker Green
    rejected: '#EF4444', // Red
  };

  const totalAppChart = Object.values(appStatusCounts).reduce((a, b) => a + b, 0) || 1;
  const statusData = Object.entries(appStatusCounts).map(([status, val]) => ({
    label: status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: val,
    color: appStatusColors[status] || '#6B7280'
  })).filter(item => item.value > 0);

  // Donut chart calculations
  const radius = 32;
  const circ = 2 * Math.PI * radius;
  let currentDashOffset = 0;

  // Database resources chart data
  const resources = [
    { label: 'Job Postings', value: metrics.total_jobs ?? 0, max: 100, color: 'bg-brand-success' },
    { label: 'Uploaded Resumes', value: metrics.total_resumes ?? 0, max: 200, color: 'bg-brand-secondary' },
    { label: 'Submitted Applications', value: metrics.total_applications ?? 0, max: 500, color: 'bg-brand-accent' },
  ];
  const maxResourceValue = Math.max(...resources.map(r => r.value), 1);

  // Recent activities logs (slice to 10)
  const recentLogs = (analyticsData.recent_activities || logs || []).slice(0, 10);

  // Top recruiters by active jobs
  const topRecruiters = analyticsData.top_recruiters || [];

  // Helper for fallback computation from appStatusCounts
  const getStatusSum = (statuses) => {
    return statuses.reduce((sum, status) => sum + (appStatusCounts[status] ?? 0), 0);
  };

  // Hiring pipeline funnel counts — uses backend metrics for consistency, with fallback
  // The funnel shows CUMULATIVE downstream counts: each stage includes all candidates who reached that stage or beyond
  const appliedCount = metrics.total_applications ?? (Object.values(appStatusCounts).reduce((a, b) => a + b, 0));
  
  // Evaluated = everyone who passed through evaluation (all statuses except applied/pending_evaluation)
  const evaluatedCount = (() => {
    if (metrics.evaluated_count !== undefined) {
      // Sum of evaluated + shortlisted + interview + selected + hired + rejected (all scored candidates)
      return (metrics.evaluated_count ?? 0) + (metrics.shortlisted_count ?? 0) + 
             (metrics.interview_count ?? 0) + (metrics.selected_count ?? 0) + 
             (metrics.hired_count ?? 0) + (metrics.rejected_count ?? 0);
    }
    return getStatusSum(['evaluated', 'shortlisted', 'interview', 'selected', 'hired', 'rejected', 'approved']);
  })();
  
  // Shortlisted = shortlisted + interview + selected + hired (candidates who passed screening)
  const shortlistedCount = (() => {
    if (metrics.shortlisted_count !== undefined) {
      return (metrics.shortlisted_count ?? 0) + (metrics.interview_count ?? 0) + 
             (metrics.selected_count ?? 0) + (metrics.hired_count ?? 0);
    }
    return getStatusSum(['shortlisted', 'interview', 'selected', 'hired']);
  })();
  
  // Interview = interview + selected + hired
  const interviewCount = (() => {
    if (metrics.interview_count !== undefined) {
      return (metrics.interview_count ?? 0) + (metrics.selected_count ?? 0) + (metrics.hired_count ?? 0);
    }
    return getStatusSum(['interview', 'selected', 'hired']);
  })();
  
  const hiredCount = metrics.hired_count ?? getStatusSum(['hired']);

  const funnelSteps = [
    { label: 'Applied', count: appliedCount, color: 'bg-brand-primary' },
    { label: 'Evaluated', count: evaluatedCount, color: 'bg-indigo-500' },
    { label: 'Shortlisted', count: shortlistedCount, color: 'bg-brand-secondary' },
    { label: 'Interview', count: interviewCount, color: 'bg-brand-warning' },
    { label: 'Hired', count: hiredCount, color: 'bg-brand-success' },
  ];
  const maxFunnelCount = Math.max(...funnelSteps.map(f => f.count), 1);

  // Extract stats
  const stats = [
    {
      title: 'Total Recruiters',
      value: metrics.total_recruiters ?? 0,
      icon: Users,
      color: 'text-brand-secondary',
      bgColor: 'bg-brand-secondary/15',
      borderColor: 'border-brand-secondary/20',
      clickable: true,
      tab: 'recruiters',
      path: '/recruiters',
      filter: 'all'
    },
    {
      title: 'Pending Approvals',
      value: metrics.pending_approvals ?? 0,
      icon: Clock,
      color: 'text-brand-warning',
      bgColor: 'bg-brand-warning/15',
      borderColor: 'border-brand-warning/20',
      clickable: true,
      tab: 'recruiters',
      path: '/recruiters',
      filter: 'pending'
    },
    {
      title: 'Total Candidates',
      value: metrics.total_candidates ?? 0,
      icon: Users,
      color: 'text-brand-primary',
      bgColor: 'bg-brand-primary/15',
      borderColor: 'border-brand-primary/20',
      clickable: true,
      tab: 'candidates',
      path: '/candidates',
      filter: 'all'
    },
    {
      title: 'Active Jobs',
      value: metrics.active_jobs ?? 0,
      icon: Briefcase,
      color: 'text-brand-success',
      bgColor: 'bg-brand-success/15',
      borderColor: 'border-brand-success/20',
      clickable: true,
      tab: 'jobs-monitoring',
      path: '/jobs-monitoring',
      filter: 'active'
    },
    {
      title: 'Total Applications',
      value: metrics.total_applications ?? 0,
      icon: FileText,
      color: 'text-brand-accent',
      bgColor: 'bg-brand-accent/15',
      borderColor: 'border-brand-accent/20',
      clickable: true,
      tab: 'jobs-monitoring',
      path: '/jobs-monitoring',
      filter: 'all'
    },
    {
      title: 'Avg Match Score',
      value: `${metrics.average_match_score ?? 0.0}%`,
      icon: TrendingUp,
      color: 'text-brand-primary',
      bgColor: 'bg-brand-primary/15',
      borderColor: 'border-brand-primary/20',
      clickable: false,
    },
    {
      title: 'Shortlisted Resumes',
      value: shortlistedCount,
      icon: CheckCircle,
      color: 'text-brand-success',
      bgColor: 'bg-brand-success/15',
      borderColor: 'border-brand-success/20',
      clickable: true,
      tab: 'applications',
      path: '/applications',
      filter: 'shortlisted'
    },
    {
      title: 'Hired Candidates',
      value: hiredCount,
      icon: Award,
      color: 'text-brand-secondary',
      bgColor: 'bg-brand-secondary/15',
      borderColor: 'border-brand-secondary/20',
      clickable: true,
      tab: 'applications',
      path: '/applications',
      filter: 'hired'
    }
  ];

  const handleCardClick = (card) => {
    if (card.clickable) {
      navigate(card.path, { state: { filter: card.filter } });
    }
  };

  const getLogIconColor = (type) => {
    switch (type) {
      case 'user': return 'bg-blue-500';
      case 'job': return 'bg-emerald-500';
      case 'resume': return 'bg-cyan-500';
      case 'application': return 'bg-purple-500';
      default: return 'bg-brand-textSecondary';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">System Dashboard</h1>
        <p className="text-brand-textSecondary text-sm mt-1">
          Welcome to the Smart Resume Shortlisting Admin Portal. Here is your platform overview.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={idx}
              whileHover={{ y: -4, scale: 1.02 }}
              onClick={() => handleCardClick(card)}
              className={`glass-panel border ${card.borderColor} rounded-2xl p-6 flex items-center justify-between shadow-panel ${
                card.clickable ? 'cursor-pointer hover:bg-brand-panelLight/10' : ''
              }`}
            >
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-brand-textSecondary uppercase tracking-wider">
                  {card.title}
                </span>
                <h3 className="text-2xl font-extrabold text-brand-textPrimary tracking-tight">
                  {card.value}
                </h3>
              </div>
              <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center border ${card.borderColor}`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Platform Statistics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Applications by Status */}
        <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4 shadow-panel">
          <h3 className="font-bold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40">
            Applications Distribution
          </h3>
          {statusData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-brand-textSecondary text-sm">
              <FileText className="w-8 h-8 mb-2 opacity-40 animate-pulse" />
              <span>No applications data available</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg width="100%" height="100%" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="8" className="opacity-10" />
                  {statusData.map((item, idx) => {
                    const pct = item.value / totalAppChart;
                    const strokeDash = pct * circ;
                    const offset = -currentDashOffset;
                    currentDashOffset += strokeDash;
                    return (
                      <circle
                        key={idx}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke={item.color}
                        strokeWidth="8"
                        strokeDasharray={`${strokeDash} ${circ}`}
                        strokeDashoffset={offset}
                        transform="rotate(-90 50 50)"
                        className="transition-all duration-300 hover:stroke-[10px] cursor-pointer"
                      >
                        <title>{item.label}: {item.value} ({Math.round(pct * 100)}%)</title>
                      </circle>
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[9px] font-bold text-brand-textSecondary uppercase">Total</span>
                  <strong className="text-lg font-extrabold text-brand-textPrimary">
                    {metrics.total_applications ?? 0}
                  </strong>
                </div>
              </div>
              <div className="flex-1 space-y-2.5 w-full">
                {statusData.map((item, idx) => {
                  const pct = Math.round((item.value / totalAppChart) * 100);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-brand-textPrimary">{item.label}</span>
                      </div>
                      <span className="font-bold text-brand-textSecondary">{item.value} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Resource Records Map */}
        <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4 shadow-panel">
          <h3 className="font-bold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40">
            Platform Records Map
          </h3>
          <div className="space-y-5 pt-2">
            {resources.map((res, idx) => {
              const widthPct = Math.max(5, Math.round((res.value / maxResourceValue) * 100));
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-brand-textPrimary">{res.label}</span>
                    <strong className="font-bold text-brand-textSecondary">{res.value}</strong>
                  </div>
                  <div className="h-2 w-full bg-brand-panelLight rounded-full overflow-hidden border border-brand-border/30">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full ${res.color} rounded-full`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Analytics & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hiring Funnel & Top Recruiters */}
        <div className="space-y-6">
          {/* Top Recruiters */}
          <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4 shadow-panel">
            <h3 className="font-bold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40">
              Top Recruiters by Active Jobs
            </h3>
            {topRecruiters.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-brand-textSecondary text-sm">
                <UserCheck className="w-8 h-8 mb-2 opacity-40 animate-pulse" />
                <span>No recruiter active jobs data</span>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {topRecruiters.map((rec, idx) => {
                  const maxActive = Math.max(...topRecruiters.map(r => r.active_jobs), 1);
                  const widthPct = Math.max(5, Math.round((rec.active_jobs / maxActive) * 100));
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-brand-textPrimary">{rec.name}</span>
                        <span className="text-brand-textSecondary">
                          <strong>{rec.active_jobs}</strong> Active ({rec.total_applications} Apps)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-brand-panelLight rounded-full overflow-hidden border border-brand-border/20">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${widthPct}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full bg-brand-secondary rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hiring Funnel */}
          <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4 shadow-panel">
            <h3 className="font-bold text-brand-textPrimary text-base pb-2 border-b border-brand-border/40">
              Platform Hiring Funnel
            </h3>
            <div className="space-y-3 pt-2">
              {funnelSteps.map((step, idx) => {
                // Width decreases as we go down the funnel, but also normalized against max count
                const baseWidth = 100 - idx * 10;
                const countRatio = step.count / maxFunnelCount;
                const widthPct = Math.max(25, Math.round(baseWidth * (0.4 + 0.6 * countRatio)));

                return (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="w-20 text-xs font-semibold text-brand-textSecondary text-right">
                      {step.label}
                    </span>
                    <div className="flex-1 flex justify-start">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPct}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.1 }}
                        className={`h-7 ${step.color} rounded-lg flex items-center justify-between px-3 text-[10px] font-bold text-white shadow-sm border border-white/10`}
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
        </div>

        {/* Recent Activities Feed */}
        <div className="glass-panel border border-brand-border/60 rounded-2xl p-6 space-y-4 shadow-panel flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-brand-border/40">
            <h3 className="font-bold text-brand-textPrimary text-base">
              System Activity Log
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-brand-textSecondary bg-brand-panelLight/40 px-2.5 py-1 rounded-full border border-brand-border/50">
              <Activity className="w-3.5 h-3.5 text-brand-primary animate-pulse" />
              <span className="font-semibold">Live logs</span>
            </div>
          </div>
          {recentLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-brand-textSecondary text-sm">
              <Activity className="w-8 h-8 mb-2 opacity-40 animate-pulse" />
              <span>No recent activities recorded</span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[460px] pt-2 scrollbar-thin">
              {recentLogs.map((log, idx) => (
                <div key={idx} className="flex gap-3 text-xs leading-relaxed">
                  <div className="pt-1.5">
                    <span className={`w-2 h-2 rounded-full block shrink-0 ${getLogIconColor(log.type)}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-brand-textPrimary font-medium">{log.message}</p>
                    {log.timestamp && (
                      <span className="text-[10px] text-brand-textSecondary font-semibold">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    )}
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
