"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface SplitLineRevealProps {
  children: string;
  className?: string;
  delay?: number;
  /** For highlighting parts of text, wrap in React node */
  highlightWord?: string;
  highlightClassName?: string;
}

/**
 * Reveals text line-by-line with a mask/clip animation.
 * Each line slides up from behind a clip boundary.
 */
export default function SplitLineReveal({
  children,
  className = "",
  delay = 0,
  highlightWord,
  highlightClassName = "text-accent",
}: SplitLineRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  // Split by newlines or render as single block
  const lines = children.split("\n");

  return (
    <div ref={ref} className={className}>
      {lines.map((line, i) => (
        <div key={i} className="overflow-hidden">
          <motion.div
            initial={{ y: "100%" }}
            animate={isInView ? { y: "0%" } : { y: "100%" }}
            transition={{
              duration: 0.7,
              delay: delay + i * 0.12,
              ease: [0.33, 1, 0.68, 1],
            }}
          >
            {highlightWord && line.includes(highlightWord) ? (
              <>
                {line.split(highlightWord).map((part, j) => (
                  <span key={j}>
                    {part}
                    {j < line.split(highlightWord).length - 1 && (
                      <span className={highlightClassName}>{highlightWord}</span>
                    )}
                  </span>
                ))}
              </>
            ) : (
              line
            )}
          </motion.div>
        </div>
      ))}
    </div>
  );
}
