"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type SpiralLoaderProps = {
  size?: number;
  className?: string;
};

export function SpiralLoader({ size = 16, className }: SpiralLoaderProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div style={{ width: size, height: size }} className={cn("shrink-0", className)} />;
  }

  return (
    <div className={cn("relative shrink-0 flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg
        className="animate-spin"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Track */}
        <circle
          cx="16"
          cy="16"
          r="13"
          className="stroke-black/10 dark:stroke-white/10"
          strokeWidth="3"
        />
        {/* Spinner head */}
        <circle
          cx="16"
          cy="16"
          r="13"
          className="stroke-black dark:stroke-white"
          strokeWidth="3"
          strokeDasharray="80"
          strokeDashoffset="30"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
