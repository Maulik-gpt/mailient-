"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import {
    Mail,
    Zap,
    Shield,
    ArrowRight,
    ChevronRight,
    Layout,
    MousePointer2,
    Search,
    Command,
    Sparkles,
    Check,
    ShieldCheck,
    Lock,
    Globe,
    BarChart3,
    Activity,
    Cpu,
    RefreshCw,
    Bot,
    Layers,
    Star,
    Plus,
    Inbox,
    Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BackgroundShaders } from "@/components/ui/background-paper-shaders"
import { PricingSection } from "@/components/ui/pricing"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { HeroGeometric } from "@/components/ui/shape-landing-hero"

const features = [
    {
        title: "Signal Intelligence",
        description: "Automatically extract revenue opportunities and high-priority leads from the noise.",
        icon: Zap,
        color: "text-zinc-100",
    },
    {
        title: "Neural Drafting",
        description: "AI that learns your voice and context to draft perfect replies in seconds.",
        icon: Bot,
        color: "text-zinc-300",
    },
    {
        title: "Relationship Graph",
        description: "Visualize and track your most important connections across every thread.",
        icon: Layers,
        color: "text-zinc-500",
    }
]

const plans = [
    {
        name: "Starter",
        info: "Perfect for high-output individuals",
        price: { monthly: 0, yearly: 0 },
        features: [
            { text: "AI Sift Intelligence" },
            { text: "Priority Inbox" },
            { text: "Basic AI Drafts" },
            { text: "Secure Google OAuth" }
        ],
        btn: { text: "Get Started", href: "/auth/signin" }
    },
    {
        name: "Pro",
        info: "For teams and advanced founders",
        price: { monthly: 29, yearly: 290 },
        features: [
            { text: "Everything in Starter" },
            { text: "Unlimited AI Processing" },
            { text: "Advanced Relationship Tracking" },
            { text: "Custom Neural Voice" },
            { text: "Priority Support" }
        ],
        btn: { text: "Upgrade to Pro", href: "/pricing" },
        highlighted: true
    },
    {
        name: "Enterprise",
        info: "Custom solutions for organizations",
        price: { monthly: 0, yearly: 0 },
        features: [
            { text: "Everything in Pro" },
            { text: "Dedicated Infrastructure" },
            { text: "Custom API Integration" },
            { text: "White-glove Onboarding" }
        ],
        btn: { text: "Contact Sales", href: "/contact" }
    }
];

