"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "../../../components/ui/button";

export default function GetStarted() {
  const router = useRouter();

  const handleGoogleSignUp = async () => {
    try {
      // Use NextAuth v5 signIn with redirect option
      await signIn('google', {
        redirectTo: '/onboarding',
      });

      // Note: In NextAuth v5, signIn doesn't return a result when redirect is true
      // The redirect will happen automatically
    } catch (error) {
      console.error('Sign up error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-30 animate-float" />

      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#383838]/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#383838]/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-[#242424]/20 backdrop-blur-xl border border-gray-700/30 rounded-2xl p-8 shadow-2xl animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-100 mb-2">
              Mailient
            </h1>
            <p className="text-gray-400 font-medium">
              Create your account and get started
            </p>
          </div>

          {/* Features list */}
          <div className="mb-8 space-y-3">
            {[
              "Access to all features",
              "Secure & encrypted data",
              "24/7 customer support",
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-gray-500/20 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-3 h-3 text-gray-100"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-gray-100">{feature}</span>
              </div>
            ))}
          </div>

          {/* Google Sign Up Button */}
          <Button
            onClick={handleGoogleSignUp}
            className="w-full h-12 bg-white text-gray-900 hover:bg-gray-100 border border-gray-300 hover:border-gray-400 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg font-medium"
            size="lg"
          >
            <svg
              className="w-5 h-5 mr-3"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Workspace Notice */}
          <div className="mt-5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7h-3a2 2 0 0 1-2-2V2" /><path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z" /><path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8" />
              </svg>
              <div>
                <p className="text-[11px] font-semibold text-gray-300 leading-relaxed">
                  Optimized for Google Workspace
                </p>
                <p className="text-[10px] text-gray-500 leading-relaxed mt-1">
                  Workspace accounts (<span className="text-gray-400">@yourcompany.com</span>) get seamless access when your admin trusts Mailient.
                  Personal <span className="text-gray-400">@gmail.com</span> accounts will see a Google verification step — click <span className="text-gray-400">"Advanced → Go to Mailient"</span> to continue safely.
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600/50" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-900 text-gray-100">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => router.push('/auth/signin')}
              className="text-gray-100 hover:text-white transition-colors"
            >
              Sign in instead
            </Button>
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-400 text-center mt-6 uppercase tracking-widest font-bold italic">
            By continuing, you agree to our{" "}
            <Link href="/terms-of-service" className="underline hover:text-white transition-colors">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className="underline hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}