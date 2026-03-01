import { ArrowRight } from "lucide-react"
import { useState, Suspense, lazy } from "react"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"

const Dithering = lazy(() =>
    import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
)

export function CTASection() {
    const [isHovered, setIsHovered] = useState(false)
    const router = useRouter()
    const { data: session, status } = useSession()

    return (
        <section
            className="relative w-full min-h-[85vh] flex flex-col items-center justify-center overflow-hidden pt-32 pb-20 px-4 md:px-6"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Background Animation - Full Section */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <Suspense fallback={<div className="absolute inset-0 bg-black/5" />}>
                    <div className="absolute inset-0 opacity-40 dark:opacity-20 mix-blend-screen">
                        <Dithering
                            colorBack="#00000000" // Transparent
                            colorFront="#D4D4D8"  // Metal grey
                            shape="warp"
                            type="4x4"
                            speed={isHovered ? 0.6 : 0.2}
                            className="w-full h-full scale-125 md:scale-110"
                            minPixelRatio={1}
                        />
                    </div>
                </Suspense>
            </div>

            {/* Content Layer */}
            <div className="relative z-10 w-full max-w-6xl mx-auto text-center flex flex-col items-center">
                <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-1.5 text-sm font-medium text-white/80">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/50 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    AI-Powered Email for Founders
                </div>

                {/* Headline - Larger and more dramatic without card constraint */}
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-medium tracking-tighter text-white mb-10 leading-[0.95] max-w-5xl">
                    Email That Thinks <br />
                    <span className="text-white/40">Like You Do.</span>
                </h1>

                {/* Description */}
                <p className="text-zinc-400 text-lg md:text-2xl max-w-3xl mb-14 leading-relaxed font-light">
                    Stop triaging. Mailient identifies revenue opportunities, surfaces urgent threads, and drafts replies in your voice—automatically.
                </p>

                {/* Button */}
                <button
                    onClick={() => status === "authenticated" ? router.push('/home-feed?welcome=true') : signIn('google')}
                    className="group relative inline-flex h-16 items-center justify-center gap-4 overflow-hidden rounded-full bg-white px-12 text-lg font-semibold text-black transition-all duration-500 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]"
                >
                    <span className="relative z-10">
                        {status === "authenticated" ? "Go to Dashboard" : "Unlock My Inbox"}
                    </span>
                    <ArrowRight className="h-6 w-6 relative z-10 transition-transform duration-500 group-hover:translate-x-1" />
                </button>

                {/* Trust Text */}
                <p className="mt-8 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                    Join 2,800+ founders automating their growth
                </p>
            </div>
        </section>
    )
}
