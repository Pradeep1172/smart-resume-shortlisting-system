import React, { useState } from 'react';
import API from '../../../services/api';
import { motion } from 'framer-motion';
import {
  Users,
  Briefcase,
  FileText,
  TrendingUp,
  Award,
  Download,
  Loader2,
  CheckCircle
} from 'lucide-react';

const downloadCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        let val = row[h] ?? '';
        val = String(val).replace(/"/g, '""');
        if (String(val).includes(',') || String(val).includes('"') || String(val).includes('\n')) {
          val = `"${val}"`;
        }
        return val;
      }).join(',')
    )
  ];
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportCards = [
  {
    title: 'Recruiters Export',
    description: 'Export all recruiter accounts with profile and stats',
    icon: Users,
    endpoint: '/admin/export/recruiters',
    filename: 'recruiters_export.csv',
    color: 'text-brand-secondary',
    bgColor: 'bg-brand-secondary/10',
    borderColor: 'border-brand-secondary/20'
  },
  {
    title: 'Candidates Export',
    description: 'Export all candidate accounts with profile info',
    icon: Users,
    endpoint: '/admin/export/candidates',
    filename: 'candidates_export.csv',
    color: 'text-brand-primary',
    bgColor: 'bg-brand-primary/10',
    borderColor: 'border-brand-primary/20'
  },
  {
    title: 'Jobs Export',
    description: 'Export all job postings with details and requirements',
    icon: Briefcase,
    endpoint: '/admin/export/jobs',
    filename: 'jobs_export.csv',
    color: 'text-brand-success',
    bgColor: 'bg-brand-success/10',
    borderColor: 'border-brand-success/20'
  },
  {
    title: 'Applications Export',
    description: 'Export all applications with match scores and statuses',
    icon: FileText,
    endpoint: '/admin/export/applications',
    filename: 'applications_export.csv',
    color: 'text-brand-accent',
    bgColor: 'bg-brand-accent/10',
    borderColor: 'border-brand-accent/20'
  },
  {
    title: 'Hiring Report',
    description: 'Hiring funnel data per job with conversion metrics',
    icon: TrendingUp,
    endpoint: '/admin/export/hiring-report',
    filename: 'hiring_report.csv',
    color: 'text-brand-warning',
    bgColor: 'bg-brand-warning/10',
    borderColor: 'border-brand-warning/20'
  },
  {
    title: 'Recruiter Performance',
    description: 'Per-recruiter performance summary and activity report',
    icon: Award,
    endpoint: '/admin/export/recruiter-report',
    filename: 'recruiter_performance.csv',
    color: 'text-brand-danger',
    bgColor: 'bg-brand-danger/10',
    borderColor: 'border-brand-danger/20'
  }
];

export default function ExportsPage() {
  const [loadingMap, setLoadingMap] = useState({});
  const [doneMap, setDoneMap] = useState({});

  const handleDownload = async (card) => {
    setLoadingMap(prev => ({ ...prev, [card.endpoint]: true }));
    setDoneMap(prev => ({ ...prev, [card.endpoint]: false }));
    try {
      const res = await API.get(card.endpoint);
      const data = Array.isArray(res.data) ? res.data : [res.data];
      downloadCSV(data, card.filename);
      setDoneMap(prev => ({ ...prev, [card.endpoint]: true }));
      setTimeout(() => setDoneMap(prev => ({ ...prev, [card.endpoint]: false })), 3000);
    } catch (err) {
      alert('Export failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingMap(prev => ({ ...prev, [card.endpoint]: false }));
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">Export Center</h1>
        <p className="text-brand-textSecondary text-sm mt-1">Download platform data as CSV files for analysis and reporting.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {exportCards.map((card, idx) => {
          const Icon = card.icon;
          const isLoading = loadingMap[card.endpoint];
          const isDone = doneMap[card.endpoint];

          return (
            <motion.div
              key={card.endpoint}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="glass-panel border border-brand-border/60 rounded-2xl p-6 flex flex-col justify-between card-interactive hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl ${card.bgColor} border ${card.borderColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-bg border border-brand-border rounded-lg px-2.5 py-1 text-brand-textSecondary">
                    CSV
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-brand-textPrimary">{card.title}</h3>
                  <p className="text-xs text-brand-textSecondary mt-1 leading-relaxed">{card.description}</p>
                </div>
              </div>

              <button
                onClick={() => handleDownload(card)}
                disabled={isLoading}
                className={`mt-6 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isDone
                    ? 'bg-brand-success/15 text-brand-success border border-brand-success/30'
                    : 'bg-gradient-to-r from-brand-accent to-brand-primary text-white shadow-premium hover:opacity-90'
                } disabled:opacity-50`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : isDone ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Downloaded
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download CSV
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
