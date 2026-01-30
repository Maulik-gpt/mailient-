"use client";

import { useParams, useRouter } from "next/navigation";
import { guides } from "@/lib/guides";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Share2, Bookmark, Mail, Check, Sparkles } from "lucide-react";
import { BackgroundShaders } from "@/components/ui/background-paper-shaders";
import { GlassButton } from "@/components/ui/glass-button";
import { Button } from "@/components/ui/button";

export default function GuidePage() {
    const { slug } = useParams();
    const router = useRouter();
    const guide = guides.find((g) => g.slug === slug);

    if (!guide) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
                <h1 className="text-4xl font-bold mb-4">Guide not found</h1>
                <Button onClick={() => router.push('/founders-guide')} variant="outline">Back to Hub</Button>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-white selection:text-black font-satoshi overflow-x-hidden">
            {/* Background Layer */}
            <div className="fixed inset-0 z-0">
                <BackgroundShaders />
                <div className="absolute inset-0 bg-black/60" />
            </div>

            <div className="relative z-10">
                {/* Simple Nav */}
                <nav className="p-8 flex items-center justify-between max-w-7xl mx-auto">
                    <Link href="/founders-guide" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Back to Hub</span>
                    </Link>

                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-7 h-7 rounded flex items-center justify-center group-hover:rotate-6 transition-transform overflow-hidden font-bold bg-white text-black text-sm">
                            M
                        </div>
                        <span className="font-bold tracking-tight text-lg">Mailient</span>
                    </Link>
                </nav>

                {/* Article Header */}
                <header className="px-6 pt-16 pb-12 max-w-3xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-8 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D97757]/10 border border-[#D97757]/20"
                    >
                        <Sparkles className="h-3 w-3 text-[#D97757]" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D97757]">Founder Intel</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-bold tracking-tight mb-8 leading-tight"
                    >
                        {guide.title}
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center justify-center gap-6 text-sm text-zinc-500 mb-12"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Maulik" alt="Author" />
                            </div>
                            <span>Maulik</span>
                        </div>
                        <span>•</span>
                        <span>January 30, 2026</span>
                        <span>•</span>
                        <span>5 min read</span>
                    </motion.div>
                </header>

                {/* Progress Bar (Sticky) */}
                {/* <div className="sticky top-0 h-1 bg-white/5 z-50">
           <motion.div className="h-full bg-[#D97757]" style={{ scaleX: scrollYProgress, transformOrigin: "0%" }} />
        </div> */}

                {/* Content Section */}
                <main className="px-6 max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="prose prose-invert prose-zinc max-w-none 
              prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-white
              prose-p:text-zinc-400 prose-p:leading-relaxed prose-p:mb-6 prose-p:text-lg
              prose-strong:text-white prose-strong:font-bold"
                        dangerouslySetInnerHTML={{ __html: guide.content }}
                    />

                    {/* Share Section */}
                    <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between">
                        <div className="flex gap-4">
                            <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-zinc-400 hover:text-white">
                                <Share2 className="w-4 h-4" />
                            </button>
                            <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-zinc-400 hover:text-white">
                                <Bookmark className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-600">
                            Founders Guide / {guide.title}
                        </div>
                    </div>
                </main>

                {/* CTA Section */}
                <section className="px-6 py-32 max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative rounded-[3rem] border border-white/10 bg-zinc-950 overflow-hidden p-8 md:p-16 text-center"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-[#D97757]/10 to-transparent pointer-events-none" />

                        <div className="relative z-10 max-w-2xl mx-auto">
                            <div className="mb-8 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08]">
                                <Sparkles className="h-3 w-3 text-white/60" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Take Action</span>
                            </div>

                            <h2 className="text-4xl md:text-5xl font-bold mb-6">Stop managing your inbox. <br /> Start automating it.</h2>
                            <p className="text-zinc-500 text-lg mb-10">
                                Mailient uses intelligence to identify revenue opportunities and draft replies in your voice—automatically.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <GlassButton onClick={() => router.push('/auth/signin')} className="w-full sm:w-auto rounded-full px-8 py-4">
                                    Unlock My Inbox
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </GlassButton>
                                <Link href="/" className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">
                                    Learn more about Mailient
                                </Link>
                            </div>

                            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-zinc-600">
                                <div className="flex items-center justify-center gap-2">
                                    <Check className="w-3 h-3 text-green-500" />
                                    <span>Google OAuth Secure</span>
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <Check className="w-3 h-3 text-green-500" />
                                    <span>2 Min Setup</span>
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <Check className="w-3 h-3 text-green-500" />
                                    <span>No CC Required</span>
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <Check className="w-3 h-3 text-green-500" />
                                    <span>AI Powered</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* Footer */}
                <footer className="py-20 px-6 border-t border-zinc-900 bg-zinc-950">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-white rounded flex items-center justify-center font-bold text-black text-xs">
                                M
                            </div>
                            <span className="font-bold tracking-tight text-white">Mailient</span>
                        </div>
                        <p className="text-zinc-600 text-xs text-center border-l border-zinc-900 pl-8 hidden md:block">
                            © 2026 Mailient Intelligence. Built for founders.
                        </p>
                        <div className="flex gap-8 text-xs font-bold text-zinc-600 uppercase tracking-widest">
                            <Link href="/founders-guide" className="hover:text-white transition-colors">Hub</Link>
                            <Link href="/" className="hover:text-white transition-colors">Home</Link>
                            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
