import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full bg-[#0a0e1a] border-t border-brand-border/40 py-6 mt-auto shrink-0 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand and Description */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-extrabold text-sm text-white tracking-tight">
                Shortlist<span className="text-brand-primary">IQ</span>
              </span>
              <span className="text-[10px] bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                ATS Engine
              </span>
            </div>
            <p className="text-[11px] text-brand-textSecondary max-w-md font-medium">
              Academic: Smart Resume Shortlisting System • Powered by Google Gemini AI
            </p>
          </div>

          {/* Copyright and compliance */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right">
            <div className="flex items-center gap-4 text-xs font-semibold text-brand-textSecondary mb-1.5">
              <a href="#doc" className="hover:text-white transition-colors">Documentation</a>
              <span className="w-1 h-1 rounded-full bg-brand-border inline-block"></span>
              <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
              <span className="w-1 h-1 rounded-full bg-brand-border inline-block"></span>
              <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
            <p className="text-[10px] text-brand-textSecondary">
              &copy; {new Date().getFullYear()} ShortlistIQ. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
