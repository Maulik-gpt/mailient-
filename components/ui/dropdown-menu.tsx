"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type DropdownMenuProps = {
  options: {
    label: string;
    onClick: () => void;
    Icon?: React.ReactNode;
    active?: boolean;
  }[];
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
};

const DropdownMenu = ({ options, children, className, align = "left" }: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <Button
        onClick={toggleDropdown}
        variant="outline"
        className="px-4 py-2 bg-black/40 hover:bg-black/60 shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/10 rounded-xl backdrop-blur-md transition-all duration-300"
      >
        {children ?? "Menu"}
        <motion.span
          className="ml-2"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.4, ease: "easeInOut", type: "spring" }}
        >
          <ChevronDown className="h-4 w-4 opacity-50" />
        </motion.span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: -5, scale: 0.95, opacity: 0, filter: "blur(4px)" }}
            animate={{ y: 0, scale: 1, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: -5, scale: 0.95, opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className={cn(
                "absolute z-50 w-56 mt-2 p-1.5 bg-[#0A0A0A]/95 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl border border-white/10 flex flex-col gap-1 overflow-hidden",
                align === "right" ? "right-0" : "left-0"
            )}
          >
            {/* Ambient glow in dropdown */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            
            {options && options.length > 0 ? (
              options.map((option, index) => (
                <motion.button
                  key={option.label}
                  onClick={() => {
                      option.onClick();
                      setIsOpen(false);
                  }}
                  className={cn(
                      "px-3 py-2.5 cursor-pointer text-sm rounded-xl w-full text-left flex items-center justify-between group transition-all duration-200",
                      option.active 
                        ? "bg-white text-black font-semibold" 
                        : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2.5">
                    {option.Icon && (
                        <span className={cn("transition-colors", option.active ? "text-black" : "text-white/40 group-hover:text-white")}>
                            {option.Icon}
                        </span>
                    )}
                    <span>{option.label}</span>
                  </div>
                  {option.active && (
                      <div className="w-1.5 h-1.5 rounded-full bg-black shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                  )}
                </motion.button>
              ))
            ) : (
              <div className="px-4 py-3 text-white/30 text-xs italic text-center">No options available</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { DropdownMenu };
