'use client';

import React, { useState, useEffect } from 'react';
import { Copy, X, Edit2, Mail, Send, Check, Sparkles, ArrowUp, Undo2, CornerDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DraftReplyBoxProps {
    draftData: {
        content: string;
        recipientName: string;
        recipientEmail: string;
        senderName: string;
        originalEmailId?: string;
        subject: string;
        threadId?: string;
    } | null;
    onSendReply: (draftData: {
        content: string;
        recipientEmail: string;
        subject: string;
        threadId?: string;
    }) => Promise<void>;
    onDismiss: () => void;
    isVisible: boolean;
}

export function DraftReplyBox({
    draftData,
    onSendReply,
    onDismiss,
    isVisible
}: DraftReplyBoxProps) {
    const [editedContent, setEditedContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    
    // AI Refinement State
    const [selection, setSelection] = useState<{ text: string; rect: DOMRect; start: number; end: number } | null>(null);
    const [isRefinementActive, setIsRefinementActive] = useState(false);
    const [refinementInstruction, setRefinementInstruction] = useState('');
    const [isProcessingRefinement, setIsProcessingRefinement] = useState(false);
    const [proposedRefinement, setProposedRefinement] = useState<string | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        if (draftData?.content) {
            setEditedContent(draftData.content);
            setIsEditing(false);
            setSendSuccess(false);
            setSendError(null);
            setProposedRefinement(null);
            setIsRefinementActive(false);
        }
    }, [draftData]);

    // Handle Selection for Refinement
    const handleMouseUp = (e: React.MouseEvent) => {
        if (isRefinementActive || isProcessingRefinement || proposedRefinement) return;
        
        const sel = window.getSelection();
        const textarea = e.currentTarget.querySelector('textarea');
        
        if (isEditing && textarea) {
            // Textarea selection handling
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = editedContent.substring(start, end);

            if (text.trim().length > 0) {
                // Approximate position for textarea (tough to get exact rect without a mirror div)
                // Use the mouse position as a fallback or a fixed offset
                const rect = textarea.getBoundingClientRect();
                setSelection({ 
                    text, 
                    rect: { 
                        ...rect, 
                        top: e.clientY, 
                        left: e.clientX,
                        width: 0,
                        height: 0,
                        right: e.clientX,
                        bottom: e.clientY,
                        x: e.clientX,
                        y: e.clientY,
                        toJSON: () => {}
                    } as DOMRect, 
                    start, 
                    end 
                });
                setShowTooltip(true);
            } else {
                setShowTooltip(false);
                setSelection(null);
            }
        } else if (sel && sel.toString().trim().length > 0) {
            // Standard DOM selection
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const text = sel.toString();
            
            // For view mode, we need the exact offset in the text
            const start = editedContent.indexOf(text);
            const end = start + text.length;

            if (start !== -1) {
                setSelection({ text, rect, start, end });
                setShowTooltip(true);
            }
        } else {
            setShowTooltip(false);
            setSelection(null);
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
                if (selection && !isRefinementActive) {
                    setIsRefinementActive(true);
                    e.preventDefault();
                }
            }
            if (e.key === 'Escape' && proposedRefinement) {
                setProposedRefinement(null);
                e.preventDefault();
            }
            if (e.key === 'Escape' && isRefinementActive) {
                setIsRefinementActive(false);
                setSelection(null);
                e.preventDefault();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && proposedRefinement) {
                handleAcceptRefinement();
                e.preventDefault();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selection, isRefinementActive, proposedRefinement]);

    const handleRefinementSubmit = async () => {
        if (!selection || !refinementInstruction.trim()) return;
        
        setIsProcessingRefinement(true);
        try {
            const res = await fetch('/api/email/refine-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullContent: editedContent,
                    selectedText: selection.text,
                    instruction: refinementInstruction
                })
            });
            // Parse response ONCE
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.error || 'Refinement failed');
            }
            if (data.refinedText) {
                setProposedRefinement(data.refinedText);
                setIsRefinementActive(false);
                setShowTooltip(false);
            } else {
                throw new Error('No refined text returned');
            }
        } catch (error) {
            console.error('Refinement failed:', error);
            setIsRefinementActive(false);
            setSelection(null);
            setShowTooltip(false);
        } finally {
            setIsProcessingRefinement(false);
            setRefinementInstruction('');
        }
    };

    const handleAcceptRefinement = () => {
        if (!selection || !proposedRefinement) return;
        const newContent = 
            editedContent.slice(0, selection.start) + 
            proposedRefinement + 
            editedContent.slice(selection.end);
        setEditedContent(newContent);
        setProposedRefinement(null);
        setSelection(null);
    };

    if (!isVisible || !draftData) return null;

    const handleSend = async () => {
        if (!draftData.recipientEmail || !editedContent.trim()) {
            setSendError('Missing recipient email or content');
            return;
        }

        setIsSending(true);
        setSendError(null);

        try {
            await onSendReply({
                content: editedContent,
                recipientEmail: draftData.recipientEmail,
                subject: draftData.subject,
                threadId: draftData.threadId
            });
            setSendSuccess(true);
            setTimeout(() => {
                onDismiss();
            }, 2000);
        } catch (error) {
            setSendError(error instanceof Error ? error.message : 'Failed to send reply');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="bg-black/60 border border-white/[0.08] rounded-xl overflow-hidden backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-2xl mx-auto my-6 relative">
            {/* Technical noise overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-[-1] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

            {/* Ambient Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/[0.03] rounded-full blur-[60px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05] bg-white/[0.01]">
                <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-neutral-200 dark:border-white/10 shadow-inner">
                        <Mail className="w-5 h-5 text-black/5 dark:text-black/50 dark:text-white/50" />
                    </div>
                    <div>
                        <h3 className="text-black dark:text-white font-bold text-[13px] tracking-wide uppercase mb-1">Email Draft</h3>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3 text-[11px] tracking-wide">
                                <span className="text-black/30 dark:text-white/30 uppercase font-bold">To</span>
                                <span className="text-black/80 dark:text-white/80 font-medium">{draftData.recipientName}</span>
                                {draftData.recipientEmail && (
                                    <span className="text-black/20 dark:text-white/20 font-medium truncate">[{draftData.recipientEmail}]</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`p-2.5 rounded-xl transition-all duration-300 ${isEditing ? 'bg-white text-black' : 'hover:bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 text-black/40 dark:text-white/40 hover:text-black dark:text-white'}`}
                        title={isEditing ? 'Save changes' : 'Edit message'}
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDismiss}
                        className="p-2.5 hover:bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 rounded-xl transition-all duration-300 text-black/40 dark:text-white/40 hover:text-black dark:text-white"
                        title="Cancel"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Protocol Metadata (Subject) */}
            <div className="px-6 py-4 bg-white/[0.005] border-b border-white/[0.03] flex items-center gap-4">
                <span className="text-[10px] font-bold text-black/20 dark:text-white/20 uppercase tracking-[0.1em] shrink-0">Subject</span>
                <span className="text-[12px] text-black/60 dark:text-white/60 font-medium truncate tracking-tight">{draftData.subject}</span>
            </div>

            <div className="p-7 relative" onMouseUp={handleMouseUp}>
                {isEditing ? (
                    <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full min-h-[180px] bg-white/[0.01] border border-white/[0.08] rounded-2xl p-6 text-black dark:text-white text-[15px] leading-[1.6] resize-none focus:outline-none focus:border-neutral-300 dark:border-white/20 transition-all duration-500 placeholder:text-black/10 dark:text-white/10 font-sans selection:bg-white selection:text-black"
                        placeholder="Type your message here..."
                    />
                ) : (
                    <div className="min-h-[120px] text-black/90 dark:text-white/90 text-[15px] whitespace-pre-wrap leading-[1.6] selection:bg-black/[0.010] dark:bg-white/20 tracking-tight">
                        {proposedRefinement && selection ? (
                            <>
                                {editedContent.slice(0, selection.start)}
                                <span className="text-black/20 dark:text-white/20 line-through decoration-red-500/30 decoration-1 bg-red-500/5">
                                    {selection.text}
                                </span>
                                <span className="text-black dark:text-white bg-blue-500/30 px-1 rounded-md border-b-2 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                                    {proposedRefinement}
                                </span>
                                {editedContent.slice(selection.end)}
                            </>
                        ) : (
                            editedContent
                        )}
                    </div>
                )}

                {/* World-Class AI Refinement Tooltip */}
                <AnimatePresence mode="wait">
                    {(showTooltip || isRefinementActive || proposedRefinement) && selection && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10, filter: 'blur(8px)' }}
                            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 0.98, y: 10, filter: 'blur(8px)' }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            style={{
                                position: 'fixed',
                                left: selection.rect.left + (selection.rect.width / 2),
                                top: selection.rect.top - 16,
                                transform: 'translate(-50%, -100%)',
                                zIndex: 100
                            }}
                            className="pointer-events-auto"
                        >
                            {!isRefinementActive && !proposedRefinement && (
                                <button
                                    onClick={() => setIsRefinementActive(true)}
                                    className="bg-black/80 border border-neutral-300 dark:border-white/20 rounded-full px-5 py-2.5 flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_20px_rgba(255,255,255,0.05)] backdrop-blur-2xl hover:bg-white dark:bg-black hover:border-white/30 transition-all group active:scale-95"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-blue-400 group-hover:animate-pulse" />
                                    <span className="text-black dark:text-white font-bold text-xs tracking-tight">Ask for changes</span>
                                    <div className="flex items-center gap-1 opacity-40">
                                        <div className="px-1.5 py-0.5 rounded border border-neutral-300 dark:border-white/20 bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 text-[9px] font-bold">Ctrl</div>
                                        <div className="px-1.5 py-0.5 rounded border border-neutral-300 dark:border-white/20 bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 text-[9px] font-bold">M</div>
                                    </div>
                                </button>
                            )}

                            {isRefinementActive && (
                                <div className="bg-black/90 border border-neutral-200 dark:border-white/10 rounded-[1.5rem] p-1.5 shadow-[0_30px_70px_rgba(0,0,0,0.9),0_0_30px_rgba(255,255,255,0.03)] w-[360px] backdrop-blur-3xl overflow-hidden ring-1 ring-white/10">
                                    <div className="relative group/input">
                                        <input
                                            autoFocus
                                            value={refinementInstruction}
                                            onChange={(e) => setRefinementInstruction(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRefinementSubmit();
                                                if (e.key === 'Escape') setIsRefinementActive(false);
                                            }}
                                            placeholder="Describe your changes"
                                            className="w-full bg-white/[0.04] text-black dark:text-white text-[14px] py-3.5 px-5 pr-14 rounded-2xl border border-white/[0.08] focus:outline-none focus:border-neutral-300 dark:border-white/20 transition-all placeholder:text-black/20 dark:text-white/20 font-medium tracking-tight"
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                            {refinementInstruction && !isProcessingRefinement && (
                                                <button 
                                                    onClick={() => setRefinementInstruction('')}
                                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-black/30 dark:text-white/30 hover:text-black dark:text-white transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button 
                                                onClick={handleRefinementSubmit}
                                                disabled={isProcessingRefinement || !refinementInstruction.trim()}
                                                className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-black dark:text-white hover:bg-blue-500 transition-all disabled:opacity-30 disabled:grayscale shadow-lg shadow-blue-500/20 active:scale-90"
                                            >
                                                {isProcessingRefinement ? (
                                                    <div className="w-4 h-4 border-[2.5px] border-neutral-300 dark:border-white/20 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <ArrowUp className="w-4 h-4 stroke-[3]" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {proposedRefinement && (
                                <div className="bg-black/90 border border-neutral-300 dark:border-white/20 rounded-2xl p-2 flex items-center gap-2 shadow-[0_30px_70px_rgba(0,0,0,0.9)] backdrop-blur-3xl ring-1 ring-white/10">
                                    <button 
                                        onClick={() => setProposedRefinement(null)}
                                        className="h-10 px-5 rounded-xl text-black/70 dark:text-white/70 hover:text-black dark:text-white hover:bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 text-[13px] font-bold transition-all flex items-center gap-3 active:scale-95"
                                    >
                                        Undo
                                        <div className="px-1.5 py-0.5 rounded border border-neutral-200 dark:border-white/10 bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 text-[9px] font-bold opacity-40 uppercase">Esc</div>
                                    </button>
                                    <div className="w-px h-6 bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10 mx-1" />
                                    <button 
                                        onClick={handleAcceptRefinement}
                                        className="h-10 px-5 bg-blue-600 hover:bg-blue-500 rounded-xl text-black dark:text-white text-[13px] font-bold transition-all flex items-center gap-4 shadow-xl shadow-blue-500/25 active:scale-95 active:translate-y-0.5"
                                    >
                                        Accept
                                        <div className="flex items-center gap-1 opacity-70">
                                            <div className="px-1.5 py-0.5 rounded border border-white/30 bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10 text-[9px] font-bold uppercase tracking-tighter">Ctrl</div>
                                            <CornerDownLeft className="w-3 h-3" />
                                        </div>
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Command Interface (Footer) */}
            <div className="px-8 py-5 bg-white/[0.02] border-t border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {sendError ? (
                        <div className="flex items-center gap-2 text-red-500 text-[10px] tracking-widest bg-red-500/5 px-4 py-2 rounded-xl border border-red-500/10 uppercase">
                            <X className="w-3 h-3" />
                            {sendError}
                        </div>
                    ) : sendSuccess ? (
                        <div className="flex items-center gap-2 text-black dark:text-white text-[10px] tracking-widest bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 px-4 py-2 rounded-xl border border-neutral-200 dark:border-white/10 uppercase">
                            <Check className="w-3 h-3" />
                            Sent successfully
                        </div>
                    ) : (
                        <span className="text-black/10 dark:text-white/10 text-[9px] tracking-tight uppercase">
                            Review and send
                        </span>
                    )}
                </div>

                <button
                    onClick={handleSend}
                    disabled={isSending || sendSuccess || !draftData.recipientEmail}
                    className={`group relative flex items-center gap-2.5 px-6 py-2 rounded-lg font-bold text-[10px] tracking-widest uppercase transition-all duration-500 transform active:scale-95 ${isSending || sendSuccess
                        ? 'bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 text-black/20 dark:text-white/20 cursor-not-allowed border border-neutral-200 dark:border-white/5'
                        : 'bg-white text-black hover:bg-neutral-200'
                        }`}
                >
                    {isSending ? (
                        <>
                            <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            Sending...
                        </>
                    ) : sendSuccess ? (
                        <>
                            <Check className="w-3.5 h-3.5" />
                            SENT
                        </>
                    ) : (
                        <>
                            <Send className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                            Send now
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
