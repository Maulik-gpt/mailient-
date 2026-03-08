'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { ArrowLeft, Sparkles, Plus, Search, X, Edit, Trash, Save, Folder, Tag, Clock, MoreVertical, FileText, Pen, NotebookPen } from 'lucide-react';
import { toast } from 'sonner';

interface Note {
    id: string;
    subject: string;
    content: string;
    createdAt: string;
    updatedAt?: string;
    tags?: string[];
}

export default function NoteDetailPage({ params }: { params: { id: string } }) {
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

    // Load notes from Supabase on initial render
    useEffect(() => {
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

                    // Find the note with the matching ID
                    const note = formattedNotes.find((n: Note) => n.id === params.id);
                    if (note) {
                        setSelectedNote(note);
                        setEditSubject(note.subject);
                        setEditContent(note.content);
                    } else {
                        router.push('/i/notes');
                    }
                }
            } catch (error) {
                console.error('Error fetching notes:', error);
                router.push('/i/notes');
            } finally {
                setLoading(false);
            }
        };
        
        fetchNotes();
    }, [params, router]);

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
            
            if (response.ok) {
                // Refresh notes to get updated data
                const refreshResponse = await fetch('/api/notes');
                if (refreshResponse.ok) {
                    const data = await refreshResponse.json();
                    const formattedNotes = (data.notes || []).map((note: any) => ({
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
            } else {
                toast.error('Failed to update note');
            }
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
        <div className="min-h-screen bg-[#000000] text-white" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Satoshi', sans-serif" }}>
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
                                        onClick={() => handleDeleteNote(selectedNote.id)}
                                        className="h-10 px-6 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
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
    );
}