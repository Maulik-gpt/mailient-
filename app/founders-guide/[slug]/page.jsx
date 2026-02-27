"use client";

import { useParams, useRouter } from "next/navigation";
import { guides } from "@/lib/guides";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Share2, Bookmark, Check, Volume2, Pause, Play, Loader2 } from "lucide-react";
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
                toast.success(data.bookmarked ? "Protocol saved" : "Protocol removed");
            }
        } catch (error) {
            toast.error("Network error");
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

        setIsLoadingAudio(true);
        const fallbackToBrowserVoice = () => {
            const raw = (guide?.content ?? "") || `${guide?.title ?? ""} ${guide?.description ?? ""}`;
            const plainText = raw.replace(/<[^>]*>?/gm, "").trim().substring(0, 15000);
            if (!plainText || !("speechSynthesis" in window)) return false;
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(plainText);
            utterance.rate = 0.95;
            utterance.pitch = 1;
            utterance.onend = () => setIsPlaying(false);
            utterance.onerror = () => setIsPlaying(false);
            window.speechSynthesis.speak(utterance);
            setIsPlaying(true);
            return true;
        };

        try {
            const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: guide?.content })
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                if (audioRef.current) {
                    audioRef.current.src = url;
                    audioRef.current.play();
                    setIsPlaying(true);
                }
            } else {
                throw new Error("TTS_FAILED");
            }
        } catch (error) {
            if (!fallbackToBrowserVoice()) {
                toast.error("Audio playback unavailable");
            }
        } finally {
            setIsLoadingAudio(false);
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied");
    };

    if (!guide) return null;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans">
            {/* Grid Background */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

            {/* Audio Element */}
            <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />

            <div className="relative z-10">
                {/* Minimalist Nav */}
                <nav className="p-8 h-20 flex items-center justify-between max-w-7xl mx-auto border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.2em]">
                    <Link href="/founders-guide" className="flex items-center gap-4 group hover:text-zinc-400 transition-colors">
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        <span>Intel Hub</span>
                    </Link>

                    <Link href="/" className="flex items-center gap-4 group transition-colors hover:text-zinc-400">
                        <div className="w-4 h-4 bg-white" />
                        <span>Mailient</span>
                    </Link>
                </nav>

                <main className="max-w-4xl mx-auto px-8 pt-32 pb-48">
                    {/* Header */}
                    <header className="space-y-12 mb-24">
                        <div className="space-y-6">
                            <div className="inline-block border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.3em] font-mono text-zinc-500">
                                Protocol /{guide.slug}
                            </div>
                            <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-[1.1]">
                                {guide.title}
                            </h1>
                        </div>

                        <div className="flex flex-wrap items-center gap-12 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-zinc-800" />
                                Editorial
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" />
                                {Math.ceil(guide.content.split(/\s+/).length / 200)}m Duration
                            </div>
                            <button
                                onClick={handleAudioToggle}
                                className="flex items-center gap-2 text-white hover:text-zinc-400 transition-colors"
                            >
                                {isLoadingAudio ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : isPlaying ? (
                                    <Pause className="w-3 h-3 fill-current" />
                                ) : (
                                    <Volume2 className="w-3 h-3" />
                                )}
                                {isPlaying ? "Active Audio" : "Play Protocol"}
                            </button>
                        </div>
                    </header>

                    {/* Article Body */}
                    <article
                        className="
                            prose-zinc prose-invert max-w-none
                            [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:mt-24 [&_h2]:mb-8 [&_h2]:uppercase [&_h2]:text-[13px] [&_h2]:font-mono [&_h2]:tracking-[0.3em] [&_h2]:text-zinc-500 [&_h2]:border-b [&_h2]:border-white/10 [&_h2]:pb-4
                            [&_p]:text-zinc-400 [&_p]:text-[15px] [&_p]:leading-[1.8] [&_p]:mb-10 [&_p]:font-light
                            [&_strong]:text-white [&_strong]:font-medium
                            [&_ul]:list-none [&_ul]:p-0 [&_ul]:mb-12
                            [&_li]:text-zinc-500 [&_li]:text-[14px] [&_li]:mb-4 [&_li]:flex [&_li]:gap-4
                            [&_li]:before:content-['—'] [&_li]:before:text-zinc-800
                        "
                        dangerouslySetInnerHTML={{ __html: guide.content }}
                    />

                    {/* Tools Area */}
                    <div className="mt-32 pt-12 border-t border-white/10 flex flex-wrap items-center justify-between gap-8">
                        <div className="flex gap-8 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                            <button onClick={handleShare} className="hover:text-white transition-colors flex items-center gap-2">
                                <Share2 className="w-3 h-3" /> Share
                            </button>
                            <button onClick={toggleBookmark} className="hover:text-white transition-colors flex items-center gap-2">
                                <Bookmark className={cn("w-3 h-3", isBookmarked && "fill-current text-white")} />
                                {isBookmarked ? "Protocol Bookmarked" : "Save Protocol"}
                            </button>
                        </div>
                        <div className="text-[9px] font-mono text-zinc-800 uppercase tracking-[0.4em]">
                            End of transmission
                        </div>
                    </div>
                </main>

                {/* Footer CTA */}
                <section className="px-8 py-32 bg-zinc-950 border-t border-white/10 text-center">
                    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                        <h2 className="text-2xl font-medium tracking-tight mb-12">Return to the intelligent center.</h2>
                        <Link
                            href="/auth/signin"
                            className="inline-flex items-center justify-center px-10 py-5 bg-white text-black text-xs font-mono uppercase tracking-[0.3em] hover:bg-zinc-200 transition-colors"
                        >
                            Access Dashboard
                        </Link>
                    </motion.div>
                </section>

                <footer className="py-12 px-8 border-t border-white/5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    <span>© 2026 Mailient</span>
                    <div className="flex gap-10">
                        <Link href="/founders-guide" className="hover:text-white">Hub</Link>
                        <Link href="/" className="hover:text-white">Protocol</Link>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
