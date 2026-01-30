"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { guides } from "@/lib/guides";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bookmark, Mail, Check, Sparkles, Clock, Zap, Bot, Star } from "lucide-react";
import { BackgroundShaders } from "@/components/ui/background-paper-shaders";
import { GlassButton } from "@/components/ui/glass-button";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export default function FoundersGuideHub() {
    const { data: session } = useSession();
    const [bookmarkedIds, setBookmarkedIds] = useState([]);
    const [loading, setLoading] = useState(true);

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
                setBookmarkedIds(data.bookmarks.map(b => b.post_id));
            }
        } catch (error) {
            console.error("Error fetching bookmarks:", error);
        } finally {
            setLoading(false);
        }
    };

    const bookmarkedGuides = guides.filter(g => bookmarkedIds.includes(g.slug));

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-white selection:text-black font-satoshi overflow-x-hidden">
            {/* Background Layer */}
            <div className="fixed inset-0 z-0">
                <BackgroundShaders />
                <div className="absolute inset-0 bg-black/60" />
            </div>

            <div className="relative z-10">
                {/* Simple Nav */}
                <nav className="p-8">
                    <Link href="/" className="flex items-center gap-2 group w-fit">
                        <div className="w-8 h-8 rounded flex items-center justify-center group-hover:rotate-6 transition-transform overflow-hidden font-bold bg-white text-black">
                            M
                        </div>
                        <span className="font-bold tracking-tight text-xl">Mailient</span>
                    </Link>
                </nav>

                {/* Hero Section */}
                <header className="px-6 pt-20 pb-32 max-w-7xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8"
                    >
                        <Sparkles className="h-3 w-3 text-white/60" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">The Content Moat</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-7xl font-bold tracking-tight mb-8"
                    >
                        The Founder’s Guide to <br />
                        <span className="text-[#D97757]">Surviving Email Overload</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-zinc-500 max-w-2xl mx-auto text-xl leading-relaxed mb-12"
                    >
                        A curated hub of strategies, frameworks, and insights to help you transform your inbox from a bottleneck into a growth engine.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <GlassButton onClick={() => document.getElementById('guides').scrollIntoView({ behavior: 'smooth' })} className="rounded-full">
                            Explore the Hub
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </GlassButton>
                    </motion.div>
                </header>

                {/* Bookmarks Section (Only if visible) */}
                <AnimatePresence>
                    {session && bookmarkedGuides.length > 0 && (
                        <motion.section
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-6 py-12 max-w-7xl mx-auto border-b border-white/5"
                        >
                            <div className="flex items-center gap-2 mb-8 text-[#D97757]">
                                <Bookmark className="w-5 h-5 fill-current" />
                                <h2 className="text-2xl font-bold">Your Saved Intel</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {bookmarkedGuides.map((guide, index) => (
                                    <GuideCard key={guide.slug} guide={guide} index={index} isBookmarked={true} />
                                ))}
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>

                {/* Guides Grid */}
                <main id="guides" className="px-6 py-20 max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 mb-12">
                        <div className="w-2 h-2 rounded-full bg-[#D97757]" />
                        <h2 className="font-bold text-zinc-100 uppercase tracking-widest text-sm">Full Library</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

                {/* Footer */}
                <footer className="py-20 px-6 border-t border-zinc-900 bg-zinc-950">
                    <div className="max-w-7xl mx-auto text-center">
                        <div className="flex items-center justify-center gap-2 mb-8">
                            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                                <Mail className="w-4 h-4 text-black" />
                            </div>
                            <span className="font-bold tracking-tight text-white">Mailient</span>
                        </div>
                        <p className="text-zinc-500 text-sm mb-8">
                            Intelligence that understands your business. <br />
                            Built for high-performance founders.
                        </p>
                        <div className="flex justify-center gap-8 text-xs font-bold text-zinc-600 uppercase tracking-widest">
                            <Link href="/" className="hover:text-white transition-colors">Home</Link>
                            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                            <Link href="/auth/signin" className="hover:text-white transition-colors">Login</Link>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function GuideCard({ guide, index, isBookmarked }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
        >
            <Link
                href={`/founders-guide/${guide.slug}`}
                className="group block p-8 rounded-3xl border border-white/5 bg-zinc-950/50 hover:border-white/20 transition-all duration-300 h-full relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                <div className="mb-6 p-4 bg-white/5 rounded-2xl w-fit group-hover:scale-110 transition-transform flex items-center justify-center relative">
                    {index % 3 === 0 ? <Zap className="w-6 h-6 text-[#D97757]" /> :
                        index % 3 === 1 ? <Bot className="w-6 h-6 text-blue-400" /> :
                            <Star className="w-6 h-6 text-yellow-400" />}

                    {isBookmarked && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#D97757] rounded-full" />
                    )}
                </div>

                <h3 className="text-xl font-bold mb-4 group-hover:text-white transition-colors">
                    {guide.title}
                </h3>

                <p className="text-zinc-500 text-sm leading-relaxed mb-8">
                    {guide.description}
                </p>

                <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                        <Clock className="w-3 h-3" />
                        <span>{Math.ceil(guide.content.split(/\s+/).length / 200)} min read</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[#D97757] opacity-0 group-hover:opacity-100 transition-opacity">
                        Read More <ArrowRight className="w-3 h-3" />
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
