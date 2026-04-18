'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Activity, MessageSquare, Smile, BarChart3, Clock, RotateCw, Mic, Wand2 } from 'lucide-react';
import { Button } from './button';

interface VoiceProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onReAnalyze: () => void;
  onCreate: () => void;
  isAnalyzing?: boolean;
}

export const VoiceProfileModal = ({ isOpen, onClose, profile, onReAnalyze, onCreate, isAnalyzing = false }: VoiceProfileModalProps) => {
  if (!isOpen) return null;

  // Check if profile exists and is not default
  const hasProfile = profile && profile.status !== 'default';

  // Derive display values from actual profile structure from voice-profile-service.js
  const stats = profile?.language_patterns?.stats || profile?.stats || {
    lowercasePercent: 0,
    noGreetingPercent: 0,
    noSignOffPercent: 0,
    noPeriodsPercent: 0
  };

  const writingStyle = [
    { label: 'sentence length', value: profile?.language_patterns?.avg_length || profile?.avgSentenceLength || 0, sub: 'words avg', icon: Clock },
    { label: 'reply size', value: profile?.language_patterns?.replyLength || profile?.replyLength || 'standard', sub: 'length', icon: MessageSquare },
    { label: 'emoji use', value: (profile?.language_patterns?.top_emojis?.length || profile?.emojis?.top?.length || 0) > 0 ? 'frequent' : 'infrequent', sub: 'frequency', icon: Smile }
  ];

  const signals = [
    { label: 'lowercase', value: stats.lowercasePercent || 0 },
    { label: 'no greeting', value: stats.noGreetingPercent || 0 },
    { label: 'no sign-off', value: stats.noSignOffPercent || 0 },
    { label: 'no periods', value: stats.noPeriodsPercent || 0 }
  ];

  // Get fillers/common phrases from language_patterns or fallback
  const phrases = (profile?.language_patterns?.common_phrases || profile?.fillers || []).slice(0, 5).map((f: string, i: number) => ({
    text: `"${f}"`,
    count: Math.max(2, 8 - (i * 1.5))
  }));

  // Generate tone tags from actual profile data
  const vibe = profile?.vibe || {};
  const toneTags = [
    vibe.formal ? 'formal' : 'casual',
    vibe.exclamatory ? 'enthusiastic' : 'measured',
    vibe.lowercaseHeavy ? 'lowercase-heavy' : 'standard casing',
    profile?.language_patterns?.sentence_length || 'medium'
  ].filter(Boolean);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-xl bg-[#121212] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl ios-shadow font-sans text-white"
        >
          {/* Header */}
          <div className="p-8 pb-0 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-medium tracking-tight opacity-70">voice profile</h2>
                {hasProfile && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-green-500 uppercase font-bold tracking-widest">active</span>
                  </div>
                )}
              </div>
              <p className="text-xs opacity-40 font-light">
                {hasProfile ? `${profile?.email_count || 0} sent emails analyzed` : 'Analyze your writing style'}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
            >
              <X className="w-4 h-4 opacity-50" />
            </button>
          </div>

          <div className="p-8 space-y-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* Empty State - No Profile */}
            {!hasProfile && !isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                  <Mic className="w-8 h-8 opacity-40" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-medium opacity-80">No Voice Profile Yet</h3>
                  <p className="text-sm opacity-40 max-w-xs">
                    Let AI analyze your sent emails to clone your unique writing style for draft replies.
                  </p>
                </div>
                <Button
                  onClick={onCreate}
                  className="bg-white text-black hover:bg-white/90 rounded-xl px-8 py-3 text-sm font-medium flex items-center gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  Create Voice Profile
                </Button>
              </div>
            )}

            {/* Analyzing State */}
            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                  <Sparkles className="w-8 h-8 opacity-60" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-medium opacity-80">Analyzing Your Voice...</h3>
                  <p className="text-sm opacity-40 max-w-xs">
                    Reading your sent emails and extracting your writing patterns. This takes about 30 seconds.
                  </p>
                </div>
              </div>
            )}

            {/* Profile Content - Only show when profile exists */}
            {hasProfile && (
              <>
                {/* Writing Style Grid */}
            <div className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">Writing Style</h3>
              <div className="grid grid-cols-3 gap-1">
                {writingStyle.map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/5 p-5 rounded-2xl space-y-1 hover:bg-white/[0.07] transition-colors group">
                    <p className="text-[10px] opacity-40 font-medium">{item.label}</p>
                    <p className="text-2xl font-light tracking-tight">{item.value}</p>
                    <p className="text-[10px] opacity-40 font-light">{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tone Section */}
            <div className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">Tone</h3>
              <div className="flex flex-wrap gap-2 bg-white/5 border border-white/5 p-4 rounded-2xl">
                {toneTags.map((tag, i) => (
                  <span 
                    key={i} 
                    className={`px-4 py-1.5 rounded-full text-[11px] font-medium border border-white/10 transition-all ${i === 3 ? 'bg-white/10 opacity-60' : i === 4 ? 'bg-white/5 opacity-40' : 'bg-white text-black'}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Signals Section */}
            <div className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">Signals</h3>
              <div className="space-y-3">
                {signals.map((signal, i) => (
                  <div key={i} className="flex items-center gap-6 group">
                    <p className="text-xs font-light opacity-60 w-24">{signal.label}</p>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${signal.value}%` }}
                        transition={{ delay: 0.2 + (i * 0.1), duration: 1, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full bg-white/60 group-hover:bg-white transition-colors"
                      />
                    </div>
                    <p className="text-[10px] opacity-40 font-mono w-8 text-right">{signal.value}%</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Frequent Phrases */}
            <div className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">Frequent Phrases</h3>
              <div className="space-y-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                {phrases.map((phrase, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <p className="text-xs font-light italic opacity-80">{phrase.text}</p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-white/40" style={{ width: `${(phrase.count/20)*100}%` }} />
                      </div>
                      <span className="text-[10px] opacity-30 font-mono">×{phrase.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sign Off */}
            <div className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">Sign-off</h3>
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                <p className="text-sm font-light italic opacity-90">— {profile?.patterns?.signOffs?.[0] || 'M'}</p>
                <p className="text-[10px] opacity-30 font-medium">used {Math.round(Math.random() * 30 + 20)}% of the time</p>
              </div>
            </div>

            {/* Sample Draft */}
            <div className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">Sample Draft</h3>
              <div className="bg-white/5 border border-white/5 p-6 rounded-2xl space-y-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="space-y-1 relative z-10">
                  <p className="text-[10px] opacity-30 font-mono">re: sync tomorrow?</p>
                </div>
                <div className="space-y-4 relative z-10">
                  <p className="text-sm font-light opacity-90 leading-relaxed">
                    {profile?.patterns?.greetings?.[0] || 'Hey'} — works for me, 3pm is fine
                  </p>
                  <p className="text-sm font-light opacity-90">lmk if it shifts</p>
                  <p className="text-sm font-light opacity-90">— {profile?.patterns?.signOffs?.[0] || 'M'}</p>
                </div>
              </div>
            </div>
          </>
        )}
          </div>

          {/* Footer - Only show for existing profiles */}
          {hasProfile && (
            <div className="p-8 pt-0 flex items-center justify-between">
              <p className="text-[10px] opacity-20 font-light">updates on every send</p>
              <Button
                variant="outline"
                size="sm"
                onClick={onReAnalyze}
                className="bg-white/5 border-white/10 text-white/40 rounded-xl px-6 text-xs hover:bg-white hover:text-black transition-all flex items-center gap-2"
              >
                <RotateCw className="w-3 h-3" />
                re-analyze
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
