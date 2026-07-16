"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";

interface SpecialTextProps {
  children: string;
  speed?: number;
  delay?: number;
  className?: string;
  inView?: boolean;
  once?: boolean;
}

const RANDOM_CHARS = "_!X$0-+*#";

function getRandomChar(prevChar?: string): string {
  let char: string;
  do {
    char = RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
  } while (char === prevChar);
  return char;
}

export function SpecialText({
  children,
  speed = 20,
  delay = 0,
  className = "",
  inView = false,
  once = true,
}: SpecialTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(containerRef, { once, margin: "-100px" });
  const shouldAnimate = inView ? isInView : true;
  const [hasStarted, setHasStarted] = useState(() => !inView && delay <= 0);
  const text = children;
  const [displayText, setDisplayText] = useState<string>(
    " ".repeat(text.length),
  );
  const startTimeoutRef = useRef<number | null>(null);

  function clearStartTimeout() {
    if (startTimeoutRef.current === null) return;
    window.clearTimeout(startTimeoutRef.current);
    startTimeoutRef.current = null;
  }

  useEffect(() => {
    if (shouldAnimate && !hasStarted) {
      clearStartTimeout();
      if (delay <= 0) {
        setHasStarted(true);
        return;
      }
      startTimeoutRef.current = window.setTimeout(() => {
        startTimeoutRef.current = null;
        setHasStarted(true);
      }, delay * 1000);
    }
    return () => clearStartTimeout();
  }, [shouldAnimate, hasStarted, delay]);

  useEffect(() => {
    if (!hasStarted) return;

    setDisplayText(" ".repeat(text.length));

    // One interval per run, advanced via locals instead of per-step state (the
    // old version tore down and recreated the interval on every step). Speeds
    // below one frame (~16ms) batch multiple steps per tick, so the pacing is
    // unchanged but the browser paints each frame once.
    let phase: 1 | 2 = 1;
    let step = 0;
    let done = false;
    const tickMs = Math.max(16, speed);
    const stepsPerTick = Math.max(1, Math.round(tickMs / speed));

    const advance = (): string => {
      if (phase === 1) {
        const maxSteps = text.length * 2;
        const currentLength = Math.min(step + 1, text.length);
        const chars: string[] = [];
        for (let i = 0; i < currentLength; i++) {
          chars.push(getRandomChar(i > 0 ? chars[i - 1] : undefined));
        }
        for (let i = currentLength; i < text.length; i++) {
          chars.push("\u00A0");
        }
        if (step < maxSteps - 1) {
          step++;
        } else {
          phase = 2;
          step = 0;
        }
        return chars.join("");
      }

      const revealedCount = Math.floor(step / 2);
      const chars: string[] = [];
      for (let i = 0; i < revealedCount && i < text.length; i++) {
        chars.push(text[i]);
      }
      if (revealedCount < text.length) {
        chars.push(step % 2 === 0 ? "_" : getRandomChar());
      }
      for (let i = chars.length; i < text.length; i++) {
        chars.push(getRandomChar());
      }
      if (step < text.length * 2 - 1) {
        step++;
      } else {
        done = true;
        return text;
      }
      return chars.join("");
    };

    const interval = window.setInterval(() => {
      let frame = "";
      for (let i = 0; i < stepsPerTick && !done; i++) {
        frame = advance();
      }
      setDisplayText(frame);
      if (done) window.clearInterval(interval);
    }, tickMs);

    return () => window.clearInterval(interval);
  }, [text, speed, hasStarted]);

  return (
    <span
      ref={containerRef}
      className={`h-4.5 leading-5 inline-flex font-mono font-medium ${className}`}
    >
      {displayText}
    </span>
  );
}
