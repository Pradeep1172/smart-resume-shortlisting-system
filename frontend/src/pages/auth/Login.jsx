import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import SplashScreen from '../../components/common/SplashScreen';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  AlertCircle, 
  ArrowRight,
  Check
} from 'lucide-react';

export default function Login() {
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPostLoginSplash, setShowPostLoginSplash] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('pendingPostLoginSplash') === 'true') {
      sessionStorage.removeItem('pendingPostLoginSplash');
      setShowPostLoginSplash(true);
      return;
    }
    if (user && !showPostLoginSplash) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, showPostLoginSplash]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      setShowPostLoginSplash(true);
    } else setError(result.message);
  };

  if (showPostLoginSplash) {
    return (
      <SplashScreen onComplete={() => navigate('/dashboard', { replace: true })} />
    );
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }
    })
  };

  return (
    <div className="min-h-screen w-full flex font-sans overflow-hidden">
      
      {/* ═══ LEFT PANEL (AI Background Video) ═══ */}
      <div className="hidden lg:flex lg:w-[50%] relative bg-[#060B18] text-white flex-col justify-center items-center overflow-hidden">
        
        {/* Autoplay Background Video */}
        <video 
          src="/Videos/shortlistiq-ai.mp4" 
          autoPlay 
          muted 
          loop 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-45"
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }} />

        {/* Center branding */}
        <div className="z-20 flex flex-col items-center justify-center text-center px-12 max-w-md w-full">
          
          {/* Logo mark */}
          <div className="logo-float">
            <Logo size="h-[8.25rem]" showText={false} textColor="white" animated={false} />
          </div>

          {/* Title — primary hierarchy focus */}
          <h1 className="mt-7 text-[3.25rem] font-extrabold tracking-tight text-white leading-none" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Shortlist<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">IQ</span>
          </h1>

          {/* Tagline */}
          <h2 className="mt-3 text-base font-medium text-slate-300 tracking-tight">
            Connecting Talent with Opportunity
          </h2>

          {/* Descriptive line */}
          <p className="mt-2 text-sm leading-relaxed max-w-sm" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
            Manage applications, evaluate candidates, and streamline recruitment from a single platform.
          </p>

          {/* Feature badges */}
          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            {["Resume Evaluation", "Candidate Shortlisting", "Application Tracking"].map((text, idx) => (
              <span key={idx} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300 bg-white/[0.05] border border-white/[0.08] px-3.5 py-1.5 rounded-full backdrop-blur-md hover:bg-white/[0.10] hover:border-cyan-400/20 hover:-translate-y-0.5 transition-all duration-300 ease-in-out cursor-default">
                <Check className="w-3 h-3 text-cyan-400 stroke-[3]" />
                {text}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom — absolute so it doesn't affect vertical centering */}
        <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-between items-center px-12 pb-8 text-[11px] text-slate-600">
          <span>© 2026 ShortlistIQ</span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-slate-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Privacy</a>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="w-full lg:w-[50%] flex items-center justify-center px-6 sm:px-16 py-12 bg-[#FAFBFC] relative">
        
        <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-slate-100/60 to-transparent pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

        <motion.div 
          initial="hidden" animate="visible"
          className="w-full max-w-[420px] bg-white rounded-2xl p-8 sm:p-9 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03),0_4px_8px_rgba(0,0,0,0.03),0_12px_24px_rgba(0,0,0,0.04),0_24px_48px_rgba(0,0,0,0.06)] flex flex-col gap-7 z-10 relative"
        >
          
          {/* Header */}
          <div className="flex flex-col gap-2.5">
            <motion.h2 variants={fadeUp} custom={0} className="text-[1.75rem] font-extrabold text-slate-900 tracking-tight leading-none" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Welcome back
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-slate-500 text-sm">
              Sign in to continue to your dashboard.
            </motion.p>
          </div>

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2.5 text-red-600 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            <motion.div variants={fadeUp} custom={2} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 ml-0.5">Email address</label>
              <div className={`relative rounded-xl transition-all duration-200 ${
                emailFocused 
                  ? 'shadow-[0_0_0_1px_#3b82f6,0_0_0_4px_rgba(59,130,246,0.1)]' 
                  : 'shadow-[0_0_0_1px_rgba(0,0,0,0.08)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.15)]'
              }`}>
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className={`h-4 w-4 transition-colors duration-200 ${emailFocused ? 'text-blue-500' : 'text-slate-400'}`} />
                </div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-medium rounded-xl"
                  placeholder="name@company.com" required
                />
              </div>
            </motion.div>

            <motion.div variants={fadeUp} custom={3} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-baseline ml-0.5">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <a href="#forgot" className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className={`relative rounded-xl transition-all duration-200 ${
                passFocused 
                  ? 'shadow-[0_0_0_1px_#3b82f6,0_0_0_4px_rgba(59,130,246,0.1)]' 
                  : 'shadow-[0_0_0_1px_rgba(0,0,0,0.08)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.15)]'
              }`}>
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className={`h-4 w-4 transition-colors duration-200 ${passFocused ? 'text-blue-500' : 'text-slate-400'}`} />
                </div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPassFocused(true)} onBlur={() => setPassFocused(false)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-medium rounded-xl"
                  placeholder="••••••••••" required
                />
              </div>
            </motion.div>

            <motion.div variants={fadeUp} custom={4} className="flex items-center gap-2.5 mt-0.5">
              <input type="checkbox" id="remember" checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded-sm focus:ring-blue-500/20 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs text-slate-500 font-medium cursor-pointer select-none">
                Remember me on this device
              </label>
            </motion.div>

            <motion.div variants={fadeUp} custom={5} className="pt-1.5">
              <button type="submit" disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-semibold text-sm shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.08),0_12px_28px_rgba(0,0,0,0.18)] flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none group"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </motion.div>
          </form>

          <motion.div variants={fadeUp} custom={6} className="flex flex-col items-center gap-4">
            <div className="w-full flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200/80" />
              <span className="text-[11px] text-slate-400 font-medium">or</span>
              <div className="flex-1 h-px bg-slate-200/80" />
            </div>
            <Link to="/register"
              className="w-full py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-[13px] font-semibold text-slate-700 text-center transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]"
            >
              Create an account
            </Link>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
