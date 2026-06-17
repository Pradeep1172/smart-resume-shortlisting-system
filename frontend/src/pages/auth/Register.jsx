import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Lock, 
  UserPlus, 
  AlertCircle, 
  CheckCircle2, 
  Check,
  Briefcase,
  KeyRound
} from 'lucide-react';

export default function Register() {
  const { register, verifyEmailOtp, resendOtp, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('candidate');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [step, setStep] = useState('register');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingRole, setPendingRole] = useState('candidate');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !role) { setError('Please fill in all fields'); return; }
    setError('');
    setInfo('');
    setLoading(true);
    const result = await register(name, email, password, role);
    setLoading(false);
    if (result.success) {
      setPendingEmail(result.email || email);
      setPendingRole(result.role || role);
      setStep('verify');
      setInfo(result.message || 'A verification code has been sent to your email.');
      if (result.otp) {
        setOtp(result.otp);
      }
    } else {
      setError(result.message);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) { setError('Please enter the 6-digit verification code'); return; }
    setError('');
    setInfo('');
    setLoading(true);
    const result = await verifyEmailOtp(pendingEmail, otp);
    setLoading(false);
    if (result.success) {
      setStep('complete');
      setInfo(result.message);
      if (!result.awaitingApproval) {
        setTimeout(() => navigate('/login'), 2500);
      }
    } else {
      setError(result.message);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setResending(true);
    const result = await resendOtp(pendingEmail);
    setResending(false);
    if (result.success) {
      setInfo(result.message);
      if (result.otp) {
        setOtp(result.otp);
      }
    } else {
      setError(result.message);
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }
    })
  };

  const roles = [
    { id: 'candidate', label: 'Candidate', icon: User },
    { id: 'recruiter', label: 'Recruiter', icon: Briefcase },
  ];

  const inputWrap = (focused) => `relative rounded-xl transition-all duration-200 ${
    focused 
      ? 'shadow-[0_0_0_1px_#3b82f6,0_0_0_4px_rgba(59,130,246,0.1)]' 
      : 'shadow-[0_0_0_1px_rgba(0,0,0,0.08)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.15)]'
  }`;

  return (
    <div className="min-h-screen w-full flex font-sans overflow-hidden">
      
      {/* ═══ LEFT PANEL (AI Background Video) ═══ */}
      <div className="hidden lg:flex lg:w-[50%] relative bg-[#060B18] text-white flex-col justify-center items-center overflow-hidden">
        
        <video 
          src="/Videos/shortlistiq-ai.mp4" 
          autoPlay 
          muted 
          loop 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-45"
        />

        <div className="absolute inset-0 z-10 pointer-events-none" style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }} />

        <div className="z-20 flex flex-col items-center justify-center text-center px-12 max-w-md w-full">
          
          <div className="logo-float">
            <Logo size="h-[8.25rem]" showText={false} textColor="white" animated={false} />
          </div>

          <h1 className="mt-7 text-[3.25rem] font-extrabold tracking-tight text-white leading-none" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Shortlist<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">IQ</span>
          </h1>

          <h2 className="mt-3 text-base font-medium text-slate-300 tracking-tight">
            Connecting Talent with Opportunity
          </h2>

          <p className="mt-2 text-sm leading-relaxed max-w-sm" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
            Manage applications, evaluate candidates, and streamline recruitment from a single platform.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            {["Resume Evaluation", "Candidate Shortlisting", "Application Tracking"].map((text, idx) => (
              <span key={idx} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300 bg-white/[0.05] border border-white/[0.08] px-3.5 py-1.5 rounded-full backdrop-blur-md hover:bg-white/[0.10] hover:border-cyan-400/20 hover:-translate-y-0.5 transition-all duration-300 ease-in-out cursor-default">
                <Check className="w-3 h-3 text-cyan-400 stroke-[3]" />
                {text}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-between items-center px-12 pb-8 text-[11px] text-slate-600">
          <span>© 2026 ShortlistIQ</span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-slate-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Privacy</a>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="w-full lg:w-[50%] flex items-center justify-center px-6 sm:px-16 py-12 bg-[#FAFBFC] relative overflow-y-auto">
        
        <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-slate-100/60 to-transparent pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

        <motion.div initial="hidden" animate="visible"
          className="w-full max-w-[420px] bg-white rounded-2xl p-8 sm:p-9 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03),0_4px_8px_rgba(0,0,0,0.03),0_12px_24px_rgba(0,0,0,0.04),0_24px_48px_rgba(0,0,0,0.06)] flex flex-col gap-7 z-10 relative"
        >
          
          <div className="flex flex-col gap-2.5">
            <motion.h2 variants={fadeUp} custom={0} className="text-[1.75rem] font-extrabold text-slate-900 tracking-tight leading-none mt-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {step === 'register' && 'Create an account'}
              {step === 'verify' && 'Verify your email'}
              {step === 'complete' && (pendingRole === 'recruiter' ? 'Account created' : 'Account activated')}
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-slate-500 text-sm">
              {step === 'register' && 'Get started with ShortlistIQ today.'}
              {step === 'verify' && `Enter the 6-digit code sent to ${pendingEmail}`}
              {step === 'complete' && pendingRole === 'recruiter' && 'Your email is verified. An admin will review your account shortly.'}
              {step === 'complete' && pendingRole === 'candidate' && 'Your account is ready. Redirecting to sign in…'}
            </motion.p>
          </div>

          {step === 'register' && (
            <motion.div variants={fadeUp} custom={2} className="flex gap-2">
              {roles.map((r) => {
                const Icon = r.icon;
                const active = role === r.id;
                return (
                  <button key={r.id} type="button" onClick={() => setRole(r.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-200 border ${
                      active 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {r.label}
                  </button>
                );
              })}
            </motion.div>
          )}

          {info && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2.5 text-blue-700 text-xs font-medium"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-500" />
              <span>{info}</span>
            </motion.div>
          )}

          {step === 'complete' && pendingRole === 'recruiter' && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2.5 text-amber-800 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Your recruiter account is awaiting admin approval.</span>
            </motion.div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2.5 text-red-600 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </motion.div>
          )}

          {step === 'register' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              <motion.div variants={fadeUp} custom={3} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 ml-0.5">Full name</label>
                <div className={inputWrap(nameFocused)}>
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className={`h-4 w-4 transition-colors duration-200 ${nameFocused ? 'text-blue-500' : 'text-slate-400'}`} />
                  </div>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    onFocus={() => setNameFocused(true)} onBlur={() => setNameFocused(false)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-medium rounded-xl"
                    placeholder="John Doe" required
                  />
                </div>
              </motion.div>

              <motion.div variants={fadeUp} custom={4} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 ml-0.5">Email address</label>
                <div className={inputWrap(emailFocused)}>
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

              <motion.div variants={fadeUp} custom={5} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 ml-0.5">Password</label>
                <div className={inputWrap(passFocused)}>
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

              <motion.div variants={fadeUp} custom={6} className="pt-1.5">
                <button type="submit" disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-semibold text-sm shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.08),0_12px_28px_rgba(0,0,0,0.18)] flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create account</span>
                      <UserPlus className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </motion.div>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              <motion.div variants={fadeUp} custom={3} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 ml-0.5">Verification code</label>
                <div className={inputWrap(otpFocused)}>
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className={`h-4 w-4 transition-colors duration-200 ${otpFocused ? 'text-blue-500' : 'text-slate-400'}`} />
                  </div>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onFocus={() => setOtpFocused(true)} onBlur={() => setOtpFocused(false)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-medium rounded-xl tracking-[0.3em]"
                    placeholder="000000" required
                  />
                </div>
              </motion.div>

              <motion.div variants={fadeUp} custom={4} className="pt-1.5">
                <button type="submit" disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-semibold text-sm shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.08),0_12px_28px_rgba(0,0,0,0.18)] flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Verify email</span>
                  )}
                </button>
              </motion.div>

              <motion.div variants={fadeUp} custom={5} className="text-center">
                <button type="button" onClick={handleResendOtp} disabled={resending}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
                >
                  {resending ? 'Sending…' : 'Resend verification code'}
                </button>
              </motion.div>
            </form>
          )}

          {step === 'complete' && pendingRole === 'recruiter' && (
            <motion.div variants={fadeUp} custom={3}>
              <Link to="/login"
                className="w-full py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-sm font-semibold text-slate-700 text-center transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] block"
              >
                Back to sign in
              </Link>
            </motion.div>
          )}

          {step === 'register' && (
            <motion.div variants={fadeUp} custom={7} className="text-center text-sm">
              <span className="text-slate-500">Already have an account? </span>
              <Link to="/login" className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                Sign in
              </Link>
            </motion.div>
          )}

        </motion.div>
      </div>
    </div>
  );
}
