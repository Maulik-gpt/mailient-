'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Sparkles, Copy, Check, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RewardsCardProps {
    onClose: () => void;
    usageData: {
        planType: 'free' | 'starter' | 'pro' | 'none';
        features: Record<string, { usage: number; limit: number; remaining: number; isUnlimited: boolean; period: string }>;
    };
}

export function RewardsCard({ onClose, usageData }: RewardsCardProps) {
    const [copied, setCopied] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/user/profile');
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleCopyLink = () => {
        const username = profile?.username || profile?.email?.split('@')[0] || '';
        const url = `${window.location.origin}/invite/${username}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success('Invite link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const username = profile?.username || profile?.email?.split('@')[0] || '';
    const referralUrl = `${typeof window !== 'undefined' ? window.location.hostname : 'mailient.xyz'}/invite/${username}`;

    const steps = [
        { icon: Link2, text: "Share your invite link", bold: "" },
        { icon: Sparkles, text: "They sign up and get ", bold: "extra 20 credits" },
        { icon: Zap, text: "You get ", bold: "50 credits", extra: " per signup, plus " },
        { icon: Zap, text: "Another ", bold: "100 credits", extra: " if they go Pro" },
    ];

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                className="w-full max-w-[480px] bg-white dark:bg-[#0E0E0E] rounded-[24px] shadow-[0_32px_128px_-12px_rgba(0,0,0,0.8)] overflow-hidden border border-neutral-200 dark:border-white/10 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Hero Section */}
                <div className="relative h-56 bg-neutral-50 dark:bg-[#0E0E0E] p-8 flex flex-col justify-end overflow-hidden group">
                    {/* Visual Element (Premium Glassy Cube) */}
                    <div className="absolute top-0 right-0 w-80 h-full pointer-events-none opacity-80 transition-transform duration-700 group-hover:scale-105">
                        <img 
                            src="/mailient_cube.png" 
                            className="w-full h-full object-cover scale-[1.7] translate-x-12 translate-y-2 rotate-[-12deg] brightness-110 dark:brightness-100"
                            style={{ 
                                maskImage: 'radial-gradient(circle at 65% 50%, black 10%, transparent 80%), linear-gradient(to right, transparent, black 40%)',
                                WebkitMaskImage: 'radial-gradient(circle at 65% 50%, black 10%, transparent 80%), linear-gradient(to right, transparent, black 40%)',
                                maskComposite: 'intersect',
                                WebkitMaskComposite: 'source-in'
                            }}
                            alt=""
                        />
                    </div>
                    
                    {/* Theme-aware overlay for text clarity */}
                    <div className="absolute inset-0 bg-gradient-to-r from-neutral-50 dark:from-[#0E0E0E] via-neutral-50/80 dark:via-[#0E0E0E]/80 to-transparent z-[5]" />

                    <div className="relative z-10 space-y-3">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 backdrop-blur-md">
                            <span className="text-[10px] font-bold text-neutral-600 dark:text-white tracking-widest uppercase opacity-80">Earn 50+ units</span>
                        </div>
                        <h2 className="text-4xl font-bold text-black dark:text-white tracking-tight leading-[1.1]">
                            Expand the<br />Network
                        </h2>
                        <p className="text-neutral-600 dark:text-white/40 text-sm font-medium">and earn free AI intelligence</p>
                    </div>

                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-neutral-200 dark:border-white/10 transition-all z-20"
                    >
                        <X className="w-4 h-4 text-black dark:text-white/60" />
                    </button>
                </div>

                {/* Content Section */}
                <div className="p-8 space-y-8">
                    <div className="space-y-6">
                        <h4 className="text-[11px] font-bold text-neutral-400 dark:text-white/30 tracking-[0.2em] uppercase">How it works:</h4>
                        
                        <div className="space-y-6">
                            {steps.map((step, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 * i }}
                                    className="flex items-start gap-4"
                                >
                                    <div className="mt-0.5 p-1 rounded-md bg-black/5 dark:bg-white/5 border border-neutral-200 dark:border-white/10">
                                        <step.icon className="w-3.5 h-3.5 text-black/70 dark:text-white/70" />
                                    </div>
                                    <p className="text-sm text-neutral-600 dark:text-white/60 leading-tight flex-1">
                                        {step.text}
                                        <span className="text-black dark:text-white font-bold ml-1">{step.bold}</span>
                                        {step.extra && <span className="text-neutral-400 dark:text-white/40 ml-1">{step.extra}</span>}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-200 dark:border-white/5 flex items-center justify-between">
                        <p className="text-[13px] font-medium text-neutral-500 dark:text-white/50">
                            <span className="text-black dark:text-white font-bold">{profile?.invite_count || 0}</span> signed up, <span className="text-black dark:text-white font-bold">{profile?.conversion_count || 0}</span> converted
                        </p>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-neutral-500 dark:text-white/40 uppercase tracking-tighter">Live Status</span>
                        </div>
                    </div>

                    {/* Copy Box */}
                    <div className="relative group">
                        <div className="flex h-12 bg-black/5 dark:bg-white/5 rounded-xl border border-neutral-200 dark:border-white/10 focus-within:border-black/20 dark:focus-within:border-white/20 transition-all p-1 shadow-inner">
                            <div className="flex-1 flex items-center px-4 gap-3 overflow-hidden">
                                <Link2 className="w-4 h-4 text-black/30 dark:text-white/30" />
                                <span className="text-xs text-neutral-500 dark:text-white/50 truncate font-mono tracking-tight">
                                    https://{referralUrl}
                                </span>
                            </div>
                            <button 
                                onClick={handleCopyLink}
                                className="px-6 h-full bg-black dark:bg-white text-white dark:text-[#0E0E0E] rounded-[10px] text-xs font-bold hover:bg-black/90 dark:hover:bg-neutral-200 transition-all shadow-lg active:scale-95 border-none"
                            >
                                {copied ? 'Copied' : 'Copy link'}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
