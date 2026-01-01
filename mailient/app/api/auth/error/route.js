/**
 * Authentication error handler
 * Processes OAuth errors and redirects users to signin with appropriate error messages
 */

import { NextResponse } from 'next/server';

// Error type mappings for user-friendly messages
const ERROR_MAPPINGS = {
  Configuration: 'configuration',
  AccessDenied: 'access-denied',
  Verification: 'verification',
};

/**
 * Handle GET requests to the auth error endpoint
 * Redirects to signin page with appropriate error parameter
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get('error');

  console.log('🔥 Auth error occurred:', error);

  // Map error types to user-friendly parameters
  const errorParam = ERROR_MAPPINGS[error] || 'unknown';

  // Log specific error types
  switch (error) {
    case 'Configuration':
      console.error('❌ NextAuth configuration error');
      break;
    case 'AccessDenied':
      console.log('🚫 User denied access');
      break;
    case 'Verification':
      console.error('❌ Email verification failed');
      break;
    default:
      console.error('❓ Unknown auth error:', error);
  }

  // Redirect to signin with error parameter
  const signinUrl = new URL('/auth/signin', request.url);
  signinUrl.searchParams.set('error', errorParam);

  return NextResponse.redirect(signinUrl);
}