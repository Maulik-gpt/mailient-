"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useScroll, AnimatePresence } from "framer-motion"
import { Mail, Zap, Shield, ArrowRight, Bot, Layers, Star, Check, ShieldCheck, Lock, BarChart3, Activity, Cpu, Sparkles, Loader2, Volume2, Pause, Clock, Share2, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BackgroundShaders } from "@/components/ui/background-paper-shaders"
import { PricingSection } from "@/components/ui/pricing"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { HeroGeometric } from "@/components/ui/shape-landing-hero"
import { useSmoothScroll } from "@/hooks/use-smooth-scroll"

const plans = [
    {
        name: "Free",
        info: "Experience the power of Mailient AI — no credit card required",
        price: { monthly: 0, yearly: 0 },
        features: [
            { text: "1 AI Draft per day" },
            { text: "1 Sift Analysis per day" },
            { text: "3 Email Summaries per day" },
            { text: "Secure Google OAuth" },
            { text: "Basic Relationship Tracking" }
        ],
        btn: { text: "Start Free", href: "/auth/signin" }
    },
    {
        name: "Starter",
        info: "For solopreneurs ready to automate their inbox at scale",
        price: { monthly: 7.99, yearly: 7.99 },
        features: [
            { text: "10 AI Drafts per day" },
            { text: "10 Sift Analyses per day" },
            { text: "20 Arcus AI queries per day" },
            { text: "30 Email Summaries per day" },
            { text: "Standard Relationship Tracking" }
        ],
        btn: { text: "Get Started", href: "/auth/signin" },
        highlighted: true
    },
    {
        name: "Pro",
        info: "Unlimited power for teams and power users who demand the best",
        price: { monthly: 29.99, yearly: 29.99 },
        features: [
            { text: "Everything in Starter" },
            { text: "Unlimited AI Processing" },
            { text: "Advanced Relationship Tracking" },
            { text: "Custom Neural Voice" },
            { text: "Priority Support" },
            { text: "Unlimited Draft Replies" }
        ],
        btn: { text: "Go Pro", href: "/auth/signin" }
    }
];

