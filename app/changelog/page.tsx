"use client";

import React from "react";
import { FloatingNavbar } from "@/components/FloatingNavbar";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { motion } from "framer-motion";

export default function ChangelogPage() {
  const currentDate = "28 April 2026";

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#fafafa] transition-colors duration-500 flex flex-col font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800">
      
      {/* Top Header Theme Toggle */}
      <div className="fixed top-8 right-8 z-50">
        <AnimatedThemeToggler className="bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-sm border border-neutral-200 dark:border-neutral-800" />
      </div>

      {/* Main Content - Following Terms & Policy style */}
      <main className="max-w-[720px] mx-auto pt-40 pb-48 px-6 w-full flex-1">
        <header className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-black dark:text-white mb-6">
              Changelog
            </h1>
            <p className="text-sm font-semibold tracking-wide text-neutral-400 dark:text-neutral-500 uppercase">
              Last Updated: {currentDate}
            </p>
            <div className="h-px w-full bg-neutral-100 dark:bg-neutral-900 my-10" />
          </motion.div>
        </header>

        <div className="space-y-20">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group"
          >
            <h2 className="text-2xl font-bold text-black dark:text-white mb-6 tracking-tight">
              No entries yet
            </h2>
            <div className="text-[17px] leading-[1.7] text-neutral-600 dark:text-neutral-300 font-normal">
              <p>
                We are currently working on our first set of updates. Stay tuned for new features, improvements, and fixes as we continue to build and refine Mailient.
              </p>
            </div>
          </motion.section>
        </div>

        <footer className="mt-40 pt-16 border-t border-neutral-100 dark:border-neutral-900">
          <p className="text-neutral-400 dark:text-neutral-500 text-sm italic leading-relaxed text-center">
            We ship often and document every meaningful change right here.
          </p>
          <p className="mt-8 text-neutral-400 dark:text-neutral-500 text-xs text-center">
            &copy; 2026 Mailient. All rights reserved.
          </p>
        </footer>
      </main>

      <FloatingNavbar />
    </div>
  );
}


