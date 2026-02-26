"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Copy, Check, ExternalLink, Mail, ArrowRight,
    ShieldCheck, Zap, Loader2, AlertCircle, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ForwardingSettingsCardProps {
    className?: string;
}

export default function ForwardingSettingsCard({ className }: ForwardingSettingsCardProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [handle, setHandle] = useState("");
    const [editHandle, setEditHandle] = useState("");
    const [forwardingEmail, setForwardingEmail] = useState("");
    const [isConfigured, setIsConfigured] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSetup();
    }, []);

    const fetchSetup = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/forwarding/setup");
            if (res.ok) {
                const data = await res.json();
                setHandle(data.handle);
                setEditHandle(data.handle);
                setForwardingEmail(data.forwardingEmail);
                setIsConfigured(data.isConfigured);
            }
        } catch (err) {
            console.error("Failed to fetch forwarding setup:", err);
        } finally {
            setLoading(false);
        }
    };

    const saveHandle = async () => {
        if (!editHandle.trim() || editHandle.length < 3) {
            setError("Handle must be at least 3 characters");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/forwarding/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ handle: editHandle }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to save");
                return;
            }

            setHandle(data.handle);
            setForwardingEmail(data.forwardingEmail);
            setIsConfigured(true);
            setIsEditing(false);
            toast.success("Forwarding address saved!");
        } catch (err) {
            setError("Failed to save handle");
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(forwardingEmail);
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className={cn("glass-panel p-6", className)}>
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                    <span className="text-zinc-500">Loading forwarding setup...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("glass-panel p-6", className)}>
            <h3 className="text-base font-semibold text-[var(--settings-text)] mb-1 flex items-center gap-2">
                <Mail className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
                Email Forwarding (Bridge)
            </h3>
            <p className="text-sm text-[var(--settings-text-secondary)] mb-5">
                Forward emails to Mailient so Arcus AI can read and analyze them — no extra Google permissions needed.
            </p>

            {/* Forwarding Address */}
            <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-[var(--settings-text-tertiary)] uppercase tracking-wider">
                            Your Bridge Address
                        </span>
                        {isConfigured && (
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                                Active
                            </span>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={editHandle}
                                    onChange={(e) => setEditHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                                    placeholder="yourhandle"
                                    className="flex-1 h-10 px-3 rounded-lg bg-black/50 border border-[var(--glass-border)] text-[var(--settings-text)] placeholder:text-[var(--settings-text-tertiary)] focus:outline-none focus:border-white/30"
                                    maxLength={30}
                                />
                                <span className="text-zinc-500 text-sm whitespace-nowrap">
                                    @inbox.mailient.xyz
                                </span>
                            </div>
                            {error && (
                                <p className="text-sm text-red-400 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> {error}
                                </p>
                            )}
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={saveHandle}
                                    disabled={saving}
                                    className="bg-white text-black hover:bg-zinc-200 rounded-lg font-medium"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => { setIsEditing(false); setEditHandle(handle); setError(null); }}
                                    className="text-zinc-400"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <code className="text-lg font-mono text-white flex-1 truncate">
                                {forwardingEmail}
                            </code>
                            <button
                                onClick={copyToClipboard}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                                title="Copy address"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                    <Copy className="w-4 h-4 text-zinc-400" />
                                )}
                            </button>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-xs text-[var(--settings-accent)] hover:underline shrink-0"
                            >
                                Change
                            </button>
                        </div>
                    )}
                </div>

                {/* Quick Setup Guide */}
                <div className="p-4 rounded-xl bg-white/5 border border-[var(--glass-border)] space-y-3">
                    <h4 className="text-sm font-semibold text-[var(--settings-text)] flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        Quick Setup (30 seconds)
                    </h4>
                    <ol className="space-y-2 text-sm text-[var(--settings-text-secondary)]">
                        <li className="flex gap-3">
                            <span className="text-white font-bold shrink-0">1.</span>
                            Open Gmail Settings → Forwarding and POP/IMAP
                        </li>
                        <li className="flex gap-3">
                            <span className="text-white font-bold shrink-0">2.</span>
                            Click "Add a forwarding address" and paste your Bridge address
                        </li>
                        <li className="flex gap-3">
                            <span className="text-white font-bold shrink-0">3.</span>
                            Confirm via the verification email — done!
                        </li>
                    </ol>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open("https://mail.google.com/mail/u/0/#settings/fwdandpop", "_blank")}
                        className="mt-2 border-[var(--settings-accent)] text-[var(--settings-accent)] hover:bg-[var(--settings-accent)]/10"
                    >
                        Open Gmail Settings
                        <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                </div>

                {/* Privacy Note */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-emerald-400">Privacy-First Design</p>
                        <p className="text-xs text-zinc-500 mt-1">
                            You control exactly what Arcus AI sees. Only forwarded emails are processed.
                            We never access your Gmail inbox directly.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
