'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Zap, Users, Sparkles, TrendingUp, Shield, Mail, Share2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface RewardsCardProps {
    onClose: () => void;
}

export function RewardsCard({ onClose }: RewardsCardProps) {
    const [activeSection, setActiveSection] = useState<'vault' | 'quests' | 'referrals'>('vault');
    const [copied, setCopied] = useState(false);

    const handleCopyLink = () => {
        navigator.clipboard.writeText('https://mailient.xyz/ref/maulik_f5');
        setCopied(true);
        toast.success('Referral link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const sections = [
        { id: 'vault', label: 'Vault', icon: Shield },
        { id: 'quests', label: 'Quests', icon: Zap },
        { id: 'referrals', label: 'Referrals', icon: Users },
    ];

    const activeRewards = [
        { title: "Network Node", type: "Permanent Cap", value: "+50 Arcus", desc: "Added to your monthly baseline credits.", icon: Users, status: "Active" },
        { title: "Velocity Token", type: "One-Time", value: "x2 Sift Speed", desc: "Priority processing for 48 hours.", icon: Zap, status: "Ready" },
        { title: "Sifter's Spark", type: "One-Time", value: "25 Credits", desc: "Welcome bonus for new intelligence.", icon: Sparkles, status: "Claimed" }
    ];

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.98, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.98, opacity: 0, y: 10 }}
                className="w-full max-w-5xl h-[85vh] bg-white dark:bg-[#0A0A0A] rounded-[16px] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row border border-neutral-200 dark:border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-neutral-50 dark:bg-[#070707] border-r border-neutral-100 dark:border-white/5 p-8 flex flex-col">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-8 h-8 bg-black dark:bg-white rounded flex items-center justify-center">
                            <Gift className="w-4 h-4 text-white dark:text-black" />
                        </div>
                        <h2 className="text-lg font-bold dark:text-white uppercase tracking-tighter">Vault</h2>
                    </div>

                    <nav className="flex-1 space-y-1">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                                    activeSection === section.id 
                                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg font-bold' 
                                    : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                            >
                                <section.icon className="w-4 h-4" />
                                <span className="text-sm">{section.label}</span>
                            </button>
                        ))}
                    </nav>

                    <div className="pt-8 mt-auto border-t border-neutral-100 dark:border-white/5">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Inventory Status</p>
                        <p className="text-sm font-bold dark:text-white mt-1">3/15 Rewards Claimed</p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0A0A0A]">
                    <header className="h-20 border-b border-neutral-100 dark:border-white/5 flex items-center justify-between px-10">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400">
                            {sections.find(s => s.id === activeSection)?.label}
                        </h3>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-neutral-400 hover:text-black dark:hover:text-white" />
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeSection === 'vault' && (
                                <motion.div 
                                    key="vault"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-12"
                                >
                                    <div>
                                        <h4 className="text-4xl font-bold dark:text-white tracking-tighter mb-4">Your Intelligence Wallet.</h4>
                                        <p className="text-neutral-500 text-lg leading-relaxed max-w-xl">Active boosts and permanent cap increases earned through growth.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {activeRewards.map((reward, i) => (
                                            <div 
                                                key={i} 
                                                className="group relative p-8 rounded-2xl border border-neutral-100 dark:border-white/5 transition-all duration-500 hover:border-black dark:hover:border-white hover:-translate-y-1 overflow-hidden"
                                            >
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className={`p-3 rounded-xl bg-neutral-100 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 transition-colors group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black`}>
                                                        <reward.icon className="w-5 h-5" />
                                                    </div>
                                                    <span className={`text-[10px] font-bold font-mono tracking-widest uppercase px-2 py-1 rounded-md ${
                                                        reward.status === 'Active' ? 'bg-green-500/10 text-green-500' : 
                                                        reward.status === 'Ready' ? 'bg-black dark:bg-white text-white dark:text-black' :
                                                        'bg-neutral-100 dark:bg-white/5 text-neutral-400'
                                                    }`}>
                                                        {reward.status}
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-1 mb-8">
                                                    <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest">{reward.type}</p>
                                                    <h5 className="text-2xl font-bold dark:text-white tracking-tight">{reward.title}</h5>
                                                </div>

                                                <div className="mb-8">
                                                    <span className="text-3xl font-black dark:text-neutral-200 tracking-tighter">{reward.value}</span>
                                                </div>

                                                <p className="text-sm text-neutral-500 leading-relaxed">{reward.desc}</p>
                                                
                                                {/* Hover Glow Effect */}
                                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-black/5 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'quests' && (
                                <motion.div 
                                    key="quests"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-12"
                                >
                                    <div>
                                        <h4 className="text-4xl font-bold dark:text-white tracking-tighter mb-4">Unearned Intelligence.</h4>
                                        <p className="text-neutral-500 text-lg leading-relaxed max-w-xl">Complete key milestones to expand your system's operational capacity.</p>
                                    </div>

                                    <div className="space-y-4">
                                        {[
                                            { title: "Linked Intelligence", reward: "+10 Sift Capacity", action: "Link 2+ Gmail accounts", icon: Mail },
                                            { title: "Network Expansion", reward: "50 Arcus Credits", action: "Refer a new Sifter", icon: Share2 },
                                            { title: "Social Node", reward: "24h Pro Sift", action: "Share an insight to X", icon: Share2 },
                                            { title: "Deep Sifter", reward: "10 Arcus Credits", action: "Run 5 deep research tasks", icon: Sparkles }
                                        ].map((quest, i) => (
                                            <div key={i} className="flex items-center justify-between p-8 rounded-2xl border border-neutral-100 dark:border-white/5 group hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-all">
                                                <div className="flex items-center gap-6">
                                                    <div className="p-3 bg-neutral-100 dark:bg-white/5 rounded-xl group-hover:scale-110 transition-transform">
                                                        <quest.icon className="w-5 h-5 text-neutral-400 group-hover:text-black dark:group-hover:text-white" />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-lg dark:text-white tracking-tight">{quest.title}</h5>
                                                        <p className="text-sm text-neutral-500">{quest.action}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <span className="text-sm font-mono font-bold text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors">{quest.reward}</span>
                                                    <button className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-80 active:scale-95 transition-all">Start</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'referrals' && (
                                <motion.div 
                                    key="referrals"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="max-w-3xl"
                                >
                                    <div className="space-y-12">
                                        <div>
                                            <h4 className="text-5xl font-bold dark:text-white tracking-tighter mb-6 leading-none">Share the signal.</h4>
                                            <p className="text-neutral-500 text-xl leading-relaxed">
                                                When a friend joins Mailient using your link, we add <strong className="text-black dark:text-white">50 permanent Arcus credits</strong> to your monthly baseline. They start with a 25 credit welcome bonus.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">Your Unique Node Link</p>
                                            <div className="flex gap-2">
                                                <div className="flex-1 h-16 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl flex items-center px-6 font-mono text-neutral-500 dark:text-neutral-400">
                                                    mailient.xyz/ref/maulik_f5
                                                </div>
                                                <button 
                                                    onClick={handleCopyLink}
                                                    className="w-16 h-16 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 active:scale-95 transition-all"
                                                >
                                                    {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-12 pt-12 border-t border-neutral-100 dark:border-white/5">
                                            <div>
                                                <p className="text-xs font-mono uppercase tracking-widest text-neutral-400 mb-2">Total Referrals</p>
                                                <p className="text-5xl font-bold dark:text-white tracking-tighter">12</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-mono uppercase tracking-widest text-neutral-400 mb-2">Lifetime Bonus Credits</p>
                                                <p className="text-5xl font-bold dark:text-white tracking-tighter">+600</p>
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
