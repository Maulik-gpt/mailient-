'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowUpRight, Loader2 } from 'lucide-react';
import { useDashboardSettings } from '@/lib/DashboardSettingsContext';
import { useSession } from 'next-auth/react';

interface Suggestion {
    label: string;
    prompt: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * Build default prompts from the user's REAL connected integrations and name.
 * No mock data — each suggestion maps to something Arcus can actually do for
 * this specific user given what they have connected.
 */
function buildSuggestions(connected: Record<string, boolean>, firstName: string): Suggestion[] {
    const has = (k: string) => !!connected[k];
    const out: Suggestion[] = [];

    if (has('gmail')) {
        out.push({ label: 'Summarize my unread emails', prompt: 'Summarize my unread emails and tell me what needs my attention.' });
        out.push({ label: "Draft replies to everyone I'm holding up", prompt: "Find emails where people are waiting on a reply from me and draft responses in my voice." });
    }
    if (has('google_calendar')) {
        out.push({ label: 'What does my day look like?', prompt: "Give me a rundown of today's calendar and flag any conflicts." });
    }
    if (has('cal_com')) {
        out.push({ label: 'Find time for a 30-min call this week', prompt: 'Find open 30-minute slots in my schedule this week I can offer for a call.' });
    }
    if (has('notion')) {
        out.push({ label: "Log today's action items to Notion", prompt: "Pull the action items from today's emails and log them to my Notion workspace." });
    }
    if (has('slack')) {
        out.push({ label: 'Catch me up on Slack', prompt: 'Summarize my unread Slack mentions and threads I was tagged in.' });
    }

    out.push({ label: 'Digest my newsletters', prompt: 'I am subscribed to too many newsletters and have no time to read them. Digest my newsletters from the last 7 days into one clean summary of what matters.' });

    if (out.length <= 1) {
        return [
            { label: 'What can you do for me?', prompt: 'What can you do for me, and what should I connect to get the most out of you?' },
            { label: 'Help me get to inbox zero', prompt: 'Walk me through getting to inbox zero — triage what matters and handle the rest.' },
            { label: 'Digest my newsletters', prompt: 'I am subscribed to too many newsletters and have no time to read them. Digest my newsletters from the last 7 days into one clean summary of what matters.' },
        ];
    }

    if (firstName) {
        out.unshift({ label: `What needs ${firstName}'s attention right now?`, prompt: 'Scan my inbox and calendar and tell me the most important things that need my attention right now.' });
    }

    return out.slice(0, 6);
}

// Strip the model's internal reasoning tags so only the answer shows inline.
function stripThinking(text: string): string {
    return text
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .replace(/<\/?(thinking|thought|tool_call|tool_use|tool_result|scratchpad)[^>]*>/gi, '')
        .trim();
}

// Minimal, safe markdown → HTML for the inline answer (bold, links, bullets, headings).
function renderAnswer(md: string): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const inline = (s: string) => esc(s)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline">$1</a>');
    let html = '';
    let inList = false;
    for (const raw of md.split('\n')) {
        const line = raw.trimEnd();
        if (/^#{1,3}\s+/.test(line)) { if (inList) { html += '</ul>'; inList = false; } html += `<p class="font-semibold mt-2 mb-1">${inline(line.replace(/^#{1,3}\s+/, ''))}</p>`; }
        else if (/^[-*]\s+/.test(line)) { if (!inList) { html += '<ul class="list-disc pl-5 my-1 space-y-0.5">'; inList = true; } html += `<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`; }
        else if (line === '') { if (inList) { html += '</ul>'; inList = false; } }
        else { if (inList) { html += '</ul>'; inList = false; } html += `<p class="my-1 leading-relaxed">${inline(line)}</p>`; }
    }
    if (inList) html += '</ul>';
    return html;
}

export function ArcusCommandPalette() {
    const { isArcusOpen, setIsArcusOpen, playSystemSound } = useDashboardSettings();
    const { data: session } = useSession();

    const [query, setQuery] = useState('');
    const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, boolean>>({ gmail: true });
    const [activeIndex, setActiveIndex] = useState(0);

    // Inline conversation state
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [streaming, setStreaming] = useState(false);
    const [status, setStatus] = useState('');
    const [liveAnswer, setLiveAnswer] = useState('');

    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const firstName = useMemo(() => (session?.user?.name || '').trim().split(' ')[0] || '', [session?.user?.name]);
    const suggestions = useMemo(() => buildSuggestions(integrationStatuses, firstName), [integrationStatuses, firstName]);
    const inConversation = messages.length > 0 || streaming;

    useEffect(() => {
        if (!isArcusOpen) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/integrations/status');
                if (!res.ok) return;
                const data = await res.json();
                if (cancelled || !Array.isArray(data?.integrations)) return;
                const statuses: Record<string, boolean> = { gmail: true };
                data.integrations.forEach((item: { provider?: string; connected?: boolean }) => {
                    if (item?.provider) statuses[item.provider] = !!item.connected;
                });
                statuses.gmail = true;
                setIntegrationStatuses(statuses);
            } catch { /* keep fallback suggestions */ }
        })();
        return () => { cancelled = true; };
    }, [isArcusOpen]);

    // Focus on open; full reset on close.
    useEffect(() => {
        if (isArcusOpen) {
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 80);
        } else {
            abortRef.current?.abort();
            setQuery('');
            setMessages([]);
            setStreaming(false);
            setStatus('');
            setLiveAnswer('');
        }
    }, [isArcusOpen]);

    // Keep the conversation scrolled to the latest content.
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, liveAnswer, status]);

    const streamReply = useCallback(async (text: string, history: ChatMessage[]) => {
        setStreaming(true);
        setStatus('Thinking…');
        setLiveAnswer('');
        const controller = new AbortController();
        abortRef.current = controller;

        let answer = '';
        let canvasMd = '';
        try {
            const res = await fetch('/api/arcus/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history }),
                signal: controller.signal,
            });
            if (!res.ok || !res.body) throw new Error(`Arcus is unavailable (${res.status}).`);

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let eventType = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('event: ')) { eventType = line.slice(7).trim(); continue; }
                    if (!line.startsWith('data: ') || !eventType) continue;
                    let data: any;
                    try { data = JSON.parse(line.slice(6).trim()); } catch { continue; }

                    if (eventType === 'thinking') {
                        if (data.status) setStatus(data.status);
                    } else if (eventType === 'tool_call') {
                        setStatus(`Using ${String(data.tool || 'a tool').replace(/_/g, ' ')}…`);
                    } else if (eventType === 'narrative' || eventType === 'plan_text') {
                        if (data.text || data.content) { answer = stripThinking(data.text || data.content); setLiveAnswer(answer); }
                    } else if (eventType === 'message') {
                        answer = stripThinking(data.content || '');
                        setLiveAnswer(answer);
                        if (data.canvasContent?.markdown) canvasMd = data.canvasContent.markdown;
                    } else if (eventType === 'canvas') {
                        if (data?.markdown) canvasMd = data.markdown;
                    } else if (eventType === 'question') {
                        const qs = (data.questions || []).map((q: any) => q.text || q).filter(Boolean);
                        if (qs.length) { answer = qs.join('\n\n'); setLiveAnswer(answer); }
                    } else if (eventType === 'error') {
                        throw new Error(data.message || data.error || 'Something went wrong.');
                    }
                }
            }

            // Prefer the substantive canvas output (digest/report) when the chat
            // text is just a short hand-off line.
            const finalText = canvasMd && canvasMd.length > answer.length ? canvasMd : (answer || 'Done.');
            setMessages(prev => [...prev, { role: 'assistant', content: finalText }]);
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err?.message || 'Arcus could not reply. Try again.'}` }]);
            }
        } finally {
            setStreaming(false);
            setStatus('');
            setLiveAnswer('');
            abortRef.current = null;
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, []);

    const submit = useCallback((text: string) => {
        const trimmed = text.trim();
        if (!trimmed || streaming) return;
        playSystemSound('click');
        const history = messages.slice(-10);
        setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
        setQuery('');
        streamReply(trimmed, history);
    }, [streaming, messages, streamReply, playSystemSound]);

    const openFullArcus = useCallback(() => {
        const last = [...messages].reverse().find(m => m.role === 'user');
        if (last) {
            try {
                localStorage.setItem('pending_arcus_message', last.content);
                localStorage.removeItem('pending_arcus_options');
            } catch { /* ignore */ }
        }
        setIsArcusOpen(false);
        window.location.href = '/dashboard/agent-talk';
    }, [messages, setIsArcusOpen]);

    // Keyboard: Esc closes; arrows/Enter drive suggestions only before a conversation starts.
    useEffect(() => {
        if (!isArcusOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setIsArcusOpen(false); return; }
            if (inConversation) {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (query.trim()) submit(query); }
                return;
            }
            if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (query.trim()) submit(query);
                else if (suggestions[activeIndex]) submit(suggestions[activeIndex].prompt);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isArcusOpen, suggestions, activeIndex, query, submit, setIsArcusOpen, inConversation]);

    if (!isArcusOpen) return null;

    return (
        <AnimatePresence>
            {isArcusOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="fixed inset-0 z-[9999] flex items-start justify-center pt-[14vh]"
                    onClick={() => setIsArcusOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[6px]" />

                    <motion.div
                        initial={{ opacity: 0, y: -12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.98 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-[640px] mx-4 bg-arcus-elevated rounded-[20px] border border-arcus-border shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col max-h-[70vh]"
                    >
                        {/* Header / input row */}
                        <div className="flex items-center gap-3 px-5 py-4 shrink-0">
                            {streaming
                                ? <Loader2 className="w-5 h-5 text-arcus-fg-tertiary shrink-0 animate-spin" />
                                : <Sparkles className="w-5 h-5 text-arcus-fg-tertiary shrink-0" strokeWidth={1.75} />}
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={inConversation ? 'Ask a follow-up…' : 'Tell Arcus what to do…'}
                                className="flex-1 bg-transparent border-0 outline-none text-[18px] text-arcus-fg placeholder:text-arcus-fg-muted font-normal tracking-tight"
                            />
                            <button
                                onClick={() => setIsArcusOpen(false)}
                                className="shrink-0 text-[12px] font-medium text-arcus-fg-tertiary bg-arcus-surface border border-arcus-border rounded-md px-2.5 py-1 hover:bg-arcus-surface-hover transition-colors"
                            >
                                Esc
                            </button>
                        </div>

                        <div className="h-px w-full bg-arcus-divider shrink-0" />

                        {/* Suggestions (launcher) OR inline conversation */}
                        {!inConversation ? (
                            <div className="py-2 overflow-y-auto">
                                {suggestions.map((s, i) => (
                                    <button
                                        key={s.label}
                                        onClick={() => submit(s.prompt)}
                                        onMouseEnter={() => setActiveIndex(i)}
                                        className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors ${activeIndex === i ? 'bg-arcus-surface-hover' : 'bg-transparent'}`}
                                    >
                                        <Sparkles className="w-[18px] h-[18px] text-arcus-fg-tertiary shrink-0" strokeWidth={1.75} />
                                        <span className="text-[15px] text-arcus-fg font-normal tracking-tight">{s.label}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                                    {messages.map((m, i) => (
                                        m.role === 'user' ? (
                                            <div key={i} className="flex justify-end">
                                                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-arcus-surface px-4 py-2.5 text-[14px] text-arcus-fg">
                                                    {m.content}
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                key={i}
                                                className="text-[14px] text-arcus-fg-secondary [&_strong]:text-arcus-fg [&_a]:text-arcus-fg"
                                                dangerouslySetInnerHTML={{ __html: renderAnswer(m.content) }}
                                            />
                                        )
                                    ))}

                                    {streaming && (
                                        <div className="text-[14px] text-arcus-fg-secondary">
                                            {liveAnswer
                                                ? <div className="[&_strong]:text-arcus-fg [&_a]:text-arcus-fg" dangerouslySetInnerHTML={{ __html: renderAnswer(liveAnswer) }} />
                                                : <div className="flex items-center gap-2 text-arcus-fg-tertiary"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>{status || 'Thinking…'}</span></div>}
                                        </div>
                                    )}
                                </div>

                                <div className="h-px w-full bg-arcus-divider shrink-0" />
                                <button
                                    onClick={openFullArcus}
                                    className="shrink-0 flex items-center justify-center gap-1.5 px-5 py-2.5 text-[12px] text-arcus-fg-tertiary hover:text-arcus-fg hover:bg-arcus-surface-hover transition-colors"
                                >
                                    Open full Arcus
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
