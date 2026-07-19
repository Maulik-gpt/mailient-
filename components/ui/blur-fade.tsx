"use client"

import { useRef } from "react"
import {
  motion,
  useInView,
  useReducedMotion,
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
  /**
   * Re-run the reveal every time the element enters the viewport, in either
   * scroll direction, instead of only the first time.
   *
   * ONLY set this on SMALL subtrees — a heading, one card, one paragraph.
   *
   * The default is once-only for a measured reason: re-running a blur reveal
   * over a whole section repaints an enormous subtree on every scroll pass,
   * and that was the primary scroll-jank source on this page (fixed in
   * 71a8d04). `filter: blur()` is the expensive part — the browser rasterises
   * the entire subtree, blurs it, and composites it, every frame of the
   * animation. Cost scales with painted area, so the same effect that is free
   * on a 200px card is punishing on a 900px section.
   *
   * Rule of thumb: repeat on leaves, never on section wrappers.
   */
  repeat?: boolean
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
  repeat = false,
}: BlurFadeProps) {
  const ref = useRef(null)
  const prefersReducedMotion = useReducedMotion()
  // once: !repeat — see the `repeat` doc above. Section-level wrappers must
  // stay once-only; only small subtrees opt into re-animating.
  const inViewResult = useInView(ref, { once: !repeat, margin: inViewMargin })
  const isInView = !inView || inViewResult

  // Respect the OS "reduce motion" setting: render the final state, no
  // transform, no blur, no repeated animation.
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

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
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={combinedVariants}
      transition={{
        delay: 0.04 + delay,
        duration,
        ease: [0.16, 1, 0.3, 1], // Premium cinematic easeOutExpo curve
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
