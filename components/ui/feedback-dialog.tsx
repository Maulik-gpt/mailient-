"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

type FeedbackDialogProps = {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function FeedbackDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: FeedbackDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setUncontrolledOpen;

  const handleSend = async () => {
    const trimmedFeedback = feedback.trim();
    if (!trimmedFeedback || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedback: trimmedFeedback }),
      });

      if (!response.ok) {
        throw new Error("Failed to send feedback");
      }

      toast.success("Feedback sent successfully! Thank you.");
      setFeedback("");
      setOpen?.(false);
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast.error("Failed to send feedback. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(
          "max-w-md w-full p-9 gap-6 overflow-hidden border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0c0c0c] text-neutral-900 dark:text-neutral-200",
          "shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] rounded-[50px]",
          "!animate-none !duration-0 transition-none"
        )}
      >
        <div className="space-y-6 pt-2">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share your feedback..."
            className="w-full min-h-[180px] rounded-[28px] bg-neutral-200/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-white/5 p-7 text-base resize-none outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 text-neutral-900 placeholder:text-neutral-600 dark:text-neutral-500 transition-all font-medium"
            autoFocus
          />
          
          <div className="flex items-center justify-end">
            <Button
              onClick={handleSend}
              disabled={isSending || !feedback.trim()}
              className={cn(
                "rounded-[20px] px-8 py-3 transition-all font-bold flex items-center gap-2 group border-none shadow-2xl",
                "bg-[#000] dark:bg-white text-white dark:text-[#000] hover:bg-[#000]/90 dark:hover:bg-neutral-200"
              )}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span className="text-sm">Send</span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white/10 dark:bg-black/10 ml-1">
                    <span className="text-[10px] text-white/40 dark:text-black/40">⌘</span>
                    <CornerDownLeft className="w-2.5 h-2.5 text-white/40 dark:text-black/40" />
                  </div>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const CornerDownLeft = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <polyline points="9 10 4 15 9 20" />
    <path d="M20 4v7a4 4 0 0 1-4 4H4" />
  </svg>
);
