"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { guides } from "@/lib/guides";
import Link from "next/link";
import {
    ArrowRight,
    ArrowUpRight,
    Clock,
    ChevronRight,
} from "lucide-react";
import { useSession } from "next-auth/react";

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

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } },
    };

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-x-hidden font-sans">
            {/* Grid Pattern Background */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

            {/* Nav */}
            <motion.nav
                style={{ opacity: navOpacity }}
                className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md"
            >
                <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em]">
                    <Link href="/" className="flex items-center gap-4 group transition-colors hover:text-zinc-400">
                        <div className="w-4 h-4 bg-white" />
                        <span>Mailient / Intelligence</span>
                    </Link>
                    <div className="flex items-center gap-10">
                        <Link href="/auth/signin" className="hover:text-zinc-400 transition-colors">Sign in</Link>
                        <Link href="/" className="hover:text-zinc-400 transition-colors">Workspace</Link>
                    </div>
                </div>
            </motion.nav>

            <div className="relative z-10">
                {/* Hero */}
                <header className="pt-40 pb-32 px-8 max-w-5xl mx-auto">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="space-y-12"
                    >
                        <motion.div variants={itemVariants} className="space-y-6">
                            <div className="inline-block border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.3em] font-mono text-zinc-500">
                                Curated Intel
                            </div>
                            <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-[1.05]">
                                Strategic leverage <br /> for founders.
                            </h1>
                        </motion.div>

                        <motion.p
                            variants={itemVariants}
                            className="text-zinc-400 max-w-lg text-base md:text-lg leading-relaxed font-light"
                        >
                            Advanced frameworks on high-leverage email management, communication protocols, and executive systems. Information as a competitive advantage.
                        </motion.p>

                        <motion.div variants={itemVariants} className="pt-8 flex flex-wrap gap-x-12 gap-y-6 text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                            <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-white" />
                                {guides.length} Protocol Guides
                            </span>
                            <span className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" />
                                Continuous Updates
                            </span>
                        </motion.div>
                    </motion.div>
                </header>

                {/* Library Section */}
                <motion.main
                    id="guides"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={containerVariants}
                    className="px-8 max-w-7xl mx-auto py-24 border-t border-white/10"
                >
                    <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
                        <div className="space-y-4">
                            <h2 className="text-[10px] uppercase tracking-[0.4em] font-mono text-zinc-500">Protocol Library</h2>
                            <p className="text-2xl font-medium tracking-tight">Access essential frameworks</p>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/10 border border-white/10 overflow-hidden">
                        {guides.map((guide, index) => (
                            <GuideCard
                                key={guide.slug}
                                guide={guide}
                                index={index}
                                isBookmarked={bookmarkedIds.includes(guide.slug)}
                            />
                        ))}
                    </div>
                </motion.main>

                {/* CTA */}
                <section className="px-8 py-32 md:py-48 max-w-5xl mx-auto text-center border-t border-white/10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="space-y-10"
                    >
                        <h3 className="text-3xl md:text-5xl font-medium tracking-tight leading-tight">
                            Establish executive <br /> email sovereignty.
                        </h3>
                        <div className="flex flex-col items-center gap-6">
                            <Link
                                href="/auth/signin"
                                className="inline-flex items-center justify-center px-10 py-5 bg-white text-black text-xs font-mono uppercase tracking-[0.3em] transition-transform active:scale-95 hover:bg-zinc-200"
                            >
                                Deploy Mailient
                            </Link>
                            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                                Zero friction / Enterprise Grade
                            </p>
                        </div>
                    </motion.div>
                </section>

                {/* Footer */}
                <footer className="py-16 px-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-10 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    <div className="flex items-center gap-4">
                        <div className="w-4 h-4 bg-zinc-800" />
                        <span>© 2026 Mailient Intelligence</span>
                    </div>
                    <div className="flex items-center gap-12">
                        <Link href="/" className="hover:text-white transition-colors">Protocol</Link>
                        <Link href="/auth/signin" className="hover:text-white transition-colors">Access</Link>
                        <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function GuideCard({ guide, index, isBookmarked }) {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { duration: 0.6 } }
            }}
            className="group block bg-black hover:bg-white/[0.02] transition-colors relative h-[420px]"
        >
            <Link
                href={`/founders-guide/${guide.slug}`}
                className="flex flex-col h-full p-10 md:p-12"
            >
                <div className="flex items-center justify-between mb-auto">
                    <span className="font-mono text-[10px] text-zinc-700 tracking-[0.3em]">
                        {String(index + 1).padStart(2, "0")}
                    </span>
                    {isBookmarked && (
                        <div className="w-1.5 h-1.5 bg-white shrink-0" />
                    )}
                </div>

                <div className="space-y-6">
                    <h3 className="text-2xl font-medium tracking-tight text-white group-hover:text-zinc-300 transition-colors">
                        {guide.title}
                    </h3>
                    <p className="text-sm text-zinc-500 leading-relaxed font-light line-clamp-3">
                        {guide.description}
                    </p>
                </div>

                <div className="mt-12 flex items-center justify-between">
                    <div className="flex items-center gap-6 font-mono text-[9px] uppercase tracking-widest text-zinc-600">
                        <span className="flex items-center gap-2">
                            Protocol v1.0
                        </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-zinc-700 group-hover:text-white transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
            </Link>
        </motion.div>
    );
}
