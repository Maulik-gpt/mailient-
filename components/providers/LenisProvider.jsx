"use client";

import React, { useEffect } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";

// Smooth Anchor Scroll Handler
function SmoothScrollAnchorHandler() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    // Handle clicks on local hash links
    const handleAnchorClick = (e) => {
      const target = e.target.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();

        const targetId = href.substring(1);
        if (targetId === "") {
          lenis.scrollTo(0, {
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // premium exponential out easing
          });
          return;
        }

        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          lenis.scrollTo(targetElement, {
            offset: -80, // Offset to account for sticky navigation header
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          });
          // Update URL hash smoothly without triggering a hard jump
          window.history.pushState(null, "", href);
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => {
      document.removeEventListener("click", handleAnchorClick);
    };
  }, [lenis]);

  // Handle URL hashes on mount or path transitions
  useEffect(() => {
    if (!lenis) return;

    if (window.location.hash) {
      const hash = window.location.hash;
      const targetElement = document.querySelector(hash);
      if (targetElement) {
        // Small delay to allow the layout to settle after load
        setTimeout(() => {
          lenis.scrollTo(targetElement, {
            offset: -80,
            immediate: false,
            duration: 1.0,
          });
        }, 150);
      }
    }
  }, [lenis]);

  return null;
}

export function LenisProvider({ children }) {
  return (
    <ReactLenis
      root
      options={{
        duration: 1.2,
        lerp: 0.1,
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.5,
      }}
    >
      <SmoothScrollAnchorHandler />
      {children}
    </ReactLenis>
  );
}
