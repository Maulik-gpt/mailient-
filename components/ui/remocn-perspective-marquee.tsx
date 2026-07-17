"use client";

import { useRef, useEffect } from "react";

export interface PerspectiveMarqueeProps {
  items?: string[];
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  pixelsPerFrame?: number;
  rotateY?: number;
  rotateX?: number;
  perspective?: number;
  fadeColor?: string;
  background?: string;
  speed?: number;
  className?: string;
}

const FONT_FAMILY =
  "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif";

const DEFAULT_ITEMS = [
  "Vercel",
  "Linear",
  "Stripe",
  "Figma",
  "Notion",
  "Raycast",
  "Arc",
  "Cursor",
];

export function PerspectiveMarquee({
  items = DEFAULT_ITEMS,
  fontSize = 84,
  color = "#fafafa",
  fontWeight = 700,
  pixelsPerFrame = 2,
  rotateY = -28,
  rotateX = 8,
  perspective = 1200,
  fadeColor = "#050505",
  background = "#050505",
  speed = 1,
  className,
}: PerspectiveMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const itemPadding = fontSize * 0.9;
  const approxItemWidth = items.reduce(
    (acc, item) => acc + item.length * fontSize * 0.6 + itemPadding,
    0,
  );

  const rendered = [...items, ...items, ...items];

  // The loop writes styles straight to the DOM instead of going through React
  // state (which re-rendered the whole marquee every frame). The scroll is a
  // cheap composited transform; the depth blur is quantized to whole pixels so
  // a span only repaints when its step actually changes. Time-based movement
  // keeps the speed identical on 60Hz and 120Hz displays, and the loop pauses
  // while the marquee is offscreen.
  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const spans = Array.from(track.children) as HTMLElement[];
    const lastBlurStep = new Array(spans.length).fill(-1);
    const pxPerSecond = pixelsPerFrame * 60 * speed;
    const slot = approxItemWidth / items.length;
    let rafId: number | null = null;
    let lastNow: number | null = null;
    let distance = 0;

    // Depth focus follows the real container center — a hardcoded desktop
    // center leaves every item blurred on narrow (mobile) viewports.
    let center = container.clientWidth / 2 || 640;
    const onResize = () => {
      center = container.clientWidth / 2 || 640;
    };
    window.addEventListener("resize", onResize);

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (lastNow === null) {
        lastNow = now;
        return;
      }
      const dt = Math.min(now - lastNow, 100);
      lastNow = now;
      distance += (pxPerSecond * dt) / 1000;
      const offset = -(distance % approxItemWidth);
      track.style.transform = `translateX(${offset}px)`;

      for (let i = 0; i < spans.length; i++) {
        const itemCenter = i * slot + slot / 2 + offset;
        const norm = (itemCenter - center) / center;
        const dist = Math.min(1, Math.abs(norm));
        const blurStep = Math.round(dist * 6);
        if (blurStep !== lastBlurStep[i]) {
          lastBlurStep[i] = blurStep;
          spans[i].style.filter = blurStep > 0 ? `blur(${blurStep}px)` : "none";
          spans[i].style.opacity = String(1 - (blurStep / 6) * 0.4);
        }
      }
    };

    const start = () => {
      if (rafId === null) {
        lastNow = null;
        rafId = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    });
    observer.observe(container);

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [items, approxItemWidth, pixelsPerFrame, speed]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        perspective: `${perspective}px`,
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          ref={trackRef}
          style={{
            display: "flex",
            whiteSpace: "nowrap",
            transform: "translateX(0px)",
          }}
        >
          {rendered.map((item, i) => {
            const itemCenter =
              i * (approxItemWidth / items.length) +
              approxItemWidth / items.length / 2;
            const norm = (itemCenter - 640) / 640;
            const distance = Math.min(1, Math.abs(norm));
            const blurPx = Math.round(distance * 6);
            const opacity = 1 - (blurPx / 6) * 0.4;

            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  fontFamily: FONT_FAMILY,
                  fontSize,
                  fontWeight,
                  color,
                  letterSpacing: "-0.03em",
                  paddingRight: itemPadding,
                  filter: blurPx > 0 ? `blur(${blurPx}px)` : "none",
                  opacity,
                }}
              >
                {item}
              </span>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(90deg, ${fadeColor} 0%, transparent 18%, transparent 82%, ${fadeColor} 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(180deg, ${fadeColor} 0%, transparent 25%, transparent 75%, ${fadeColor} 100%)`,
        }}
      />
    </div>
  );
}
