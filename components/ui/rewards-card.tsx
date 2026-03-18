'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Zap, Users, Sparkles, Mail, Share2, Copy, Check, ChevronRight, CreditCard, History } from 'lucide-react';
import { toast } from 'sonner';

interface RewardsCardProps {
    onClose: () => void;
    usageData: {
        planType: 'free' | 'starter' | 'pro' | 'none';
        features: Record<string, { usage: number; limit: number; remaining: number; isUnlimited: boolean; period: string }>;
    };
}

export function RewardsCard({ onClose, usageData }: RewardsCardProps) {
    const [activeSection, setActiveSection] = useState<'my-rewards' | 'earn' | 'referrals'>('my-rewards');
    const [copied, setCopied] = useState(false);

    const arcusCredits = usageData.features?.arcus_ai || { usage: 0, limit: 10, remaining: 10 };

    const handleCopyLink = () => {
        navigator.clipboard.writeText('https://mailient.xyz/ref/maulik_f5');
        setCopied(true);
        toast.success('Referral link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const navItems = [
        { id: 'my-rewards', label: 'My Rewards', icon: Gift },
        { id: 'earn', label: 'Earn Credits', icon: Zap },
        { id: 'referrals', label: 'Referrals', icon: Users },
    ];

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
                {/* Sidebar - Same style as Settings Card */}
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
                        <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-medium">Credits Available</p>
                        <p className="text-xl font-bold text-black dark:text-white mt-1">{arcusCredits.remaining}</p>
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
                                            { title: "Standard Credit Pack", type: "Active", value: `${arcusCredits.limit} Credits`, desc: "Your baseline daily allowance.", icon: CreditCard },
                                            { title: "Referral Bonus", type: "Ready to use", value: "+25 Credits", desc: "Earned from inviting a friend.", icon: Sparkles },
                                            { title: "Welcome Gift", type: "Used", value: "10 Credits", desc: "Initial account creation bonus.", icon: Gift },
                                        ].map((reward, i) => (
                                            <div key={i} className="p-5 border border-neutral-100 dark:border-white/5 rounded-xl hover:border-neutral-200 dark:hover:border-white/10 transition-all group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="w-10 h-10 bg-neutral-100 dark:bg-white/5 rounded-lg flex items-center justify-center">
                                                        <reward.icon className="w-5 h-5 text-neutral-500" />
                                                    </div>
                                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                                        reward.type === 'Active' ? 'bg-green-100 dark:bg-green-500/10 text-green-600' : 'bg-neutral-100 dark:bg-white/10 text-neutral-500'
                                                    }`}>
                                                        {reward.type}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">{reward.title}</h4>
                                                <p className="text-xl font-bold text-black dark:text-white mt-1 mb-2">{reward.value}</p>
                                                <p className="text-xs text-neutral-500">{reward.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'earn' && (
                                <motion.div 
                                    key="earn"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="space-y-4"
                                >
                                    {[
                                        { title: "Connect Two Accounts", reward: "+10 Daily Credits", action: "Link multiple Gmail accounts", icon: Mail },
                                        { title: "Daily Review", reward: "5 Bonus Credits", action: "Check your Sift insights every day", icon: History },
                                        { title: "Share Insight", reward: "24h Pro Power", action: "Post a productivity tip on Twitter/X", icon: Share2 },
                                    ].map((quest, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 border border-neutral-100 dark:border-white/5 rounded-xl hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-neutral-100 dark:bg-white/5 rounded-lg flex items-center justify-center">
                                                    <quest.icon className="w-5 h-5 text-neutral-500" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">{quest.title}</h4>
                                                    <p className="text-xs text-neutral-500">{quest.action}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs font-semibold text-neutral-400">{quest.reward}</span>
                                                <button className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-medium hover:opacity-80 transition-all">Start</button>
                                            </div>
                                        </div>
                                    ))}
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
                                            <h4 className="text-lg font-bold text-neutral-900 dark:text-white">Refer a friend</h4>
                                            <p className="text-sm text-neutral-500">Share Mailient with others and earn credits for every successful signup.</p>
                                        </div>

                                        <div className="p-4 bg-neutral-50 dark:bg-white/[0.02] border border-neutral-100 dark:border-white/5 rounded-xl space-y-4">
                                            <p className="text-[10px] text-neutral-400 uppercase font-medium">Your Invite Link</p>
                                            <div className="flex gap-2">
                                                <div className="flex-1 h-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-lg flex items-center px-4 text-xs text-neutral-500 truncate">
                                                    mailient.xyz/ref/maulik_f5
                                                </div>
                                                <button 
                                                    onClick={handleCopyLink}
                                                    className="w-10 h-10 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-all"
                                                >
                                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-neutral-100 dark:border-white/5">
                                            <div>
                                                <p className="text-[10px] text-neutral-400 uppercase font-medium mb-1">Total Referrals</p>
                                                <p className="text-3xl font-bold text-neutral-900 dark:text-white">12</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-neutral-400 uppercase font-medium mb-1">Bonus Credits</p>
                                                <p className="text-3xl font-bold text-neutral-900 dark:text-white">600</p>
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
