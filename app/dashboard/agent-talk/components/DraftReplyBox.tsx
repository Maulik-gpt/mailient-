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
        <div className="bg-black/60 border border-white/[0.08] rounded-xl overflow-hidden backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-2xl mx-auto my-6 relative">
            {/* Technical noise overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-[-1] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

            {/* Ambient Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/[0.03] rounded-full blur-[60px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] bg-white/[0.02]">
                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/10">
                        <Mail className="w-4 h-4 text-white/40" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm tracking-tight uppercase mb-1.5">Email draft</h3>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2.5 text-[10px] tracking-widest">
                                <span className="text-white/20 uppercase">To:</span>
                                <span className="text-white/60">{draftData.recipientName}</span>
                                {draftData.recipientEmail && (
                                    <span className="text-white/20 truncate">[{draftData.recipientEmail}]</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`p-2 rounded-lg transition-all duration-300 ${isEditing ? 'bg-white text-black' : 'hover:bg-white/5 text-white/30 hover:text-white'}`}
                        title={isEditing ? 'Save changes' : 'Edit message'}
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onDismiss}
                        className="p-2 hover:bg-white/5 rounded-lg transition-all duration-300 text-white/30 hover:text-white"
                        title="Cancel"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Protocol Metadata (Subject) */}
            <div className="px-5 py-3 bg-white/[0.01] border-b border-white/[0.03] flex items-center gap-3">
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-tight shrink-0">Subject</span>
                <span className="text-[11px] text-white/50 truncate">{draftData.subject}</span>
            </div>

            {/* Neural Buffer Area (Content) */}
            <div className="p-5">
                {isEditing ? (
                    <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full min-h-[160px] bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 text-white/80 text-[14px] resize-none focus:outline-none transition-all duration-500 placeholder:text-white/10 leading-relaxed font-sans selection:bg-white selection:text-black"
                        placeholder="Message content..."
                    />
                ) : (
                    <div className="min-h-[100px] text-white/70 text-[14px] whitespace-pre-wrap leading-relaxed selection:bg-white selection:text-black">
                        {editedContent}
                    </div>
                )}
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
                        <div className="flex items-center gap-2 text-white text-[10px] tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/10 uppercase">
                            <Check className="w-3 h-3" />
                            Sent successfully
                        </div>
                    ) : (
                        <span className="text-white/10 text-[9px] tracking-tight uppercase">
                            Review and send
                        </span>
                    )}
                </div>

                <button
                    onClick={handleSend}
                    disabled={isSending || sendSuccess || !draftData.recipientEmail}
                    className={`group relative flex items-center gap-2.5 px-6 py-2 rounded-lg font-bold text-[10px] tracking-widest uppercase transition-all duration-500 transform active:scale-95 ${isSending || sendSuccess
                        ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
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
