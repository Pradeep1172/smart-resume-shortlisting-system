import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, Save, Info, AlertCircle, Upload, Trash2, User as UserIcon, Camera
} from 'lucide-react';
import API from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

export default function ProfileSettingsTab({ 
  profileData, 
  handleProfileChange, 
  handleSaveProfile, 
  profileSuccess, 
  profileError, 
  getProfileCompletion, 
  resumes 
}) {
  const { user, checkAuth } = useContext(AuthContext);

  // Photo management state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now());
  const [photoError, setPhotoError] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);

  const hasPhoto = profileData.has_photo || user?.has_photo;

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setPhotoError('Invalid format. Please select PNG, JPG, or JPEG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('File too large. Maximum size is 5MB.');
      return;
    }
    setPhotoError('');
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoSave = async () => {
    if (!photoFile) return;
    setPhotoSaving(true);
    setPhotoError('');
    const formData = new FormData();
    formData.append('photo', photoFile);
    try {
      await API.post('/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPhotoPreview(null);
      setPhotoFile(null);
      setPhotoTimestamp(Date.now());
      handleProfileChange('has_photo', true);
      const localProfile = localStorage.getItem(`candidate_profile_${user?.id}`);
      if (localProfile) {
        const parsed = JSON.parse(localProfile);
        parsed.has_photo = true;
        localStorage.setItem(`candidate_profile_${user?.id}`, JSON.stringify(parsed));
      }
      await checkAuth();
    } catch (err) {
      setPhotoError('Failed to save profile picture.');
    } finally {
      setPhotoSaving(false);
    }
  };

  const handlePhotoCancel = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoFile(null);
    setPhotoError('');
  };

  const handlePhotoRemove = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;
    try {
      await API.delete('/profile/photo');
      setPhotoTimestamp(Date.now());
      handleProfileChange('has_photo', false);
      const localProfile = localStorage.getItem(`candidate_profile_${user?.id}`);
      if (localProfile) {
        const parsed = JSON.parse(localProfile);
        parsed.has_photo = false;
        localStorage.setItem(`candidate_profile_${user?.id}`, JSON.stringify(parsed));
      }
      await checkAuth();
    } catch (err) {
      setPhotoError('Failed to remove profile picture.');
    }
  };

  const photoSrc = `${(API.defaults.baseURL || 'http://localhost:5000/api').replace(/\/api$/, '')}/api/profile/photo/${user?.id}?t=${photoTimestamp}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-brand-textPrimary tracking-tight">Candidate Profile</h1>
        <p className="text-brand-textSecondary text-sm mt-1">Edit professional settings and bio details stored on this platform.</p>
      </div>

      {/* Status Messages */}
      {profileSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-success/10 border border-brand-success/20 text-brand-success p-4 rounded-xl text-xs font-semibold flex items-center gap-2"
        >
          <CheckCircle className="w-5 h-5 shrink-0" /> {profileSuccess}
        </motion.div>
      )}
      {profileError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger p-4 rounded-xl text-xs font-semibold flex items-center gap-2"
        >
          <Info className="w-5 h-5 shrink-0" /> {profileError}
        </motion.div>
      )}

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── LEFT COLUMN: Profile Card ── */}
        <div className="lg:col-span-1 space-y-5">
          <div className="glass-panel border border-brand-border/60 rounded-3xl p-6 shadow-panel flex flex-col items-center text-center relative overflow-hidden">
            {/* Decorative gradient blob */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 blur-2xl pointer-events-none" />

            {/* Avatar */}
            <div className="relative group mb-4 mt-1">
              <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-brand-border/80 shadow-premium bg-brand-bg flex items-center justify-center relative">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : hasPhoto ? (
                  <img
                    src={photoSrc}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}

                {/* Default avatar fallback */}
                {!photoPreview && !hasPhoto && (
                  <div className="w-full h-full bg-gradient-to-br from-brand-primary/15 to-brand-secondary/20 flex items-center justify-center text-brand-primary font-black text-3xl select-none">
                    {(profileData.name || user?.name || 'C')[0].toUpperCase()}
                  </div>
                )}
                {/* Hidden fallback for when photo URL errors */}
                {hasPhoto && !photoPreview && (
                  <div style={{ display: 'none' }} className="w-full h-full bg-gradient-to-br from-brand-primary/15 to-brand-secondary/20 flex items-center justify-center text-brand-primary font-black text-3xl select-none">
                    {(profileData.name || user?.name || 'C')[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* Camera badge overlay */}
              <label
                htmlFor="profile-photo-input"
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand-primary text-white rounded-full flex items-center justify-center cursor-pointer shadow-premium border-2 border-white hover:scale-110 transition-transform"
                title="Change photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </label>
            </div>

            {/* Name & Role */}
            <h2 className="text-base font-bold text-brand-textPrimary leading-tight">{profileData.name || user?.name || 'Candidate'}</h2>
            {profileData.headline && (
              <p className="text-[11px] text-brand-textSecondary font-medium mt-0.5 max-w-[200px] truncate">{profileData.headline}</p>
            )}
            <span className="text-[9px] font-bold text-brand-primary/80 uppercase tracking-widest mt-1 bg-brand-primary/5 border border-brand-primary/10 px-3 py-0.5 rounded-full">Candidate</span>

            {/* Profile completion bar */}
            {(() => {
              const pc = getProfileCompletion();
              return (
                <div className="w-full mt-5 px-1">
                  <div className="flex items-center justify-between text-[10px] mb-1.5">
                    <span className="text-brand-textSecondary font-semibold">Profile Completion</span>
                    <span className="text-brand-primary font-extrabold">{pc}%</span>
                  </div>
                  <div className="w-full bg-brand-border/60 rounded-full h-[6px] overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-brand-primary to-brand-secondary h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${pc}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Resume badge */}
            <div className="flex items-center gap-1.5 mt-4 text-[10px] font-semibold">
              {resumes && resumes.length > 0 ? (
                <span className="flex items-center gap-1 text-brand-success bg-brand-success/8 border border-brand-success/15 px-2.5 py-1 rounded-lg">
                  <CheckCircle className="w-3 h-3" /> Resume Uploaded
                </span>
              ) : (
                <span className="flex items-center gap-1 text-brand-warning bg-brand-warning/8 border border-brand-warning/15 px-2.5 py-1 rounded-lg">
                  <AlertCircle className="w-3 h-3" /> No Resume
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="w-full border-t border-brand-border/40 mt-5 pt-4 space-y-3">
              {/* Error message */}
              {photoError && (
                <p className="text-[10px] text-brand-danger font-semibold flex items-center justify-center gap-1 animate-fade-in">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {photoError}
                </p>
              )}

              {/* Hidden file input */}
              <input
                type="file"
                id="profile-photo-input"
                accept="image/png, image/jpeg, image/jpg"
                className="hidden"
                onChange={handlePhotoSelect}
              />

              {/* Photo Action Buttons */}
              {photoPreview ? (
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    disabled={photoSaving}
                    onClick={handlePhotoSave}
                    className="bg-brand-success hover:bg-brand-success/90 text-white text-[11px] font-bold px-4 py-2 rounded-xl transition-all shadow-sm disabled:opacity-60"
                  >
                    {photoSaving ? (
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</span>
                    ) : 'Save Photo'}
                  </button>
                  <button
                    type="button"
                    disabled={photoSaving}
                    onClick={handlePhotoCancel}
                    className="bg-brand-panel border border-brand-border text-brand-textSecondary text-[11px] font-semibold px-4 py-2 rounded-xl hover:bg-brand-panelLight transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 justify-center">
                  <label
                    htmlFor="profile-photo-input"
                    className="cursor-pointer bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/25 text-[11px] font-bold px-4 py-2 rounded-xl transition-all select-none"
                  >
                    {hasPhoto ? 'Change Photo' : 'Upload Photo'}
                  </label>
                  {hasPhoto && (
                    <button
                      type="button"
                      onClick={handlePhotoRemove}
                      className="bg-brand-danger/8 hover:bg-brand-danger/15 text-brand-danger border border-brand-danger/20 text-[11px] font-bold px-4 py-2 rounded-xl transition-all"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}

              <p className="text-[9px] text-brand-textSecondary/70 uppercase tracking-widest text-center pt-0.5">JPG, JPEG, PNG · Max 5 MB</p>
            </div>
          </div>

          {/* Incomplete items checklist */}
          {(() => {
            const incompleteItems = [];
            if (!profileData.phone) incompleteItems.push({ key: 'phone', label: 'Phone Number' });
            if (!profileData.headline) incompleteItems.push({ key: 'headline', label: 'Professional Headline' });
            if (!profileData.bio) incompleteItems.push({ key: 'bio', label: 'Professional Bio' });
            if (!profileData.education) incompleteItems.push({ key: 'education', label: 'Education / Degree' });
            if (!profileData.skills) incompleteItems.push({ key: 'skills', label: 'Skills' });
            if (!resumes || !resumes.length) incompleteItems.push({ key: 'resume', label: 'Resume Upload' });

            if (incompleteItems.length === 0) {
              return (
                <div className="glass-panel border border-brand-success/20 rounded-2xl p-4 bg-brand-success/5 flex items-center gap-2 text-xs text-brand-success font-bold">
                  <CheckCircle className="w-4 h-4" /> Profile 100% complete!
                </div>
              );
            }

            return (
              <div className="glass-panel border border-brand-border/50 rounded-2xl p-4 space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-brand-textSecondary tracking-wider block">Remaining:</span>
                <div className="flex flex-wrap gap-1.5">
                  {incompleteItems.map(item => (
                    <span key={item.key} className="text-[9px] font-semibold bg-brand-panelLight border border-brand-border text-brand-textSecondary px-2 py-0.5 rounded-lg">
                      + {item.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── RIGHT COLUMN: Profile Details Form ── */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSaveProfile} className="glass-panel border border-brand-border/60 rounded-3xl p-6 md:p-8 space-y-6 shadow-panel">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Full Name</label>
                <input
                  type="text"
                  value={profileData.name || ''}
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-sans"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Email Address</label>
                <input
                  type="email"
                  value={profileData.email || ''}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  className="block w-full bg-brand-bg/40 border border-brand-border rounded-xl px-4 py-3 text-brand-textSecondary text-xs cursor-not-allowed font-sans"
                  required
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +1 (555) 000-0000"
                  value={profileData.phone || ''}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-sans"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Professional Headline</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Backend Engineer"
                  value={profileData.headline || ''}
                  onChange={(e) => handleProfileChange('headline', e.target.value)}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Experience (Years)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 5"
                  value={profileData.experience_years || ''}
                  onChange={(e) => handleProfileChange('experience_years', e.target.value)}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-sans"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Education / Degree</label>
                <input
                  type="text"
                  placeholder="e.g. B.S. in Computer Science"
                  value={profileData.education || ''}
                  onChange={(e) => handleProfileChange('education', e.target.value)}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Skills (Comma separated)</label>
              <input
                type="text"
                placeholder="e.g. Python, SQL, React, Node.js"
                value={profileData.skills || ''}
                onChange={(e) => handleProfileChange('skills', e.target.value)}
                className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-sans"
              />
              {profileData.skills && (
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {profileData.skills.split(',')
                    .map(s => s.trim())
                    .filter(Boolean)
                    .map((skill, idx) => (
                      <span key={idx} className="text-[10px] font-semibold bg-brand-primary/10 border border-brand-primary/25 text-brand-primary px-2.5 py-0.5 rounded-lg shadow-sm">
                        {skill}
                      </span>
                    ))
                  }
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Professional Bio</label>
              <textarea
                rows="4"
                placeholder="Tell us about your background, career goals, or notable achievements..."
                value={profileData.bio || ''}
                onChange={(e) => handleProfileChange('bio', e.target.value)}
                className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all resize-none font-sans"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">GitHub Profile URL</label>
                <input
                  type="text"
                  placeholder="e.g. https://github.com/username"
                  value={profileData.github_url || ''}
                  onChange={(e) => handleProfileChange('github_url', e.target.value)}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-sans"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">LinkedIn Profile URL</label>
                <input
                  type="text"
                  placeholder="e.g. https://linkedin.com/in/username"
                  value={profileData.linkedin_url || ''}
                  onChange={(e) => handleProfileChange('linkedin_url', e.target.value)}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">LeetCode Profile URL</label>
                <input
                  type="text"
                  placeholder="e.g. https://leetcode.com/username"
                  value={profileData.leetcode_url || ''}
                  onChange={(e) => handleProfileChange('leetcode_url', e.target.value)}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-sans"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Portfolio / Website URL</label>
                <input
                  type="text"
                  placeholder="e.g. https://portfolio.github.io"
                  value={profileData.portfolio_url || profileData.portfolio || ''}
                  onChange={(e) => {
                    handleProfileChange('portfolio_url', e.target.value);
                    handleProfileChange('portfolio', e.target.value);
                  }}
                  className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary mb-2">Certifications</label>
              <textarea
                rows="3"
                placeholder="e.g. AWS Certified Solutions Architect, Certified Scrum Master..."
                value={profileData.certifications || ''}
                onChange={(e) => handleProfileChange('certifications', e.target.value)}
                className="block w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all resize-none font-sans"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white py-3 rounded-xl font-bold shadow-premium flex items-center justify-center gap-2 transition-all btn-pressable hover:shadow-glow"
            >
              <Save className="w-4 h-4" /> Save Profile Details
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
