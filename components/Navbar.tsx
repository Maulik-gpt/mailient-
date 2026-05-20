"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight, Mail, Sparkles, Cpu, Send, Layers } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

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
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out border-b py-4",
          scrolled
            ? isDark
              ? "bg-neutral-950/80 backdrop-blur-xl border-neutral-800/60 shadow-[0_2px_30px_rgba(0,0,0,0.5)]"
              : "bg-white/75 backdrop-blur-xl border-neutral-200/50 shadow-[0_2px_20px_-10px_rgba(0,0,0,0.05)]"
            : "bg-transparent border-transparent py-6"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className={cn(
              "relative w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-105",
              isDark ? "bg-white" : "bg-neutral-950"
            )}>
              <span className={cn(
                "font-extrabold text-lg tracking-tighter",
                isDark ? "text-neutral-950" : "text-white"
              )}>M</span>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className={cn(
              "font-bold text-lg tracking-tight transition-colors font-satoshi",
              isDark ? "text-white group-hover:text-neutral-200" : "text-neutral-900 group-hover:text-black"
            )}>
              Mailient
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className={cn(
            "hidden md:flex items-center gap-8 text-[13px] font-semibold transition-colors",
            isDark ? "text-neutral-400" : "text-neutral-600"
          )}>
            {/* Product Dropdown Trigger */}
            <div
              className="relative py-2 cursor-pointer"
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <button className={cn(
                "flex items-center gap-1 transition-colors focus:outline-none",
                isDark ? "hover:text-white" : "hover:text-neutral-900"
              )}>
                Product
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-300",
                    dropdownOpen && "rotate-180"
                  )}
                />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={cn(
                      "absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 rounded-2xl border p-2 shadow-2xl",
                      isDark 
                        ? "border-neutral-800 bg-neutral-900/95 backdrop-blur-md" 
                        : "border-neutral-200/60 bg-white/95 backdrop-blur-md"
                    )}
                  >
                    <div className="grid gap-1">
                      <Link
                        href="/product/sift"
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-colors group",
                          isDark ? "hover:bg-neutral-800/50" : "hover:bg-neutral-50"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg border flex items-center justify-center transition-colors",
                          isDark 
                            ? "bg-neutral-800 border-neutral-700 text-white group-hover:bg-neutral-700" 
                            : "bg-neutral-50 border-neutral-200/50 text-neutral-800 group-hover:bg-white group-hover:border-neutral-300"
                        )}>
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={cn("font-bold text-xs", isDark ? "text-white" : "text-neutral-800")}>Sift</p>
                          <p className="text-[10px] text-neutral-450 opacity-80">Autonomous inbox triage</p>
                        </div>
                      </Link>

                      <Link
                        href="/product/drafts"
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-colors group",
                          isDark ? "hover:bg-neutral-800/50" : "hover:bg-neutral-50"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg border flex items-center justify-center transition-colors",
                          isDark 
                            ? "bg-neutral-800 border-neutral-700 text-white group-hover:bg-neutral-700" 
                            : "bg-neutral-50 border-neutral-200/50 text-neutral-800 group-hover:bg-white group-hover:border-neutral-300"
                        )}>
                          <Send className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={cn("font-bold text-xs", isDark ? "text-white" : "text-neutral-800")}>Draft Reply</p>
                          <p className="text-[10px] text-neutral-450 opacity-80">Contextual drafts</p>
                        </div>
                      </Link>

                      <Link
                        href="/product/arcus"
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-colors group",
                          isDark ? "hover:bg-neutral-800/50" : "hover:bg-neutral-50"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          isDark ? "bg-white text-neutral-950" : "bg-neutral-950 text-white"
                        )}>
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={cn("font-bold text-xs flex items-center gap-1.5", isDark ? "text-white" : "text-neutral-800")}>
                            Arcus
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                              isDark ? "bg-neutral-800 text-neutral-350" : "bg-neutral-100 text-neutral-600"
                            )}>
                              Flagship
                            </span>
                          </p>
                          <p className="text-[10px] text-neutral-455 opacity-80">Command-driven reasoning AI</p>
                        </div>
                      </Link>
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
                  : pathname === "/product/arcus" ? "text-neutral-950 font-bold" : "hover:text-neutral-900"
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
                  : pathname === "/pricing" ? "text-neutral-950 font-bold" : "hover:text-neutral-900"
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
                  : pathname === "/security" ? "text-neutral-950 font-bold" : "hover:text-neutral-900"
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
                  : pathname === "/changelog" ? "text-neutral-950 font-bold" : "hover:text-neutral-900"
              )}
            >
              Changelog
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            {status === "authenticated" ? (
              <>
                <Link
                  href="/home-feed"
                  className={cn(
                    "text-[13px] font-semibold transition-colors",
                    isDark ? "text-neutral-300 hover:text-white" : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut()}
                  className={cn(
                    "text-[13px] font-semibold transition-colors",
                    isDark ? "text-neutral-400 hover:text-red-400" : "text-neutral-500 hover:text-red-600"
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
                    "text-[13px] font-semibold transition-colors",
                    isDark ? "text-neutral-300 hover:text-white" : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  Sign in
                </Link>
                <button
                  onClick={handleConnectGmail}
                  className={cn(
                    "relative group overflow-hidden px-4.5 py-2 rounded-full text-[12px] font-extrabold tracking-tight transition-all duration-300 flex items-center gap-1.5 hover:scale-[1.01]",
                    isDark 
                      ? "bg-white text-neutral-950 hover:bg-white/95 border border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]" 
                      : "bg-neutral-950 text-white hover:bg-black hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
                  )}
                >
                  <Mail className="w-3.5 h-3.5 animate-pulse" />
                  Connect Gmail
                  <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-12 -translate-x-full group-hover:translate-x-[250%] transition-transform duration-1000 ease-out" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
