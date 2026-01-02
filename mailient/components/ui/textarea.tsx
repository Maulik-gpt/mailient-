import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white shadow-sm shadow-black/5 transition-shadow placeholder:text-white/70 focus-visible:border-white/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
