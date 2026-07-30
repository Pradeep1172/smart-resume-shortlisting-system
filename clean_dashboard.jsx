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
                        Γ£ô Excellent fit for core database requirements
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
                        <span className="text-[8px] bg-emerald-600 text-white px-2 py-0.5 rounded-lg font-black animate-bounce">HIRED ≡ƒÄë</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[7.5px] font-extrabold text-slate-450 border-t border-slate-700/80 pt-2.5">
                        <span className="text-slate-350">1. Applied Γ£ô</span>
                        <span className="text-slate-350">2. Interview Γ£ô</span>
                        <span className="text-emerald-450 font-black">3. Hired ΓùÅ</span>
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
