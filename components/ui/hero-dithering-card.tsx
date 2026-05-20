import React, { useState, Suspense, lazy } from "react"
import { ArrowRight } from "lucide-react"

const Dithering = lazy(() => 
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
)

export function CTASection() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <section className="py-20 w-full flex justify-center items-center px-4 md:px-6 bg-black relative z-10">
      <div 
        className="w-full max-w-7xl relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative overflow-hidden rounded-[48px] border border-white/[0.08] bg-neutral-950/40 shadow-2xl min-h-[550px] flex flex-col items-center justify-center duration-500">
          
          <Suspense fallback={<div className="absolute inset-0 bg-neutral-900/10 pointer-events-none" />}>
            <div className="absolute inset-0 z-0 pointer-events-none opacity-50 dark:opacity-40 mix-blend-multiply dark:mix-blend-screen">
              <Dithering
                colorBack="#00000000" // Transparent
                colorFront="#161616"  // High-end obsidian accent instead of orange
                shape="warp"
                type="4x4"
                speed={isHovered ? 0.35 : 0.12}
                className="size-full"
                minPixelRatio={1}
              />
            </div>
          </Suspense>

          <div className="relative z-10 px-6 max-w-4xl mx-auto text-center flex flex-col items-center">
            
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-mono tracking-wider text-white uppercase backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              Neural Voice Profile
            </div>

            {/* Headline */}
            <h2 className="text-4xl md:text-6xl lg:text-[76px] font-medium tracking-tight text-white mb-8 leading-[1.05] max-w-3xl font-sans">
              Your drafts, <br />
              <span className="text-white/60">delivered perfectly.</span>
            </h2>
            
            {/* Description */}
            <p className="text-neutral-400 text-sm md:text-base max-w-2xl mb-10 leading-relaxed font-sans font-light">
              Mailient's local Tone Engine reads your historical outbox to construct authentic replies that mirror your exact signatures, style preferences, and vocabulary.
            </p>

            {/* Button */}
            <button className="group relative inline-flex h-12 items-center justify-center gap-2.5 overflow-hidden rounded-full bg-white text-black px-10 text-xs font-semibold tracking-tight transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] active:scale-95">
              <span className="relative z-10">Start writing with AI</span>
              <ArrowRight className="h-4 w-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
