"use client";

import { useEffect, useState, Suspense } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../../components/ui/button';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info', fading: false });

  const callbackUrl = searchParams?.get('callbackUrl') || '/onboarding';

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type, fading: false });
  };

  // Auto dismiss toast after 5 seconds with fade-out
  useEffect(() => {
    if (toast.show && !toast.fading) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, fading: true }));
        setTimeout(() => {
          setToast({ show: false, message: '', type: 'info', fading: false });
        }, 300); // Wait for fade-out animation to complete
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.show, toast.fading]);

  // Handle fade-out animation completion
  useEffect(() => {
    if (toast.fading) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: 'info', fading: false });
      }, 300); // Wait for fade-out animation to complete
      return () => clearTimeout(timer);
    }
  }, [toast.fading]);

  useEffect(() => {
    // Check for URL errors
    const urlError = searchParams?.get('error');
    if (urlError) {
      switch (urlError) {
        case 'configuration':
          setError('Authentication configuration error. Please try again.');
          break;
        case 'pkce-retry':
          setError('Authentication temporarily failed. Please try signing in again.');
          break;
        case 'access-denied':
          setError('Access was denied. Please try again.');
          break;
        case 'verification':
          setError('Email verification failed. Please try again.');
          break;
        case 'oauth-failed':
          setError('OAuth authentication failed. Please try again.');
          break;
        default:
          setError('An authentication error occurred. Please try again.');
      }
    }

    // Check if user is already authenticated
    const checkSession = async () => {
      try {
        console.log('🔍 Checking session...');
        const session = await getSession();
        console.log('📋 Session result:', session ? 'Session found' : 'No session');
        if (session) {
          // Check onboarding status and redirect accordingly
          try {
            const response = await fetch('/api/onboarding/redirect');
            if (response.ok) {
              const data = await response.json();
              router.push(data.redirectTo);
            } else {
              router.push(callbackUrl);
            }
          } catch (error) {
            console.error('Error checking onboarding status:', error);
            router.push(callbackUrl);
          }
        }
      } catch (error) {
        console.error('❌ Error checking session:', error);
        console.error('Error details:', error.message, error.stack);
      }
    };
    checkSession();
  }, [router, callbackUrl, searchParams]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use NextAuth v5 signIn with redirect option
      // Always redirect to onboarding first - the onboarding flow handles
      // routing to home-feed if user already completed onboarding
      await signIn('google', {
        redirectTo: '/onboarding',
      });

      // Note: In NextAuth v5, signIn doesn't return a result when redirect is true
      // The redirect will happen automatically
    } catch (error) {
      console.error('Sign in error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleRetrySignIn = () => {
    setError(null);
    handleGoogleSignIn();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black dark:bg-black relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-30 animate-float" />

      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#404040]/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#404040]/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-[#171717]/40 backdrop-blur-xl border border-gray-600/30 rounded-2xl p-8 shadow-2xl animate-fade-in">

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
              {(error.includes('temporarily failed') || error.includes('configuration')) && (
                <button
                  onClick={handleRetrySignIn}
                  className="mt-2 text-red-200 hover:text-white text-sm underline"
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          {/* Brand Heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-100">
              Welcome Back
            </h1>
            <p className="text-gray-400 font-medium mt-2">
              Sign in to your intelligent workspace
            </p>
          </div>

          {/* Google Sign In Button */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full h-12 bg-white text-gray-900 hover:bg-gray-100 border border-gray-300 hover:border-gray-400 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg font-medium"
            size="lg"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-gray-600/30 border-t-gray-900 rounded-full animate-spin" />
            ) : (
              <>
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
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600/50" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#171717] text-gray-100">
                New to Mailient?
              </span>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => router.push('/auth/signup')}
              className="text-gray-100 hover:text-white transition-colors"
            >
              Create an account
            </Button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-4 left-4 z-50 ${toast.fading ? 'toast-fade-out' : 'animate-slide-in-bottom'}`}>
          <div className="
            max-w-sm w-full bg-black/90 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl p-4 
            transform transition-all duration-300 hover:scale-[1.02]
          ">
            <div className="flex flex-col space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-100" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-100">
                      {toast.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setToast(prev => ({ ...prev, fading: true }))}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-100 focus:outline-none transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
