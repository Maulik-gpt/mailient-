"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A looping product demo clip.
 *
 * Pauses itself whenever it scrolls out of view. That is not a nicety: a
 * <video autoPlay loop> keeps decoding frames forever wherever it sits on the
 * page, so a landing page with several of them burns CPU continuously on
 * content nobody is looking at. Same in-view gating the hero player and the
 * Three Things carousel already use.
 *
 * Always pass a `poster`. Without one the element paints black until the first
 * frame decodes, which on a dark page reads as a broken embed.
 */

interface DemoVideoProps {
  src: string;
  poster: string;
  /** Describe what the clip SHOWS — it stands in for the video for screen readers. */
  label: string;
  className?: string;
  /** object-cover crops to fill; object-contain letterboxes. */
  fit?: "cover" | "contain";
}

export function DemoVideo({
  src,
  poster,
  label,
  className,
  fit = "cover",
}: DemoVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {
            // Autoplay can be refused (e.g. battery saver). The poster stays
            // visible, which is a fine resting state — nothing to recover.
          });
        } else if (!video.paused) {
          video.pause();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      aria-label={label}
      className={cn(
        "w-full h-full",
        fit === "cover" ? "object-cover" : "object-contain",
        className,
      )}
    />
  );
}
