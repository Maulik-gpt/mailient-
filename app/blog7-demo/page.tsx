"use client";

import React, { useEffect, useState } from "react";
import { Blog7 } from "@/components/blocks/blog7";
import { Navbar } from "@/components/Navbar";
import { useTheme } from "next-themes";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Footer } from "@/components/Footer";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import AnimatedGradient from "@/components/ui/animated-gradient";

const demoData = {
  tagline: "Latest Insights",
  heading: "Mailient Engineering",
  description:
    "Explore our technical deep dives into building scalable, encrypted, and autonomous AI systems. Discover how we're redefining email productivity.",
  buttonText: "Explore all technical posts",
  buttonUrl: "/blogs",
  posts: [
    {
      id: "post-1",
      title: "Building Autonomous Email Agents in Next.js",
      summary:
        "Learn how we implemented the Arcus AI engine using Next.js, Vercel AI SDK, and OpenAI to autonomously manage calendar scheduling and triage.",
      label: "Engineering",
      author: "Maulik",
      published: "May 24, 2026",
      url: "/blogs",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: "post-2",
      title: "Zero-Knowledge Architecture for Inboxes",
      summary:
        "A deep dive into our client-side encryption implementation. How we secure user data so even we cannot read the contents of your emails.",
      label: "Security",
      author: "Mailient Team",
      published: "May 20, 2026",
      url: "/blogs",
      image: "https://images.unsplash.com/photo-1614064641913-6b71a2ec06f7?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: "post-3",
      title: "Designing the Perfect Voice Profile API",
      summary:
        "How we leverage LLMs to learn and mimic user writing styles dynamically. Our journey from basic RAG to advanced few-shot persona prompting.",
      label: "AI Research",
      author: "Maulik",
      published: "May 15, 2026",
      url: "/blogs",
      image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2070&auto=format&fit=crop",
    },
  ],
};

export default function Blog7DemoPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.title = "Blog7 Component Demo // Mailient";
  }, []);

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");
  const currentTheme = isDark ? "dark" : "light";

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#fafafa] flex flex-col items-center justify-start overflow-x-hidden font-satoshi strichpunkt-theme relative selection:bg-neutral-200 dark:selection:bg-neutral-800 transition-colors duration-500">
      <Navbar theme={currentTheme} />
      <div className="fixed top-8 right-8 z-50">
        <AnimatedThemeToggler className="bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-sm border border-neutral-200 dark:border-neutral-800" />
      </div>

      {/* Atmospheric backgrounds */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
            backgroundSize: "24px 24px"
          }}
        />
        <div className="absolute top-[15%] left-1/4 w-[800px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(150,150,150,0.015),transparent_70%)] blur-[100px]" />
        <div className="absolute top-[45%] right-1/4 w-[700px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(150,150,150,0.01),transparent_70%)] blur-[120px]" />
      </div>

      <AnimatedGradient
        config={{ preset: "Prism", speed: 6 }}
        noise={{ opacity: 0.008 }}
        className="opacity-15 pointer-events-none"
      />

      <main className="relative z-10 w-full pt-20">
        <Blog7 {...demoData} />
      </main>

      <Footer />

      <ProgressiveBlur position="top" backgroundColor="var(--blur-bg)" height="120px" blurAmount="10px" className="fixed z-40" />
      <ProgressiveBlur position="bottom" backgroundColor="var(--blur-bg)" height="80px" blurAmount="10px" className="fixed z-40" />
    </div>
  );
}
