"use client";

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Check, 
  ArrowRight, 
  Copy, 
  ExternalLink, 
  Building2, 
  Mail, 
  Lock, 
  Settings,
  ChevronRight,
  Info,
  CheckCircle2,
  Undo2
} from 'lucide-react';
import { SignInLayout } from '@/components/ui/sign-in';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "unconfigured_client_id";

function WorkspaceSetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams?.get('email') || '';
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const setupSteps = [
    {
      title: "Google Admin Console",
      description: "Access your organization's API controls to authorize Mailient.",
      icon: <Building2 className="w-5 h-5" />,
      link: "https://admin.google.com/ac/owl/list?tab=configuredApps",
      linkText: "Open Admin Console"
    },
    {
      title: "Whitelisting App",
      description: "Configure new app via 'Manage Third-Party App Access'. Use Client ID:",
      copyable: CLIENT_ID,
      icon: <Shield className="w-5 h-5" />
    },
    {
      title: "Set Access Level",
      description: "Select Mailient and set access to 'Trusted'. This allows secure email handling.",
      icon: <Settings className="w-5 h-5" />
    },
    {
      title: "Email Delegation",
      description: "Ensure mailient.xyz is permitted to receive and draft responses for your domain.",
      icon: <Mail className="w-5 h-5" />
    }
  ];

  return (
    <SignInLayout
      title={<>Workspace <br/> Setup</>}
      description="Follow these critical steps to authorize Mailient for your Google Workspace organization."
      heroImageSrc="https://images.unsplash.com/photo-1497366216548-37526070297c?w=2160&q=80"
      testimonials={[
        {
          avatarSrc: "/testimonials/john-oliver.png",
          name: "John Oliver",
          handle: "@joms0993",
          text: "The setup was straightforward once I had the admin guidelines. It's a game-changer for our team's productivity."
        }
      ]}
    >
      <div className="space-y-8 max-w-md">
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
            <Lock className="w-3 h-3" />
            <span>Admin Guidelines</span>
          </div>
          <h2 className="text-white text-xl font-semibold tracking-tight">Enterprise Authorization</h2>
          <p className="text-white/30 text-sm font-light leading-relaxed">
            Mailient requires organization-level trust to operate within Google Workspace. 
            {email && <span> Configuring for: <span className="text-white/60 font-medium">{email}</span></span>}
          </p>
        </div>

        {/* Setup Steps List */}
        <div className="space-y-4">
          {setupSteps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl group hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 group-hover:bg-white/[0.08] transition-all">
                  <div className="text-white/40 group-hover:text-white transition-colors">
                    {step.icon}
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white text-sm font-semibold tracking-tight italic">{step.title}</h3>
                    <div className="text-[10px] font-bold text-white/10 group-hover:text-white/20 transition-colors uppercase tracking-widest">Step 0{index + 1}</div>
                  </div>
                  <p className="text-white/35 text-[11px] leading-relaxed font-light tracking-tight">{step.description}</p>
                  
                  {step.copyable && (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[10px] font-mono text-white/60 bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 truncate">
                        {step.copyable}
                      </code>
                      <button 
                        onClick={() => copyToClipboard(step.copyable, 'clientid')}
                        className="shrink-0 p-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-all"
                      >
                        {copiedField === 'clientid' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white/60" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-white/30" />
                        )}
                      </button>
                    </div>
                  )}

                  {step.link && (
                    <a 
                      href={step.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-2 text-[11px] text-white/40 hover:text-white transition-colors font-medium tracking-tight group/link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {step.linkText}
                      <ChevronRight className="w-3 h-3 translate-x-0 group-hover/link:translate-x-0.5 transition-transform" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Exit/De-authorize Information */}
        <div className="p-6 bg-red-500/[0.03] border border-red-500/10 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-[0.2em]">
            <Undo2 className="w-3 h-3" />
            <span>Offboarding & Access</span>
          </div>
          <div className="space-y-2">
            <h4 className="text-white text-xs font-semibold tracking-tight italic">How to exit Mailient services</h4>
            <p className="text-white/30 text-[11px] leading-relaxed font-light tracking-tight">
              To revoke access, simply return to the Google Admin Console and remove Mailient from the "Trusted" apps list. This will immediately terminate all service connections and background processing for your organization.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4 pt-4">
          <button 
            onClick={() => router.push('/auth/signin')}
            className="w-full h-14 bg-white text-black rounded-2xl font-bold text-sm hover:bg-[#F5F5F5] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-[0.98]"
          >
            I've Completed Setup
            <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            onClick={() => window.open('mailto:support@mailient.xyz')}
            className="w-full h-14 bg-white/[0.04] text-white/60 rounded-2xl font-semibold text-sm hover:bg-white/[0.08] transition-all border border-white/[0.08]"
          >
            Need Help? Contact Support
          </button>
        </div>
      </div>
    </SignInLayout>
  );
}

export default function WorkspaceSetupPage() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <Suspense fallback={
        <div className="h-screen flex items-center justify-center bg-[#050505]">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white animate-spin rounded-full" />
        </div>
      }>
        <WorkspaceSetupContent />
      </Suspense>
    </div>
  );
}
