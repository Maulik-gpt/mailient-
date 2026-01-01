"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";

export default function Home() {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const handleEntry = async () => {
      // Minimum display time for the splash screen to feel premium
      const startTime = Date.now();

      try {
        const session = await getSession();

        // Calculate remaining time to fulfill at least 2.5s of splash
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 2500 - elapsedTime);

        await new Promise(resolve => setTimeout(resolve, remainingTime));
        setIsExiting(true);

        // Final smooth exit delay
        await new Promise(resolve => setTimeout(resolve, 800));

        if (session) {
          // Logged in - check onboarding/home
          const response = await fetch('/api/onboarding/redirect');
          if (response.ok) {
            const data = await response.json();
            router.replace(data.redirectTo);
          } else {
            router.replace('/home-feed');
          }
        } else {
          // Not logged in
          router.replace('/auth/signin');
        }
      } catch (error) {
        console.error("Entry error:", error);
        router.replace('/auth/signin');
      }
    };

    handleEntry();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#000] flex flex-col items-center justify-center overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.03] rounded-full blur-[140px] animate-pulse" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/[0.02] rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/[0.02] rounded-full blur-[100px]" />
      </div>

      <div className={`relative z-10 flex flex-col items-center gap-12 transition-all duration-1000 ease-in-out ${isExiting ? 'opacity-0 scale-110 blur-xl' : 'opacity-100 scale-100 blur-0'}`}>
        {/* Core Squircle Logo Container */}
        <div className="group relative">
          {/* Outer Glow */}
          <div className="absolute -inset-4 bg-white/10 rounded-[40%] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />

          <div className="w-36 h-36 bg-[#0a0a0a] border border-white/10 rounded-[35%] flex items-center justify-center relative overflow-hidden shadow-[0_0_60px_rgba(255,255,255,0.05)] animate-entry-reveal">
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-transparent rotate-45 translate-y-full animate-slow-shimmer" />

            <img
              src="/favicon.png?v=6"
              alt="Mailient"
              className="w-24 h-24 object-contain opacity-100 transition-transform duration-1000 group-hover:scale-110"
            />
          </div>
        </div>

        {/* Brand Presence */}
        <div className="flex flex-col items-center space-y-6">
          <div className="overflow-hidden">
            <h1 className="text-white text-3xl font-bold tracking-[0.5em] uppercase leading-none animate-slide-up">
              MAILIENT
            </h1>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-48 h-[1px] bg-white/10 relative overflow-hidden rounded-full">
              <div className="absolute h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-loading-bar" />
            </div>
            <span className="text-[10px] text-white/40 uppercase tracking-[0.3em] animate-fade-in-delayed">
              Initializing Intelligence
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes entry-reveal {
          0% { transform: scale(0.7) translateY(20px); opacity: 0; filter: blur(20px); }
          100% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0); }
        }
        @keyframes slide-up {
          0% { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        @keyframes slow-shimmer {
          0% { transform: translateY(100%) rotate(45deg); }
          100% { transform: translateY(-100%) rotate(45deg); }
        }
        .animate-entry-reveal {
          animation: entry-reveal 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-up {
          animation: slide-up 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
          opacity: 0;
        }
        .animate-loading-bar {
          animation: loading-bar 3s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
        .animate-slow-shimmer {
          animation: slow-shimmer 4s ease-in-out infinite;
        }
        .animate-fade-in-delayed {
          animation: fadeIn 2s ease-out 1s forwards;
          opacity: 0;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
