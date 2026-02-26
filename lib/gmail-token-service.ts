/**
 * Comprehensive Gmail Token Service
 * Handles token storage, retrieval, and refresh for the entire app
 */

import { DatabaseService } from './supabase.js';
import { decrypt, encrypt } from './crypto.js';

// Type definitions
interface GmailTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string;
  tokenType?: string;
}

interface TokenResult {
  success: boolean;
  tokens?: GmailTokens;
  source?: 'database' | 'session';
  error?: string;
}

interface StoreResult {
  success: boolean;
  error?: string;
}

interface RefreshResult {
  success: boolean;
  tokens?: GmailTokens;
  error?: string;
}

interface ConnectionTestResult {
  success: boolean;
  email?: string;
  name?: string;
  error?: string;
}

interface TokenStoreData {
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number;
  token_type?: string;
  scopes?: string;
}

interface UserTokens {
  encrypted_access_token: string;
  encrypted_refresh_token?: string;
  access_token_expires_at?: string;
  token_type?: string;
}

interface Session {
  accessToken?: string;
  refreshToken?: string;
  user?: {
    email?: string | null;
  };
}

export class GmailTokenService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  /**
   * Get Gmail tokens with comprehensive fallback
   */
  async getGmailTokens(userId: string): Promise<TokenResult> {
    console.log('GmailTokenService: Getting tokens for user:', userId);

    try {
      // First try database tokens
      console.log('GmailTokenService: Checking database tokens...');
      const userTokens: UserTokens | null = await this.db.getUserTokens(userId);

      if (userTokens?.encrypted_access_token) {
        console.log('GmailTokenService: Found database tokens');
        try {
          const accessToken = decrypt(userTokens.encrypted_access_token);
          const refreshToken = userTokens.encrypted_refresh_token
            ? decrypt(userTokens.encrypted_refresh_token)
            : null;

          const tokens: GmailTokens = {
            accessToken,
            refreshToken,
            expiresAt: userTokens.access_token_expires_at,
            tokenType: userTokens.token_type
          };

          console.log('GmailTokenService: Database tokens decrypted successfully');
          return { success: true, tokens, source: 'database' };
        } catch (decryptError) {
          console.error('GmailTokenService: Failed to decrypt database tokens:', decryptError);
          // Continue to try session tokens
        }
      } else {
        console.log('GmailTokenService: No database tokens found');
      }

      // If database tokens fail or don't exist, try to get from session
      console.log('GmailTokenService: Checking session...');
      try {
        const { auth }: any = await import('./auth.js');
        const session: Session | null = await auth();

        if (session?.accessToken && session?.refreshToken) {
          console.log('GmailTokenService: Found session tokens');

          // Store session tokens in database for future use
          try {
            await this.db.storeUserTokens(userId, {
              access_token: encrypt(session.accessToken),
              refresh_token: encrypt(session.refreshToken),
              expires_in: 3600, // Assume 1 hour
              token_type: 'Bearer',
              scopes: 'gmail.readonly gmail.send'
            });
            console.log('GmailTokenService: Session tokens stored in database');
          } catch (storeError) {
            console.warn('GmailTokenService: Failed to store session tokens:', storeError);
          }

          return {
            success: true,
            tokens: {
              accessToken: session.accessToken,
              refreshToken: session.refreshToken,
              expiresAt: new Date(Date.now() + 3600000).toISOString(), // Assume 1 hour
              tokenType: 'Bearer'
            },
            source: 'session'
          };
        } else {
          console.log('GmailTokenService: No session tokens found');
        }
      } catch (importError) {
        console.warn('GmailTokenService: Could not import auth module:', importError);
      }

      // No tokens found anywhere
      return {
        success: false,
        error: 'No Gmail tokens found. Please sign in with Google to connect your Gmail account.'
      };

    } catch (error) {
      console.error('GmailTokenService: Error getting tokens:', error);
      return {
        success: false,
        error: `Failed to retrieve Gmail tokens: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Store Gmail tokens securely
   */
  async storeGmailTokens(userId: string, tokens: GmailTokens): Promise<StoreResult> {
    console.log('GmailTokenService: Storing tokens for user:', userId);

    try {
      const tokenStoreData: TokenStoreData = {
        access_token: encrypt(tokens.accessToken),
        refresh_token: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        expires_in: this.calculateExpiresIn(tokens.expiresAt),
        token_type: tokens.tokenType || 'Bearer',
        scopes: 'gmail.readonly gmail.send'
      };

      const result = await this.db.storeUserTokens(userId, tokenStoreData);

      if (result !== null) {
        console.log('GmailTokenService: Tokens stored successfully');
        return { success: true };
      } else {
        console.log('GmailTokenService: Token storage failed or table missing');
        return { success: false, error: 'Failed to store tokens in database' };
      }
    } catch (error) {
      console.error('GmailTokenService: Error storing tokens:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Refresh Gmail access token
   */
  async refreshGmailTokens(userId: string, refreshToken: string): Promise<RefreshResult> {
    console.log('GmailTokenService: Refreshing tokens for user:', userId);

    try {
      const { GmailService } = await import('./gmail');
      const gmailService = new GmailService('', refreshToken);

      const newAccessToken = await gmailService.refreshAccessToken();

      if (newAccessToken) {
        // Store new tokens
        const result = await this.storeGmailTokens(userId, {
          accessToken: newAccessToken,
          refreshToken: refreshToken,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          tokenType: 'Bearer'
        });

        if (result.success) {
          console.log('GmailTokenService: Tokens refreshed successfully');
          return {
            success: true,
            tokens: {
              accessToken: newAccessToken,
              refreshToken: refreshToken,
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
              tokenType: 'Bearer'
            }
          };
        }
      }

      return { success: false, error: 'Failed to refresh tokens' };

    } catch (error) {
      console.error('GmailTokenService: Error refreshing tokens:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Check if tokens are expired
   */
  isTokenExpired(expiresAt?: string | null): boolean {
    if (!expiresAt) return true;

    const now = new Date();
    const expiry = new Date(expiresAt);

    // Consider token expired if it expires within 5 minutes
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    return expiry <= fiveMinutesFromNow;
  }

  /**
   * Calculate expiry in seconds from expiresAt date
   */
  calculateExpiresIn(expiresAt?: string | null): number {
    if (!expiresAt) return 3600; // Default 1 hour

    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();

    return Math.max(0, Math.floor(diffMs / 1000));
  }

  /**
   * Test Gmail connection
   */
  async testGmailConnection(userId: string): Promise<ConnectionTestResult> {
    console.log('GmailTokenService: Testing Gmail connection for user:', userId);

    try {
      const tokenResult = await this.getGmailTokens(userId);

      if (!tokenResult.success || !tokenResult.tokens) {
        return { success: false, error: tokenResult.error || 'No tokens available' };
      }

      const accessToken = tokenResult.tokens.accessToken;
      const { GmailService } = await import('./gmail');
      const gmailService = new GmailService(accessToken);

      // Try to get user profile as a test
      const profile = await gmailService.getProfile();

      if (profile?.emailAddress) {
        console.log('GmailTokenService: Gmail connection successful');
        return {
          success: true,
          email: profile.emailAddress,
          name: profile.name
        };
      } else {
        return { success: false, error: 'Invalid Gmail response' };
      }

    } catch (error) {
      console.error('GmailTokenService: Gmail connection test failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}