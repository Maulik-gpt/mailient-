"use client";

import React from "react";
import { Changelog1 } from "@/components/ui/changelog-1";
import { FloatingNavbar } from "@/components/FloatingNavbar";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export default function ChangelogPage() {
  const entries = [
    {
      version: "v2.5.0",
      date: "04 April 2026",
      title: "Navigation & Legal Refinement",
      description: "A complete overhaul of our legal documentation UI and a new global navigation layer designed for fluid workspace movement.",
      items: [
        "Apple-inspired UI: Linear, minimalist design for Terms of Use and Privacy Policy for maximum legibility.",
        "Frosted Glass Navbar: A brand new floating navigation pill with 25% glassmorphism and spring-physics labels.",
        "Home Feed Auto-Fade: Intelligent navigation behavior that hides the navbar after 5 seconds on the home feed to maximize focus.",
        "Themed Toggle: Integrated persistent theme toggler at the top level for all support routes."
      ],
      image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200"
    },
    {
      version: "v2.4.0",
      date: "28 March 2026",
      title: "The Intelligence Update",
      description: "A major overhaul of our agentic intelligence and mission tracking system. We've introduced persistent memory protocols and fluid UI transitions.",
      items: [
        "Arcus Mission History: A persistent, indexed timeline of all agentic operations across your workspace.",
        "Ergonomic Symmetry: Completely redesigned chat interface with perfect vertical physics and responsive springs.",
        "⌘+Enter Bypass: New floating feedback utility with rapid submission shortcuts for power users.",
      ],
      image: "https://images.unsplash.com/photo-1620712943543-bcc4628c6bb5?auto=format&fit=crop&q=80&w=1200",
      button: {
        url: "/dashboard/agent-talk",
        text: "Launch Arcus"
      }
    },
    {
      version: "v2.3.5",
      date: "24 March 2026",
      title: "Protocol Refinement",
      description: "Focusing on infrastructure performance and high-tier accessibility for our power user base.",
      items: [
        "Intelligence Tiers: New high-contrast pricing system for optimized membership and resource routing.",
        "Route Latency Resolution: Fixed deep-linking lag when navigating between distant mission records in the history panel.",
        "Glassmorphic Dashboards: Enhanced texture and refraction levels for all top-level workspace controls.",
      ],
      image: "https://images.unsplash.com/photo-1614850523296-60c000dc0506?auto=format&fit=crop&q=80&w=1200"
    },
    {
      version: "v2.2.0",
      date: "18 March 2026",
      title: "Aether Engine v2",
      description: "The core engine powering our multi-agent orchestration has been upgraded to version 2.0 with significant speed improvements.",
      items: [
        "Aether Engine Deployment: Multi-agent orchestration for complex, multi-step mission planning is now live.",
        "Localized Intelligence Streaming: Reduced AI response latency by ~40% using localized edge processing.",
        "Workspace Utility Pack: Added native support for direct Notion and Google Calendar task synchronization.",
      ],
      image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=1200"
    },
    {
        version: "v2.1.0",
        date: "10 March 2026",
        title: "Sift Intelligence Release",
        description: "Launching Sift AI—our specialized intelligence layer for high-intent signal extraction.",
        items: [
          "Signal Intelligence: Automatically extract revenue opportunities and high-priority leads from the noise.",
          "Inbox Prioritization: Neural sorting that learns your priority levels based on historical engagement.",
          "Daily Sift Summaries: Automated morning reports delivered with key action items for the day."
        ],
        image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=1200"
    },
    {
        version: "v2.0.0",
        date: "01 March 2026",
        title: "The Agentic Core",
        description: "Initial Arcus Alpha launch—transitioning Mailient from an email tool to an agentic workspace.",
        items: [
          "Arcus Alpha: Our first production-ready AI agent capable of multi-app orchestration.",
          "Universal Prompt Bar: A single command interface for email, calendar, and task management.",
          "Secure OAuth Tunneling: Military-grade secure tunneling for all integrated Google and Notion accounts."
        ],
        image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=1200",
        button: {
          url: "/",
          text: "Start Exploring"
        }
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#fafafa] transition-colors duration-500">
      
      {/* Top Header Theme Toggle */}
      <div className="fixed top-8 right-8 z-50">
        <AnimatedThemeToggler className="bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-sm border border-neutral-200 dark:border-neutral-800" />
      </div>

      <div className="relative">
        <Changelog1
          title="Protocol Evolution"
          description="A chronological record of Mailient's architectural growth—from the initial agentic core to the advanced Aether orchestration engine."
          entries={entries}
        />
      </div>

      <FloatingNavbar />
    </div>
  );
}
