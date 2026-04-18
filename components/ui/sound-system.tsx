'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useDashboardSettings } from '@/lib/DashboardSettingsContext';

const SOUNDS = {
    mechanical: {
        press: '/sounds/mechanical-press.wav',
        click: '/sounds/mechanical-click.wav'
    },
    macos: {
        press: '/sounds/macos-press.ogg',
        click: '/sounds/macos-click.ogg'
    },
    bubble: {
        press: '/sounds/bubble.mp3',
        click: '/sounds/bubble.mp3'
    },
    vintage: {
        press: '/sounds/vintage-press.wav',
        click: '/sounds/vintage-click.wav'
    }
};

export function SoundSystem() {
    const { settings } = useDashboardSettings();
    const audioContextRef = useRef<AudioContext | null>(null);
    const buffersRef = useRef<Record<string, AudioBuffer>>({});

    // Initialize AudioContext on first user interaction
    useEffect(() => {
        const initAudio = () => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }
        };

        window.addEventListener('keydown', initAudio, { once: true });
        window.addEventListener('mousedown', initAudio, { once: true });

        return () => {
            window.removeEventListener('keydown', initAudio);
            window.removeEventListener('mousedown', initAudio);
        };
    }, []);

    // Preload sounds
    useEffect(() => {
        if (!settings.soundExperience) return;

        const loadSound = async (type: keyof typeof SOUNDS, action: 'press' | 'click') => {
            const url = SOUNDS[type][action];
            const key = `${type}-${action}`;
            
            if (buffersRef.current[key]) return;

            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                if (audioContextRef.current) {
                    const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                    buffersRef.current[key] = audioBuffer;
                }
            } catch (e) {
                console.error(`Failed to load sound: ${key}`, e);
            }
        };

        Object.keys(SOUNDS).forEach((type) => {
            loadSound(type as any, 'press');
            loadSound(type as any, 'click');
        });
    }, [settings.soundExperience]);

    const playSound = useCallback((action: 'press' | 'click') => {
        if (!settings.soundExperience || !audioContextRef.current) return;

        const buffer = buffersRef.current[`${settings.soundType}-${action}`];
        if (!buffer) return;

        const ctx = audioContextRef.current;
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        // Panning (Spatial Audio effect)
        // We can randomize pan slightly for immersive feel
        const panner = ctx.createStereoPanner();
        panner.pan.value = (Math.random() - 0.5) * 0.4; // Slightly left or right

        // Pitch variation
        const pitchVariation = (Math.random() - 0.5) * 0.1 * settings.soundPitch;
        source.playbackRate.value = settings.soundPitch + pitchVariation;

        // Gain (Volume)
        const gainNode = ctx.createGain();
        gainNode.gain.value = settings.soundVolume;

        source.connect(panner).connect(gainNode).connect(ctx.destination);
        source.start(0);
    }, [settings.soundExperience, settings.soundType, settings.soundPitch, settings.soundVolume]);

    useEffect(() => {
        if (!settings.soundExperience) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const isTypingKey = e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter' || e.key === 'Space';
            
            const activeElement = document.activeElement;
            const isInput = activeElement?.tagName === 'INPUT' || 
                           activeElement?.tagName === 'TEXTAREA' || 
                           (activeElement as HTMLElement)?.isContentEditable;

            if (isTypingKey && isInput) {
                playSound('press');
            }
        };

        const handleMouseDown = (e: MouseEvent) => {
            // Only play click sound for interactive elements
            const target = e.target as HTMLElement;
            const isInteractive = target.closest('button, a, input, [role="button"], .clickable');
            
            if (isInteractive) {
                playSound('click');
            }
        };

        const handleCustomSound = (e: any) => {
            if (e.detail?.action) {
                playSound(e.detail.action);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('play-ai-sound', handleCustomSound);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('play-ai-sound', handleCustomSound);
        };
    }, [settings.soundExperience, playSound]);

    return null;
}
