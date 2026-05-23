'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, RotateCw, Mic, ExternalLink, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onReAnalyze: () => void;
  onCreate: () => void;
  isAnalyzing?: boolean;
  onProfileUpdated?: (profile: any) => void;
}

const DEFAULT_HABITS = [
  'Uses "thanks" not "thank you"',
  'Signs off with first name',
  'Bullet points for lists',
  'Avoids exclamation marks',
  'No "per my last email"',
  'Short subject lines',
  'Oxford commas always',
  'Uses contractions',
  'Emoji in casual emails',
  'Prefers numbered lists',
];

export const VoiceProfileModal = ({ isOpen, onClose, profile, onReAnalyze, onCreate, isAnalyzing = false, onProfileUpdated }: VoiceProfileModalProps) => {
  // --- Tone Sliders ---
  const [formality, setFormality] = useState(50);
  const [detail, setDetail] = useState(40);
  const [warmth, setWarmth] = useState(50);
  const [confidence, setConfidence] = useState(30);

  // --- Habits ---
  const [habits, setHabits] = useState<string[]>([]);
  const [newHabitInput, setNewHabitInput] = useState('');
  const [showHabitInput, setShowHabitInput] = useState(false);

  // --- Custom Instructions ---
  const [customInstructions, setCustomInstructions] = useState('');

  // --- Learning ---
  const [autoImprove, setAutoImprove] = useState(true);
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);

  // --- Live Preview ---
  const [previewText, setPreviewText] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const previewDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // --- Active Profile Tab ---
  const [activeTab, setActiveTab] = useState<'work' | 'personal'>('work');

  // --- Saving ---
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Hydrate from existing profile
  useEffect(() => {
    if (profile?.manual_settings) {
      const ms = profile.manual_settings;
      setFormality(ms.tone?.formality ?? 50);
      setDetail(ms.tone?.detail ?? 40);
      setWarmth(ms.tone?.warmth ?? 50);
      setConfidence(ms.tone?.confidence ?? 30);
      setHabits(ms.habits || []);
      setCustomInstructions(ms.customInstructions || '');
      setActiveTab(ms.activeProfile || 'work');
    }
    if (profile?.learning) {
      setAutoImprove(profile.learning.autoImprove ?? true);
    }
    // Set a default preview if none exists
    if (!previewText) {
      setPreviewText(profile?.manual_settings?.tone?.formality > 60
        ? 'Friday is suitable. I will update the calendar invitation accordingly.'
        : 'Friday works for me! I\'ll move it on the calendar.');
    }
  }, [profile]);

  // --- Live Preview Debounce ---
  const fetchPreview = useCallback(async () => {
    setIsLoadingPreview(true);
    try {
      const res = await fetch('/api/user/voice-profile/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manualSettings: {
            tone: { formality, detail, warmth, confidence },
            habits,
            customInstructions,
            activeProfile: activeTab,
          }
        })
      });
      const data = await res.json();
      if (data.preview) {
        setPreviewText(data.preview);
      }
    } catch (e) {
      console.warn('Preview fetch failed:', e);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [formality, detail, warmth, confidence, habits, customInstructions, activeTab]);

  // Trigger preview on settings change (debounced)
  useEffect(() => {
    if (!isOpen) return;
    setHasUnsavedChanges(true);
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(() => {
      fetchPreview();
    }, 1200);
    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
  }, [formality, detail, warmth, confidence, habits, customInstructions, activeTab, isOpen]);

  // --- Save Profile ---
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/user/voice-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone: { formality, detail, warmth, confidence },
          habits,
          customInstructions,
          learning: { autoImprove },
          activeProfile: activeTab,
        })
      });
      const data = await res.json();
      if (res.ok && data.profile) {
        onProfileUpdated?.(data.profile);
        setHasUnsavedChanges(false);
        toast.success('Voice profile saved');
      } else {
        toast.error(data.error || 'Failed to save profile');
      }
    } catch (e) {
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Reset to Defaults ---
  const handleReset = () => {
    setFormality(50);
    setDetail(40);
    setWarmth(50);
    setConfidence(30);
    setHabits([]);
    setCustomInstructions('');
    setAutoImprove(true);
    setHasUnsavedChanges(true);
  };

  // --- Run Email Analysis ---
  const handleRunAnalysis = async () => {
    setIsRunningAnalysis(true);
    try {
      const res = await fetch('/api/user/voice-profile', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.profile) {
        onProfileUpdated?.(data.profile);
        toast.success('Email analysis complete! Profile updated.');
        // Re-hydrate from analyzed profile
        if (data.profile.manual_settings) {
          const ms = data.profile.manual_settings;
          setFormality(ms.tone?.formality ?? formality);
          setDetail(ms.tone?.detail ?? detail);
          setWarmth(ms.tone?.warmth ?? warmth);
          setConfidence(ms.tone?.confidence ?? confidence);
          if (ms.habits?.length) setHabits(ms.habits);
          if (ms.customInstructions) setCustomInstructions(ms.customInstructions);
        }
      } else {
        toast.error(data.error || 'Analysis failed');
      }
    } catch (e) {
      toast.error('Failed to run analysis');
    } finally {
      setIsRunningAnalysis(false);
    }
  };

  // --- Add Habit ---
  const addHabit = (text: string) => {
    const trimmed = text.trim();
    if (trimmed && !habits.includes(trimmed)) {
      setHabits(prev => [...prev, trimmed]);
      setNewHabitInput('');
      setShowHabitInput(false);
    }
  };

  const removeHabit = (habit: string) => {
    setHabits(prev => prev.filter(h => h !== habit));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-2xl max-h-[85vh] bg-[#0f0f0f] border border-white/[0.08] rounded-[28px] flex flex-col shadow-[0_40px_120px_rgba(0,0,0,0.8)] font-sans text-white"
        >
          {/* === HEADER === */}
          <div className="px-8 pt-7 pb-3 flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[20px] font-semibold tracking-tight text-white/80">Voice Profile</h2>
                {(profile?.status && profile.status !== 'default') && (
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-[0.15em]">active</span>
                  </div>
                )}
              </div>
              <p className="text-[13px] text-white/35 font-light">
                Mailient uses this to draft replies that sound like you.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 mt-1"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {/* === PROFILE TABS === */}
          <div className="px-8 pb-4 flex gap-2">
            {(['work', 'personal'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-1.5 rounded-full text-[12px] font-semibold tracking-wide transition-all border ${
                  activeTab === tab
                    ? 'bg-white/10 text-white border-white/15'
                    : 'bg-transparent text-white/30 border-white/[0.06] hover:text-white/50 hover:border-white/10'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* === SCROLLABLE BODY === */}
          <div className="flex-1 px-8 pb-6 space-y-6 overflow-y-auto custom-scrollbar min-h-0">
            
            {/* ── TONE SECTION ── */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-5">
              <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/25">Tone</h3>
              <ToneSlider label="Casual" labelRight="Formal" value={formality} onChange={setFormality} />
              <ToneSlider label="Brief" labelRight="Detailed" value={detail} onChange={setDetail} />
              <ToneSlider label="Warm" labelRight="Direct" value={warmth} onChange={setWarmth} />
              <ToneSlider label="Reserved" labelRight="Confident" value={confidence} onChange={setConfidence} />
            </div>

            {/* ── HABITS & PREFERENCES ── */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-4">
              <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/25">Habits & Preferences</h3>
              <div className="flex flex-wrap gap-2">
                {habits.map((habit) => (
                  <span
                    key={habit}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-full text-[12px] text-white/70 font-medium group hover:border-red-500/30 transition-colors"
                  >
                    {habit}
                    <button
                      onClick={() => removeHabit(habit)}
                      className="text-white/20 hover:text-red-400 transition-colors ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {/* Suggestion chips (not yet added) */}
                {DEFAULT_HABITS.filter(h => !habits.includes(h)).slice(0, 3).map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => addHabit(suggestion)}
                    className="px-3.5 py-1.5 bg-transparent border border-dashed border-white/[0.08] rounded-full text-[12px] text-white/25 font-medium hover:text-white/50 hover:border-white/15 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}

                {/* Add custom habit */}
                {showHabitInput ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={newHabitInput}
                      onChange={(e) => setNewHabitInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addHabit(newHabitInput);
                        if (e.key === 'Escape') { setShowHabitInput(false); setNewHabitInput(''); }
                      }}
                      placeholder="Type a habit..."
                      className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.1] rounded-full text-[12px] text-white/70 font-medium focus:outline-none focus:border-white/20 w-40"
                    />
                    <button
                      onClick={() => addHabit(newHabitInput)}
                      className="text-white/30 hover:text-white/60 text-sm"
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowHabitInput(true)}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-transparent border border-dashed border-white/[0.1] rounded-full text-[12px] text-white/25 font-medium hover:text-white/50 hover:border-white/15 transition-all"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
            </div>

            {/* ── CUSTOM INSTRUCTIONS ── */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-3">
              <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/25">Custom Instructions</h3>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="E.g., I never apologise for response time. I prefer to just get to the point. Oxford commas always."
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-4 text-[14px] text-white/80 font-light leading-relaxed focus:outline-none focus:border-white/15 resize-none placeholder:text-white/20 transition-colors"
                rows={3}
              />
            </div>

            {/* ── LEARNING ── */}
            <div className="bg-emerald-500/[0.04] border border-emerald-500/[0.1] rounded-2xl p-6 space-y-5">
              <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-emerald-400/60">Learning</h3>
              
              {/* Auto-improve toggle */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[14px] font-semibold text-white/80">Auto-improve from sent mail</p>
                  <p className="text-[12px] text-white/30 font-light mt-0.5">
                    Mailient reads your edits to AI drafts and refines this profile
                  </p>
                </div>
                <button
                  onClick={() => setAutoImprove(!autoImprove)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                    autoImprove ? 'bg-emerald-500' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                      autoImprove ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Run analysis */}
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-emerald-500/[0.08]">
                <div>
                  <p className="text-[14px] font-semibold text-white/80">Analyse past 90 days of sent mail</p>
                  <p className="text-[12px] text-white/30 font-light mt-0.5">
                    Bootstrap this profile from your existing writing patterns
                  </p>
                </div>
                <button
                  onClick={handleRunAnalysis}
                  disabled={isRunningAnalysis}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.06] border border-white/[0.1] rounded-xl text-[13px] font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-all disabled:opacity-40"
                >
                  {isRunningAnalysis ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>Run analysis <ExternalLink className="w-3 h-3" /></>
                  )}
                </button>
              </div>
            </div>

            {/* ── LIVE PREVIEW ── */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/25">Live Preview</h3>
              </div>
              <p className="text-[12px] text-white/25 font-light">
                Sample reply to: <span className="italic text-white/40">&ldquo;Can we reschedule Thursday&apos;s call to Friday?&rdquo;</span>
              </p>
              <div className="bg-white/[0.03] border border-white/[0.04] rounded-xl px-5 py-4 min-h-[48px] relative">
                {isLoadingPreview ? (
                  <div className="flex items-center gap-2 text-white/20 text-[13px]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating preview...
                  </div>
                ) : (
                  <p className="text-[14px] text-white/70 font-light leading-relaxed">
                    {previewText || 'Adjust sliders above to see your profile in action'}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-white/15 font-light">
                Adjust sliders above to see your profile in action
              </p>
            </div>
          </div>

          {/* === FOOTER === */}
          <div className="px-8 py-5 border-t border-white/[0.04] flex items-center justify-between">
            <button
              onClick={handleReset}
              className="text-[13px] text-white/25 hover:text-white/50 font-medium transition-colors"
            >
              Reset to Defaults
            </button>
            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <span className="text-[11px] text-amber-400/60 font-medium">Unsaved changes</span>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-white text-black rounded-xl text-[13px] font-bold hover:bg-white/90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Profile
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// ─── Tone Slider Sub-Component ───────────────────────────────────────────────
function ToneSlider({ label, labelRight, value, onChange }: {
  label: string;
  labelRight: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-[13px] text-white/40 font-medium w-20 text-right shrink-0">{label}</span>
      <div className="flex-1 relative group">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="voice-slider w-full"
        />
      </div>
      <span className="text-[13px] text-white/40 font-medium w-20 shrink-0">{labelRight}</span>
      <style dangerouslySetInnerHTML={{ __html: `
        .voice-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 2px;
          background: linear-gradient(to right, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.12) 100%);
          outline: none;
          cursor: pointer;
        }
        .voice-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #7db4f5;
          border: 2px solid #0f0f0f;
          box-shadow: 0 0 0 2px rgba(125,180,245,0.15), 0 2px 8px rgba(0,0,0,0.4);
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .voice-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 0 4px rgba(125,180,245,0.2), 0 2px 12px rgba(0,0,0,0.5);
        }
        .voice-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #7db4f5;
          border: 2px solid #0f0f0f;
          box-shadow: 0 0 0 2px rgba(125,180,245,0.15), 0 2px 8px rgba(0,0,0,0.4);
          cursor: pointer;
        }
        .voice-slider::-moz-range-track {
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.12);
        }
      ` }} />
    </div>
  );
}
