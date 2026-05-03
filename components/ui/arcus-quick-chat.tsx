'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2, Bot, User, BrainCircuit, Zap, FileText, ListTodo } from 'lucide-react';
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
  const [conversationId] = useState(() => `conv_quick_${Date.now()}`);
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

  const [currentStep, setCurrentStep] = useState<string>('');

  const handleSend = async (forcedInput?: string) => {
    const text = forcedInput || input;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsThinking(true);
    setCurrentStep('Initializing Arcus...');

    try {
      const response = await fetch('/api/agent-talk/chat-arcus-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          selectedEmailId: context?.emailId,
          conversationId: conversationId,
          isNewConversation: messages.length === 0,
        })
      });

      if (!response.ok) throw new Error('Failed to fetch');
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let hasAddedAssistantMessage = false;

      while (true) {
        const { done, value } = await reader?.read() || { done: true };
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.replace('event: ', '').trim();
            if (eventType === 'thinking' || eventType === 'tool_call') {
              setIsThinking(true);
            }
          }
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', '').trim());
              
              // Handle reasoning/thoughts
              if (data.step) {
                setCurrentStep(data.step);
              }
              
              // Handle tool calls
              if (data.tool) {
                const toolName = data.tool.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                setCurrentStep(`Arcus: ${toolName}...`);
              }

              if (data.content || data.message) {
                setIsThinking(false);
                const content = data.content || data.message;
                assistantContent += content;
                
                if (!hasAddedAssistantMessage) {
                  setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
                  hasAddedAssistantMessage = true;
                } else {
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { role: 'assistant', content: assistantContent };
                    return newMessages;
                  });
                }
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
      }
      
      setIsLoading(false);
      setIsThinking(false);
      setCurrentStep('');

    } catch (error) {
      console.error('Quick Chat Error:', error);
      setIsThinking(false);
      setIsLoading(false);
      setCurrentStep('');
      toast.error('AI was unable to process this request.');
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 20, scale: 0.98, filter: 'blur(10px)' }}
          transition={{ 
            type: "spring", 
            damping: 20, 
            stiffness: 150,
            opacity: { duration: 0.2 },
            filter: { duration: 0.2 }
          }}
          className="fixed bottom-6 right-6 z-[3000] w-[450px] h-[80vh] flex flex-col origin-bottom-right"
        >
          {/* Main Card */}
          <div className="relative group bg-[#050505] border border-white/[0.12] rounded-[2rem] shadow-[0_30px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col ring-1 ring-white/10 h-full">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                  <BrainCircuit className="w-5 h-5 text-white/80" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-tight">Arcus Intelligence</span>
                  <span className="text-sm font-semibold text-white/90 truncate max-w-[220px]">
                    {context?.subject || 'Email Analysis'}
                  </span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-all text-white/20 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-white/[0.01]"
            >
              {messages.length === 0 && !isThinking && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10">
                    <Sparkles className="w-6 h-6 text-white/30" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-white font-medium">Ready to analyze</h3>
                    <p className="text-xs text-white/40 font-light max-w-[200px]">
                      Ask me any specific detail about this email conversation.
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-4",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-500",
                    msg.role === 'user' 
                      ? "bg-white/5 border-white/10" 
                      : "bg-white/10 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                  )}>
                    {msg.role === 'user' ? <User className="w-5 h-5 text-white/40" /> : <Bot className="w-5 h-5 text-white/80" />}
                  </div>
                  <div className={cn(
                    "max-w-[85%] rounded-[1.5rem] px-5 py-3.5 text-[15px] leading-relaxed shadow-xl",
                    msg.role === 'user'
                      ? "bg-white/5 text-white/90 rounded-tr-none border border-white/5"
                      : "bg-white/[0.08] text-white border border-white/10 rounded-tl-none font-light"
                  )}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {isThinking && (
                <div className="flex gap-4">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                    <Bot className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="bg-white/[0.04] border border-white/10 rounded-3xl rounded-tl-none px-6 py-4 space-y-3 w-[180px] shadow-2xl">
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        />
                      </div>
                      <div className="h-1.5 w-3/4 bg-white/5 rounded-full overflow-hidden relative">
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.2 }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-white/30 font-medium ml-2 animate-pulse tracking-wider uppercase">
                      {currentStep || 'Thinking...'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white/[0.02] border-t border-white/[0.08] mt-auto">
              <div className="relative flex items-center gap-2 bg-white/[0.05] border border-white/[0.12] rounded-[1.5rem] p-1.5 focus-within:border-white/40 transition-all shadow-inner">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Message Arcus..."
                  className="flex-1 bg-transparent border-none outline-none text-sm px-4 py-2.5 text-white/90 placeholder:text-white/20"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "p-2.5 rounded-2xl transition-all",
                    input.trim() && !isLoading
                      ? "bg-white text-black hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                      : "bg-white/5 text-white/20"
                  )}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Quick Actions */}
              <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                 {[
                   { label: 'Summarize', icon: FileText, query: 'Summarize this email conversation' },
                   { label: 'Key Points', icon: ListTodo, query: 'What are the key points in this email?' },
                   { label: 'Action Items', icon: Zap, query: 'Are there any action items for me?' },
                   { label: 'Draft Reply', icon: Send, query: 'Draft a professional reply to this email' }
                 ].map((action) => (
                   <button 
                     key={action.label}
                     onClick={() => handleSend(action.query)}
                     className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                   >
                     <action.icon className="w-3 h-3" />
                     {action.label}
                   </button>
                 ))}
              </div>
            </div>
          </div>

          {/* Decorative subtle glow behind */}
          <div className="absolute inset-0 -z-10 bg-white/[0.02] blur-[100px] rounded-full opacity-30" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
