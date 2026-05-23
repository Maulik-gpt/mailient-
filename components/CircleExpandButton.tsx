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
        relative inline-flex items-center justify-center
        px-8 py-3 rounded-full
        bg-[rgb(77, 77, 77)]
        text-white font-semibold text-sm
        overflow-hidden cursor-pointer
        transition-all duration-300
        hover:scale-[1.02]
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      style={{
        boxShadow: "inset 1px 3px 2px 0px rgba(255, 255, 255, 0.25)",
      }}
    >
      {/* Button text */}
      <motion.span
        className="relative z-10"
        initial={{ opacity: 1 }}
        whileHover={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.span>

      {/* Hover text (same content) */}
      <motion.span
        className="absolute z-10 text-white"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.span>

      {/* Circle wrapper */}
      <motion.div
        className="relative flex items-center justify-center ml-2"
        initial={{ width: 35, height: 35 }}
        whileHover={{ width: 35, height: 35 }}
      >
        {/* Main circle */}
        <motion.div
          className="absolute inset-0 rounded-full bg-white"
          initial={{ scale: 1 }}
          whileHover={{ scale: 1, backgroundColor: "rgb(0, 0, 0)" }}
          transition={{ duration: 0.2 }}
        />
        
        {/* Arrow icon */}
        <motion.div
          className="relative z-10"
          initial={{ rotate: -45 }}
          whileHover={{ rotate: 0 }}
          transition={{ duration: 0.2 }}
        >
          <ArrowRight 
            className="w-4 h-4"
            style={{ color: "rgb(0, 0, 0)" }}
          />
        </motion.div>
      </motion.div>

      {/* Expanding circle effect */}
      <motion.div
        className="absolute rounded-full bg-white"
        initial={{ 
          width: 35, 
          height: 35,
          left: "calc(50% - 17.5px)",
          top: "calc(50% - 17.5px)"
        }}
        whileHover={{
          width: 320,
          height: 320,
          left: "calc(50% - 160px)",
          top: "calc(50% - 160px)",
          transition: {
            type: "spring",
            damping: 30,
            mass: 1,
            stiffness: 231
          }
        }}
        transition={{ duration: 0.2 }}
        style={{ zIndex: 0 }}
      />
    </ButtonWrapper>
  );
}
