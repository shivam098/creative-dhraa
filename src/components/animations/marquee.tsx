"use client";

import { motion } from "framer-motion";

interface MarqueeProps {
  items: string[];
  separator?: string;
  speed?: number;
  direction?: "left" | "right";
  className?: string;
  itemClassName?: string;
  separatorClassName?: string;
  /** Whether to pause on hover */
  pauseOnHover?: boolean;
}

export default function Marquee({
  items,
  separator = "•",
  speed = 30,
  direction = "left",
  className = "",
  itemClassName = "",
  separatorClassName = "",
  pauseOnHover = true,
}: MarqueeProps) {
  // Duplicate items enough to fill the screen seamlessly
  const repeated = [...items, ...items, ...items, ...items];

  const content = repeated.map((item, i) => (
    <span key={i} className="flex shrink-0 items-center gap-8">
      <span className={`whitespace-nowrap ${itemClassName}`}>{item}</span>
      {i < repeated.length - 1 && (
        <span className={`text-accent/50 ${separatorClassName}`}>{separator}</span>
      )}
    </span>
  ));

  // Calculate animation duration based on speed (lower = faster)
  const duration = items.length * speed;

  return (
    <div
      className={`group relative flex overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-background to-transparent" />

      <motion.div
        className={`flex shrink-0 items-center gap-8 ${pauseOnHover ? "group-hover:[animation-play-state:paused]" : ""}`}
        animate={{
          x: direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"],
        }}
        transition={{
          x: {
            duration,
            repeat: Infinity,
            ease: "linear",
          },
        }}
      >
        {content}
      </motion.div>
    </div>
  );
}
