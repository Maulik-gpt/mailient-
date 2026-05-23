"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import React from "react";

interface CircleExpandButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  target?: string;
  rel?: string;
  disabled?: boolean;
}

export function CircleExpandButton({
  children,
  href,
  onClick,
  className = "",
  target,
  rel,
  disabled = false,
}: CircleExpandButtonProps) {
  const ButtonWrapper = href ? "a" : "button";
  
  return (
    <ButtonWrapper
      href={href}
      onClick={onClick}
      target={target}
      rel={rel}
      disabled={disabled}
      className={`
        relative inline-flex items-center justify-center gap-2
        px-8 py-3 rounded-full
        bg-[rgb(77, 77, 77)]
        text-white font-semibold text-sm
        overflow-hidden cursor-pointer
        transition-transform duration-200
        hover:scale-[1.02]
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      style={{
        boxShadow: "inset 1px 3px 2px 0px rgba(255, 255, 255, 0.25)",
      }}
    >
      <motion.span
        className="relative z-10"
        animate={{ color: "white" }}
        whileHover={{ color: "black" }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.span>

      {/* Circle with arrow */}
      <motion.div
        className="relative flex items-center justify-center"
        style={{ width: 32, height: 32 }}
      >
        {/* Background circle */}
        <motion.div
          className="absolute inset-0 rounded-full bg-white"
          initial={{ scale: 1 }}
          whileHover={{ 
            scale: 60,
            transition: {
              type: "spring",
              damping: 25,
              stiffness: 200
            }
          }}
        />
        
        {/* Arrow icon */}
        <motion.div
          className="relative z-10"
          initial={{ rotate: -45 }}
          whileHover={{ rotate: 0 }}
          transition={{ duration: 0.15 }}
        >
          <ArrowRight className="w-4 h-4 text-black" />
        </motion.div>
      </motion.div>
    </ButtonWrapper>
  );
}
