/**
 * Gmail Service for interacting with Gmail API
 * Handles authentication, rate limiting, and all Gmail operations
 * JavaScript version for compatibility with JS route files
 */
class GmailService {
  constructor(accessToken, refreshToken = '') {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken || '';
    this.baseUrl = 'https://www.googleapis.com/gmail/v1/users/me';
    this.userEmail = null; // For token refresh persistence

    // Rate limiting and circuit breaker properties
    this.consecutiveErrors = 0;
    this.circuitBreakerOpen = false;
    this.circuitBreakerUntil = null;
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.rateLimitUntil = null;

    // Circuit breaker thresholds
    this.MAX_CONSECUTIVE_ERRORS = 3;
    this.CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds
    this.MIN_REQUEST_INTERVAL = 1000; // Minimum 1 second between requests
  }

  /**
   * Set user email for token refresh persistence
   */
  setUserEmail(email) {
    this.userEmail = email;
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitBreakerOpen() {
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
  isHeavyRateLimited() {
    return !!(this.rateLimitUntil && Date.now() < this.rateLimitUntil);
  }

  /**
   * Emergency reset for circuit breaker and rate limiting
   */
  emergencyReset() {
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
  getRateLimitStatus() {
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
  async waitForRateLimit() {
    if (this.rateLimitUntil && Date.now() < this.rateLimitUntil) {
      const waitTime = this.rateLimitUntil - Date.now();
      console.log(`Rate limited, waiting ${Math.ceil(waitTime / 1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Determine if an operation is high frequency (needs rate limiting)
   */
  determineOperationType(url) {
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
  validateToken(token) {
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
  async makeRequest(url, options = {}) {
    // Enhanced circuit breaker check with automatic recovery
    if (this.isCircuitBreakerOpen()) {
      const timeLeft = this.circuitBreakerUntil - Date.now();
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
        let retryTime;

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
          throw new Error('Access token expired and no refresh token available');
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
   * Enhanced refresh access token with comprehensive error handling
   */
  async refreshAccessToken() {
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
      refreshTokenLength: this.refreshToken.length
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
  async getProfile() {
    return this.makeRequest(`${this.baseUrl}/profile`);
  }

  /**
   * Get Gmail labels
   */
  async getLabels() {
    return this.makeRequest(`${this.baseUrl}/labels`);
  }

  /**
   * Get threads list
   */
  async getThreads(maxResults = 200, query = '', pageToken = null) {
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
  async getThreadDetails(threadId) {
    return this.makeRequest(`${this.baseUrl}/threads/${threadId}?format=full`);
  }

  /**
   * Get emails/messages
   */
  async getEmails(maxResults = 500, query = '', pageToken = null, orderBy = null) {
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
  async getEmailDetails(messageId) {
    return this.makeRequest(`${this.baseUrl}/messages/${messageId}?format=full`);
  }

  /**
   * Parse email data for consistent format
   */
  parseEmailData(messageDetails) {
    const headers = messageDetails.payload?.headers || [];
    const getHeader = (name) => headers.find((h) => h.name?.toLowerCase() === name?.toLowerCase())?.value || '';

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
  extractBody(payload) {
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
  isHtmlBody(payload) {
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
  decodeBase64(data) {
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
  extractAttachments(payload) {
    const attachments = [];
    const walk = (part) => {
      if (!part) return;
      const filename = part.filename;
      if (filename && part.body && (part.body.attachmentId || part.body.data)) {
        attachments.push({
          filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body?.size || 0,
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
  async getAttachment(messageId, attachmentId) {
    return this.makeRequest(`${this.baseUrl}/messages/${messageId}/attachments/${attachmentId}`);
  }

  /**
   * Create a draft email (visible in Gmail Drafts folder)
   */
  async createDraft({ to, subject, body, threadId = null, isHtml = false }) {
    const headers = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
    ];

    const mimeMessage = [
      ...headers,
      '',
      body,
    ].join('\r\n');

    const encodedMessage = Buffer.from(mimeMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const requestBody = {
      message: {
        raw: encodedMessage,
      },
    };
    if (threadId) requestBody.message.threadId = threadId;

    return this.makeRequest(`${this.baseUrl}/drafts`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Send email
   */
  /**
   * Send email (optionally as a reply in a thread)
   */
  async sendEmail({ to, subject, body, threadId = null, isHtml = false }) {
    const headers = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
    ];

    if (threadId) {
      try {
        // Fetch thread to get message-ids for threading headers
        const thread = await this.getThreadDetails(threadId);
        const lastMsg = thread.messages?.[thread.messages.length - 1];
        if (lastMsg) {
          const payloadHeaders = lastMsg.payload?.headers || [];
          const msgId = payloadHeaders.find(h => h.name?.toLowerCase() === 'message-id')?.value;
          if (msgId) {
            headers.push(`In-Reply-To: ${msgId}`);
            headers.push(`References: ${msgId}`);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch thread for headers, sending as standalone reply:', err);
      }
    }

    const mimeMessage = [
      ...headers,
      '',
      body,
    ].join('\r\n');

    const encodedMessage = Buffer.from(mimeMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const requestBody = {
      raw: encodedMessage,
    };
    if (threadId) requestBody.threadId = threadId;

    return this.makeRequest(`${this.baseUrl}/messages/send`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Add label to message
   */
  async addLabel(messageId, labelId) {
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
  async removeLabel(messageId, labelId) {
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
  async markAsRead(messageId) {
    return this.removeLabel(messageId, 'UNREAD');
  }

  /**
   * Delete email (move to trash)
   */
  async deleteEmail(messageId) {
    return this.makeRequest(`${this.baseUrl}/messages/${messageId}/trash`, {
      method: 'POST',
    });
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GmailService };
}

if (typeof exports !== 'undefined') {
  exports.GmailService = GmailService;
}