import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// A new component to create the bubble effect
export interface UsageBadgeProps {
  /** The icon to display next to the plan name. */
  icon: React.ReactNode;
  /** The name of the current plan (e.g., "Free", "Pro"). */
  planName: string;
  /** The current usage count. */
  usage: number;
  /** The total limit for the plan. */
  limit: number;
  /** The content to show inside the hover tooltip. */
  tooltipContent: React.ReactNode;
  /** Optional additional class names for custom styling. */
  className?: string;
}

const UsageBadge = React.forwardRef<HTMLDivElement, UsageBadgeProps>(
  ({ icon, planName, usage, limit, tooltipContent, className }, ref) => {
    // Calculate the percentage of usage for the progress bar
    const usagePercentage = limit > 0 ? (usage / limit) * 100 : 0;
    const isLowCredits = limit - usage <= (limit * 0.2);

    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              ref={ref}
              className={cn(
                "group relative inline-flex cursor-pointer items-center gap-2.5 overflow-hidden rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] px-3.5 py-1.5 text-[13px] font-medium text-neutral-800 dark:text-neutral-900 dark:text-neutral-200 backdrop-blur-md transition-all hover:bg-white/90 dark:hover:bg-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/20 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)]",
                className
              )}
            >
              {/* Subtle background glow for AI */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/[0.05] to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Icon with subtle pulse if low credits */}
              <div className={cn(
                "relative z-10 transition-transform duration-300 group-hover:scale-110",
                isLowCredits && "text-amber-500"
              )}>
                {icon}
              </div>

              {/* Text Content */}
              <div className="relative z-10 flex items-center gap-1.5">
                <span className="tracking-tight">{planName}</span>
                <div className="h-3 w-[1px] bg-black/10 dark:bg-white/10 mx-0.5" />
                <span className={cn(
                  "opacity-60 font-medium tabular-nums",
                  isLowCredits && "text-amber-600 dark:text-amber-400 opacity-100"
                )}>
                  {limit - usage}/{limit}
                </span>
              </div>

              {/* Ultra-thin progress line at the very bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/[0.03] dark:bg-white/[0.03]">
                <div
                  className={cn(
                    "h-full transition-all duration-1000 ease-out",
                    isLowCredits ? "bg-amber-500" : "bg-neutral-400 dark:bg-neutral-500"
                  )}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-black/10 dark:border-white/10 text-neutral-800 dark:text-neutral-900 dark:text-neutral-200 shadow-2xl px-3 py-2 rounded-xl text-xs font-medium">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

UsageBadge.displayName = "UsageBadge";

export { UsageBadge };
