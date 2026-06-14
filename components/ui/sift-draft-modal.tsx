'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Copy, Send, Loader2, Link as LinkIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { VoiceProfileButton } from '@/components/ui/voice-profile-button';

interface SiftDraftModalProps {
    draftData: {
        content: string;
        recipientName: string;
        recipientEmail: string;
        senderName: string;
        subject: string;
        threadId?: string;
    } | null;
    onSendReply: (draftData: any) => Promise<void>;
    onDismiss: () => void;
    isVisible: boolean;
    /** Optional: re-generate this draft using the (updated) voice profile. */
    onRedraft?: () => void;
}

export function SiftDraftModal({ draftData, onSendReply, onDismiss, isVisible, onRedraft }: SiftDraftModalProps) {
    const [draftContent, setDraftContent] = useState('');
    const [draftSubject, setDraftSubject] = useState('');
    const [isSending, setIsSending] = useState(false);
    const draftContentEditorRef = useRef<HTMLDivElement>(null);
    const prevContentRef = useRef<string>('');
    const attachmentInputRef = useRef<HTMLInputElement>(null);
    const [attachments, setAttachments] = useState<File[]>([]);

    useEffect(() => {
        if (draftData) {
            setDraftSubject(draftData.subject || '');
            setDraftContent(draftData.content || '');
            setAttachments([]);
            if (draftContentEditorRef.current) {
                draftContentEditorRef.current.innerHTML = draftData.content || '';
            }
            prevContentRef.current = draftData.content || '';
        }
    }, [draftData]);

    useEffect(() => {
        const el = draftContentEditorRef.current;
        if (!el || !draftData) return;
        const next = draftData.content || '';
        if (el.innerHTML === next) return;

        const prev = prevContentRef.current;
        // Streaming append: the new content extends the old. Wrap ONLY the
        // freshly-arrived tail in a blur-in span so it eases from blurred to
        // sharp as the model writes — word-by-word fade, not a hard cut.
        if (next.length > prev.length && next.startsWith(prev) && prev.length > 0) {
            const tail = next.slice(prev.length);
            el.innerHTML = prev + `<span class="stream-blur-in">${tail}</span>`;
        } else {
            // Initial load, reset, or user edit — set directly, no animation.
            el.innerHTML = next;
        }
        prevContentRef.current = next;
    }, [draftData?.content]);

    if (!isVisible || !draftData) return null;

    const handleSend = async () => {
        setIsSending(true);
        try {
            await onSendReply({
                ...draftData,
                content: draftContentEditorRef.current?.innerHTML || draftContent,
                subject: draftSubject
            });
            toast.success('Reply sent successfully');
            setTimeout(() => onDismiss(), 500);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to send');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 transition-all duration-500 overflow-y-auto opacity-100 pointer-events-auto">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onDismiss} />
            
            {/* Editor Container */}
            <div 
                className="bg-[#fafafa] dark:bg-[#1C1C1C] border border-black/[0.05] dark:border-transparent rounded-[24px] w-full max-w-3xl flex flex-col shadow-2xl relative z-10 mx-auto overflow-hidden animate-in zoom-in-95 fade-in duration-300"
                style={{ maxHeight: '85vh' }}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-8 py-5">
                    <div className="flex items-center gap-4">
                        <span className="text-black/40 dark:text-zinc-400 font-medium tracking-wide">Email</span>
                        <VoiceProfileButton onApplied={onRedraft} />
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Attachment Picker */}
                        <input
                            ref={attachmentInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files) {
                                    const newFiles = Array.from(e.target.files);
                                    const tooLarge = newFiles.some(f => f.size > 15 * 1024 * 1024);
                                    if (tooLarge) {
                                        toast.error("File size limit is 15MB. Please choose a smaller file.");
                                        return;
                                    }
                                    setAttachments(prev => [...prev, ...newFiles]);
                                }
                            }}
                        />
                        <button 
                            onClick={() => attachmentInputRef.current?.click()}
                            className="p-2 hover:bg-black/5 dark:hover:bg-neutral-800 rounded-lg text-black/40 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors relative"
                            title="Attach files"
                        >
                            <Paperclip className="w-[18px] h-[18px]" strokeWidth={1.5} />
                            {attachments.length > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">{attachments.length}</span>
                            )}
                        </button>
                        <button 
                            onClick={() => {
                                const tempDiv = document.createElement('div');
                                tempDiv.innerHTML = draftContentEditorRef.current?.innerHTML || draftContent;
                                navigator.clipboard.writeText(tempDiv.innerText);
                                toast.success('Copied to clipboard');
                            }}
                            className="p-2 hover:bg-black/5 dark:hover:bg-neutral-800 rounded-lg text-black/40 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
                        >
                            <Copy className="w-[18px] h-[18px]" strokeWidth={1.5} />
                        </button>
                        <button 
                            onClick={handleSend}
                            disabled={isSending}
                            className={cn("p-2 hover:bg-black/5 dark:hover:bg-neutral-800 rounded-lg text-black/40 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors", isSending && "opacity-50")}
                        >
                            {isSending ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Send className="w-[18px] h-[18px]" strokeWidth={1.5} />}
                        </button>
                    </div>
                </div>

                {/* Subject Line */}
                <div className="px-8 pb-4 flex items-center gap-4 border-b border-black/[0.06] dark:border-white/[0.04]">
                    <span className="text-black dark:text-white font-bold bg-transparent border-none">Subject</span>
                    <input 
                        value={draftSubject}
                        onChange={(e) => setDraftSubject(e.target.value)}
                        className="bg-transparent border-none focus:outline-none text-black/80 dark:text-zinc-300 w-full"
                        placeholder="Email Subject"
                    />
                </div>

                {/* Content Area */}
                <div className="px-8 py-6 flex-1 min-h-[350px] relative overflow-y-auto draft-editor-scrollbar">
                    {draftData.content === '' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <Loader2 className="w-6 h-6 text-black/40 dark:text-neutral-500 animate-spin mb-3" />
                            <p className="text-xs font-medium text-black/50 dark:text-zinc-500 tracking-tight">Crafting...</p>
                        </div>
                    ) : (
                        <>
                            <div 
                                ref={draftContentEditorRef}
                                contentEditable
                                suppressContentEditableWarning
                                className="w-full h-full text-black dark:text-zinc-100 focus:outline-none leading-[1.8] font-[400] text-[15px] selection:bg-blue-500/30 font-sans [&_a]:text-[#60a5fa] [&_a]:underline [&_a]:cursor-pointer [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_p]:mb-4 [&_p:last-child]:mb-0"
                                onInput={(e) => setDraftContent(e.currentTarget.innerHTML)}
                                style={{ minHeight: '200px' }}
                            />
                            {/* Attachment chips */}
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
                                    {attachments.map((file, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-black/[0.04] dark:bg-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-black/70 dark:text-zinc-300">
                                            <Paperclip className="w-3.5 h-3.5 text-zinc-500" />
                                            <span className="max-w-[140px] truncate">{file.name}</span>
                                            <span className="text-zinc-600 text-xs">({(file.size / 1024).toFixed(0)}KB)</span>
                                            <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 text-zinc-500 hover:text-red-400 transition-colors">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
