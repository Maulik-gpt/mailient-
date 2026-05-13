import { ArrowRight, ShieldCheck, Lock, Zap, ArrowUpRight } from "lucide-react"
import { useState, Suspense, lazy } from "react"
import { useRouter } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { Announcement, AnnouncementTag, AnnouncementTitle } from "@/components/ui/announcement"

const Dithering = lazy(() =>
    import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
)

export function CTASection() {
    const [isHovered, setIsHovered] = useState(false)
    const router = useRouter()
    const { data: session, status } = useSession()
    const [email, setEmail] = useState("")

    const handleJoinWaitlist = async () => {
        if (!email || !email.includes("@")) {
            // Basic validation
            return;
        }

        // Redirect to Google Sign-in to capture verified Gmail ID
        // After success, it will redirect to onboarding with waitlist param
        await signIn("google", {
            callbackUrl: "/onboarding?waitlist=true",
            login_hint: email.toLowerCase().trim()
        });
    };

    return (
        <section
            id="waitlist"
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
                <Announcement className="mb-10 cursor-pointer" onClick={() => router.push('/home-feed')}>
                    <AnnouncementTag>Update</AnnouncementTag>
                    <AnnouncementTitle>
                        Introducing v1.2
                        <ArrowUpRight size={14} className="ml-1 opacity-60" />
                    </AnnouncementTitle>
                </Announcement>

                {/* Headline */}
                <h2 className="font-serif text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight text-white mb-8 leading-[1.05] max-w-4xl">
                    Email That Thinks <br />
                    <span className="text-white/80">Like You Do.</span>
                </h2>

                {/* Description */}
                <p className="text-neutral-600 dark:text-zinc-400 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
                    Stop triaging. Mailient identifies revenue opportunities, surfaces urgent threads, and drafts replies in your voice—automatically.
                </p>

                {/* Waitlist Input and Button */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-lg mb-12 animate-element animate-delay-500">
                    <div className="relative w-full group">
                        <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl group-hover:bg-white/10 transition-colors pointer-events-none" />
                        <input
                            type="email"
                            placeholder="Enter your Gmail address..."
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="relative w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all text-base font-medium"
                        />
                    </div>
                    <button
                        onClick={handleJoinWaitlist}
                        className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-2xl bg-white px-8 text-base font-bold text-black transition-all duration-300 hover:scale-[1.02] active:scale-95 whitespace-nowrap shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
                    >
                        <span className="relative z-10">
                            Join Waitlist
                        </span>
                        <ArrowRight className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                </div>


                {/* Trust Signals */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="whitespace-nowrap uppercase tracking-widest font-black text-[10px] text-white">Google Workspace Auth</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                        <Lock className="w-4 h-4 text-blue-400" />
                        <span className="whitespace-nowrap uppercase tracking-widest font-black text-[10px] text-white">Encrypted</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="whitespace-nowrap uppercase tracking-widest font-black text-[10px] text-white">2 Min Setup</span>
                    </div>
                </div>
            </div>
        </section>
    )
}