export function LinearLanding() {
    const router = useRouter()
    const { data: session, status } = useSession()
    const [scrolled, setScrolled] = useState(false)
    const [activeTab, setActiveTab] = useState("sift")
    const containerRef = useRef<HTMLDivElement>(null)

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    })

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50)
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0])
    const scale = useTransform(scrollYProgress, [0, 0.1], [1, 0.95])

    return (
        <div ref={containerRef} className="relative min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans overflow-x-hidden">
            {/* Background Layer */}
            <div className="fixed inset-0 z-0">
                <BackgroundShaders />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
            </div>

            {/* Navigation */}
            <nav className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-in-out ${scrolled
                ? 'w-[95%] md:w-[80%] max-w-5xl rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(255,255,255,0.05)] py-3 px-6'
                : 'w-[95%] md:w-full max-w-7xl bg-transparent py-6 px-6'
                }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <div className="w-8 h-8 bg-white rounded flex items-center justify-center group-hover:rotate-6 transition-transform">
                                <Mail className="w-5 h-5 text-black" />
                            </div>
                            <span className="font-bold tracking-tight text-xl">Mailient</span>
                        </div>

                        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-500">
                            <a href="#benefits" className="hover:text-white transition-colors">Benefits</a>
                            <a href="#features" className="hover:text-white transition-colors">Features</a>
                            <a href="#method" className="hover:text-white transition-colors">Method</a>
                            <a href="#integration" className="hover:text-white transition-colors">Security</a>
                            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {status === "authenticated" ? (
                            <Button variant="secondary" onClick={() => router.push('/home-feed')} className="bg-white/10 hover:bg-white/20 text-white border-white/10 rounded-full px-6">
                                Dashboard
                            </Button>
                        ) : (
                            <>
                                <button onClick={() => signIn('google')} className="text-sm font-medium text-zinc-500 hover:text-white transition-colors">Log in</button>
                                <Button onClick={() => router.push('/auth/signin')} className="bg-white text-black hover:bg-zinc-200 rounded-full px-6">
                                    Sign up
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <HeroGeometric
                badge="V1.0 is now live"
                title1="Email at the"
                title2="speed of thought."
            >
                <div className="text-center">
                    <p className="text-lg md:text-xl text-white/40 max-w-2xl mb-12 leading-relaxed font-light tracking-wide mx-auto px-4 text-center">
                        Mailient is the high-performance email client for founders. Built for focus, speed, and intelligence. Sift through the noise and focus on what matters.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24">
                        {status === "authenticated" ? (
                            <Button onClick={() => router.push('/home-feed')} size="lg" className="bg-white text-black hover:bg-zinc-200 rounded-full px-10 py-6 text-lg font-medium shadow-2xl">
                                Continue to Dashboard
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        ) : (
                            <Button onClick={() => signIn('google')} size="lg" className="bg-white text-black hover:bg-zinc-200 rounded-full px-10 py-6 text-lg font-medium shadow-2xl">
                                Connect Gmail
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        )}
                    </div>

                    {/* Hero Video Space */}
                    <div className="relative w-full max-w-5xl mx-auto aspect-video rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden group shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl group-hover:bg-zinc-200 transition-colors"
                            >
                                <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-black border-b-[10px] border-b-transparent ml-1" />
                            </motion.button>
                        </div>

                        {/* Video Mockup Content (Placeholder for actual iframe) */}
                        <div className="absolute bottom-6 left-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-white/40" />
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-bold text-white/80 uppercase tracking-widest">Maulik Demo</p>
                                <p className="text-[10px] text-white/40">Watch Mailient in action</p>
                            </div>
                        </div>
                    </div>
                </div>
            </HeroGeometric>

            {/* Benefits Section - Premium Bento Layout */}
            <section id="benefits" className="py-40 px-6 z-10 relative overflow-hidden bg-black">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col items-center mb-24 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8"
                        >
                            <Star className="h-3 w-3 fill-white/80" />
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Benefits</span>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
                        >
                            The Mailient Advantage
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="text-zinc-500 max-w-xl mx-auto text-lg leading-relaxed"
                        >
                            Intelligence that understands your business. Built for high-performance founders.
                        </motion.p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature Card 1: Signal Intelligence */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="group relative h-[450px] p-8 rounded-3xl border border-white/5 bg-zinc-950 flex flex-col items-center text-center overflow-hidden shadow-[0_0_40px_-15px_rgba(255,255,255,0.05)]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

                            {/* Visual: Radar/Scanner */}
                            <div className="h-48 w-full flex items-center justify-center mb-8">
                                <div className="relative w-40 h-40 rounded-full border border-white/10 flex items-center justify-center">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 border-t-2 border-white/20 rounded-full"
                                    />
                                    <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_15px_white]" />
                                    <div className="absolute top-10 left-10 w-1 h-1 bg-white/40 rounded-full" />
                                    <div className="absolute bottom-12 right-8 w-1 h-1 bg-white/60 rounded-full" />
                                </div>
                            </div>

                            <h3 className="text-2xl font-bold mb-4">Signal Intelligence</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed max-w-[240px]">
                                Stay ahead with accurate, real-time revenue and priority tracking across every thread.
                            </p>
                        </motion.div>

                        {/* Feature Card 2: AI Driven Growth */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="group relative h-[450px] p-8 rounded-3xl border border-white/5 bg-zinc-950 flex flex-col items-center text-center overflow-hidden shadow-[0_0_40px_-15px_rgba(255,255,255,0.05)]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

                            {/* Visual: Growth Bars */}
                            <div className="h-48 w-full flex items-end justify-center gap-3 mb-8 px-4">
                                {[0.4, 0.7, 1.0, 0.6, 0.8].map((val, i) => (
                                    <div key={i} className="relative w-full bg-white/5 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            whileInView={{ height: `${val * 100}%` }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                                            className="w-full bg-white/10"
                                        />
                                        {i === 2 && (
                                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white rounded text-[10px] text-black font-bold whitespace-nowrap">
                                                80% Automated
                                            </div>
                                        )}
                                        {i === 4 && (
                                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-white font-bold whitespace-nowrap">
                                                10% Cost
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <h3 className="text-2xl font-bold mb-4">AI-Driven Growth</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed max-w-[240px]">
                                Make smarter moves with accurate, real-time business insights and automated sifting.
                            </p>
                        </motion.div>

                        {/* Feature Card 3: Neural Sync */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="group relative h-[450px] p-8 rounded-3xl border border-white/5 bg-zinc-950 flex flex-col items-center text-center overflow-hidden shadow-[0_0_40px_-15px_rgba(255,255,255,0.05)]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

                            {/* Visual: Neural Orbit */}
                            <div className="h-48 w-full flex items-center justify-center mb-8">
                                <div className="relative w-32 h-32 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full border border-white/10" />
                                    <div className="absolute inset-[-20px] rounded-full border border-dashed border-white/5 animate-spin-slow" />
                                    <motion.div
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                                    >
                                        <RefreshCw className="w-8 h-8 text-black" />
                                    </motion.div>
                                </div>
                            </div>

                            <h3 className="text-2xl font-bold mb-4">Sync in real time</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed max-w-[240px]">
                                Connect with your threads instantly to track progress and generate context-aware updates.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>
            {/* Features Section - Premium Bento Layout */}
            <section id="features" className="py-40 px-6 z-10 relative overflow-hidden bg-black">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col items-center mb-24 text-center">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-4xl md:text-7xl font-bold tracking-tight mb-6"
                        >
                            All features in 1 tool
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-zinc-500 max-w-xl mx-auto text-lg leading-relaxed"
                        >
                            Discover features that simplify workflows & grow your business.
                        </motion.p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        {/* Arcus - Large Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="md:col-span-1 group relative h-[400px] rounded-3xl border border-white/5 bg-zinc-950/50 backdrop-blur-sm overflow-hidden flex flex-col md:flex-row shadow-2xl hover:border-white/10 transition-colors"
                        >
                            <div className="flex-1 p-8 flex flex-col justify-center">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                                    <Cpu className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">Arcus</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed">
                                    Command-driven AI that understands context and executes complex tasks with intelligent reasoning. Arcus transforms your email workflow into an intuitive, conversational experience.
                                </p>
                            </div>
                            <div className="flex-1 bg-gradient-to-br from-white/5 to-transparent relative p-12 overflow-hidden hidden lg:flex items-center justify-center">
                                <div className="w-48 h-48 rounded-full border border-white/10 flex items-center justify-center relative">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-2 border-t border-white/20 rounded-full"
                                    />
                                    <Bot className="w-16 h-16 text-white/20" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Mailient Sift */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="group h-[400px] p-8 rounded-3xl border border-white/5 bg-zinc-950/50 backdrop-blur-sm shadow-2xl overflow-hidden flex flex-col justify-center relative hover:border-white/10 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Mailient Sift</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed max-w-sm">
                                Start intelligence analysis and let the AI distribute your emails to smart insights like Opportunities, Urgent and Follow-ups followed by one-click smart actions.
                            </p>

                            {/* Visual background */}
                            <div className="absolute right-[-20px] bottom-[-20px] w-48 h-48 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
                        </motion.div>

                        {/* Notes */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="group h-[400px] p-8 rounded-3xl border border-white/5 bg-zinc-950/50 backdrop-blur-sm shadow-2xl overflow-hidden flex flex-col justify-center relative hover:border-white/10 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                                <Layers className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Notes</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed max-w-sm">
                                Add AI-assisted notes, share them as text or image with your team seamlessly. You don't have to miss important stuff now!
                            </p>
                            <div className="absolute top-1/2 right-12 -translate-y-1/2 w-32 h-40 bg-white/5 border border-white/10 rounded-lg rotate-6 opacity-40 group-hover:rotate-12 transition-transform hidden lg:block" />
                        </motion.div>

                        {/* Traditional Inbox */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="group relative h-[400px] rounded-3xl border border-white/5 bg-zinc-950/50 backdrop-blur-sm overflow-hidden flex flex-col md:flex-row shadow-2xl hover:border-white/10 transition-colors"
                        >
                            <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
                            <div className="flex-1 bg-gradient-to-tl from-white/5 to-transparent relative p-8 lg:flex items-center justify-center hidden">
                                <div className="w-full max-w-[200px] space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-10 bg-white/5 rounded-lg border border-white/5 flex items-center px-3">
                                            <div className="w-4 h-4 rounded-full bg-white/10 mr-2" />
                                            <div className="h-2 w-20 bg-white/10 rounded-full" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 p-8 flex flex-col justify-center">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                                    <Inbox className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">Traditional Inbox</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed">
                                    Inbox in a traditional way so you don't lose the record of your emails. Ask AI button in every email connected with Arcus intelligence.
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-4 mt-20">
                        <Button
                            onClick={() => signIn('google')}
                            className="bg-white text-black hover:bg-zinc-200 rounded-full px-12 py-7 text-lg font-bold shadow-2xl group"
                        >
                            Get Started
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <Button
                            variant="outline"
                            className="border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-full px-12 py-7 text-lg font-bold backdrop-blur-sm"
                        >
                            See Our Services
                        </Button>
                    </div>
                </div>
            </section>

            {/* Method Section (Linear Style Tabbed) */}
            <section id="method" className="py-32 px-6 z-10 relative bg-zinc-950/20">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                        <div>
                            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-12">The Mailient <br />Method.</h2>
                            <div className="space-y-8">
                                {[
                                    { id: "sift", title: "Smart Sifting", desc: "Aether AI scans for revenue, urgency, and relationships." },
                                    { id: "draft", title: "Neural Drafting", desc: "Instantly generate replies that match your unique tone." },
                                    { id: "sync", title: "Native Sync", desc: "Perfectly integrated with Google Workspace. No data lag." }
                                ].map(tab => (
                                    <div
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`cursor-pointer transition-opacity ${activeTab === tab.id ? 'opacity-100' : 'opacity-40 hover:opacity-60'}`}
                                    >
                                        <h3 className="text-xl font-bold mb-2">{tab.title}</h3>
                                        <p className="text-zinc-500 text-sm">{tab.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="aspect-square bg-zinc-900 rounded-3xl border border-white/10 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                            <AnimatePresence mode="wait">
                                {activeTab === 'sift' && (
                                    <motion.div
                                        key="sift"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="absolute inset-0 flex items-center justify-center p-12"
                                    >
                                        <div className="w-full space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center">
                                                    <Zap className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="font-bold">Urgent Deal</p>
                                                    <p className="text-xs text-zinc-400 font-mono italic">High Revenue Signal Detected</p>
                                                </div>
                                            </div>
                                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: "85%" }}
                                                    transition={{ duration: 1, delay: 0.5 }}
                                                    className="h-full bg-white"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                                {/* Add more interactive tab contents if needed */}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section id="integration" className="py-32 px-6 bg-zinc-950/30 z-10 relative">
                <div className="max-w-4xl mx-auto text-center mb-24">
                    <Badge variant="outline" className="rounded-full mb-6 border-white/10 text-zinc-500">Data Integrity</Badge>
                    <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tighter">Gmail Native Security.</h2>
                    <p className="text-xl text-zinc-400 leading-relaxed italic">
                        Mailient respects your privacy perimeter. We use enterprise Google OAuth 2.0 to process data in real-time without storing a single byte of your private content.
                    </p>
                </div>
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    <SecurityCard
                        icon={<ShieldCheck className="w-10 h-10" />}
                        title="OAuth 2.0 Verified"
                        desc="Authenticated directly through Google. We never see your password."
                    />
                    <SecurityCard
                        icon={<Lock className="w-10 h-10" />}
                        title="Volatile Processing"
                        desc="Drafts are generated in isolated memory and purged after 24 hours."
                    />
                    <SecurityCard
                        icon={<Globe className="w-10 h-10" />}
                        title="Global Privacy"
                        desc="GDPR compliant architecture by design. You own your intelligence."
                    />
                </div>
            </section>

            {/* Founder Section */}
            <section className="py-32 px-6 border-y border-white/5 z-10 relative text-center">
                <div className="max-w-7xl mx-auto flex flex-col items-center">
                    <div className="relative mb-12">
                        <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full" />
                        <div className="relative w-32 h-32 rounded-full border border-white/20 bg-black flex items-center justify-center overflow-hidden">
                            <span className="text-4xl font-black italic">M</span>
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-2 uppercase tracking-widest">Maulik</h3>
                    <p className="text-zinc-500 font-bold mb-8 text-sm uppercase tracking-[0.3em]">Neural Architect</p>
                    <blockquote className="max-w-3xl text-center text-2xl md:text-3xl font-medium text-zinc-300 italic mb-12 leading-tight">
                        "I built Mailient because the inbox is the last frontier of friction for founders. My goal is to transform email from a chore into a high-leverage asset."
                    </blockquote>
                    <Button variant="outline" className="rounded-full border-white/10 hover:bg-white/5" asChild>
                        <a href="https://x.com/Maulik_055" target="_blank">Connect with the founder</a>
                    </Button>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-32 bg-black z-10 relative">
                <PricingSection
                    plans={plans}
                    heading="Access the Signal."
                    description="Choose the layer of intelligence that matches your output velocity."
                    className="bg-transparent"
                />
            </section>

            {/* FAQ Section */}
            <section className="py-32 px-6 z-10 relative">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-6xl font-bold mb-16 text-center tracking-tighter">Common Inquiries</h2>
                    <div className="space-y-4">
                        <FAQItem
                            question="How is my data stored?"
                            answer="We don't store your raw email content. Mailient processes metadata and content in real-time to generate insights and drafts, which are stored in encrypted form for your session only."
                        />
                        <FAQItem
                            question="Does the AI really sound like me?"
                            answer="Yes. Arcus AI analyzes your past sent emails (with your permission) to build a style profile that matches your tone, brevity, and formatting."
                        />
                        <FAQItem
                            question="Can I cancel any time?"
                            answer="Absolutely. You can disconnect your Google account and cancel your subscription in one click from the dashboard."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Layer */}
            <section className="py-48 px-6 text-center z-10 relative">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-7xl font-bold tracking-tighter mb-12 italic">Rewrite your workflow.</h2>
                    <Button onClick={() => router.push('/auth/signin')} size="lg" className="bg-white text-black hover:bg-zinc-200 rounded-full px-12 py-8 text-xl font-medium shadow-2xl transition-transform hover:scale-105 active:scale-95">
                        Get started for free
                    </Button>
                    <p className="mt-12 text-zinc-600 text-sm font-medium tracking-widest uppercase">
                        Built for founders, by founders.
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-white/5 z-10 relative">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                            <Mail className="w-4 h-4 text-black" />
                        </div>
                        <span className="font-bold tracking-tight">Mailient</span>
                    </div>
                    <div className="flex gap-8 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                        <a href="#" className="hover:text-white transition-colors">Twitter</a>
                        <a href="#" className="hover:text-white transition-colors">GitHub</a>
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                    </div>
                    <p className="text-xs text-zinc-600">© 2026 Mailient Intelligence.</p>
                </div>
            </footer>
        </div>
    )
}

function SecurityCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="group p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-white/10 transition-colors">
            <div className="mb-6 p-4 bg-white/5 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-4">{title}</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
        </div>
    );
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border border-white/5 rounded-2xl bg-white/[0.02] overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <span className="font-bold">{question}</span>
                <Plus className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-6 pb-6 text-zinc-500 text-sm leading-relaxed"
                    >
                        <p>{answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
