import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Logo from './Logo';

export default function SplashScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Increment progress bar smoothly over 2 seconds
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 35);

    // Fade out and complete
    const timeout = setTimeout(() => {
      setFadeOut(true);
      const finishTimeout = setTimeout(() => {
        onComplete();
      }, 550);
      return () => clearTimeout(finishTimeout);
    }, 2100);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] bg-[#070b14] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Ambient glow */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.15, 0.25, 0.15]
        }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-brand-primary rounded-full blur-[140px] pointer-events-none"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#070b14_80%)]"></div>

      {/* Cyber Grid background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="z-10 flex flex-col items-center max-w-sm px-6 text-center">
        {/* Animated Logo Wrapper */}
        <motion.div 
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1.1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mb-8"
        >
          {/* Logo scanner bar effect */}
          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#06b6d4] to-transparent animate-scanner opacity-85 z-20"></div>

          {/* Official logo mark */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="drop-shadow-[0_0_20px_rgba(6,182,212,0.45)]"
          >
            <Logo size="h-28" showText={false} />
          </motion.div>
        </motion.div>

        {/* Product Identity */}
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-3xl font-extrabold tracking-tight text-white mb-2 font-display"
        >
          Shortlist<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06b6d4] to-[#10b981]">IQ</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="text-brand-textSecondary text-xs font-semibold uppercase tracking-[0.25em] mb-8"
        >
          AI-Powered Resume Shortlisting System
        </motion.p>

        {/* Progress Container */}
        <div className="w-48 h-1 bg-brand-border/40 rounded-full overflow-hidden relative mb-3">
          <motion.div 
            className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ ease: "easeOut" }}
          />
        </div>

        {/* Scanning status subtext */}
        <div className="text-[10px] text-brand-textSecondary font-semibold uppercase tracking-[0.15em] h-4 select-none">
          {progress < 30 && "Initializing ATS Engine..."}
          {progress >= 30 && progress < 60 && "Spinning Gemini AI parser..."}
          {progress >= 60 && progress < 90 && "Auditing platform settings..."}
          {progress >= 90 && "Welcome to ShortlistIQ"}
        </div>
      </div>
    </motion.div>
  );
}
