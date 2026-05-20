"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Mail, Cpu, Send, Layers } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { ArcusLogo } from "@/components/ui/arcus-logo";

interface NavbarProps {
  theme?: "light" | "dark";
}

export function Navbar({ theme = "light" }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isDark = theme === "dark";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleConnectGmail = () => {
    window.open("https://tally.so/r/b5KpB6", "_blank", "noopener,noreferrer");
  };

  return (
    <motion.header
      initial={{ y: -40, opacity: 0, filter: "blur(8px)" }}
      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 md:px-6 pointer-events-none"
    >
      <div
        style={{
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
        }}
        className={cn(
          "pointer-events-auto flex items-center justify-between w-full max-w-5xl rounded-full border px-6 py-2.5 transition-all duration-500 ease-out shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative",
          scrolled
            ? isDark
              ? "border-white/[0.08] bg-gradient-to-r from-neutral-900/85 via-neutral-950/90 to-neutral-900/85 shadow-[0_25px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]"
              : "border-neutral-200/50 bg-gradient-to-r from-white/90 via-neutral-50/95 to-white/90 shadow-[0_20px_40px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]"
            : isDark
              ? "border-white/[0.05] bg-gradient-to-r from-neutral-950/65 via-neutral-900/70 to-neutral-950/65 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
              : "border-neutral-200/40 bg-gradient-to-r from-white/60 via-neutral-50/70 to-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]"
        )}
      >
        {/* Fine Glass Reflection Line Overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-white/[0.03] pointer-events-none rounded-full" />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group relative z-10">
          <div className="relative w-7 h-7 rounded-[25%] overflow-hidden transition-all duration-500 group-hover:scale-105 border border-white/10 shadow-md bg-white">
            <img 
              src="/mailient-logo-premium.png" 
              alt="Mailient Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <span className={cn(
            "font-extrabold text-[15px] tracking-tight transition-colors font-satoshi",
            isDark ? "text-white group-hover:text-neutral-200" : "text-neutral-900 group-hover:text-black"
          )}>
            Mailient
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className={cn(
          "hidden md:flex items-center gap-7 text-[12px] font-semibold transition-colors relative z-10",
          isDark ? "text-neutral-450" : "text-neutral-600"
        )}>
          {/* Product Dropdown Trigger */}
          <div
            className="relative py-1 cursor-pointer"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <button className={cn(
              "flex items-center gap-1 transition-colors focus:outline-none",
              isDark ? "hover:text-white" : "hover:text-neutral-950"
            )}>
              Product
              <ChevronDown
                className={cn(
                  "w-3 h-3 transition-transform duration-300",
                  dropdownOpen && "rotate-180"
                )}
              />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.97, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 8, scale: 0.97, filter: "blur(6px)" }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-0 pt-4 z-[100] pointer-events-auto cursor-default"
                >
                  {/* Mega Menu Obsidian Box */}
                  <div 
                    style={{
                      backgroundColor: isDark ? "rgba(23, 23, 23, 0.75)" : "rgba(255, 255, 255, 0.95)"
                    }}
                    className={cn(
                      "w-[700px] rounded-2xl border p-6 pb-4 shadow-[0_50px_100px_rgba(0,0,0,0.85)] backdrop-blur-3xl relative overflow-hidden text-left flex flex-col justify-between",
                      isDark ? "border-white/[0.12]" : "border-neutral-200/50"
                    )}
                  >
                    
                    <div className="grid grid-cols-3 gap-8 relative z-10">
                      
                      {/* Column 1 */}
                      <div className="flex flex-col space-y-6 pr-4 border-r border-white/[0.04]">
                        <Link href="/product/sift" className="group block cursor-pointer select-none">
                          <span className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase block mb-1">
                            Sift AI
                          </span>
                          <span className="text-[13px] font-semibold text-neutral-300 leading-snug group-hover:text-white transition-all duration-300 block">
                            Triage incoming threads and isolate critical updates
                          </span>
                        </Link>

                        <Link href="/product/drafts" className="group block cursor-pointer select-none">
                          <span className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase block mb-1">
                            Voice Profile
                          </span>
                          <span className="text-[13px] font-semibold text-neutral-300 leading-snug group-hover:text-white transition-all duration-300 block">
                            Build style profiles to write exactly like you
                          </span>
                        </Link>
                      </div>

                      {/* Column 2 */}
                      <div className="flex flex-col space-y-6 pr-4 border-r border-white/[0.04]">
                        <Link href="/product/arcus" className="group block cursor-pointer select-none">
                          <span className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase block mb-1">
                            Arcus Engine
                          </span>
                          <span className="text-[13px] font-semibold text-neutral-300 leading-snug group-hover:text-white transition-all duration-300 block">
                            Delegate complex scheduling and tasks overnight
                          </span>
                        </Link>

                        <Link href="/product/arcus" className="group block cursor-pointer select-none">
                          <span className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase block mb-1">
                            Encryption
                          </span>
                          <span className="text-[13px] font-semibold text-neutral-300 leading-snug group-hover:text-white transition-all duration-300 block">
                            Secure client-side protection for total privacy
                          </span>
                        </Link>
                      </div>

                      {/* Column 3 */}
                      <div className="flex flex-col space-y-6">
                        <Link href="/home-feed" className="group block cursor-pointer select-none">
                          <span className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase block mb-1">
                            Analytics
                          </span>
                          <span className="text-[13px] font-semibold text-neutral-300 leading-snug group-hover:text-white transition-all duration-300 block">
                            Monitor usage metrics and team throughput
                          </span>
                        </Link>

                        <a href="#connectors" className="group block cursor-pointer select-none">
                          <span className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase block mb-1">
                            Connectors
                          </span>
                          <span className="text-[13px] font-semibold text-neutral-300 leading-snug group-hover:text-white transition-all duration-300 block">
                            Integrate Slack, Notion, Cal.com, and Google Meet
                          </span>
                        </a>
                      </div>

                    </div>

                    {/* Divider and Footer */}
                    <div className="border-t border-white/[0.06] pt-4 mt-6 flex items-center justify-between text-xs text-neutral-500 z-10 relative">
                      <span className="font-semibold text-neutral-200">New: Neural Voice Profile</span>
                      <Link href="/changelog" className="text-[#5f5bf6] hover:text-[#7875f7] transition-colors font-semibold">
                        Changelog
                      </Link>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            href="/product/arcus"
            className={cn(
              "transition-colors",
              isDark 
                ? pathname === "/product/arcus" ? "text-white font-bold" : "hover:text-white"
                : pathname === "/product/arcus" ? "text-neutral-950 font-bold" : "hover:text-neutral-950"
            )}
          >
            Arcus
          </Link>

          <Link
            href="/pricing"
            className={cn(
              "transition-colors",
              isDark 
                ? pathname === "/pricing" ? "text-white font-bold" : "hover:text-white"
                : pathname === "/pricing" ? "text-neutral-950 font-bold" : "hover:text-neutral-950"
            )}
          >
            Pricing
          </Link>

          <Link
            href="/security"
            className={cn(
              "transition-colors",
              isDark 
                ? pathname === "/security" ? "text-white font-bold" : "hover:text-white"
                : pathname === "/security" ? "text-neutral-950 font-bold" : "hover:text-neutral-950"
            )}
          >
            Security
          </Link>

          <Link
            href="/changelog"
            className={cn(
              "transition-colors",
              isDark 
                ? pathname === "/changelog" ? "text-white font-bold" : "hover:text-white"
                : pathname === "/changelog" ? "text-neutral-950 font-bold" : "hover:text-neutral-950"
            )}
          >
            Changelog
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 relative z-10">
          {status === "authenticated" ? (
            <>
              <Link
                href="/home-feed"
                className={cn(
                  "text-[12px] font-semibold transition-colors",
                  isDark ? "text-neutral-300 hover:text-white" : "text-neutral-600 hover:text-neutral-900"
                )}
              >
                Dashboard
              </Link>
              <button
                onClick={() => signOut()}
                className={cn(
                  "text-[12px] font-semibold transition-colors",
                  isDark ? "text-neutral-450 hover:text-red-400" : "text-neutral-500 hover:text-red-600"
                )}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className={cn(
                  "text-[12px] font-semibold transition-colors",
                  isDark ? "text-neutral-300 hover:text-white" : "text-neutral-600 hover:text-neutral-900"
                )}
              >
                Sign in
              </Link>
              <LiquidButton
                onClick={handleConnectGmail}
                variant={isDark ? "default" : "light"}
                size="sm"
                className="rounded-full !h-8.5 px-4 font-bold text-[11px] tracking-tight hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 animate-pulse" />
                Join waitlist
              </LiquidButton>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
