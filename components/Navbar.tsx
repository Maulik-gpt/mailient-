"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight, Mail, Sparkles, Cpu, Send, Layers } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
            ? "bg-white/75 backdrop-blur-xl border-neutral-200/50 shadow-[0_2px_20px_-10px_rgba(0,0,0,0.05)]"
            : "bg-transparent border-transparent py-6"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 rounded-lg bg-neutral-950 flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-105">
              <span className="text-white font-extrabold text-lg tracking-tighter">M</span>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-neutral-900 group-hover:text-black transition-colors font-satoshi">
              Mailient
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-neutral-600">
            {/* Product Dropdown Trigger */}
            <div
              className="relative py-2 cursor-pointer"
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <button className="flex items-center gap-1 hover:text-neutral-900 transition-colors focus:outline-none">
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
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 rounded-2xl border border-neutral-200/60 bg-white/95 backdrop-blur-md p-2 shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
                  >
                    <div className="grid gap-1">
                      <Link
                        href="/product/sift"
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-neutral-50 border border-neutral-200/50 flex items-center justify-center text-neutral-800 group-hover:bg-white group-hover:border-neutral-300 transition-colors">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-neutral-800">Sift</p>
                          <p className="text-[10px] text-neutral-500">Autonomous inbox triage</p>
                        </div>
                      </Link>

                      <Link
                        href="/product/drafts"
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-neutral-50 border border-neutral-200/50 flex items-center justify-center text-neutral-800 group-hover:bg-white group-hover:border-neutral-300 transition-colors">
                          <Send className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-neutral-800">Draft Reply</p>
                          <p className="text-[10px] text-neutral-500">Contextual high-fidelity drafts</p>
                        </div>
                      </Link>

                      <Link
                        href="/product/arcus"
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-neutral-950 flex items-center justify-center text-white">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-neutral-800 flex items-center gap-1.5">
                            Arcus
                            <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-[8px] font-black uppercase text-neutral-600 tracking-wider">
                              Flagship
                            </span>
                          </p>
                          <p className="text-[10px] text-neutral-500">Command-driven reasoning AI</p>
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
                "hover:text-neutral-900 transition-colors",
                pathname === "/product/arcus" && "text-neutral-950 font-semibold"
              )}
            >
              Arcus
            </Link>

            <Link
              href="/pricing"
              className={cn(
                "hover:text-neutral-900 transition-colors",
                pathname === "/pricing" && "text-neutral-950 font-semibold"
              )}
            >
              Pricing
            </Link>

            <Link
              href="/security"
              className={cn(
                "hover:text-neutral-900 transition-colors",
                pathname === "/security" && "text-neutral-950 font-semibold"
              )}
            >
              Security
            </Link>

            <Link
              href="/changelog"
              className={cn(
                "hover:text-neutral-900 transition-colors",
                pathname === "/changelog" && "text-neutral-950 font-semibold"
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
                  className="text-[13px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-[13px] font-medium text-neutral-500 hover:text-red-600 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="text-[13px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Sign in
                </Link>
                <button
                  onClick={handleConnectGmail}
                  className="relative group overflow-hidden px-4.5 py-2 rounded-full bg-neutral-950 text-white text-[12px] font-semibold tracking-tight transition-all duration-300 hover:bg-black hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
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
