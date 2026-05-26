"use client";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Twitter, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function WaitlistSuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-satoshi">
      {/* Premium Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02),transparent_50%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/[0.01] blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/[0.01] blur-[120px] rounded-full animate-pulse delay-700" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 100 }}
        className="relative z-10 max-w-2xl w-full bg-zinc-950/40 backdrop-blur-3xl border border-white/10 p-8 md:p-16 rounded-[48px] shadow-2xl text-center"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-[0_20px_50px_rgba(255,255,255,0.15)]"
          >
            <CheckCircle2 className="w-12 h-12 text-black" strokeWidth={2.5} />
          </motion.div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
            <Sparkles className="w-3 h-3 text-white/60" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Position Secured</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6 bg-gradient-to-b from-white via-white to-zinc-500 bg-clip-text text-transparent">
            You&apos;re officially on the list.
          </h1>
          
          <p className="text-zinc-400 text-lg mb-12 leading-relaxed max-w-md mx-auto">
            Your application for Mailient Early Access has been received. You&apos;ll receive a notification at your verified Gmail the moment a slot opens for your batch.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            <Button
              onClick={() => window.open('https://x.com/maulik_5', '_blank')}
              className="h-16 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <Twitter className="w-5 h-5 fill-current" />
              Follow for Updates
            </Button>
            <Button
              onClick={() => router.push('/')}
              className="h-16 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95"
            >
              Back to Home
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="pt-8 border-t border-white/5">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-zinc-600">
                <Sparkles className="w-4 h-4" />
                <span className="text-[9px] uppercase tracking-[0.3em] font-black">Priority Access Protocol Active</span>
              </div>
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-zinc-950 bg-zinc-900 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" className="w-full h-full object-cover grayscale" />
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-zinc-950 bg-white text-black flex items-center justify-center text-[10px] font-black">
                  +1k
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium">Joining 1,240+ founders in the queue</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Decorative large text */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.03 }}
        transition={{ delay: 1, duration: 2 }}
        className="mt-12 text-white text-[15vw] font-black uppercase select-none pointer-events-none absolute bottom-0 leading-none whitespace-nowrap"
      >
        MISSION SUCCESS • MAILIENT
      </motion.p>
    </div>
  );
}
