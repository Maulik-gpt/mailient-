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
    Inbox,
    Filter,
    Bot,
    Layers,
    Star,
    Plus,
    Check,
    ShieldCheck,
    Lock,
    Globe
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
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/10 py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <div className="w-8 h-8 bg-white rounded flex items-center justify-center group-hover:rotate-6 transition-transform">
                                <Mail className="w-5 h-5 text-black" />
                            </div>
                            <span className="font-bold tracking-tight text-xl">Mailient</span>
                        </div>

                        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-500">
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
                title1="Email at the speed of"
                title2="thought."
            >
                <div>
                    <p className="text-lg md:text-xl text-white/40 max-w-2xl mb-12 leading-relaxed font-light tracking-wide mx-auto px-4">
                        Mailient is the high-performance email client for founders. Built for focus, speed, and intelligence. Sift through the noise and focus on what matters.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24">
                        <Button onClick={() => router.push('/auth/signin')} size="lg" className="bg-white text-black hover:bg-zinc-200 rounded-full px-10 py-6 text-lg font-medium shadow-2xl">
                            Start for free
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>

                    {/* Hero Interactive Element */}
                    <motion.div
                        style={{ opacity, scale }}
                        className="w-full max-w-6xl aspect-[16/10] bg-zinc-900/50 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-sm mx-auto"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />

                        {/* Mockup UI Sidebar */}
                        <div className="absolute left-0 top-0 bottom-0 w-64 border-r border-white/5 bg-black/20 p-6 hidden lg:block text-left">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-white">
                                    <Inbox className="w-5 h-5 text-zinc-500" />
                                    <span className="text-sm font-medium">Inbox</span>
                                    <span className="ml-auto text-xs text-zinc-600">8</span>
                                </div>
                                <div className="flex items-center gap-3 text-zinc-500">
                                    <Star className="w-5 h-5" />
                                    <span className="text-sm font-medium">Starred</span>
                                </div>
                                <div className="pt-4 flex items-center gap-3 text-zinc-500">
                                    <Filter className="w-5 h-5" />
                                    <span className="text-sm font-medium">Smart Sift</span>
                                </div>
                                <div className="mt-8 space-y-2">
                                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-1">Insights</p>
                                    <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        <span className="text-xs text-blue-400">Revenue Signal</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                        <span className="text-xs text-purple-400">Urgent Follow-up</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mockup UI Content */}
                        <div className="absolute right-0 top-0 bottom-0 left-0 lg:left-64 p-8 text-left">
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800" />
                                    <div>
                                        <p className="text-sm font-bold">Inbox</p>
                                        <p className="text-xs text-zinc-500">8 unresolved threads</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="px-2 py-1 bg-zinc-800 rounded text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                                        <Command className="w-3 h-3" />
                                        <span>K</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={`p-4 rounded-xl border transition-colors ${i === 1 ? 'border-white/20 bg-white/5' : 'border-white/5 hover:bg-white/[0.02]'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-medium text-white">{i === 1 ? 'Maulik GPT-4' : i === 2 ? 'Linear Team' : 'Stripe Support'}</p>
                                            <p className="text-xs text-zinc-600">2 min ago</p>
                                        </div>
                                        <div className="w-full h-2 bg-zinc-800 rounded-full mb-2" />
                                        <div className="w-4/5 h-2 bg-zinc-800/50 rounded-full" />
                                    </div>
                                ))}
                            </div>

                            {/* Arcus AI Hover Card */}
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 1, duration: 0.5 }}
                                className="absolute bottom-12 right-12 w-80 bg-black/80 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-white/10 rounded-lg">
                                        <Bot className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Arcus Intelligence</p>
                                </div>
                                <p className="text-sm text-zinc-300 leading-relaxed mb-4 italic">
                                    "Detected a revenue signal in the linear team thread. Shall I draft a priority response?"
                                </p>
                                <div className="flex gap-2">
                                    <div className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg cursor-pointer hover:bg-zinc-200">Draft now</div>
                                    <div className="px-3 py-1.5 bg-zinc-800 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-zinc-700">Dismiss</div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </HeroGeometric>

            {/* Features Grid */}
            <section id="features" className="py-32 px-6 z-10 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-24 text-center">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Built for focus.</h2>
                        <p className="text-zinc-500 max-w-xl mx-auto text-lg leading-relaxed">
                            We've rethought email from the ground up for high-output founders.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {features.map((feature, idx) => (
                            <div key={idx} className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                                <div className={`mb-6 p-4 rounded-xl bg-white/5 w-fit group-hover:scale-110 transition-transform ${feature.color}`}>
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
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
