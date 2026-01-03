"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Target,
  TrendingUp,
  Mail,
  ArrowRight,
  MousePointer2,
  Lock
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: <Sparkles className="w-5 h-5 text-blue-400" />,
      title: "AI Sift Intelligence",
      description: "Automatically identify opportunities, hot leads, and urgent risks hidden in your inbox."
    },
    {
      icon: <Target className="w-5 h-5 text-purple-400" />,
      title: "Smart Prioritization",
      description: "Focus on what matters. Mailient separates signals from noise with precision."
    },
    {
      icon: <Zap className="w-5 h-5 text-yellow-400" />,
      title: "AI-Powered Drafts",
      description: "Generate high-context replies in seconds, tailored to your business logic."
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#fafafa] selection:bg-white/10 selection:text-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${scrolled ? 'bg-black/80 backdrop-blur-md border-white/5 py-4' : 'bg-transparent border-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/favicon.png?v=6" alt="Mailient" className="w-5 h-5 object-contain" />
            </div>
            <span className="font-bold tracking-widest text-lg">MAILIENT</span>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-6 text-sm text-neutral-400 font-medium">
              <a href="#features" className="hover:text-white transition-colors">Intelligence</a>
              <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy</a>
            </div>

            {status === "authenticated" ? (
              <button
                onClick={() => router.push('/home-feed')}
                className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-neutral-200 transition-all"
              >
                Dashboard
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => signIn('google')}
                  className="hidden sm:block text-sm font-medium text-neutral-400 hover:text-white transition-colors text-nowrap"
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push('/auth/signin')}
                  className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-neutral-200 transition-all text-nowrap"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] -z-10 opacity-50" />
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] -z-10 opacity-30" />

        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest uppercase text-blue-400 mb-8">
              <Sparkles className="w-3 h-3" />
              Intelligence Layer for Business Email
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] mb-8 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
              TRANSFORM YOUR<br />INBOX INTO ASSETS.
            </h1>

            <p className="max-w-2xl mx-auto text-lg text-neutral-400 font-medium leading-relaxed mb-12">
              Mailient is an AI-powered email intelligence platform that automatically identifies high-value opportunities, tracks relationships, and drafts responses—so you can focus on building your business.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <button
                onClick={() => router.push('/auth/signin')}
                className="w-full sm:w-auto px-10 py-4 bg-white text-black font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
              >
                Connect Your Inbox
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-10 py-4 bg-white/5 border border-white/10 font-bold rounded-2xl hover:bg-white/10 transition-all"
              >
                Learn More
              </button>
            </div>
          </motion.div>

          {/* Product Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="relative max-w-5xl mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10" />
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-2 shadow-2xl relative overflow-hidden group">
              {/* Fake UI Header */}
              <div className="h-12 border-b border-white/5 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                <div className="w-3 h-3 rounded-full bg-green-500/20" />
                <div className="ml-4 w-40 h-4 bg-white/5 rounded-full" />
              </div>

              {/* Visual representation of the dashboard */}
              <div className="aspect-[16/9] bg-[#0c0c0c] p-8 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div className="w-32 h-8 bg-white/10 rounded-lg animate-pulse" />
                  <div className="flex gap-2">
                    <div className="w-20 h-8 bg-blue-500/20 border border-blue-500/20 rounded-lg" />
                    <div className="w-20 h-8 bg-white/5 rounded-lg" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between">
                      <div className="w-12 h-12 rounded-lg bg-white/5" />
                      <div className="w-full h-4 bg-white/10 rounded-full" />
                    </div>
                  ))}
                </div>

                <div className="flex-1 rounded-xl border border-white/5 bg-white/[0.01] p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/10" />
                      <div className="space-y-2">
                        <div className="w-48 h-4 bg-white/10 rounded-full" />
                        <div className="w-32 h-3 bg-white/5 rounded-full" />
                      </div>
                    </div>
                    <div className="w-full h-[1px] bg-white/5" />
                    <div className="space-y-2">
                      <div className="w-full h-3 bg-white/5 rounded-full" />
                      <div className="w-full h-3 bg-white/5 rounded-full" />
                      <div className="w-2/3 h-3 bg-white/5 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Float details */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20">
                <div className="px-6 py-3 bg-white text-black rounded-full font-bold shadow-2xl flex items-center gap-2 scale-110">
                  <MousePointer2 className="w-4 h-4 fill-black" />
                  Explore Intelligence
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Built for the high-output founder.</h2>
            <p className="text-neutral-500 max-w-xl font-medium">
              We leverage large language models to analyze your emails and identify what truly matters for your bottom line.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -5 }}
                className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed font-medium">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section (Google likes this) */}
      <section className="py-20 bg-white/5 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 text-blue-400 text-xs font-bold tracking-widest uppercase mb-4">
              <ShieldCheck className="w-4 h-4" />
              Privacy First Design
            </div>
            <h2 className="text-3xl font-bold mb-6">Your data stays yours.</h2>
            <p className="text-neutral-400 font-medium">
              Mailient uses secure OAuth 2.0 to access your Gmail. We never store your login credentials, and your email content is processed in real-time to generate insights without permanent storage of your messages.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl border border-white/10 bg-black flex flex-col items-center justify-center text-center gap-3">
              <Lock className="w-6 h-6 text-neutral-500" />
              <span className="text-xs font-bold text-neutral-400">Secure OAuth</span>
            </div>
            <div className="p-6 rounded-2xl border border-white/10 bg-black flex flex-col items-center justify-center text-center gap-3">
              <ShieldCheck className="w-6 h-6 text-neutral-500" />
              <span className="text-xs font-bold text-neutral-400">SSL Encrypted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
                <img src="/favicon.png?v=6" alt="Mailient" className="w-5 h-5 object-contain" />
              </div>
              <span className="font-bold tracking-widest text-lg">MAILIENT</span>
            </div>
            <p className="text-neutral-500 text-sm max-w-sm font-medium">
              Transforming the inbox from a chore into a competitive advantage.
              Built for high-performance teams and individual contributors.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-6 uppercase tracking-widest">Platform</h4>
            <ul className="space-y-4 text-sm text-neutral-500 font-medium">
              <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="/auth/signin" className="hover:text-white transition-colors">Login</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-6 uppercase tracking-widest">Legal</h4>
            <ul className="space-y-4 text-sm text-neutral-500 font-medium">
              <li><a href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-10 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-xs text-neutral-600 font-medium">
            © 2026 Mailient Intelligence. All rights reserved.
          </p>
          <div className="flex items-center gap-6 grayscale opacity-50">
            {/* Visual indicator of Google connection capability */}
            <div className="flex items-center gap-2">
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4 opacity-70" alt="Google" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Gmail Integrated</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
