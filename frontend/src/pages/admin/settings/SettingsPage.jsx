import React from 'react';
import { Lock, Globe, Cpu } from 'lucide-react';

export default function SettingsPage({ sysConfig, setSysConfig, onSaveConfig, savingConfig, configSuccess, configError, activeSection = 'system' }) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* System Settings */}
      {activeSection === 'system' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">System Settings</h1>
            <p className="text-brand-textSecondary text-sm mt-1">Configure workspace rules, registrations, thresholds, and site branding.</p>
          </div>

          {configSuccess && (
            <div className="p-4 bg-brand-success/15 border border-brand-success/30 rounded-xl text-brand-success text-xs font-semibold">
              {configSuccess}
            </div>
          )}
          {configError && (
            <div className="p-4 bg-brand-danger/15 border border-brand-danger/30 rounded-xl text-brand-danger text-xs font-semibold">
              {configError}
            </div>
          )}

          <div className="glass-panel border border-brand-border/60 rounded-3xl p-6 md:p-8 space-y-6 shadow-panel">
            <div className="flex items-center gap-3 pb-2 border-b border-brand-border/40">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-brand-primary" />
              </div>
              <div>
                <h3 className="font-bold text-brand-textPrimary text-sm">Platform Configuration</h3>
                <p className="text-[10px] text-brand-textSecondary">Core system settings and platform behavior</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Platform Application Title</label>
                <input
                  type="text"
                  value={sysConfig.SITE_NAME}
                  onChange={(e) => setSysConfig({ ...sysConfig, SITE_NAME: e.target.value })}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Default Match Screening Threshold (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={sysConfig.DEFAULT_SCREENING_THRESHOLD}
                  onChange={(e) => setSysConfig({ ...sysConfig, DEFAULT_SCREENING_THRESHOLD: e.target.value })}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Allow Guest Candidate Registrations</label>
                <select
                  value={sysConfig.ALLOW_CANDIDATE_REGISTRATION}
                  onChange={(e) => setSysConfig({ ...sysConfig, ALLOW_CANDIDATE_REGISTRATION: e.target.value })}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary text-xs focus:outline-none focus:border-brand-primary font-semibold"
                >
                  <option value="true">Yes (Enabled)</option>
                  <option value="false">No (Disabled)</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => onSaveConfig({
                SITE_NAME: sysConfig.SITE_NAME,
                DEFAULT_SCREENING_THRESHOLD: sysConfig.DEFAULT_SCREENING_THRESHOLD,
                ALLOW_CANDIDATE_REGISTRATION: sysConfig.ALLOW_CANDIDATE_REGISTRATION
              })}
              disabled={savingConfig}
              className="w-full bg-gradient-to-r from-brand-accent to-brand-primary text-white py-3 rounded-xl font-bold shadow-premium transition-all hover:opacity-95 disabled:opacity-50"
            >
              {savingConfig ? 'Saving Settings...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* AI Configuration */}
      {activeSection === 'ai' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">AI Engine Configuration</h1>
            <p className="text-brand-textSecondary text-sm mt-1">Manage Gemini LLM API keys, model versions, and custom evaluation setups.</p>
          </div>

          {configSuccess && (
            <div className="p-4 bg-brand-success/15 border border-brand-success/30 rounded-xl text-brand-success text-xs font-semibold">
              {configSuccess}
            </div>
          )}
          {configError && (
            <div className="p-4 bg-brand-danger/15 border border-brand-danger/30 rounded-xl text-brand-danger text-xs font-semibold">
              {configError}
            </div>
          )}

          <div className="glass-panel border border-brand-border/60 rounded-3xl p-6 md:p-8 space-y-6 shadow-panel">
            <div className="flex items-center gap-3 pb-2 border-b border-brand-border/40">
              <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-brand-accent" />
              </div>
              <div>
                <h3 className="font-bold text-brand-textPrimary text-sm">Gemini AI Credentials</h3>
                <p className="text-[10px] text-brand-textSecondary">API key and model version for resume evaluation</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Gemini Pro API Private Credentials Key</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textSecondary" />
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={sysConfig.GEMINI_API_KEY}
                    onChange={(e) => setSysConfig({ ...sysConfig, GEMINI_API_KEY: e.target.value })}
                    className="block w-full bg-brand-bg border border-brand-border rounded-xl pl-10 pr-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
                <span className="text-[10px] text-brand-textSecondary block mt-1.5">Stored as SystemSetting environment record in DB backend node.</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Gemini Model Family Version</label>
                <select
                  value={sysConfig.GEMINI_MODEL_VERSION}
                  onChange={(e) => setSysConfig({ ...sysConfig, GEMINI_MODEL_VERSION: e.target.value })}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary text-xs focus:outline-none focus:border-brand-primary font-semibold"
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Default, Fast, Low cost)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (High Accuracy, Deeper Reasoning)</option>
                  <option value="gemini-1.0-pro">Gemini 1.0 Pro (Standard Legacy Model)</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => onSaveConfig({
                GEMINI_API_KEY: sysConfig.GEMINI_API_KEY,
                GEMINI_MODEL_VERSION: sysConfig.GEMINI_MODEL_VERSION
              })}
              disabled={savingConfig}
              className="w-full bg-gradient-to-r from-brand-accent to-brand-primary text-white py-3 rounded-xl font-bold shadow-premium transition-all hover:opacity-95 disabled:opacity-50"
            >
              {savingConfig ? 'Saving Settings...' : 'Save AI Credentials'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
