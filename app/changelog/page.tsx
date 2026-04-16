"use client";

import React from "react";
import { FloatingNavbar } from "@/components/FloatingNavbar";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { motion } from "framer-motion";

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#fafafa] transition-colors duration-500 flex flex-col">
      
      {/* Top Header Theme Toggle */}
      <div className="fixed top-8 right-8 z-50">
        <AnimatedThemeToggler className="bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-sm border border-neutral-200 dark:border-neutral-800" />
      </div>

      {/* Main Content - Coming Soon */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Animated Logo/Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="relative">
            {/* Orbiting circles animation */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 -m-8"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
            </motion.div>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 -m-12"
            >
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
            </motion.div>
            
            {/* Center icon */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <motion.div
                animate={{ 
                  boxShadow: [
                    "0 0 0 0 rgba(10, 10, 10, 0)",
                    "0 0 0 8px rgba(10, 10, 10, 0.05)",
                    "0 0 0 0 rgba(10, 10, 10, 0)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full dark:hidden"
              />
              <motion.div
                animate={{ 
                  boxShadow: [
                    "0 0 0 0 rgba(250, 250, 250, 0)",
                    "0 0 0 8px rgba(250, 250, 250, 0.05)",
                    "0 0 0 0 rgba(250, 250, 250, 0)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full hidden dark:block"
              />
              <svg 
                viewBox="0 0 24 24" 
                className="w-8 h-8 text-neutral-900 dark:text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
            Coming soon
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-base md:text-lg max-w-md mx-auto">
            We&apos;re building something new. Stay tuned for updates.
          </p>
        </motion.div>

        {/* Animated dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex gap-2 mt-8"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                delay: i * 0.2,
                ease: "easeInOut"
              }}
              className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500"
            />
          ))}
        </motion.div>
      </div>

      <FloatingNavbar />
    </div>
  );
}
