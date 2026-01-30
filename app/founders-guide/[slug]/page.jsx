"use client";

import { useParams, useRouter } from "next/navigation";
import { guides } from "@/lib/guides";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Share2, Bookmark, Mail, Check, Sparkles, BookOpen, Volume2, Pause, Play, Loader2 } from "lucide-react";
import { BackgroundShaders } from "@/components/ui/background-paper-shaders";
import { GlassButton } from "@/components/ui/glass-button";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useScroll, useSpring } from "framer-motion";

export default function GuidePage() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });
    const { slug } = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const guide = guides.find((g) => g.slug === slug);

    // UI State
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Audio State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const audioRef = useRef(null);

    useEffect(() => {
        if (session && guide) {
            checkBookmarkStatus();
        }
    }, [session, guide]);

    const checkBookmarkStatus = async () => {
        try {
            const res = await fetch("/api/bookmarks");
            const data = await res.json();
            if (data.bookmarks) {
                setIsBookmarked(data.bookmarks.some(b => b.post_id === guide.slug));
            }
        } catch (error) {
            console.error("Error checking bookmark status:", error);
        }
    };

    const toggleBookmark = async () => {
        if (!session) {
            toast.error("Please login to save articles");
            router.push("/auth/signin");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch("/api/bookmarks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    postId: guide.slug,
                    postData: { title: guide.title, description: guide.description }
                })
            });

            if (res.ok) {
                const data = await res.json();
                setIsBookmarked(data.bookmarked);
                toast.success(data.bookmarked ? "Saved to your Hub" : "Removed from bookmarks");
            }
        } catch (error) {
            toast.error("Failed to update bookmark");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAudioToggle = async () => {
        if (isPlaying) {
            audioRef.current?.pause();
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            setIsPlaying(false);
            return;
        }

        if (audioUrl) {
            audioRef.current?.play();
            setIsPlaying(true);
            return;
        }

        // Generate Audio
        setIsLoadingAudio(true);
        try {
            const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: guide?.content })
            });

            if (!res.ok) throw new Error("API Failed");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);

            if (audioRef.current) {
                audioRef.current.src = url;
                audioRef.current.play();
                setIsPlaying(true);
            }
        } catch (error) {
            console.warn("TTS API failed, falling back to browser voice:", error);

            // Browser Speech Fallback
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(guide.content.replace(/<[^>]*>?/gm, ''));
                utterance.rate = 0.9;
                utterance.pitch = 1;
                utterance.onend = () => setIsPlaying(false);
                utterance.onerror = () => setIsPlaying(false);

                window.speechSynthesis.speak(utterance);
                setIsPlaying(true);
                toast.success("Playing via browser voice (API fallback)");
            } else {
                toast.error("Couldn't load the speaker. Please try again.");
            }
        } finally {
            setIsLoadingAudio(false);
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: guide?.title,
                text: guide?.description,
                url: window.location.href,
            }).catch(() => {
                copyToClipboard();
            });
        } else {
            copyToClipboard();
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
    };

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
            {/* Audio Element */}
            <audio
                ref={audioRef}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
            />

            {/* Background Layer */}
            <div className="fixed inset-0 z-0">
                <BackgroundShaders />
                <div className="absolute inset-0 bg-black/60" />
            </div>

            {/* Reading Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 h-1 bg-[#D97757] z-[100]"
                style={{ scaleX }}
            />

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
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                        className="text-5xl md:text-7xl font-extrabold tracking-tight mb-12 leading-[1.1] bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent"
                    >
                        {guide.title}
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col items-center gap-8 mb-16"
                    >
                        <div className="flex items-center justify-center gap-8 text-sm text-zinc-500 font-medium">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 overflow-hidden shadow-2xl">
                                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${guide.slug}`} alt="Author" />
                                </div>
                                <span className="text-zinc-300">Mailient Editorial</span>
                            </div>
                            <span className="w-1 h-1 rounded-full bg-zinc-800" />
                            <span className="bg-zinc-900/50 px-3 py-1 rounded-full border border-white/5">{Math.ceil(guide.content.split(/\s+/).length / 200)} min read</span>
                        </div>

                        {/* Speaker Button */}
                        <div className="relative group/speaker">
                            <button
                                onClick={handleAudioToggle}
                                disabled={isLoadingAudio}
                                className={`flex items-center gap-4 px-8 py-4 rounded-full border transition-all duration-500 ease-out ${isPlaying
                                    ? "bg-white border-white text-black shadow-[0_0_40px_rgba(255,255,255,0.2)] scale-105"
                                    : "bg-white/5 border-white/10 text-white hover:border-[#D97757]/50 hover:bg-white/[0.08]"
                                    }`}
                            >
                                <div className="relative w-6 h-6 flex items-center justify-center">
                                    {isLoadingAudio ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : isPlaying ? (
                                        <Pause className="w-5 h-5 fill-current" />
                                    ) : (
                                        <Volume2 className="w-5 h-5 group-hover/speaker:scale-110 transition-transform" />
                                    )}
                                </div>
                                <span className="font-bold text-sm tracking-widest uppercase">
                                    {isLoadingAudio ? "Syncing..." : isPlaying ? "Streaming" : "Play Article"}
                                </span>
                            </button>

                            {/* Animated Pulse for Playing State */}
                            {isPlaying && (
                                <span className="absolute -inset-1 rounded-2xl bg-[#D97757]/20 animate-ping pointer-events-none" />
                            )}
                        </div>
                    </motion.div>
                </header>

                {/* Content Section */}
                <main className="px-6 max-w-3xl mx-auto pb-32">
                    <style jsx global>{`
                        .article-content h2 {
                            font-size: 2.25rem;
                            font-weight: 800;
                            color: white;
                            margin-top: 4rem;
                            margin-bottom: 1.5rem;
                            letter-spacing: -0.02em;
                            line-height: 1.2;
                        }
                        .article-content p {
                            font-size: 1.25rem;
                            line-height: 1.8;
                            color: #a1a1aa; /* text-zinc-400 */
                            margin-bottom: 2rem;
                        }
                        .article-content strong {
                            color: white;
                            font-weight: 700;
                        }
                        .article-content ul {
                            margin-bottom: 2.5rem;
                            padding-left: 1.5rem;
                            list-style-type: disc;
                            color: #a1a1aa;
                        }
                        .article-content li {
                            margin-bottom: 1rem;
                            padding-left: 0.5rem;
                            font-size: 1.15rem;
                        }
                        .article-content blockquote {
                            border-left: 4px solid #D97757;
                            padding-left: 1.5rem;
                            font-style: italic;
                            margin: 3rem 0;
                            color: #e4e4e7;
                        }
                    `}</style>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="article-content"
                        dangerouslySetInnerHTML={{ __html: guide.content }}
                    />

                    {/* Action Bar */}
                    <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between">
                        <div className="flex gap-4">
                            <button
                                onClick={handleShare}
                                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-zinc-400 hover:text-white flex items-center gap-2 text-sm font-medium"
                            >
                                <Share2 className="w-4 h-4" />
                                Share
                            </button>
                            <button
                                onClick={toggleBookmark}
                                disabled={isSaving}
                                className={`p-3 rounded-xl transition-all flex items-center gap-2 text-sm font-medium ${isBookmarked
                                    ? "bg-[#D97757] text-white"
                                    : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                                    }`}
                            >
                                <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
                                {isBookmarked ? "Saved" : "Save for later"}
                            </button>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-600">
                            Founders Guide / {guide.slug}
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
