"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, Mail, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ForwardingSetupProps {
    mailientEmail: string;
    onComplete: () => void;
}

export default function ForwardingSetup({ mailientEmail, onComplete }: ForwardingSetupProps) {
    const [copied, setCopied] = useState(false);
    const [step, setStep] = useState(1);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(mailientEmail);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const steps = [
        {
            title: "Your Mailient Bridge",
            description: "To keep your data private and avoid expensive Google audits, we use a 'Bridge'. Arcus AI reads only what you send to it.",
            icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />
        },
        {
            title: "Copy your Address",
            description: "This is your unique Mailient handle. Every email forwarded here is instantly analyzed by Arcus AI.",
            icon: <Mail className="w-6 h-6 text-blue-400" />
        },
        {
            title: "Set up Gmail",
            description: "Go to Gmail Settings > Forwarding and add this address. You can forward everything or just specific filters.",
            icon: <Zap className="w-6 h-6 text-amber-400" />
        }
    ];

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold text-white tracking-tight">Intelligent Forwarding</h2>
                <p className="text-zinc-500 text-lg">The bridge between your inbox and Arcus AI.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {steps.map((s, i) => (
                    <div
                        key={i}
                        className={cn(
                            "p-4 rounded-2xl border transition-all duration-300",
                            step === i + 1 ? "bg-white/5 border-white/20" : "bg-zinc-950/20 border-white/5 opacity-50"
                        )}
                    >
                        <div className="mb-3">{s.icon}</div>
                        <div className="text-sm font-bold text-white mb-1">{s.title}</div>
                        <div className="text-xs text-zinc-500">{s.description}</div>
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-zinc-950/50 border border-white/5 rounded-[2.5rem] p-8 text-center space-y-6"
                    >
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Why Forwarding?</h3>
                        <p className="text-zinc-400 leading-relaxed">
                            Google requires a mandatory $15,000+ security audit (CASA) to read your emails via their API.
                            By using forwarding, we skip the audit, keep the app free, and ensure 100% privacy because you control exactly what Arcus AI sees.
                        </p>
                        <Button onClick={() => setStep(2)} className="h-12 px-8 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold">
                            Sounds good, let's setup
                        </Button>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-zinc-950/50 border border-white/5 rounded-[2.5rem] p-8 text-center space-y-6"
                    >
                        <h3 className="text-2xl font-bold text-white">Your Bridge Address</h3>
                        <div className="relative group">
                            <div className="p-6 bg-black border border-white/10 rounded-2xl text-xl font-mono text-white flex items-center justify-center gap-4">
                                {mailientEmail}
                                <button
                                    onClick={copyToClipboard}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-zinc-400" />}
                                </button>
                            </div>
                            {copied && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-emerald-400 text-sm font-medium"
                                >
                                    Copied to clipboard!
                                </motion.div>
                            )}
                        </div>
                        <div className="pt-4">
                            <Button onClick={() => setStep(3)} className="h-12 px-8 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold">
                                Next: Connect Gmail
                            </Button>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-zinc-950/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6"
                    >
                        <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-white text-center">Setup Gmail in 30 seconds</h3>
                            <div className="space-y-4 text-left">
                                <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">1</div>
                                    <p className="text-zinc-400 text-sm">Open <b>Gmail Settings</b> {'>'} <b>Forwarding and POP/IMAP</b>.</p>
                                </div>
                                <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">2</div>
                                    <p className="text-zinc-400 text-sm">Click <b>Add a forwarding address</b> and paste: <code className="text-white px-1 bg-white/10 rounded">{mailientEmail}</code></p>
                                </div>
                                <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">3</div>
                                    <p className="text-zinc-400 text-sm">Gmail will send a confirmation. Arcus AI will <b>automatically approve it</b> for you in a few seconds.</p>
                                </div>
                            </div>
                        </div>
                        <div className="pt-4 flex flex-col gap-3">
                            <Button
                                onClick={() => window.open('https://mail.google.com/mail/u/0/#settings/fwdandopp', '_blank')}
                                className="h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                            >
                                Open Gmail Settings
                                <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button onClick={onComplete} variant="ghost" className="text-zinc-500 hover:text-white">
                                I've done this, continue
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
