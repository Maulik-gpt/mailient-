"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { guides } from "@/lib/guides";
import Link from "next/link";
import {
    ArrowRight,
    Bookmark,
    Sparkles,
    Clock,
    Headphones,
    ChevronRight,
    LineChart,
    Zap,
    Target,
    Mail,
} from "lucide-react";
import { BackgroundShaders } from "@/components/ui/background-paper-shaders";
import { GlassButton } from "@/components/ui/glass-button";
import { useSession } from "next-auth/react";

const categoryIcons = [Zap, LineChart, Target];
const categoryLabels = ["Mindset", "Systems", "Execution"];

export default function FoundersGuideHub() {
    const { data: session } = useSession();
    const [bookmarkedIds, setBookmarkedIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const { scrollY } = useScroll();
    const navOpacity = useTransform(scrollY, [0, 80], [0, 1]);

    useEffect(() => {
        if (session?.user?.email) {
            fetchBookmarks();
        } else {
            setLoading(false);
        }
    }, [session]);

    const fetchBookmarks = async () => {
        try {
            const res = await fetch("/api/bookmarks");
            const data = await res.json();
            if (data.bookmarks) {
                setBookmarkedIds(data.bookmarks.map((b) => b.post_id));
            }
        } catch (error) {
            console.error("Error fetching bookmarks:", error);
        } finally {
            setLoading(false);
        }
    };

    const bookmarkedGuides = guides.filter((g) => bookmarkedIds.includes(g.slug));
    const totalWords = guides.reduce((acc, g) => acc + g.content.split(/\s+/).length, 0);
    const avgReadMin = Math.round(totalWords / guides.length / 200) || 12;

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-white selection:text-black font-satoshi overflow-x-hidden">
            {/* Background */}
            <div className="fixed inset-0 z-0">
                <BackgroundShaders />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(217,119,87,0.08),transparent)]" />
            </div>

            {/* Nav */}
            <motion.nav
                style={{ opacity: navOpacity }}
                className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl"
            >
                <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            M
                        </div>
                        <span className="font-bold tracking-tight text-lg text-white">Mailient</span>
                        <span className="text-zinc-500 text-sm font-medium hidden sm:inline">/ Founder Hub</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/auth/signin"
                            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 hover:border-white/20 transition-all"
                        >
                            Get started
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </motion.nav>

            <div className="relative z-10">
                {/* Hero */}
                <header className="pt-32 pb-24 sm:pt-40 sm:pb-32 px-6 sm:px-8 max-w-5xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-10"
                    >
                        <Sparkles className="h-3.5 w-3 text-[#D97757]" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
                            Curated for founders
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08, duration: 0.5 }}
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6"
                    >
                        <span className="text-white">The Founder&apos;s Guide to</span>
                        <br />
                        <span className="text-[#D97757] bg-clip-text">Email That Works</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.14, duration: 0.5 }}
                        className="text-zinc-400 max-w-xl mx-auto text-lg sm:text-xl leading-relaxed mb-12"
                    >
                        Frameworks, systems, and insights to turn your inbox from a bottleneck into a growth engine.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500"
                    >
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D97757]" />
                            {guides.length} guides
                        </span>
                        <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-zinc-600" />
                            ~{avgReadMin} min read each
                        </span>
                        <span className="flex items-center gap-2">
                            <Headphones className="w-4 h-4 text-zinc-600" />
                            Listen to article
                        </span>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.26, duration: 0.5 }}
                        className="mt-14"
                    >
                        <GlassButton
                            onClick={() => document.getElementById("guides")?.scrollIntoView({ behavior: "smooth" })}
                            className="rounded-full px-8 py-4 text-base font-semibold"
                        >
                            Explore the library
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </GlassButton>
                    </motion.div>
                </header>

                {/* Saved section (when logged in + has bookmarks) */}
                <AnimatePresence>
                    {session && bookmarkedGuides.length > 0 && (
                        <motion.section
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4 }}
                            className="px-6 sm:px-8 max-w-7xl mx-auto pb-16"
                        >
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 sm:p-10">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-[#D97757]/10 border border-[#D97757]/20 flex items-center justify-center">
                                        <Bookmark className="w-5 h-5 text-[#D97757] fill-[#D97757]/20" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Your saved intel</h2>
                                        <p className="text-sm text-zinc-500">{bookmarkedGuides.length} article{bookmarkedGuides.length !== 1 ? "s" : ""} saved</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {bookmarkedGuides.map((guide, index) => (
                                        <GuideCard
                                            key={guide.slug}
                                            guide={guide}
                                            index={index}
                                            isBookmarked={true}
                                            variant="compact"
                                        />
                                    ))}
                                </div>
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>

                {/* Library */}
                <main id="guides" className="px-6 sm:px-8 max-w-7xl mx-auto py-20 sm:py-28">
                    <div className="flex items-baseline justify-between gap-4 mb-12">
                        <div>
                            <div className="h-px w-12 bg-[#D97757] mb-4" />
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                Full library
                            </h2>
                            <p className="text-zinc-500 text-sm mt-1">
                                Deep dives on inbox, investors, and leverage.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                        {guides.map((guide, index) => (
                            <GuideCard
                                key={guide.slug}
                                guide={guide}
                                index={index}
                                isBookmarked={bookmarkedIds.includes(guide.slug)}
                            />
                        ))}
                    </div>
                </main>

                {/* CTA strip */}
                <section className="px-6 sm:px-8 py-20 sm:py-28">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="max-w-4xl mx-auto rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-10 sm:p-14 text-center"
                    >
                        <p className="text-zinc-400 text-lg mb-6">
                            Stop managing your inbox. Start automating it.
                        </p>
                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-8">
                            Unlock your inbox with Mailient
                        </h3>
                        <Link
                            href="/auth/signin"
                            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 hover:border-white/20 transition-all"
                        >
                            Get started free
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Link>
                    </motion.div>
                </section>

                {/* Footer */}
                <footer className="py-16 px-6 sm:px-8 border-t border-white/[0.06]">
                    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
                                <Mail className="w-3.5 h-3.5 text-black" />
                            </div>
                            <span className="font-bold tracking-tight text-white">Mailient</span>
                        </div>
                        <p className="text-zinc-500 text-sm text-center sm:text-left">
                            Built for high-performance founders.
                        </p>
                        <div className="flex items-center gap-8 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                            <Link href="/" className="hover:text-white transition-colors">Home</Link>
                            <Link href="/auth/signin" className="hover:text-white transition-colors">Sign in</Link>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function GuideCard({ guide, index, isBookmarked, variant = "default" }) {
    const Icon = categoryIcons[index % categoryIcons.length];
    const label = categoryLabels[index % categoryLabels.length];
    const readMin = Math.ceil(guide.content.split(/\s+/).length / 200);

    if (variant === "compact") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
            >
                <Link
                    href={`/founders-guide/${guide.slug}`}
                    className="group flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300"
                >
                    <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 group-hover:bg-[#D97757]/10 transition-colors">
                        <Icon className="w-5 h-5 text-[#D97757]" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-white truncate group-hover:text-[#D97757] transition-colors">
                            {guide.title}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">{readMin} min read</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-[#D97757] group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: Math.min(index * 0.06, 0.4), duration: 0.4 }}
        >
            <Link
                href={`/founders-guide/${guide.slug}`}
                className="group block h-full p-6 sm:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all duration-300 relative overflow-hidden"
            >
                {/* Subtle hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-[#D97757]/[0.06] via-transparent to-transparent" />

                <div className="relative">
                    <div className="flex items-start justify-between gap-4 mb-5">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                            {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center group-hover:bg-[#D97757]/10 transition-colors">
                            <Icon className="w-4 h-4 text-zinc-400 group-hover:text-[#D97757] transition-colors" />
                        </div>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 leading-tight group-hover:text-[#D97757] transition-colors duration-300">
                        {guide.title}
                    </h3>

                    <p className="text-zinc-500 text-sm sm:text-base leading-relaxed mb-6 line-clamp-3">
                        {guide.description}
                    </p>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {readMin} min
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Headphones className="w-3.5 h-3.5" />
                                Listen
                            </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97757] opacity-0 group-hover:opacity-100 transition-opacity">
                            Read
                            <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                    </div>
                </div>

                {isBookmarked && (
                    <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-[#D97757] ring-2 ring-black" />
                )}
            </Link>
        </motion.div>
    );
}
