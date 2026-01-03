"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ArrowUpRight,
  Mail,
  Zap,
  Fingerprint,
  ChevronRight,
  Lock,
  Cpu,
  Workflow,
  Sparkles,
  Command,
  Search,
  CheckCircle2,
  Globe
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const fadeIn = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#020202] text-white selection:bg-white selection:text-black font-['Satoshi'] overflow-x-hidden">
      {/* Background Intelligence */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-[120px] transition-transform duration-1000 ease-out"
          style={{
            transform: `translate(${mousePos.x - 400}px, ${mousePos.y - 400}px)`,
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02)_0%,transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[1px] bg-white z-[60] origin-left"
        style={{ scaleX: smoothProgress }}
      />

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${scrolled ? 'bg-black/60 backdrop-blur-2xl border-b border-white/5 py-4' : 'bg-transparent py-8'}`}>
        <div className="max-w-[1400px] mx-auto px-8 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="relative">
              <div className="w-10 h-10 bg-white flex items-center justify-center rounded-sm group-hover:rotate-90 transition-transform duration-700">
                <Mail className="w-6 h-6 text-black" strokeWidth={1} />
              </div>
              <div className="absolute -inset-1 bg-white/20 blur-sm rounded-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="font-black tracking-[0.4em] text-xl uppercase italic">Mailient</span>
          </motion.div>

          <div className="flex items-center gap-12">
            <div className="hidden lg:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
              <a href="#about" className="hover:text-white transition-all relative group">
                Intelligence
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white transition-all group-hover:w-full" />
              </a>
              <a href="#integration" className="hover:text-white transition-all relative group">
                Security
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white transition-all group-hover:w-full" />
              </a>
              <a href="/pricing" className="hover:text-white transition-all relative group">
                Access
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white transition-all group-hover:w-full" />
              </a>
            </div>

            {status === "authenticated" ? (
              <button
                onClick={() => router.push('/home-feed')}
                className="group relative px-8 py-2.5 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] overflow-hidden"
              >
                <span className="relative z-10">Dashboard</span>
                <div className="absolute inset-0 bg-zinc-200 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              </button>
            ) : (
              <div className="flex items-center gap-8">
                <button
                  onClick={() => signIn('google')}
                  className="hidden sm:block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push('/auth/signin')}
                  className="group relative px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] overflow-hidden"
                >
                  <span className="relative z-10 font-black">Get Access</span>
                  <div className="absolute inset-0 bg-zinc-100 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex flex-col items-center justify-center pt-32 px-8 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_50%)]" />
        </div>

        <div className="relative z-10 max-w-[1200px] w-full text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-white/5 mb-14 bg-white/[0.02] backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-zinc-400">AI Neural Layer Operating System</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-[14vw] sm:text-[12vw] lg:text-[10vw] font-black tracking-[-0.07em] leading-[0.8] mb-14 italic uppercase"
          >
            Your Inbox<br />
            <span className="text-zinc-800">Perfected.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="max-w-3xl mx-auto"
          >
            <p className="text-xl md:text-2xl text-zinc-500 font-medium leading-relaxed mb-16 tracking-tight">
              Mailient transforms Gmail into a high-performance engine. <br className="hidden md:block" />
              Identify revenue, manage relationships, and automate with absolute precision.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <button
                onClick={() => router.push('/auth/signin')}
                className="w-full sm:w-auto px-16 py-6 bg-white text-black font-black uppercase tracking-[0.3em] text-[11px] flex items-center justify-center gap-4 group hover:bg-black hover:text-white border border-white transition-all duration-700 shadow-[0_0_50px_rgba(255,255,255,0.1)] hover:shadow-none"
              >
                Connect Gmail
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
              <button
                onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-16 py-6 border border-white/5 text-zinc-400 font-black uppercase tracking-[0.3em] text-[11px] hover:border-white/20 hover:text-white transition-all duration-700 bg-white/[0.01]"
              >
                Explore Neural System
              </button>
            </div>
        </div>
    </div>

        {/* Hero Visual Mockup */ }
  <motion.div
    initial={{ opacity: 0, y: 100 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 1.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
    className="mt-32 w-full max-w-[1100px] aspect-[16/10] bg-zinc-950 rounded-t-[3rem] border-x border-t border-white/10 p-6 relative group overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent z-20" />
    <div className="w-full h-full bg-[#050505] rounded-[2rem] border border-white/5 flex flex-col overflow-hidden shadow-2xl">
      <div className="h-14 border-b border-white/5 flex items-center px-8 justify-between bg-black/40">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
        </div>
        <div className="flex items-center gap-4">
          <div className="w-32 h-2 bg-white/10 rounded-full" />
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5" />
        </div>
      </div>
      <div className="flex-1 p-10 flex gap-10">
        <div className="w-64 space-y-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-10 rounded-lg bg-white/${i === 1 ? '10' : '5'} border border-white/5 transition-all group-hover:translate-x-1 duration-500`} style={{ delay: `${i * 100}ms` }} />
          ))}
        </div>
        <div className="flex-1 space-y-8">
          <div className="flex justify-between">
            <div className="w-48 h-8 bg-white/10 rounded-xl" />
            <div className="flex gap-3">
              <div className="w-24 h-8 bg-white text-black font-black text-[10px] flex items-center justify-center rounded-lg">SIFT AI</div>
              <div className="w-8 h-8 bg-zinc-900 rounded-lg border border-white/5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-40 rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-white/5" />
              <div className="w-full h-2 bg-white/10 rounded-full" />
              <div className="w-2/3 h-2 bg-white/5 rounded-full" />
            </div>
            <div className="h-40 rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-white/5" />
              <div className="w-full h-2 bg-white/10 rounded-full" />
              <div className="w-2/3 h-2 bg-white/5 rounded-full" />
            </div>
          </div>
          <div className="h-64 rounded-3xl bg-zinc-900/30 border border-white/5 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6">
              <div className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Neural Draft</div>
            </div>
            <div className="space-y-4">
              <div className="w-3/4 h-3 bg-white/20 rounded-full" />
              <div className="w-full h-3 bg-white/10 rounded-full" />
              <div className="w-2/3 h-3 bg-white/5 rounded-full" />
              <div className="w-4/5 h-3 bg-white/10 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* Spotlight overlay in mockup */}
    <div className="absolute inset-0 z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000 bg-[radial-gradient(circle_at_var(--x)_var(--y),rgba(255,255,255,0.05)_0%,transparent_50%)]"
      style={{ '--x': '50%', '--y': '50%' }} />
  </motion.div>
      </section >

    {/* Philosophy Section */ }
    < section id = "about" className = "py-60 bg-white text-black relative z-20" >
      <div className="max-w-[1400px] mx-auto px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-end mb-40">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <div className="inline-flex items-center gap-3 mb-10 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">
              <div className="w-10 h-[1px] bg-zinc-200" />
              The Core Philosophy
            </div>
            <h2 className="text-[9vw] lg:text-[7vw] font-black tracking-[-0.07em] leading-[0.85] mb-12 uppercase italic">
              Signal is <br />
              Everything.
            </h2>
            <p className="text-2xl font-medium leading-relaxed max-w-xl text-zinc-800">
              Most email systems are archives. <br />
              <span className="font-black italic">Mailient is an intelligence operation.</span> <br />
              We extract high-frequency signals from the noise of your network to drive growth.
            </p>
          </motion.div>

          <div className="flex flex-col items-end gap-12">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.5 }}
              className="h-[1px] bg-black/10"
            />
            <div className="grid grid-cols-2 gap-16 w-full">
              <div className="space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400">01 / Logic</p>
                <h4 className="text-xl font-black uppercase italic tracking-tighter">Business Alignment</h4>
                <p className="text-sm font-medium text-zinc-500 leading-relaxed italic">The AI understands your goals, revenue streams, and relationship value before processing any thread.</p>
              </div>
              <div className="space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400">02 / Action</p>
                <h4 className="text-xl font-black uppercase italic tracking-tighter">Proactive Sifting</h4>
                <p className="text-sm font-medium text-zinc-500 leading-relaxed italic">Intelligence that acts. We don't just categorize; we prepare your next move with context-aware responses.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-1px bg-black/5 border border-black/5 overflow-hidden rounded-[2.5rem]">
          <FeatureCard
            icon={<Cpu className="w-10 h-10" strokeWidth={1} />}
            title="Aether Core"
            desc="Deep-layer scanning of every communication. We identify patterns invisible to the human eye."
            index={0}
          />
          <FeatureCard
            icon={<Workflow className="w-10 h-10" strokeWidth={1} />}
            title="Neural Flow"
            desc="Sophisticated drafting engine that maintains your voice while maximizing for conversion and clarity."
            index={1}
          />
          <FeatureCard
            icon={<Fingerprint className="w-10 h-10" strokeWidth={1} />}
            title="Contact ID"
            desc="Real-time dossier generation for every participant. Never go into a thread blind again."
            index={2}
          />
        </div>
      </div>
      </section >

    {/* Integration & Security Section */ }
    < section id = "integration" className = "py-60 relative overflow-hidden" >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        <div className="max-w-[1400px] mx-auto px-12">
          <div className="flex flex-col items-center text-center mb-40">
            <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               whileInView={{ opacity: 1, scale: 1 }}
               viewport={{ once: true }}
               className="inline-block p-1 bg-gradient-to-br from-white/10 to-transparent rounded-[2.5rem] mb-16"
            >
               <div className="bg-[#050505] p-10 rounded-[2.4rem] border border-white/5 flex items-center gap-10 grayscale hover:grayscale-0 transition-all duration-1000">
                  <Globe className="w-12 h-12 text-blue-400" />
                  <div className="w-[1px] h-12 bg-white/10" />
                  <img src="https://www.google.com/favicon.ico" className="w-12 h-12" alt="Google" />
                  <div className="w-[1px] h-12 bg-white/10" />
                  <Mail className="w-12 h-12 text-white" strokeWidth={1} />
               </div>
            </motion.div>
            
            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-[-0.08em] mb-10 italic">Secured by Google</h2>
            <p className="max-w-3xl text-2xl text-zinc-500 font-medium leading-relaxed tracking-tight">
              We leverage enterprise-grade OAuth 2.0. Mailient acts as an intelligence proxy—we never store your access credentials or build hidden databases of your private content.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="group relative p-16 bg-zinc-950 border border-white/5 rounded-[3rem] overflow-hidden transition-all duration-700 hover:border-white/20">
               <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <ShieldCheck className="w-14 h-14 mb-10 text-white group-hover:scale-110 transition-transform duration-700" strokeWidth={1} />
               <h3 className="text-3xl font-black uppercase mb-6 italic tracking-tighter">Zero Trust Architecture</h3>
               <p className="text-zinc-500 text-lg font-medium leading-relaxed italic">
                 Your data is processed in isolated volatile memory. Once insights are extracted, the raw content is purged from our intelligence cycle.
               </p>
            </div>
            <div className="group relative p-16 bg-zinc-950 border border-white/5 rounded-[3rem] overflow-hidden transition-all duration-700 hover:border-white/20">
               <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <Lock className="w-14 h-14 mb-10 text-white group-hover:scale-110 transition-transform duration-700" strokeWidth={1} />
               <h3 className="text-3xl font-black uppercase mb-6 italic tracking-tighter">Full Permission Control</h3>
               <p className="text-zinc-500 text-lg font-medium leading-relaxed italic">
                 You define the perimeter. Disconnect access in one click and wipe all generated intelligence instantly from our systems.
               </p>
            </div>
          </div>
        </div>
      </section >

    {/* Founder / Architect Section */ }
    < section className = "py-60 bg-zinc-950/50 relative" >
      <div className="max-w-[1400px] mx-auto px-12">
        <div className="flex flex-col items-center">
          <div className="inline-flex items-center gap-4 mb-20">
            <div className="w-12 h-[1px] bg-zinc-800" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.6em] text-zinc-600">The Neural Architect</h4>
            <div className="w-12 h-[1px] bg-zinc-800" />
          </div>

          <div className="flex flex-col items-center gap-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="relative group cursor-pointer"
            >
              <div className="absolute -inset-10 bg-white/[0.03] rounded-full blur-3xl group-hover:bg-white/[0.07] transition-all duration-1000" />
              <div className="relative w-48 h-48 rounded-full border border-white/10 flex items-center justify-center p-3 grayscale group-hover:grayscale-0 transition-all duration-1000">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white font-black text-6xl tracking-tighter border border-white/20 shadow-[0_0_60px_rgba(255,255,255,0.05)] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent opacity-50" />
                  <span className="relative z-10 italic">M</span>
                </div>
              </div>
            </motion.div>

            <div className="text-center">
              <h3 className="text-5xl font-black uppercase tracking-[-0.05em] mb-4 italic">Maulik</h3>
              <p className="text-[12px] font-black uppercase tracking-[0.4em] text-zinc-500">Founder & Core Engineer</p>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl text-center text-zinc-400 font-medium text-2xl leading-relaxed italic border-x border-white/5 px-20 tracking-tight"
            >
              "We didn't build Mailient to manage emails. We built it to manage <span className="text-white">velocity</span>. The modern inbox is where most businesses slow down—we're here to make it where you accelerate."
            </motion.p>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="mt-10"
            >
              <a
                href="https://x.com/Maulik_055"
                target="_blank"
                className="flex items-center gap-4 px-10 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.4em] rounded-full hover:bg-zinc-200 transition-all group"
              >
                Network with the founder
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </a>
            </motion.div>
          </div>
        </div>
      </div>
      </section >

    {/* Footer */ }
    < footer className = "py-24 border-t border-white/[0.03] bg-[#020202]" >
      <div className="max-w-[1400px] mx-auto px-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-24 mb-32">
          <div className="col-span-2 space-y-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white flex items-center justify-center rounded-sm">
                <Mail className="w-7 h-7 text-black" strokeWidth={1} />
              </div>
              <span className="font-black tracking-[0.4em] text-2xl uppercase italic">Mailient</span>
            </div>
            <p className="text-zinc-500 text-lg max-w-sm font-medium leading-relaxed tracking-tight italic">
              Redefinition of high-performance communication. Built for the elite class of founders and operators.
            </p>
          </div>

          <div className="space-y-10">
            <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white">System</h4>
            <ul className="space-y-5 text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
              <li><a href="#about" className="hover:text-white transition-all">Intelligence</a></li>
              <li><a href="/pricing" className="hover:text-white transition-all">Capital Access</a></li>
              <li><a href="/auth/signin" className="hover:text-white transition-all">Neural Login</a></li>
            </ul>
          </div>

          <div className="space-y-10">
            <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Protocol</h4>
            <ul className="space-y-5 text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
              <li><a href="/privacy-policy" className="hover:text-white transition-all">Privacy Policy</a></li>
              <li><a href="/terms-of-service" className="hover:text-white transition-all">Service Terms</a></li>
              <li><a href="/contact" className="hover:text-white transition-all">Secure Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-12 pt-16 border-t border-white/5">
          <div className="flex flex-col gap-4">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-800">
              © 2026 Mailient Intelligence Layer. All Rights Reserved.
            </p>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-800">
              Distributed & Encrypted via Arcus Network.
            </p>
          </div>

          <div className="flex items-center gap-12">
            <div className="flex items-center gap-4 grayscale opacity-20 hover:opacity-100 transition-opacity duration-1000 cursor-default">
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-400">Gmail Native Protocol</span>
            </div>
            <div className="flex items-center gap-4 grayscale opacity-20 hover:opacity-100 transition-opacity duration-1000 cursor-default">
              <div className="w-5 h-5 border border-zinc-800 rounded-sm flex items-center justify-center">
                <Lock className="w-3 h-3" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-400">SHA-256 Encrypted</span>
            </div>
          </div>
        </div>
      </div>
      </footer >
    </div >
  );
}

function FeatureCard({ icon, title, desc, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.8, delay: index * 0.2 }}
      className="p-16 bg-white flex flex-col gap-12 group cursor-default relative overflow-hidden transition-all duration-1000 hover:bg-zinc-50"
    >
      <div className="relative">
        <div className="w-20 h-20 flex items-center justify-center bg-black/5 rounded-[1.5rem] group-hover:bg-black group-hover:text-white transition-all duration-700 group-hover:rotate-6">
          {icon}
        </div>
        <div className="absolute -inset-2 bg-black/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      </div>

      <div className="space-y-6">
        <h3 className="text-3xl font-black uppercase tracking-[-0.05em] italic">{title}</h3>
        <p className="text-zinc-500 font-medium text-lg leading-relaxed italic pr-10">{desc}</p>
      </div>

      <div className="mt-8 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-[-10px] group-hover:translate-x-0">
        Review Protocol <ChevronRight className="w-3.5 h-3.5" />
      </div>

      {/* Modern Card Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-100 rounded-bl-[100%] transition-transform duration-1000 translate-x-full group-hover:translate-x-0" />
    </motion.div>
  );
}
