"use client";

import React from "react";
import { motion } from "framer-motion";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { FloatingNavbar } from "@/components/FloatingNavbar";

interface Section {
  id: number;
  title: string;
  content: string | React.ReactNode;
}

export default function PrivacyPolicy() {
  const currentDate = "16 February 2026";

  const sections: Section[] = [
    {
      id: 1,
      title: "1. Information We Collect",
      content: (
        <div className="space-y-6">
          <p>Mailient (“Mailient”, “we”, “our”, or “us”) collects information to provide and improve our AI-powered email assistant. We strictly limit data collection to what is necessary for service functionality.</p>
          
          <div>
            <h3 className="font-bold text-black dark:text-white mb-2 uppercase tracking-wide text-xs">A. Account Information</h3>
            <p>When you create an account, we collect: Your name, email address, and basic profile details. This is used solely to manage your Mailient identity.</p>
          </div>

          <div>
            <h3 className="font-bold text-black dark:text-white mb-2 uppercase tracking-wide text-xs">B. Google User Data</h3>
            <p>When you connect your Google account, we request access only to the scopes required for the features you enable. Depending on your settings, we may access: Gmail content, metadata (sender, recipient, subject), thread info, and labels.</p>
            <p className="mt-2 text-sm italic opacity-80">Mailient does not access experimental or private data beyond what is explicitly enabled by the user.</p>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "2. How We Use Google User Data",
      content: (
        <div className="space-y-4">
          <p>Google user data is used exclusively to provide the core functionality of Mailient. We only perform actions you directly initiate. Typical use cases include:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Displaying integrated inboxes and message summaries</li>
            <li>Generating AI drafts at your request</li>
            <li>Workflow automation based on your manual confirmation</li>
          </ul>
          <p className="font-bold text-black dark:text-white uppercase text-xs tracking-widest pt-4">Strict Prohibitions:</p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
            <li>No data used for advertising, marketing, or general profiling</li>
            <li>We do NOT sell Google user data to any third party</li>
            <li>We do NOT use your private data to train public or shared AI models</li>
          </ul>
        </div>
      )
    },
    {
      id: 3,
      title: "3. AI Processing",
      content: (
        <div className="space-y-4">
          <p>When you use AI features (summarization, drafting), only the minimum data required to generate the output is securely transmitted to our AI infrastructure providers.</p>
          <p>These providers are contractually restricted from using your data for their own purpose. Data is treated with highest confidentiality.</p>
        </div>
      )
    },
    {
      id: 4,
      title: "4. Data Storage and Security",
      content: (
        <div className="space-y-4">
          <p>We implement reasonable administrative, technical, and physical safeguards to protect your data. This includes:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>HTTPS encryption for all data in transit</li>
            <li>Secure storage for OAuth access tokens</li>
            <li>Restricted internal access to platform infrastructure</li>
          </ul>
          <p className="text-xs opacity-60 italic pt-2">While we follow industry standards, no system is 100% secure.</p>
        </div>
      )
    },
    {
      id: 5,
      title: "5. Sharing and Disclosure",
      content: (
        <div className="space-y-4">
          <p>Mailient does not sell or rent data. We only share in limited cases:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Service Providers: Infrastructure and AI providers (minimum data required)</li>
            <li>Legal Requirements: If required by valid legal process or law</li>
          </ul>
          <p className="text-sm font-bold opacity-80 pt-2 italic">Google user data is never shared for marketing or unrelated analytics purposes.</p>
        </div>
      )
    },
    {
      id: 6,
      title: "6. Data Retention",
      content: (
        <div className="space-y-4">
          <p>We retain data only as long as necessary to provide our services. Disconnecting your account initiates data deletion within a reasonable timeframe (typically within 30 days).</p>
        </div>
      )
    },
    {
      id: 7,
      title: "7. User Control and Rights",
      content: (
        <div className="space-y-4">
          <p>You maintain full control. You may revoke access via Google account settings, disconnect individual accounts, or request full account deletion at any time.</p>
        </div>
      )
    },
    {
      id: 8,
      title: "8. Third-Party Services",
      content: (
        <div className="space-y-4">
          <p>Mailient integrates with trusted third-party providers. We are not responsible for their data handling; we encourage you to review their policies.</p>
        </div>
      )
    },
    {
      id: 9,
      title: "9. Changes to This Policy",
      content: (
        <div className="space-y-4">
          <p>Updates will be posted on this page with a revised effective date. Continued use constitutes acceptance of the new policy.</p>
        </div>
      )
    },
    {
      id: 10,
      title: "10. Contact",
      content: (
        <div className="space-y-4">
          <p>For any privacy requests or questions, reach us at: <a href="mailto:mailient.xyz@gmail.com" className="text-black dark:text-white font-medium underline underline-offset-4 decoration-neutral-300 dark:decoration-neutral-700 hover:decoration-black dark:hover:decoration-white transition-colors">mailient.xyz@gmail.com</a></p>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#fafafa] font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800 transition-colors duration-500">

      {/* Top Header with Theme Toggle */}
      <div className="fixed top-8 right-8 z-50">
        <AnimatedThemeToggler className="bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-sm border border-neutral-200 dark:border-neutral-800" />
      </div>

      <main className="max-w-[720px] mx-auto pt-40 pb-48 px-6">

        <header className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-black dark:text-white mb-6">
              Privacy Policy
            </h1>
            <p className="text-sm font-semibold tracking-wide text-neutral-400 dark:text-neutral-500 uppercase">
              Effective Date: {currentDate}
            </p>
            <div className="h-px w-full bg-neutral-100 dark:bg-neutral-900 my-10" />
          </motion.div>
        </header>

        <div className="space-y-20 text-[17px] leading-[1.7] text-neutral-600 dark:text-neutral-300 font-normal">
          {sections.map((section) => (
            <motion.section
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              className="group"
            >
              <h2 className="text-2xl font-bold text-black dark:text-white mb-6 tracking-tight">
                {section.title}
              </h2>
              {section.content}
            </motion.section>
          ))}
        </div>

        <footer className="mt-40 pt-16 border-t border-neutral-100 dark:border-neutral-900 text-center">
            <p className="mt-8 text-neutral-400 dark:text-neutral-500 text-xs">
                &copy; 2026 Mailient. All rights reserved.
            </p>
        </footer>
      </main>

      <FloatingNavbar />

    </div>
  );
}
