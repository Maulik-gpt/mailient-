'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Zap, Users, Sparkles, Shield, Mail, Share2, Copy, Check, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface RewardsCardProps {
    onClose: () => void;
    usageData: {
        planType: 'free' | 'starter' | 'pro' | 'none';
        features: Record<string, { usage: number; limit: number; remaining: number; isUnlimited: boolean; period: string }>;
    };
}

export function RewardsCard({ onClose, usageData }: RewardsCardProps) {
    const [activeSection, setActiveSection] = useState<'vault' | 'quests' | 'referrals'>('vault');
    const [copied, setCopied] = useState(false);

    const arcusCredits = usageData.features?.arcus_ai || { usage: 0, limit: 10, remaining: 10 };
    const arcusPercentage = Math.min((arcusCredits.usage / arcusCredits.limit) * 100, 100);

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

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/90 backdrop-blur-xl"
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.99, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.99, opacity: 0, y: 10 }}
                className="w-full max-w-5xl h-[85vh] bg-white dark:bg-[#080808] rounded-[24px] shadow-[0_40px_140px_-20px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row border border-neutral-100 dark:border-white/5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-neutral-50/50 dark:bg-[#050505] border-r border-neutral-100 dark:border-white/5 p-10 flex flex-col">
                    <div className="flex items-center gap-4 mb-14">
                        <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center shadow-2xl">
                            <Gift className="w-5 h-5 text-white dark:text-black" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black dark:text-white uppercase tracking-[0.2em]">Intelligence</h2>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Inventory</p>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-2">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id as any)}
                                className={`w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all duration-300 group ${
                                    activeSection === section.id 
                                    ? 'bg-black dark:bg-white text-white dark:text-black font-bold shadow-2xl' 
                                    : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <section.icon className="w-4 h-4" />
                                    <span className="text-sm tracking-tight">{section.label}</span>
                                </div>
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${activeSection === section.id ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-40'}`} />
                            </button>
                        ))}
                    </nav>

                    <div className="pt-10 mt-auto border-t border-neutral-100 dark:border-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">System Level</p>
                            <span className="text-[10px] font-black uppercase text-black dark:text-white bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full">
                                {usageData.planType === 'pro' ? 'Ultimate' : usageData.planType === 'starter' ? 'Advanced' : 'Standard'}
                            </span>
                        </div>
                        <div className="h-1 w-full bg-neutral-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${arcusPercentage}%` }}
                                className="h-full bg-black dark:bg-white"
                            />
                        </div>
                        <p className="text-[11px] font-medium text-neutral-500 mt-3 flex justify-between">
                            <span>{arcusCredits.usage} / {arcusCredits.limit} Credits</span>
                            <span>{100 - Math.round(arcusPercentage)}% Left</span>
                        </p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#080808]">
                    <header className="h-24 border-b border-neutral-100 dark:border-white/5 flex items-center justify-between px-12">
                        <div className="flex items-center gap-6">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-neutral-300 dark:text-neutral-700">
                                {sections.find(s => s.id === activeSection)?.label}
                            </h3>
                            <div className="h-4 w-[1px] bg-neutral-100 dark:bg-neutral-800" />
                            <p className="text-xs font-bold text-neutral-400">Node Management Hub</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-white/5 rounded-full transition-all active:scale-95 group"
                        >
                            <X className="w-5 h-5 text-neutral-300 group-hover:text-black dark:group-hover:text-white" />
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-16 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeSection === 'vault' && (
                                <motion.div 
                                    key="vault"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-16"
                                >
                                    <div className="max-w-xl">
                                        <h4 className="text-6xl font-black dark:text-white tracking-tighter mb-6 leading-[0.9]">The Signal Vault.</h4>
                                        <p className="text-neutral-500 text-lg leading-relaxed font-medium">Your active intelligence multipliers and resource injectors, synchronized across all nodes.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
                                        {[
                                            { title: "Network Node", type: "Baseline", value: `+${arcusCredits.limit}`, desc: "Permanent intelligence expansion.", icon: Users, status: "Active" },
                                            { title: "Current Flow", type: "Units", value: `${arcusCredits.remaining}`, desc: "Available operational credits.", icon: Sparkles, status: "Active" },
                                            { title: "Velocity Lock", type: "Accelerator", value: "Pro Sift", desc: "Priority processing priority.", icon: Zap, status: "Ready" }
                                        ].map((reward, i) => (
                                            <div 
                                                key={i} 
                                                className="group relative p-10 rounded-3xl border border-neutral-100 dark:border-white/5 transition-all duration-700 hover:border-black dark:hover:border-white hover:shadow-2xl hover:-translate-y-2 bg-[#0A0A0A]/2 dark:hover:bg-white/[0.01]"
                                            >
                                                <div className="flex justify-between items-start mb-10">
                                                    <div className="p-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black shadow-xl group-hover:scale-110 transition-transform">
                                                        <reward.icon className="w-5 h-5" />
                                                    </div>
                                                    <div className={`h-2 w-2 rounded-full ${reward.status === 'Active' ? 'bg-green-500 animate-pulse' : reward.status === 'Ready' ? 'bg-black dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-800'}`} />
                                                </div>
                                                
                                                <div className="space-y-2 mb-10">
                                                    <p className="text-[10px] font-black text-neutral-300 dark:text-neutral-700 uppercase tracking-[0.2em]">{reward.type}</p>
                                                    <h5 className="text-2xl font-bold dark:text-white tracking-tighter">{reward.title}</h5>
                                                </div>

                                                <div className="flex items-baseline gap-2 mb-8">
                                                    <span className="text-4xl font-black dark:text-white tracking-tighter italic">{reward.value}</span>
                                                </div>

                                                <p className="text-xs text-neutral-500 leading-relaxed font-bold uppercase tracking-wider">{reward.desc}</p>
                                                
                                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Shield className="w-4 h-4 text-neutral-200 dark:text-neutral-800" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'quests' && (
                                <motion.div 
                                    key="quests"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-16"
                                >
                                    <div className="max-w-xl">
                                        <h4 className="text-6xl font-black dark:text-white tracking-tighter mb-6 leading-[0.9]">Growth Quests.</h4>
                                        <p className="text-neutral-500 text-lg leading-relaxed font-medium">Expand your system borders by completing mission-critical node integrations.</p>
                                    </div>

                                    <div className="space-y-6">
                                        {[
                                            { title: "Linked Intelligence", reward: "+10 Sift Units", action: "Link 2+ Gmail accounts", icon: Mail, progress: 50 },
                                            { title: "Network Expansion", reward: "50 Arcus Credits", action: "Refer a new Sifter", icon: Share2, progress: 0 },
                                            { title: "Social Feedback", reward: "24h Pro Power", action: "Share an insight to X", icon: Share2, progress: 100 },
                                            { title: "High Usage", reward: "10 Arcus Credits", action: "Run 10 deep research tasks", icon: Sparkles, progress: 30 }
                                        ].map((quest, i) => (
                                            <div key={i} className="flex items-center justify-between p-10 rounded-3xl border border-neutral-100 dark:border-white/5 bg-neutral-50/30 dark:bg-white/[0.01] hover:bg-neutral-100 dark:hover:bg-white/[0.02] transition-all group">
                                                <div className="flex items-center gap-10">
                                                    <div className="p-4 bg-black dark:bg-white rounded-2xl group-hover:rotate-12 transition-transform shadow-xl">
                                                        <quest.icon className="w-5 h-5 text-white dark:text-black" />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-black text-xl dark:text-white tracking-tighter">{quest.title}</h5>
                                                        <div className="flex items-center gap-4 mt-1">
                                                            <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">{quest.action}</p>
                                                            <div className="h-1 w-24 bg-neutral-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                                <div className="h-full bg-black dark:bg-white" style={{ width: `${quest.progress}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-10">
                                                    <span className="text-xs font-black text-black dark:text-white uppercase tracking-widest bg-black/5 dark:bg-white/10 px-4 py-2 rounded-full">{quest.reward}</span>
                                                    <button className="h-14 px-8 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-2xl hover:opacity-80 active:scale-95 transition-all">
                                                        {quest.progress === 100 ? 'Claim' : 'Sync'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'referrals' && (
                                <motion.div 
                                    key="referrals"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="max-w-3xl"
                                >
                                    <div className="space-y-16">
                                        <div className="max-w-xl">
                                            <h4 className="text-7xl font-black dark:text-white tracking-tighter mb-8 leading-[0.8]">Amplify the Signal.</h4>
                                            <p className="text-neutral-500 text-xl leading-relaxed font-medium">
                                                Every node you invite strengthens the network. Earn <strong className="text-black dark:text-white">50 permanent Arcus credits</strong> per successful sync.
                                            </p>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Your Intelligence Node Link</p>
                                                <div className="h-[1px] flex-1 mx-6 bg-neutral-100 dark:bg-white/5" />
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex-1 h-20 bg-neutral-50/50 dark:bg-white/[0.01] border border-neutral-100 dark:border-white/5 rounded-2xl flex items-center px-10 font-bold text-lg text-neutral-600 dark:text-neutral-300 shadow-inner">
                                                    mailient.xyz/ref/maulik_f5
                                                </div>
                                                <button 
                                                    onClick={handleCopyLink}
                                                    className="w-20 h-20 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-2xl shadow-2xl hover:opacity-90 active:scale-95 transition-all group"
                                                >
                                                    {copied ? <Check className="w-8 h-8" /> : <Copy className="w-8 h-8 group-hover:rotate-12 transition-transform" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-20 pt-20 border-t border-neutral-100 dark:border-white/5">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-6">Nodes Synced</p>
                                                <p className="text-7xl font-black dark:text-white tracking-tighter">12</p>
                                                <div className="h-1 w-full bg-neutral-100 dark:bg-white/5 mt-8 rounded-full">
                                                    <div className="h-full bg-black dark:bg-white" style={{ width: '60%' }} />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-6">Bonus Capacity</p>
                                                <p className="text-7xl font-black dark:text-white tracking-tighter text-neutral-300 dark:text-neutral-700">+600</p>
                                                <p className="text-xs font-bold text-neutral-500 mt-8 uppercase tracking-widest leading-none">Intelligence Multiplier Active</p>
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
