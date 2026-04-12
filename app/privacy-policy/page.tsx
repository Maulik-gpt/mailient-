"use client";

import React from "react";
import { motion } from "framer-motion";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { FloatingNavbar } from "@/components/FloatingNavbar";

interface Section {
  id: number;
  title: string;
  content: string | React.ReactNode;
}

export default function PrivacyPolicy() {
  const currentDate = "April 12, 2026";

  const sections: Section[] = [
    {
      id: 1,
      title: "1. Who we are",
      content: (
        <div className="space-y-4">
          <p>Mailient is an AI-powered email intelligence platform founded and operated by Maulik. Our service connects to your Gmail or Google Workspace account (with your explicit permission) to help you triage, summarize, draft, and manage email communications more efficiently.</p>
          <p>Contact: For all privacy-related inquiries, please reach out to us at <a href="mailto:mailient.xyz@gmail.com" className="text-black dark:text-white font-medium underline underline-offset-4 decoration-neutral-300 dark:decoration-neutral-700 hover:decoration-black dark:hover:decoration-white transition-all">mailient.xyz@gmail.com</a>.</p>
        </div>
      )
    },
    {
      id: 2,
      title: "2. Scope of this policy",
      content: (
        <div className="space-y-4">
          <p>This policy applies to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>All users of the Mailient website and web application at mailient.xyz</li>
            <li>Users who connect their Google or Google Workspace accounts to Mailient</li>
            <li>Users on Free, Starter, and Pro subscription tiers</li>
            <li>Visitors who browse mailient.xyz without creating an account</li>
          </ul>
          <p>This policy does not apply to third-party websites, services, or applications that may be linked from our platform.</p>
        </div>
      )
    },
    {
      id: 3,
      title: "3. Information we collect",
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-black dark:text-white mb-2">3.1 Account and identity information</h4>
            <p>When you sign up or log in via Google OAuth 2.0, we receive from Google: your full name, email address, and profile picture. We never receive or store your Google account password. Authentication is handled entirely and securely by Google's identity infrastructure.</p>
          </div>
          <div>
            <h4 className="font-bold text-black dark:text-white mb-2">3.2 Email data</h4>
            <p>To provide AI-powered inbox analysis, Mailient accesses your Gmail data through the official Gmail API, using the scopes you explicitly grant during OAuth. This may include: email subject lines, sender and recipient addresses, timestamps, email body content (for analysis and drafting), and thread metadata. This data is processed in real time or near-real time to deliver features such as Mailient Sift analysis, Arcus AI queries, smart drafts, and email summaries.</p>
          </div>
          <div>
            <h4 className="font-bold text-black dark:text-white mb-2">3.3 Usage and analytics data</h4>
            <p>We collect anonymized usage data to improve our service. This includes: features used, frequency of use, session duration, error logs, and browser or device type. This data does not contain email content and cannot be linked back to specific emails.</p>
          </div>
          <div>
            <h4 className="font-bold text-black dark:text-white mb-2">3.4 Notes and user-generated content</h4>
            <p>If you use the Notes feature, the content of notes you create is stored to enable access across sessions. Notes may be shared in text or image format as you initiate.</p>
          </div>
          <div>
            <h4 className="font-bold text-black dark:text-white mb-2">3.5 Subscription and payment information</h4>
            <p>If you upgrade to a paid plan, payment is processed by a third-party payment processor. We do not store your full credit card number, CVV, or raw financial information. We may retain your subscription tier, billing status, and anonymized transaction records.</p>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "4. How we use your information",
      content: (
        <div className="space-y-4">
          <p>We use the information we collect for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-3">
            <li><strong>Service delivery:</strong> Powering AI inbox analysis, drafting, summaries, and smart triage via Sift and Arcus.</li>
            <li><strong>Personalization:</strong> Calibrating your neural voice style and relationship tracking to match your unique communication style.</li>
            <li><strong>Product improvement:</strong> Analyzing anonymized usage patterns to improve AI accuracy, feature quality, and reliability.</li>
            <li><strong>Security & compliance:</strong> Detecting and preventing abuse, fraud, unauthorized access, and policy violations.</li>
            <li><strong>Support & communication:</strong> Responding to support requests and providing essential updates.</li>
            <li><strong>Billing & subscriptions:</strong> Managing your plan tier, usage limits, and subscription lifecycle.</li>
          </ul>
        </div>
      )
    },
    {
      id: 5,
      title: "5. What we do not do with your data",
      content: (
        <div className="space-y-6">
          <div className="flex gap-4 items-start border-l-2 border-red-500/20 pl-6">
            <div className="text-red-500 font-bold">✕</div>
            <p><strong>We do not sell your personal data — ever.</strong> Your email content and identity information are not sold to advertisers, data brokers, or any third party.</p>
          </div>
          <div className="flex gap-4 items-start border-l-2 border-red-500/20 pl-6">
            <div className="text-red-500 font-bold">✕</div>
            <p><strong>We do not use your data to train public AI models.</strong> Your email content is never used to improve foundational or publicly shared machine learning models.</p>
          </div>
          <div className="flex gap-4 items-start border-l-2 border-red-500/20 pl-6">
            <div className="text-red-500 font-bold">✕</div>
            <p><strong>We do not send emails automatically on your behalf.</strong> All email sending actions require you to review and approve each message before it is sent.</p>
          </div>
          <div className="flex gap-4 items-start border-l-2 border-red-500/20 pl-6">
            <div className="text-red-500 font-bold">✕</div>
            <p><strong>We do not store your passwords.</strong> Authentication is handled entirely through Google OAuth 2.0; we never see or store your Google credentials.</p>
          </div>
          <div className="flex gap-4 items-start border-l-2 border-red-500/20 pl-6">
            <div className="text-red-500 font-bold">✕</div>
            <p><strong>We do not serve advertisements.</strong> Mailient is a subscription product and is not supported by advertising. We do not allow advertisers to target you based on your email content.</p>
          </div>
        </div>
      )
    },
    {
      id: 6,
      title: "6. Data security and encryption",
      content: (
        <div className="space-y-4">
          <p>We take the security of your data extremely seriously and have implemented multiple layers of protection:</p>
          <ul className="list-disc pl-5 space-y-3">
            <li><strong>AES-256 encryption:</strong> Sensitive metadata and stored data is encrypted using AES-256. Your decryption keys reside in your browser and never transmit to our servers.</li>
            <li><strong>Zero-knowledge architecture:</strong> We store only encrypted blobs which we cannot read. Sensitive metadata is encrypted client-side before reaching our servers.</li>
            <li><strong>Secure transmission:</strong> All data transmitted between your browser and our servers is encrypted via TLS.</li>
          </ul>
        </div>
      )
    },
    {
      id: 7,
      title: "7. Google API services disclosure",
      content: (
        <div className="space-y-4">
          <p>Mailient's use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>We only request the minimum permissions necessary.</li>
            <li>Gmail data is used solely to deliver and improve Mailient's core features.</li>
            <li>We do not transfer Gmail data except as necessary to provide the service.</li>
            <li>You can revoke access at any time via myaccount.google.com/permissions.</li>
          </ul>
        </div>
      )
    },
    {
      id: 8,
      title: "8. Data retention",
      content: (
        <div className="space-y-4">
          <p>We retain your data only for as long as necessary:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Email content is processed transiently and not permanently stored.</li>
            <li>Account information is retained while your account is active.</li>
            <li>Usage analytics (anonymized) may be retained for up to 24 months.</li>
            <li>Billing records may be retained for up to 7 years as required by law.</li>
          </ul>
        </div>
      )
    },
    {
      id: 9,
      title: "9. Sharing of information",
      content: (
        <div className="space-y-4">
          <p>We do not sell your personal data. We may share limited information only with trusted service providers who process data on our behalf, or when required for legal compliance.</p>
        </div>
      )
    },
    {
      id: 10,
      title: "10. Your rights and choices",
      content: (
        <div className="space-y-4">
          <p>Regardless of location, you have rights to access, correct, delete, or port your personal data. To exercise these rights, contact us at mailient.xyz@gmail.com.</p>
        </div>
      )
    },
    {
      id: 11,
      title: "11. Cookies and tracking technologies",
      content: (
        <div className="space-y-4">
          <p>Mailient uses minimal essential cookies to maintain your login session. We do not use advertising or behavioral tracking technologies.</p>
        </div>
      )
    },
    {
      id: 12,
      title: "12. International data transfers",
      content: (
        <div className="space-y-4">
          <p>Mailient is operated globally. We ensure any international transfer of data is subject to appropriate safeguards in accordance with law.</p>
        </div>
      )
    },
    {
      id: 13,
      title: "13. Third-party services and integrations",
      content: (
        <div className="space-y-4">
          <p>Mailient relies on providers such as Google (OAuth/Gmail), secure payment processors, and AI model APIs. All providers are vetted for high security standards.</p>
        </div>
      )
    },
    {
      id: 14,
      title: "14. Changes to this policy",
      content: (
        <div className="space-y-4">
          <p>We may update this policy periodically. When material changes occur, we will update the date and notify users where significant changes take place.</p>
        </div>
      )
    },
    {
      id: 15,
      title: "15. Contact us",
      content: (
        <div className="space-y-2">
          <p className="font-bold text-black dark:text-white">Mailient Intelligence</p>
          <p>Email: mailient.xyz@gmail.com</p>
          <p>Website: mailient.xyz</p>
          <p>Founder: @Maulik_055 on X</p>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#fafafa] font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800 transition-colors duration-500">
      
      {/* Top Header with Theme Toggle */}
      <div className="fixed top-8 right-8 z-50">
        <AnimatedThemeToggler className="bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-sm border border-neutral-200 dark:border-neutral-800" />
      </div>

      <main className="max-w-[720px] mx-auto pt-40 pb-48 px-6">
        
        <header className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-black dark:text-white mb-6 lowercase">
              privacy policy
            </h1>
            <p className="text-sm font-semibold tracking-wide text-neutral-400 dark:text-neutral-500 uppercase">
              Effective Date: {currentDate}
            </p>
            <div className="h-px w-full bg-neutral-100 dark:bg-neutral-900 my-10" />
          </motion.div>
        </header>

        <div className="space-y-20">
          {sections.map((section) => (
            <motion.section
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              className="group"
            >
              <h2 className="text-2xl font-bold text-black dark:text-white mb-6 tracking-tight">
                {section.title}
              </h2>
              <div className="text-[17px] leading-[1.7] text-neutral-600 dark:text-neutral-300 font-normal">
                {section.content}
              </div>
            </motion.section>
          ))}
        </div>

        <footer className="mt-40 pt-16 border-t border-neutral-100 dark:border-neutral-900">
          <p className="mt-8 text-neutral-400 dark:text-neutral-500 text-xs text-center opacity-60">
            &copy; 2026 Mailient Intelligence. All rights reserved.
          </p>
        </footer>
      </main>

      <FloatingNavbar />

    </div>
  );
}
