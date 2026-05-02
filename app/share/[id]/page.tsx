'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { 
  Sparkles, 
  User2, 
  Check, 
  Copy, 
  Share2, 
  ExternalLink, 
  ChevronRight,
  LogIn,
  Layers,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ShiningText } from '@/components/ui/shining-text';
import { AgentExecutionTimeline } from '@/app/dashboard/agent-talk/components/AgentExecutionTimeline';

// --- Reusable Component: MessageContent (Simplified from ChatInterface) ---
const MessageContent = ({ content, isUser }: { content: any, isUser: boolean }) => {
  const text = typeof content === 'string' ? content : content.text;
  const list = typeof content === 'string' ? [] : (content.list || []);

  return (
    <div className={cn(
      "text-[14px] leading-relaxed tracking-tight",
      isUser ? "text-white/90" : "text-black/90 dark:text-white/90"
    )}>
      <div className="whitespace-pre-wrap">{text}</div>
      {list.length > 0 && (
        <ul className="mt-3 space-y-2 list-none">
          {list.map((item: string, idx: number) => (
            <li key={idx} className="flex gap-2 items-start">
              <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function SharePage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: authStatus } = useSession();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);
  const [title, setTitle] = useState("Shared Conversation");

  useEffect(() => {
    const fetchSharedData = async () => {
      try {
        const res = await fetch(`/api/agent-talk/share/${id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Conversation not found");
          throw new Error("Failed to load shared conversation");
        }
        const data = await res.json();
        setMessages(data.messages || []);
        setTitle(data.title || "Shared Conversation");
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchSharedData();
  }, [id]);

  const handleClone = async () => {
    if (authStatus === 'unauthenticated') {
      // Redirect to sign in with callback to this page
      const callbackUrl = window.location.href;
      signIn('google', { callbackUrl });
      return;
    }

    setCloning(true);
    try {
      const res = await fetch('/api/agent-talk/share/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId: id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clone chat");

      toast.success("Chat cloned successfully! Redirecting...");
      router.push(data.redirectUrl);
    } catch (err: any) {
      toast.error(err.message);
      setCloning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-blue-500 animate-pulse" />
          </div>
          <p className="text-black/40 dark:text-white/40 text-[13px] animate-pulse">Loading shared mission...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <Share2 className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">Link Expired or Invalid</h1>
          <p className="text-black/50 dark:text-white/40 text-[14px] leading-relaxed">
            The shared conversation link you're trying to access might have been deleted or is no longer available.
          </p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-2xl hover:opacity-80 transition-all"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] selection:bg-blue-500/30">
      {/* Premium Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-black/[0.03] dark:border-white/[0.03] bg-white/80 dark:bg-black/80 backdrop-blur-xl flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center shrink-0">
            <img src="/mailient-logo-white.png" className="w-5 h-5 dark:invert" alt="Logo" />
          </div>
          <span className="text-[14px] font-bold tracking-tight text-black dark:text-white truncate max-w-[200px]">
            {title}
          </span>
          <span className="hidden sm:inline-flex px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-widest rounded border border-blue-500/20">
            Shared
          </span>
        </div>

        <div className="flex items-center gap-4">
          {authStatus === 'unauthenticated' ? (
            <button 
              onClick={() => signIn('google')}
              className="px-4 py-2 text-[13px] font-bold text-black dark:text-white hover:opacity-70 transition-all"
            >
              Sign In
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-black/40 dark:text-white/40">Viewing as</span>
              <span className="text-[12px] font-bold text-black dark:text-white">{session?.user?.name}</span>
            </div>
          )}
          
          <button 
            onClick={handleClone}
            disabled={cloning}
            className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-bold rounded-full transition-all active:scale-95 shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {cloning ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Cloning...
              </span>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5" />
                <span>Clone Chat</span>
              </>
            )}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto pt-24 pb-40 px-6">
        <div className="space-y-12">
          {messages.map((msg, idx) => (
            <div 
              key={msg.id || idx} 
              className={cn(
                "flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700",
                msg.role === 'user' ? "items-end" : "items-start"
              )}
            >
              <div className={cn(
                "flex gap-4 max-w-[90%] sm:max-w-[80%] items-start",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}>
                {/* Avatar */}
                <div className={cn(
                  "w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center border overflow-hidden",
                  msg.role === 'user' 
                    ? "bg-[#2b2b2b] border-white/10" 
                    : "bg-blue-500/10 border-blue-500/20"
                )}>
                  {msg.role === 'user' ? (
                    <User2 className="w-4 h-4 text-white/50" />
                  ) : (
                    <img src="/arcus-ai-icon.jpg" className="w-full h-full object-cover" alt="AI" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className="flex flex-col gap-1.5">
                  <div className={cn(
                    "relative px-5 py-4 rounded-[24px] shadow-sm transition-all",
                    msg.role === 'user' 
                      ? "bg-[#111] border border-white/[0.08] text-white rounded-tr-none" 
                      : "bg-white dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] text-black dark:text-white rounded-tl-none"
                  )}>
                    <MessageContent content={msg.content} isUser={msg.role === 'user'} />
                    
                    {/* Step Timeline (if available) */}
                    {msg.role === 'assistant' && msg.meta?.agentSteps && (
                      <div className="mt-6 pt-6 border-t border-black/[0.05] dark:border-white/[0.05]">
                        <AgentExecutionTimeline 
                          steps={msg.meta.agentSteps} 
                          isActive={false} 
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <span className={cn(
                    "text-[10px] tracking-tight text-black/30 dark:text-white/20 px-1 font-medium",
                    msg.role === 'user' ? "text-right" : "text-left"
                  )}>
                    {msg.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer CTA / Sign In Overlay */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 p-6 lg:p-12">
        <div className="max-w-3xl mx-auto">
          <div className="relative group overflow-hidden bg-white/90 dark:bg-[#111]/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.08] rounded-[32px] p-6 lg:p-8 shadow-2xl transition-all hover:border-blue-500/30">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-transparent pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
              <div className="text-center sm:text-left space-y-1">
                <h3 className="text-lg font-bold tracking-tight text-black dark:text-white">
                  {authStatus === 'unauthenticated' ? "Continue this mission" : "Clone this mission to Arcus"}
                </h3>
                <p className="text-black/50 dark:text-white/40 text-[13px]">
                  {authStatus === 'unauthenticated' 
                    ? "Sign in to take control and start automating your email workflow." 
                    : "Import this entire history into your workspace and continue the work."}
                </p>
              </div>

              {authStatus === 'unauthenticated' ? (
                <button 
                  onClick={() => signIn('google')}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10 dark:shadow-white/5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Continue</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button 
                  onClick={handleClone}
                  disabled={cloning}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-blue-500 text-white font-bold rounded-2xl hover:bg-blue-600 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
                >
                  {cloning ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Layers className="w-4 h-4" />
                      <span>Clone to My Workspace</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
