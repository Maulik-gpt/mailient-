"use client";

import React from "react";
import Link from "next/link";
import { Mail, Github, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-neutral-50 border-t border-neutral-200/50 py-16 px-6 font-satoshi relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
        {/* Info Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-950 flex items-center justify-center">
              <span className="text-white font-extrabold text-sm tracking-tighter">M</span>
            </div>
            <span className="font-semibold text-base tracking-tight text-neutral-900">
              Mailient
            </span>
          </div>
          <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
            Hours of email, handled overnight. Autonomous email intelligence for modern companies that scale with code, not headcount.
          </p>
          <p className="text-[10px] text-neutral-400 mt-2">
            &copy; {new Date().getFullYear()} Mailient Inc. All rights reserved.
          </p>
        </div>

        {/* Product Column */}
        <div>
          <h4 className="text-xs font-semibold text-neutral-800 uppercase tracking-widest mb-4">
            Product
          </h4>
          <ul className="space-y-2.5 text-xs text-neutral-500">
            <li>
              <Link href="/product/sift" className="hover:text-neutral-900 transition-colors">
                Sift Triage
              </Link>
            </li>
            <li>
              <Link href="/product/drafts" className="hover:text-neutral-900 transition-colors">
                Draft Replies
              </Link>
            </li>
            <li>
              <Link href="/product/arcus" className="hover:text-neutral-900 transition-colors">
                Arcus AI
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-neutral-900 transition-colors">
                Pricing Plans
              </Link>
            </li>
          </ul>
        </div>

        {/* Company Column */}
        <div>
          <h4 className="text-xs font-semibold text-neutral-800 uppercase tracking-widest mb-4">
            Company
          </h4>
          <ul className="space-y-2.5 text-xs text-neutral-500">
            <li>
              <Link href="/security" className="hover:text-neutral-900 transition-colors">
                Security Architecture
              </Link>
            </li>
            <li>
              <Link href="/changelog" className="hover:text-neutral-900 transition-colors">
                Changelog
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="hover:text-neutral-900 transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms-of-service" className="hover:text-neutral-900 transition-colors">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>

        {/* System Status / Trust Column */}
        <div>
          <h4 className="text-xs font-semibold text-neutral-800 uppercase tracking-widest mb-4">
            System
          </h4>
          <ul className="space-y-2.5 text-xs text-neutral-500">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational</span>
            </li>
            <li>
              <span>Uptime: 99.98%</span>
            </li>
            <li>
              <span>SOC2 Type II Certified</span>
            </li>
            <li>
              <span className="text-[10px] text-neutral-400 italic block mt-1 max-w-[200px]">
                Mailient does not send emails without your manual approval.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
