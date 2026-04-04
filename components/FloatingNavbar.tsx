"use client";

import React, { useState, useEffect } from "react";
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
  { id: "home", label: "Home", icon: Home, href: "/home-feed" },
  { id: "changelog", label: "Changelog", icon: LayoutList, href: "/changelog" },
  { id: "support", label: "Support", icon: HelpCircle, href: "/contact" },
  { id: "terms", label: "Terms", icon: Scale, href: "/terms-of-service" },
  { id: "privacy", label: "Privacy", icon: FileText, href: "/privacy-policy" },
];

export function FloatingNavbar() {
  const pathname = usePathname();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Special behavior for /home-feed: Fade out after 5 seconds
  useEffect(() => {
    if (pathname === "/home-feed") {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      // On other pages, ensure it is visible
      setIsVisible(true);
    }
  }, [pathname]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-fit px-4 pointer-events-none"
        >
          <LayoutGroup>
            <nav className="flex items-center gap-1.5 p-1.5 bg-white/25 dark:bg-black/30 backdrop-blur-3xl border border-white/40 dark:border-white/5 rounded-[26px] shadow-[0_10px_60px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.4)] pointer-events-auto transition-all duration-500">
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
