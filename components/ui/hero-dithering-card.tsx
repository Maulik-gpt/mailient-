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

                {/* Headline */}
                <h2 className="font-serif text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight text-white mb-8 leading-[1.05] max-w-4xl">
                    Email That Thinks <br />
                    <span className="text-white/80">Like You Do.</span>
                </h2>

                {/* Description */}
                <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
                    Stop triaging. Mailient identifies revenue opportunities, surfaces urgent threads, and drafts replies in your voice—automatically.
                </p>

                {/* Button */}
                <button
                    onClick={() => status === "authenticated" ? router.push('/home-feed?welcome=true') : signIn('google')}
                    className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full bg-white px-12 text-base font-medium text-black transition-all duration-300 hover:scale-105 active:scale-95"
                >
                    <span className="relative z-10">
                        {status === "authenticated" ? "Go to Dashboard" : "Unlock My Inbox"}
                    </span>
                    <ArrowRight className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
            </div>
        </section>
    )
}
