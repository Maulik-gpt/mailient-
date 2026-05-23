'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonalitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (personality: string) => void;
  initialPersonality?: string;
}

const placeholderVariations = [
  'Give Arcus some context...',
  'Describe how Arcus should behave...',
  "Set Arcus's communication style...",
  "Customize Arcus's personality...",
];

export function PersonalitySettingsModal({
  isOpen,
  onClose,
  onSave,
  initialPersonality = '',
}: PersonalitySettingsModalProps) {
  const [personality, setPersonality] = useState(initialPersonality);
  const [placeholderText, setPlaceholderText] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState('');
  const placeholderIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const isTypingRef = useRef(true);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPersonality(initialPersonality);
      setEnhanceError('');
    }
  }, [isOpen, initialPersonality]);

  // Animated placeholder
  useEffect(() => {
    if (!isOpen) {
      placeholderIndexRef.current = 0;
      charIndexRef.current = 0;
      isTypingRef.current = true;
      setPlaceholderText('');
      if (animationRef.current) clearTimeout(animationRef.current);
      return;
    }

    const animate = () => {
      const current = placeholderVariations[placeholderIndexRef.current];
      if (isTypingRef.current) {
        if (charIndexRef.current < current.length) {
          setPlaceholderText(current.substring(0, charIndexRef.current + 1));
          charIndexRef.current++;
          animationRef.current = setTimeout(animate, 50);
        } else {
          isTypingRef.current = false;
          animationRef.current = setTimeout(animate, 2000);
        }
      } else {
        if (charIndexRef.current > 0) {
          charIndexRef.current--;
          setPlaceholderText(current.substring(0, charIndexRef.current));
          animationRef.current = setTimeout(animate, 30);
        } else {
          placeholderIndexRef.current =
            (placeholderIndexRef.current + 1) % placeholderVariations.length;
          isTypingRef.current = true;
          animationRef.current = setTimeout(animate, 100);
        }
      }
    };

    animate();
    return () => { if (animationRef.current) clearTimeout(animationRef.current); };
  }, [isOpen]);

  const handleEnhance = async () => {
    const draft = personality.trim();
    if (!draft) return;
    setIsEnhancing(true);
    setEnhanceError('');
    try {
      const res = await fetch('/api/agent-talk/personality/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft }),
      });
      const data = await res.json();
      if (!res.ok || !data.enhanced) throw new Error(data.error || 'Enhancement failed');
      setPersonality(data.enhanced);
      setTimeout(() => textareaRef.current?.focus(), 50);
    } catch (err: any) {
      setEnhanceError(err.message || 'Could not enhance. Try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSave = () => {
    onSave(personality);
    onClose();
  };

  const handleCancel = () => {
    setPersonality(initialPersonality);
    setEnhanceError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative p-6 md:p-10 w-[min(90vw,640px)] max-h-[90vh] overflow-y-auto shadow-2xl rounded-[2.5rem] border border-neutral-200 dark:border-[#2a2a2a] bg-white dark:bg-black flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
              Arcus Personality
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Tell Arcus how to behave, communicate, and respond
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all duration-200 border border-neutral-100 dark:border-neutral-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Textarea area */}
        <div className="relative mb-3 flex-1">
          <textarea
            ref={textareaRef}
            value={personality}
            onChange={(e) => { setPersonality(e.target.value); setEnhanceError(''); }}
            placeholder={placeholderText || placeholderVariations[0]}
            className="w-full min-h-[260px] p-5 pb-14 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#3a3a3a] rounded-[1.5rem] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 resize-none font-sans text-[15px] leading-relaxed shadow-inner"
          />

          {/* Enhance button — inside textarea bottom */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            {enhanceError ? (
              <span className="text-[12px] text-red-400">{enhanceError}</span>
            ) : (
              <span className="text-[12px] text-neutral-400 dark:text-white/25">
                {personality.trim()
                  ? `${personality.trim().split(/\s+/).length} words`
                  : 'Write your instructions above'}
              </span>
            )}

            <button
              onClick={handleEnhance}
              disabled={isEnhancing || !personality.trim()}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all duration-200 border',
                personality.trim() && !isEnhancing
                  ? 'bg-black dark:bg-white text-white dark:text-black border-transparent hover:opacity-90 active:scale-95'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-white/25 border-transparent cursor-not-allowed',
              )}
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Enhancing…
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Enhance
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hint */}
        <p className="text-[12px] text-neutral-400 dark:text-white/25 mb-6 leading-relaxed">
          Tip: Write a rough description and hit{' '}
          <span className="font-semibold text-neutral-500 dark:text-white/40">Enhance</span>{' '}
          — Arcus will expand it into a detailed professional instruction set.
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-7 py-3 rounded-2xl font-semibold transition-all duration-200 bg-neutral-100 dark:bg-[#2a2a2a] text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-[#333]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-2xl px-7 py-3 transition-all font-semibold flex items-center gap-2 shadow-lg active:scale-95 bg-black dark:bg-[#fafafa] text-white dark:text-black hover:bg-black/90 dark:hover:bg-neutral-200"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
