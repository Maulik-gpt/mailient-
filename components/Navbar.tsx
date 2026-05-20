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
        className={cn(
          "pointer-events-auto flex items-center justify-between w-full max-w-5xl rounded-full border px-6 py-2.5 transition-all duration-500 ease-out shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl relative overflow-hidden",
          scrolled
            ? isDark
              ? "border-white/[0.08] bg-neutral-950/75 shadow-[0_25px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)]"
              : "border-neutral-200/50 bg-white/80 shadow-[0_20px_40px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]"
            : isDark
              ? "border-white/[0.03] bg-neutral-950/40"
              : "border-neutral-200/30 bg-white/40"
        )}
      >
        {/* Fine Glass Reflection Line Overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-white/[0.03] pointer-events-none" />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group relative z-10">
          <div className={cn(
            "relative w-7 h-7 rounded-full flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:scale-105",
            isDark ? "bg-white" : "bg-neutral-950"
          )}>
            <span className={cn(
              "font-black text-sm tracking-tighter",
              isDark ? "text-neutral-950" : "text-white"
            )}>M</span>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                  initial={{ opacity: 0, y: 8, scale: 0.98, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 6, scale: 0.98, filter: "blur(4px)" }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    "absolute top-full left-1/2 -translate-x-1/2 mt-2 w-60 rounded-2xl border p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl",
                    isDark 
                      ? "border-white/[0.08] bg-neutral-950/90 shadow-[0_30px_70px_rgba(0,0,0,0.8)]" 
                      : "border-neutral-200/50 bg-white/90"
                  )}
                >
                  <div className="grid gap-0.5">
                    <Link
                      href="/product/sift"
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-xl transition-all duration-205 group",
                        isDark ? "hover:bg-white/[0.03]" : "hover:bg-neutral-50"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg border flex items-center justify-center transition-colors",
                        isDark 
                          ? "bg-neutral-900 border-neutral-800 text-white group-hover:bg-neutral-800" 
                          : "bg-neutral-50 border-neutral-200/50 text-neutral-800 group-hover:bg-white group-hover:border-neutral-300"
                      )}>
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className={cn("font-bold text-[11px]", isDark ? "text-white" : "text-neutral-800")}>Sift</p>
                        <p className="text-[9px] text-neutral-500 font-light mt-0.5">Autonomous inbox triage</p>
                      </div>
                    </Link>

                    <Link
                      href="/product/drafts"
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-xl transition-all duration-205 group",
                        isDark ? "hover:bg-white/[0.03]" : "hover:bg-neutral-50"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg border flex items-center justify-center transition-colors",
                        isDark 
                          ? "bg-neutral-900 border-neutral-800 text-white group-hover:bg-neutral-800" 
                          : "bg-neutral-50 border-neutral-200/50 text-neutral-800 group-hover:bg-white group-hover:border-neutral-300"
                      )}>
                        <Send className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className={cn("font-bold text-[11px]", isDark ? "text-white" : "text-neutral-800")}>Draft Reply</p>
                        <p className="text-[9px] text-neutral-500 font-light mt-0.5">Contextual drafts</p>
                      </div>
                    </Link>

                    <Link
                      href="/product/arcus"
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-xl transition-all duration-205 group",
                        isDark ? "hover:bg-white/[0.03]" : "hover:bg-neutral-50"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center",
                        isDark ? "bg-white text-neutral-950" : "bg-neutral-950 text-white"
                      )}>
                        <Cpu className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className={cn("font-bold text-[11px] flex items-center gap-1", isDark ? "text-white" : "text-neutral-800")}>
                          Arcus
                          <span className={cn(
                            "px-1 py-0.2 rounded text-[7px] font-black uppercase tracking-wider",
                            isDark ? "bg-neutral-900 text-neutral-450" : "bg-neutral-100 text-neutral-600"
                          )}>
                            Flagship
                          </span>
                        </p>
                        <p className="text-[9px] text-neutral-500 font-light mt-0.5">Command-driven reasoning AI</p>
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
