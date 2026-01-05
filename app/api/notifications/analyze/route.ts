/**
 * AI-Powered Notifications Analysis API
 * Analyzes Gmail emails for: Threats/Spam, Verification Codes, Documents, and Replies
 * Uses OPENROUTER_API_KEY2 with a cost-effective but insightful model
 */

import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth.js';
import { GmailService } from '@/lib/gmail';
import { decrypt } from '@/lib/crypto.js';
import { DatabaseService } from '@/lib/supabase.js';

// Notification types
interface ThreatNotification {
    id: string;
    type: 'threat';
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    emailId: string;
    from: string;
    subject: string;
    indicators: string[];
    timestamp: string;
}

interface VerificationCodeNotification {
    id: string;
    type: 'verification';
    code: string;
    platform: string;
    description: string;
    emailId: string;
    expiresIn?: string;
    timestamp: string;
}

interface DocumentNotification {
    id: string;
    type: 'document';
    category: 'invoice' | 'payment' | 'receipt' | 'contract' | 'report' | 'other';
    title: string;
    description: string;
    emailId: string;
    attachments: {
        filename: string;
        mimeType: string;
        size: number;
        attachmentId: string;
    }[];
    from: string;
    isImportant: boolean;
    timestamp: string;
}

interface ReplyNotification {
    id: string;
    type: 'reply';
    title: string;
    description: string;
    emailId: string;
    threadId: string;
    from: string;
    subject: string;
    preview: string;
    timestamp: string;
}

type SmartNotification = ThreatNotification | VerificationCodeNotification | DocumentNotification | ReplyNotification;

// Using google/gemini-2.0-flash-exp:free for reliable notifications - NO FALLBACKS to prevent false content
const NOTIFICATIONS_MODEL = 'google/gemini-2.0-flash-exp:free';

