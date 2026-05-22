'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useDashboardSettings } from '@/lib/DashboardSettingsContext';
import { useSession } from 'next-auth/react';

interface Suggestion {
    label: string;
    prompt: string;
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

    // Always offer a scheduling agent — core Arcus capability, profile-agnostic.
    out.push({ label: 'Set up a daily inbox digest at 9am', prompt: 'Create a scheduled agent that sends me a digest of important emails every morning at 9am.' });

    // Fallback for users with nothing connected yet: keep prompts genuinely useful.
    if (out.length <= 1) {
        return [
            { label: 'What can you do for me?', prompt: 'What can you do for me, and what should I connect to get the most out of you?' },
            { label: 'Help me get to inbox zero', prompt: 'Walk me through getting to inbox zero — triage what matters and handle the rest.' },
            { label: 'Set up a daily inbox digest at 9am', prompt: 'Create a scheduled agent that sends me a digest of important emails every morning at 9am.' },
        ];
    }

    // Personalize the lead suggestion if we know the name.
    if (firstName) {
        out.unshift({ label: `What needs ${firstName}'s attention right now?`, prompt: 'Scan my inbox and calendar and tell me the most important things that need my attention right now.' });
    }

    return out.slice(0, 6);
}

export function ArcusCommandPalette() {
    const { isArcusOpen, setIsArcusOpen, playSystemSound } = useDashboardSettings();
    const { data: session } = useSession();

    const [query, setQuery] = useState('');
    // Gmail is the app's core auth — every signed-in user granted Gmail scopes,
    // so it's always available. Optional integrations are layered on from the API.
    const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, boolean>>({ gmail: true });
    const [activeIndex, setActiveIndex] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);

    const firstName = useMemo(() => (session?.user?.name || '').trim().split(' ')[0] || '', [session?.user?.name]);
    const suggestions = useMemo(() => buildSuggestions(integrationStatuses, firstName), [integrationStatuses, firstName]);

    // Fetch the user's real connected integrations to tailor the suggestions.
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
                statuses.gmail = true; // core auth — never downgrade
                setIntegrationStatuses(statuses);
            } catch {
                /* keep fallback suggestions */
            }
        })();
        return () => { cancelled = true; };
    }, [isArcusOpen]);

    // Focus input on open, reset on close.
    useEffect(() => {
        if (isArcusOpen) {
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 80);
        } else {
            setQuery('');
        }
    }, [isArcusOpen]);

    const submit = useCallback((text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        // Route through the full agentic pipeline (same as before) so the
        // palette can do everything Arcus can — it just hands off the prompt.
        localStorage.setItem('pending_arcus_message', trimmed);
        localStorage.removeItem('pending_arcus_options');

        setIsArcusOpen(false);
        setQuery('');
        playSystemSound('success');
        window.location.href = '/dashboard/agent-talk';
    }, [setIsArcusOpen, playSystemSound]);

    // Keyboard: Esc closes, arrows move through suggestions, Enter submits.
    useEffect(() => {
        if (!isArcusOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsArcusOpen(false);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (query.trim()) submit(query);
                else if (suggestions[activeIndex]) submit(suggestions[activeIndex].prompt);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isArcusOpen, suggestions, activeIndex, query, submit, setIsArcusOpen]);

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
                        className="relative w-full max-w-[640px] mx-4 bg-arcus-elevated rounded-[20px] border border-arcus-border shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] overflow-hidden"
                    >
                        {/* Header / input row */}
                        <div className="flex items-center gap-3 px-5 py-4">
                            <Sparkles className="w-5 h-5 text-arcus-fg-tertiary shrink-0" strokeWidth={1.75} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Tell Arcus what to do…"
                                className="flex-1 bg-transparent border-0 outline-none text-[18px] text-arcus-fg placeholder:text-arcus-fg-muted font-normal tracking-tight"
                            />
                            <button
                                onClick={() => setIsArcusOpen(false)}
                                className="shrink-0 text-[12px] font-medium text-arcus-fg-tertiary bg-arcus-surface border border-arcus-border rounded-md px-2.5 py-1 hover:bg-arcus-surface-hover transition-colors"
                            >
                                Esc
                            </button>
                        </div>

                        <div className="h-px w-full bg-arcus-divider" />

                        {/* Default suggestions — derived from the user's real profile */}
                        <div className="py-2">
                            {suggestions.map((s, i) => (
                                <button
                                    key={s.label}
                                    onClick={() => submit(s.prompt)}
                                    onMouseEnter={() => setActiveIndex(i)}
                                    className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors ${
                                        activeIndex === i ? 'bg-arcus-surface-hover' : 'bg-transparent'
                                    }`}
                                >
                                    <Sparkles className="w-[18px] h-[18px] text-arcus-fg-tertiary shrink-0" strokeWidth={1.75} />
                                    <span className="text-[15px] text-arcus-fg font-normal tracking-tight">{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
