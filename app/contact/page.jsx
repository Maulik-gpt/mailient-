"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Mail,
  MessageSquare,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { SignInLayout, GlassInputWrapper } from '@/components/ui/sign-in';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', message: '' });
      } else {
        setStatus('error');
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      setStatus('error');
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <SignInLayout
      title={<>Contact <br /> Support</>}
      description="Have a question or need assistance? Reach out to our team of experts."
      hideHero={true}
      allowScroll={true}
      testimonials={[]}
    >
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-10 bg-white/[0.02] border border-white/[0.08] rounded-[32px] text-center space-y-6"
            >
              <div className="w-16 h-16 bg-white/[0.05] border border-white/[0.1] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Message Sent</h2>
              <p className="text-white/40 text-sm font-light leading-relaxed">
                Thank you for reaching out. We&apos;ve received your inquiry and will get back to you at <span className="text-white/60 font-medium">mailient.xyz@gmail.com</span> shortly.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="w-full h-14 btn-liquid-glass rounded-2xl font-bold text-sm mt-4 flex items-center justify-center gap-2"
              >
                Send Another Message
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
                  <Sparkles className="w-3 h-3" />
                  <span>Support Gateway</span>
                </div>
                <h2 className="text-white text-lg font-medium tracking-tight">Direct Intelligence Link</h2>
                <p className="text-white/30 text-xs font-light leading-relaxed">
                  Fill out the form below to connect with our support infrastructure.
                </p>
              </div>

              {status === 'error' && (
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex gap-3 items-center">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-200/60 font-medium tracking-tight">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest block ml-1">Full Name</label>
                  <GlassInputWrapper>
                    <div className="flex items-center px-4">
                      <User className="w-4 h-4 text-white/20 shrink-0" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Your name"
                        className="w-full bg-transparent text-sm p-4 focus:outline-none text-white placeholder:text-white/10 font-medium"
                      />
                    </div>
                  </GlassInputWrapper>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest block ml-1">Email Address</label>
                  <GlassInputWrapper>
                    <div className="flex items-center px-4">
                      <Mail className="w-4 h-4 text-white/20 shrink-0" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="your@email.com"
                        className="w-full bg-transparent text-sm p-4 focus:outline-none text-white placeholder:text-white/10 font-medium"
                      />
                    </div>
                  </GlassInputWrapper>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest block ml-1">Message</label>
                  <GlassInputWrapper>
                    <div className="flex items-start px-4 pt-4">
                      <MessageSquare className="w-4 h-4 text-white/20 shrink-0 mt-0.5" />
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="How can we help?"
                        className="w-full bg-transparent text-sm p-4 pt-0 focus:outline-none text-white placeholder:text-white/10 font-medium resize-none"
                      />
                    </div>
                  </GlassInputWrapper>
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full h-14 btn-liquid-glass rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] mt-8"
                >
                  {status === 'loading' ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white animate-spin rounded-full" />
                  ) : (
                    <>
                      <span>Submit Inquiry</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SignInLayout>
  );
}
