'use client';

import React, { useState, useEffect } from 'react';
import { Send, X, Edit2, User, Mail } from 'lucide-react';

interface DraftReplyBoxProps {
    draftData: {
        content: string;
        recipientName: string;
        recipientEmail: string;
        senderName: string;
        originalEmailId?: string;
        subject: string;
    } | null;
    onSendReply: (draftData: {
        content: string;
        recipientEmail: string;
        subject: string;
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
                subject: draftData.subject
            });
            setSendSuccess(true);
            setTimeout(() => {
                onDismiss();
            }, 2000);
        } catch (error) {
            setSendError(error instanceof Error ? error.message : 'Failed to send email');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0f0f0f] border-b border-[#2a2a2a]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/5">
                        <Mail className="w-4 h-4 text-white/60" />
                    </div>
                    <div>
                        <h3 className="text-white font-medium text-sm">Draft Reply</h3>
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2 text-xs text-white/50">
                                <span className="w-8 opacity-60">From:</span>
                                <span>{draftData.senderName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/50">
                                <span className="w-8 opacity-60">To:</span>
                                <span>{draftData.recipientName}</span>
                                {draftData.recipientEmail && (
                                    <span className="text-white/30 truncate max-w-[150px]">&lt;{draftData.recipientEmail}&gt;</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title={isEditing ? 'Save edits' : 'Edit draft'}
                    >
                        <Edit2 className={`w-4 h-4 ${isEditing ? 'text-white' : 'text-white/50'}`} />
                    </button>
                    <button
                        onClick={onDismiss}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Dismiss"
                    >
                        <X className="w-4 h-4 text-white/50" />
                    </button>
                </div>
            </div>

            {/* Subject Line */}
            <div className="px-4 py-2 border-b border-[#2a2a2a] flex items-center gap-2">
                <span className="text-xs text-white/40">Subject:</span>
                <span className="text-sm text-white/70">{draftData.subject}</span>
            </div>

            {/* Content */}
            <div className="p-4">
                {isEditing ? (
                    <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full min-h-[150px] bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-white/20 transition-colors"
                        placeholder="Edit your reply..."
                    />
                ) : (
                    <div className="min-h-[100px] text-white/80 text-sm whitespace-pre-wrap leading-relaxed">
                        {editedContent}
                    </div>
                )}
            </div>

            {/* Footer with Send Button */}
            <div className="px-4 py-3 bg-[#0f0f0f] border-t border-[#2a2a2a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {sendError && (
                        <span className="text-white/40 text-xs">{sendError}</span>
                    )}
                    {sendSuccess && (
                        <span className="text-white text-xs flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Email sent successfully!
                        </span>
                    )}
                </div>
                <button
                    onClick={handleSend}
                    disabled={isSending || sendSuccess || !draftData.recipientEmail}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${isSending || sendSuccess
                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                        : !draftData.recipientEmail
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-black hover:bg-white/90'
                        }`}
                >
                    {isSending ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sending...
                        </>
                    ) : sendSuccess ? (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Sent!
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            Send Reply
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
