import React from 'react';

export default function AdminFooter() {
  return (
    <footer className="w-full bg-[#070b14] border-t border-brand-border/40 pt-7 pb-4 shrink-0 transition-all text-xs">
      <div className="w-full px-6 md:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-5">
          {/* Brand Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base text-white tracking-tight">
                Shortlist<span className="text-brand-primary">IQ</span>
              </span>
              <span className="text-[10px] bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-brand-textSecondary leading-relaxed">
              Administrative console for database management, applicant tracking pipelines, system configuration, and audit logging.
            </p>
          </div>

          {/* Column 1: Accounts */}
          <div>
            <h4 className="font-bold text-white mb-2 text-[10px] uppercase tracking-wider">User Admin</h4>
            <ul className="space-y-1.5 text-brand-textSecondary font-semibold">
              <li><a href="/" className="hover:text-brand-primary transition-colors">Dashboard</a></li>
              <li><a href="/candidates" className="hover:text-brand-primary transition-colors">Candidates</a></li>
              <li><a href="/recruiters" className="hover:text-brand-primary transition-colors">Recruiters</a></li>
            </ul>
          </div>

          {/* Column 2: System */}
          <div>
            <h4 className="font-bold text-white mb-2 text-[10px] uppercase tracking-wider">System Control</h4>
            <ul className="space-y-1.5 text-brand-textSecondary font-semibold">
              <li><a href="/jobs-monitoring" className="hover:text-brand-primary transition-colors">Jobs Monitoring</a></li>
              <li><a href="/applications" className="hover:text-brand-primary transition-colors">Applications</a></li>
              <li><a href="/exports" className="hover:text-brand-primary transition-colors">Export Center</a></li>
            </ul>
          </div>

          {/* Column 3: Maintenance */}
          <div>
            <h4 className="font-bold text-white mb-2 text-[10px] uppercase tracking-wider">Maintenance</h4>
            <ul className="space-y-1.5 text-brand-textSecondary font-semibold">
              <li><a href="/logs" className="hover:text-brand-primary transition-colors">Activity Logs</a></li>
              <li><a href="/system-config" className="hover:text-brand-primary transition-colors">System Settings</a></li>
              <li><a href="/ai-config" className="hover:text-brand-primary transition-colors">AI Settings</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="pt-4 border-t border-brand-border/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-brand-textSecondary">
          <p>&copy; {new Date().getFullYear()} ShortlistIQ Admin Portal. All rights reserved.</p>
          <div className="flex gap-4 font-semibold">
            <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
            <span>•</span>
            <a href="#support" className="hover:text-white transition-colors">Support Desk</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
