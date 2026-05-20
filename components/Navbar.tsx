"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Mail, Cpu, Send, Layers } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

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
    if (status === "authenticated") {
      router.push("/home-feed");
    } else {
      signIn("google", { callbackUrl: "/onboarding" });
    }
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
              ? "border-white/[0.08] bg-neutral-950/75 shadow-[0_25px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)]"
              : "border-neutral-200/50 bg-white/80 shadow-[0_20px_40px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]"
            : isDark
              ? "border-white/[0.05] bg-neutral-950/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
              : "border-neutral-200/40 bg-white/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]"
        )}
      >
        {/* Fine Glass Reflection Line Overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-white/[0.03] pointer-events-none rounded-full" />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group relative z-10">
          <div className="relative w-7 h-7 rounded-full overflow-hidden transition-all duration-500 group-hover:scale-105 border border-white/10 shadow-md bg-white">
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
                  <div className={cn(
                    "w-[760px] rounded-[32px] border p-8 shadow-[0_45px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl relative overflow-hidden text-left flex flex-col justify-between",
                    isDark 
                      ? "border-white/[0.08] bg-black/95 shadow-[0_50px_120px_rgba(0,0,0,0.95)]" 
                      : "border-neutral-200/50 bg-white/95"
                  )}>
                    {/* Blue Ambient Neon Spotlight behind Links */}
                    <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_60%_40%,rgba(59,130,246,0.15),transparent_60%)] pointer-events-none" />

                    <div className="grid grid-cols-3 gap-10 relative z-10">
                      
                      {/* Column 1: ChatGPT For -> Mailient For */}
                      <div className="flex flex-col">
                        <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-5 font-mono">
                          Mailient For
                        </h4>
                        <div className="flex flex-col space-y-4">
                          <Link href="/product/sift" className="group">
                            <span className="text-[12px] font-semibold text-neutral-300 group-hover:text-white transition-colors block">
                              Students & Academics
                            </span>
                            <span className="text-[9px] text-neutral-500 font-light block mt-0.5">
                              Filter courses, assignments, and campus alerts.
                            </span>
                          </Link>
                          <Link href="/product/sift" className="group">
                            <span className="text-[12px] font-semibold text-neutral-300 group-hover:text-white transition-colors block">
                              Founders & Leaders
                            </span>
                            <span className="text-[9px] text-neutral-500 font-light block mt-0.5">
                              Triage capital rounds and deck applications.
                            </span>
                          </Link>
                          <Link href="/product/drafts" className="group">
                            <span className="text-[12px] font-semibold text-neutral-300 group-hover:text-white transition-colors block">
                              Operations Managers
                            </span>
                            <span className="text-[9px] text-neutral-500 font-light block mt-0.5">
                              Sync client onboarding tasks automatically.
                            </span>
                          </Link>
                          <Link href="/product/drafts" className="group">
                            <span className="text-[12px] font-semibold text-neutral-300 group-hover:text-white transition-colors block">
                              Customer Support
                            </span>
                            <span className="text-[9px] text-neutral-500 font-light block mt-0.5">
                              Pre-draft premium client responses.
                            </span>
                          </Link>
                        </div>
                      </div>

                      {/* Column 2: Inspiration -> Core Tech */}
                      <div className="flex flex-col">
                        <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-5 font-mono">
                          Core Technology
                        </h4>
                        <div className="flex flex-col space-y-4">
                          <Link href="/product/sift" className="group flex items-start gap-2.5">
                            <div className="w-4 h-4 rounded bg-neutral-900 border border-white/5 flex items-center justify-center text-[9px] text-neutral-400 mt-0.5">
                              S
                            </div>
                            <div>
                              <span className="text-[12px] font-semibold text-neutral-300 group-hover:text-white transition-colors block">
                                Sift / Intake
                              </span>
                              <span className="text-[9px] text-neutral-500 font-light block mt-0.5">
                                Autonomous inbox classification & sorting.
                              </span>
                            </div>
                          </Link>
                          <Link href="/product/drafts" className="group flex items-start gap-2.5">
                            <div className="w-4 h-4 rounded bg-neutral-900 border border-white/5 flex items-center justify-center text-[9px] text-neutral-400 mt-0.5">
                              D
                            </div>
                            <div>
                              <span className="text-[12px] font-semibold text-neutral-300 group-hover:text-white transition-colors block">
                                Drafts / Plan
                              </span>
                              <span className="text-[9px] text-neutral-500 font-light block mt-0.5">
                                Contextual responses tailored to your tone.
                              </span>
                            </div>
                          </Link>
                          <Link href="/product/arcus" className="group flex items-start gap-2.5">
                            <div className="w-4 h-4 rounded bg-white text-black flex items-center justify-center text-[9px] font-bold mt-0.5">
                              A
                            </div>
                            <div>
                              <span className="text-[12px] font-semibold text-neutral-300 group-hover:text-white transition-colors block">
                                Arcus Flagship
                              </span>
                              <span className="text-[9px] text-neutral-500 font-light block mt-0.5">
                                Multi-agent logic command reasoning.
                              </span>
                            </div>
                          </Link>
                        </div>
                      </div>

                      {/* Column 3: Ways to Use -> Integrations */}
                      <div className="flex flex-col">
                        <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-5 font-mono">
                          Integrations
                        </h4>
                        <div className="flex flex-col space-y-4">
                          <div className="group cursor-pointer">
                            <span className="text-[12px] font-semibold text-neutral-300 group-hover:text-white transition-colors block">
                              Gmail & Google Tasks
                            </span>
                            <span className="text-[9px] text-neutral-500 font-light block mt-0.5">
                              Secure transactional in-memory indexing.
                            </span>
                          </div>
                          <div className="group cursor-pointer">
                            <span className="text-[12px] font-semibold text-neutral-300 group-hover:text-white transition-colors block">
                              Cal.com & Meet API
                            </span>
                            <span className="text-[9px] text-neutral-500 font-light block mt-0.5">
                              Conflict-free booking pipelines.
                            </span>
                          </div>
                          <div className="group cursor-pointer">
                            <span className="text-[12px] font-semibold text-neutral-300 group-hover:text-white transition-colors block">
                              Notion Calendars
                            </span>
                            <span className="text-[9px] text-neutral-500 font-light block mt-0.5">
                              Synchronized event logging.
                            </span>
                          </div>
                          <div className="group cursor-pointer">
                            <span className="text-[12px] font-semibold text-neutral-300 group-hover:text-white transition-colors block">
                              Slack Real-time Alerts
                            </span>
                            <span className="text-[9px] text-neutral-500 font-light block mt-0.5">
                              Instant briefing push notifications.
                            </span>
                          </div>
                        </div>
                      </div>

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
                Connect Gmail
              </LiquidButton>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
