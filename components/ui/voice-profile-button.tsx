'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Mic } from 'lucide-react';
import { toast } from 'sonner';
import { VoiceProfileModal } from './voice-profile-modal';

/**
 * A self-contained "Voice Profile" text button for the draft-reply modals.
 *
 * It opens the Voice Profile card, loads the user's saved profile, and lets
 * them re-analyze their sent mail or hand-tune tone — all persisted via
 * /api/user/voice-profile. Drafts already generate against the saved profile
 * server-side, so any change here flows into the next reply; when `onApplied`
 * is provided the host can re-draft the CURRENT reply the moment the voice
 * changes.
 */
interface VoiceProfileButtonProps {
  /** Called once, after the user changes their voice profile (re-analyze or
   *  tone edit) and closes the card — so the host can re-draft with it. */
  onApplied?: (profile: any) => void;
  className?: string;
}

const normalize = (d: any) => d?.profile?.voice_profile || d?.profile || null;

export function VoiceProfileButton({ onApplied, className }: VoiceProfileButtonProps) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const loadedRef = useRef(false);
  const changedRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/user/voice-profile');
      const d = await res.json();
      setProfile(normalize(d));
    } catch { /* non-fatal */ } finally {
      loadedRef.current = true;
    }
  }, []);

  const handleOpen = () => {
    if (!loadedRef.current) fetchProfile();
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    // Apply once, after they finish editing, if anything actually changed.
    if (changedRef.current) {
      changedRef.current = false;
      onApplied?.(profile);
    }
  };

  const reAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/user/voice-profile', { method: 'POST' });
      const d = await res.json();
      if (res.ok && d.profile) {
        setProfile(d.profile?.voice_profile || d.profile);
        changedRef.current = true;
        toast.success('Voice profile updated — new replies will use it.');
      } else {
        toast.error(d.error || 'Not enough sent mail to analyze yet.');
      }
    } catch {
      toast.error('Couldn’t analyze your voice — try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="Open your voice profile — drafts are written in this voice"
        className={
          className ||
          'inline-flex items-center gap-1.5 text-[13px] font-medium text-black/45 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors'
        }
      >
        <Mic className="w-3.5 h-3.5" strokeWidth={1.75} />
        Voice Profile
      </button>

      <VoiceProfileModal
        isOpen={open}
        onClose={handleClose}
        profile={profile}
        onReAnalyze={reAnalyze}
        onCreate={reAnalyze}
        isAnalyzing={isAnalyzing}
        onProfileUpdated={(p: any) => { setProfile(p); changedRef.current = true; }}
      />
    </>
  );
}

export default VoiceProfileButton;
