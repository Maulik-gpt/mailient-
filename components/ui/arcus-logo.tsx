import * as React from "react";
import { cn } from "@/lib/utils";

export interface ArcusLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number; // Size in pixels, default is 64
}

export const ArcusLogo = React.forwardRef<HTMLDivElement, ArcusLogoProps>(
  ({ className, size = 64, ...props }, ref) => {
    const filterId = React.useId().replace(/:/g, "");

    return (
      <div
        ref={ref}
        className={cn("relative flex items-center justify-center select-none pointer-events-none", className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          {/* White Cat Head Silhouette */}
          <path
            d="M 52 168 
               C 42 168, 30 148, 34 128
               C 38 116, 38 112, 42 106
               C 46 98, 48 90, 42 82
               C 38 72, 54 52, 68 32
               L 120 56
               L 168 48
               C 174 75, 172 95, 168 115
               C 166 135, 164 150, 156 162
               C 148 168, 60 168, 52 168 Z"
            fill="#ffffff"
          />

          {/* Left Eyeball (Black Pupil) - Static Shifted Left */}
          <circle
            cx="76"
            cy="110"
            r="30"
            fill="#000000"
          />

          {/* Right Eyeball (Black Pupil) - Static Shifted Left */}
          <circle
            cx="122"
            cy="114"
            r="26"
            fill="#000000"
          />
        </svg>
      </div>
    );
  }
);

ArcusLogo.displayName = "ArcusLogo";
