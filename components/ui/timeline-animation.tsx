"use client";
import React from "react";
import { motion } from "framer-motion";

interface TimelineContentProps {
  as?: any;
  animationNum?: number;
  timelineRef?: React.RefObject<HTMLElement | null>;
  customVariants?: any;
  className?: string;
  children: React.ReactNode;
}

export const TimelineContent = ({
  as = "div",
  animationNum = 0,
  timelineRef,
  customVariants,
  className,
  children,
  ...props
}: TimelineContentProps) => {
  const Component = (motion as any)[as] || motion.div;

  const defaultVariants = {
    visible: {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: animationNum * 0.15,
        duration: 0.5,
      },
    },
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={customVariants || defaultVariants}
      custom={animationNum}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
};
