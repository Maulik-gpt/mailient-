'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ArrowUp, Sparkles, Loader2 } from 'lucide-react';
import { useDashboardSettings } from '@/lib/DashboardSettingsContext';
import { useSession } from 'next-auth/react';

// Simple markdown renderer
const renderMarkdown = (text: string): string => {
    if (!text) return text;
    const paragraphs = text.split(/\n\n+/);
    const renderedParagraphs = paragraphs.map(para => {
        let processed = para.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
        if (processed.includes('\n- ') || processed.startsWith('- ') || processed.includes('\n* ') || processed.startsWith('* ')) {
            const lines = processed.split('\n');
            const listItems = lines.map(line => {
                const match = line.match(/^[\s]*[-*]\s*(.*)$/);
                if (match) return `<li class="ml-4 py-0.5">${match[1]}</li>`;
                return line;
            });
            let joined = listItems.join('\n');
            joined = joined.replace(/(<li[\s\S]*?<\/li>(?:\n<li[\s\S]*?<\/li>)*)/g, '<ul class="space-y-1 my-2 list-disc list-inside text-white/60">$1</ul>');
            return joined;
        }
        processed = processed.replace(/\n/g, '<br/>');
        return `<p class="mb-2 last:mb-0 text-white/70 text-[14px] leading-relaxed">${processed}</p>`;
    });
    return renderedParagraphs.join('');
};

interface ArcusMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export function ArcusCommandPalette() {
    const { isArcusOpen, setIsArcusOpen, settings, playSystemSound } = useDashboardSettings();
    const { data: session } = useSession();

    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<ArcusMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Auto-focus input when opened
    useEffect(() => {
        if (isArcusOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            // Reset state when closed
            setQuery('');
            setMessages([]);
            setConversationId(null);
        }
    }, [isArcusOpen]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Close on Escape
    useEffect(() => {
        if (!isArcusOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsArcusOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isArcusOpen, setIsArcusOpen]);

    const handleSend = useCallback(async () => {
        const trimmed = query.trim();
        if (!trimmed) return;

        // Unified Redirection Logic for v2 Agentic Pipeline
        // We save the pending message to localStorage and redirect to the dashboard
        // to leverage the high-performance agentic loop.
        localStorage.setItem('pending_arcus_message', trimmed);
        
        // Clear any previous options to ensure a fresh session
        localStorage.removeItem('pending_arcus_options');

        setIsArcusOpen(false);
        setQuery('');

        // Provide immediate visual feedback before redirection
        playSystemSound('success');
        
        // Push to the centralized agent interface
        window.location.href = '/dashboard/agent-talk';
    }, [query, setIsArcusOpen, playSystemSound]);

    if (!isArcusOpen) return null;

    return (
        <AnimatePresence>
            {isArcusOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh]"
                    onClick={() => setIsArcusOpen(false)}
                >
                    {/* Backdrop with premium glassmorphism */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-[12px]"
                    />

                    {/* Command Launcher - Redesigned for v2 Redirection */}
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.96 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-[680px] mx-4 bg-arcus-elevated rounded-[24px] border border-arcus-border shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col ring-1 ring-white/5"
                    >
                        {/* Dynamic glow effect */}
                        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/[0.05] rounded-full blur-[100px] pointer-events-none" />

                        {/* Header - Unified Arcus Branding */}
                        <div className="flex items-center gap-3 px-6 pt-5 pb-3">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-8 h-8 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.1] overflow-hidden shadow-2xl">
                                    <img src="/arcus-ai-icon.jpg" alt="Arcus" className="w-full h-full object-cover grayscale brightness-125" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-white tracking-[0.2em] uppercase opacity-40">Agentic Command</span>
                                        <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                                    </div>
                                    <span className="text-[14px] font-medium text-white/90">Initialize Agent Intelligence</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsArcusOpen(false)}
                                className="p-2 hover:bg-white/5 rounded-full transition-all text-white/20 hover:text-white/60 hover:rotate-90"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Input area - Primary Action */}
                        <div className="px-6 pb-6 pt-2">
                            <div className="relative flex items-center group">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    className="w-full bg-white/[0.03] border border-arcus-border rounded-2xl px-6 py-5 pr-16 text-[17px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] focus:ring-4 focus:ring-white/[0.02] transition-all duration-300 font-light tracking-tight"
                                    placeholder="What do you want the agent to do?"
                                />
                                
                                <div className="absolute right-3 flex items-center gap-2">
                                    <button
                                        onClick={handleSend}
                                        disabled={!query.trim()}
                                        className={`p-2.5 rounded-xl transition-all duration-300 transform ${
                                            query.trim()
                                                ? 'bg-white text-black hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                                : 'bg-white/5 text-white/10 cursor-not-allowed opacity-20'
                                        }`}
                                    >
                                        <Zap className={`w-4 h-4 ${query.trim() ? 'fill-black' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Shortcut Visualizer */}
                            <div className="flex items-center justify-between mt-5 px-1">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-[10px] text-white/20 font-bold uppercase tracking-widest">
                                        <Sparkles className="w-3 h-3" />
                                        Context Aware
                                    </div>
                                    <div className="h-3 w-[1px] bg-white/10" />
                                    <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
                                        Global Redirection
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                        <kbd className="text-[9px] text-white/60 bg-white/[0.05] px-1.5 py-0.5 rounded-md border border-white/10 font-mono">ENTER</kbd>
                                        <span className="text-[9px] text-white/30 font-bold uppercase tracking-tighter">to execute</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                        <kbd className="text-[9px] text-white/60 bg-white/[0.05] px-1.5 py-0.5 rounded-md border border-white/10 font-mono">ESC</kbd>
                                        <span className="text-[9px] text-white/30 font-bold uppercase tracking-tighter">to close</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Subtle bottom accent */}
                        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-30" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
