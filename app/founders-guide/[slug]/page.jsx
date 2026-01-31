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

export default function GuidePage() {
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

        // Generate Audio: try ElevenLabs first, fall back to browser TTS if unavailable
        setIsLoadingAudio(true);
        const fallbackToBrowserVoice = () => {
            const raw = (guide?.content ?? "") || `${guide?.title ?? ""} ${guide?.description ?? ""}`;
            const plainText = raw.replace(/<[^>]*>?/gm, "").trim().substring(0, 15000);
            if (!plainText || !("speechSynthesis" in window)) return false;
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(plainText);
            utterance.rate = 0.92;
            utterance.pitch = 1;
            utterance.onend = () => setIsPlaying(false);
            utterance.onerror = () => setIsPlaying(false);
            window.speechSynthesis.speak(utterance);
            setIsPlaying(true);
            toast.info("Playing with browser voice.");
            return true;
        };

        try {
            const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: guide?.content })
            });

            const contentType = res.headers.get("content-type") || "";
            const isJson = contentType.includes("application/json");

            if (res.ok && !isJson) {
                const blob = await res.blob();
                if (blob.size === 0) throw new Error("Empty audio");
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                if (audioRef.current) {
                    audioRef.current.onerror = () => {
                        URL.revokeObjectURL(url);
                        setAudioUrl(null);
                        if (fallbackToBrowserVoice()) return;
                        toast.error("Audio failed to play. Try again.");
                    };
                    audioRef.current.src = url;
                    audioRef.current.play();
                    setIsPlaying(true);
                }
            } else {
                const data = isJson ? await res.json().catch(() => ({})) : {};
                console.warn("TTS API error:", res.status, data?.code ?? data?.error);
                throw new Error(data?.code ?? "API_FAILED");
            }
        } catch (error) {
            if (!fallbackToBrowserVoice()) {
                toast.error("Audio unavailable. Try again or check your connection.");
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
                        className="flex flex-col items-center gap-6 mb-12"
                    >
                        <div className="flex items-center justify-center gap-6 text-sm text-zinc-500">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
                                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${guide.slug}`} alt="Author" />
                                </div>
                                <span>Mailient Editorial</span>
                            </div>
                            <span>•</span>
                            <span>{Math.ceil(guide.content.split(/\s+/).length / 200)} min read</span>
                        </div>

                        {/* Speaker Button */}
                        <div className="relative">
                            <button
                                onClick={handleAudioToggle}
                                disabled={isLoadingAudio}
                                className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all duration-300 ${isPlaying
                                    ? "bg-[#D97757] border-[#D97757] text-white shadow-lg shadow-[#D97757]/20 scale-105"
                                    : "bg-white/5 border-white/10 text-white hover:border-[#D97757]/50"
                                    }`}
                            >
                                {isLoadingAudio ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : isPlaying ? (
                                    <Pause className="w-5 h-5 fill-current" />
                                ) : (
                                    <Volume2 className="w-5 h-5" />
                                )}
                                <span className="font-bold text-sm tracking-tight">
                                    {isLoadingAudio ? "Preparing Audio..." : isPlaying ? "Listening Now" : "Listen to Article"}
                                </span>
                            </button>

                            {/* Animated Pulse for Playing State */}
                            {isPlaying && (
                                <span className="absolute -inset-1 rounded-2xl bg-[#D97757]/20 animate-ping pointer-events-none" />
                            )}
                        </div>
                    </motion.div>
                </header>

                {/* Article Content — editorial typography and spacing */}
                <main className="px-6 sm:px-8 max-w-3xl mx-auto pb-4">
                    <motion.article
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="
                            [&_h2]:text-2xl sm:[&_h2]:text-3xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-white
                            [&_h2]:mt-16 [&_h2]:mb-6 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-white/10
                            [&_p]:text-zinc-300 [&_p]:text-lg [&_p]:leading-[1.85] [&_p]:mb-8
                            [&_strong]:text-white [&_strong]:font-bold
                            [&_em]:text-zinc-200
                            [&_ul]:my-8 [&_ul]:space-y-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:text-zinc-400 [&_li]:leading-relaxed [&_li]:text-base
                        "
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