export async function GET(request: Request) {
    try {
        console.log('🔔 Starting notifications analysis...');

        // Authenticate user
        // @ts-ignore
        const session = await (auth as any)();
        if (!session?.user?.email) {
            return NextResponse.json({
                success: false,
                error: 'Unauthorized',
                notifications: [],
                summary: { threats: 0, verificationCodes: 0, documents: 0, replies: 0 }
            }, { status: 401 });
        }

        const userEmail = session.user.email;
        let accessToken = (session as any)?.accessToken;
        let refreshToken = (session as any)?.refreshToken;

        console.log('🔐 Session tokens:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            accessTokenLength: accessToken?.length
        });

        // Fetch tokens from database if not in session OR if refresh token is missing
        const db = new DatabaseService();
        if (!accessToken || !refreshToken) {
            try {
                console.log('📦 Fetching tokens from database...');
                const userTokens = await db.getUserTokens(userEmail);
                console.log('📦 DB tokens result:', {
                    hasData: !!userTokens,
                    hasEncryptedAccess: !!userTokens?.encrypted_access_token,
                    hasEncryptedRefresh: !!userTokens?.encrypted_refresh_token
                });

                if (userTokens?.encrypted_access_token) {
                    // Check if encrypted (contains ':' separator from encryption)
                    if (!accessToken) {
                        if (userTokens.encrypted_access_token.includes(':')) {
                            accessToken = decrypt(userTokens.encrypted_access_token);
                        } else {
                            accessToken = userTokens.encrypted_access_token;
                        }
                    }

                    if (!refreshToken && userTokens.encrypted_refresh_token) {
                        if (userTokens.encrypted_refresh_token.includes(':')) {
                            refreshToken = decrypt(userTokens.encrypted_refresh_token);
                        } else {
                            refreshToken = userTokens.encrypted_refresh_token;
                        }
                    }
                }

                console.log('🔐 Final tokens:', {
                    hasAccessToken: !!accessToken,
                    hasRefreshToken: !!refreshToken
                });
            } catch (e) {
                console.error('Error fetching tokens from DB:', e);
            }
        }

        if (!accessToken) {
            return NextResponse.json({
                success: false,
                error: 'Gmail not connected',
                notifications: [],
                summary: { threats: 0, verificationCodes: 0, documents: 0, replies: 0 }
            }, { status: 401 });
        }

        // Initialize Gmail service
        const gmail = new GmailService(accessToken, refreshToken || '');
        gmail.setUserEmail(userEmail); // Enable token refresh persistence

        // Fetch recent emails (last 50 for analysis)
        console.log('📧 Fetching recent emails for notification analysis...');
        const emailsResponse = await gmail.getEmails(50, 'is:inbox newer_than:7d');

        if (!emailsResponse?.messages || emailsResponse.messages.length === 0) {
            console.log('📭 No recent emails found');
            return NextResponse.json({
                success: true,
                notifications: [],
                summary: {
                    threats: 0,
                    verificationCodes: 0,
                    documents: 0,
                    replies: 0
                },
                analyzedAt: new Date().toISOString()
            });
        }

        // Fetch email details in parallel (batch of 10 at a time)
        const messageIds = emailsResponse.messages.map((m: any) => m.id);
        const emailDetails: any[] = [];

        for (let i = 0; i < messageIds.length; i += 10) {
            const batch = messageIds.slice(i, i + 10);
            const batchDetails = await Promise.all(
                batch.map(async (id: string) => {
                    try {
                        const details = await gmail.getEmailDetails(id);
                        return gmail.parseEmailData(details);
                    } catch (e) {
                        console.warn(`Failed to fetch email ${id}:`, e);
                        return null;
                    }
                })
            );
            emailDetails.push(...batchDetails.filter(Boolean));

            // Small delay between batches
            if (i + 10 < messageIds.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        console.log(`📊 Fetched ${emailDetails.length} email details`);

        // Prepare email data for AI analysis
        const emailsForAnalysis = emailDetails.map((email, idx) => ({
            index: idx,
            id: email.id,
            threadId: email.threadId,
            from: email.from || '',
            subject: email.subject || '',
            snippet: email.snippet || '',
            body: (email.body || '').substring(0, 2000), // Increased body limit for deeper analysis
            hasAttachments: email.attachments && email.attachments.length > 0,
            attachments: email.attachments || [],
            labels: email.labels || [],
            date: email.date || '',
        }));

        // Perform AI analysis in batches of 10 to ensure accuracy and prevent hallucinations
        const BATCH_SIZE = 10;
        const notifications: SmartNotification[] = [];

        for (let i = 0; i < emailsForAnalysis.length; i += BATCH_SIZE) {
            const batch = emailsForAnalysis.slice(i, i + BATCH_SIZE);
            console.log(`🤖 Analyzing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(emailsForAnalysis.length / BATCH_SIZE)} (${batch.length} emails)...`);
            const batchNotifications = await analyzeEmailsWithAI(batch);
            notifications.push(...batchNotifications);
        }

        // Calculate summary
        const summary = {
            threats: notifications.filter(n => n.type === 'threat').length,
            verificationCodes: notifications.filter(n => n.type === 'verification').length,
            documents: notifications.filter(n => n.type === 'document').length,
            replies: notifications.filter(n => n.type === 'reply').length
        };

        console.log(`✅ Analysis complete: ${notifications.length} notifications generated`);
        console.log(`   - Threats: ${summary.threats}`);
        console.log(`   - Verification Codes: ${summary.verificationCodes}`);
        console.log(`   - Documents: ${summary.documents}`);
        console.log(`   - Replies: ${summary.replies}`);

        return NextResponse.json({
            success: true,
            notifications,
            summary,
            analyzedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Notifications analysis error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Check if it's an auth-related error
        const isAuthError = errorMessage.includes('authentication') ||
            errorMessage.includes('expired') ||
            errorMessage.includes('session') ||
            errorMessage.includes('Unauthorized');

        return NextResponse.json(
            {
                success: false,
                error: isAuthError ? 'Session expired - please re-authenticate' : errorMessage,
                authRequired: isAuthError,
                details: errorMessage,
                notifications: [],
                summary: { threats: 0, verificationCodes: 0, documents: 0, replies: 0 }
            },
            { status: isAuthError ? 401 : 500 }
        );
    }
}

/**
 * Analyze emails using AI to extract notifications
 */
async function analyzeEmailsWithAI(emails: any[]): Promise<SmartNotification[]> {
    // Use fallbacks for API key to ensure service availability
    const apiKey = (process.env.OPENROUTER_API_KEY2 || process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY3 || '').trim();

    if (!apiKey) {
        console.error('❌ OPENROUTER_API_KEY is not configured');
        throw new Error('AI provider is not configured. Missing OpenRouter API key (set OPENROUTER_API_KEY2 / OPENROUTER_API_KEY / OPENROUTER_API_KEY3).');
    }

    try {
        // Prepare detailed email data for AI
        const emailSummaries = emails.map((e, idx) => {
            const hasFiles = e.hasAttachments && e.attachments.length > 0;
            const fileList = hasFiles ? e.attachments.map((a: any) => a.filename).join(', ') : 'none';
            const isReply = e.subject.toLowerCase().startsWith('re:');

            // Use more content for deep analysis
            const content = e.body ? e.body.substring(0, 1500) : e.snippet;

            return `[${idx}] FROM: "${e.from}" | SUBJECT: "${e.subject}" | IS_REPLY: ${isReply} | HAS_FILES: ${hasFiles} | FILES: ${fileList} | CONTENT_PREVIEW: "${content.replace(/\s+/g, ' ')}"`;
        }).join('\n---\n');

        const prompt = `Act as a senior Cyber Security Intelligence Analyst. Analyze these emails and return a JSON object with 4 arrays. 

### CRITICAL INSTRUCTIONS:
1. **NO HALLUCINATIONS**: Use ONLY the information provided in the specific email. DO NOT use names, codes, or platforms from the examples provided in this prompt if they are not in the email.
2. **ACCURATE TITLES**: Create descriptive, real titles based on the sender or subject (e.g., "Invoice from Amazon", "Reply from John Doe").
3. **EXTREME RESTRICTIVENESS**: You MUST be extremely restrictive when flagging "threats". Only flag emails that are definitively malicious or highly suspicious. 
- **ABSOLUTELY DO NOT** flag newsletters, marketing, automated reports, or spam (junk mail) as "threats".
- **ABSOLUTELY DO NOT** flag account verifications or legitimate alerts from known brands (Google, Microsoft, Banks) unless you detect clear signs of phishing (wrong domains, bad links).
- **False Positives are unacceptable.** If you are even slightly unsure, do NOT flag it as a threat.
- Accuracy is paramount. Better to miss a low-risk spam than to flag legitimate mail as a threat.

EMAILS TO ANALYZE:
${emailSummaries}

CATEGORIES TO FIND:
1. "threats" - Only clear malicious activities:
   - Phishing: Impersonation of brands to steal passwords/billing.
   - Account Threats: "Account suspended", "Unusual login", "Verify immediately" with suspicious links.
   - Financial Scams: Crypto scams, lottery, inheritance, suspicious job offers.
   - Social Engineering: Direct requests for OTP, MFA codes, or sensitive documents.
   - Malware: Suspicious instructions to open attachments or download files.

2. "verificationCodes" - Emails with OTP/2FA codes. Extract the ACTUAL code from the email.
3. "documents" - Emails with legitimate attachments (invoices, receipts, contracts, reports).
4. "replies" - Actual email replies from humans (look for RE:, In-Reply-To context).

JSON OUTPUT FORMAT (STRICT):
{
  "threats": [
    {
      "index": [the index from the email list],
      "severity": "critical" | "high" | "medium" | "low",
      "title": "Precise Threat Title",
      "indicators": ["brand_impersonation", "suspicious_link", "urgency", "etc"],
      "description": "Deep security analysis explaining exactly why this is a threat and what the user should avoid."
    }
  ],
  "verificationCodes": [{"index": [index], "code": "[the actual code]", "platform": "[e.g. Google, Discord, etc]", "description": "e.g. Login verification code"}],
  "documents": [{"index": [index], "category": "invoice" | "payment" | "receipt" | "contract" | "report" | "other", "title": "[Descriptive Title]", "isImportant": true, "description": "Short description"}],
  "replies": [{"index": [index], "title": "[Descriptive Title]", "description": "[Summary of reply]"}]
}

NOTES:
- Use index [X] from the email data provided above.
- Ensure "title" and "description" are derived FROM THE EMAIL CONTENT.
- Return ONLY valid JSON. No markdown backticks. No extra text.`;

        console.log('🤖 Calling AI for notification analysis with google/gemini-2.0-flash-exp:free...');

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.HOST || 'https://mailient.xyz',
                'X-Title': 'Mailient Notifications'
            },
            body: JSON.stringify({
                model: NOTIFICATIONS_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional email categorization and security analysis AI. Accuracy is your top priority. Always respond with valid JSON only. Never include markdown code blocks or explanations. Be extremely skeptical and restrictive when identifying security threats.'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 3000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ AI API error:', response.status, errorText);
            throw new Error(`AI provider request failed (OpenRouter). HTTP ${response.status}: ${errorText || 'No response body'}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || '';

        if (!content) {
            console.error('❌ AI returned empty response');
            throw new Error('AI provider returned an empty response.');
        }

        console.log('📥 AI response received, parsing...');

        // Parse JSON response
        let parsed: any;
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (e) {
            console.error('❌ JSON parse error:', e);
            const message = e instanceof Error ? e.message : String(e);
            throw new Error(`AI provider returned an invalid JSON payload: ${message}`);
        }

        // Convert AI response to notification objects
        const notifications: SmartNotification[] = [];
        const now = new Date().toISOString();

        // Process threats
        if (parsed.threats && Array.isArray(parsed.threats)) {
            for (const threat of parsed.threats) {
                const email = emails[threat.index];
                if (!email) continue;

                notifications.push({
                    id: `threat-${email.id}`,
                    type: 'threat',
                    severity: threat.severity || 'medium',
                    title: threat.title || 'Suspicious Email Detected',
                    description: threat.description || 'This email shows signs of potential threat.',
                    emailId: email.id,
                    from: email.from,
                    subject: email.subject,
                    indicators: threat.indicators || [],
                    timestamp: email.date || now
                });
            }
        }

        // Process verification codes
        if (parsed.verificationCodes && Array.isArray(parsed.verificationCodes)) {
            for (const vc of parsed.verificationCodes) {
                const email = emails[vc.index];
                if (!email || !vc.code) continue;

                notifications.push({
                    id: `verification-${email.id}`,
                    type: 'verification',
                    code: String(vc.code),
                    platform: vc.platform || 'Unknown',
                    description: vc.description || 'Verification code received',
                    emailId: email.id,
                    expiresIn: vc.expiresIn,
                    timestamp: email.date || now
                });
            }
        }

        // Process documents
        if (parsed.documents && Array.isArray(parsed.documents)) {
            for (const doc of parsed.documents) {
                const email = emails[doc.index];
                if (!email) continue;

                notifications.push({
                    id: `document-${email.id}`,
                    type: 'document',
                    category: doc.category || 'other',
                    title: doc.title || 'Document Received',
                    description: doc.description || 'A document is attached to this email.',
                    emailId: email.id,
                    attachments: email.attachments || [],
                    from: email.from,
                    isImportant: doc.isImportant || false,
                    timestamp: email.date || now
                });
            }
        }

        // Process replies
        if (parsed.replies && Array.isArray(parsed.replies)) {
            for (const reply of parsed.replies) {
                const email = emails[reply.index];
                if (!email) continue;

                notifications.push({
                    id: `reply-${email.id}`,
                    type: 'reply',
                    title: reply.title || 'New Reply',
                    description: reply.description || 'You received a reply.',
                    emailId: email.id,
                    threadId: email.threadId,
                    from: email.from,
                    subject: email.subject,
                    preview: email.snippet,
                    timestamp: email.date || now
                });
            }
        }

        return notifications;

    } catch (error) {
        console.error('❌ AI analysis error:', error);
        throw error;
    }
}
