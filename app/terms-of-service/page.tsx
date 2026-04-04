"use client";

import React from "react";
import Link from "next/link";
import { 
  Home, 
  HelpCircle, 
  Scale, 
  FileText, 
  LayoutList,
  ShieldAlert,
  Info
} from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { cn } from "@/lib/utils";

interface Section {
  id: number;
  title: string;
  content: string;
  extra?: React.ReactNode;
  highlight?: boolean;
  caps?: boolean;
}

export default function TermsOfService() {
  const currentDate = "April 4, 2026";

  const sections: Section[] = [
    {
      id: 1,
      title: "Binding Agreement",
      content: "These Terms of Conditions (\"Terms\") constitute a legally binding agreement between you (\"User,\" \"you\") and Mailient (\"Mailient,\" \"we,\" \"us,\" \"our\"). By accessing, registering for, or using our Services, you agree to be bound by these Terms. If you do not agree, you must immediately discontinue use. We reserve the right to refuse service to anyone at our sole discretion."
    },
    {
      id: 2,
      title: "Eligibility and Authority",
      content: "You must be at least 13 years old to use the Services. If you are under the legal age of majority, you confirm you have parental or guardian consent.",
      extra: (
        <div className="mt-8 space-y-6">
          <p className="font-bold uppercase text-[10px] tracking-widest text-neutral-400">You represent and warrant that:</p>
          <ul className="list-none space-y-3 pl-0">
            {["You have full legal capacity to enter this agreement;", "You are not barred from using the Services under applicable law;", "All information provided is accurate and current."].map((text, i) => (
              <li key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-neutral-100/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 transition-all hover:translate-x-1">
                <div className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-700 mt-2 shrink-0" />
                <span className="text-sm font-medium">{text}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs italic text-neutral-500">We may suspend accounts that violate eligibility requirements.</p>
        </div>
      )
    },
    {
      id: 3,
      title: "Account Responsibility",
      content: "You are solely responsible for maintaining account confidentiality, all activities under your account, and ensuring secure access to connected services (e.g., email providers).",
      extra: (
        <div className="mt-6 p-6 border-l-2 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/10 italic text-sm text-neutral-500">
          We are not liable for unauthorized access resulting from your failure to secure credentials.
        </div>
      )
    },
    {
      id: 4,
      title: "Nature of Services",
      content: "Mailient provides AI-assisted email productivity tools, including but not limited to:",
      extra: (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Email prioritization", "Draft generation", "Workflow automation", "Insights and analytics"].map(tag => (
              <div key={tag} className="px-4 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase text-center tracking-tighter">
                {tag}
              </div>
            ))}
          </div>
          <p className="text-sm leading-relaxed">The Services are provided as tools only. You retain full responsibility for reviewing and approving outputs. We may modify, suspend, or discontinue any feature at any time without liability.</p>
        </div>
      )
    },
    {
      id: 5,
      title: "Acceptable Use and Restrictions",
      content: "You agree NOT to:",
      extra: (
        <ul className="mt-6 grid grid-cols-1 gap-2 pl-0 list-none">
          {[
            "Use the Services for unlawful, fraudulent, or harmful activities",
            "Access or attempt to access unauthorized systems",
            "Reverse engineer, decompile, or extract source code",
            "Use bots, scrapers, or automated extraction tools",
            "Interfere with system integrity or performance",
            "Upload malicious code or harmful data",
            "Violate intellectual property rights",
            "Use the Services to generate spam or deceptive communications"
          ].map((text, i) => (
            <li key={i} className="flex items-center gap-4 p-3 rounded-xl border border-red-100 dark:border-red-900/20 bg-red-50/30 dark:bg-red-900/5 group transition-all hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-200">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 opacity-50 group-hover:opacity-100" />
              <span className="text-xs font-semibold text-red-900 dark:text-red-200/80">{text}</span>
            </li>
          ))}
          <p className="mt-4 text-[10px] font-black uppercase text-red-600 dark:text-red-400 tracking-[0.2em]">Violation may result in immediate suspension or permanent ban.</p>
        </ul>
      )
    },
    {
      id: 6,
      title: "Data Access and Permissions",
      content: "By connecting your email or third-party accounts, you grant Mailient limited permission to access and process data strictly for providing core functionality, improving Services, and security/abuse prevention.",
      extra: (
        <div className="mt-8 space-y-4 font-satoshi">
          <div className="p-6 rounded-3xl bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xl">
            <h4 className="text-lg font-black italic uppercase tracking-tighter mb-2">Notice: Ownership</h4>
            <p className="text-sm opacity-80 leading-relaxed font-medium">We do NOT claim ownership of your data.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              "Data processing is necessary for service functionality",
              "Revoking access may limit or disable features",
              "Third-party services operate under their own terms"
            ].map((txt, i) => (
              <div key={i} className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-[10px] uppercase font-black text-neutral-500 leading-normal flex flex-col justify-center text-center">
                {txt}
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 7,
      title: "User Content and License",
      content: "You retain ownership of all content you provide (\"User Content\"). You grant Mailient a worldwide, non-exclusive, royalty-free, perpetual, and sublicensable license to process, store, and display content, modify content for functionality, and create anonymized and aggregated insights. This license is strictly limited to operating and improving the Services."
    },
    {
      id: 8,
      title: "AI Disclaimer (Critical Clause)",
      content: "Mailient uses artificial intelligence systems which may produce inaccurate or incomplete outputs, or misleading or unintended suggestions.",
      highlight: true,
      extra: (
        <div className="mt-8 space-y-6">
          <p className="font-bold underline uppercase text-xs tracking-widest text-amber-600 dark:text-amber-400">Vital Acknowledgments:</p>
          <div className="space-y-3">
            {[
              "AI outputs are NOT guaranteed to be correct",
              "Outputs are NOT professional, legal, financial, or medical advice",
              "You MUST independently verify all outputs before relying on them"
            ].map((t, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 group transition-all hover:translate-x-2">
                <div className="w-6 h-6 rounded-full bg-amber-400 dark:bg-amber-600 flex items-center justify-center shrink-0">
                  <Info className="w-3 h-3 text-white" />
                </div>
                <span className={`text-sm font-bold ${i === 2 ? 'uppercase' : ''}`}>{t}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-500 italic">Mailient bears NO responsibility for decisions made using AI outputs.</p>
        </div>
      )
    },
    {
      id: 9,
      title: "Privacy and Data Handling",
      content: "Use of the Services is also governed by our Privacy Policy. We implement reasonable safeguards but do NOT guarantee absolute security. You acknowledge: Internet transmissions are inherently insecure; You use the Services at your own risk; We are not liable for unauthorized access beyond our control."
    },
    {
      id: 10,
      title: "Payments and Billing",
      content: "If applicable, you agree to: Pay all fees in full and on time; Provide accurate billing details; Accept recurring billing where applicable. All payments are: Non-refundable (unless required by law); Subject to pricing changes with notice. We may suspend Services for non-payment."
    },
    {
      id: 11,
      title: "Intellectual Property",
      content: "All platform components (excluding User Content) are owned by Mailient, including: Software and algorithms; Design and branding; Infrastructure and systems. Unauthorized use is strictly prohibited."
    },
    {
      id: 12,
      title: "Third-Party Integrations",
      content: "Mailient integrates with third-party providers. We are NOT responsible for: Their availability; Their data handling; Their failures or breaches. Use of such services is at your own risk."
    },
    {
      id: 13,
      title: "Termination Rights",
      content: "We may suspend or terminate access at any time, with or without cause, including for: Violations of Terms; Security concerns; Legal compliance requirements. Upon termination: Access is revoked immediately; Data may be deleted without recovery; No liability is incurred by Mailient."
    },
    {
      id: 14,
      title: "Disclaimer of Warranties",
      content: "THE SERVICES ARE PROVIDED \"AS IS\" AND \"AS AVAILABLE.\" WE DISCLAIM ALL WARRANTIES, INCLUDING: MERCHANTABILITY; FITNESS FOR A PARTICULAR PURPOSE; NON-INFRINGEMENT; ERROR-FREE OPERATION.",
      caps: true,
      extra: (
        <p className="mt-4 text-xs italic opacity-60">We do NOT guarantee: Continuous uptime; Accuracy of outputs; Data preservation.</p>
      )
    },
    {
      id: 15,
      title: "Limitation of Liability (Strict)",
      content: "TO THE MAXIMUM EXTENT PERMITTED BY LAW: Mailient shall NOT be liable for: Indirect, incidental, or consequential damages; Loss of profits, data, or business opportunities; Decisions made using AI outputs; Unauthorized access beyond reasonable control.",
      caps: true,
      extra: (
        <div className="mt-6 p-6 rounded-3xl bg-neutral-900 dark:bg-white text-white dark:text-black">
           <p className="text-xl font-black italic uppercase tracking-tighter">TOTAL LIABILITY is strictly limited to the amount paid (if any) in the last 12 months.</p>
        </div>
      )
    },
    {
      id: 16,
      title: "Indemnification",
      content: "You agree to indemnify and hold harmless Mailient from any claims arising from: Your use of the Services; Violation of these Terms; Breach of third-party rights. This includes legal fees and damages."
    },
    {
      id: 17,
      title: "Security Disclaimer",
      content: "While we follow industry practices, no system is fully secure. You accept: Risk of cyber attacks; Risk of data exposure; Responsibility for your own security practices."
    },
    {
      id: 18,
      title: "Service Availability",
      content: "We may: Interrupt Services for maintenance; Experience downtime; Change infrastructure without notice. No uptime guarantees are provided unless explicitly stated."
    },
    {
      id: 19,
      title: "Modifications to Terms",
      content: "We may update these Terms at any time. Continued use after updates = acceptance of revised Terms."
    },
    {
      id: 20,
      title: "Governing Law and Jurisdiction",
      content: "These Terms shall be governed by applicable laws. All disputes shall be subject to the exclusive jurisdiction of courts determined by Mailient."
    },
    {
      id: 21,
      title: "Dispute Resolution",
      content: "Before legal action, parties agree to attempt resolution via: Good-faith negotiation. We may require arbitration where legally enforceable."
    },
    {
      id: 22,
      title: "Force Majeure",
      content: "We are not liable for delays or failures caused by events beyond control, including: Natural disasters; Internet outages; Government actions; Cyber incidents."
    },
    {
      id: 23,
      title: "Assignment",
      content: "You may not transfer your rights. We may freely assign or transfer rights without restriction."
    },
    {
      id: 24,
      title: "Feedback Usage",
      content: "Any feedback provided becomes our property and may be used without compensation."
    },
    {
      id: 25,
      title: "Entire Agreement",
      content: "These Terms represent the entire agreement and override prior agreements."
    }
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#fafafa] font-satoshi selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-all duration-500 ease-in-out">
      
      {/* Top Header with Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <div className="flex items-center gap-3 p-1 bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full shadow-sm">
          <AnimatedThemeToggler className="bg-white dark:bg-black shadow-sm" />
        </div>
      </div>

      <main className="max-w-3xl mx-auto pt-32 pb-48 px-8">
        
        <header className="mb-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-8 leading-none">
              Terms of <br/>Service
            </h1>
            <div className="flex flex-col items-center gap-4 text-neutral-500 text-sm font-medium">
              <div className="px-4 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 select-none">
                Mailient Legal Department
              </div>
              <p className="opacity-60">Last Updated: {currentDate}</p>
            </div>
          </motion.div>
        </header>

        <section className="space-y-0 pb-12">
          
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-24 relative p-8 md:p-12 rounded-[3rem] bg-white dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden group border-b-4 border-b-black dark:border-b-white"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Scale className="w-32 h-32 rotate-[-12deg]" />
            </div>
            <h2 className="text-4xl font-black tracking-tight mb-8 leading-tight">Terms of Conditions for Mailient (mailient.xyz)</h2>
            <div className="space-y-6 text-lg md:text-xl leading-relaxed text-neutral-700 dark:text-neutral-300 relative z-10 font-medium">
              <p>
                These Terms of Conditions ("Terms") constitute a legally binding agreement between you ("User," "you") and Mailient ("Mailient," "we," "us," "our"). By accessing, registering for, or using our Services, you agree to be bound by these Terms.
              </p>
              <div className="h-px w-24 bg-neutral-200 dark:bg-neutral-800 my-8" />
              <p className="font-bold underline decoration-neutral-300 dark:decoration-neutral-700 underline-offset-8">If you do not agree, you must immediately discontinue use.</p>
              <p className="text-sm italic opacity-40">We reserve the right to refuse service to anyone at our sole discretion.</p>
            </div>
          </motion.div>

          {sections.map((section) => (
            <motion.section 
              key={section.id} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className={cn(
                "group py-16 border-t border-neutral-100 dark:border-neutral-900 transition-all",
                section.highlight && "bg-amber-50/20 dark:bg-amber-950/5 -mx-8 px-8 rounded-3xl border-none my-12 shadow-2xl shadow-amber-500/5"
              )}
            >
              <div className="flex flex-col md:flex-row gap-8 md:gap-16">
                <div className="md:w-1/3">
                  <div className="md:sticky md:top-32 space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-300 dark:text-neutral-700 select-none">Section {section.id.toString().padStart(2, '0')}</div>
                    <h3 className={cn(
                      "text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-[0.9] group-hover:translate-x-2 transition-transform duration-700 disabled-selection",
                      section.highlight && "text-amber-600 dark:text-amber-400"
                    )}>
                      {section.title}
                    </h3>
                  </div>
                </div>
                <div className="md:w-2/3">
                  <p className={cn(
                    "text-lg leading-relaxed text-neutral-600 dark:text-neutral-400 font-medium",
                    section.caps && "uppercase font-black text-sm tracking-tight leading-loose"
                  )}>
                    {section.content}
                  </p>
                  {section.extra}
                </div>
              </div>
            </motion.section>
          ))}

          <motion.section 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="py-32 border-t border-neutral-100 dark:border-neutral-900"
          >
             <div className="flex flex-col md:flex-row gap-12">
                <div className="md:w-1/3">
                   <div className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-300 dark:text-neutral-700 select-none mb-4">Direct Channel</div>
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none">26. Contact</h3>
                </div>
                <div className="md:w-2/3 flex items-center">
                  <a href="mailto:mailient.xyz@gmail.com" className="text-2xl md:text-4xl font-black tracking-tight underline underline-offset-[12px] decoration-neutral-200 dark:decoration-neutral-800 hover:decoration-black dark:hover:decoration-white transition-all hover:scale-[1.02] transform origin-left">
                    mailient.xyz@gmail.com
                  </a>
                </div>
             </div>
          </motion.section>

          <footer className="pt-48 text-center pb-32">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block relative"
            >
              <div className="absolute -inset-12 bg-black/5 dark:bg-white/5 blur-[80px] rounded-full pointer-events-none" />
              <h2 className="relative text-6xl md:text-9xl font-black italic uppercase tracking-tighter mb-12 select-none">FINAL ACKNOWLEDGMENT</h2>
            </motion.div>
            
            <div className="max-w-xl mx-auto space-y-12 mt-12">
               <p className="text-xl md:text-2xl font-bold leading-relaxed italic text-neutral-400 dark:text-neutral-500">By using Mailient, you confirm that you understand these Terms, you accept all risks associated with AI systems, and you agree to be legally bound.</p>
               <div className="px-8 py-4 rounded-full bg-black dark:bg-white text-white dark:text-black inline-block text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl">
                 Comprehensive Protection Protocol Active
               </div>
            </div>
          </footer>

        </section>
      </main>

      {/* Floating Navigation Bar - Premium Glassmorphism */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 w-full max-w-fit px-4 pointer-events-none">
        <nav className="flex items-center gap-1.5 p-2 bg-white/70 dark:bg-black/70 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-full shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] ring-1 ring-black/5 dark:ring-white/5 pointer-events-auto transition-transform hover:scale-[1.02]">
          
          <Link href="/" className="p-4 rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all active:scale-90 group relative">
            <Home className="w-5 h-5 relative z-10" />
            <span className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none uppercase tracking-widest shadow-xl">Home</span>
          </Link>
          
          <Link href="/changelog" className="p-4 rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all active:scale-90 group relative">
            <LayoutList className="w-5 h-5 relative z-10" />
            <span className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none uppercase tracking-widest shadow-xl">What&apos;s New</span>
          </Link>

          <Link href="/contact" className="p-4 rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all active:scale-90 group relative">
            <HelpCircle className="w-5 h-5 relative z-10" />
            <span className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none uppercase tracking-widest shadow-xl">Support</span>
          </Link>

          {/* Active Label Pill */}
          <div className="flex items-center gap-3 px-10 py-4 bg-neutral-950 dark:bg-white text-white dark:text-black rounded-full shadow-2xl group relative overflow-hidden active:scale-95 transition-transform cursor-default">
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-800 via-transparent to-neutral-800 dark:from-neutral-200 dark:to-neutral-200 opacity-0 group-hover:opacity-20 transition-opacity" />
            <Scale className="w-5 h-5 relative z-10 animate-pulse" />
            <span className="text-sm font-black tracking-tight relative z-10 uppercase">Terms</span>
          </div>

          <Link href="/privacy-policy" className="p-4 rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all active:scale-90 group relative">
            <FileText className="w-5 h-5 relative z-10" />
            <span className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none uppercase tracking-widest shadow-xl">Privacy</span>
          </Link>

        </nav>
      </div>

      <style jsx global>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@900,800,700,600,500,400,300,200,100&display=swap');
        
        .font-satoshi {
          font-family: 'Satoshi', sans-serif;
        }

        .disabled-selection {
          user-select: none;
        }

        ::view-transition-old(root),
        ::view-transition-new(root) {
          animation: none;
          mix-blend-mode: normal;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}