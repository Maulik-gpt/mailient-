'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

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
        className="relative p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl rounded-[2rem] border border-[#2a2a2a]"
        style={{ backgroundColor: '#000' }}
      >
        {/* Header with Close Icon */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Set Arcus's Personality</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multiline Input */}
        <div className="mb-6">
          <textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder={placeholderText || placeholderVariations[0]}
            className="w-full min-h-[200px] p-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 resize-none font-sans"
            style={{ backgroundColor: '#262626' }}
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 rounded-lg font-medium transition-all duration-200 text-white hover:bg-white/10"
            style={{ backgroundColor: '#2a2a2a' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-lg font-medium transition-all duration-200 text-black hover:bg-gray-100"
            style={{ backgroundColor: '#fafafa', color: '#000' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

