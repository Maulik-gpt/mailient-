"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Copy,
    Check,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    Building2,
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
        number: "01",
        title: "API Controls",
        description:
            "IT Administration opens the Google Admin Console and navigates to Security > API Controls.",
        action: {
            label: "Open Console",
            url: "https://admin.google.com/ac/owl/list?tab=apps",
        },
    },
    {
        number: "02",
        title: "Identify Mailient",
        description:
            'Use "Add app" → "OAuth App Name or Client ID" and authenticate using the unique ID below.',
        copyField: "clientId",
    },
    {
        number: "03",
        title: "Authorization",
        description:
            'Set the Mailient application access to "Trusted" for your entire domain.',
    },
    {
        number: "04",
        title: "Propagate",
        description:
            "Authentication warnings are removed immediately for all domain members.",
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
        toast.success("ID Copied");
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <div
            className={cn(
                "border border-white/10 bg-black overflow-hidden",
                className
            )}
        >
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-8 flex items-center justify-between text-left group hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-6">
                    <div className="w-6 h-6 border border-white/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-3 h-3 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-sm font-medium text-white uppercase tracking-widest">
                                Google Workspace Authorization
                            </h3>
                            {expanded && (
                                <span className="text-[10px] font-mono uppercase tracking-tighter text-zinc-500">
                                    Admin Action Required
                                </span>
                            )}
                        </div>
                        {!expanded && (
                            <p className="text-xs text-zinc-500 mt-1 font-light">
                                Authorize Mailient for your entire domain to enable seamless authentication.
                            </p>
                        )}
                    </div>
                </div>
                <div className="transition-transform duration-300">
                    {expanded ? (
                        <ChevronUp className="w-4 h-4 text-zinc-500" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                    )}
                </div>
            </button>

            {/* Content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="px-8 pb-8 space-y-12">
                            {/* Summary Context */}
                            <div className="p-6 border border-white/5 bg-white/[0.01]">
                                <h4 className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 mb-2">Protocol</h4>
                                <p className="text-xs text-zinc-500 leading-relaxed font-light">
                                    When an administrator designates Mailient as a Trusted application, Google bypasses individual unverified app warnings for all domain members. This ensures a friction-less enterprise experience.
                                </p>
                            </div>

                            {/* Sequential Steps */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
                                {SETUP_STEPS.map((step) => (
                                    <div key={step.number} className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="font-mono text-[10px] text-zinc-600 tracking-widest">{step.number}</div>
                                            {step.action && (
                                                <button
                                                    onClick={() => window.open(step.action!.url, "_blank")}
                                                    className="inline-flex items-center text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                                                >
                                                    Open Console <ExternalLink className="w-2.5 h-2.5 ml-1.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-medium text-white uppercase tracking-wider mb-2">{step.title}</h5>
                                            <p className="text-xs text-zinc-500 leading-relaxed font-light">
                                                {step.description}
                                            </p>
                                        </div>

                                        {step.copyField === "clientId" && CLIENT_ID && (
                                            <div className="flex items-center justify-between p-3 border border-white/10 bg-black group/copy">
                                                <code className="text-[11px] font-mono text-zinc-400 truncate pr-4">
                                                    {CLIENT_ID}
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(CLIENT_ID, "clientId")}
                                                    className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 hover:text-white transition-colors"
                                                >
                                                    {copiedField === "clientId" ? "Copied" : "Copy"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Security Reference */}
                            <div className="border-t border-white/10 pt-8 flex items-center justify-between">
                                <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                                    Security Status: Verified / Enterprise Ready
                                </p>
                                <a
                                    href="/workspace-setup"
                                    target="_blank"
                                    className="text-[10px] font-mono uppercase tracking-widest text-white hover:text-zinc-400 border-b border-white/20 pb-0.5 transition-colors"
                                >
                                    Full Documentation ↗
                                </a>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
