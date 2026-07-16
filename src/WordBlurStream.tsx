'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';

export interface WordBlurStreamProps {
  text: string;
  msPerWord?: number;     // default 105
  startupMs?: number;     // default 600
  holdMs?: number;       // default 1500
  maxBlurPx?: number;     // default 7
  loop?: boolean;         // default true
  onComplete?: () => void; // fires each time a cycle completes
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export const WordBlurStream: React.FC<WordBlurStreamProps> = ({
  text,
  msPerWord = 105,
  startupMs = 600,
  holdMs = 1500,
  maxBlurPx = 7,
  loop = true,
  onComplete,
}) => {
  const [phase, setPhase] = useState(0);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Parse text into tokens (words and whitespaces)
  const { parsedTokens, wordCount } = useMemo(() => {
    if (!text) {
      return { parsedTokens: [], wordCount: 0 };
    }
    const tokens = text.split(/(\s+)/);
    let wordIdx = 0;
    const parsed = tokens.map((t) => {
      const isWord = t.length > 0 && !/^\s+$/.test(t);
      return {
        text: t,
        isWord,
        wordIdx: isWord ? wordIdx++ : undefined,
      };
    });
    return { parsedTokens: parsed, wordCount: wordIdx };
  }, [text]);

  useEffect(() => {
    if (wordCount === 0) {
      setPhase(0);
      return;
    }

    // The reveal itself is short (~wordCount * msPerWord); the old loop kept a
    // 60fps setState going through the entire hold as well, forever. Now frames
    // only run during the reveal, the hold is a single timeout, and everything
    // stops while the element is offscreen.
    const playDuration = wordCount * msPerWord + startupMs;
    let animationFrameId: number | null = null;
    let holdTimeoutId: number | null = null;
    let startTime: number | null = null;
    let hasCompleted = false;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;

      if (elapsed >= playDuration) {
        animationFrameId = null;
        setPhase(1);
        if (!loop) {
          if (!hasCompleted) {
            hasCompleted = true;
            if (onComplete) onComplete();
          }
          return;
        }
        holdTimeoutId = window.setTimeout(() => {
          holdTimeoutId = null;
          if (onComplete) onComplete();
          startTime = null;
          animationFrameId = requestAnimationFrame(tick);
        }, holdMs);
        return;
      }

      setPhase(playDuration > 0 ? clamp01(elapsed / playDuration) : 1);
      animationFrameId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (animationFrameId === null && holdTimeoutId === null && !(hasCompleted && !loop)) {
        startTime = null;
        animationFrameId = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (holdTimeoutId !== null) {
        window.clearTimeout(holdTimeoutId);
        holdTimeoutId = null;
      }
    };

    const container = containerRef.current;
    let observer: IntersectionObserver | null = null;
    if (container) {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) start();
        else stop();
      });
      observer.observe(container);
    } else {
      start();
    }

    return () => {
      stop();
      if (observer) observer.disconnect();
    };
  }, [text, wordCount, msPerWord, startupMs, holdMs, loop, onComplete]);

  if (wordCount === 0) {
    return null;
  }

  const head = phase * (wordCount + 3);

  return (
    <span ref={containerRef}>
      {parsedTokens.map((token, tokenIdx) => {
        if (!token.isWord) {
          return <span key={tokenIdx}>{token.text}</span>;
        }

        const idx = token.wordIdx!;
        const t = clamp01((head - idx) * 0.55);
        const blur = (1 - t) * maxBlurPx;
        const opacity = t;
        const filterStyle = blur > 0.12 ? `blur(${blur.toFixed(2)}px)` : 'none';

        return (
          <span
            key={tokenIdx}
            style={{
              display: 'inline-block',
              opacity,
              filter: filterStyle,
            }}
          >
            {token.text}
          </span>
        );
      })}
    </span>
  );
};

export default WordBlurStream;
