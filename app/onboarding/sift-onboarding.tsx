"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check, Mail, Users, Lightbulb, Send, Loader2, Zap, ArrowRight, Sparkles } from "lucide-react";
import { SiftPostComposer } from "@/components/ui/sift-post-composer";

interface SiftOnboardingData {
  username: string;
  founderInterests: string[];
  firstPost: string;
  followedFounders: string[];
}

export default function SiftOnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<SiftOnboardingData>({
    username: "",
    founderInterests: [],
    firstPost: "",
    followedFounders: []
  });
  const [usernameError, setUsernameError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncProgress, setSyncProgress] = useState(0);
  const [founderRecommendations, setFounderRecommendations] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  // Redirect if not authenticated or if onboarding is already completed
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    // Check if onboarding is already completed
    if (status === "authenticated" && session?.user?.email) {
      const checkOnboardingStatus = async () => {
        try {
          const response = await fetch("/api/onboarding/status");
          if (response.ok) {
            const data = await response.json();
            if (data.completed) {
              // Already completed onboarding, redirect to home feed
              router.push("/home-feed");
            }
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
        }
      };
      checkOnboardingStatus();
    }
  }, [status, session, router]);

  // Simulate AI processing and founder recommendations
  useEffect(() => {
    if (status === "authenticated" && currentStep === 1) {
      // Simulate inbox sync and AI processing
      const simulateAISync = async () => {
        setIsLoading(true);
        setSyncProgress(0);

        // Simulate progress
        const progressInterval = setInterval(() => {
          setSyncProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              return 100;
            }
            return prev + 10;
          });
        }, 300);

        // After sync completes
        setTimeout(() => {
          clearInterval(progressInterval);
          setSyncProgress(100);

          // Generate mock AI insights
          const insights = [
            "Arcus detected 3 high-priority emails needing follow-up",
            "Found 2 potential sales leads from your inbox",
            "Identified 1 investor reply that needs attention",
            "Discovered 4 founder updates you might find valuable"
          ];

          // Generate mock founder recommendations
          const founders = [
            {
              id: 'ryan',
              name: 'Ryan Hoover',
              username: 'rrhoover',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ryan',
              title: 'Founder of Product Hunt',
              bio: 'Product enthusiast and startup founder. Building the future of product discovery.',
              expertise: 'Product Launch, Growth, Community Building'
            },
            {
              id: 'priya',
              name: 'Priya Sharma',
              username: 'priyasaas',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya',
              title: 'CEO @ SaaSScale',
              bio: 'SaaS growth expert with 10+ years experience. Helped 50+ startups scale from $0 to $1M ARR.',
              expertise: 'SaaS Growth, Customer Acquisition, Retention'
            },
            {
              id: 'aarav',
              name: 'Aarav Patel',
              username: 'aaravgrowth',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=aarav',
              title: 'Founder @ GrowthFlow',
              bio: 'Onboarding and activation specialist. Increased conversion rates by 300% for multiple startups.',
              expertise: 'User Onboarding, Activation, Conversion Optimization'
            },
            {
              id: 'danny',
              name: 'Danny Postma',
              username: 'dannypostmaa',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=danny',
              title: 'Indie Maker',
              bio: 'Serial indie maker building profitable micro-SaaS products. Author and startup advisor.',
              expertise: 'Indie Hacking, Micro-SaaS, Bootstrapping'
            },
            {
              id: 'sarah',
              name: 'Sarah Johnson',
              username: 'sarahux',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
              title: 'UX Designer',
              bio: 'Product design leader with focus on founder-friendly UX. Worked with 20+ YC startups.',
              expertise: 'UX Design, Product Strategy, Founder Experience'
            }
          ];

          setAiInsights(insights);
          setFounderRecommendations(founders);
          setIsLoading(false);

          // Auto-proceed to username step after AI processing
          setTimeout(() => setCurrentStep(2), 2000);
        }, 3000);
      };

      simulateAISync();
    }
  }, [status, currentStep]);

  const handleUsernameChange = (value: string) => {
    // Remove @ if user types it
    const cleanValue = value.replace(/@/g, "");

    // Limit to 15 characters
    if (cleanValue.length > 15) return;

    // Only allow alphanumeric and underscore
    if (!/^[a-zA-Z0-9_]*$/.test(cleanValue)) {
      setUsernameError("Username can only contain letters, numbers, and underscores");
      return;
    }

    setUsernameError("");
    setData({ ...data, username: cleanValue });
  };

  const handleUsernameNext = async () => {
    if (!data.username || data.username.length === 0) {
      setUsernameError("Please enter a username");
      return;
    }

    // Check if username is available
    try {
      const response = await fetch("/api/onboarding/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.username }),
      });

      const result = await response.json();
      if (!result.available) {
        setUsernameError("This username is already taken");
        return;
      }

      setCurrentStep(3);
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameError("Error checking username availability");
    }
  };

  const handleFounderInterestSelect = (interest: string) => {
    setData(prev => {
      const newInterests = prev.founderInterests.includes(interest)
        ? prev.founderInterests.filter(i => i !== interest)
        : [...prev.founderInterests, interest];
      return { ...prev, founderInterests: newInterests };
    });
  };

  const handleFollowFounder = (founderId: string) => {
    setData(prev => {
      const newFollowed = prev.followedFounders.includes(founderId)
        ? prev.followedFounders.filter(id => id !== founderId)
        : [...prev.followedFounders, founderId];
      return { ...prev, followedFounders: newFollowed };
    });
  };

  const handlePostSubmit = (content: string) => {
    setData({ ...data, firstPost: content });
    setCurrentStep(5);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Prepare onboarding data for Sift
      const siftData = {
        username: data.username,
        onboardingType: 'sift',
        founderInterests: data.founderInterests,
        followedFounders: data.followedFounders,
        firstPost: data.firstPost,
        aiInsightsGenerated: aiInsights.length,
        foundersFollowedCount: data.followedFounders.length
      };

      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(siftData),
      });

      if (!response.ok) {
        throw new Error("Failed to save onboarding data");
      }

      // Redirect to home feed with Sift experience
      router.push("/home-feed");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      alert("Failed to save onboarding data. Please try again.");
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8 text-center py-8 animate-in fade-in duration-500">
            <div className="space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                <div className="relative bg-neutral-900 rounded-full w-20 h-20 flex items-center justify-center border border-neutral-800">
                  <Sparkles className="w-8 h-8 text-[#fafafa]" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-[#fafafa] tracking-tight">Syncing Your Inbox</h2>
                <p className="text-neutral-400 max-w-sm mx-auto">
                  Arcus is scanning your last 200 emails to generate your first signal feed...
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-sm mx-auto">
                <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#fafafa] h-1.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${syncProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-neutral-500 font-medium">
                  <span>Processing</span>
                  <span>{syncProgress}%</span>
                </div>
              </div>

              {/* AI Processing Animation */}
              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Arcus is analyzing your emails...</span>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8 py-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-[#fafafa] tracking-tight">Claim Your Handle</h2>
              <p className="text-neutral-400">
                This will be your unique identifier in the founder network.
              </p>
            </div>
            <div className="space-y-4 max-w-sm mx-auto">
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-lg font-medium transition-colors group-focus-within:text-[#fafafa]">
                  @
                </span>
                <Input
                  type="text"
                  value={data.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="foundername"
                  maxLength={15}
                  className="pl-9 h-12 bg-[#0a0a0a] border-neutral-800 text-[#fafafa] placeholder:text-neutral-600 rounded-xl focus:border-neutral-600 focus:ring-0 transition-all text-lg"
                  autoFocus
                />
              </div>
              {usernameError && (
                <p className="text-sm text-red-500 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <span className="w-1 h-1 rounded-full bg-red-500"></span>
                  {usernameError}
                </p>
              )}
              <div className="flex justify-end">
                <p className="text-xs text-neutral-600 font-medium">
                  {data.username.length}/15
                </p>
              </div>
            </div>
            <div className="max-w-sm mx-auto">
              <Button
                onClick={handleUsernameNext}
                disabled={!data.username || data.username.length === 0 || !!usernameError}
                className="w-full h-11 bg-[#fafafa] hover:bg-neutral-200 text-black font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8 py-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-[#fafafa] tracking-tight">What drives you?</h2>
              <p className="text-neutral-400">
                Select at least 3 topics to personalize your feed
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              {[
                "Fundraising",
                "SaaS",
                "AI Startups",
                "Solopreneurs",
                "Growth Wins",
                "Hiring",
                "Product Launch",
                "Lessons Learned",
                "Pain Points",
                "Bootstrapping"
              ].map((interest) => (
                <button
                  key={interest}
                  onClick={() => handleFounderInterestSelect(interest)}
                  className={`p-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${data.founderInterests.includes(interest)
                      ? 'bg-[#fafafa] text-black shadow-lg scale-[1.02]'
                      : 'bg-neutral-900/30 text-neutral-400 border border-neutral-800 hover:border-neutral-600 hover:text-neutral-200'
                    }`}
                >
                  {interest}
                </button>
              ))}
            </div>
            <div className="max-w-sm mx-auto pt-4">
              <Button
                onClick={() => setCurrentStep(4)}
                disabled={data.founderInterests.length < 3}
                className="w-full h-11 bg-[#fafafa] hover:bg-neutral-200 text-black font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8 py-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-[#fafafa] tracking-tight">Curated for You</h2>
              <p className="text-neutral-400">
                Based on your interests, we recommend following these founders (min. 5)
              </p>
            </div>

            {/* AI Insights Summary */}
            <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-xl p-5 mb-6 backdrop-blur-sm">
              <h3 className="text-sm font-medium text-[#fafafa] mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                AI Insights from Your Inbox
              </h3>
              <ul className="space-y-2.5">
                {aiInsights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <span className="text-neutral-300 leading-relaxed">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
              {founderRecommendations.map((founder) => (
                <div key={founder.id} className="group flex items-start gap-4 p-4 bg-neutral-900/20 hover:bg-neutral-900/40 rounded-xl border border-neutral-800/50 hover:border-neutral-700 transition-all">
                  <Avatar className="w-10 h-10 border border-neutral-800">
                    <AvatarImage src={founder.avatar} alt={founder.name} />
                    <AvatarFallback className="bg-neutral-800 text-neutral-400">{founder.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex flex-col">
                        <span className="font-medium text-[#fafafa] text-sm">{founder.name}</span>
                        <span className="text-xs text-neutral-500">@{founder.username}</span>
                      </div>
                      <Button
                        onClick={() => handleFollowFounder(founder.id)}
                        size="sm"
                        className={`px-4 py-1.5 h-8 text-xs font-medium rounded-lg transition-all ${data.followedFounders.includes(founder.id)
                            ? 'bg-neutral-800 text-[#fafafa] hover:bg-neutral-700'
                            : 'bg-[#fafafa] text-black hover:bg-neutral-200'
                          }`}
                      >
                        {data.followedFounders.includes(founder.id) ? (
                          <span className="flex items-center gap-1.5">
                            <Check className="w-3 h-3" />
                            <span>Following</span>
                          </span>
                        ) : 'Follow'}
                      </Button>
                    </div>
                    <p className="text-xs text-neutral-400 mb-2 line-clamp-2">{founder.bio}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {founder.expertise.split(', ').slice(0, 2).map((expert: string, idx: number) => (
                        <span key={idx} className="text-[10px] bg-neutral-800/50 text-neutral-400 px-2 py-0.5 rounded-full border border-neutral-800">
                          {expert}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Button
                onClick={() => setCurrentStep(5)}
                disabled={data.followedFounders.length < 5}
                className="w-full h-11 bg-[#fafafa] hover:bg-neutral-200 text-black font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-8 py-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-[#fafafa] tracking-tight">Make Your Debut</h2>
              <p className="text-neutral-400">
                Share what you're working on with the founder network
              </p>
            </div>

            <SiftPostComposer
              user={{
                avatar: session?.user?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=currentuser',
                displayName: session?.user?.name || 'You',
                username: data.username || 'you'
              }}
              onSubmit={handlePostSubmit}
              onCancel={() => setCurrentStep(4)}
            />
          </div>
        );

      case 6:
        return (
          <div className="space-y-8 py-8 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="space-y-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-white/5">
                <span className="text-4xl">🎉</span>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-[#fafafa] tracking-tight">You're In!</h2>
                <p className="text-neutral-400 max-w-sm mx-auto">
                  Your founder control room is ready. Here's what we've set up for you:
                </p>
              </div>

              <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-xl p-6 text-left max-w-md mx-auto backdrop-blur-sm">
                <div className="space-y-4">
                  {[
                    `Scanned 200 emails & generated ${aiInsights.length} AI insights`,
                    `Set up your founder profile as @${data.username}`,
                    `Following ${data.followedFounders.length} top founders in your niche`,
                    `Posted your first execution update`,
                    `Generated your intelligent signal feed`
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${idx * 100}ms` }}>
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-green-500" />
                      </div>
                      <span className="text-sm text-neutral-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="w-full max-w-md h-12 bg-[#fafafa] hover:bg-neutral-200 text-black font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Launching...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>Enter Mailient Sift</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans" style={{ fontFamily: "'Satoshi', sans-serif" }}>
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8 max-w-md mx-auto">
          <div className="flex justify-between mb-3 px-1">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Onboarding</span>
            <span className="text-xs font-medium text-neutral-500">
              Step {currentStep} of 6
            </span>
          </div>
          <div className="w-full bg-neutral-900 rounded-full h-1">
            <div
              className="bg-[#fafafa] h-1 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(255,255,255,0.3)]"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-[#0a0a0a] border border-neutral-800/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-gradient-to-b from-neutral-800/10 to-transparent pointer-events-none" />

          <div className="relative z-10">
            {renderStep()}
          </div>
        </div>

        {/* Branding */}
        <div className="mt-8 text-center opacity-50 hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-center gap-2 text-xs text-neutral-600">
            <span>Powered by</span>
            <span className="text-neutral-400 font-semibold">Mailient Sift</span>
          </div>
        </div>
      </div>
    </div>
  );
}