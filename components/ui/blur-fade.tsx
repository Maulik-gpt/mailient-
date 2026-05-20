"use client"

import { useRef } from "react"
import {
  AnimatePresence,
  motion,
  useInView,
  UseInViewOptions,
  Variants,
} from "framer-motion"

type MarginType = UseInViewOptions["margin"]

interface BlurFadeProps {
  children: React.ReactNode
  className?: string
  variant?: {
    hidden: { y: number; opacity: number; filter: string }
    visible: { y: number; opacity: number; filter: string }
  }
  duration?: number
  delay?: number
  yOffset?: number
  inView?: boolean
  inViewMargin?: MarginType
  blur?: string
}

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.5,
  delay = 0,
  yOffset = 8,
  inView = false,
  inViewMargin = "-50px",
  blur = "8px",
}: BlurFadeProps) {
  const ref = useRef(null)
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin })
  const isInView = !inView || inViewResult
  
  const defaultVariants: Variants = {
    hidden: { 
      y: yOffset, 
      opacity: 0, 
      filter: `blur(${blur})` 
    },
    visible: { 
      y: 0, 
      opacity: 1, 
      filter: "blur(0px)" 
    },
  }
  
  const combinedVariants = variant || defaultVariants

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        exit="hidden"
        variants={combinedVariants}
        transition={{
          delay: 0.04 + delay,
          duration,
          ease: [0.16, 1, 0.3, 1], // Premium cinematic easeOutExpo curve
        }}
        style={{
          willChange: "transform, opacity, filter",
          backfaceVisibility: "hidden",
          transform: "translate3d(0,0,0)",
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
