'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toPng } from 'html-to-image';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import React from 'react';
import { Button } from '@/components/ui/button';

// Simple markdown renderer for bold text
const renderMarkdown = (text: string): string => {
    if (!text) return text;

    // Replace **bold** with <strong>bold</strong>
    let result = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Replace - bullet points with HTML list items
    result = result.replace(/^\s*-\s*(.*)$/gm, '<li>$1</li>');

    // Wrap consecutive list items in <ul> tags
    result = result.replace(/((<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');

    return result;
};
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';
import { ArrowLeft, Sparkles, Plus, Search, X, Edit, Trash, Save, Folder, Tag, Clock, MoreVertical, FileText, Pen, NotebookPen, AlertTriangle, Share2, Image, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UsageLimitModal } from '@/components/ui/usage-limit-modal';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Note {
    id: string;
    subject: string;
    content: string;
    createdAt: string;
    updatedAt?: string;
    tags?: string[];
}

export default function NoteDetailPage() {
    const params = useParams();
    const { data: session } = useSession();
    const router = useRouter();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingNote, setEditingNote] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editSubject, setEditSubject] = useState('');
    const [showNewNoteForm, setShowNewNoteForm] = useState(false);
    const [newNoteSubject, setNewNoteSubject] = useState('');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [isShareOptionsOpen, setIsShareOptionsOpen] = useState(false);
    const [isImageShareOpen, setIsImageShareOpen] = useState(false);
    const imagePreviewRef = useRef<HTMLDivElement>(null);
    const [isUsageLimitModalOpen, setIsUsageLimitModalOpen] = useState(false);
    const [usageLimitModalData, setUsageLimitModalData] = useState<{
        featureName: string;
        currentUsage: number;
        limit: number;
        period: 'daily' | 'monthly';
        currentPlan: 'starter' | 'pro' | 'none';
    } | null>(null);

    const getNoteLink = useCallback((id: string) => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/i/notes/${id}`;
        }
        return `https://mailient.com/i/notes/${id}`;
    }, []);

    const sharePlatforms = [
        {
            name: 'WhatsApp',
            icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
            ),
            color: 'hover:text-[#25D366] hover:bg-[#25D366]/10',
            borderColor: 'hover:border-[#25D366]/50',
            getMessage: (n: Note) => `Hey! Thought this would be useful for our team. It's about *${n.subject}*:\n\n${n.content}\n\nCheck it out here: ${getNoteLink(n.id)}`,
            getUrl: (msg: string) => `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`
        },
        {
            name: 'X (Post)',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.292 19.49h2.039L6.486 3.24H4.298l13.311 17.403z" />
                </svg>
            ),
            color: 'hover:text-white hover:bg-white/10',
            borderColor: 'hover:border-white/50',
            getMessage: (n: Note) => `Just dropped some new thoughts on ${n.subject}. Check it out on Mailient! 🚀\n\n${getNoteLink(n.id)}\n\n#Mailient #Productivity #Notes`,
            getUrl: (msg: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`
        },
        {
            name: 'X (DM)',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.292 19.49h2.039L6.486 3.24H4.298l13.311 17.403z" />
                </svg>
            ),
            color: 'hover:text-white hover:bg-white/10',
            borderColor: 'hover:border-white/50',
            getMessage: (n: Note) => `Yo, check this out. It's a note I'm working on: ${n.subject}\n\n${getNoteLink(n.id)}`,
            getUrl: (msg: string) => `https://twitter.com/messages/compose?text=${encodeURIComponent(msg)}`
        },
        {
            name: `Gmail (${session?.user?.email?.split('@')[0] || 'User'})`,
            icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 4.5v15c0 .85-.65 1.5-1.5 1.5H21V7.387l-9 6.463-9-6.463V21H1.5C.65 21 0 20.35 0 19.5v-15c0-.425.162-.8.431-1.068C.7 3.16 1.075 3 1.5 3H3.6L12 9l8.4-6H22.5c.425 0 .8.16 1.069.432.269.268.431.643.431 1.068z" />
                </svg>
            ),
            color: 'hover:text-[#EA4335] hover:bg-[#EA4335]/10',
            borderColor: 'hover:border-[#EA4335]/50',
            getMessage: (n: Note) => `Hi team,\n\nI've compiled some notes on ${n.subject} that might be helpful for our next sync:\n\n${n.content}\n\nYou can access the full version here: ${getNoteLink(n.id)}\n\nBest regards,\n${session?.user?.name || 'Mailient User'}`,
            getUrl: (msg: string, n: Note) => `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=&su=${encodeURIComponent(`Note: ${n.subject}`)}&body=${encodeURIComponent(msg)}`
        },
        {
            name: 'LinkedIn',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
            ),
            color: 'hover:text-[#0A66C2] hover:bg-[#0A66C2]/10',
            borderColor: 'hover:border-[#0A66C2]/50',
            getMessage: (n: Note) => `Excited to share some progress on ${n.subject}. Collaboration makes all the difference! ${getNoteLink(n.id)}`,
            getUrl: (msg: string, n: Note) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getNoteLink(n.id))}`
        },
        {
            name: 'ChatGPT',
            icon: (
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10 10 10 0 0 1-10-10A10 10 0 0 1 12 2z" />
                    <path d="M14.07 10.14c-.38-.49-.9-.85-1.5-.96-.6-.11-1.23-.05-1.8.18s-1.05.62-1.4 1.13c-.35.51-.51 1.12-.46 1.73s.27 1.18.63 1.63c.36.45.85.78 1.41.95.56.17 1.16.18 1.73.04s1.08-.44 1.46-.86" />
                    <path d="M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z" />
                    <path d="M12 15.5V12m0 0l-1.5-1.5M12 12l1.5-1.5M12 8.5V12m0 0l-1.5 1.5M12 12l1.5 1.5" />
                </svg>
            ),
            color: 'hover:text-[#10A37F] hover:bg-[#10A37F]/10',
            borderColor: 'hover:border-[#10A37F]/50',
            getMessage: (n: Note) => `Hey! Could you help me refine these ideas? Here's my current note on ${n.subject}:\n\n${n.content}\n\nPlease analyze it and suggest improvements.`,
            getUrl: (msg: string) => `https://chatgpt.com/?q=${encodeURIComponent(msg)}`
        }
    ];

    const stripMarkdown = (text: string) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="text-neutral-300 italic">$1</em>')
            .replace(/\n/g, '<br />');
    };

    const handleCopyImage = async () => {
        if (!imagePreviewRef.current) return;

        try {
            toast.loading('Preparing image...');
            const dataUrl = await toPng(imagePreviewRef.current, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: '#0a0a0a',
                skipFonts: true,
            });

            const response = await fetch(dataUrl);
            const blob = await response.blob();

            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob
                })
            ]);

            toast.dismiss();
            toast.success('Image copied to clipboard!');
            setIsImageShareOpen(false);
        } catch (error) {
            console.error('Error copying image:', error);
            toast.dismiss();
            toast.error('Failed to copy image');
        }
    };

    // Load notes from Supabase on initial render
    useEffect(() => {
        const noteId = Array.isArray(params?.id) ? params.id[0] : params?.id;

        const fetchNotes = async () => {
            try {
                const response = await fetch('/api/notes');
                if (response.ok) {
                    const data = await response.json();
                    const formattedNotes = (data.notes || []).map((note: any) => ({
                        id: note.id,
                        subject: note.subject,
                        content: note.content,
                        createdAt: note.created_at,
                        updatedAt: note.updated_at,
                        tags: note.tags || []
                    }));
                    setNotes(formattedNotes);

                    // Find note with matching ID
                    const note = formattedNotes.find((n: Note) => n.id === noteId);
                    if (note) {
                        setSelectedNote(note);
                        setEditSubject(note.subject);
                        setEditContent(note.content);
                    } else {
                        // Only redirect if we're sure the note doesn't exist
                        // (not just because of a loading issue)
                        console.warn(`Note with ID ${noteId} not found in fetched notes`);
                        setTimeout(() => {
                            router.push('/i/notes');
                        }, 100);
                    }
                } else {
                    console.error('Failed to fetch notes:', response.status);
                    // Don't immediately redirect on fetch errors - let user see error state
                }
            } catch (error) {
                console.error('Error fetching notes:', error);
                // Don't immediately redirect on errors - let user see error state
            } finally {
                setLoading(false);
            }
        };

        if (noteId) {
            fetchNotes();
        } else {
            setLoading(false);
        }
    }, [params?.id]);

    const handleEditNote = () => {
        if (selectedNote) {
            setEditingNote(selectedNote.id);
            setEditContent(selectedNote.content);
            setEditSubject(selectedNote.subject);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingNote || !selectedNote) return;

        try {
            const response = await fetch('/api/notes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    noteId: editingNote,
                    subject: editSubject,
                    content: editContent
                })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (data?.error === 'limit_reached') {
                    setUsageLimitModalData({
                        featureName: 'AI Notes',
                        currentUsage: data.usage || 0,
                        limit: data.limit || 0,
                        period: data.period || 'monthly',
                        currentPlan: data.planType || 'starter'
                    });
                    setIsUsageLimitModalOpen(true);
                    return;
                }
                toast.error(data?.error || 'Failed to update note');
                return;
            }

            // Refresh notes to get updated data
            const refreshResponse = await fetch('/api/notes');
            if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                const formattedNotes = (refreshData.notes || []).map((note: any) => ({
                    id: note.id,
                    subject: note.subject,
                    content: note.content,
                    createdAt: note.created_at,
                    updatedAt: note.updated_at,
                    tags: note.tags || []
                }));
                setNotes(formattedNotes);

                // Find the updated note
                const updatedNote = formattedNotes.find((n: Note) => n.id === editingNote);
                if (updatedNote) {
                    setSelectedNote(updatedNote);
                }
            }

            setEditingNote(null);
            toast.success('Note updated successfully!');
        } catch (error) {
            console.error('Error updating note:', error);
            toast.error('Error updating note');
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        try {
            const response = await fetch('/api/notes', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ noteId })
            });

            if (response.ok) {
                toast.success('Note deleted successfully!');
                router.push('/i/notes');
            } else {
                toast.error('Failed to delete note');
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            toast.error('Error deleting note');
        }
    };

    const handleCreateNote = async () => {
        if (!newNoteSubject.trim() && !newNoteContent.trim()) {
            toast.error('Please fill in either subject or content');
            return;
        }

        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: newNoteSubject.trim() || 'Untitled Note',
                    content: newNoteContent.trim(),
                    tags: []
                })
            });

            if (response.ok) {
                const data = await response.json();
                setShowNewNoteForm(false);
                setNewNoteSubject('');
                setNewNoteContent('');
                setSelectedNote(data.note);
                router.push(`/i/notes/${data.note.id}`);
                toast.success('New note created successfully!');
            } else {
                toast.error('Failed to create note');
            }
        } catch (error) {
            console.error('Error creating note:', error);
            toast.error('Error creating note');
        }
    };

    return (
        <>
            <UsageLimitModal
                isOpen={isUsageLimitModalOpen}
                onClose={() => setIsUsageLimitModalOpen(false)}
                featureName={usageLimitModalData?.featureName || 'AI Notes'}
                currentUsage={usageLimitModalData?.currentUsage || 0}
                limit={usageLimitModalData?.limit || 0}
                period={usageLimitModalData?.period || 'monthly'}
                currentPlan={usageLimitModalData?.currentPlan || 'starter'}
            />
            <div className={cn("min-h-screen bg-[#000000] text-white transition-all duration-500", (isDeleteDialogOpen || isShareDialogOpen || isShareOptionsOpen || isImageShareOpen) && "pause-animations")} style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Satoshi', sans-serif" }}>
                {/* Mailient Sidebar */}
                <HomeFeedSidebar />

                {/* Main Content Area - Full Width */}
                <div className="flex-1 flex flex-col ml-16">
                    <div className="border-b border-neutral-800 px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push('/i/notes')}
                                className="p-1 hover:bg-neutral-900 rounded flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm text-neutral-400">Back to Notes</span>
                            </button>
                        </div>
                        <span className="text-sm text-neutral-400">
                            {selectedNote ?
                                `Last updated: ${new Date(selectedNote.updatedAt || selectedNote.createdAt).toLocaleString()}` :
                                'Loading...'}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                            </div>
                        ) : selectedNote ? (
                            <div className="max-w-4xl mx-auto w-full">
                                <div className="mb-6">
                                    {editingNote === selectedNote.id ? (
                                        <input
                                            type="text"
                                            value={editSubject}
                                            onChange={(e) => setEditSubject(e.target.value)}
                                            placeholder="Note title..."
                                            className="w-full bg-transparent text-3xl font-medium outline-none border-none text-white placeholder-neutral-500 mb-4"
                                            autoFocus
                                        />
                                    ) : (
                                        <h1 className="text-3xl font-medium text-white mb-2">{selectedNote.subject || 'Untitled Note'}</h1>
                                    )}
                                    <div className="text-sm text-neutral-500">
                                        Created {new Date(selectedNote.createdAt).toLocaleDateString()}
                                        {selectedNote.updatedAt && selectedNote.updatedAt !== selectedNote.createdAt &&
                                            ` • Updated ${new Date(selectedNote.updatedAt).toLocaleDateString()}`}
                                    </div>
                                </div>

                                <div className="prose prose-invert max-w-none">
                                    {editingNote === selectedNote.id ? (
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="w-full bg-transparent text-neutral-200 p-0 outline-none border-none resize-none h-96 text-lg leading-relaxed"
                                            autoFocus
                                        />
                                    ) : (
                                        <div className="whitespace-pre-wrap text-lg leading-relaxed text-neutral-200 min-h-[500px] prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNote.content) }} />
                                    )}
                                </div>

                                {editingNote === selectedNote.id ? (
                                    <div className="flex gap-3 mt-8">
                                        <Button
                                            onClick={handleSaveEdit}
                                            className="h-10 px-6 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors"
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Changes
                                        </Button>
                                        <Button
                                            onClick={() => setEditingNote(null)}
                                            className="h-10 px-6 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 font-medium rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-3 mt-8">
                                        <Button
                                            onClick={handleEditNote}
                                            className="h-10 px-6 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit Note
                                        </Button>
                                        <Button
                                            onClick={() => setIsShareDialogOpen(true)}
                                            className="h-10 px-6 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white font-medium rounded-lg transition-all border border-blue-500/20 hover:border-blue-500"
                                        >
                                            <Share2 className="w-4 h-4 mr-2" />
                                            Share Note
                                        </Button>
                                        <Button
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                            className="h-10 px-6 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-medium rounded-lg transition-all border border-red-500/20 hover:border-red-500"
                                        >
                                            <Trash className="w-4 h-4 mr-2" />
                                            Delete Note
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-neutral-800 rounded-2xl flex items-center justify-center">
                                        <Pen className="w-8 h-8 text-yellow-500" />
                                    </div>
                                    <h3 className="text-xl font-medium text-neutral-300 mb-2">Note not found</h3>
                                    <p className="text-neutral-500 max-w-md mx-auto">
                                        The requested note could not be found. It may have been deleted.
                                    </p>
                                    <Button
                                        onClick={() => router.push('/i/notes')}
                                        className="mt-6 h-10 px-6 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors"
                                    >
                                        Return to Notes
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Share Type Selection Dialog */}
                <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                    <DialogContent className="bg-neutral-900/90 backdrop-blur-2xl border-neutral-800 text-white rounded-[2.5rem] sm:max-w-lg p-0 overflow-hidden shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)]">
                        <DialogHeader className="p-6 pb-2">
                            <DialogTitle className="text-xl font-medium text-center">Share Note</DialogTitle>
                            <DialogDescription className="text-neutral-400 text-center">
                                Choose how you want to share this note
                            </DialogDescription>
                        </DialogHeader>

                        <div className="px-4 py-2 flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    setIsShareDialogOpen(false);
                                    setIsShareOptionsOpen(true);
                                }}
                                className="w-full h-14 flex items-center gap-4 px-4 bg-neutral-800/50 hover:bg-blue-500/10 text-neutral-200 hover:text-blue-400 rounded-2xl transition-all border border-transparent hover:border-blue-500/20 group/opt"
                            >
                                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center transition-colors group-hover/opt:bg-blue-500/20">
                                    <Copy className="w-5 h-5" />
                                </div>
                                <span className="font-medium">Share as text</span>
                            </button>

                            <button
                                onClick={() => {
                                    setIsShareDialogOpen(false);
                                    setIsImageShareOpen(true);
                                }}
                                className="w-full h-14 flex items-center gap-4 px-4 bg-neutral-800/50 hover:bg-blue-500/10 text-neutral-200 hover:text-blue-400 rounded-2xl transition-all border border-transparent hover:border-blue-500/20 group/opt"
                            >
                                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center transition-colors group-hover/opt:bg-blue-500/20">
                                    <Image className="w-5 h-5" />
                                </div>
                                <span className="font-medium">Share as image</span>
                            </button>
                        </div>

                        <div className="mt-2 border-t border-neutral-800 p-4">
                            <Button
                                variant="ghost"
                                onClick={() => setIsShareDialogOpen(false)}
                                className="w-full h-12 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition-all border-none font-medium"
                            >
                                Cancel
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Share as Image Preview Dialog */}
                <Dialog open={isImageShareOpen} onOpenChange={setIsImageShareOpen}>
                    <DialogContent className="bg-neutral-900/95 backdrop-blur-3xl border-neutral-800 text-white rounded-[2.5rem] sm:max-w-2xl p-0 overflow-hidden shadow-[0_0_80px_-20px_rgba(59,130,246,0.3)]">
                        <DialogHeader className="p-8 pb-4">
                            <DialogTitle className="text-2xl font-semibold text-center bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent italic">Image Preview</DialogTitle>
                            <DialogDescription className="text-neutral-400 text-center text-sm mt-1">
                                This is how your note will look when shared as an image.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="px-8 pb-4 max-h-[60vh] overflow-y-auto translucent-scrollbar">
                            <div
                                ref={imagePreviewRef}
                                className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-10 shadow-2xl"
                            >
                                <div className="flex justify-between items-start mb-8">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-white/50 mb-4">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                                <Sparkles className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Mailient Sift</span>
                                        </div>
                                        <h2 className="text-3xl font-bold tracking-tight text-white leading-tight">
                                            {selectedNote?.subject || 'Untitled Note'}
                                        </h2>
                                        <p className="text-xs text-neutral-500 font-medium">
                                            {selectedNote && new Date(selectedNote.createdAt).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Note</span>
                                    </div>
                                </div>

                                <div className="h-px w-full bg-gradient-to-r from-transparent via-neutral-800 to-transparent mb-8" />

                                <div
                                    className="text-lg leading-[1.6] text-neutral-400 whitespace-pre-wrap selection:bg-blue-500/30"
                                    dangerouslySetInnerHTML={{
                                        __html: selectedNote ? stripMarkdown(selectedNote.content) : ''
                                    }}
                                />

                                <div className="mt-12 flex items-center justify-between opacity-50">
                                    <span className="text-[10px] font-medium text-neutral-600">Created via Mailient</span>
                                    <div className="flex gap-1">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="p-8 pt-4 flex gap-4">
                            <Button
                                variant="ghost"
                                onClick={() => setIsImageShareOpen(false)}
                                className="flex-1 h-12 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border-none transition-all"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCopyImage}
                                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5"
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Image
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Share as Text - Platform Options Dialog */}
                <Dialog open={isShareOptionsOpen} onOpenChange={setIsShareOptionsOpen}>
                    <DialogContent className="bg-neutral-900/95 backdrop-blur-3xl border-neutral-800 text-white rounded-[2.5rem] sm:max-w-3xl p-0 overflow-y-auto shadow-[0_0_80px_-20px_rgba(59,130,246,0.4)] max-h-[85vh]">
                        <DialogHeader className="p-8 pb-3">
                            <DialogTitle className="text-2xl font-semibold text-center bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">Share Note Content</DialogTitle>
                            <div className="mt-5 p-4 bg-black/40 rounded-[1.2rem] border border-neutral-800 flex items-center justify-between group/link">
                                <div className="flex-1 truncate text-sm text-neutral-400 font-mono tracking-tight">
                                    {selectedNote ? getNoteLink(selectedNote.id) : 'Loading link...'}
                                </div>
                                <button
                                    onClick={() => {
                                        if (selectedNote) {
                                            navigator.clipboard.writeText(getNoteLink(selectedNote.id));
                                            toast.success('Link copied!');
                                        }
                                    }}
                                    className="ml-4 p-2 bg-neutral-800 hover:bg-blue-500 text-neutral-300 hover:text-white rounded-xl transition-all shadow-inner"
                                >
                                    <Copy className="w-5 h-5" />
                                </button>
                            </div>
                        </DialogHeader>

                        <div className="px-8 py-2 grid grid-cols-1 last:sm:grid-cols-2 md:grid-cols-3 gap-4 pb-6">
                            {sharePlatforms.map((platform) => (
                                <button
                                    key={platform.name}
                                    onClick={() => {
                                        if (selectedNote) {
                                            const msg = platform.getMessage(selectedNote);
                                            const url = platform.getUrl(msg, selectedNote);
                                            window.open(url, '_blank');
                                            setIsShareOptionsOpen(false);
                                        }
                                    }}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-4 rounded-3xl bg-neutral-800/40 border border-neutral-800/50 transition-all duration-300 group/item",
                                        platform.color,
                                        platform.borderColor
                                    )}
                                >
                                    <div className="w-12 h-12 mb-3 bg-neutral-800 rounded-2xl flex items-center justify-center transition-transform group-hover/item:scale-110 shadow-lg">
                                        {platform.icon}
                                    </div>
                                    <span className="text-sm font-medium">{platform.name}</span>
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-neutral-800 p-6 pt-5">
                            <Button
                                variant="ghost"
                                onClick={() => setIsShareOptionsOpen(false)}
                                className="w-full h-12 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-2xl transition-all border border-neutral-700/50 font-medium shadow-lg"
                            >
                                Cancel
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogContent className="bg-neutral-900/90 backdrop-blur-2xl border-neutral-800 text-white rounded-[2.5rem] max-w-md shadow-[0_0_50px_-12px_rgba(239,68,68,0.3)]">
                        <DialogHeader className="space-y-4">
                            <div className="flex items-center gap-4 text-red-500">
                                <div className="p-2 bg-red-500/10 rounded-lg">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <DialogTitle className="text-xl font-medium">Are you sure?</DialogTitle>
                            </div>
                            <DialogDescription className="text-neutral-400 text-base leading-relaxed">
                                This action cannot be undone. This will permanently delete your note and remove it from our servers.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-3 mt-6">
                            <Button
                                variant="ghost"
                                onClick={() => setIsDeleteDialogOpen(false)}
                                className="flex-1 h-11 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-none transition-all"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    if (selectedNote) {
                                        handleDeleteNote(selectedNote.id);
                                        setIsDeleteDialogOpen(false);
                                    }
                                }}
                                className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium shadow-lg shadow-red-500/20 transition-all transform hover:-translate-y-0.5"
                            >
                                Delete Permanently
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* New Note Form */}
                {showNewNoteForm && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
                        <div className="bg-gradient-to-br from-neutral-800/90 to-neutral-900/90 rounded-[2rem] p-8 max-w-2xl w-full border border-neutral-700/50 shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-medium text-white">Create New Note</h3>
                                <button
                                    onClick={() => setShowNewNoteForm(false)}
                                    className="p-2 hover:bg-neutral-700/50 rounded-full transition-colors text-neutral-400 hover:text-white"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">Subject</label>
                                    <input
                                        type="text"
                                        value={newNoteSubject}
                                        onChange={(e) => setNewNoteSubject(e.target.value)}
                                        placeholder="Note subject or title..."
                                        className="w-full bg-neutral-900/30 text-white px-4 py-3 rounded-xl border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">Content</label>
                                    <textarea
                                        value={newNoteContent}
                                        onChange={(e) => setNewNoteContent(e.target.value)}
                                        placeholder="Write your note content... Use bullet points for clarity"
                                        className="w-full bg-neutral-900/30 text-neutral-200 p-4 rounded-xl border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-colors h-64 resize-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Button
                                    onClick={handleCreateNote}
                                    className="flex-1 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-medium rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Create Note
                                </Button>
                                <Button
                                    onClick={() => setShowNewNoteForm(false)}
                                    className="h-12 px-8 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 font-medium rounded-2xl transition-colors"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
