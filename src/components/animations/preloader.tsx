"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem("preloaderShown")) {
      setShouldRender(false);
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setShouldRender(false);
      sessionStorage.setItem("preloaderShown", "true");
      return;
    }

    let current = 0;
    const interval = setInterval(() => {
      const increment = current < 40 ? 6 : current < 70 ? 8 : 12;
      current = Math.min(current + increment, 100);
      setProgress(current);

      if (current >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsComplete(true);
          sessionStorage.setItem("preloaderShown", "true");
        }, 400);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  if (!shouldRender) return null;

  return (
    <AnimatePresence mode="wait">
      {!isComplete && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0F1A0F]"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.8, ease: [0.87, 0, 0.13, 1] }}
        >
          {/* Floating orbs */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-accent/10 blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-[#C9A96E]/10 blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
          />

          {/* Brand mark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-12 flex flex-col items-center"
          >
            <span className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl tracking-tight text-white">
              Creative Dhraa
            </span>
            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-white/40">
              Personalized Gifts
            </p>
          </motion.div>

          {/* Progress bar */}
          <div className="w-48 h-[1px] bg-white/20 overflow-hidden">
            <motion.div
              className="h-full bg-[#C9A96E]"
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.3, ease: "linear" }}
            />
          </div>

          {/* Counter */}
          <motion.span
            className="mt-4 text-sm text-white/40 font-mono tabular-nums"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {Math.min(Math.round(progress), 100)}%
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
