'use client';

import React, { useState, useEffect, useMemo } from 'react';

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

    let animationFrameId: number;
    let startTime = performance.now();
    let hasCompleted = false;

    const tick = (now: number) => {
      let elapsed = now - startTime;
      const playDuration = wordCount * msPerWord + startupMs;
      const totalDuration = playDuration + holdMs;

      if (loop) {
        if (elapsed >= totalDuration) {
          startTime = now;
          elapsed = 0;
          if (onComplete) {
            onComplete();
          }
        }
      } else {
        if (elapsed >= playDuration) {
          elapsed = playDuration;
          setPhase(1);
          if (!hasCompleted) {
            hasCompleted = true;
            if (onComplete) {
              onComplete();
            }
          }
          // Stop requesting animation frames if loop is false and we've reached the end
          return;
        }
      }

      const currentPhase = playDuration > 0 ? clamp01(elapsed / playDuration) : 1;
      setPhase(currentPhase);

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [text, wordCount, msPerWord, startupMs, holdMs, loop, onComplete]);

  if (wordCount === 0) {
    return null;
  }

  const head = phase * (wordCount + 3);

  return (
    <span>
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
              willChange: 'filter, opacity',
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