export function LinearLanding() {
    const router = useRouter()
    const { data: session, status } = useSession()
    const [scrolled, setScrolled] = useState(false)
    const { handleClick } = useSmoothScroll()
    const [activeStep, setActiveStep] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50)
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % 3)
        }, 8000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div ref={containerRef} className="relative min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans overflow-x-hidden scroll-smooth">
            {/* Background Layer */}
            <div className="fixed inset-0 z-0 pointer-events-none select-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:60px_60px]" />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
            </div>

            {/* Navigation */}
            <motion.nav
                initial={false}
                animate={scrolled ? "scrolled" : "top"}
                variants={{
                    top: {
                        width: "100%",
                        maxWidth: "1400px",
                        backgroundColor: "rgba(0, 0, 0, 0)",
                        backdropFilter: "blur(0px)",
                        paddingTop: "32px",
                        paddingBottom: "32px",
                        y: 0,
                    },
                    scrolled: {
                        width: "100%",
                        maxWidth: "100%",
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        backdropFilter: "blur(12px)",
                        paddingTop: "16px",
                        paddingBottom: "16px",
                        y: 0,
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    }
                }}
                className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
            >
                <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <div className="w-5 h-5 bg-white shrink-0" />
                            <span className="font-medium text-white uppercase text-[10px] font-mono tracking-[0.3em]">Mailient</span>
                        </div>

                        <div className="hidden md:flex items-center gap-10 text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-500">
                            <a href="#benefits" onClick={(e) => handleClick(e, 'benefits')} className="hover:text-white transition-colors">Benefits</a>
                            <a href="#features" onClick={(e) => handleClick(e, 'features')} className="hover:text-white transition-colors">Features</a>
                            <a href="#integration" onClick={(e) => handleClick(e, 'integration')} className="hover:text-white transition-colors">Security</a>
                            <a href="/founders-guide" className="hover:text-white transition-colors">Intel Hub</a>
                            <a href="/workspace-setup" className="hover:text-white transition-colors">Setup</a>
                            <a href="#pricing" onClick={(e) => handleClick(e, 'pricing')} className="hover:text-white transition-colors">Pricing</a>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 text-[9px] font-mono uppercase tracking-[0.3em]">
                        {status === "authenticated" ? (
                            <button onClick={() => router.push('/home-feed?welcome=true')} className="text-white hover:text-zinc-400 transition-colors">
                                Dashboard
                            </button>
                        ) : (
                            <>
                                <button onClick={() => signIn('google')} className="text-zinc-500 hover:text-white transition-colors">Login</button>
                                <button onClick={() => router.push('/auth/signin')} className="text-white hover:text-zinc-400 transition-colors">
                                    Unlock Access
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </motion.nav>

            <main className="relative z-10">
                {/* Hero Section */}
                <section className="relative pt-64 pb-32 px-8 max-w-7xl mx-auto">
                    <div className="flex flex-col items-center text-center space-y-12">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-block border border-white/10 px-4 py-1.5 text-[9px] uppercase tracking-[0.4em] font-mono text-zinc-500"
                        >
                            AI Email Agent / Workspace Verified
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-6"
                        >
                            <h1 className="text-6xl md:text-8xl lg:text-9xl font-medium tracking-tighter leading-[0.9] text-white">
                                Email. <br />
                                <span className="text-zinc-500">Intelligent.</span>
                            </h1>
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-zinc-500 max-w-2xl mx-auto text-lg md:text-xl leading-relaxed font-light"
                        >
                            Mailient identifies revenue opportunities, surfaces urgent threads, and drafts replies in your voice—automatically. Built for high-performance teams.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col sm:flex-row items-center justify-center gap-12 pt-8"
                        >
                            {status === "authenticated" ? (
                                <button
                                    onClick={() => router.push('/home-feed?welcome=true')}
                                    className="px-12 py-5 bg-white text-black text-[10px] font-mono uppercase tracking-[0.4em] hover:bg-zinc-200 transition-transform active:scale-95"
                                >
                                    Dashboard
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => router.push('/auth/signin')}
                                        className="px-12 py-5 bg-white text-black text-[10px] font-mono uppercase tracking-[0.4em] hover:bg-zinc-200 transition-transform active:scale-95"
                                    >
                                        Unlock Inbox
                                    </button>
                                    <button
                                        onClick={(e) => handleClick(e, 'demo-section')}
                                        className="text-[10px] font-mono uppercase tracking-[0.4em] text-zinc-500 hover:text-white transition-colors"
                                    >
                                        Watch Demo
                                    </button>
                                </>
                            )}
                        </motion.div>
                    </div>

                    {/* Trust Signals */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 1 }}
                        className="mt-48 pt-16 border-t border-white/5 flex flex-wrap items-center justify-center gap-x-16 gap-y-8 font-mono text-[8px] uppercase tracking-[0.5em] text-zinc-800"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-1 bg-zinc-900" />
                            Google Workspace
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-1 bg-zinc-900" />
                            AES-256 Encrypted
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-1 bg-zinc-900" />
                            OAuth 2.0 Secure
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-1 bg-zinc-900" />
                            Privacy First
                        </div>
                    </motion.div>
                </section>

                {/* Hero Video */}
                <section id="demo-section" className="px-8 pb-32">
                    <div className="relative w-full max-w-6xl mx-auto aspect-video border border-white/10 bg-zinc-950 overflow-hidden shadow-2xl">
                        <iframe
                            src="https://cap.so/embed/rpter2vmzaz3vyk?autoplay=1&muted=1&controls=1&loop=1&playsinline=1"
                            title="Mailient Product Demo"
                            className="absolute inset-0 w-full h-full opacity-80"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>
                </section>

                {/* Pain Section */}
                <section className="py-48 px-8 bg-black relative overflow-hidden">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-32 items-center">
                            <div className="space-y-12">
                                <div className="inline-block border border-white/10 px-4 py-1.5 text-[9px] uppercase tracking-[0.4em] font-mono text-zinc-500">
                                    The Friction Cost
                                </div>
                                <h2 className="text-5xl md:text-7xl font-medium tracking-tighter leading-[0.9]">
                                    Your inbox is <br />
                                    <span className="text-zinc-500">the bottleneck.</span>
                                </h2>
                                <p className="text-zinc-500 text-lg leading-relaxed font-light max-w-md">
                                    Every hour spent triaging is an hour stolen from growth. The noise isn't just annoying—it's expensive.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {[
                                    {
                                        title: "Lost Revenue",
                                        desc: "High-ticket opportunities buried under newsletters.",
                                        icon: BarChart3
                                    },
                                    {
                                        title: "Founder Burnout",
                                        desc: "The micro-stress of 200+ unread threads.",
                                        icon: Cpu
                                    },
                                    {
                                        title: "Missed Momentum",
                                        desc: "Slow replies are killing your deal velocity.",
                                        icon: Zap
                                    }
                                ].map((item, i) => (
                                    <div key={i} className="p-10 border border-white/5 bg-zinc-950/50 hover:border-white/10 transition-colors group">
                                        <item.icon className="w-5 h-5 text-zinc-500 mb-6 group-hover:text-white transition-colors" />
                                        <h3 className="text-[11px] font-mono uppercase tracking-[0.3em] text-white mb-4">{item.title}</h3>
                                        <p className="text-zinc-500 text-sm leading-relaxed font-light">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-48 px-8 border-t border-white/5">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col items-center text-center space-y-12 mb-32">
                            <div className="inline-block border border-white/10 px-4 py-1.5 text-[9px] uppercase tracking-[0.4em] font-mono text-zinc-500">
                                Core Capabilities
                            </div>
                            <h2 className="text-5xl md:text-7xl font-medium tracking-tighter">
                                Neural processing. <br />
                                <span className="text-zinc-500">Human control.</span>
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5">
                            {[
                                {
                                    title: "Signal Intelligence",
                                    desc: "Automatically extract high-priority leads from the noise.",
                                    icon: Zap
                                },
                                {
                                    title: "Neural Drafting",
                                    desc: "AI that learns your voice to draft perfect replies in seconds.",
                                    icon: Bot
                                },
                                {
                                    title: "Relationship Graph",
                                    desc: "Visualize your most important connections across every thread.",
                                    icon: Layers
                                }
                            ].map((feature, i) => (
                                <div key={i} className="bg-black p-16 space-y-8 hover:bg-zinc-950 transition-colors group">
                                    <feature.icon className="w-6 h-6 text-zinc-700 group-hover:text-white transition-colors" />
                                    <div className="space-y-4">
                                        <h3 className="text-[12px] font-mono uppercase tracking-[0.3em] text-white">{feature.title}</h3>
                                        <p className="text-zinc-500 text-sm leading-relaxed font-light">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-48 px-8 border-t border-white/5 bg-zinc-950/20">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col items-center text-center space-y-12 mb-32">
                            <div className="inline-block border border-white/10 px-4 py-1.5 text-[9px] uppercase tracking-[0.4em] font-mono text-zinc-500">
                                Transparent Scaling
                            </div>
                            <h2 className="text-5xl md:text-7xl font-medium tracking-tighter">
                                Simple plans. <br />
                                <span className="text-zinc-500">Powerful results.</span>
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {plans.map((plan, i) => (
                                <div key={i} className={`p-12 border ${plan.highlighted ? 'border-white/20 bg-white/5' : 'border-white/5 bg-zinc-950'} flex flex-col`}>
                                    <div className="mb-12 space-y-4">
                                        <h3 className="text-[11px] font-mono uppercase tracking-[0.4em] text-zinc-500">{plan.name}</h3>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-medium tracking-tighter">${plan.price.monthly}</span>
                                            <span className="text-zinc-500 text-xs font-mono">/mo</span>
                                        </div>
                                    </div>

                                    <ul className="space-y-6 mb-16 flex-1">
                                        {plan.features.map((feat, fi) => (
                                            <li key={fi} className="flex items-center gap-4 text-[10px] uppercase font-mono tracking-widest text-zinc-400">
                                                <div className="w-1 h-1 bg-zinc-800" />
                                                {feat.text}
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => router.push(plan.btn.href)}
                                        className={`w-full py-5 text-[10px] font-mono uppercase tracking-[0.3em] transition-colors ${plan.highlighted ? 'bg-white text-black hover:bg-zinc-200' : 'border border-white/10 text-white hover:bg-white/5'}`}
                                    >
                                        {plan.btn.text}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-64 px-8 border-t border-white/5 text-center">
                    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                        <h2 className="text-4xl md:text-6xl font-medium tracking-tighter mb-16">
                            Reclaim your focus. <br />
                            <span className="text-zinc-500">Automate the noise.</span>
                        </h2>
                        <button
                            onClick={() => router.push('/auth/signin')}
                            className="px-16 py-6 bg-white text-black text-[10px] font-mono uppercase tracking-[0.4em] hover:bg-zinc-200 transition-transform active:scale-95 shadow-2xl shadow-white/10"
                        >
                            Get Started Now
                        </button>
                    </motion.div>
                </section>

                <footer className="py-12 px-8 border-t border-white/5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.4em] text-zinc-700">
                    <span>© 2026 Mailient</span>
                    <div className="flex gap-12">
                        <a href="#" className="hover:text-white transition-colors">Twitter</a>
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                    </div>
                </footer>
            </main>
        </div>
    )
}
