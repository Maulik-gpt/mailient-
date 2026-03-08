'use client';

import React, { useState, useEffect } from 'react';
import { Copy, X, Edit2, Mail, Send, Check } from 'lucide-react';

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

    useEffect(() => {
        if (draftData?.content) {
            setEditedContent(draftData.content);
            setIsEditing(false);
            setSendSuccess(false);
            setSendError(null);
        }
    }, [draftData]);

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
        <div className="bg-black/60 border border-white/[0.08] rounded-[24px] overflow-hidden shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-2xl mx-auto my-8 relative">
            {/* Technical noise overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-[-1] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

            {/* Ambient Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/[0.03] rounded-full blur-[60px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/[0.05] bg-white/[0.02]">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/10 shadow-2xl">
                        <Mail className="w-5 h-5 text-white/40" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm tracking-widest uppercase font-mono mb-1.5">DRAFT_PAYLOAD</h3>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2.5 text-[10px] font-mono tracking-widest">
                                <span className="text-white/20 uppercase">Target:</span>
                                <span className="text-white/60">{draftData.recipientName}</span>
                                {draftData.recipientEmail && (
                                    <span className="text-white/20 truncate">[{draftData.recipientEmail}]</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`p-2.5 rounded-xl transition-all duration-300 ${isEditing ? 'bg-white text-black' : 'hover:bg-white/5 text-white/30 hover:text-white'}`}
                        title={isEditing ? 'COMMIT_CHANGES' : 'EDIT_STREAM'}
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDismiss}
                        className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-300 text-white/30 hover:text-white"
                        title="TERMINATE"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Protocol Metadata (Subject) */}
            <div className="px-8 py-4 bg-white/[0.01] border-b border-white/[0.03] flex items-center gap-4">
                <span className="text-[10px] font-mono font-bold text-white/20 uppercase tracking-[0.2em] shrink-0">Subject_Stream</span>
                <span className="text-xs text-white/50 font-mono truncate">{draftData.subject}</span>
            </div>

            {/* Neural Buffer Area (Content) */}
            <div className="p-8">
                {isEditing ? (
                    <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full min-h-[200px] bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 text-white/80 text-[15px] resize-none focus:outline-none focus:border-white/20 transition-all duration-500 placeholder:text-white/10 leading-relaxed font-sans selection:bg-white selection:text-black"
                        placeholder="Initialize message content..."
                    />
                ) : (
                    <div className="min-h-[140px] text-white/70 text-[15px] whitespace-pre-wrap leading-[1.8] font-sans selection:bg-white selection:text-black">
                        {editedContent}
                    </div>
                )}
            </div>

            {/* Command Interface (Footer) */}
            <div className="px-8 py-5 bg-white/[0.02] border-t border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {sendError ? (
                        <div className="flex items-center gap-2 text-red-500 text-[10px] font-mono tracking-widest bg-red-500/5 px-4 py-2 rounded-xl border border-red-500/10 uppercase">
                            <X className="w-3 h-3" />
                            {sendError}
                        </div>
                    ) : sendSuccess ? (
                        <div className="flex items-center gap-2 text-white text-[10px] font-mono tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/10 uppercase">
                            <Check className="w-3 h-3" />
                            Stream_Delivered
                        </div>
                    ) : (
                        <span className="text-white/10 text-[9px] font-mono tracking-[0.2em] uppercase">
                            READY_FOR_TRANSMISSION
                        </span>
                    )}
                </div>

                <button
                    onClick={handleSend}
                    disabled={isSending || sendSuccess || !draftData.recipientEmail}
                    className={`group relative flex items-center gap-3 px-10 py-3 rounded-xl font-bold text-[11px] font-mono tracking-widest uppercase transition-all duration-500 transform active:scale-95 ${isSending || sendSuccess
                        ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                        : 'bg-white text-black hover:scale-[1.02] shadow-[0_0_30px_rgba(255,255,255,0.15)]'
                        }`}
                >
                    {isSending ? (
                        <>
                            <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            SENDING...
                        </>
                    ) : sendSuccess ? (
                        <>
                            <Check className="w-3.5 h-3.5" />
                            SENT
                        </>
                    ) : (
                        <>
                            <Send className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                            DISPATCH
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
