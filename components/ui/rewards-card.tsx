'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Zap, Users, Sparkles, Shield, Mail, Share2, Copy, Check, ChevronRight, Activity, Cpu } from 'lucide-react';
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

    const planIndex = usageData.planType === 'pro' ? 2 : usageData.planType === 'starter' ? 1 : 0;

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/95 backdrop-blur-2xl"
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.99, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.99, opacity: 0, y: 15 }}
                className="w-full max-w-6xl h-[88vh] bg-white dark:bg-[#050505] rounded-[28px] shadow-[0_60px_180px_-30px_rgba(0,0,0,1)] overflow-hidden flex flex-col md:flex-row border border-neutral-100 dark:border-white/5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Visual Sidebar - Industrial Design */}
                <div className="w-full md:w-72 bg-neutral-50/40 dark:bg-[#030303] border-r border-neutral-100 dark:border-white/5 p-12 flex flex-col">
                    <div className="flex items-center gap-5 mb-16">
                        <div className="w-12 h-12 bg-black dark:bg-white rounded-2xl flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] dark:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.2)]">
                            <Cpu className="w-6 h-6 text-white dark:text-black" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black dark:text-white uppercase tracking-[0.3em] leading-none">CORE</h2>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1.5 opacity-60">Intelligence Hub</p>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-3">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id as any)}
                                className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all duration-500 group relative overflow-hidden ${
                                    activeSection === section.id 
                                    ? 'bg-black dark:bg-white text-white dark:text-black font-black shadow-2xl' 
                                    : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                                }`}
                            >
                                <div className="flex items-center gap-5 relative z-10">
                                    <section.icon className={`w-4 h-4 transition-transform duration-500 ${activeSection === section.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                                    <span className="text-xs font-bold uppercase tracking-widest">{section.label}</span>
                                </div>
                                <ChevronRight className={`w-4 h-4 transition-all duration-500 relative z-10 ${activeSection === section.id ? 'translate-x-0' : '-translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-40'}`} />
                                
                                {activeSection === section.id && (
                                    <motion.div layoutId="bg-pill" className="absolute inset-0 bg-black dark:bg-white -z-0" />
                                )}
                            </button>
                        ))}
                    </nav>

                    <div className="pt-12 mt-auto border-t border-neutral-100 dark:border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Node Load</p>
                            <span className="text-[9px] font-black uppercase text-black dark:text-white bg-black/5 dark:bg-white/10 px-3 py-1 rounded-full">
                                {usageData.planType === 'pro' ? 'Ultimate' : usageData.planType === 'starter' ? 'Advanced' : 'Baseline'}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-100 dark:bg-white/5 rounded-full overflow-hidden mb-4">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${arcusPercentage}%` }}
                                className="h-full bg-black dark:bg-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                            />
                        </div>
                        <div className="flex justify-between items-end">
                            <div className="space-y-0.5">
                                <p className="text-[11px] font-black dark:text-white">{arcusCredits.usage} <span className="text-neutral-500 font-bold">/ {arcusCredits.limit}</span></p>
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Global Sync</p>
                            </div>
                            <Activity className="w-4 h-4 text-neutral-200 dark:text-neutral-800" />
                        </div>
                    </div>
                </div>

                {/* Main Content - High Density Linear Design */}
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#050505]">
                    {/* Header: Plan Activation Timeline */}
                    <div className="h-28 border-b border-neutral-100 dark:border-white/5 flex items-center px-16 relative overflow-hidden">
                        <div className="flex items-center w-full max-w-2xl gap-8">
                            <div className="flex-1 relative h-0.5 bg-neutral-100 dark:bg-neutral-900 rounded-full">
                                {/* Trackers */}
                                <div className="absolute top-1/2 left-0 -translate-y-1/2 flex justify-between w-full">
                                    {['Standard', 'Starter', 'Pro'].map((tier, i) => (
                                        <div key={tier} className="relative flex flex-col items-center">
                                            <div className={`w-3 h-3 rounded-full border-2 transition-all duration-700 ${
                                                i <= planIndex 
                                                ? 'bg-black dark:bg-white border-black dark:border-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.5)]' 
                                                : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 scale-100'
                                            }`} />
                                            <span className={`absolute top-6 whitespace-nowrap text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${
                                                i <= planIndex ? 'text-black dark:text-white' : 'text-neutral-300 dark:text-neutral-700'
                                            }`}>{tier}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Active Line */}
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(planIndex / 2) * 100}%` }}
                                    className="absolute inset-y-0 left-0 bg-black dark:bg-white shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                                />
                            </div>
                        </div>

                        <div className="ml-auto flex items-center gap-8">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-neutral-300 dark:text-neutral-700 uppercase tracking-[0.3em] mb-1">Status</p>
                                <p className="text-xs font-black dark:text-white uppercase tracking-widest">{usageData.planType === 'pro' ? 'FULLY SYNCED' : 'NODE ACTIVE'}</p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-12 h-12 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-white/[0.03] rounded-2xl transition-all active:scale-90 group border border-transparent hover:border-neutral-100 dark:hover:border-white/10"
                            >
                                <X className="w-5 h-5 text-neutral-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-16 md:p-20 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeSection === 'vault' && (
                                <motion.div 
                                    key="vault"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -30 }}
                                    className="space-y-20"
                                >
                                    <div className="max-w-2xl border-l-[3px] border-black dark:border-white pl-10 py-2">
                                        <h4 className="text-7xl font-black dark:text-white tracking-tighter mb-8 leading-[0.85]">Intelligence <br/> synchronization.</h4>
                                        <p className="text-neutral-400 text-xl leading-relaxed font-bold uppercase tracking-tight opacity-80">Connected nodes: 08 | Global uptime: 99.9%</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1px bg-neutral-100 dark:bg-white/5 border border-neutral-100 dark:border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
                                        {[
                                            { title: "Network Node", type: "BASELINE", value: `+${arcusCredits.limit}`, desc: "Permanent intelligence expansion mapped to core.", icon: Users, status: "Active" },
                                            { title: "Current Flow", type: "UNITS", value: `${arcusCredits.remaining}`, desc: "Available operational cycles in current window.", icon: Sparkles, status: "Active" },
                                            { title: "Velocity Lock", type: "ACCELERATOR", value: "Pro Sift", desc: "Priority node processing for deep research.", icon: Zap, status: "Ready" }
                                        ].map((reward, i) => (
                                            <div 
                                                key={i} 
                                                className="group relative p-12 bg-white dark:bg-[#050505] transition-all duration-700 hover:bg-neutral-50 dark:hover:bg-white/[0.02]"
                                            >
                                                <div className="flex justify-between items-start mb-12">
                                                    <div className="p-5 rounded-3xl bg-black dark:bg-white text-white dark:text-black shadow-2xl group-hover:scale-110 transition-all duration-500">
                                                        <reward.icon className="w-6 h-6" />
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        reward.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-black dark:bg-white text-white dark:text-black'
                                                    }`}>
                                                        {reward.status}
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-3 mb-12">
                                                    <p className="text-[10px] font-black text-neutral-300 dark:text-neutral-700 uppercase tracking-[0.4em]">{reward.type}</p>
                                                    <h5 className="text-3xl font-black dark:text-white tracking-tighter leading-none">{reward.title}</h5>
                                                </div>

                                                <div className="mb-10">
                                                    <span className="text-5xl font-black dark:text-white tracking-tighter tabular-nums">{reward.value}</span>
                                                </div>

                                                <p className="text-[11px] text-neutral-500 leading-relaxed font-bold uppercase tracking-widest">{reward.desc}</p>
                                                
                                                {/* Apple-esque Linear Accents */}
                                                <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-black dark:bg-white transition-all duration-1000 group-hover:w-full opacity-40" />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Card - Perfectly fitted with Plan Activation */}
                                    {usageData.planType !== 'pro' && (
                                        <div className="p-12 rounded-[40px] bg-neutral-50 dark:bg-white/[0.02] border border-neutral-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-12 group hover:border-black dark:hover:border-white transition-all duration-1000 shadow-2xl">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-ping" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-400">Next Synchronization</span>
                                                </div>
                                                <h5 className="text-5xl font-black dark:text-white tracking-tighter leading-none">Unlock Pro Node.</h5>
                                                <p className="text-neutral-500 text-lg font-bold">Remove all daily operational caps and enable Unlimited Arcus flow.</p>
                                            </div>
                                            <button className="h-20 px-12 bg-black dark:bg-white text-white dark:text-black rounded-3xl text-sm font-black uppercase tracking-[0.3em] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] dark:shadow-[0_20px_60px_-15px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all duration-500">
                                                Activate Plan
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeSection === 'quests' && (
                                <motion.div 
                                    key="quests"
                                    initial={{ opacity: 0, x: 40 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -40 }}
                                    className="space-y-20"
                                >
                                    <div className="max-w-2xl border-l-[3px] border-black dark:border-white pl-10 py-2">
                                        <h4 className="text-7xl font-black dark:text-white tracking-tighter mb-8 leading-[0.85]">Mission <br/> objectives.</h4>
                                        <p className="text-neutral-400 text-xl leading-relaxed font-bold uppercase tracking-tight opacity-80">Pending sync tasks: 04 | Available units: 1,200</p>
                                    </div>

                                    <div className="space-y-4">
                                        {[
                                            { title: "Linked Node", reward: "+10 Sync Cap", action: "Integrate 2+ Gmail accounts", icon: Mail, progress: 50 },
                                            { title: "Network Expansion", reward: "50 Arcus Units", action: "Refer a new signal provider", icon: Share2, progress: 0 },
                                            { title: "Global Insight", reward: "24h Pro Power", action: "Share your signal with the network", icon: Share2, progress: 100 },
                                            { title: "Deep Researcher", reward: "10 Arcus Units", action: "Execute 10 complex sifts", icon: Sparkles, progress: 30 }
                                        ].map((quest, i) => (
                                            <div key={i} className="flex items-center justify-between p-12 rounded-[32px] border border-neutral-100 dark:border-white/5 bg-neutral-50/20 dark:bg-white/[0.01] hover:bg-neutral-100 dark:hover:bg-white/[0.03] transition-all duration-700 group">
                                                <div className="flex items-center gap-12">
                                                    <div className="p-5 bg-black dark:bg-white rounded-[24px] group-hover:rotate-12 transition-all duration-700 shadow-2xl">
                                                        <quest.icon className="w-6 h-6 text-white dark:text-black" />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-black text-2xl dark:text-white tracking-tighter leading-none mb-3">{quest.title}</h5>
                                                        <div className="flex items-center gap-6">
                                                            <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em]">{quest.action}</p>
                                                            <div className="h-1 w-32 bg-neutral-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                                <motion.div 
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${quest.progress}%` }}
                                                                    className="h-full bg-black dark:bg-white" 
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-12">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-neutral-300 dark:text-neutral-700 uppercase tracking-[0.3em] mb-1">Payload</p>
                                                        <p className="text-sm font-black dark:text-white uppercase tracking-widest">{quest.reward}</p>
                                                    </div>
                                                    <button className="h-16 px-10 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-2xl hover:opacity-80 active:scale-95 transition-all duration-500">
                                                        {quest.progress === 100 ? 'CLAIM' : 'SYNC'}
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
                                    initial={{ opacity: 0, x: 40 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -40 }}
                                    className="max-w-4xl"
                                >
                                    <div className="space-y-20">
                                        <div className="max-w-2xl border-l-[3px] border-black dark:border-white pl-10 py-2">
                                            <h4 className="text-7xl font-black dark:text-white tracking-tighter mb-8 leading-[0.85]">Amplify the <br/> Signal.</h4>
                                            <p className="text-neutral-400 text-xl leading-relaxed font-bold uppercase tracking-tight opacity-80">Sync referrals: 12 | Bonus units: 600</p>
                                        </div>

                                        <div className="space-y-8">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-400">Your Communication Node</p>
                                                <div className="h-px flex-1 mx-10 bg-neutral-100 dark:bg-white/5" />
                                            </div>
                                            <div className="flex gap-6">
                                                <div className="flex-1 h-24 bg-neutral-50/50 dark:bg-white/[0.01] border border-neutral-100 dark:border-white/5 rounded-3xl flex items-center px-12 font-black text-xl text-neutral-600 dark:text-neutral-300 shadow-inner group-hover:border-black transition-all">
                                                    mailient.xyz/ref/maulik_f5
                                                </div>
                                                <button 
                                                    onClick={handleCopyLink}
                                                    className="w-24 h-24 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] dark:shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all duration-500 group"
                                                >
                                                    {copied ? <Check className="w-10 h-10" /> : <Copy className="w-10 h-10 group-hover:rotate-12 transition-transform duration-500" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-px bg-neutral-100 dark:bg-white/5 border border-neutral-100 dark:border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                                            <div className="p-16 bg-white dark:bg-[#050505] space-y-8">
                                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-400">Total Syncs</p>
                                                <p className="text-8xl font-black dark:text-white tracking-tighter tabular-nums">12</p>
                                                <div className="h-2 w-full bg-neutral-100 dark:bg-white/5 rounded-full relative overflow-hidden">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: '60%' }}
                                                        className="absolute inset-y-0 left-0 bg-black dark:bg-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                                                    />
                                                </div>
                                            </div>
                                            <div className="p-16 bg-white dark:bg-[#050505] space-y-8 border-l border-neutral-100 dark:border-white/5">
                                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-400">Yield Capacity</p>
                                                <p className="text-8xl font-black dark:text-white tracking-tighter tabular-nums opacity-20">+600</p>
                                                <p className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.2em] leading-none">Intelligence Multiplier Active</p>
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
