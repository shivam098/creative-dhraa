"use client";

import { motion, useInView, type Variant } from "framer-motion";
import { useRef, type ReactNode } from "react";

type Direction = "up" | "down" | "left" | "right";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: Direction;
  distance?: number;
  once?: boolean;
  scale?: number;
}

const getInitial = (direction: Direction, distance: number, scale: number) => {
  const base: Record<string, number> = { opacity: 0, scale };
  switch (direction) {
    case "up":
      base.y = distance;
      break;
    case "down":
      base.y = -distance;
      break;
    case "left":
      base.x = distance;
      break;
    case "right":
      base.x = -distance;
      break;
  }
  return base;
};

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  duration = 0.7,
  direction = "up",
  distance = 60,
  once = true,
  scale = 1,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={getInitial(direction, distance, scale)}
      animate={
        isInView
          ? { opacity: 1, x: 0, y: 0, scale: 1 }
          : getInitial(direction, distance, scale)
      }
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
