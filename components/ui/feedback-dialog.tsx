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
          "max-w-md w-full p-6 gap-6 overflow-hidden border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0c0c0c] text-neutral-900 dark:text-neutral-200",
          "shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl",
          "!animate-none !duration-0 transition-none"
        )}
      >
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black tracking-[0.2em] text-neutral-400 dark:text-neutral-500 uppercase">
              Feedback
            </h3>
          </div>
          
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share your thoughts..."
            className="w-full min-h-[160px] rounded-xl bg-neutral-50 dark:bg-[#151515] border border-neutral-200 dark:border-white/5 p-5 text-sm md:text-[15px] resize-none outline-none focus:border-black/20 dark:focus:border-white/10 focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 text-neutral-900 dark:text-neutral-200 placeholder:text-neutral-500 transition-all font-sans leading-relaxed"
            autoFocus
          />
          
          <div className="flex items-center justify-end pt-2">
            <Button
              onClick={handleSend}
              disabled={isSending || !feedback.trim()}
              className={cn(
                "rounded-xl px-6 py-2.5 transition-all font-bold flex items-center gap-2 group border-none shadow-lg active:scale-95",
                "bg-black dark:bg-[#fafafa] text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90"
              )}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span className="text-[13px] font-bold">Send Feedback</span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/10 dark:bg-black/10 ml-1 opacity-60">
                    <span className="text-[9px] font-bold">⌘</span>
                    <CornerDownLeft className="w-2 h-2" />
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
