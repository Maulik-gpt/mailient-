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
    Filter,
    ChevronDown,
    Quote
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BackgroundShaders } from "@/components/ui/background-paper-shaders"
import { PricingSection } from "@/components/ui/pricing"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { HeroGeometric } from "@/components/ui/shape-landing-hero"
import { GlassButton } from "@/components/ui/glass-button"

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
        info: "Ideal for businesses ready to explore AI and intelligent automation",
        price: { monthly: 7.99, yearly: 7.99 },
        features: [
            { text: "AI Sift Intelligence" },
            { text: "Priority Inbox" },
            { text: "Basic AI Drafts" },
            { text: "Secure Google OAuth" },
            { text: "Standard Relationship Tracking" }
        ],
        btn: { text: "Get Started", href: "/auth/signin" }
    },
    {
        name: "Pro",
        info: "Built for companies that want to gain an edge with AI-powered automation",
        price: { monthly: 29.99, yearly: 29.99 },
        features: [
            { text: "Everything in Starter" },
            { text: "Unlimited AI Processing" },
            { text: "Advanced Relationship Tracking" },
            { text: "Custom Neural Voice" },
            { text: "Priority Support" },
            { text: "Unlimited Draft Replies" }
        ],
        btn: { text: "Get Started", href: "/auth/signin" },
        highlighted: true
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
                            <div className="w-8 h-8 rounded flex items-center justify-center group-hover:rotate-6 transition-transform overflow-hidden relative">
                                <img
                                    src="/logo-new.png"
                                    alt="Mailient Logo"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <span className="font-bold tracking-tight text-xl">Mailient</span>
                        </div>

                        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-500">
                            <a href="#benefits" className="hover:text-white transition-colors">Benefits</a>
                            <a href="#features" className="hover:text-white transition-colors">Features</a>
                            <a href="#integration" className="hover:text-white transition-colors">Security</a>
                            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {status === "authenticated" ? (
                            <Button variant="secondary" onClick={() => router.push('/home-feed?welcome=true')} className="bg-white/10 hover:bg-white/20 text-white border-white/10 rounded-full px-6">
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
                badge="AI-Powered Email for Founders"
                title1="Find opportunities."
                title2="Save hours daily."
            >
                <div className="text-center">
                    <p className="text-lg md:text-xl text-white/40 max-w-2xl mb-12 leading-relaxed font-light tracking-wide mx-auto px-4 text-center">
                        AI assistant for founders. Auto-sifts Gmail to find revenue opportunities and urgent replies.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                        {status === "authenticated" ? (
                            <GlassButton onClick={() => router.push('/home-feed?welcome=true')} size="lg">
                                Continue to Dashboard
                                <ArrowRight className="w-5 h-5 ml-2 inline-block" />
                            </GlassButton>
                        ) : (
                            <>
                                <GlassButton onClick={() => signIn('google')} size="lg">
                                    Connect Gmail Free
                                    <ArrowRight className="w-5 h-5 ml-2 inline-block" />
                                </GlassButton>
                                <Button
                                    variant="outline"
                                    onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-full px-6"
                                >
                                    See Demo First
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Trust Signals */}
                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mb-16 text-sm text-zinc-400">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-green-400" />
                            <span>Google OAuth Secure</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-blue-400" />
                            <span>End-to-End Encrypted</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span>500+ Founders Trust Us</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-purple-400" />
                            <span>Setup in 2 Minutes</span>
                        </div>
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

            {/* Demo Section - Single Video with Fading Text */}
            <section id="demo-section" className="py-32 px-6 z-10 relative bg-zinc-950/30">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col items-center mb-20 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8"
                        >
                            <Sparkles className="h-3 w-3 text-white/60" />
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">See How It Works</span>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
                        >
                            Mailient in action.
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="text-zinc-500 max-w-2xl mx-auto text-lg leading-relaxed"
                        >
                            Watch how AI transforms your chaotic inbox into clear opportunities.
                        </motion.p>
                    </div>

                    {/* Single Video + Fading Text */}
                    <div className="max-w-5xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            {/* Text Section - Fading Steps */}
                            <div className="relative h-96">
                                {/* Step 1 */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }}
                                    transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 flex flex-col justify-center"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-bold text-lg">1</div>
                                        <h3 className="text-3xl font-bold text-white">Start Analysis</h3>
                                    </div>
                                    <p className="text-xl text-zinc-400">Find important emails which were buried in your inbox chaos.</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <Check className="w-5 h-5 text-green-400" />
                                            <span className="text-zinc-300">AI scans entire inbox in seconds</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Check className="w-5 h-5 text-green-400" />
                                            <span className="text-zinc-300">Identifies revenue opportunities</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Check className="w-5 h-5 text-green-400" />
                                            <span className="text-zinc-300">Flags urgent replies needed</span>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Step 2 */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }}
                                    transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 flex flex-col justify-center"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-bold text-lg">2</div>
                                        <h3 className="text-3xl font-bold text-white">Find Meaningful Insights</h3>
                                    </div>
                                    <p className="text-xl text-zinc-400">Emails organized into smart boxes with clear categories.</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <Check className="w-5 h-5 text-green-400" />
                                            <span className="text-zinc-300">Revenue opportunities highlighted</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Check className="w-5 h-5 text-green-400" />
                                            <span className="text-zinc-300">Urgent replies prioritized</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Check className="w-5 h-5 text-green-400" />
                                            <span className="text-zinc-300">Smart boxes for everything</span>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Step 3 */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }}
                                    transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 flex flex-col justify-center"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-bold text-lg">3</div>
                                        <h3 className="text-3xl font-bold text-white">One-Click Actions</h3>
                                    </div>
                                    <p className="text-xl text-zinc-400">Select any email and turn it into action with one click.</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <Check className="w-5 h-5 text-green-400" />
                                            <span className="text-zinc-300">AI drafts perfect replies</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Check className="w-5 h-5 text-green-400" />
                                            <span className="text-zinc-300">Schedule meetings instantly</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Check className="w-5 h-5 text-green-400" />
                                            <span className="text-zinc-300">Archive with confidence</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Video Section */}
                            <div className="flex-1">
                                <div className="relative aspect-video rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                                    <iframe
                                        src="https://cap.so/embed/et27d0cbvw1axse?autoplay=1&muted=1&controls=0"
                                        className="absolute inset-0 w-full h-full rounded-2xl"
                                        allow="autoplay; fullscreen; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Final CTA */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 }}
                            className="text-center mt-20"
                        >
                            <div className="inline-flex items-center gap-6 p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
                                <div className="text-left">
                                    <h3 className="text-2xl font-bold text-white mb-2">Ready to save 10+ hours/week?</h3>
                                    <p className="text-zinc-400">Join 500+ founders who transformed their inbox.</p>
                                </div>
                                <Button
                                    onClick={() => signIn('google')}
                                    className="bg-white text-black hover:bg-zinc-200 rounded-full px-8 py-4 text-lg font-bold"
                                >
                                    Start Free
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

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
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8"
                        >
                            <Sparkles className="h-3 w-3 text-white/60" />
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Features</span>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-7xl font-bold tracking-tight mb-6"
                        >
                            One tool, all features.
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="text-zinc-500 max-w-xl mx-auto text-lg leading-relaxed"
                        >
                            Simplify workflows, grow faster.
                        </motion.p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        {/* Arcus - Large Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="md:col-span-1 group relative h-[450px] rounded-3xl border border-white/5 bg-zinc-950/50 backdrop-blur-sm overflow-hidden flex flex-col md:flex-row shadow-2xl hover:border-white/10 transition-colors"
                        >
                            <div className="flex-1 p-8 flex flex-col justify-center relative z-10">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                                    <Cpu className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">Arcus</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed">
                                    Command-driven AI that understands context and executes complex tasks with intelligent reasoning. Arcus transforms your email workflow into an intuitive, conversational experience.
                                </p>
                            </div>
                            <div className="flex-1 bg-gradient-to-br from-white/5 to-transparent relative p-12 overflow-hidden hidden lg:flex items-center justify-center">
                                <div className="relative w-64 h-64 flex items-center justify-center">
                                    {/* Concentric Orbital Rings */}
                                    {[1, 2, 3].map((ring) => (
                                        <motion.div
                                            key={ring}
                                            animate={{ rotate: 360 * (ring % 2 === 0 ? 1 : -1) }}
                                            transition={{ duration: 15 + ring * 5, repeat: Infinity, ease: "linear" }}
                                            className="absolute border border-white/5 rounded-full"
                                            style={{
                                                width: `${100 - ring * 25}%`,
                                                height: `${100 - ring * 25}%`,
                                                borderStyle: ring === 2 ? 'dashed' : 'solid'
                                            }}
                                        />
                                    ))}
                                    {/* Pulsing Core */}
                                    <motion.div
                                        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        className="w-16 h-16 bg-white/10 blur-xl rounded-full absolute"
                                    />
                                    <Bot className="w-12 h-12 text-white/40 relative z-10" />

                                    {/* Orbiting particles */}
                                    {[1, 2, 3, 4].map((p) => (
                                        <motion.div
                                            key={p}
                                            animate={{
                                                rotate: 360,
                                                scale: [1, 1.2, 1]
                                            }}
                                            transition={{
                                                rotate: { duration: 8 + p * 2, repeat: Infinity, ease: "linear" },
                                                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                                            }}
                                            className="absolute w-1.5 h-1.5 bg-white/30 rounded-full"
                                            style={{ top: '10%', left: '50%', originY: '200%' }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        {/* Mailient Sift */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="group h-[450px] p-8 rounded-3xl border border-white/5 bg-zinc-950/50 backdrop-blur-sm shadow-2xl overflow-hidden flex flex-col justify-center relative hover:border-white/10 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 border border-white/10 relative z-10">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold mb-4">Mailient Sift</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed max-w-sm">
                                    Start intelligence analysis and let the AI distribute your emails to smart insights like Opportunities, Urgent and Follow-ups followed by one-click smart actions.
                                </p>
                            </div>

                            {/* Scanning Visualization */}
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 w-48 h-64 bg-white/[0.02] border border-white/5 rounded-2xl hidden lg:flex flex-col p-4 gap-3 overflow-hidden">
                                <motion.div
                                    animate={{ y: [0, 240, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent z-20"
                                />
                                {[
                                    { text: "Opportunity", color: "bg-emerald-500/20 text-emerald-400" },
                                    { text: "Urgent", color: "bg-rose-500/20 text-rose-400" },
                                    { text: "Follow-up", color: "bg-blue-500/20 text-blue-400" },
                                    { text: "Revenue", color: "bg-amber-500/20 text-amber-400" }
                                ].map((pill, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0.3 }}
                                        whileInView={{ opacity: 1 }}
                                        transition={{ delay: i * 0.2 }}
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold border border-white/5 w-fit ${pill.color}`}
                                    >
                                        {pill.text}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Notes */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="group h-[450px] p-8 rounded-3xl border border-white/5 bg-zinc-950/50 backdrop-blur-sm shadow-2xl overflow-hidden flex flex-col justify-center relative hover:border-white/10 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 border border-white/10 relative z-10">
                                <Layers className="w-5 h-5 text-white" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold mb-4">Notes</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed max-w-sm">
                                    Add AI-assisted notes, share them as text or image with your team seamlessly. You don't have to miss important stuff now!
                                </p>
                            </div>

                            {/* Fanning Stacked Cards */}
                            <div className="absolute right-12 top-1/2 -translate-y-1/2 w-40 h-52 hidden lg:block">
                                {[2, 1, 0].map((i) => (
                                    <motion.div
                                        key={i}
                                        whileHover={{
                                            rotate: i * 15 - 15,
                                            x: i * 40 - 40,
                                            y: i * 10 - 5
                                        }}
                                        className="absolute inset-0 bg-zinc-900 border border-white/10 rounded-xl p-4 shadow-xl origin-bottom"
                                        style={{ zIndex: 10 - i }}
                                    >
                                        <div className="w-8 h-1 bg-white/10 rounded-full mb-3" />
                                        <div className="space-y-2">
                                            <div className="w-full h-1 bg-white/5 rounded-full" />
                                            <div className="w-3/4 h-1 bg-white/5 rounded-full" />
                                            {i === 0 && <Sparkles className="w-4 h-4 text-white/20 absolute bottom-4 right-4" />}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Traditional Inbox */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="group relative h-[450px] rounded-3xl border border-white/5 bg-zinc-950/50 backdrop-blur-sm overflow-hidden flex flex-col md:flex-row shadow-2xl hover:border-white/10 transition-colors"
                        >
                            <div className="flex-1 bg-gradient-to-tl from-white/5 to-transparent relative p-8 lg:flex items-center justify-center hidden">
                                <div className="w-full max-w-[240px] space-y-3 relative">
                                    {/* Scanning Beam for Inbox */}
                                    <motion.div
                                        animate={{ height: ['0%', '100%', '0%'], top: ['0%', '0%', '100%'] }}
                                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute left-[-8px] w-[2px] bg-white/40 blur-[1px] z-20"
                                    />
                                    {[1, 2, 3, 4].map(p => (
                                        <motion.div
                                            key={p}
                                            animate={p === 2 ? {
                                                backgroundColor: ['rgba(24,24,27,1)', 'rgba(255,255,255,0.05)', 'rgba(24,24,27,1)'],
                                                borderColor: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']
                                            } : {}}
                                            transition={{ duration: 4, repeat: Infinity }}
                                            className="h-12 bg-zinc-900 rounded-xl border border-white/5 flex items-center px-4 justify-between group/row"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-white/20" />
                                                <div className="h-2 w-16 bg-white/10 rounded-full" />
                                            </div>
                                            {p === 2 && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 border border-white/10"
                                                >
                                                    <Sparkles className="w-2.5 h-2.5 text-white/60" />
                                                    <span className="text-[8px] font-bold text-white/60">AI DRAFT</span>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 p-8 flex flex-col justify-center relative z-10">
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
                        title="AES-256"
                        desc="All data is encrypted using AES-256 encryption. You are able to on it in Settings. "
                    />
                </div>
            </section>

            {/* Founder Section - Premium Redesign */}
            <section className="py-40 px-6 z-10 relative overflow-hidden">
                <div className="max-w-5xl mx-auto border border-white/5 rounded-[4rem] bg-zinc-950/30 backdrop-blur-3xl p-12 md:p-24 relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Quote className="w-32 h-32 text-white" />
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full" />
                            <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full border-2 border-white/10 overflow-hidden shadow-2xl">
                                <img
                                    src="/maulik.png"
                                    alt="Maulik - Founder"
                                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                                />
                            </div>
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-white text-black text-xs font-black uppercase tracking-widest rounded-full shadow-xl">
                                Founder
                            </div>
                        </motion.div>

                        <div className="flex-1 text-center md:text-left">
                            <motion.h3
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="text-2xl font-bold mb-2 tracking-widest uppercase text-white/40"
                            >
                                Maulik
                            </motion.h3>
                            <motion.p
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                                className="text-zinc-500 font-bold mb-8 text-sm uppercase tracking-[0.4em]"
                            >
                                14 y/o founder
                            </motion.p>

                            <motion.blockquote
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="text-2xl md:text-3xl font-medium text-zinc-100 italic mb-10 leading-snug"
                            >
                                "I built Mailient because the inbox is the last frontier of friction for founders. My goal is to transform email from a chore into a high-leverage asset."
                            </motion.blockquote>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 }}
                            >
                                <Button variant="outline" className="rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-white px-8 h-12" asChild>
                                    <a href="https://x.com/Maulik_055" target="_blank" className="flex items-center gap-2">
                                        Connect with me
                                        <ArrowRight className="w-4 h-4" />
                                    </a>
                                </Button>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-32 bg-black z-10 relative">
                <PricingSection
                    plans={plans}
                    heading="Simple Price For All"
                    description="Choose the layer of intelligence that matches your output velocity."
                    className="bg-transparent"
                />
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-40 px-6 z-10 relative bg-black">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col items-center mb-20 text-center">
                        <div className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 mb-8">
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">FAQ</span>
                        </div>
                        <h2 className="text-4xl md:text-7xl font-bold mb-6 tracking-tighter">Questions? Answers!</h2>
                        <p className="text-zinc-500 text-lg max-w-2xl">
                            Everything you need to know about Mailient. Can't find what you're looking for? <a href="mailto:support@mailient.com" className="text-white font-bold hover:underline">Contact us</a>.
                        </p>
                    </div>

                    <div className="space-y-4 max-w-5xl mx-auto">
                        <FAQItem
                            question="Is Mailient compatible with any email provider?"
                            answer="Currently, Mailient is optimized for Gmail. We focus on providing the deepest possible integration with Google's API to ensure real-time sync and high security."
                        />
                        <FAQItem
                            question="Can I change my plan later?"
                            answer="Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the difference."
                        />
                        <FAQItem
                            question="Is my data used to train public AI models?"
                            answer="No. Your email data is strictly private and is never used to train public LLMs. We use isolated inference to ensure your business intelligence stays within your secure workspace."
                        />
                        <FAQItem
                            question="Is my email data secure?"
                            answer="Yes, security is our top priority. We use end-to-end encryption, are SOC 2 compliant, and never share your data with third parties. Your emails are processed securely and never stored longer than necessary."
                        />
                        <FAQItem
                            question="How does AI drafting match my unique voice?"
                            answer="The AI analyzes your previous outgoing threads to learn your tone, signature style, and typical responses. Over time, it drafts replies that are indistinguishable from your own writing."
                        />
                    </div>
                </div>
            </section>

            {/* Final CTA Layer */}
            <section className="py-20 px-6 z-10 relative">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative rounded-[3rem] border border-white/5 bg-zinc-950/50 backdrop-blur-xl overflow-hidden py-24 px-8 text-center"
                    >
                        {/* Subtle Background Glow */}
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

                        <div className="max-w-3xl mx-auto relative z-10">
                            <h2 className="text-4xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
                                Ready to transform<br />your email workflow?
                            </h2>
                            <p className="text-zinc-400 text-lg md:text-xl mb-12 leading-relaxed">
                                Connect your Gmail account today and see why people trust Mailient for their email automation.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                                <GlassButton
                                    onClick={() => router.push('/auth/signin')}
                                    size="lg"
                                >
                                    Get Started Now!
                                    <ArrowRight className="w-5 h-5 ml-2 inline-block" />
                                </GlassButton>
                                <Button
                                    variant="outline"
                                    onClick={() => window.open('https://x.com/Maulik_055', '_blank')}
                                    size="lg"
                                    className="border-white/10 bg-transparent text-white hover:bg-white/5 rounded-2xl px-12 py-7 text-lg font-bold transition-all"
                                >
                                    Talk to Founder
                                </Button>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-zinc-500 text-sm font-medium">
                                <span className="flex items-center gap-2">
                                    Direct access to founder
                                </span>
                                <span className="hidden sm:block text-zinc-800">•</span>
                                <span className="flex items-center gap-2">
                                    2 Whop apps provided
                                </span>
                                <span className="hidden sm:block text-zinc-800">•</span>
                                <span className="flex items-center gap-2">
                                    Setup in 2 minutes
                                </span>
                            </div>
                        </div>
                    </motion.div>
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
                        <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy</a>
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
        <div
            className={`border rounded-2xl transition-all duration-300 ${isOpen ? 'bg-zinc-900/40 border-white/10' : 'bg-transparent border-white/5 hover:border-white/10'}`}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-6 text-left flex items-center justify-between group"
            >
                <span className={`text-lg font-bold transition-colors ${isOpen ? 'text-white' : 'text-zinc-200'}`}>
                    {question}
                </span>
                <div className={`p-1 rounded-full transition-colors ${isOpen ? 'bg-white/10' : 'bg-transparent'}`}>
                    <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform duration-500 ease-in-out ${isOpen ? 'rotate-180 text-white' : ''}`} />
                </div>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                        <div className="px-6 pb-6 text-zinc-400 text-base leading-relaxed max-w-4xl">
                            {answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
