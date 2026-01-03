/**
 * NextAuth configuration for Google OAuth with Gmail integration
 * Handles authentication, token storage, and session management
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DatabaseService } from "./supabase.js";
import { encrypt } from "./crypto.js";

// Environment validation
if (process.env.NEXT_PHASE !== 'phase-production-build' && process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error(`❌ AUTH ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// Google OAuth configuration
// NOTE: This app requests Gmail access which requires Google verification
// For development, add test users in Google Cloud Console OAuth consent screen
// For production, submit app for Google verification to remove security warnings
const googleProvider = Google({
  clientId: process.env.GOOGLE_CLIENT_ID || 'build-time-id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'build-time-secret',
  authorization: {
    params: {
      access_type: "offline", // Required for refresh tokens
      response_type: "code",  // Use authorization code flow
      prompt: "consent",      // CRITICAL: Force consent screen to always get fresh refresh token
      scope: "openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
    },
  },
  checks: ['pkce', 'state'], // Enhanced security checks
});

// Cookie configuration based on environment
const isProduction = process.env.NODE_ENV === 'production';
const cookiePrefix = isProduction ? '__Secure-' : '';

const cookieConfig = {
  sessionToken: {
    name: `${cookiePrefix}next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isProduction,
    }
  },
  callbackUrl: {
    name: `${cookiePrefix}next-auth.callback-url`,
    options: {
      sameSite: "lax",
      path: "/",
      secure: isProduction,
    }
  },
  csrfToken: {
    name: `${cookiePrefix}next-auth.csrf-token`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isProduction,
    }
  },
  pkceCodeVerifier: {
    name: `${cookiePrefix}next-auth.pkce.code_verifier`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isProduction,
      maxAge: 900, // 15 minutes
    }
  },
  state: {
    name: `${cookiePrefix}next-auth.state`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isProduction,
      maxAge: 900, // 15 minutes
    }
  }
};

/**
 * Persist user tokens and profile to database
 * @param {string} email - User email
 * @param {object} account - OAuth account data
 * @param {object} user - User profile data
 */
async function persistUserData(email, account, user) {
  const db = new DatabaseService();

  try {
    await Promise.all([
      db.storeUserTokens(email, {
        access_token: encrypt(account.access_token),
        refresh_token: encrypt(account.refresh_token),
        expires_in: account.expires_in,
        token_type: account.token_type,
        scopes: account.scope
      }),
      db.storeUserProfile(email, {
        email: user.email,
        name: user.name,
        picture: user.image
      })
    ]);

    console.log('✅ Auth DB storage complete for:', email);
  } catch (error) {
    console.error('❌ Auth DB storage error:', error.message);
    // Don't throw - auth should succeed even if DB fails
  }
}

// NextAuth configuration
console.log('🔐 NextAuth secret check:', {
  AUTH_SECRET: process.env.AUTH_SECRET ? 'set' : 'not set',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'not set',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set'
});

console.log('🔐 NextAuth config starting...');

let handlers, auth, signIn, signOut;

try {
  const result = NextAuth({
    providers: [googleProvider],

    session: {
      strategy: 'jwt', // Use JWT for session management
    },

    trustHost: true, // Required for localhost development

    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'build-time-secret-placeholder',

    callbacks: {
      /**
       * JWT callback - handle token storage and user data persistence
       */
      async jwt({ token, account, user }) {
        if (account && user?.email) {
          console.log('🚀 GOOGLE AUTH SUCCESS:', user.email);
          console.log('📋 Account data:', {
            provider: account.provider,
            type: account.type,
            access_token: account.access_token ? 'present' : 'missing',
            refresh_token: account.refresh_token ? 'present' : 'missing',
            expires_in: account.expires_in
          });

          // Store tokens in JWT
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;

          // Persist to database asynchronously
          persistUserData(user.email, account, user);
        }

        return token;
      },

      /**
       * Session callback - expose tokens to client session
       */
      async session({ session, token }) {
        if (token) {
          session.accessToken = token.accessToken;
          session.refreshToken = token.refreshToken;
        }
        return session;
      },
    },

    cookies: cookieConfig,
  });

  ({ handlers, auth, signIn, signOut } = result);
} catch (error) {
  console.error('❌ NextAuth config error:', error);
  throw error;
}

export { handlers, auth, signIn, signOut };