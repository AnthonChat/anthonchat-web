"use client"

import { useEffect } from "react"
import { motion, useSpring } from "motion/react"

interface AnimatedProgressProps {
  value: number
  initialValue?: number
  className?: string
  mass?: number
  stiffness?: number
  damping?: number
}

export function AnimatedProgress({
  value,
  initialValue = 0,
  className = "",
  mass = 0.8,
  stiffness = 75,
  damping = 15,
}: AnimatedProgressProps) {
  const progress = useSpring(initialValue, { mass, stiffness, damping })

  useEffect(() => {
    progress.set(Math.min(value, 100))
  }, [progress, value])

  return (
    <motion.div
      className={`h-full rounded-full relative ${className}`}
      style={{
        width: progress.get() === 0 ? "0%" : `${progress.get()}%`,
      }}
      animate={{
        width: `${Math.min(value, 100)}%`,
      }}
      transition={{
        type: "spring",
        mass,
        stiffness,
        damping,
        duration: 1.5,
      }}
    >
      <div className="absolute inset-0 bg-white/20 animate-pulse" />
    </motion.div>
  )
}