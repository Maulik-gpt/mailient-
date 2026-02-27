"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

const ADMIN_EMAIL_TEMPLATE = `Hi,

I'd like to use Mailient (mailient.xyz) for AI-powered email management with our team.

Could you please approve it in our Google Workspace Admin Console? Here's how:

1. Go to admin.google.com → Security → API Controls → App Access Control
2. Click "Add app" → "OAuth App Name or Client ID"
3. Search for Client ID: ${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '[See mailient.xyz/workspace-setup]'}
4. Set access to "Trusted"

This takes about 60 seconds. Once done, our team can sign in immediately.

Setup guide: https://mailient.xyz/workspace-setup

Thanks!`;

export default function WorkspaceSetupPage() {
    const router = useRouter();
    const [copiedField, setCopiedField] = useState(null);

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2500);
    };

    const steps = [
        {
            num: 1,
            title: "Open the Admin Console",
            description: "Your Google Workspace administrator navigates to the API Controls page.",
            action: {
                label: "Open API Controls",
                url: "https://admin.google.com/ac/owl/list?tab=apps",
            },
            detail: "Go to admin.google.com → Security → Access and data control → API Controls → App Access Control",
        },
        {
            num: 2,
            title: "Add Mailient by Client ID",
            description: 'Click "Add app", then select "OAuth App Name or Client ID" and paste the ID below.',
            copyable: CLIENT_ID,
            copyLabel: "Client ID",
        },
        {
            num: 3,
            title: 'Set Access to "Trusted"',
            description: "Select Mailient from the search results, then set the access level to Trusted for your organization.",
            detail: 'This grants Mailient permission to read and send emails on behalf of users in your domain. You can revoke access at any time.',
        },
        {
            num: 4,
            title: "Done — Your team can sign in",
            description: 'Everyone in your organization can now visit mailient.xyz and click "Continue with Google" with zero warnings.',
            isDone: true,
        },
    ];

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-950/20 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-950/15 rounded-full blur-[150px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/5 bg-black/50 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
                    <button onClick={() => router.push('/')} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-xl border border-white/10 overflow-hidden group-hover:scale-105 transition-transform">
                            <img src="/logo-new.png" alt="Mailient" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-sm tracking-tight">Mailient</span>
                    </button>
                    <Button
                        onClick={() => router.push('/auth/signin')}
                        className="bg-white text-black hover:bg-gray-200 rounded-xl px-5 h-9 text-sm font-semibold"
                    >
                        Sign in
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-3xl mx-auto px-6 py-16 md:py-24">

                {/* Hero */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/15 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        Admin Setup Guide
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Set up Mailient for your
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                            Workspace team
                        </span>
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
                        Your Google Workspace admin needs to approve Mailient once.
                        After that, every team member can sign in instantly — no extra steps.
                    </p>
                    <p className="text-sm text-zinc-600 mt-3">
                        Takes about 60 seconds.
                    </p>
                </div>

                {/* Steps */}
                <div className="space-y-1">
                    {steps.map((step, i) => (
                        <div key={step.num} className="flex gap-5">
                            {/* Timeline */}
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border transition-colors ${step.isDone
                                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                                            : "bg-white/5 text-white border-white/10"
                                        }`}
                                >
                                    {step.isDone ? (
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    ) : (
                                        step.num
                                    )}
                                </div>
                                {i < steps.length - 1 && (
                                    <div className="w-px flex-1 bg-white/5 my-1" />
                                )}
                            </div>

                            {/* Content */}
                            <div className={`pb-10 flex-1 ${i === steps.length - 1 ? "pb-0" : ""}`}>
                                <h3 className="text-lg font-bold text-white mb-1">{step.title}</h3>
                                <p className="text-sm text-zinc-400 leading-relaxed">{step.description}</p>

                                {/* Detail text */}
                                {step.detail && (
                                    <p className="mt-2 text-xs text-zinc-600 leading-relaxed">{step.detail}</p>
                                )}

                                {/* Action button */}
                                {step.action && (
                                    <Button
                                        size="sm"
                                        onClick={() => window.open(step.action.url, "_blank")}
                                        className="mt-4 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl px-5 h-9 text-sm font-semibold transition-all"
                                    >
                                        {step.action.label}
                                        <svg className="w-3.5 h-3.5 ml-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                            <polyline points="15 3 21 3 21 9" />
                                            <line x1="10" y1="14" x2="21" y2="3" />
                                        </svg>
                                    </Button>
                                )}

                                {/* Copyable Client ID */}
                                {step.copyable !== undefined && (
                                    <div className="mt-4">
                                        {step.copyable ? (
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-black/60 border border-white/10">
                                                    <svg className="w-4 h-4 text-zinc-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                                    </svg>
                                                    <code className="text-sm text-white font-mono truncate">{step.copyable}</code>
                                                </div>
                                                <button
                                                    onClick={() => copyToClipboard(step.copyable, "clientId")}
                                                    className="p-3 rounded-xl hover:bg-white/5 border border-white/5 transition-colors shrink-0"
                                                    title="Copy Client ID"
                                                >
                                                    {copiedField === "clientId" ? (
                                                        <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                                                    ) : (
                                                        <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-zinc-600 italic">Client ID will appear here once configured. Contact the developer for the ID.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-12" />

                {/* Email Template Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-white">Email template</h3>
                            <p className="text-sm text-zinc-500 mt-0.5">Not an admin? Send this to whoever manages your Google Workspace.</p>
                        </div>
                        <button
                            onClick={() => copyToClipboard(ADMIN_EMAIL_TEMPLATE, "email")}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium text-zinc-300 hover:text-white transition-all"
                        >
                            {copiedField === "email" ? (
                                <><svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> Copied!</>
                            ) : (
                                <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg> Copy email</>
                            )}
                        </button>
                    </div>
                    <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-6 text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap font-mono max-h-56 overflow-y-auto">
                        {ADMIN_EMAIL_TEMPLATE}
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-12" />

                {/* Security Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        {
                            icon: (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            ),
                            title: "Enterprise Security",
                            desc: "OAuth 2.0 with zero password access. Your admin retains full control.",
                        },
                        {
                            icon: (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            ),
                            title: "AES-256 Encryption",
                            desc: "All email data is encrypted end-to-end during processing.",
                        },
                        {
                            icon: (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="2" y1="12" x2="22" y2="12" />
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                </svg>
                            ),
                            title: "Revocable Access",
                            desc: "Your admin can remove Mailient from the domain at any time.",
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            className="p-5 rounded-2xl bg-zinc-950/50 border border-white/5 space-y-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400">
                                {card.icon}
                            </div>
                            <h4 className="text-sm font-bold text-white">{card.title}</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed">{card.desc}</p>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="text-center mt-16">
                    <Button
                        onClick={() => router.push('/auth/signin')}
                        className="bg-white text-black hover:bg-gray-200 rounded-2xl px-10 h-14 text-lg font-bold shadow-xl shadow-white/5 transition-all hover:scale-[1.02]"
                    >
                        Sign in to Mailient
                        <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    </Button>
                    <p className="text-xs text-zinc-600 mt-4">
                        Your admin should complete the steps above first.
                    </p>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 py-8 px-6">
                <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-zinc-700">© 2026 Mailient Intelligence</p>
                    <div className="flex gap-6 text-xs text-zinc-600">
                        <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
