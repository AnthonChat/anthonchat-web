"use client"

import { useEffect } from "react"
import { MotionValue, motion, useSpring, useTransform } from "framer-motion"

interface AnimatedNumberProps {
  value: number
  initialValue?: number
  mass?: number
  stiffness?: number
  damping?: number
  precision?: number
  format?: (value: number) => string
  onAnimationStart?: () => void
  onAnimationComplete?: () => void
}

export function AnimatedNumber({
  value,
  initialValue = 0,
  mass = 0.8,
  stiffness = 75,
  damping = 15,
  precision = 0,
  format = (num) => num.toLocaleString(),
  onAnimationStart,
  onAnimationComplete,
}: AnimatedNumberProps) {
  // Ensure value is a valid number
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const safeInitialValue = typeof initialValue === 'number' && !isNaN(initialValue) ? initialValue : 0;
  
  // Create a safe format function that handles invalid numbers
  const safeFormat = (num: number) => {
    if (typeof num !== 'number' || isNaN(num)) {
      return '0';
    }
    try {
      return format(num);
    } catch {
      return num.toString();
    }
  };

  const spring = useSpring(safeInitialValue, { mass, stiffness, damping })
  const display: MotionValue<string> = useTransform(spring, (current) =>
    safeFormat(parseFloat(current.toFixed(precision)))
  )

  useEffect(() => {
    spring.set(safeValue)
    if (onAnimationStart) onAnimationStart()
    const unsubscribe = spring.on("change", () => {
      if (spring.get() === safeValue && onAnimationComplete) onAnimationComplete()
    })
    return () => unsubscribe()
  }, [spring, safeValue, onAnimationStart, onAnimationComplete])

  return <motion.span>{display}</motion.span>
}
