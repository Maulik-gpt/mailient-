// Landing-page FAQs — single source of truth.
// Rendered by the landing accordion (client) AND serialized into FAQPage
// JSON-LD on the homepage (server), so copy edits update both.
export const landingFaqs: Array<{ q: string; a: string }> = [
  {
    q: "Is there a free plan?",
    a: "No — Mailient is a single plan with full access to everything. You can choose monthly at $29, annual at $199 (two months free), or grab a Lifetime Founding Member seat for $499 while they last. Every plan includes the full product: the AI that runs your inbox, replies in your voice, automations that work while you sleep, and end-to-end encryption. No free tier, no feature gating, no surprises."
  },
  {
    q: "Does Mailient replace Gmail?",
    a: "No. Mailient works on top of your existing Gmail account through a secure OAuth connection. Your emails still live in Gmail. Mailient makes them intelligent. You can use both side by side or live entirely inside Mailient — your choice."
  },
  {
    q: "How does Mailient learn my writing style?",
    a: "When you connect Gmail, Mailient reads your last 90 days of sent emails and learns how you write — your tone, your greeting style, your typical sign-off, how formal you are with different types of people. Every draft it writes sounds like you. It improves the more you use it."
  },
  {
    q: "Is my email data private?",
    a: "Yes — and not just as a policy. Your emails are encrypted inside your own browser using AES-256-GCM before they ever reach Mailient's servers. Personal data is stripped before the AI processes anything. We cannot read your emails. That is an architecture decision, not a promise."
  },
  {
    q: "Can I cancel anytime?",
    a: "Monthly plan cancels at the end of your billing period. Annual plan can be cancelled anytime — you keep full access for the year you paid for. No retention calls. No dark patterns. One click in settings."
  },

  {
    q: "How long does setup take?",
    a: "Two minutes. Connect your Google account, grant Gmail and Calendar access, and Mailient starts working immediately. There is nothing to configure. It begins learning your voice in the background from the moment you connect."
  },
  {
    q: "Does Mailient work for teams?",
    a: "Mailient is built for solo founders — one founder, one Gmail, no team seats. Multi-seat support is on the roadmap. If you need it sooner, email Maulik directly at mailient.xyz@gmail.com."
  },

  {
    q: "Who built Mailient?",
    a: "Maulik — a 14-year-old founder who built Mailient because he watched smart people lose deals, miss opportunities, and burn hours on email every single day. The product exists because the problem is real. You can talk to him directly at @maulik_5 on X or mailient.xyz@gmail.com."
  }
];
