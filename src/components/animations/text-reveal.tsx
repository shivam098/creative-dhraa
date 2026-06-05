"use client";

import { motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

interface TextRevealProps {
  children: string;
  className?: string;
  delay?: number;
  /** "word" animates word-by-word, "char" animates character-by-character */
  mode?: "word" | "char";
  once?: boolean;
}

export default function TextReveal({
  children,
  className = "",
  delay = 0,
  mode = "word",
  once = true,
}: TextRevealProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once, margin: "-50px" });

  const units = mode === "word" ? children.split(" ") : children.split("");

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {units.map((unit, i) => (
        <span key={i} className="inline-block overflow-hidden">
          <motion.span
            className="inline-block"
            initial={{ y: "100%", opacity: 0 }}
            animate={isInView ? { y: "0%", opacity: 1 } : { y: "100%", opacity: 0 }}
            transition={{
              duration: 0.5,
              delay: delay + i * (mode === "word" ? 0.08 : 0.03),
              ease: [0.33, 1, 0.68, 1],
            }}
          >
            {unit}
            {mode === "word" && i < units.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
