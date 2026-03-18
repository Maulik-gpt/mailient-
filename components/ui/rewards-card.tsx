'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Users, Sparkles, Copy, Check, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RewardsCardProps {
    onClose: () => void;
    usageData: {
        planType: 'free' | 'starter' | 'pro' | 'none';
        features: Record<string, { usage: number; limit: number; remaining: number; isUnlimited: boolean; period: string }>;
    };
}

export function RewardsCard({ onClose, usageData }: RewardsCardProps) {
    const [activeSection, setActiveSection] = useState<'my-rewards' | 'referrals'>('my-rewards');
    const [copied, setCopied] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [isClaiming, setIsClaiming] = useState<string | null>(null);

    const arcusCredits = usageData.features?.arcus_ai || { usage: 0, limit: 10, remaining: 10 };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/user/profile');
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                }
            } catch (err) {
                console.error('Error fetching profile in rewards:', err);
            }
        };
        fetchProfile();
    }, []);

    const handleCopyLink = () => {
        const username = profile?.username || 'maulik_f5';
        navigator.clipboard.writeText(`https://mailient.xyz/ref/${username}`);
        setCopied(true);
        toast.success('Referral link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClaim = async (rewardId: string) => {
        try {
            setIsClaiming(rewardId);
            const res = await fetch('/api/subscription/usage/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rewardId })
            });

            if (res.ok) {
                const result = await res.json();
                toast.success(result.message || 'Reward claimed successfully!');
                // Refresh profile to update claimed status
                const pRes = await fetch('/api/user/profile');
                if (pRes.ok) setProfile(await pRes.json());
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to claim reward');
            }
        } catch (err) {
            toast.error('An error occurred while claiming');
        } finally {
            setIsClaiming(null);
        }
    };

    const navItems = [
        { id: 'my-rewards', label: 'My Rewards', icon: Gift },
        { id: 'referrals', label: 'Referrals', icon: Users },
    ];

    const claimedRewards = profile?.preferences?.claimed_rewards || [];

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.98, opacity: 0 }}
                className="w-full max-w-4xl h-[70vh] bg-white dark:bg-[#0a0a0a] rounded-[16px] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] overflow-hidden flex border border-neutral-200 dark:border-white/5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Sidebar */}
                <div className="w-64 bg-neutral-50/50 dark:bg-white/[0.02] border-r border-neutral-100 dark:border-white/5 flex flex-col pt-8 pb-4">
                    <div className="px-6 mb-8 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-neutral-400" />
                        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Rewards</h2>
                    </div>

                    <nav className="flex-1 space-y-1 px-3">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id as any)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                                    activeSection === item.id 
                                    ? 'bg-neutral-100 dark:bg-white/10 text-black dark:text-white font-medium' 
                                    : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-white/5'
                                }`}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    <div className="mt-auto px-6 pt-6 border-t border-neutral-100 dark:border-white/5">
                        <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-medium">Daily Limit</p>
                        <p className="text-xl font-bold text-black dark:text-white mt-1">{arcusCredits.limit} Arcus</p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col bg-white dark:bg-[#0a0a0a]">
                    <header className="h-16 border-b border-neutral-100 dark:border-white/5 flex items-center justify-between px-8">
                        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                            {navItems.find(n => n.id === activeSection)?.label}
                        </h3>
                        <button 
                            onClick={onClose}
                            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-lg transition-all"
                        >
                            <X className="w-4 h-4 text-neutral-400" />
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeSection === 'my-rewards' && (
                                <motion.div 
                                    key="my-rewards"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="space-y-6"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { id: 'standard', title: "Standard Credit Pack", value: `Status: Active`, desc: "Your baseline daily allowance enabled by default.", icon: CreditCard, status: 'claimed' },
                                            { id: 'referral_bonus_25', title: "Referral Bonus", value: "+25 Arcus Credits", desc: "Permanent injection into your core daily limit.", icon: Sparkles, status: claimedRewards.includes('referral_bonus_25') ? 'claimed' : 'available' },
                                            { id: 'welcome_bonus_10', title: "Welcome Gift", value: "+10 Arcus Credits", desc: "First-time account creation gift.", icon: Gift, status: claimedRewards.includes('welcome_bonus_10') ? 'claimed' : 'available' },
                                        ].map((reward, i) => (
                                            <div key={i} className="p-5 border border-neutral-100 dark:border-white/5 rounded-xl transition-all group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="w-10 h-10 bg-neutral-100 dark:bg-white/5 rounded-lg flex items-center justify-center">
                                                        <reward.icon className="w-5 h-5 text-neutral-500" />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {reward.status === 'claimed' ? (
                                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/5 text-neutral-500 flex items-center gap-1">
                                                                <Check className="w-3 h-3" /> Claimed
                                                            </span>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleClaim(reward.id)}
                                                                disabled={isClaiming === reward.id}
                                                                className="text-[10px] font-semibold px-3 py-1 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-all flex items-center gap-1"
                                                            >
                                                                {isClaiming === reward.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                                Claim
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">{reward.title}</h4>
                                                <p className="text-lg font-bold text-black dark:text-white mt-1 mb-1">{reward.value}</p>
                                                <p className="text-xs text-neutral-500">{reward.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'referrals' && (
                                <motion.div 
                                    key="referrals"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="max-w-md"
                                >
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <h4 className="text-lg font-bold text-neutral-900 dark:text-white">Expand the Network</h4>
                                            <p className="text-sm text-neutral-500">Every successful referral injects 50 permanent credits into your account.</p>
                                        </div>

                                        <div className="p-4 bg-neutral-50 dark:bg-white/[0.02] border border-neutral-100 dark:border-white/5 rounded-xl space-y-4">
                                            <p className="text-[10px] text-neutral-400 uppercase font-medium">Your Invite Link</p>
                                            <div className="flex gap-2">
                                                <div className="flex-1 h-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-lg flex items-center px-4 text-xs text-neutral-500 truncate">
                                                    mailient.xyz/ref/{profile?.username || 'maulik_f5'}
                                                </div>
                                                <button 
                                                    onClick={handleCopyLink}
                                                    className="w-10 h-10 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-all border border-transparent shadow-sm"
                                                >
                                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-neutral-100 dark:border-white/5">
                                            <div>
                                                <p className="text-[10px] text-neutral-400 uppercase font-medium mb-1">Total Referrals</p>
                                                <p className="text-3xl font-bold text-neutral-900 dark:text-white">{profile?.invite_count || 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-neutral-400 uppercase font-medium mb-1">Bonus Credits</p>
                                                <p className="text-3xl font-bold text-neutral-900 dark:text-white">{(profile?.invite_count || 0) * 50}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
