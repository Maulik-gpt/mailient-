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
    { text: "> De-duplicating cross-channel thread hashes...", icon: <Database className="w-3.5 h-3.5" /> },
    { text: "> Running deep semantic cluster analysis...", icon: <Cpu className="w-3.5 h-3.5" /> }
];

const SUCCESS_MESSAGE = { text: "> Systems optimal. Preparing Dashboard...", icon: <Shield className="w-3.5 h-3.5" /> };

interface ArcusTerminalLoaderProps {
    loading?: boolean;
}

export function ArcusTerminalLoader({ loading = true }: ArcusTerminalLoaderProps) {
    const [currentLogIndex, setCurrentLogIndex] = useState(0);
    const [logs, setLogs] = useState<typeof LOG_MESSAGES>([]);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        // If we still have standard messages, show them
        if (currentLogIndex < LOG_MESSAGES.length) {
            const timeout = setTimeout(() => {
                setLogs(prev => [...prev, LOG_MESSAGES[currentLogIndex]]);
                setCurrentLogIndex(prev => prev + 1);
            }, 600 + Math.random() * 800);
            return () => clearTimeout(timeout);
        } 
        // If we've shown all messages but still loading, add periodic "processing" logs
        else if (loading) {
            const processingMessages = [
                "> Sifting through deep inbox layers...",
                "> Enhancing relationship intelligence...",
                "> Distilling founder-focused execution nodes...",
                "> Cross-referencing intent signals...",
                "> Identifying high-impact opportunities...",
                "> Optimizing priority vectors..."
            ];
            
            const timeout = setTimeout(() => {
                const randomMsg = processingMessages[Math.floor(Math.random() * processingMessages.length)];
                setLogs(prev => {
                    const newLogs = [...prev, { text: randomMsg, icon: <Sparkles className="w-3.5 h-3.5" /> }];
                    // Keep terminal from getting too full
                    if (newLogs.length > 15) return newLogs.slice(newLogs.length - 15);
                    return newLogs;
                });
            }, 1500 + Math.random() * 1000);
            return () => clearTimeout(timeout);
        }
        // Once loading is false and all standard logs shown, show final success message
        else if (!loading && !isFinished) {
            const timeout = setTimeout(() => {
                setLogs(prev => [...prev, SUCCESS_MESSAGE]);
                setIsFinished(true);
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [currentLogIndex, loading, isFinished]);

    return (
        <div className="flex flex-col items-center justify-center p-8 w-full max-w-2xl mx-auto">
            {/* Terminal Window */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full bg-black/95 dark:bg-zinc-950 rounded-[2.5rem] border border-white/10 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-3xl"
            >
                {/* Window Header */}
                <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/40" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
                        </div>
                        <span className="ml-4 text-[9px] uppercase tracking-[0.3em] font-black text-white/30 flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            Arcus Intelligence v4.2 — Neural Sift Active
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-[9px] font-mono text-white/20 uppercase tracking-widest">
                        <span>LHR-DB-V4</span>
                        <div className="w-px h-3 bg-white/10" />
                        <span>Handshake Active</span>
                    </div>
                </div>

                {/* Terminal Body */}
                <div className="p-10 font-mono min-h-[360px] max-h-[400px] overflow-y-auto scrollbar-hide bg-gradient-to-b from-transparent to-emerald-500/5">
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {logs.map((log, index) => (
                                <motion.div
                                    key={`log-${index}-${log.text}`}
                                    initial={{ opacity: 0, x: -8, filter: 'blur(4px)' }}
                                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                    className="flex items-start gap-4"
                                >
                                    <span className="text-white/20 mt-1">{log.icon}</span>
                                    <span className={cn(
                                        "text-[12px] leading-relaxed tracking-tight",
                                        index === logs.length - 1 ? "text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" : "text-white/60"
                                    )}>
                                        {log.text}
                                    </span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        
                        {(!isFinished || loading) && (
                            <div className="flex items-center gap-4">
                                <span className="text-white/20"><Terminal className="w-3.5 h-3.5" /></span>
                                <motion.div 
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "steps(2)" }}
                                    className="w-2 h-4 bg-emerald-500/60 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Bottom Perception Builder */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="mt-12 flex flex-col items-center gap-6 text-center"
            >
                <div className="flex items-center gap-4 px-8 py-2.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 backdrop-blur-xl shadow-inner">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[11px] font-black text-emerald-500/80 uppercase tracking-[0.25em] leading-none">
                        Neural handshake verified • AES-256
                    </span>
                </div>
                <p className="text-black/50 dark:text-white/30 text-[12px] font-light leading-relaxed max-w-sm tracking-wide">
                    Arcus AI is distilling your unique business intelligence. This neural mapping ensures your voice is captured with zero data latency.
                </p>
            </motion.div>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
