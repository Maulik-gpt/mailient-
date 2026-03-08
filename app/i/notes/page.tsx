'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';
import { Sparkles, Plus, Search, X, Edit, Trash, Save, Folder, Tag, Clock, MoreVertical, FileText, Pen, NotebookPen } from 'lucide-react';
import { toast } from 'sonner';

interface Note {
    id: string;
    subject: string;
    content: string;
    createdAt: string;
    updatedAt?: string;
    tags?: string[];
}

export default function NotesPage() {
    const router = useRouter();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [editingNote, setEditingNote] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [showNewNoteForm, setShowNewNoteForm] = useState(false);
    const [newNoteSubject, setNewNoteSubject] = useState('');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [showSidebar, setShowSidebar] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    
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

    // Load notes from Supabase on initial render
    useEffect(() => {
        fetchNotes();
    }, []);

    // Debounce search input
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery.trim());
            setIsSearching(searchQuery.trim() !== '');
        }, 300);

        return () => {
            clearTimeout(timerId);
        };
    }, [searchQuery]);

    const fetchNotes = async () => {
        try {
            setLoading(true);
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
            }
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredNotes = notes.filter(note => {
        const query = debouncedSearchQuery.toLowerCase();
        if (!query) return true;
        
        return note.subject.toLowerCase().includes(query) ||
               note.content.toLowerCase().includes(query) ||
               (note.tags && note.tags.some(tag => tag.toLowerCase().includes(query)));
    });

    const handleEditNote = (note: Note) => {
        setEditingNote(note.id);
        setEditContent(note.content);
    };

    const handleSaveEdit = async () => {
        if (!editingNote) return;
        
        try {
            const response = await fetch('/api/notes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    noteId: editingNote,
                    content: editContent
                })
            });
            
            if (response.ok) {
                await fetchNotes();
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
                await fetchNotes();
                toast.success('Note deleted successfully!');
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
                await fetchNotes();
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
            <div className="flex h-screen">
                {/* Mailient Sidebar */}
                <HomeFeedSidebar />
                 
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col ml-16">
                    <div className="border-b border-neutral-800 px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-yellow-500 rounded flex items-center justify-center">
                                <NotebookPen className="w-4 h-4 text-black" />
                            </div>
                            <span className="font-medium text-lg">Notes</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button
                                onClick={() => setShowNewNoteForm(true)}
                                className="h-9 px-4 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                New Note
                            </Button>
                            <div className="relative">
                                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isSearching ? 'text-yellow-400' : 'text-neutral-500'}`} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search notes..."
                                    className="w-64 bg-neutral-900 text-white pl-9 pr-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 text-sm"
                                />
                                {isSearching && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setDebouncedSearchQuery('');
                                            setIsSearching(false);
                                        }}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-neutral-700 rounded-full transition-colors"
                                        aria-label="Clear search"
                                    >
                                        <X className="w-4 h-4 text-neutral-400 hover:text-white" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                     
                    <div className="flex-1 overflow-y-auto p-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24">
                                <div className="relative mb-6">
                                    <NotebookPen className="w-12 h-12 text-yellow-400 animate-pulse" />
                                    <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full animate-pulse" />
                                </div>
                                <p className="text-neutral-400 text-lg font-light animate-pulse">Loading your notes...</p>
                            </div>
                        ) : filteredNotes.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredNotes.map((note) => (
                                    <div
                                        key={note.id}
                                        onClick={() => {
                                            setSelectedNote(note);
                                            router.push(`/i/notes/${note.id}`);
                                        }}
                                        className="group relative cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                                    >
                                        {/* Liquid Metal Card with Glass Fusion */}
                                        <div className="bg-neutral-900/30 backdrop-blur-xl rounded-[2rem] p-6 border border-neutral-800/20 shadow-2xl overflow-hidden h-full flex flex-col justify-between min-h-[200px] relative"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                                            }}
                                        >
                                            {/* Metallic Background with Subtle Noise */}
                                            <div className="absolute inset-0 opacity-15" style={{
                                                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100%25\' height=\'100%25\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
                                                mixBlendMode: 'overlay'
                                            }}></div>
                                            
                                            {/* Frosted Glass Layer */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-neutral-900/30 to-neutral-800/20 backdrop-blur-2xl"></div>
                                            
                                            {/* Liquid Metal Border Animation */}
                                            <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
                                                <div className="absolute inset-0 border-2 border-transparent group-hover:border-yellow-500/30 transition-all duration-500">
                                                    <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent opacity-0 group-hover:opacity-50 blur-sm transition-all duration-1000 animate-liquid-metal"></div>
                                                </div>
                                            </div>
                                            
                                            {/* Metallic Reflection Highlights */}
                                            <div className="absolute inset-0 opacity-20 pointer-events-none">
                                                <div className="absolute top-4 left-4 w-16 h-16 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-xl transform rotate-12"></div>
                                                <div className="absolute bottom-8 right-8 w-12 h-12 bg-gradient-to-tl from-yellow-500/15 to-transparent rounded-full blur-md transform -rotate-6"></div>
                                            </div>
                                            
                                            {/* Content Container */}
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="text-lg font-medium text-white line-clamp-1 transition-colors group-hover:text-yellow-400">
                                                        {note.subject || 'Untitled Note'}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-neutral-400 font-light bg-neutral-800/50 px-2 py-1 rounded-full border border-neutral-700/30 backdrop-blur-sm">
                                                            {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleDeleteNote(note.id);
                                                            }}
                                                            className="p-1 hover:bg-red-500/20 rounded-full transition-colors text-neutral-400 hover:text-red-400"
                                                            aria-label="Delete note"
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onMouseUp={(e) => e.stopPropagation()}
                                                        >
                                                            <Trash className="w-4 h-4" strokeWidth={1.5} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mb-6 flex-1">
                                                    <div className="text-sm text-neutral-300 font-light leading-relaxed whitespace-pre-wrap overflow-hidden line-clamp-6 transition-colors group-hover:text-neutral-200 h-24 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }} />
                                                </div>
                                            </div>
                                            
                                            {/* Metallic Glass Button */}
                                            <div className="relative z-10 mt-4">
                                                <Button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedNote(note);
                                                        router.push(`/i/notes/${note.id}`);
                                                    }}
                                                    className="w-full h-10 bg-gradient-to-r from-blue-500/80 to-blue-600/80 hover:from-blue-600/90 hover:to-blue-700/90 text-white font-medium rounded-xl transition-all duration-300 backdrop-blur-sm border border-blue-500/30 shadow-lg hover:shadow-xl relative overflow-hidden"
                                                >
                                                    <span className="relative z-10 flex items-center justify-center">
                                                        <FileText className="w-4 h-4 mr-2" />
                                                        Open Note
                                                    </span>
                                                    {/* Button Metallic Shine */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-30 transition-all duration-500"></div>
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        {/* Hover Effects */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-30 transition-all duration-300 pointer-events-none"></div>
                                        
                                        {/* Liquid Metal Glow */}
                                        <div className="absolute -inset-2 rounded-[2.25rem] bg-gradient-to-r from-yellow-500/5 via-blue-500/5 to-transparent opacity-0 group-hover:opacity-20 blur-xl transition-all duration-1000 animate-liquid-metal-slow"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-24">
                                <div className="relative mb-6">
                                    <div className="w-20 h-20 mx-auto bg-neutral-800/50 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-neutral-700/30 shadow-xl relative overflow-hidden"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                                        }}
                                    >
                                        <div className="absolute inset-0 opacity-10" style={{
                                            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100%25\' height=\'100%25\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
                                            mixBlendMode: 'overlay'
                                        }}></div>
                                        <NotebookPen className="w-10 h-10 text-yellow-500 relative z-10" />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-3xl blur-2xl opacity-50"></div>
                                </div>
                                <h3 className="text-xl font-medium text-neutral-300 mb-2">
                                    {isSearching ? "Search Results" : "Welcome to Notes"}
                                </h3>
                                <p className="text-neutral-500 max-w-md mx-auto">
                                    {isSearching ?
                                        filteredNotes.length === 0 ?
                                            `No notes found for "${debouncedSearchQuery}"` :
                                            `Found ${filteredNotes.length} note${filteredNotes.length !== 1 ? 's' : ''} matching "${debouncedSearchQuery}"`
                                        : "Create your first note to get started"}
                                </p>
                                <Button
                                    onClick={() => setShowNewNoteForm(true)}
                                    className="mt-6 h-12 px-8 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-medium rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm border border-yellow-500/30 relative overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center">
                                        <Plus className="w-5 h-5 mr-2" />
                                        Create First Note
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-20 transition-all duration-300"></div>
                                </Button>
                            </div>
                        )}
                    </div>
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