"use client";

import React from "react";
import Link from "next/link";
import { Mail, Github, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";

interface FooterProps {
  theme?: "light" | "dark";
}

export function Footer({ theme = "light" }: FooterProps) {
  const isDark = theme === "dark";

  return (
    <footer className={cn(
      "py-16 px-6 font-satoshi relative z-10 w-full border-t",
      isDark
        ? "bg-neutral-950 border-neutral-900 text-neutral-300"
        : "bg-neutral-50 border-neutral-200/50 text-neutral-600"
    )}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
        {/* Info Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              isDark ? "bg-white" : "bg-neutral-950"
            )}>
              <span className={cn(
                "font-extrabold text-sm tracking-tighter",
                isDark ? "text-neutral-950" : "text-white"
              )}>M</span>
            </div>
            <span className={cn(
              "font-bold text-base tracking-tight",
              isDark ? "text-white" : "text-neutral-900"
            )}>
              Mailient
            </span>
          </div>
          <p className={cn(
            "text-xs leading-relaxed max-w-xs",
            isDark ? "text-neutral-400 font-light" : "text-neutral-500"
          )}>
            Hours of email, handled overnight. Autonomous email intelligence for modern companies that scale with code, not headcount.
          </p>
          <p className="text-[10px] text-neutral-500 mt-2 font-mono">
            &copy; {new Date().getFullYear()} Mailient Inc. All rights reserved.
          </p>
        </div>

        {/* Product Column */}
        <div>
          <h4 className={cn(
            "text-xs font-black uppercase tracking-widest mb-4",
            isDark ? "text-white" : "text-neutral-800"
          )}>
            Product
          </h4>
          <ul className={cn("space-y-2.5 text-xs font-semibold", isDark ? "text-neutral-400" : "text-neutral-500")}>
            <li>
              <Link href="/product/sift" className={cn("transition-colors", isDark ? "hover:text-white" : "hover:text-neutral-900")}>
                Sift Triage
              </Link>
            </li>
            <li>
              <Link href="/product/drafts" className={cn("transition-colors", isDark ? "hover:text-white" : "hover:text-neutral-900")}>
                Draft Replies
              </Link>
            </li>
            <li>
              <Link href="/product/arcus" className={cn("transition-colors", isDark ? "hover:text-white" : "hover:text-neutral-900")}>
                Arcus AI
              </Link>
            </li>
            <li>
              <Link href="/pricing" className={cn("transition-colors", isDark ? "hover:text-white" : "hover:text-neutral-900")}>
                Pricing Plans
              </Link>
            </li>
          </ul>
        </div>

        {/* Company Column */}
        <div>
          <h4 className={cn(
            "text-xs font-black uppercase tracking-widest mb-4",
            isDark ? "text-white" : "text-neutral-800"
          )}>
            Company
          </h4>
          <ul className={cn("space-y-2.5 text-xs font-semibold", isDark ? "text-neutral-400" : "text-neutral-500")}>
            <li>
              <Link href="/security" className={cn("transition-colors", isDark ? "hover:text-white" : "hover:text-neutral-900")}>
                Security Architecture
              </Link>
            </li>
            <li>
              <Link href="/changelog" className={cn("transition-colors", isDark ? "hover:text-white" : "hover:text-neutral-900")}>
                Changelog
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className={cn("transition-colors", isDark ? "hover:text-white" : "hover:text-neutral-900")}>
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms-of-service" className={cn("transition-colors", isDark ? "hover:text-white" : "hover:text-neutral-900")}>
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>

        {/* System Status / Trust Column */}
        <div>
          <h4 className={cn(
            "text-xs font-black uppercase tracking-widest mb-4",
            isDark ? "text-white" : "text-neutral-800"
          )}>
            System
          </h4>
          <ul className={cn("space-y-2.5 text-xs font-semibold", isDark ? "text-neutral-400" : "text-neutral-500")}>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className={isDark ? "text-neutral-200" : ""}>All Systems Operational</span>
            </li>
            <li>
              <span>Uptime: 99.98%</span>
            </li>
            <li>
              <span>SOC2 Type II Certified</span>
            </li>
            <li>
              <span className={cn(
                "text-[10px] italic block mt-1 max-w-[200px] font-normal leading-relaxed",
                isDark ? "text-neutral-500" : "text-neutral-400"
              )}>
                Mailient does not send emails without your manual approval.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
