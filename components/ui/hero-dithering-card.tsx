import React, { useState, Suspense, lazy } from "react"
import { ArrowRight } from "lucide-react"
import { signIn } from "next-auth/react"
import { CircleExpandButton } from "@/components/CircleExpandButton"

const Dithering = lazy(() => 
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
)

export function CTASection() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <section className="py-24 w-full flex justify-center items-center px-4 md:px-6 bg-black relative z-10">
      <div 
        className="w-full max-w-7xl relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative overflow-hidden rounded-[48px] border border-white/[0.08] bg-neutral-950/40 shadow-2xl min-h-[520px] flex flex-col items-center justify-center duration-500">
          
          <Suspense fallback={<div className="absolute inset-0 bg-neutral-900/10 pointer-events-none" />}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250%] md:w-[150%] h-[250%] md:h-[150%] z-0 pointer-events-none opacity-50 dark:opacity-40 mix-blend-multiply dark:mix-blend-screen">
              <Dithering
                colorBack="#00000000" // Transparent
                colorFront="#4a4a4a"  // Lighter gray instead of ultra-dark metallic gray
                shape="warp"
                type="4x4"
                speed={isHovered ? 0.35 : 0.12}
                className="size-full"
                minPixelRatio={1}
              />
            </div>
          </Suspense>

          <div className="relative z-10 px-6 max-w-4xl mx-auto text-center flex flex-col items-center">
            
            {/* Premium Linear Gradient Headline */}
            <h2 className="text-4xl md:text-6xl lg:text-[76px] font-medium tracking-[-0.035em] mb-6 leading-[1.08] max-w-3xl font-sans select-none bg-gradient-to-b from-white via-neutral-100 to-neutral-500 bg-clip-text text-transparent">
              Built for the future. <br />
              Available today.
            </h2>
            
            {/* Description */}
            <p className="text-[#8a8f98] text-sm md:text-base max-w-xl mb-10 leading-relaxed font-sans font-light select-none">
              Connect your Gmail account today and see why people trust Mailient for their email automation.
            </p>

            {/* Buttons row matching the screenshot */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {/* Left Button: Obsidian Pill */}
              <CircleExpandButton
                href="/auth/signup"
                className="bg-[#121316] border border-white/[0.08] hover:border-white/20"
              >
                Start free trial
              </CircleExpandButton>

              {/* Right Button: Transparent/Black Pill */}
              <CircleExpandButton
                href="https://x.com/maulik_5"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black border border-white/[0.06] hover:border-white/[0.12]"
              >
                Talk to Founder
              </CircleExpandButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
