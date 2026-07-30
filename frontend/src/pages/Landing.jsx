import React, { useContext, useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Brain, 
  Briefcase, 
  Users, 
  CheckCircle2, 
  Sparkles, 
  Sliders, 
  ShieldCheck, 
  FileText, 
  ChevronRight,
  TrendingUp,
  FileCheck,
  Building,
  UploadCloud,
  Search,
  Target,
  HelpCircle,
  Mail,
  Layers,
  Star,
  Check,
  Zap,
  Globe,
  Clock,
  UserCheck,
  Plus,
  Minus,
  Calendar,
  PartyPopper,
  Layout,
  User,
  Activity,
  UserPlus,
  Lock
} from 'lucide-react';

const benefitPhrases = [
  "Improve your ATS Resume Score",
  "Find jobs that match your skills",
  "Track all applications",
  "Get AI-powered recommendations"
];

const CountUpScore = ({ target = 92 }) => {
  const [score, setScore] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = target;
    if (start === end) return;
    const duration = 1.0;
    const totalSteps = 40;
    const stepTime = Math.abs(Math.floor((duration * 1000) / totalSteps));
    const timer = setInterval(() => {
      start += Math.ceil((end - start) / 5);
      if (start >= end) {
        setScore(end);
        clearInterval(timer);
      } else {
        setScore(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [target]);

  return <span>{score}%</span>;
};

function DashboardSimulator({ activeStage, onStageClick }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, [activeStage]);

  return (
    <div className="relative w-full max-w-md bg-slate-900 text-white rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-800/80 overflow-hidden select-none hover:-translate-y-1 hover:shadow-brand-primary/10 transition-all duration-300">
      {/* Top bar */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-850 text-[10px] font-bold text-slate-450">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="ml-1 text-slate-350 font-extrabold font-sans">Workspace Preview</span>
        </div>
        <span className="text-brand-secondary text-[8px] tracking-widest uppercase">Live Demo</span>
      </div>

      <div className="grid grid-cols-12 gap-3 min-h-[220px]">
        {/* Sidebar */}
        <div className="col-span-3 border-r border-slate-800/80 pr-2.5 space-y-2.5 text-[8.5px] font-bold text-slate-450">
          {[
            { id: 0, label: "Profile", icon: User },
            { id: 1, label: "Resume", icon: UploadCloud },
            { id: 2, label: "Match Score", icon: Brain },
            { id: 3, label: "Tracker", icon: Activity }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onStageClick(tab.id)}
                className={`w-full text-left p-2 rounded-xl flex items-center gap-1.5 transition-all duration-305 ${
                  activeStage === tab.id 
                    ? 'bg-brand-primary text-white shadow-md scale-[1.04]' 
                    : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Workspace panel */}
        <div className="col-span-9 pl-2 flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4 text-left py-2"
              >
                <div className="h-3 bg-slate-800 rounded-md w-1/3 animate-pulse" />
                <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-750 rounded-full animate-pulse" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-2.5 bg-slate-750 rounded w-3/4 animate-pulse" />
                      <div className="h-2 bg-slate-750 rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                  <div className="h-2 bg-slate-750 rounded w-5/6 animate-pulse" />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`stage-${activeStage}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-3 text-left"
              >
                {activeStage === 0 && (
                  <>
                    <div className="text-[9px] font-black text-slate-450 uppercase tracking-wider">Step 1: Create Account</div>
                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/50 space-y-3 shadow-lg hover:border-brand-primary/45 transition-colors duration-300">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-full flex items-center justify-center font-bold text-white text-xs">
                          PR
                        </div>
                        <div>
                          <div className="font-extrabold text-[11.5px] text-white font-sans">Priya Reddy</div>
                          <div className="text-[8.5px] text-slate-400">Software Developer</div>
                        </div>
                      </div>
                      <div className="text-[9.5px] text-emerald-450 font-bold flex items-center gap-1.5 bg-emerald-950/35 p-1.5 rounded-xl border border-emerald-900/40">
                        <Check className="w-3.5 h-3.5 text-emerald-450" /> Account Created
                      </div>
                    </div>
                  </>
                )}

                {activeStage === 1 && (
                  <>
                    <div className="text-[9px] font-black text-slate-455 uppercase tracking-wider">Step 2: Upload Resume</div>
                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/50 space-y-3 shadow-lg hover:border-brand-primary/45 transition-colors duration-300">
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-350">
                        <span className="flex items-center gap-1 font-sans"><FileText className="w-3.5 h-3.5 text-brand-secondary" /> priya_resume.pdf</span>
                        <span className="text-brand-secondary font-black">15 Skills Found</span>
                      </div>
                      <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: "100%" }} 
                          transition={{ duration: 1.0, ease: "easeInOut" }} 
                          className="bg-brand-secondary h-full rounded-full" 
                        />
                      </div>
                      <div className="text-[8.5px] text-slate-400 font-medium">
                        Skills parsed: <span className="text-white font-extrabold">Python, FastAPI, SQL, Docker</span>
                      </div>
                    </div>
                  </>
                )}

                {activeStage === 2 && (
                  <>
                    <div className="text-[9px] font-black text-slate-455 uppercase tracking-wider">Step 3: Analyze Matching</div>
                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/50 space-y-3 shadow-lg hover:border-brand-primary/45 transition-colors duration-300">
                      <div className="flex justify-between text-[10px] font-extrabold text-white">
                        <span>Backend Dev Match</span>
                        <span className="text-brand-primary font-black"><CountUpScore target={92} /></span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: "92%" }} 
                          transition={{ duration: 1.1, ease: "easeOut" }} 
                          className="bg-brand-primary h-full rounded-full" 
                        />
                      </div>
                      <div className="text-[8.5px] text-emerald-450 font-bold bg-emerald-950/45 p-1.5 rounded-xl border border-emerald-900/50 text-center">
                        ✓ Excellent fit for core database requirements
                      </div>
                    </div>
                  </>
                )}

                {activeStage === 3 && (
                  <>
                    <div className="text-[9px] font-black text-slate-455 uppercase tracking-wider">Step 4: Application Track</div>
                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/50 space-y-3.5 shadow-lg hover:border-brand-primary/45 transition-colors duration-300">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-extrabold text-[11px] text-white font-sans">Saanvika Software</div>
                          <div className="text-[8px] text-slate-400 font-medium">Applied 2 days ago</div>
                        </div>
                        <span className="text-[8px] bg-emerald-600 text-white px-2 py-0.5 rounded-lg font-black animate-bounce">HIRED 🎉</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[7.5px] font-extrabold text-slate-450 border-t border-slate-700/80 pt-2.5">
                        <span className="text-slate-350">1. Applied ✓</span>
                        <span className="text-slate-350">2. Interview ✓</span>
                        <span className="text-emerald-450 font-black">3. Hired ●</span>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-slate-500 text-[8.5px] font-bold mt-2 pt-2 border-t border-slate-800/80 text-center">
            Click sidebar elements to override stages
          </div>
        </div>
      </div>
    </div>
  );
}

function TypewriterText({ words, activeIndex, onChangeIndex, speed = 65, delay = 2800 }) {
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    let timer;
    const word = words[wordIndex];

    if (isDeleting) {
      timer = setTimeout(() => {
        setCurrentText((prev) => prev.slice(0, -1));
      }, speed / 2);
    } else {
      timer = setTimeout(() => {
        setCurrentText((prev) => word.slice(0, prev.length + 1));
      }, speed);
    }

    if (!isDeleting && currentText === word) {
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, delay);
    }

    if (isDeleting && currentText === "") {
      setIsDeleting(false);
      const nextIndex = (wordIndex + 1) % words.length;
      setWordIndex(nextIndex);
      onChangeIndex(nextIndex);
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, wordIndex, words, speed, delay, onChangeIndex]);

  return (
    <span className="text-brand-secondary font-black font-display tracking-tight text-xl sm:text-2xl">
      {currentText}
      <span className="inline-block w-1.5 h-5 bg-brand-secondary ml-1 animate-pulse" />
    </span>
  );
}

function RecruiterWorkspaceSection() {
  const [featureIdx, setFeatureIdx] = useState(0);
  const [activeMessageIdx, setActiveMessageIdx] = useState(0);

  const recruiterFeatures = [
    "Create & Publish Job Openings",
    "Flexible Candidate Evaluation",
    "Smart Candidate Ranking",
    "Interview Scheduling",
    "Centralized Hiring Workspace"
  ];

  const externalMessages = [
    "Don’t worry, ShortlistIQ lets you evaluate candidates from external sources.",
    "Upload multiple PDF resumes or a ZIP file.",
    "Import candidates from LinkedIn, Naukri, Google Forms, referrals, or Gmail.",
    "Compare every candidate using your own recruitment criteria.",
    "Shortlist the best candidates with ease."
  ];

  const sources = [
    "LinkedIn", "Naukri", "Google Forms", "Gmail", "Referrals", "Company Careers", "PDF Upload", "ZIP Upload"
  ];
  const marqueeItems = [...sources, ...sources, ...sources];

  const videoRef = useRef(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoElement.play().catch(() => {});
        } else {
          videoElement.pause();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(videoElement);
    return () => {
      if (videoElement) {
        observer.unobserve(videoElement);
      }
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setFeatureIdx((prev) => (prev + 1) % recruiterFeatures.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="recruiters-section" className="relative w-full py-20 lg:py-24 z-10 overflow-hidden bg-transparent">
      {/* Grid Pattern and floating design blobs for Recruiter Workspace */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 z-0 pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[45rem] h-[45rem] bg-brand-secondary/5 rounded-full blur-[140px] pointer-events-none z-0"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Content Column */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:col-span-5 space-y-8 text-left"
          >
            
            {/* Recruiter Workspace badge */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-secondary/10 border border-brand-secondary/20 rounded-full text-xs font-black text-brand-secondary tracking-wide uppercase">
                <Building className="w-4 h-4 text-brand-secondary" />
                <span>Recruiter Workspace</span>
              </div>
            </div>

            {/* Large premium heading */}
            <h2 className="text-4xl sm:text-6.5xl font-black tracking-tight text-slate-900 leading-[1.08] font-display">
              Hire Smarter.<br />
              <span className="bg-gradient-to-r from-brand-secondary via-[#a855f7] to-brand-primary bg-clip-text text-transparent">
                Build Better Teams.
              </span>
            </h2>

            {/* Platform Overview + Short Description */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Platform Overview
              </h3>
              <p className="text-slate-600 text-base sm:text-lg max-w-2xl leading-relaxed font-semibold">
                Create job openings, evaluate candidates based on your own recruitment requirements, organize interviews, and manage your hiring workflow from one flexible platform. Whether candidates apply directly or come from external sources, everything can be managed in one place.
              </p>
            </div>

            {/* Recruiter Features: Our platform helps you... */}
            <div className="h-10 flex items-center gap-2">
              <span className="text-slate-500 font-extrabold text-sm sm:text-base font-sans">Our platform helps you:</span>
              <div className="overflow-hidden relative h-7 w-80">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={featureIdx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="absolute text-brand-secondary font-black text-sm sm:text-base text-left will-change-transform"
                    style={{ willChange: "transform, opacity" }}
                  >
                    {recruiterFeatures[featureIdx]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Second highlighted heading */}
            <h3 className="text-2xl sm:text-3.5xl font-black text-slate-900 tracking-tight font-display pt-8 border-t border-slate-200/60">
              Thinking about evaluating candidates from external sources?
            </h3>

            {/* Auto-typing messages */}
            <div className="min-h-[36px] flex items-center">
              <TypewriterText 
                words={externalMessages}
                activeIndex={activeMessageIdx}
                onChangeIndex={setActiveMessageIdx}
              />
            </div>

            {/* Scrolling marquee */}
            <div className="relative w-full overflow-hidden bg-slate-50 py-3.5 rounded-xl border border-slate-200/60 max-w-2xl">
              <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />
              
              <div className="animate-marquee flex items-center gap-8 whitespace-nowrap">
                {marqueeItems.map((source, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs font-black text-slate-500 uppercase tracking-wider">
                    <span>{source}</span>
                    <span className="w-1.5 h-1.5 bg-brand-secondary/40 rounded-full"></span>
                  </div>
                ))}
              </div>
            </div>

            {/* End CTA button */}
            <div className="pt-4">
              <Link 
                to="/register?role=recruiter"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 hover:shadow-lg hover:shadow-brand-primary/20 text-white font-black px-8 py-4 rounded-xl shadow-premium hover:-translate-y-1 transition-all duration-300 btn-pressable"
              >
                Why Wait? Start Hiring Today <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </div>

          </motion.div>

          {/* Right Video Column */}
          <motion.div 
            className="lg:col-span-7 w-full flex justify-center items-center relative"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Soft, premium breathing glow behind the video container */}
            <div className="absolute inset-4 bg-gradient-to-tr from-brand-primary/20 via-[#a855f7]/15 to-brand-secondary/20 rounded-[40px] blur-[80px] pointer-events-none z-0" />

            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              className="w-full bg-slate-900/5 p-2 sm:p-3 rounded-[32px] border border-slate-200/80 shadow-lg shadow-brand-secondary/10 backdrop-blur-md relative z-10 overflow-hidden"
              style={{ willChange: "transform" }}
            >
              <div className="relative">
                <video
                  ref={videoRef}
                  src="/Videos/engine video.mp4"
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="w-full h-auto aspect-video rounded-[24px] shadow-premium object-cover border border-white/50 will-change-transform"
                />
                
                {/* Official ShortlistIQ logo overlay centered exactly over the bottom-right sparkle */}
                <div 
                  className="absolute pointer-events-none select-none flex items-center justify-center bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-[24%] shadow-md border border-white/25"
                  style={{
                    left: '84.6%',
                    top: '76.3%',
                    transform: 'translate(-50%, -50%)',
                    width: '3.2%',
                    aspectRatio: '1/1',
                    zIndex: 10
                  }}
                >
                  <Brain className="w-[62%] h-[62%] text-white" />
                </div>
                
                {/* Floating score badge that pulses subtly */}
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-4 right-4 bg-white/80 backdrop-blur-md border border-brand-primary/20 px-3.5 py-1.5 rounded-full text-xs font-black text-brand-primary flex items-center gap-1.5 shadow-lg shadow-brand-primary/10 z-20 pointer-events-none"
                >
                  <Brain className="w-3.5 h-3.5 text-brand-primary animate-pulse" />
                  <span>Evaluation Match Score: 92%</span>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

const fadeInUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } 
  }
};

const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
};

export default function Landing() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect if logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // --- ROTATING BENEFIT PHRASES SYSTEM ---
  const [benefitIndex, setBenefitIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBenefitIndex((prev) => (prev + 1) % benefitPhrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // --- HERO LIVE DEMO AUTOMATION (0: Profile/Upload, 1: Score Scan, 2: Apply, 3: Track/Hired) ---
  const [activeDemoStage, setActiveDemoStage] = useState(0);
  const [isManualDemoMode, setIsManualDemoMode] = useState(false);

  useEffect(() => {
    if (isManualDemoMode) return;
    const interval = setInterval(() => {
      setActiveDemoStage((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, [isManualDemoMode]);

  const handleDemoStageClick = (idx) => {
    setIsManualDemoMode(true);
    setActiveDemoStage(idx);
  };

  // --- RECRUITER WEIGHT SIMULATOR ---
  const [weights, setWeights] = useState({
    skills: 40,
    experience: 30,
    projects: 20,
    formatting: 10
  });

  const handleWeightChange = (key, value) => {
    const diff = value - weights[key];
    const otherKeys = Object.keys(weights).filter(k => k !== key);
    const newWeights = { ...weights, [key]: value };
    const sumOthers = otherKeys.reduce((sum, k) => sum + weights[k], 0);

    if (sumOthers > 0) {
      otherKeys.forEach(k => {
        const proportion = weights[k] / sumOthers;
        newWeights[k] = Math.max(0, Math.round(weights[k] - diff * proportion));
      });
    } else {
      otherKeys.forEach(k => {
        newWeights[k] = Math.max(0, Math.round((100 - value) / otherKeys.length));
      });
    }

    const currentSum = Object.values(newWeights).reduce((sum, v) => sum + v, 0);
    if (currentSum !== 100) {
      const firstOtherKey = otherKeys[0];
      newWeights[firstOtherKey] = Math.max(0, newWeights[firstOtherKey] + (100 - currentSum));
    }
    setWeights(newWeights);
  };

  const initialCandidates = [
    { name: "Priya Reddy", role: "Backend Developer", skillsVal: 95, expVal: 75, projVal: 90, formatVal: 85 },
    { name: "Amit Sharma", role: "Engineering Lead", skillsVal: 70, expVal: 95, projVal: 65, formatVal: 90 },
    { name: "Sneha Sen", role: "Web Developer", skillsVal: 85, expVal: 35, projVal: 95, formatVal: 70 }
  ];

  const calculatedCandidates = initialCandidates.map(cand => {
    const score = Math.round(
      (cand.skillsVal * weights.skills + 
       cand.expVal * weights.experience + 
       cand.projVal * weights.projects + 
       cand.formatVal * weights.formatting) / 100
    );
    return { ...cand, score };
  }).sort((a, b) => b.score - a.score);

  // --- JOB SEEKER DIAGNOSTIC WIDGET STATE ---
  const seekerJobs = [
    { id: "backend", title: "Senior Backend Developer", skills: ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"], description: "Build scalable microservices and APIs with Python." },
    { id: "frontend", title: "React UI Architect", skills: ["React", "TypeScript", "TailwindCSS", "Next.js", "Jest"], description: "Develop premium component architectures and user layouts." }
  ];

  const seekerResumes = [
    { id: "priya", name: "Priya (Backend Specialization)", skills: ["Python", "FastAPI", "Docker", "PostgreSQL"], missing: ["AWS"], score: 88, insight: "Excellent backend match. Missing AWS cloud deployment experience, but holds complete database and container credentials." },
    { id: "rahul", name: "Rahul (Frontend Specialization)", skills: ["React", "JavaScript", "HTML", "CSS", "TailwindCSS"], missing: ["TypeScript", "Next.js", "Jest"], score: 65, insight: "Good foundational React developer. Needs to add TypeScript, Jest testing, and Next.js to match team vacancies." }
  ];

  const [selectedSeekerJobId, setSelectedSeekerJobId] = useState("backend");
  const [selectedSeekerResumeId, setSelectedSeekerResumeId] = useState("priya");
  const [isSeekerAnalyzing, setIsSeekerAnalyzing] = useState(false);
  const [seekerResult, setSeekerResult] = useState(seekerResumes[0]);

  const runSeekerAnalysis = () => {
    setIsSeekerAnalyzing(true);
    setSeekerResult(null);

    setTimeout(() => {
      if (selectedSeekerJobId === "backend") {
        if (selectedSeekerResumeId === "priya") {
          setSeekerResult(seekerResumes[0]);
        } else {
          setSeekerResult({
            name: "Rahul (Frontend Specialization)",
            skills: [],
            missing: ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
            score: 10,
            insight: "Low alignment. Resume focuses entirely on frontend framework scripts and lacks backend services."
          });
        }
      } else {
        if (selectedSeekerResumeId === "rahul") {
          setSeekerResult(seekerResumes[1]);
        } else {
          setSeekerResult({
            name: "Priya (Backend Specialization)",
            skills: ["React"],
            missing: ["TypeScript", "TailwindCSS", "Next.js", "Jest"],
            score: 25,
            insight: "Low alignment. Candidate has backend skills but lacks modern user interface frameworks like TailwindCSS and Jest."
          });
        }
      }
      setIsSeekerAnalyzing(false);
    }, 700);
  };






  // --- FEATURED JOBS ---
  const mockJobs = [
    { 
      id: 1, 
      title: "Lead Frontend Developer", 
      company: "Saanvika Software Solutions", 
      location: "Hyderabad", 
      workMode: "Hybrid",
      experience: "5+ years",
      skills: ["React", "TypeScript", "TailwindCSS", "Vite"], 
      matchScore: 96,
      aiRecommendation: "AI Recommended – Excellent match based on your skills and experience."
    },
    { 
      id: 2, 
      title: "Senior Python Developer", 
      company: "Infosys", 
      location: "Bengaluru", 
      workMode: "On-site",
      experience: "4+ years",
      skills: ["Python", "FastAPI", "PostgreSQL", "Docker"], 
      matchScore: 92,
      aiRecommendation: "AI Recommended – High database and backend engineering alignment."
    },
    { 
      id: 3, 
      title: "Lead Product Manager", 
      company: "TCS", 
      location: "Pune", 
      workMode: "Hybrid",
      experience: "6+ years",
      skills: ["Roadmap Planning", "Agile", "User Research", "Analytics"], 
      matchScore: 89,
      aiRecommendation: "AI Recommended – Strong project execution and product strategy fit."
    },
    { 
      id: 4, 
      title: "Data Analyst", 
      company: "Wipro", 
      location: "Chennai", 
      workMode: "Remote",
      experience: "2+ years",
      skills: ["Python", "SQL", "Tableau", "Pandas"], 
      matchScore: 94,
      aiRecommendation: "AI Recommended – Excellent match based on your analytics skills."
    }
  ];

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [explorerResults, setExplorerResults] = useState(mockJobs);

  const handleSearch = (e) => {
    e?.preventDefault();
    const query = searchQuery.toLowerCase();
    const filtered = mockJobs.filter(job => {
      const matchesText = job.title.toLowerCase().includes(query) || 
                          job.company.toLowerCase().includes(query) ||
                          job.skills.some(s => s.toLowerCase().includes(query));
      
      if (categoryFilter === 'all') return matchesText;
      if (categoryFilter === 'engineering') {
        return matchesText && (job.title.includes('Developer') || job.title.includes('Engineer'));
      }
      if (categoryFilter === 'product') {
        return matchesText && job.title.includes('Manager');
      }
      if (categoryFilter === 'analytics') {
        return matchesText && job.title.includes('Analyst');
      }
      return matchesText;
    });
    setExplorerResults(filtered);
  };

  useEffect(() => {
    handleSearch();
  }, [categoryFilter]);

  // --- FAQS ACCORDION ---
  const faqs = [
    {
      q: "What is ShortlistIQ?",
      a: "ShortlistIQ is an easy-to-use job application and recruitment platform. Job seekers can build their resume, compare it to target jobs to see score feedback, and track their application progress. Recruiters can post jobs, screen candidates with custom weight criteria, and process batches of offline resumes instantly."
    },
    {
      q: "Can recruiters screen candidates without having them register?",
      a: "Yes! Recruiters can create 'External Hiring' jobs that are completely private. They upload resumes as PDFs or inside a single ZIP file. The system extracts the resumes, generates scores, and provides a candidate ranking list without requiring any signups."
    },
    {
      q: "How does the resume matching score work?",
      a: "Our matching engine checks the candidate's resume content against the requirements of the job vacancy. It checks for relevant skills, formatting, and work experience. Recruiters have complete control and can adjust the weights of each category in their settings."
    },
    {
      q: "Can job seekers track their application status?",
      a: "Yes. Candidates can see real-time updates of their application status (such as 'Submitted', 'Under Review', 'Interview Scheduled', or 'Offered') directly on their dashboard timeline."
    }
  ];

  const [activeFaqIdx, setActiveFaqIdx] = useState(null);

  const toggleFaq = (idx) => {
    setActiveFaqIdx(activeFaqIdx === idx ? null : idx);
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#F8FAFC] overflow-hidden text-slate-800 font-sans selection:bg-brand-primary/30 scroll-smooth">
      
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 0.8s infinite;
        }
        @keyframes marqueeShift {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marqueeShift 25s linear infinite;
          will-change: transform;
        }
      `}</style>

      {/* Grid Pattern and floating design blobs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 z-0"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[55rem] h-[55rem] bg-gradient-to-tr from-brand-primary/10 to-brand-secondary/5 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute top-[40%] right-[-10%] w-[45rem] h-[45rem] bg-brand-secondary/5 rounded-full blur-[140px] pointer-events-none z-0"></div>

      {/* ======================================= */}
      {/* 1. HERO SECTION (Clean, Premium, outcome-focused) */}
      {/* ======================================= */}
      <section id="hero-section" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 md:pt-16 md:pb-28 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Hero Left Content: Stripped of documentation details */}
          <motion.div 
            className="lg:col-span-7 space-y-6 text-left"
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: -10 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-[11px] font-black text-brand-primary tracking-wide"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-primary animate-pulse" />
              <span>Job Match Platform for Candidates</span>
            </motion.div>

            <motion.h1 
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
              }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.1] font-display"
            >
              Your Career Starts Here.<br />
              <span className="bg-gradient-to-r from-brand-primary via-brand-secondary to-[#a855f7] bg-clip-text text-transparent">
                Find. Apply. Get Hired.
              </span>
            </motion.h1>

            {/* Subtitle: 2-3 Simple Lines explaining why to create an account */}
            <motion.p 
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
              }}
              className="text-slate-600 text-base sm:text-lg max-w-xl leading-relaxed font-semibold"
            >
              ShortlistIQ helps job seekers discover the right jobs, improve their resume before applying, track every application, and connect with recruiters—all in one place.
            </motion.p>

            {/* Rotating dynamic benefits list */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
              }}
              className="h-10 flex items-center gap-2"
            >
              <span className="text-slate-500 font-extrabold text-sm sm:text-base font-sans">Our platform helps you:</span>
              <div className="overflow-hidden relative h-7 w-72">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={benefitIndex}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="absolute text-brand-primary font-black text-sm sm:text-base text-left"
                  >
                    {benefitPhrases[benefitIndex]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
              }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-2"
            >
              <Link 
                to="/register?role=candidate"
                className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 hover:shadow-lg hover:shadow-brand-primary/20 text-white font-black px-8 py-4 rounded-xl shadow-premium hover:-translate-y-1 transition-all duration-300 btn-pressable"
              >
                Create Free Account <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
              <button 
                onClick={() => scrollToSection('recruiters-section')}
                className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-brand-primary text-slate-700 hover:text-slate-900 font-black px-8 py-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 btn-pressable"
              >
                I'm Hiring Talent
              </button>
            </motion.div>

            {/* Section Anchors */}
            <motion.div 
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { duration: 0.5, delay: 0.3 } }
              }}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-bold text-slate-400 border-t border-slate-200/60 pt-6 mt-6 max-w-lg"
            >
              <button onClick={() => scrollToSection('candidate-features-section')} className="hover:text-brand-primary transition-colors uppercase tracking-wider">Candidate Features</button>
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
              <button onClick={() => scrollToSection('how-it-works-section')} className="hover:text-brand-primary transition-colors uppercase tracking-wider">How It Works</button>
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
              <button onClick={() => scrollToSection('recruiters-section')} className="hover:text-brand-primary transition-colors uppercase tracking-wider">For Recruiters</button>
            </motion.div>
          </motion.div>

          {/* Hero Right Graphic: Simulated Candidate Dashboard in Action */}
          <motion.div 
            className="lg:col-span-5 w-full flex justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
          >
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              className="w-full flex justify-center"
            >
              <DashboardSimulator 
                activeStage={activeDemoStage} 
                onStageClick={handleDemoStageClick} 
              />
            </motion.div>
          </motion.div>
        </div>
      </section>
 
      {/* ======================================= */}
      {/* 2. WHAT CANDIDATES GET SECTION */}
      {/* ======================================= */}
      <section id="candidate-features-section" className="relative w-full py-20 lg:py-24 z-10 bg-transparent">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 z-0 pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center space-y-3 mb-12 max-w-xl mx-auto"
          >
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-xs font-black text-brand-primary tracking-wide uppercase">
              <Users className="w-3.5 h-3.5 text-brand-primary" />
              <span>Candidate Experience</span>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight font-display">Everything You Need for Your Job Search</h2>
            <p className="text-slate-500 text-sm leading-relaxed font-semibold">
              ShortlistIQ guides you step-by-step to build a standout profile, optimize your resume with smart matching, and land your ideal role.
            </p>
          </motion.div>

          <motion.div 
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto"
          >
            {[
              {
                step: "Step 1",
                title: "Create Your Profile",
                desc: "Sign up in seconds to access your customized dashboard.",
                icon: UserPlus,
                color: "text-brand-primary bg-brand-primary/10 group-hover:bg-brand-primary group-hover:text-white"
              },
              {
                step: "Step 2",
                title: "Build or Upload Your Resume",
                desc: "Upload your resume or build a clean profile from scratch.",
                icon: UploadCloud,
                color: "text-brand-secondary bg-brand-secondary/10 group-hover:bg-brand-secondary group-hover:text-white"
              },
              {
                step: "Step 3",
                title: "Check Your ATS Score",
                desc: "Instantly scan how well your resume matches target jobs.",
                icon: Brain,
                color: "text-purple-600 bg-purple-50 group-hover:bg-purple-600 group-hover:text-white"
              },
              {
                step: "Step 4",
                title: "Improve with AI Suggestions",
                desc: "Get personalized skill and formatting tips to stand out.",
                icon: Sparkles,
                color: "text-amber-600 bg-amber-50 group-hover:bg-amber-550 group-hover:text-white"
              },
              {
                step: "Step 5",
                title: "Discover Matching Jobs",
                desc: "Explore curated openings tailored exactly to your skills.",
                icon: Briefcase,
                color: "text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white"
              },
              {
                step: "Step 6",
                title: "Track Every Application",
                desc: "Monitor status updates in real time until you get hired.",
                icon: Activity,
                color: "text-emerald-600 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white"
              }
            ].map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div 
                  key={idx} 
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
                  }}
                  className="group relative bg-white/80 border border-slate-200/80 rounded-2xl p-5 space-y-3 hover:border-brand-primary/40 hover:shadow-premium hover:-translate-y-1.5 transition-all duration-300 ease-out text-left overflow-hidden cursor-pointer backdrop-blur-md shadow-sm will-change-transform"
                  style={{ willChange: "transform, opacity" }}
                >
                  {/* Highlight Glow Effect on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-550 rounded-2xl pointer-events-none" />

                  <div className="flex justify-between items-center relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-brand-primary transition-colors">
                      {feat.step}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl inline-block transition-all duration-300 ${feat.color} relative z-10`}>
                    <Icon className="w-5 h-5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" />
                  </div>

                  <div className="space-y-1 relative z-10">
                    <h4 className="font-extrabold text-slate-800 text-sm group-hover:text-slate-900 transition-colors">
                      {feat.title}
                    </h4>
                    <p className="text-slate-500 text-[11.5px] leading-relaxed font-semibold group-hover:text-slate-600 transition-colors">
                      {feat.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>
      <RecruiterWorkspaceSection />

      {/* ======================================= */}
      {/* 6. FEATURED CAREERS BOARD */}
      {/* ======================================= */}
      <section id="jobs-section" className="relative w-full py-20 lg:py-24 border-t border-slate-200/60 z-10 bg-[#F8FAFC]">
        {/* Subtle background grid pattern for this section */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 z-0 pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          
          <div className="text-center space-y-3 mb-16 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-xs font-black text-brand-primary tracking-wide uppercase">
              <Briefcase className="w-4 h-4 text-brand-primary" />
              <span>Job Opportunities</span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight font-display">
              Discover Your Next Opportunity
            </h2>
            
            <p className="text-slate-600 text-sm leading-relaxed font-semibold">
              Explore job vacancies matched in real-time by our AI matching engine. Compare your profile and see your compatibility instantly.
            </p>
          </div>

          {/* Redesigned Job Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-3xl mx-auto mb-12"
          >
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3 p-2 bg-white/90 border border-slate-200/80 rounded-2xl shadow-premium">
              <div className="relative flex-1 w-full flex items-center pl-3">
                <Search className="text-slate-400 w-5 h-5 mr-2 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search by title, company, or tech stack..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none"
                />
              </div>
              
              <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

              <div className="w-full sm:w-auto flex items-center gap-3 pr-1">
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full sm:w-auto bg-transparent border-0 py-2.5 pl-2 pr-8 text-xs font-bold text-slate-600 focus:outline-none cursor-pointer focus:ring-0"
                >
                  <option value="all">All Fields</option>
                  <option value="engineering">Engineering</option>
                  <option value="product">Product</option>
                  <option value="analytics">Analytics</option>
                </select>

                <button 
                  type="submit" 
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl text-xs font-black shrink-0 shadow-sm hover:opacity-95 transition-opacity btn-pressable"
                >
                  Search Jobs
                </button>
              </div>
            </form>
          </motion.div>

          {/* Redesigned Vacancy Card Grid */}
          <motion.div 
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full"
          >
            {explorerResults.map((job) => {
              const companyGradients = {
                "Saanvika Software Solutions": "from-blue-600 to-cyan-500",
                "Infosys": "from-purple-600 to-indigo-500",
                "TCS": "from-indigo-600 to-blue-500",
                "Wipro": "from-pink-600 to-rose-500"
              };
              const gradient = companyGradients[job.company] || "from-brand-primary to-brand-secondary";
              const firstLetter = job.company.charAt(0);

              return (
                <motion.div 
                  key={job.id} 
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
                  }}
                  className="group bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between hover:border-brand-primary/30 hover:shadow-premium hover:-translate-y-1.5 transition-all duration-300 ease-out text-left relative overflow-hidden will-change-transform"
                  style={{ willChange: "transform, opacity" }}
                >
                  {/* Highlight Glow Effect on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-550 rounded-3xl pointer-events-none" />

                  {/* Top section: Logo, Title, and AI badges */}
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        {/* Company Logo representation */}
                        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-extrabold text-sm shadow-md`}>
                          {firstLetter}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-sm leading-tight hover:text-brand-primary transition-colors cursor-pointer">
                            {job.title}
                          </h4>
                          <p className="text-[10px] text-slate-450 font-bold uppercase mt-1">
                            {job.company}
                          </p>
                        </div>
                      </div>

                      {/* AI Badges */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[9px] bg-gradient-to-r from-brand-primary to-brand-secondary text-white px-2 py-0.5 rounded-md font-black tracking-wide text-center shadow-sm uppercase">
                          AI Recommended
                        </span>
                        <span className="text-[10.5px] bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded-lg font-black text-brand-primary flex items-center gap-1 shadow-sm">
                          <Brain className="w-3 h-3 text-brand-primary animate-pulse" />
                          <span>{job.matchScore}% Match</span>
                        </span>
                      </div>
                    </div>

                    {/* Job Details Row: Location, Work Mode, Experience */}
                    <div className="flex flex-wrap items-center gap-2 mb-4 text-[10px] font-bold text-slate-500 relative z-10">
                      <span className="flex items-center gap-1 bg-slate-50 border border-slate-150 rounded-lg px-2 py-0.5">
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>{job.location}</span>
                      </span>
                      <span className="flex items-center gap-1 bg-slate-50 border border-slate-150 rounded-lg px-2 py-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{job.workMode}</span>
                      </span>
                      <span className="flex items-center gap-1 bg-slate-50 border border-slate-150 rounded-lg px-2 py-0.5">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        <span>{job.experience}</span>
                      </span>
                    </div>

                    {/* Tech Stack Chips */}
                    <div className="flex flex-wrap gap-1.5 mb-5 relative z-10">
                      {job.skills.map((skill, idx) => (
                        <span 
                          key={idx} 
                          className="text-[9px] bg-brand-secondary/5 border border-brand-secondary/15 text-brand-secondary px-2.5 py-1 rounded-lg font-bold"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* AI Recommendation Message & Action Button */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-auto relative z-10">
                    {/* Recommendation Badge/Text */}
                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-150/60 p-2 rounded-xl text-[9.5px] font-extrabold text-emerald-800 leading-normal flex-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{job.aiRecommendation}</span>
                    </div>
                    
                    <Link 
                      to="/register?role=candidate" 
                      className="group/btn inline-flex items-center justify-center gap-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all shrink-0 hover:shadow-lg hover:shadow-slate-900/25 btn-pressable"
                    >
                      Apply Now <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

        </div>
      </section>

      {/* ======================================= */}
      {/* 7. FAQs SECTION */}
      {/* ======================================= */}
      <section id="faq-section" className="relative w-full py-20 lg:py-24 border-t border-slate-200/60 z-10 bg-transparent">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-15 z-0 pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 z-10"
        >
          
          <div className="text-center space-y-3 mb-16">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-xs font-black text-brand-primary tracking-wide uppercase">
              <HelpCircle className="w-4 h-4 text-brand-primary" />
              <span>FAQ</span>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight font-display">Frequently Asked Questions</h2>
            <p className="text-slate-600 text-sm font-semibold max-w-xl mx-auto leading-relaxed">
              Common questions about application tracking, weights settings, and offline ZIP resume screening.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                  activeFaqIdx === idx 
                    ? 'bg-white border-brand-primary/30 shadow-premium' 
                    : 'bg-white/80 border-slate-200/80 hover:border-slate-350 hover:bg-white shadow-sm backdrop-blur-md'
                }`}
              >
                <button 
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-5 text-left flex justify-between items-center text-sm font-black text-slate-800 transition-colors duration-200 focus:outline-none"
                >
                  <span className={activeFaqIdx === idx ? 'text-brand-primary' : 'text-slate-800'}>{faq.q}</span>
                  <div className={`p-1.5 rounded-full transition-transform duration-300 ${
                    activeFaqIdx === idx ? 'bg-brand-primary/10 text-brand-primary' : 'bg-slate-200/50 text-slate-500'
                  }`}>
                    <Plus className={`w-4 h-4 shrink-0 transition-transform duration-300 ${activeFaqIdx === idx ? 'rotate-[135deg] text-brand-primary' : 'text-slate-500'}`} />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {activeFaqIdx === idx && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="px-6 pb-6 pt-1 text-xs text-slate-600 font-semibold leading-relaxed text-left border-t border-slate-100/50">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

        </motion.div>
      </section>

      {/* ======================================= */}
      {/* ======================================= */}
      {/* 9. CONTACT FORM */}
      {/* ======================================= */}
      <section id="contact-section" className="relative w-full py-20 lg:py-24 border-t border-slate-200/60 z-10 bg-transparent">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 z-0 pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Column content */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="lg:col-span-6 space-y-8 text-left"
            >
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-xs font-black text-brand-primary tracking-wide uppercase">
                <Mail className="w-4 h-4 text-brand-primary" />
                <span>Get In Touch</span>
              </div>

              <h2 className="text-4xl sm:text-5.5xl font-black text-slate-900 tracking-tight font-display leading-[1.1]">
                Start Hiring Smarter Today
              </h2>
              
              <p className="text-slate-550 text-sm sm:text-base leading-relaxed font-semibold">
                We provide the tools to simplify application tracks, verify recruiters, and evaluate professional qualifications. Whether you are looking for your next career move or looking to hire elite candidates, the workspace connects both sides efficiently.
              </p>
              
              <div className="space-y-4 pt-2">
                {[
                  { text: "AI-powered candidate evaluation", icon: Brain, color: "text-brand-primary bg-brand-primary/10" },
                  { text: "Quick & Intelligent Evaluation modes", icon: Zap, color: "text-brand-secondary bg-brand-secondary/10" },
                  { text: "Centralized hiring workspace", icon: Layout, color: "text-purple-600 bg-purple-50" },
                  { text: "Smart candidate ranking", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" }
                ].map((item, idx) => {
                  const BenefitIcon = item.icon;
                  return (
                    <div key={idx} className="flex items-center gap-3.5 text-xs font-bold text-slate-700">
                      <div className={`p-2 rounded-xl shrink-0 ${item.color}`}>
                        <BenefitIcon className="w-4 h-4" />
                      </div>
                      <span>{item.text}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200/80">
                <div className="flex items-center gap-3 bg-white/40 border border-white/60 p-4 rounded-2xl flex-1 backdrop-blur-md shadow-sm hover:border-brand-primary/20 hover:shadow-md transition-all duration-300">
                  <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Email Support</p>
                    <a href="mailto:shortlistiq.official@gmail.com" className="text-xs font-extrabold text-slate-700 hover:text-brand-primary transition-colors">
                      shortlistiq.official@gmail.com
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-white/40 border border-white/60 p-4 rounded-2xl flex-1 backdrop-blur-md shadow-sm hover:border-brand-secondary/20 hover:shadow-md transition-all duration-300">
                  <div className="w-9 h-9 rounded-xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary shrink-0">
                    <Globe className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Official Website</p>
                    <a href="https://shortlistiq-dev.vercel.app" target="_blank" rel="noreferrer" className="text-xs font-extrabold text-slate-700 hover:text-brand-secondary transition-colors">
                      https://shortlistiq-dev.vercel.app
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Contact Form */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="lg:col-span-6 relative"
            >
              {/* Subtle blue/cyan glow behind the form */}
              <div className="absolute -inset-2 bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 rounded-[2.5rem] blur-3xl pointer-events-none z-0" />
              
              <div className="relative z-10 bg-white/40 border border-white/60 rounded-[2.5rem] p-8 space-y-5 shadow-premium backdrop-blur-xl">
                <h3 className="font-extrabold text-slate-900 text-lg">Inquire About ShortlistIQ</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Have questions about recruiter vetting or custom setup workflows? Let us know.
                </p>
                
                <form className="space-y-4 relative z-10" onSubmit={(e) => { e.preventDefault(); alert("Message sent successfully!"); e.target.reset(); }}>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Your Name" 
                      required
                      className="w-full bg-white/40 border border-slate-200/80 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 focus:shadow-md focus:shadow-brand-primary/10 transition-all duration-300" 
                    />
                  </div>
                  <div>
                    <input 
                      type="email" 
                      placeholder="Email Address" 
                      required
                      className="w-full bg-white/40 border border-slate-200/80 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 focus:shadow-md focus:shadow-brand-primary/10 transition-all duration-300" 
                    />
                  </div>
                  <div>
                    <textarea 
                      rows="4" 
                      placeholder="Inquiry details..." 
                      required
                      className="w-full bg-white/40 border border-slate-200/80 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 focus:shadow-md focus:shadow-brand-primary/10 transition-all duration-300 resize-none" 
                    ></textarea>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-primary bg-[size:200%_auto] hover:bg-right text-white py-3.5 rounded-xl font-black shadow-premium hover:shadow-brand-primary/30 text-xs transition-all duration-500 hover:-translate-y-0.5 btn-pressable"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </motion.div>

          </div>
        </div>
      </section>
    </div>
  );
}
