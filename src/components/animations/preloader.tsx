"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Check if user has already seen the preloader this session
    if (sessionStorage.getItem("preloaderShown")) {
      setShouldRender(false);
      return;
    }

    // Respect reduced-motion — skip preloader entirely
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setShouldRender(false);
      sessionStorage.setItem("preloaderShown", "true");
      return;
    }

    // Fast progress — completes in ~800ms total
    let current = 0;
    const interval = setInterval(() => {
      const increment = current < 40 ? 8 : current < 70 ? 10 : 15;
      current = Math.min(current + increment, 100);
      setProgress(current);

      if (current >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsComplete(true);
          sessionStorage.setItem("preloaderShown", "true");
        }, 150);
      }
    }, 30);

    return () => clearInterval(interval);
  }, []);

  if (!shouldRender) return null;

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Brand Name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col items-center"
          >
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-accent sm:text-4xl md:text-5xl">
              Creative Dhraa
            </h1>
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-muted">
              Personalized Gifts
            </p>
          </motion.div>

          {/* Progress indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 flex flex-col items-center gap-4"
          >
            {/* Percentage counter */}
            <span className="font-mono text-sm tabular-nums text-muted">
              {progress.toString().padStart(3, "0")}%
            </span>

            {/* Progress bar */}
            <div className="h-px w-48 overflow-hidden bg-border">
              <motion.div
                className="h-full bg-accent"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            </div>
          </motion.div>

          {/* Decorative corners */}
          <div className="pointer-events-none absolute inset-8">
            <div className="absolute left-0 top-0 h-8 w-8 border-l border-t border-accent/20" />
            <div className="absolute right-0 top-0 h-8 w-8 border-r border-t border-accent/20" />
            <div className="absolute bottom-0 left-0 h-8 w-8 border-b border-l border-accent/20" />
            <div className="absolute bottom-0 right-0 h-8 w-8 border-b border-r border-accent/20" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
