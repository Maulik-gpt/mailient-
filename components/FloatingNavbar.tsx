"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { 
  Home, 
  LayoutList, 
  HelpCircle, 
  Scale, 
  FileText 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "home", label: "Home", icon: Home, href: "/" },
  { id: "changelog", label: "Changelog", icon: LayoutList, href: "/changelog" },
  { id: "support", label: "Support", icon: HelpCircle, href: "/contact" },
  { id: "terms", label: "Terms", icon: Scale, href: "/terms-of-service" },
  { id: "privacy", label: "Privacy", icon: FileText, href: "/privacy-policy" },
];

export function FloatingNavbar() {
  const pathname = usePathname();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Safely find the active item, fallback to nothing if none matches exactly
  const activeItemIndex = navItems.findIndex(item => pathname === item.href);

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-fit px-4 pointer-events-none">
      <LayoutGroup>
        <nav className="flex items-center gap-1.5 p-1.5 bg-white/90 dark:bg-black/90 backdrop-blur-3xl border border-neutral-200/50 dark:border-white/10 rounded-[26px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const isHovered = hoveredId === item.id;
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="relative flex items-center no-underline"
              >
                <motion.div
                  layout
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 35
                  }}
                  className={cn(
                    "relative flex items-center h-11 rounded-full overflow-hidden px-1.5 transition-colors duration-300",
                    isActive 
                      ? "bg-black dark:bg-white text-white dark:text-black shadow-lg" 
                      : isHovered 
                        ? "bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100" 
                        : "text-neutral-500"
                  )}
                >
                  <div 
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-colors duration-300",
                      isActive ? "bg-white dark:bg-black" : ""
                    )}
                  >
                    <Icon className={cn("w-[18px] h-[18px]", isActive ? "text-black dark:text-white" : "text-neutral-500 dark:text-neutral-400")} />
                  </div>
                  
                  <AnimatePresence initial={false}>
                    {(isActive || isHovered) && (
                      <motion.span
                        initial={{ opacity: 0, width: 0, x: -5 }}
                        animate={{ opacity: 1, width: "auto", x: 0 }}
                        exit={{ opacity: 0, width: 0, x: -5 }}
                        transition={{ 
                          duration: 0.25, 
                          ease: "circOut"
                        }}
                        className="overflow-hidden"
                      >
                        <span className="ml-2 pr-3 text-[13px] font-bold tracking-tight whitespace-nowrap uppercase">
                          {item.label}
                        </span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>

                {isActive && (
                  <motion.div
                    layoutId="pill"
                    className="absolute inset-0 z-[-1] bg-black dark:bg-white rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 35 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </LayoutGroup>
    </div>
  );
}
