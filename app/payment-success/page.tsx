"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

function PaymentSuccessContent() {
    const router = useRouter();
    const [isActivating, setIsActivating] = useState(true);
    const [planName, setPlanName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [showRetryMessage, setShowRetryMessage] = useState(false);

    // Maximum retries and timing configuration
    const MAX_RETRIES = 15; // 15 retries x 2 seconds = 30 seconds max wait
    const RETRY_INTERVAL = 2000; // 2 seconds between retries
    const INITIAL_DELAY = 1500; // 1.5 seconds initial delay

    useEffect(() => {
        // Clear any stale localStorage data
        localStorage.removeItem('pending_plan');
        localStorage.removeItem('pending_plan_timestamp');
        localStorage.setItem('onboarding_completed', 'true');

        let currentRetry = 0;
        let timeoutId: NodeJS.Timeout;

        const checkSubscriptionStatus = async () => {
            try {
                console.log(`🔄 Checking subscription status (attempt ${currentRetry + 1}/${MAX_RETRIES})...`);

                // SECURITY FIX: Check subscription status from server
                // The Whop webhook should have already activated the subscription
                const response = await fetch('/api/subscription/status');

                if (!response.ok) {
                    throw new Error('Failed to check subscription status');
                }

                const data = await response.json();

                if (data.subscription?.hasActiveSubscription) {
                    // Great! Webhook activated the subscription
                    const plan = data.subscription.planType;
                    setPlanName(plan === 'pro' ? 'Pro' : 'Starter');
                    setIsActivating(false);

                    // Celebrate!
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#ffffff', '#a855f7', '#6366f1']
                    });

                    // Redirect to dashboard after 3 seconds
                    setTimeout(() => {
                        router.push('/home-feed');
                    }, 3000);
                } else {
                    // Subscription not yet active - webhook may be delayed
                    currentRetry++;
                    setRetryCount(currentRetry);

                    if (currentRetry >= MAX_RETRIES) {
                        // Max retries reached - show helpful message instead of error
                        console.log('⚠️ Max retries reached, showing retry options...');
                        setShowRetryMessage(true);
                        setIsActivating(false);
                    } else {
                        // Wait a bit and retry
                        console.log(`⏳ Subscription not yet active, retrying in ${RETRY_INTERVAL / 1000}s... (${currentRetry}/${MAX_RETRIES})`);
                        timeoutId = setTimeout(checkSubscriptionStatus, RETRY_INTERVAL);
                    }
                }

            } catch (err) {
                console.error('Error checking subscription status:', err);
                setError('There was an issue verifying your subscription. Please contact support if this persists.');
                setIsActivating(false);
            }
        };

        // Start checking after a brief delay to give webhook time to process
        timeoutId = setTimeout(checkSubscriptionStatus, INITIAL_DELAY);

        // Cleanup timeout on unmount
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [router]);

    // Handler to manually retry subscription check
    const handleManualRetry = () => {
        setShowRetryMessage(false);
        setIsActivating(true);
        setRetryCount(0);

        // Trigger a fresh check
        const checkAgain = async () => {
            try {
                const response = await fetch('/api/subscription/status');
                if (response.ok) {
                    const data = await response.json();
                    if (data.subscription?.hasActiveSubscription) {
                        const plan = data.subscription.planType;
                        setPlanName(plan === 'pro' ? 'Pro' : 'Starter');
                        setIsActivating(false);
                        confetti({
                            particleCount: 150,
                            spread: 70,
                            origin: { y: 0.6 },
                            colors: ['#ffffff', '#a855f7', '#6366f1']
                        });
                        setTimeout(() => router.push('/home-feed'), 3000);
                        return;
                    }
                }
                // Still not active, show message again
                setShowRetryMessage(true);
                setIsActivating(false);
            } catch (err) {
                setError('There was an issue verifying your subscription. Please contact support.');
                setIsActivating(false);
            }
        };

        setTimeout(checkAgain, 1000);
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 max-w-md w-full"
            >
                <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 text-center">
                    {isActivating ? (
                        <>
                            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Activating Your Plan</h1>
                            <p className="text-white/60 mb-4">Please wait while we verify your subscription...</p>
                            {retryCount > 0 && (
                                <div className="space-y-2">
                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-purple-500 transition-all duration-500"
                                            style={{ width: `${Math.min((retryCount / MAX_RETRIES) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-white/40 text-xs">Verifying payment... ({retryCount}/{MAX_RETRIES})</p>
                                </div>
                            )}
                        </>
                    ) : showRetryMessage ? (
                        <>
                            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                <span className="text-3xl">⏳</span>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Almost There!</h1>
                            <p className="text-white/60 mb-6">
                                Your payment was received, but our system is still processing it.
                                This can take a few moments. Please try again or contact support if this persists.
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={handleManualRetry}
                                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                                >
                                    <Loader2 className="w-4 h-4" />
                                    Try Again
                                </button>
                                <button
                                    onClick={() => router.push('/home-feed')}
                                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                                >
                                    Go to Dashboard Anyway
                                </button>
                                <p className="text-white/40 text-xs pt-2">
                                    Need help? Contact us at{' '}
                                    <a href="mailto:support@mailient.xyz" className="text-purple-400 hover:underline">
                                        support@mailient.xyz
                                    </a>
                                </p>
                            </div>
                        </>
                    ) : error ? (
                        <>
                            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                <span className="text-3xl">⚠️</span>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Oops!</h1>
                            <p className="text-white/60 mb-6">{error}</p>
                            <div className="space-y-3">
                                <button
                                    onClick={handleManualRetry}
                                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={() => router.push('/pricing')}
                                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                                >
                                    Go to Pricing
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.2 }}
                                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center"
                            >
                                <CheckCircle className="w-10 h-10 text-white" />
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-3xl font-bold text-white mb-2"
                            >
                                Welcome to {planName}! 🎉
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-white/60 mb-8"
                            >
                                Your subscription is now active. Enjoy all the {planName === 'Pro' ? 'unlimited' : 'premium'} features!
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="space-y-3"
                            >
                                {planName === 'Pro' ? (
                                    <div className="flex items-center justify-center gap-2 text-purple-400 text-sm">
                                        <Sparkles className="w-4 h-4" />
                                        <span>Unlimited access to all features</span>
                                    </div>
                                ) : (
                                    <div className="text-white/50 text-sm">
                                        30 Draft Replies • 30 Schedule Calls • 20 AI Notes/month
                                    </div>
                                )}

                                <button
                                    onClick={() => router.push('/home-feed')}
                                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all group"
                                >
                                    Go to Dashboard
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </button>

                                <p className="text-white/40 text-xs">Redirecting automatically in 3 seconds...</p>
                            </motion.div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white text-xl">
                Loading...
            </div>
        }>
            <PaymentSuccessContent />
        </Suspense>
    );
}

