/**
 * Gmail Service for interacting with Gmail API
 * Handles authentication, rate limiting, and all Gmail operations
 */
export class GmailService {
  public accessToken: string;
  public refreshToken: string;
  private baseUrl: string;

  // Rate limiting and circuit breaker properties
  private consecutiveErrors: number = 0;
  private circuitBreakerOpen: boolean = false;
  private circuitBreakerUntil: number | null = null;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private rateLimitUntil: number | null = null;

  // Circuit breaker thresholds
  private readonly MAX_CONSECUTIVE_ERRORS: number = 3;
  private readonly CIRCUIT_BREAKER_TIMEOUT: number = 30000; // 30 seconds
  private readonly MIN_REQUEST_INTERVAL: number = 100; // Minimum 100ms between requests for better performance

  constructor(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken || '';
    this.baseUrl = 'https://www.googleapis.com/gmail/v1/users/me';
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(): boolean {
    if (this.circuitBreakerOpen && this.circuitBreakerUntil) {
      if (Date.now() < this.circuitBreakerUntil) {
        return true;
      } else {
        // Reset circuit breaker
        this.circuitBreakerOpen = false;
        this.circuitBreakerUntil = null;
        this.consecutiveErrors = 0;
      }
    }
    return false;
  }

  /**
   * Check if we're heavily rate limited
   */
  public isHeavyRateLimited(): boolean {
    return !!(this.rateLimitUntil && Date.now() < this.rateLimitUntil);
  }

  /**
   * Emergency reset for circuit breaker and rate limiting
   */
  public emergencyReset(): void {
    this.circuitBreakerOpen = false;
    this.circuitBreakerUntil = null;
    this.consecutiveErrors = 0;
    this.rateLimitUntil = null;
    this.requestCount = 0;
    this.lastRequestTime = 0;
    console.log('Emergency reset completed - all rate limiting and circuit breaker states cleared');
  }

  /**
   * Get current rate limiting status for debugging
   */
  public getRateLimitStatus(): any {
    return {
      isRateLimited: this.isHeavyRateLimited(),
      rateLimitUntil: this.rateLimitUntil ? new Date(this.rateLimitUntil).toISOString() : null,
      isCircuitBreakerOpen: this.isCircuitBreakerOpen(),
      circuitBreakerUntil: this.circuitBreakerUntil ? new Date(this.circuitBreakerUntil).toISOString() : null,
      consecutiveErrors: this.consecutiveErrors,
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime ? new Date(this.lastRequestTime).toISOString() : null,
    };
  }

  /**
   * Wait for rate limit to expire
   */
  public async waitForRateLimit(): Promise<void> {
    if (this.rateLimitUntil && Date.now() < this.rateLimitUntil) {
      const waitTime = this.rateLimitUntil - Date.now();
      console.log(`Rate limited, waiting ${Math.ceil(waitTime / 1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Determine if an operation is high frequency (needs rate limiting)
   */
  private determineOperationType(url: string): 'high_frequency' | 'low_frequency' {
    // High frequency operations that should be rate limited
    const highFreqPatterns = ['/messages', '/threads', '/labels'];
    // Low frequency operations that don't need strict rate limiting
    const lowFreqPatterns = ['/profile', '/attachments'];

    if (highFreqPatterns.some(pattern => url.includes(pattern))) {
      return 'high_frequency';
    }

    if (lowFreqPatterns.some(pattern => url.includes(pattern))) {
      return 'low_frequency';
    }

    // Default to high frequency for unknown operations
    return 'high_frequency';
  }

  /**
   * Enhanced token validation
   */
  private validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      console.error('❌ Invalid token: token is missing or not a string');
      return false;
    }

    if (token.length < 10) {
      console.error('❌ Invalid token: token is too short');
      return false;
    }

    if (!token.startsWith('ya29.') && !token.startsWith('1//')) {
      console.warn('⚠️ Token format may be invalid (does not start with expected pattern)');
      // Don't return false here, just warn - some valid tokens might have different formats
    }

    return true;
  }

  /**
   * Make authenticated request to Gmail API with enhanced error handling
   */
  private async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    // Enhanced circuit breaker check with automatic recovery
    if (this.isCircuitBreakerOpen()) {
      const timeLeft = this.circuitBreakerUntil! - Date.now();
      if (timeLeft <= 0) {
        // Reset if timeout has passed
        this.circuitBreakerOpen = false;
        this.circuitBreakerUntil = null;
        this.consecutiveErrors = 0;
        console.log('🔄 Circuit breaker auto-recovered');
      } else {
        throw new Error(`Circuit breaker is open for ${Math.ceil(timeLeft / 1000)} more seconds`);
      }
    }

    // Smart rate limiting - only apply for high-frequency operations
    const operationType = this.determineOperationType(url);
    if (operationType === 'high_frequency') {
      await this.waitForRateLimit();
    }

    // Simplified rate limiting - don't be too aggressive
    const now = Date.now();
    if (now - this.lastRequestTime < this.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        let retryTime: number;

        if (retryAfter) {
          const retryAfterNum = parseFloat(retryAfter);
          // If Retry-After is a small number, treat as seconds
          if (retryAfterNum < 300) {
            retryTime = Math.max(retryAfterNum * 1000, 5000); // At least 5 seconds
          } else {
            // Treat as Unix timestamp (seconds since epoch)
            retryTime = Math.max(retryAfterNum * 1000 - Date.now(), 5000);
          }
        } else {
          retryTime = 10000; // Default 10 seconds
        }

        this.rateLimitUntil = Date.now() + retryTime;
        console.log(`Rate limited for ${Math.ceil(retryTime / 1000)} seconds`);

        throw new Error(`Rate limit exceeded until ${new Date(this.rateLimitUntil).toISOString()}`);
      }

      // Handle token expiration
      if (response.status === 401) {
        console.log('DEBUG: Received 401 Unauthorized - Access token expired');
        console.log('DEBUG: Refresh token available:', !!this.refreshToken);
        console.log('DEBUG: Current access token length:', this.accessToken?.length || 0);

        // Try to refresh the token automatically
        if (this.refreshToken) {
          try {
            console.log('DEBUG: Attempting automatic token refresh...');
            const newAccessToken = await this.refreshAccessToken();
            console.log('DEBUG: Token refresh successful, retrying request...');

            // Retry the request with the new token
            const retryResponse = await fetch(url, {
              ...options,
              headers: {
                'Authorization': `Bearer ${newAccessToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
              },
            });

            // If retry succeeds, return the response
            if (retryResponse.ok) {
              console.log('DEBUG: Retry request successful');
              return retryResponse.json();
            } else {
              console.log('DEBUG: Retry request failed with status:', retryResponse.status);
              throw new Error(`Token refresh succeeded but retry failed: ${retryResponse.status} ${retryResponse.statusText}`);
            }
          } catch (refreshError) {
            console.error('DEBUG: Token refresh failed:', refreshError);
            throw new Error(`Access token expired and refresh failed: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`);
          }
        } else {
          console.error('❌ Gmail authentication failed: Access token expired and no refresh token available');
          console.info('💡 User needs to re-authenticate with Google to restore functionality');
          throw new Error('Google authentication required: Your session has expired. Please sign out and sign back in with Google to restore full functionality.');
        }
      }

      if (!response.ok) {
        // Don't count rate limiting as consecutive errors for circuit breaker
        if (response.status !== 429) {
          this.consecutiveErrors++;
          if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
            this.circuitBreakerOpen = true;
            this.circuitBreakerUntil = Date.now() + this.CIRCUIT_BREAKER_TIMEOUT;
            throw new Error(`Circuit breaker opened due to ${this.consecutiveErrors} consecutive errors`);
          }
        }
        throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
      }

      // Reset error count on success
      this.consecutiveErrors = 0;

      return response.json();

    } catch (error) {
      // If it's a network error, don't count it as a consecutive error
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
        console.log('Network error, not counting as consecutive error');
      } else {
        throw error;
      }
    }
  }

  /**
   * Enhanced refresh access token with comprehensive error handling and database persistence
   */
  private userEmail: string = '';

  /**
   * Set user email for token persistence
   */
  public setUserEmail(email: string): void {
    this.userEmail = email;
  }

  public async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available - user may need to re-authenticate');
    }

    // Validate refresh token
    if (!this.validateToken(this.refreshToken)) {
      throw new Error('Invalid refresh token format - user may need to re-authenticate');
    }

    console.log('🔄 Refreshing access token...');
    console.log('📋 Environment check:', {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      refreshTokenLength: this.refreshToken.length,
      userEmail: this.userEmail ? 'set' : 'not set'
    });

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      console.log('📡 Refresh response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Refresh token error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });

        // Provide user-friendly error messages
        if (response.status === 400) {
          throw new Error('Invalid refresh token - please sign out and sign back in with Google');
        } else if (response.status === 401) {
          throw new Error('Refresh token expired - please sign out and sign back in with Google');
        } else if (response.status === 403) {
          throw new Error('Google API access denied - please check your app permissions');
        } else {
          throw new Error(`Gmail token refresh failed (${response.status}): ${response.statusText}`);
        }
      }

      const data = await response.json();
      console.log('✅ Refresh token response received');

      if (!data.access_token) {
        console.error('❌ No access_token in refresh response:', data);
        throw new Error('Invalid refresh response - no access token received');
      }

      // Validate the new access token
      if (!this.validateToken(data.access_token)) {
        console.error('❌ New access token validation failed');
        throw new Error('Received invalid access token from refresh');
      }

      this.accessToken = data.access_token;
      console.log('✅ Access token refreshed successfully');

      // **CRITICAL: Persist the new token to the database**
      if (this.userEmail) {
        try {
          console.log('💾 Persisting refreshed token to database for:', this.userEmail);

          // Dynamic import to avoid circular dependency
          const { DatabaseService } = await import('./supabase.js');
          const { encrypt } = await import('./crypto.js');

          const db = new DatabaseService();
          await db.storeUserTokens(this.userEmail, {
            access_token: encrypt(data.access_token),
            refresh_token: encrypt(this.refreshToken), // Keep the same refresh token
            expires_in: data.expires_in || 3600, // Default 1 hour
            token_type: data.token_type || 'Bearer',
            scopes: data.scope || ''
          });

          console.log('✅ Refreshed token persisted to database');
        } catch (dbError) {
          console.warn('⚠️ Failed to persist refreshed token to database:', dbError);
          // Don't throw - token refresh was successful, DB persistence is optional
        }
      } else {
        console.warn('⚠️ User email not set - cannot persist refreshed token to database');
      }

      // Reset error counts on successful refresh
      this.consecutiveErrors = 0;
      this.circuitBreakerOpen = false;
      this.circuitBreakerUntil = null;

      return data.access_token;
    } catch (error) {
      console.error('💥 Token refresh failed:', error);

      // If it's a network error, provide a different message
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error during token refresh - please check your internet connection');
      }

      throw error;
    }
  }

  /**
   * Get user profile
   */
  public async getProfile(): Promise<any> {
    return this.makeRequest(`${this.baseUrl}/profile`);
  }

  /**
   * Get Gmail labels
   */
  public async getLabels(): Promise<any> {
    return this.makeRequest(`${this.baseUrl}/labels`);
  }

  /**
   * Get threads list
   */
  public async getThreads(maxResults: number = 200, query: string = '', pageToken?: string | null): Promise<any> {
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
    });

    if (query) params.append('q', query);
    if (pageToken) params.append('pageToken', pageToken);

    return this.makeRequest(`${this.baseUrl}/threads?${params}`);
  }

  /**
   * Get thread details
   */
  public async getThreadDetails(threadId: string): Promise<any> {
    return this.makeRequest(`${this.baseUrl}/threads/${threadId}?format=full`);
  }

  /**
   * Get emails/messages
   */
  public async getEmails(maxResults: number = 500, query: string = '', pageToken?: string | null, orderBy?: string): Promise<any> {
    const params = new URLSearchParams({
      maxResults: Math.min(maxResults, 500).toString(), // Gmail API max is 500
    });

    if (query) params.append('q', query);
    if (pageToken) params.append('pageToken', pageToken);
    if (orderBy) params.append('orderBy', orderBy);

    return this.makeRequest(`${this.baseUrl}/messages?${params}`);
  }

  /**
   * Get email details
   */
  public async getEmailDetails(messageId: string): Promise<any> {
    return this.makeRequest(`${this.baseUrl}/messages/${messageId}?format=full`);
  }

  /**
   * Parse email data for consistent format
   */
  public parseEmailData(messageDetails: any): any {
    const headers = messageDetails.payload?.headers || [];
    const getHeader = (name: string): string => headers.find((h: any) => h.name?.toLowerCase() === name?.toLowerCase())?.value || '';

    return {
      id: messageDetails.id,
      threadId: messageDetails.threadId,
      subject: getHeader('Subject'),
      from: getHeader('From'),
      to: getHeader('To'),
      date: getHeader('Date'),
      snippet: messageDetails.snippet,
      body: this.extractBody(messageDetails.payload),
      isHtml: this.isHtmlBody(messageDetails.payload),
      attachments: this.extractAttachments(messageDetails.payload),
      labels: messageDetails.labelIds || [],
      internalDate: messageDetails.internalDate,
      sizeEstimate: messageDetails.sizeEstimate,
    };
  }

  /**
   * Extract email body from payload
   */
  private extractBody(payload: any): string {
    if (!payload) return '';

    // If body is directly in payload
    if (payload.body?.data) {
      return this.decodeBase64(payload.body.data);
    }

    // If body is in parts (multipart message)
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.body?.data && part.mimeType === 'text/plain') {
          return this.decodeBase64(part.body.data);
        }
        if (part.mimeType === 'text/html' && part.body?.data) {
          return this.decodeBase64(part.body.data);
        }
        // Recursively check nested parts
        if (part.parts) {
          const nestedBody = this.extractBody(part);
          if (nestedBody) return nestedBody;
        }
      }
    }

    return '';
  }

  /**
   * Check if email body is HTML
   */
  private isHtmlBody(payload: any): boolean {
    if (!payload) return false;

    if (payload.mimeType === 'text/html') return true;

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html') return true;
        if (part.parts && this.isHtmlBody(part)) return true;
      }
    }

    return false;
  }

  /**
   * Decode base64 encoded string
   */
  private decodeBase64(data: string): string {
    try {
      return decodeURIComponent(escape(atob(data.replace(/-/g, '+').replace(/_/g, '/'))));
    } catch (error) {
      console.error('Error decoding base64:', error);
      return '';
    }
  }

  /**
   * Extract attachments metadata from payload
   */
  private extractAttachments(payload: any): Array<{ filename: string; mimeType: string; size: number; attachmentId: string; partId: string; }> {
    const attachments: Array<{ filename: string; mimeType: string; size: number; attachmentId: string; partId: string; }> = [];
    const walk = (part: any) => {
      if (!part) return;
      const filename = part.filename;
      if (filename && part.body && (part.body.attachmentId || part.body.data)) {
        attachments.push({
          filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: (part.body?.size as number) || 0,
          attachmentId: part.body.attachmentId || '',
          partId: part.partId || '',
        });
      }
      if (part.parts && Array.isArray(part.parts)) {
        part.parts.forEach(walk);
      }
    };
    walk(payload);
    return attachments;
  }

  /**
   * Fetch attachment data
   */
  public async getAttachment(messageId: string, attachmentId: string): Promise<{ data: string }> {
    return this.makeRequest(`${this.baseUrl}/messages/${messageId}/attachments/${attachmentId}`);
  }

  /**
   * Send email
   */
  public async sendEmail({ to, subject, body, isHtml = false }: { to: string; subject: string; body: string; isHtml?: boolean }): Promise<any> {
    const mimeMessage = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
      '',
      body,
    ].join('\r\n');

    const encodedMessage = Buffer.from(mimeMessage).toString('base64url');

    return this.makeRequest(`${this.baseUrl}/messages/send`, {
      method: 'POST',
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    });
  }

  /**
   * Add label to message
   */
  public async addLabel(messageId: string, labelId: string): Promise<any> {
    return this.makeRequest(`${this.baseUrl}/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        addLabelIds: [labelId],
      }),
    });
  }

  /**
   * Remove label from message
   */
  public async removeLabel(messageId: string, labelId: string): Promise<any> {
    return this.makeRequest(`${this.baseUrl}/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        removeLabelIds: [labelId],
      }),
    });
  }

  /**
   * Mark message as read (remove UNREAD label)
   */
  public async markAsRead(messageId: string): Promise<any> {
    return this.removeLabel(messageId, 'UNREAD');
  }

  /**
   * Delete email (move to trash)
   */
  public async deleteEmail(messageId: string): Promise<any> {
    return this.makeRequest(`${this.baseUrl}/messages/${messageId}/trash`, {
      method: 'POST',
    });
  }
}