import React, { useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Brain, 
  Cpu, 
  Briefcase, 
  Users, 
  CheckCircle2, 
  Sparkles, 
  Sliders, 
  ShieldCheck, 
  Activity, 
  FileText, 
  ChevronRight,
  TrendingUp,
  FileCheck
} from 'lucide-react';

export default function Landing() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // If user is already logged in, redirect to their dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  };

  const features = [
    {
      icon: Brain,
      title: "Gemini-Powered LLM Screening",
      description: "Uses Google Gemini model families for deep semantic context parsing rather than simple regex keyword matching.",
      color: "text-brand-primary",
      bgColor: "bg-brand-primary/10"
    },
    {
      icon: Sliders,
      title: "Dynamic Evaluation Settings",
      description: "Recruiters can set match weights across extracted skills, projects, and work experiences to calculate specialized match scores.",
      color: "text-brand-secondary",
      bgColor: "bg-brand-secondary/10"
    },
    {
      icon: Users,
      title: "Executive Recruiter Dashboard",
      description: "Funnel visualizers, applicant metrics, and a clean candidates registry database segmented by AI scores.",
      color: "text-brand-accent",
      bgColor: "bg-brand-accent/10"
    },
    {
      icon: FileCheck,
      title: "Parsed Resume Insights",
      description: "Extracts structured metadata, years of experience, and compares it to vacancy targets with visual lists of missing skills.",
      color: "text-brand-success",
      bgColor: "bg-brand-success/10"
    },
    {
      icon: ShieldCheck,
      title: "Admin Control Center",
      description: "Centralized Gemini API configuration management, activity monitoring logs, database statuses, and registration controls.",
      color: "text-brand-warning",
      bgColor: "bg-brand-warning/10"
    },
    {
      icon: Activity,
      title: "System Health Diagnostics",
      description: "Full trace auditing logs tracking applicant files, vacancies creation, and evaluation timelines.",
      color: "text-[#a855f7]",
      bgColor: "bg-[#a855f7]/10"
    }
  ];

  const steps = [
    {
      num: "01",
      title: "Post Job Vacancies",
      description: "Define vacancy details, requirements, and minimum match thresholds for shortlists."
    },
    {
      num: "02",
      title: "Candidate Resumes Upload",
      description: "Candidates upload credentials or recruiters batch upload PDFs to associate with active listings."
    },
    {
      num: "03",
      title: "AI Semantic Evaluation",
      description: "Gemini parser breaks down qualifications, identifies missing requirements, and scores fit."
    },
    {
      num: "04",
      title: "Finalize Shortlists",
      description: "Review candidates on staggered animated boards, move status to interviews, and export CSV lists."
    }
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-brand-bg overflow-hidden text-brand-textPrimary font-sans selection:bg-brand-primary/30">
      
      {/* Background Grid & Decorative Blur Nodes */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-65"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[50rem] h-[50rem] bg-brand-primary/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-[40%] right-[-10%] w-[45rem] h-[45rem] bg-brand-secondary/5 rounded-full blur-[140px] pointer-events-none"></div>
      
      {/* HERO SECTION */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-28 md:pb-24">
        <motion.div 
          className="text-center space-y-6 max-w-4xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Badge */}
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-secondary/10 border border-brand-secondary/20 rounded-full text-xs font-semibold text-brand-secondary"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>ShortlistIQ v2.0 Released</span>
          </motion.div>

          {/* Heading */}
          <motion.h1 
            variants={itemVariants}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight text-brand-textPrimary leading-tight font-display"
          >
            Smarter resume shortlisting<br />
            <span className="bg-gradient-to-r from-brand-primary via-brand-secondary to-[#a855f7] bg-clip-text text-transparent">
              powered by Gemini AI
            </span>
          </motion.h1>

          {/* Tagline */}
          <motion.p 
            variants={itemVariants}
            className="text-brand-textSecondary text-base sm:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Transition from manual resume keyword searching to semantic LLM evaluation. 
            ShortlistIQ extracts skills, scores match weightings, and outputs staggered ranking boards in seconds.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link 
              to="/register" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white font-bold px-8 py-3.5 rounded-xl shadow-premium hover:-translate-y-0.5 transition-all duration-200"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              to="/login" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-brand-border/80 hover:border-brand-primary text-brand-textSecondary hover:text-brand-textPrimary font-semibold px-8 py-3.5 rounded-xl hover:bg-slate-50 transition-all duration-200"
            >
              Recruiter Login
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* SHOWCASE/MOCKUP SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative max-w-5xl mx-auto glass-panel border border-brand-border rounded-3xl p-4 md:p-6 shadow-premium overflow-hidden bg-white/70"
        >
          {/* Mockup Top Controls Bar */}
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-4 mb-6 text-xs text-brand-textSecondary">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-brand-danger"></span>
              <span className="w-3 h-3 rounded-full bg-brand-warning"></span>
              <span className="w-3 h-3 rounded-full bg-brand-success"></span>
              <span className="ml-3 font-semibold text-brand-textPrimary/80">shortlistiq.recruiter.console</span>
            </div>
            <div className="flex items-center gap-2.5 bg-brand-bg px-3 py-1 rounded-lg border border-brand-border/60 font-semibold text-brand-primary">
              <Brain className="w-3.5 h-3.5" />
              <span>Gemini 1.5 Flash Active</span>
            </div>
          </div>

          {/* Grid Mocking Recruiter Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Candidate Card #1 */}
            <div className="bg-white border border-brand-primary/30 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-xl"></div>
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-brand-textPrimary text-sm">Sarah Jenkins</h4>
                    <span className="text-[10px] text-brand-textSecondary">Lead Backend Engineer</span>
                  </div>
                  <span className="bg-brand-success/15 border border-brand-success/35 text-brand-success text-[10px] font-bold px-2 py-0.5 rounded-lg">Rank #1</span>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="w-10 h-10 rounded-full border-2 border-brand-success/30 flex items-center justify-center text-xs font-bold text-brand-success bg-brand-success/5">
                    97%
                  </div>
                  <span className="text-xs text-brand-textSecondary">Outstanding Skill Fit</span>
                </div>

                <div className="mt-4 space-y-1.5">
                  <span className="text-[9px] text-brand-textSecondary uppercase font-bold block">Matched Skills</span>
                  <div className="flex flex-wrap gap-1">
                    {["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"].map((s, i) => (
                      <span key={i} className="text-[9px] bg-slate-50 text-brand-textSecondary px-1.5 py-0.5 rounded border border-brand-border">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-brand-border/40 flex justify-between items-center text-[10px]">
                <span className="text-brand-textSecondary">Exp: 8 Years</span>
                <span className="text-brand-primary font-bold">Highly Recommended</span>
              </div>
            </div>

            {/* Candidate Card #2 */}
            <div className="bg-white border border-brand-border rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-brand-textPrimary text-sm">Alex Rivera</h4>
                    <span className="text-[10px] text-brand-textSecondary">Full Stack Developer</span>
                  </div>
                  <span className="bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-bold px-2 py-0.5 rounded-lg">Rank #2</span>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="w-10 h-10 rounded-full border-2 border-brand-primary/30 flex items-center justify-center text-xs font-bold text-brand-primary bg-brand-primary/5">
                    86%
                  </div>
                  <span className="text-xs text-brand-textSecondary">Strong Projects Match</span>
                </div>

                <div className="mt-4 space-y-1.5">
                  <span className="text-[9px] text-brand-textSecondary uppercase font-bold block">Matched Skills</span>
                  <div className="flex flex-wrap gap-1">
                    {["React", "Node.js", "TypeScript", "Next.js", "SQL"].map((s, i) => (
                      <span key={i} className="text-[9px] bg-slate-50 text-brand-textSecondary px-1.5 py-0.5 rounded border border-brand-border">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-brand-border/40 flex justify-between items-center text-[10px]">
                <span className="text-brand-textSecondary">Exp: 4 Years</span>
                <span className="text-brand-secondary font-bold">Recommended</span>
              </div>
            </div>

            {/* Candidate Card #3 */}
            <div className="bg-white border border-brand-border rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-brand-textPrimary text-sm">Marcus Vance</h4>
                    <span className="text-[10px] text-brand-textSecondary">React UI Engineer</span>
                  </div>
                  <span className="bg-brand-warning/10 border border-brand-warning/20 text-brand-warning text-[10px] font-bold px-2 py-0.5 rounded-lg">Rank #3</span>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="w-10 h-10 rounded-full border-2 border-brand-warning/30 flex items-center justify-center text-xs font-bold text-brand-warning bg-brand-warning/5">
                    74%
                  </div>
                  <span className="text-xs text-brand-textSecondary">Requires Skill Upgrades</span>
                </div>

                <div className="mt-4 space-y-1.5">
                  <span className="text-[9px] text-brand-textSecondary uppercase font-bold block">Missing Skills</span>
                  <div className="flex flex-wrap gap-1">
                    {["TypeScript", "GraphQL"].map((s, i) => (
                      <span key={i} className="text-[9px] bg-slate-50 text-brand-danger px-1.5 py-0.5 rounded border border-brand-danger/25">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-brand-border/40 flex justify-between items-center text-[10px]">
                <span className="text-brand-textSecondary">Exp: 3 Years</span>
                <span className="text-brand-warning font-bold">Consider</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-brand-border/80">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-textPrimary font-display">How ShortlistIQ Works</h2>
          <p className="text-brand-textSecondary max-w-xl mx-auto text-sm leading-relaxed">
            ShortlistIQ integrates seamlessly into standard hiring funnels, automating matching evaluations with advanced LLM semantic screening.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {steps.map((step, idx) => (
            <motion.div 
              key={idx}
              className="bg-white border border-brand-border rounded-2xl p-6 relative hover:border-brand-primary/30 transition-all duration-300 group shadow-sm"
              whileHover={{ y: -4 }}
            >
              <div className="text-3xl font-extrabold text-brand-primary/20 group-hover:text-brand-primary/40 transition-colors mb-4">{step.num}</div>
              <h3 className="font-bold text-brand-textPrimary text-base mb-2 flex items-center gap-1.5">
                {step.title}
              </h3>
              <p className="text-brand-textSecondary text-xs leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-brand-border/80 bg-slate-50">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-textPrimary font-display">Designed for Recruiter Executives</h2>
          <p className="text-brand-textSecondary max-w-xl mx-auto text-sm leading-relaxed">
            Ditch generic matching algorithms. ShortlistIQ provides granular configurations and system traceability settings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div 
                key={idx}
                className="glass-panel border border-brand-border rounded-2xl p-6 space-y-4 hover:border-brand-primary/20 hover:shadow-premium transition-all duration-300"
                whileHover={{ scale: 1.02 }}
              >
                <div className={`p-3 rounded-xl w-fit ${feat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${feat.color}`} />
                </div>
                <h3 className="font-bold text-brand-textPrimary text-base">{feat.title}</h3>
                <p className="text-brand-textSecondary text-xs leading-relaxed">{feat.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CONTACT/ABOUT SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-brand-border/80">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-brand-textPrimary font-display">Ready to streamline your hiring pipeline?</h2>
            <p className="text-brand-textSecondary text-sm leading-relaxed">
              ShortlistIQ is an academic platform prototype exploring the limits of LLM semantic scanning in Applicant Tracking Systems. By combining custom weights and model configurations, it achieves extreme filtering accuracy.
            </p>
            <div className="space-y-3 text-xs text-brand-textSecondary">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-brand-success" />
                <span>Zero configuration onboarding</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-brand-success" />
                <span>Integrated Google Gemini API connectors</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-brand-success" />
                <span>Real-time platform activity diagnostics</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-brand-border rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
            <h3 className="font-bold text-brand-textPrimary text-lg">Send us a message</h3>
            <p className="text-xs text-brand-textSecondary">Have questions about integrations or model performance? Contact us today.</p>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); alert("Feedback message received!"); }}>
              <div>
                <input 
                  type="text" 
                  placeholder="Your Name" 
                  className="w-full bg-slate-50 border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary" 
                  required
                />
              </div>
              <div>
                <input 
                  type="email" 
                  placeholder="Your Email Address" 
                  className="w-full bg-slate-50 border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary" 
                  required
                />
              </div>
              <div>
                <textarea 
                  rows="3" 
                  placeholder="Your Inquiry..." 
                  className="w-full bg-slate-50 border border-brand-border rounded-xl px-4 py-2.5 text-brand-textPrimary placeholder-brand-textSecondary text-xs focus:outline-none focus:border-brand-primary resize-none" 
                  required
                ></textarea>
              </div>
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white py-2.5 rounded-xl font-bold shadow-premium text-xs transition-opacity hover:opacity-95"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>
      
    </div>
  );
}
