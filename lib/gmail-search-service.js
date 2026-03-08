/**
 * Gmail Search Service
 * Extends Gmail functionality with advanced search capabilities
 */

/**
 * @typedef {Object} GmailSearchFilters
 * @property {string} [query] - General search query
 * @property {string} [from] - Filter by sender
 * @property {string} [to] - Filter by recipient
 * @property {string} [subject] - Filter by subject
 * @property {string} [after] - Filter emails after date (YYYY/MM/DD)
 * @property {string} [before] - Filter emails before date (YYYY/MM/DD)
 * @property {boolean} [hasAttachment] - Filter emails with attachments
 * @property {boolean} [isUnread] - Filter unread emails
 * @property {boolean} [isStarred] - Filter starred emails
 * @property {string[]} [labels] - Filter by label IDs
 * @property {string} [in] - Filter by mailbox (inbox, sent, trash, etc.)
 */

class GmailSearchService {
    constructor(accessToken, refreshToken = '') {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken || '';
        this.baseUrl = 'https://www.googleapis.com/gmail/v1/users/me';
    }

    /**
     * Make authenticated request to Gmail API
     */
    async makeRequest(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (response.status === 401 && this.refreshToken) {
            // Try to refresh token
            const newToken = await this.refreshAccessToken();
            if (newToken) {
                // Retry with new token
                return this.makeRequest(url, options);
            }
        }

        if (!response.ok) {
            throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Refresh the access token
     */
    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

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

        if (!response.ok) {
            throw new Error('Failed to refresh access token');
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        return data.access_token;
    }

    /**
     * Build Gmail search query from filters
     * @param {GmailSearchFilters} filters
     * @returns {string}
     */
    buildSearchQuery(filters) {
        if (!filters) return '';

        const queryParts = [];

        if (filters.query) {
            queryParts.push(filters.query);
        }

        if (filters.from) {
            queryParts.push(`from:${filters.from}`);
        }

        if (filters.to) {
            queryParts.push(`to:${filters.to}`);
        }

        if (filters.subject) {
            queryParts.push(`subject:${filters.subject}`);
        }

        if (filters.after) {
            queryParts.push(`after:${filters.after}`);
        }

        if (filters.before) {
            queryParts.push(`before:${filters.before}`);
        }

        if (filters.hasAttachment) {
            queryParts.push('has:attachment');
        }

        if (filters.isUnread) {
            queryParts.push('is:unread');
        }

        if (filters.isStarred) {
            queryParts.push('is:starred');
        }

        if (filters.in) {
            queryParts.push(`in:${filters.in}`);
        }

        if (filters.labels && filters.labels.length > 0) {
            filters.labels.forEach(label => {
                queryParts.push(`label:${label}`);
            });
        }

        return queryParts.join(' ');
    }

    /**
     * Search emails with filters
     * @param {GmailSearchFilters} filters - Search filters
     * @param {number} maxResults - Maximum number of results
     * @param {string|null} pageToken - Pagination token
     * @returns {Promise<{messages: Array, nextPageToken: string|null, resultSizeEstimate: number}>}
     */
    async searchEmails(filters, maxResults = 100, pageToken = null) {
        const query = this.buildSearchQuery(filters);

        const params = new URLSearchParams({
            maxResults: Math.min(maxResults, 500).toString(),
        });

        if (query) {
            params.append('q', query);
        }

        if (pageToken) {
            params.append('pageToken', pageToken);
        }

        console.log('Gmail Search Query:', query);
        console.log('Gmail Search Params:', params.toString());

        // Get list of message IDs
        const listResult = await this.makeRequest(`${this.baseUrl}/messages?${params}`);

        if (!listResult.messages || listResult.messages.length === 0) {
            return {
                messages: [],
                nextPageToken: null,
                resultSizeEstimate: 0
            };
        }

        // Fetch full details for each message
        const messagePromises = listResult.messages.map(async (msg) => {
            try {
                const details = await this.makeRequest(`${this.baseUrl}/messages/${msg.id}?format=full`);
                return this.parseEmailData(details);
            } catch (error) {
                console.error(`Error fetching message ${msg.id}:`, error);
                return null;
            }
        });

        const messages = (await Promise.all(messagePromises)).filter(Boolean);

        return {
            messages,
            nextPageToken: listResult.nextPageToken || null,
            resultSizeEstimate: listResult.resultSizeEstimate || messages.length
        };
    }

    /**
     * Get all Gmail labels
     * @returns {Promise<Array>}
     */
    async getAllLabels() {
        const result = await this.makeRequest(`${this.baseUrl}/labels`);
        return result.labels || [];
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

        if (payload.body?.data) {
            return this.decodeBase64(payload.body.data);
        }

        if (payload.parts) {
            for (const part of payload.parts) {
                if (part.body?.data && part.mimeType === 'text/plain') {
                    return this.decodeBase64(part.body.data);
                }
                if (part.mimeType === 'text/html' && part.body?.data) {
                    return this.decodeBase64(part.body.data);
                }
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
}

// Export for ES modules
export { GmailSearchService };

// Also export a type definition for GmailSearchFilters (for JSDoc usage)
/**
 * @type {GmailSearchFilters}
 */
export const GmailSearchFilters = {};
