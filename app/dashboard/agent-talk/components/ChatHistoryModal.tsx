"use client";

import { X, Search, Plus, ListFilter, History, FileText, BarChart3, Calendar, PenTool, Sparkles, Pin, Trash2, Edit3, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

interface ChatHistoryItem {
  id: string;
  user_id: string;
  conversation_id: string;
  user_message: string;
  agent_response: string;
  message_order: number;
  is_initial_message: boolean;
  created_at: string;
  initialMessagePreview?: string;
  lastMessageDate?: string;
  source?: string;
  isPinned?: boolean;
}

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationSelect?: (conversationId: string) => void;
  onConversationDelete?: (conversationId: string) => void;
  onNewMission?: () => void;
}

export function ChatHistoryModal({ isOpen, onClose, onConversationSelect, onConversationDelete, onNewMission }: ChatHistoryModalProps) {
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localEditValue, setLocalEditValue] = useState("");
  
  // Feedback state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
      loadConversationsFromStorage();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/agent-talk/history?limit=50&offset=0');
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (err) { console.error(err); } 
    finally { setIsLoading(false); }
  };

  const loadConversationsFromStorage = () => {
    const list: ChatHistoryItem[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('conversation_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.id && data.messages && data.messages.length > 0) {
            const firstUserMsg = data.messages.find((m: any) => m.role === 'user' || m.type === 'user');
            const preview = firstUserMsg ? (typeof firstUserMsg.content === 'string' ? firstUserMsg.content : firstUserMsg.content.text) : '';
            
            list.push({
              id: data.id,
              conversation_id: data.id,
              user_id: '',
              user_message: data.title || (preview ? preview.split(' ').slice(0, 5).join(' ') : 'New Mission'),
              agent_response: '',
              message_order: 0,
              is_initial_message: true,
              created_at: data.lastUpdated || new Date().toISOString(),
              initialMessagePreview: preview,
              lastMessageDate: data.lastUpdated,
              source: 'local',
              isPinned: data.isPinned || false
            });
          }
        } catch (e) { console.error(e); }
      }
    }
    
    setHistory(prev => {
      const map = new Map(prev.map(i => [i.id, i]));
      list.forEach(li => { if (!map.get(li.id)) map.set(li.id, li); });
      return Array.from(map.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  };

  const filteredHistory = useMemo(() => {
    if (!searchQuery) return history;
    return history.filter(item => 
      item.user_message.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [history, searchQuery]);

  const handleRename = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return setEditingId(null);
    setHistory(prev => prev.map(item => {
      if (item.id === id) {
        const raw = localStorage.getItem(`conversation_${id}`);
        if (raw) {
          const data = JSON.parse(raw);
          data.title = newTitle;
          localStorage.setItem(`conversation_${id}`, JSON.stringify(data));
        }
        return { ...item, user_message: newTitle };
      }
      return item;
    }));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/agent-talk/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: id })
      });
      localStorage.removeItem(`conversation_${id}`);
      onConversationDelete?.(id);
      setHistory(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim() || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedbackText })
      });
      if (res.ok) {
        setIsSent(true);
        setFeedbackText("");
        setTimeout(() => { setIsSent(false); setIsFeedbackOpen(false); }, 2000);
      }
    } catch (e) { console.error(e); }
    finally { setIsSending(false); }
  };

  return (
    <div className="h-full flex flex-col bg-neutral-50 dark:bg-[#111111] text-black dark:text-white overflow-hidden font-sans selection:bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10" onClick={e => e.stopPropagation()}>
      
      {/* Search Header Transition */}
      <AnimatePresence mode="wait">
        {isSearchVisible ? (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="p-4 flex items-center gap-3 border-b border-white/[0.05]"
          >
            <button onClick={() => { setIsSearchVisible(false); setSearchQuery(""); }} className="text-black/40 dark:text-white/40 hover:text-black dark:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <input 
              autoFocus
              type="text"
              placeholder="Search missions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-[14px] placeholder:text-black/20 dark:text-white/20"
            />
          </motion.div>
        ) : (
          <div className="p-4 space-y-1">
             <button 
               onClick={onNewMission}
               className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] transition-all group"
             >
               <div className="w-5 h-5 flex items-center justify-center">
                 <Edit3 className="w-4 h-4 text-black/60 dark:text-white/60 group-hover:text-black dark:text-white" />
               </div>
               <span className="text-[14px] font-medium text-black/90 dark:text-white/90">New mission</span>
             </button>

             <div className="pt-1">
                <button 
                  onClick={() => setIsSearchVisible(true)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-all group"
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <Search className="w-4 h-4 text-black/40 dark:text-white/40 group-hover:text-black/60 dark:text-white/60" />
                  </div>
                  <span className="text-[14px] font-medium text-black/60 dark:text-white/60 group-hover:text-black/80 dark:text-white/80">Search</span>
                </button>
                <button className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-all group">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <History className="w-4 h-4 text-black/40 dark:text-white/40 group-hover:text-black/60 dark:text-white/60" />
                  </div>
                  <span className="text-[14px] font-medium text-black/60 dark:text-white/60 group-hover:text-black/80 dark:text-white/80">Yesterday</span>
                </button>
             </div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
        {/* All Missions Section */}
        <div className="mt-6 mb-2 flex items-center justify-between px-2.5">
          <span className="text-[12px] font-semibold text-black/30 dark:text-white/30 tracking-tight">All missions</span>
          <button className="text-black/20 dark:text-white/20 hover:text-black/40 dark:text-white/40 transition-colors">
            <ListFilter className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-0.5">
          {isLoading ? (
            <div className="py-10 flex justify-center opacity-20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-10 text-center px-4">
              <p className="text-[13px] text-black/20 dark:text-white/20 italic">No missions found</p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div key={item.conversation_id || item.id} className="group relative">
                <div
                  onClick={() => onConversationSelect?.(item.conversation_id || item.id)}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer",
                    "hover:bg-white/[0.04]"
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {getMissionIconMinimal(item.user_message)}
                  </div>
                  
                  {editingId === (item.conversation_id || item.id) ? (
                    <input 
                      autoFocus
                      className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium text-black/90 dark:text-white/90"
                      value={localEditValue}
                      onChange={e => setLocalEditValue(e.target.value)}
                      onBlur={() => handleRename(item.conversation_id || item.id, localEditValue)}
                      onKeyDown={e => e.key === 'Enter' && handleRename(item.conversation_id || item.id, localEditValue)}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="flex-1 text-[14px] font-medium text-black/80 dark:text-white/80 group-hover:text-black dark:text-white transition-colors truncate">
                      {item.user_message}
                    </span>
                  )}

                  {!editingId && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingId(item.conversation_id || item.id); setLocalEditValue(item.user_message); }}
                        className="p-1 hover:text-black dark:text-white text-black/20 dark:text-white/20"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.conversation_id || item.id); }}
                        className="p-1 hover:text-red-400 text-black/20 dark:text-white/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Footer / Feedback Section */}
      <div className="p-4 border-t border-white/[0.03] bg-[#0d0d0d]">
        <AnimatePresence mode="wait">
          {!isFeedbackOpen ? (
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsFeedbackOpen(true)}
              className="w-full py-3 px-4 rounded-xl border border-dashed border-neutral-200 dark:border-white/10 hover:border-neutral-300 dark:border-white/20 hover:bg-white/[0.02] transition-all text-left group"
            >
              <span className="text-[12px] font-medium text-black/30 dark:text-white/30 group-hover:text-black/5 dark:text-black/50 dark:text-white/50">Have Feedback? <span className="text-black/60 dark:text-white/60">Write here!</span></span>
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="w-full bg-neutral-100 dark:bg-[#161616] border border-neutral-200 dark:border-white/10 rounded-2xl p-4 shadow-2xl relative overflow-hidden"
            >
               <textarea
                 autoFocus
                 placeholder="Share your feedback..."
                 value={feedbackText}
                 onChange={e => setFeedbackText(e.target.value)}
                 onKeyDown={e => {
                   if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendFeedback();
                   if (e.key === 'Escape') setIsFeedbackOpen(false);
                 }}
                 className="w-full bg-white/[0.03] border border-neutral-200 dark:border-white/5 rounded-xl p-3 text-[13px] text-black/90 dark:text-white/90 placeholder:text-black/20 dark:text-white/20 resize-none min-h-[100px] outline-none focus:border-neutral-200 dark:border-white/10 transition-all mb-4"
               />
               
               <div className="flex items-center justify-between">
                  <button 
                    onClick={() => window.open('mailto:mailient.xyz@gmail.com')}
                    className="text-[12px] text-black/40 dark:text-white/40 hover:text-black/80 dark:text-white/80 transition-colors"
                  >
                    Need help? <span className="underline decoration-white/20">Contact us</span>
                  </button>
                  
                  <button 
                    onClick={handleSendFeedback}
                    disabled={!feedbackText.trim() || isSending || isSent}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-bold transition-all",
                      isSent ? "bg-emerald-500 text-black dark:text-white" : "bg-white text-black hover:bg-neutral-200"
                    )}
                  >
                    {isSent ? "Sent!" : isSending ? "Sending..." : "Send"}
                    {!isSending && !isSent && (
                       <div className="flex items-center gap-0.5 opacity-40 ml-1">
                          <span className="text-[10px]">⌘</span>
                          <span className="text-[10px]">↵</span>
                       </div>
                    )}
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function getMissionIconMinimal(title: string) {
  const text = title.toLowerCase();
  
  // Specific Icons from User Image
  if (text.includes('browser') || text.includes('search') || text.includes('web') || text.includes('internet')) return <History className="w-4 h-4 text-black/40 dark:text-white/40 group-hover:text-black/60 dark:text-white/60 transition-colors" opacity={0.6} />;
  
  if (text.includes('gather') || text.includes('list') || text.includes('checklist')) return <FileText className="w-4 h-4 text-black/40 dark:text-white/40 group-hover:text-black/60 dark:text-white/60 transition-colors" />;

  // General Mission Mapping
  if (text.includes('summary') || text.includes('catch up')) return <FileText className="w-4 h-4 text-black/40 dark:text-white/40 group-hover:text-black/60 dark:text-white/60 transition-colors" />;
  if (text.includes('analytics') || text.includes('chart')) return <BarChart3 className="w-4 h-4 text-black/40 dark:text-white/40 group-hover:text-black/60 dark:text-white/60 transition-colors" />;
  if (text.includes('schedule') || text.includes('calendar')) return <Calendar className="w-4 h-4 text-black/40 dark:text-white/40 group-hover:text-black/60 dark:text-white/60 transition-colors" />;
  if (text.includes('write') || text.includes('reply') || text.includes('draft')) return <PenTool className="w-4 h-4 text-black/40 dark:text-white/40 group-hover:text-black/60 dark:text-white/60 transition-colors" />;
  
  return <Sparkles className="w-4 h-4 text-black/30 dark:text-white/30 group-hover:text-black/5 dark:text-black/50 dark:text-white/50 transition-colors" />;
}
