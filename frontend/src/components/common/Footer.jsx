import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-[#070b14] border-t border-brand-border/40 pt-16 pb-8 mt-auto shrink-0 transition-all text-xs text-brand-textSecondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg text-white tracking-tight">
                Shortlist<span className="text-brand-primary">IQ</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              An intelligent, AI-powered applicant tracking and resume shortlisting platform designed for modern recruitment.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-white mb-4 text-[11px] uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-3 font-medium text-sm">
              <li><Link to="/register?role=candidate" className="hover:text-brand-primary transition-colors">Find Jobs</Link></li>
              <li><Link to="/register?role=recruiter" className="hover:text-brand-primary transition-colors">Post a Job</Link></li>
              <li><a href="/#features" className="hover:text-brand-primary transition-colors">Features</a></li>
              <li><a href="/#about" className="hover:text-brand-primary transition-colors">How It Works</a></li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="font-bold text-white mb-4 text-[11px] uppercase tracking-wider">About</h4>
            <ul className="space-y-3 font-medium text-sm">
              <li><a href="/#about" className="hover:text-brand-primary transition-colors">Our Story</a></li>
              <li><a href="/#features" className="hover:text-brand-primary transition-colors">Technology</a></li>
              <li><a href="/#contact" className="hover:text-brand-primary transition-colors">Help Center</a></li>
            </ul>
          </div>

          {/* Contact & Socials */}
          <div>
            <h4 className="font-bold text-white mb-4 text-[11px] uppercase tracking-wider">Connect</h4>
            <ul className="space-y-3 font-medium text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-primary" />
                <a href="mailto:shortlistiq.official@gmail.com" className="hover:text-white transition-colors">shortlistiq.official@gmail.com</a>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-primary" />
                <a href="https://shortlistiq-dev.vercel.app" className="hover:text-white transition-colors">https://shortlistiq-dev.vercel.app</a>
              </li>
              <li className="flex items-center gap-2 mt-4 pt-4 border-t border-brand-border/20">
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                  GitHub
                </a>
              </li>
              <li className="flex items-center gap-2">
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="pt-8 border-t border-brand-border/20 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <p>&copy; {new Date().getFullYear()} ShortlistIQ. All rights reserved.</p>
          <div className="flex gap-6 font-semibold">
            <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-white transition-colors">Terms &amp; Conditions</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
