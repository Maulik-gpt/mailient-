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
        if (!trimmed || isLoading) return;

        const userMsg: ArcusMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: trimmed,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setQuery('');

        try {
            const response = await fetch('/api/agent-talk/chat-arcus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: trimmed,
                    conversationId: conversationId,
                    isNewConversation: !conversationId,
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || 'Failed to get response');
            }

            if (data.conversationId) {
                setConversationId(data.conversationId);
            }

            const assistantMsg: ArcusMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.message || 'No response received.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, assistantMsg]);

            // Save conversation to localStorage for history continuity
            if (data.conversationId) {
                try {
                    const allMessages = [...messages, userMsg, assistantMsg];
                    const conversationData = {
                        id: data.conversationId,
                        messages: allMessages.map(m => ({
                            role: m.role,
                            content: m.content,
                            timestamp: m.timestamp
                        })),
                        title: trimmed.substring(0, 50),
                        lastUpdated: new Date().toISOString(),
                        messageCount: allMessages.length
                    };
                    localStorage.setItem(`conversation_${data.conversationId}`, JSON.stringify(conversationData));
                    localStorage.setItem(`conv_${data.conversationId}_title`, trimmed.substring(0, 50));
                } catch (e) {
                    console.error('Failed to save conversation:', e);
                }
            }
        } catch (error) {
            const errorMsg: ArcusMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    }, [query, isLoading, conversationId, messages]);

    if (!isArcusOpen) return null;

    const hasMessages = messages.length > 0;

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
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    {/* Command Palette */}
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.96 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`relative w-full max-w-[680px] mx-4 bg-white dark:bg-[#111111] rounded-2xl border border-white/[0.08] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col ${hasMessages ? 'max-h-[70vh]' : ''}`}
                    >
                        {/* Ambient glow */}
                        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-white/[0.02] rounded-full blur-[80px] pointer-events-none" />

                        {/* Header - minimal */}
                        <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                            <div className="flex items-center gap-2.5 flex-1">
                                <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center border border-white/[0.08] overflow-hidden">
                                    <img src="/arcus-ai-icon.jpg" alt="Arcus" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-white/50 tracking-widest uppercase">Arcus</span>
                                    <div className="w-1 h-1 rounded-full bg-emerald-500/80 animate-pulse" />
                                </div>
                            </div>
                            <button
                                onClick={() => setIsArcusOpen(false)}
                                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/30 hover:text-white/60"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Messages area */}
                        {hasMessages && (
                            <div
                                ref={messagesContainerRef}
                                className="flex-1 overflow-y-auto px-5 py-3 space-y-4 min-h-0 custom-scrollbar"
                            >
                                {messages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] ${
                                            msg.role === 'user'
                                                ? 'bg-white text-black rounded-2xl rounded-br-md px-4 py-2.5'
                                                : 'text-white/80 rounded-2xl rounded-bl-md px-1 py-1'
                                        }`}>
                                            {msg.role === 'user' ? (
                                                <p className="text-[14px] leading-relaxed">{msg.content}</p>
                                            ) : (
                                                <div
                                                    className="prose prose-invert prose-sm max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                                />
                                            )}
                                            <span className={`text-[10px] mt-1.5 block ${
                                                msg.role === 'user' ? 'text-black/30 text-right' : 'text-white/20'
                                            }`}>
                                                {msg.timestamp}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}

                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2.5 px-1 py-2"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-[pulse_1s_ease-in-out_infinite]" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-[pulse_1s_ease-in-out_0.2s_infinite]" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-[pulse_1s_ease-in-out_0.4s_infinite]" />
                                        </div>
                                        <span className="text-[12px] text-white/30 font-medium">Thinking...</span>
                                    </motion.div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}

                        {/* Input area */}
                        <div className={`px-4 ${hasMessages ? 'pb-4 pt-2 border-t border-white/[0.05]' : 'pb-4 pt-1'}`}>
                            <div className="relative flex items-center">
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
                                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 pr-12 text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/15 focus:bg-white/[0.06] transition-all duration-300"
                                    placeholder="Ask anything about your emails..."
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={isLoading || !query.trim()}
                                    className={`absolute right-2 p-2 rounded-lg transition-all duration-200 ${
                                        query.trim() && !isLoading
                                            ? 'bg-white text-black hover:bg-neutral-200 shadow-lg'
                                            : 'bg-white/5 text-white/15 cursor-not-allowed'
                                    }`}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <ArrowUp className="w-4 h-4" />
                                    )}
                                </button>
                            </div>

                            {/* Footer hint */}
                            <div className="flex items-center justify-between mt-2.5 px-1">
                                <p className="text-[10px] text-white/15 font-medium">
                                    Connected to your Gmail • Full email knowledge
                                </p>
                                <div className="flex items-center gap-2">
                                    <kbd className="text-[9px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">ESC</kbd>
                                    <span className="text-[9px] text-white/15">to close</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
