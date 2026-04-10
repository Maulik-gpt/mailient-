'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PersonalitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (personality: string) => void;
  initialPersonality?: string;
}

const placeholderVariations = [
  "Give Arcus some context…",
  "Describe how Arcus should behave…",
  "Set Arcus's communication style…",
  "Customize Arcus's personality…"
];

export function PersonalitySettingsModal({ 
  isOpen, 
  onClose, 
  onSave,
  initialPersonality = ''
}: PersonalitySettingsModalProps) {
  const [personality, setPersonality] = useState(initialPersonality);
  const [placeholderText, setPlaceholderText] = useState('');
  const placeholderIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const isTypingRef = useRef(true);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial personality when modal opens
  useEffect(() => {
    if (isOpen && initialPersonality) {
      setPersonality(initialPersonality);
    } else if (isOpen && !initialPersonality) {
      setPersonality('');
    }
  }, [isOpen, initialPersonality]);

  // Animated placeholder effect
  useEffect(() => {
    if (!isOpen) {
      // Reset when modal closes
      placeholderIndexRef.current = 0;
      charIndexRef.current = 0;
      isTypingRef.current = true;
      setPlaceholderText('');
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
      return;
    }

    const animatePlaceholder = () => {
      const currentPlaceholder = placeholderVariations[placeholderIndexRef.current];
      
      if (isTypingRef.current) {
        // Typing phase
        if (charIndexRef.current < currentPlaceholder.length) {
          setPlaceholderText(currentPlaceholder.substring(0, charIndexRef.current + 1));
          charIndexRef.current++;
          animationRef.current = setTimeout(animatePlaceholder, 50);
        } else {
          // Finished typing, wait then start deleting
          isTypingRef.current = false;
          animationRef.current = setTimeout(animatePlaceholder, 2000);
        }
      } else {
        // Deleting phase
        if (charIndexRef.current > 0) {
          charIndexRef.current--;
          setPlaceholderText(currentPlaceholder.substring(0, charIndexRef.current));
          animationRef.current = setTimeout(animatePlaceholder, 30);
        } else {
          // Finished deleting, move to next placeholder
          placeholderIndexRef.current = (placeholderIndexRef.current + 1) % placeholderVariations.length;
          isTypingRef.current = true;
          charIndexRef.current = 0;
          animationRef.current = setTimeout(animatePlaceholder, 100);
        }
      }
    };

    // Start animation
    animatePlaceholder();

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isOpen]);

  const handleSave = () => {
    onSave(personality);
    onClose();
  };

  const handleCancel = () => {
    setPersonality(initialPersonality);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="relative p-6 md:p-10 w-[min(90vw,640px)] max-h-[85vh] overflow-hidden shadow-2xl rounded-[2.5rem] border border-neutral-200 dark:border-[#2a2a2a] bg-white dark:bg-black"
      >
        {/* Header with Close Icon */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">Set Personality</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Describe how Arcus should behave</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all duration-200 shadow-sm border border-neutral-100 dark:border-neutral-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multiline Input */}
        <div className="mb-8">
          <textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder={placeholderText || placeholderVariations[0]}
            className="w-full min-h-[250px] p-6 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#3a3a3a] rounded-[1.5rem] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/40 focus:outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 resize-none font-sans text-lg leading-relaxed shadow-inner"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-8 py-3 rounded-2xl font-semibold transition-all duration-200 bg-neutral-100 dark:bg-[#2a2a2a] text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-[#333]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={cn(
              "rounded-2xl px-8 py-3 transition-all font-semibold flex items-center gap-2 border-none shadow-lg active:scale-95 shadow-black/10 dark:shadow-white/5",
              "bg-black dark:bg-[#fafafa] text-white dark:text-black hover:bg-black/90 dark:hover:bg-neutral-200"
            )}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
