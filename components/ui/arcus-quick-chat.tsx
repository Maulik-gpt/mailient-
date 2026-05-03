'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2, Bot, User, BrainCircuit, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ArcusQuickChatProps {
  isOpen: boolean;
  onClose: () => void;
  context: { emailId?: string; subject?: string } | null;
}

export const ArcusQuickChat: React.FC<ArcusQuickChatProps> = ({ isOpen, onClose, context }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Initial message when context changes
  useEffect(() => {
    if (isOpen && context && messages.length === 0) {
      setInput('What is this email about?');
    }
  }, [isOpen, context]);

  const handleSend = async (forcedInput?: string) => {
    const text = forcedInput || input;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsThinking(true);

    try {
      // Simulate real AI logic with a slight delay for "Thinking" animation
      const response = await fetch('/api/agent-talk/chat-arcus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: {
            emailId: context?.emailId,
            subject: context?.subject,
            source: 'quick_chat'
          },
          history: messages
        })
      });

      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      
      // Delay response slightly to show off the premium thinking animation
      setTimeout(() => {
        setIsThinking(false);
        setMessages(prev => [...prev, { role: 'assistant', content: data.response || data.message || "I've analyzed the email. What else would you like to know?" }]);
        setIsLoading(false);
      }, 1500);

    } catch (error) {
      console.error('Quick Chat Error:', error);
      setIsThinking(false);
      setIsLoading(false);
      toast.error('AI was unable to process this request.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-6 right-6 z-[3000] w-[400px] max-h-[600px] flex flex-col"
      >
        {/* Main Card */}
        <div className="relative group bg-[#0C0C0C]/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col ring-1 ring-white/5">
          
          {/* Top Glass Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center border border-amber-500/30">
                <BrainCircuit className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-tight">Arcus Quick</span>
                <span className="text-sm font-semibold text-white/90 truncate max-w-[180px]">
                  {context?.subject || 'Context Chat'}
                </span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[150px] max-h-[400px] custom-scrollbar"
          >
            {messages.length === 0 && !isThinking && (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/[0.05]">
                  <Sparkles className="w-5 h-5 text-white/20" />
                </div>
                <p className="text-xs text-white/40 font-light max-w-[200px]">
                  I'm ready to analyze this email for you. Ask me anything.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex gap-3",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border",
                  msg.role === 'user' 
                    ? "bg-white/5 border-white/10" 
                    : "bg-amber-500/10 border-amber-500/20"
                )}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-white/60" /> : <Bot className="w-4 h-4 text-amber-500" />}
                </div>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === 'user'
                    ? "bg-white/5 text-white/90 rounded-tr-none"
                    : "bg-white/[0.03] text-white/80 border border-white/5 rounded-tl-none"
                )}>
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {isThinking && (
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-amber-500 animate-pulse" />
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 space-y-2 w-[140px]">
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                  <div className="h-1.5 w-2/3 bg-white/5 rounded-full overflow-hidden relative">
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.2 }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-5 bg-white/[0.02] border-t border-white/[0.05]">
            <div className="relative flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-1 focus-within:border-amber-500/50 transition-all shadow-inner">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Arcus AI..."
                className="flex-1 bg-transparent border-none outline-none text-sm px-4 py-2 text-white/90 placeholder:text-white/20"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  input.trim() && !isLoading
                    ? "bg-amber-500 text-black hover:scale-105 active:scale-95"
                    : "bg-white/5 text-white/20"
                )}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
               <button 
                 onClick={() => handleSend('Summarize this email')}
                 className="shrink-0 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.05] text-[10px] text-white/40 hover:text-white hover:bg-white/10 transition-all"
               >
                 Summarize
               </button>
               <button 
                 onClick={() => handleSend('Draft a reply')}
                 className="shrink-0 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.05] text-[10px] text-white/40 hover:text-white hover:bg-white/10 transition-all"
               >
                 Draft Reply
               </button>
            </div>
          </div>
        </div>

        {/* Decorative Liquid Glow behind */}
        <div className="absolute inset-0 -z-10 bg-amber-500/5 blur-[100px] rounded-full opacity-50" />
      </motion.div>
    </AnimatePresence>
  );
};
