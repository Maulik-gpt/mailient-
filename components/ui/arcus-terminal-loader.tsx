'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Shield, Sparkles, Database, Search, Cpu } from 'lucide-react';

const LOG_MESSAGES = [
    { text: "> Initializing Arcus Intelligence Core...", icon: <Terminal className="w-3.5 h-3.5" /> },
    { text: "> Establishing secure link to Google Vault...", icon: <Shield className="w-3.5 h-3.5" /> },
    { text: "> Authenticating Zero-Knowledge handshake...", icon: <Database className="w-3.5 h-3.5" /> },
    { text: "> Extracting historical interaction patterns...", icon: <Search className="w-3.5 h-3.5" /> },
    { text: "> Calibrating Neural Voice (Mimic My Style)...", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { text: "> Mapping relationship high-leverage nodes...", icon: <Cpu className="w-3.5 h-3.5" /> },
    { text: "> Syncing Mailient Sift categories: Opportunities, Urgent...", icon: <Terminal className="w-3.5 h-3.5" /> },
    { text: "> Finalizing inbox layout synchronization...", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { text: "> Systems optimal. Preparing Dashboard...", icon: <Shield className="w-3.5 h-3.5" /> }
];

export function ArcusTerminalLoader() {
    const [currentLogIndex, setCurrentLogIndex] = useState(0);
    const [logs, setLogs] = useState<typeof LOG_MESSAGES>([]);

    useEffect(() => {
        if (currentLogIndex < LOG_MESSAGES.length) {
            const timeout = setTimeout(() => {
                setLogs(prev => [...prev, LOG_MESSAGES[currentLogIndex]]);
                setCurrentLogIndex(prev => prev + 1);
            }, 800 + Math.random() * 1200); // Varied timing for realism
            return () => clearTimeout(timeout);
        }
    }, [currentLogIndex]);

    return (
        <div className="flex flex-col items-center justify-center p-8 w-full max-w-2xl mx-auto">
            {/* Terminal Window */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full bg-black/90 dark:bg-zinc-950 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden backdrop-blur-3xl"
            >
                {/* Window Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-rose-500/30" />
                            <div className="w-3 h-3 rounded-full bg-amber-500/30" />
                            <div className="w-3 h-3 rounded-full bg-emerald-500/30" />
                        </div>
                        <span className="ml-3 text-[10px] uppercase tracking-[0.2em] font-black text-white/40">
                            Arcus Intelligence v4.0 — Inbox Mapping
                        </span>
                    </div>
                </div>

                {/* Terminal Body */}
                <div className="p-8 font-mono min-h-[320px] max-h-[400px] overflow-y-auto scrollbar-hide">
                    <div className="space-y-3.5">
                        <AnimatePresence mode="popLayout">
                            {logs.map((log, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-start gap-3"
                                >
                                    <span className="text-white/20 mt-0.5">{log.icon}</span>
                                    <span className={cn(
                                        "text-[12px] leading-relaxed tracking-tight",
                                        index === logs.length - 1 ? "text-emerald-400 font-bold" : "text-white/60"
                                    )}>
                                        {log.text}
                                    </span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        
                        {currentLogIndex < LOG_MESSAGES.length && (
                            <div className="flex items-center gap-3">
                                <span className="text-white/20"><Terminal className="w-3.5 h-3.5" /></span>
                                <motion.div 
                                    animate={{ opacity: [1, 0] }}
                                    transition={{ duration: 0.8, repeat: Infinity }}
                                    className="w-2 h-4 bg-emerald-500/40"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Bottom Perception Builder */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 flex flex-col items-center gap-4 text-center"
            >
                <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[12px] font-bold text-white/80 uppercase tracking-widest leading-none">
                        End-to-End Encryption Tunnel Active
                    </span>
                </div>
                <p className="text-black/40 dark:text-white/20 text-[11px] font-medium leading-relaxed max-w-sm">
                    Arcus AI is distilling your business intelligence in real-time. This one-time mapping ensures your voice and priorities are captured with zero data latency.
                </p>
            </motion.div>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
