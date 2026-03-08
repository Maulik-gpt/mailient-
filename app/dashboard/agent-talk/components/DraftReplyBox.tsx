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
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto my-6">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#0f0f0f] border-b border-[#2a2a2a]">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Mail className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-base mb-0.5">Draft Reply</h3>
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2 text-xs text-white/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40"></span>
                                <span className="font-medium">To:</span>
                                <span className="text-white/60">{draftData.recipientName}</span>
                                {draftData.recipientEmail && (
                                    <span className="text-white/30 truncate">&lt;{draftData.recipientEmail}&gt;</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`p-2 rounded-lg transition-all duration-200 ${isEditing ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/5 text-white/40 hover:text-white'}`}
                        title={isEditing ? 'Save edits' : 'Edit draft'}
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDismiss}
                        className="p-2 hover:bg-white/5 rounded-lg transition-all duration-200 text-white/40 hover:text-white"
                        title="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Subject Line */}
            <div className="px-6 py-3 bg-[#0a0a0a]/50 flex items-center gap-3">
                <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Subject</span>
                <span className="text-sm text-white/70 font-medium">{draftData.subject}</span>
            </div>

            {/* Content Area */}
            <div className="p-6 bg-[#0f0f0f]/30">
                {isEditing ? (
                    <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full min-h-[180px] bg-[#050505] border border-white/10 rounded-xl p-4 text-white text-[15px] resize-none focus:outline-none focus:border-blue-500/50 transition-all duration-300 placeholder:text-white/20 leading-relaxed shadow-inner"
                        placeholder="Type your message..."
                    />
                ) : (
                    <div className="min-h-[120px] text-white/80 text-[15px] whitespace-pre-wrap leading-[1.8] font-sans selection:bg-blue-500/30">
                        {editedContent}
                    </div>
                )}
            </div>

            {/* Footer with White Send Button */}
            <div className="px-6 py-4 bg-[#0f0f0f] border-t border-[#2a2a2a] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {sendError ? (
                        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 px-3 py-1.5 rounded-full border border-red-400/20">
                            <X className="w-3 h-3" />
                            {sendError}
                        </div>
                    ) : sendSuccess ? (
                        <div className="flex items-center gap-2 text-green-400 text-xs bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
                            <Check className="w-3 h-3" />
                            Email sent successfully
                        </div>
                    ) : (
                        <span className="text-white/30 text-[11px] font-medium italic">
                            Review and click Send to confirm
                        </span>
                    )}
                </div>

                <button
                    onClick={handleSend}
                    disabled={isSending || sendSuccess || !draftData.recipientEmail}
                    className={`group relative flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 transform active:scale-95 ${isSending || sendSuccess
                            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                            : 'bg-white text-black hover:bg-neutral-200 shadow-[0_4px_15px_rgba(255,255,255,0.15)] hover:shadow-[0_8px_25px_rgba(255,255,255,0.25)]'
                        }`}
                >
                    {isSending ? (
                        <>
                            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            Sending...
                        </>
                    ) : sendSuccess ? (
                        <>
                            <Check className="w-4 h-4" />
                            Sent
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                            Send
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
