'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    Download, 
    CreditCard, 
    History, 
    ExternalLink, 
    ArrowRight, 
    ShieldCheck, 
    Zap,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Cpu
} from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';

interface SubscriptionManagerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
}

export function SubscriptionManagerDialog({ isOpen, onClose, data }: SubscriptionManagerDialogProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'usage'>('overview');

    if (!isOpen) return null;

    const planName = data?.planType === 'pro' ? 'Pro' : data?.planType === 'starter' ? 'Starter' : 'Free';
    const isPro = data?.planType === 'pro';
    const isStarter = data?.planType === 'starter';
    const isFree = !isPro && !isStarter;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl bg-[#0A0A0A] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-white/[0.02] to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-serif text-2xl font-bold">
                            M
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif text-white">Billing & Subscription</h2>
                            <p className="text-sm text-neutral-500">Manage your plan, invoices, and AI usage</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-neutral-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Nav */}
                    <div className="w-64 border-r border-white/5 p-6 space-y-2">
                        <button 
                            onClick={() => setActiveTab('overview')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                activeTab === 'overview' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <ShieldCheck className="w-5 h-5" />
                            <span className="font-medium">Overview</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('billing')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                activeTab === 'billing' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <History className="w-5 h-5" />
                            <span className="font-medium">History</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('usage')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                activeTab === 'usage' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Zap className="w-5 h-5" />
                            <span className="font-medium">AI Metrics</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeTab === 'overview' && (
                                <motion.div 
                                    key="overview"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    {/* Plan Status Card */}
                                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
                                        
                                        <div className="flex justify-between items-start relative z-10">
                                            <div className="space-y-4">
                                                <Badge variant="outline" className="bg-white/5 border-white/10 text-white px-3 py-1 rounded-full capitalize">
                                                    {planName} Plan
                                                </Badge>
                                                <div>
                                                    <h3 className="text-4xl font-serif text-white">
                                                        {isFree ? 'Growth Starts Here' : isStarter ? '$7.99 / mo' : '$29.99 / mo'}
                                                    </h3>
                                                    <p className="text-neutral-500 mt-2">
                                                        {data?.subscriptionEndsAt 
                                                            ? `Next renewal on ${formatDate(data.subscriptionEndsAt)}`
                                                            : 'Lifetime free access to core AI features'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="outline" 
                                                className="bg-white text-black hover:bg-neutral-200 border-none rounded-2xl px-6 h-12 font-bold"
                                                onClick={() => window.open('https://polar.sh/dashboard', '_blank')}
                                            >
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                Polar portal
                                            </Button>
                                        </div>

                                        <div className="mt-8 grid grid-cols-3 gap-4 relative z-10">
                                            <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                                                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Status</p>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${data?.hasActiveSubscription ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'}`} />
                                                    <span className="text-white font-medium capitalize">{data?.hasActiveSubscription ? 'Active' : 'Inactive'}</span>
                                                </div>
                                            </div>
                                            <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                                                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Payment</p>
                                                <div className="flex items-center gap-2 text-white font-medium">
                                                    <CreditCard className="w-4 h-4 text-neutral-500" />
                                                    <span>**** 4242</span>
                                                </div>
                                            </div>
                                            <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                                                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Currency</p>
                                                <span className="text-white font-medium">USD ($)</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Current Credits */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest pl-1">Wallet Snapshot</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-neutral-500 mb-1">Arcus Credits</p>
                                                    <p className="text-3xl font-serif text-white">{data?.features?.arcus_ai?.remaining || 0}</p>
                                                </div>
                                                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                                </div>
                                            </div>
                                            <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-neutral-500 mb-1">Deep Sifts Left</p>
                                                    <p className="text-3xl font-serif text-white">{data?.features?.sift_analysis?.remaining || 0}</p>
                                                </div>
                                                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                                                    <ShieldCheck className="w-6 h-6 text-blue-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'billing' && (
                                <motion.div 
                                    key="billing"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-6">
                                        <h4 className="text-xl font-serif text-white">Payment History</h4>
                                        <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-white/[0.02] border-b border-white/5">
                                                    <tr>
                                                        <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Reference</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Date</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Amount</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {(data?.invoices || []).map((invoice: any) => (
                                                        <tr key={invoice.id} className="hover:bg-white/[0.02] transition-colors">
                                                            <td className="px-6 py-4">
                                                                <span className="text-[13px] font-mono text-white">{invoice.number}</span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-[13px] text-neutral-400">{formatDate(invoice.date)}</span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-[13px] font-medium text-white">{formatCurrency(invoice.amount)}</span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                                                    <span className="text-[12px] text-emerald-500 capitalize">{invoice.status}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button className="p-2 hover:bg-white/5 rounded-lg text-neutral-400 hover:text-white transition-all">
                                                                    <Download className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!data?.invoices || data.invoices.length === 0) && (
                                                        <tr>
                                                            <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 text-sm">
                                                                No transactions found yet
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-4">
                                        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
                                        <p className="text-xs text-blue-200/70 leading-relaxed">
                                            For security reasons, we do not store full payment details. You can manage your payment methods and billing address directly through our verified payment partner, <strong>Polar</strong>.
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'usage' && (
                                <motion.div 
                                    key="usage"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-6">
                                        <h4 className="text-xl font-serif text-white">AI Consumption Details</h4>
                                        <div className="bg-[#141414] border border-white/5 rounded-[32px] p-8 space-y-10">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                                        <Cpu className="w-7 h-7 text-neutral-400" />
                                                    </div>
                                                    <div>
                                                        <h5 className="text-lg font-medium text-white">OpenAI Native Usage</h5>
                                                        <p className="text-sm text-neutral-500">Resource tokens consumed by your Arcus agent</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-serif text-white">
                                                        {(data?.features?.openai_tokens?.usage || 0).toLocaleString()} <span className="text-sm text-neutral-500 font-sans">tokens</span>
                                                    </p>
                                                    <p className="text-xs text-neutral-500 mt-1">Total session compute</p>
                                                </div>
                                            </div>

                                            <div className="h-px bg-white/5" />

                                            <div className="space-y-6">
                                                <div>
                                                    <div className="flex justify-between items-end mb-2">
                                                        <span className="text-sm text-neutral-400">Monthly Quote Progress</span>
                                                        <span className="text-sm text-white font-medium">
                                                            {isPro ? 'Unlimited' : `${Math.round(((data?.features?.openai_tokens?.usage || 0) / (data?.features?.openai_tokens?.limit || 50000)) * 100)}%`}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: isPro ? '100%' : `${Math.min(100, ((data?.features?.openai_tokens?.usage || 0) / (data?.features?.openai_tokens?.limit || 50000)) * 100)}%` }}
                                                            className={`h-full ${isPro ? 'bg-emerald-500' : 'bg-white'}`}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-8 pt-4">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Model Cluster</p>
                                                        <p className="text-[15px] text-white">OpenRouter / OpenAI Hybrid</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Active API Key</p>
                                                        <p className="text-[15px] text-white">••••••••••••••••</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-8 flex flex-col items-center text-center gap-4">
                                        <Badge className="bg-blue-500/10 text-blue-400 border-none px-4 py-1">Feature coming soon</Badge>
                                        <h5 className="text-lg text-white font-serif">Bring your own API Key</h5>
                                        <p className="text-sm text-neutral-500 max-w-sm">
                                            Soon you will be able to connect your own OpenAI or Anthropic keys for unlimited use at cost.
                                        </p>
                                        <Button variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-transparent flex items-center gap-2">
                                            Learn more about BYOK <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="p-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <p className="text-[11px] text-neutral-600">
                        Secure billing provided by Polar.sh. Invoices are generated automatically at each billing cycle.
                    </p>
                    <div className="flex items-center gap-4 text-[13px]">
                        <button className="text-neutral-500 hover:text-white transition-colors">Privacy Policy</button>
                        <div className="w-1 h-1 bg-neutral-800 rounded-full" />
                        <button className="text-neutral-500 hover:text-white transition-colors">Terms of Service</button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
