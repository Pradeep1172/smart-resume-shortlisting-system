      {/* 1. HERO SECTION (Clean, Premium, outcome-focused) */}
      {/* ======================================= */}
      <section id="hero-section" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 md:pt-16 md:pb-28 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Hero Left Content: Stripped of documentation details */}
           <motion.div 
-            variants={itemVariants}
-            className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-secondary/10 border border-brand-secondary/20 rounded-full text-xs font-semibold text-brand-secondary"
            className="lg:col-span-7 space-y-6 text-left"
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
           >
-            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
-            <span>ShortlistIQ v2.0 Released</span>
-          </motion.div>
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
 
-          {/* Heading */}
-          <motion.h1 
-            variants={itemVariants}
-            className="text-4xl sm:text-6xl font-extrabold tracking-tight text-brand-textPrimary leading-tight font-display"
-          >
-            Smarter resume shortlisting<br />
-            <span className="bg-gradient-to-r from-brand-primary via-brand-secondary to-[#a855f7] bg-clip-text text-transparent">
-              powered by Gemini AI
-            </span>
-          </motion.h1>
-
-          {/* Tagline */}
-          <motion.p 
-            variants={itemVariants}
-            className="text-brand-textSecondary text-base sm:text-xl max-w-2xl mx-auto leading-relaxed"
-          >
-            Transition from manual resume keyword searching to semantic LLM evaluation. 
-            ShortlistIQ extracts skills, scores match weightings, and outputs staggered ranking boards in seconds.
-          </motion.p>
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
 
-          {/* CTA Buttons */}
            {/* Subtitle: 2-3 Simple Lines explaining why to create an account */}
            <motion.p 
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
              }}
              className="text-slate-600 text-base sm:text-lg max-w-xl leading-relaxed font-semibold"
            >
              ShortlistIQ helps job seekers discover the right jobs, improve their resume before applying, track every application, and connect with recruitersGÇöall in one place.
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
                IGÇÖm Hiring Talent
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
-            variants={itemVariants}
-            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            className="lg:col-span-5 w-full flex justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
           >
-            <Link 
-              to="/register" 
-              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white font-bold px-8 py-3.5 rounded-xl shadow-premium hover:-translate-y-0.5 transition-all duration-200"
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              className="w-full flex justify-center"
             >
-              Get Started Free <ArrowRight className="w-4 h-4" />
-            </Link>
-            <Link 
-              to="/login" 
-              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-brand-border/80 hover:border-brand-primary text-brand-textSecondary hover:text-brand-textPrimary font-semibold px-8 py-3.5 rounded-xl hover:bg-slate-50 transition-all duration-200"
-            >
-              Recruiter Login
-            </Link>
              <DashboardSimulator 
                activeStage={activeDemoStage} 
                onStageClick={handleDemoStageClick} 
              />
            </motion.div>
           </motion.div>
-        </motion.div>
        </div>
       </section>
