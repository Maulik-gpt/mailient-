'use client';

import confetti from 'canvas-confetti';

/**
 * Trigger a quick success confetti burst
 * Used after successful quick actions like sending replies, scheduling calls, etc.
 */
export function triggerSuccessConfetti() {
    // Quick, satisfying confetti burst - not too much, just a dopamine hit
    confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#6366f1', '#8b5cf6', '#a855f7', '#22c55e', '#3b82f6'],
        scalar: 0.8,
        gravity: 1.2,
        drift: 0,
        ticks: 150, // How long particles stay
        disableForReducedMotion: true
    });
}

/**
 * Trigger a celebratory confetti cannon from both sides
 * Used for major accomplishments
 */
export function triggerCelebrationConfetti() {
    const duration = 1000;
    const end = Date.now() + duration;

    const frame = () => {
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#6366f1', '#8b5cf6', '#a855f7']
        });
        confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#22c55e', '#3b82f6', '#06b6d4']
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    };

    frame();
}

/**
 * Trigger a mini confetti pop - very subtle
 * Used for smaller actions
 */
export function triggerMiniConfetti() {
    confetti({
        particleCount: 25,
        spread: 40,
        origin: { y: 0.65 },
        colors: ['#6366f1', '#8b5cf6', '#22c55e'],
        scalar: 0.6,
        gravity: 1.5,
        ticks: 100,
        disableForReducedMotion: true
    });
}
