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
    if (!feedback.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedback }),
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
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(
          "max-w-md w-full p-6 gap-6 overflow-hidden border border-white/10 bg-[#0c0c0c] text-neutral-200",
          "shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] rounded-[24px]"
        )}
      >
        <div className="space-y-4">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share your feedback..."
            className="w-full min-h-[160px] rounded-2xl bg-neutral-900/50 border border-white/5 p-4 text-sm resize-none focus:outline-none focus:border-white/10 text-neutral-200 placeholder:text-neutral-500 transition-all"
            autoFocus
          />
          
          <div className="flex items-center justify-end">
            <Button
              onClick={handleSend}
              disabled={isSending || !feedback.trim()}
              className="rounded-xl px-4 py-2 bg-[#2a2a2a] hover:bg-[#333333] text-white transition-all font-medium flex items-center gap-2 border border-white/5 group"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span className="text-sm">Send</span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 ml-1">
                    <span className="text-[10px] text-neutral-400">⌘</span>
                    <CornerDownLeft className="w-2.5 h-2.5 text-neutral-400" />
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
