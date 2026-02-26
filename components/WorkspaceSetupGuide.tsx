"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Copy,
    Check,
    ExternalLink,
    ShieldCheck,
    ChevronDown,
    ChevronUp,
    Building2,
    Key,
    UserCheck,
    Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WorkspaceSetupGuideProps {
    className?: string;
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

const SETUP_STEPS = [
    {
        number: 1,
        title: "Open Admin Console",
        description:
            "Your Google Workspace admin opens the Admin Console and goes to API Controls.",
        action: {
            label: "Open API Controls",
            url: "https://admin.google.com/ac/owl/list?tab=apps",
        },
    },
    {
        number: 2,
        title: "Add Mailient as Trusted App",
        description:
            'Click "Add app" → "OAuth App Name or Client ID", then search for',
        copyField: "clientId",
    },
    {
        number: 3,
        title: "Set Access to Trusted",
        description:
            'Select Mailient from the results, then set access to "Trusted". This allows all users in your organization to sign in without any warnings.',
    },
    {
        number: 4,
        title: "Done — Users can sign in",
        description:
            'Your team can now click "Continue with Google" on Mailient with zero warnings and full email access.',
    },
];

export default function WorkspaceSetupGuide({
    className,
}: WorkspaceSetupGuideProps) {
    const [expanded, setExpanded] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <div
            className={cn(
                "glass-panel overflow-hidden transition-all duration-500",
                className
            )}
        >
            {/* Header — always visible */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-6 flex items-center justify-between text-left group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-[var(--settings-text)] flex items-center gap-2">
                            Google Workspace Setup
                            <span className="text-[10px] font-medium uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                Admin
                            </span>
                        </h3>
                        <p className="text-sm text-[var(--settings-text-secondary)] mt-0.5">
                            Ask your IT admin to trust Mailient — then your whole team can sign in instantly.
                        </p>
                    </div>
                </div>
                <div className="p-2 rounded-lg group-hover:bg-white/5 transition-colors">
                    {expanded ? (
                        <ChevronUp className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
                    )}
                </div>
            </button>

            {/* Expanded content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 space-y-5">
                            {/* Info box */}
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                <UserCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-blue-400">
                                        How it works
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Mailient uses the same "Continue with Google" button for everyone.
                                        When your Workspace admin marks Mailient as "Trusted", the unverified app warning disappears for your entire team.
                                        No extra software or browser extensions needed.
                                    </p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                            {/* Steps */}
                            <div className="space-y-4">
                                {SETUP_STEPS.map((step, i) => (
                                    <div key={step.number} className="flex gap-4">
                                        {/* Step indicator */}
                                        <div className="flex flex-col items-center">
                                            <div
                                                className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors",
                                                    i === SETUP_STEPS.length - 1
                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                                                        : "bg-white/10 text-white border border-white/10"
                                                )}
                                            >
                                                {i === SETUP_STEPS.length - 1 ? (
                                                    <Check className="w-4 h-4" />
                                                ) : (
                                                    step.number
                                                )}
                                            </div>
                                            {i < SETUP_STEPS.length - 1 && (
                                                <div className="w-px h-full bg-white/5 mt-1" />
                                            )}
                                        </div>

                                        {/* Step content */}
                                        <div className="pb-5 flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[var(--settings-text)]">
                                                {step.title}
                                            </p>
                                            <p className="text-sm text-[var(--settings-text-secondary)] mt-1">
                                                {step.description}
                                            </p>

                                            {/* Action button */}
                                            {step.action && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        window.open(step.action!.url, "_blank")
                                                    }
                                                    className="mt-3 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 rounded-lg"
                                                >
                                                    {step.action.label}
                                                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                                                </Button>
                                            )}

                                            {/* Copy field — Client ID */}
                                            {step.copyField === "clientId" && CLIENT_ID && (
                                                <div className="mt-3 flex items-center gap-2">
                                                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 border border-white/10 overflow-hidden">
                                                        <Key className="w-4 h-4 text-zinc-500 shrink-0" />
                                                        <code className="text-sm text-white font-mono truncate">
                                                            {CLIENT_ID}
                                                        </code>
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            copyToClipboard(CLIENT_ID, "clientId")
                                                        }
                                                        className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                                                    >
                                                        {copiedField === "clientId" ? (
                                                            <Check className="w-4 h-4 text-emerald-400" />
                                                        ) : (
                                                            <Copy className="w-4 h-4 text-zinc-400" />
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Privacy footer */}
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-emerald-400">
                                        Enterprise-Grade Privacy
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        All email data is encrypted end-to-end. Mailient processes
                                        emails only to power AI features — we never store raw email
                                        content beyond the current session. Your admin retains full
                                        control and can revoke access at any time.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
