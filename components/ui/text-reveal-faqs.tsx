'use client'

import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import Link from 'next/link'
import { motion } from "framer-motion";

export default function FAQs() {
  const faqItems = [
    {
      id: 'item-1',
      question: 'What exactly is Mailient?',
      answer: 'Mailient is an AI-first email intelligence platform that works directly within your Gmail. It scans your inbox in real-time to identify high-value opportunities, pending tasks, and critical shifts in your business conversations.',
    },
    {
      id: 'item-2',
      question: 'How does Sift AI differ from standard search?',
      answer: "Standard search looks for keywords. Sift understands intent. It knows if a lead is 'cooling off', if a client is 'negotiating', or if a follow-up is 'overdue', even if those exact words aren't in the email.",
    },
    {
      id: 'item-3',
      question: 'What is Arcus AI?',
      answer: 'Arcus is your deep-thinking assistant. It can summarize complex threads, draft responses in your specific voice, and even coordinate your calendar to find open slots for meetings.',
    },
    {
      id: 'item-4',
      question: 'Is my email data secure?',
      answer: 'Security is our core priority. We use enterprise-grade encryption. We only process metadata for Sift and specific content when you trigger an AI action. We never store your raw email content permanently.',
    },
    {
      id: 'item-5',
      question: 'What is the "Mimic My Style" feature?',
      answer: 'Our AI analyzes your previously sent emails to adopt your tone, vocabulary, sign-offs, and even your use of emojis. This ensures that every AI-generated draft feels authentically like you.',
    },
    {
      id: 'item-6',
      question: 'How do I trigger an AI scheduling?',
      answer: 'In Arcus chat, click the calendar icon. Arcus will scan your linked calendar and suggest optimal times based on the email context and your preferences.',
    },
    {
      id: 'item-7',
      question: 'What are AI Notes?',
      answer: 'AI Notes allow you to extract actionable intelligence from an email and save it directly into your dashboard. It cleans up the mess and keeps the insight ready for your next project.',
    },
    {
      id: 'item-8',
      question: 'How do Arcus credits work?',
      answer: 'Each plan comes with a set of monthly Arcus credits. High-intensity tasks like drafting and deep research use credits. You can monitor your usage in the sidebar usage badge.',
    },
    {
      id: 'item-9',
      question: 'Can I use Mailient for multiple business accounts?',
      answer: 'Yes! Pro and Team plans support multi-account linking, allowing you to sift through all your business communications from a single, unified view.',
    },
    {
      id: 'item-10',
      question: 'How do I enable Smart Nudges?',
      answer: 'Go to Settings > System and toggle "Enable Smart Nudges". Sift will then start monitoring for crucial updates and alert you the moment a hot lead needs your attention.',
    },
    {
      id: 'item-11',
      question: 'What happens if I hit my usage limit?',
      answer: "You'll still be able to read and reply to emails manually, but AI features will be paused until the next billing cycle or until you upgrade to a higher-tier plan.",
    },
    {
      id: 'item-12',
      question: 'Does Mailient replace my Gmail app?',
      answer: "No, Mailient enhances it. We provide a powerful overlay and intelligence layer, but your emails always live in Gmail. Any draft we create appears in your Gmail 'Drafts' folder.",
    },
    {
      id: 'item-13',
      question: 'How accurate is the opportunity detection?',
      answer: 'Our models are trained on millions of business interactions. While we recommend a quick human check, our users report over 95% accuracy in detecting urgent business needs.',
    },
    {
      id: 'item-14',
      question: 'How do I manage my subscription?',
      answer: 'You can view, upgrade, or cancel your plan at any time through the Subscription tab in the Account Settings menu.',
    },
    {
      id: 'item-15',
      question: 'How can I get faster support?',
      answer: 'Pro users get priority access. For any issues, use the Feedback tab in this Help card or email our founder directly at mailient.xyz@gmail.com.',
    },
  ];

  return (
    <section className="py-2">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 md:grid-cols-5 md:gap-12">
          <div className="md:col-span-2">
            <h2 className="text-foreground text-3xl font-bold dark:text-white">Product Help</h2>
            <p className="text-muted-foreground mt-4 text-balance text-sm leading-relaxed">
              Everything you need to know about navigating the Mailient ecosystem.
            </p>
            <p className="text-neutral-600 dark:text-neutral-500 mt-6 hidden md:block text-xs uppercase tracking-widest font-bold">
               Expert Guidance
            </p>
          </div>

          <div className="md:col-span-3">
            <Accordion
              type="single"
              collapsible
              className="w-full"
            >
              {faqItems.map((item) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="border-b border-neutral-100 dark:border-white/5 py-1"
                >
                  <AccordionTrigger className="cursor-pointer text-sm font-semibold hover:no-underline dark:text-neutral-300 py-4">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-neutral-500 dark:text-neutral-400">
                    <BlurredStagger text={item.answer} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  )
}

export const BlurredStagger = ({
  text,
}: {
  text: string;
}) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.005,
      },
    },
  };
 
  const letterAnimation = {
    hidden: {
      opacity: 0,
      filter: "blur(4px)",
      y: 2
    },
    show: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0
    },
  };
 
  return (
    <div className="w-full">
      <motion.p
        variants={container}
        initial="hidden"
        animate="show"
        className="text-sm leading-relaxed break-words whitespace-normal text-neutral-500 dark:text-neutral-400"
      >
        {text.split("").map((char, index) => (
          <motion.span
            key={index}
            variants={letterAnimation}
            transition={{ duration: 0.2 }}
            className="inline-block"
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.p>
    </div>
  );
};
