import * as React from "react";
import { cn } from "@/lib/utils";

export interface ArcusLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number; // Size in pixels, default is 64
}

export const ArcusLogo = React.forwardRef<HTMLDivElement, ArcusLogoProps>(
  ({ className, size = 64, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative flex items-center justify-center select-none overflow-hidden rounded-2xl bg-black border border-white/[0.08]", className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <img
          src="/arcus-logo.png"
          alt="Arcus AI Logo"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
);

ArcusLogo.displayName = "ArcusLogo";
