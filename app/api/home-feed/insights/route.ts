import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';
import { decrypt } from '@/lib/crypto.js';
import { GmailService } from '@/lib/gmail';
import { AIConfig } from '@/lib/ai-config.js';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service';
import crypto from 'crypto';

export const maxDuration = 60; // Increase to 60s for deep AI analysis

interface EmailDetail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  body: string;
  timestamp: string;
  hash?: string; // Content hash for caching
}

interface EnrichedEmail {
  id: string;
  subject: string;
  snippet: string;
  sender: {
    name: string;
    email: string;
  };
  receivedAt: string;
}

interface CachedInsight {
  emailHash: string;
  category: string;
  title: string;
  content: string;
  priority: string;
  timestamp: number;
}

// Store for cumulative email data across requests (in-memory, per-deployment)
const cumulativeEmailStore = new Map<string, { emailIds: string[]; timestamp: number }>();

// Cache for AI analysis results - keyed by email hash
const analysisCache = new Map<string, CachedInsight>();

// Concurrency limit for parallel operations
const CONCURRENCY_LIMIT = 20;

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  for (const [key, value] of cumulativeEmailStore.entries()) {
    if (now - value.timestamp > ONE_HOUR) {
      cumulativeEmailStore.delete(key);
    }
  }
  // Also clean old cache entries (keep for 30 minutes)
  for (const [key, value] of analysisCache.entries()) {
    if (now - value.timestamp > 30 * 60 * 1000) {
      analysisCache.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Helper: Create hash of email content
function createEmailHash(email: EmailDetail): string {
  const content = `${email.from}|${email.subject}|${email.snippet}|${email.body?.slice(0, 200)}`;
  return crypto.createHash('md5').update(content).digest('hex');
}

// Helper: Process array with concurrency limit
// Helper: Process array with concurrency limit
async function processWithConcurrency<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const pool = new Set<Promise<void>>();
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const promise = (async (index: number) => {
      results[index] = await processor(item);
    })(i);
    
    pool.add(promise);
    promise.finally(() => pool.delete(promise));
    
    if (pool.size >= limit) {
      await Promise.race(pool);
    }
  }
  
  await Promise.all(pool);
  return results;
}

export async function GET(request: Request) {
  try {
    // @ts-ignore
    const session = await (auth as any)();
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        insights: [],
        sift_intelligence_summary: {
          opportunities_detected: 0,
          urgent_action_required: 0,
          hot_leads_heating_up: 0,
          conversations_at_risk: 0,
          missed_follow_ups: 0,
          unread_but_important: 0
        }
      });
    }

    const userEmail = session.user.email;

    // Check subscription and feature usage for Sift AI (5/day for Starter)
    const canUse = await subscriptionService.canUseFeature(userEmail, FEATURE_TYPES.SIFT_ANALYSIS);
    if (!canUse) {
      const usage = await subscriptionService.getFeatureUsage(userEmail, FEATURE_TYPES.SIFT_ANALYSIS);
      return NextResponse.json({
        success: false,
        error: 'limit_reached',
        message: `Sorry, but you've exhausted all the credits of ${usage.period === 'daily' ? 'the day' : 'the month'}.`,
        usage: usage.usage,
        limit: usage.limit,
        upgradeUrl: '/pricing',
        insights: [],
        sift_intelligence_summary: {
          opportunities_detected: 0,
          urgent_action_required: 0,
          hot_leads_heating_up: 0,
          conversations_at_risk: 0,
          missed_follow_ups: 0,
          unread_but_important: 0
        }
      }, { status: 403 });
    }

    let accessToken = (session as any)?.accessToken;
    let refreshToken = (session as any)?.refreshToken;

    const db = new DatabaseService();
    let privacyMode = false;
    try {
      const profile = await db.getUserProfile(userEmail);
      if (profile?.preferences?.ai_privacy_mode === 'enabled') {
        privacyMode = true;
        console.log('🛡️ AI Privacy Mode is ENABLED for this request.');
      }
    } catch (e) {
      console.warn('Error fetching profile for privacy check:', e);
    }

    // Fetch tokens from database if not in session
    if (!accessToken) {
      try {
        const userTokens = await db.getUserTokens(userEmail);
        if (userTokens?.encrypted_access_token) {
          accessToken = decrypt(userTokens.encrypted_access_token);
          refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';
        }
      } catch (e) {
        console.error('Error fetching tokens from DB:', e);
      }
    }

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Gmail not connected',
        insights: [],
        sift_intelligence_summary: {
          opportunities_detected: 0,
          urgent_action_required: 0,
          hot_leads_heating_up: 0,
          conversations_at_risk: 0,
          missed_follow_ups: 0,
          unread_but_important: 0
        }
      });
    }

    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get('pageToken') as string | null;
    const isLoadMore = searchParams.get('loadMore') === 'true';

    const gmailService = new GmailService(accessToken, refreshToken || '');
    gmailService.setUserEmail(userEmail); // Enable token refresh persistence

    console.log('📧 Fetching emails for analysis...', { isLoadMore, pageToken });

    // Get previously stored email IDs for this user
    const storeKey = `sift_${userEmail}`;
    const storedData = cumulativeEmailStore.get(storeKey);
    let previousEmailIds: string[] = [];
    
    if (isLoadMore && storedData) {
      previousEmailIds = storedData.emailIds;
      console.log(`📧 Load more: ${previousEmailIds.length} previous emails in store`);
    } else if (!isLoadMore) {
      // Clear store on fresh load
      cumulativeEmailStore.delete(storeKey);
    }

    // Phase 1: Fetch recent emails for analysis - Targeting 50 emails for comprehensive Sift intelligence
    const recentEmails = await gmailService.getEmails(50, 'in:inbox newer_than:60d', pageToken as any);
    const allMessages = recentEmails.messages || [];
    const nextPageToken = recentEmails.nextPageToken;

    // Get new email IDs (fixed to 50)
    const newEmailIds: string[] = allMessages.slice(0, 50).map((m: any) => m.id);
    
    // Combine with previous emails (for load more) and deduplicate
    const combinedIds = [...new Set([...previousEmailIds, ...newEmailIds])];
    
    console.log(`📧 Total emails to analyze: ${combinedIds.length} (${previousEmailIds.length} previous + ${newEmailIds.length} new)`);

    // Update store with cumulative email IDs
    cumulativeEmailStore.set(storeKey, { 
      emailIds: combinedIds, 
      timestamp: Date.now() 
    });

    // Use combined IDs for analysis (Fixed 50 limit for maximum depth as requested)
    const uniqueIds = combinedIds.slice(0, 50);

    console.log(`📬 Fetching details for ${uniqueIds.length} emails in parallel...`);
    const gmailStartTime = Date.now();

    // Fetch all email details in parallel with concurrency limit
    const emailDetails = await processWithConcurrency(
      uniqueIds,
      async (id: string): Promise<EmailDetail | null> => {
        try {
          // OPTIMIZATION: Use 'metadata' format to get headers and snippets without heavy bodies
          const details = await gmailService.getEmailDetails(id, 'metadata');
          const parsed = gmailService.parseEmailData(details);
          const email: EmailDetail = {
            id: parsed.id,
            from: parsed.from || '',
            subject: parsed.subject || '(No Subject)',
            snippet: parsed.snippet || '',
            body: (parsed.body || '').substring(0, 400),
            timestamp: parsed.date || new Date().toISOString()
          };
          email.hash = createEmailHash(email);
          return email;
        } catch (e) {
          console.error(`Failed to fetch email ${id}:`, e);
          return null;
        }
      },
      15 // Lowered concurrency to avoid Google API throttling and connection drops
    );

    const gmailDuration = (Date.now() - gmailStartTime) / 1000;
    const filteredEmails = emailDetails.filter((d): d is EmailDetail => d !== null);

    console.log(`✅ Fetched ${filteredEmails.length} emails in ${gmailDuration.toFixed(2)}s`);

    if (filteredEmails.length === 0) {
      return NextResponse.json({
        success: true,
        insights: [],
        sift_intelligence_summary: {
          opportunities_detected: 0,
          urgent_action_required: 0,
          hot_leads_heating_up: 0,
          conversations_at_risk: 0,
          missed_follow_ups: 0,
          unread_but_important: 0
        },
        timestamp: new Date().toISOString(),
        userEmail
      });
    }

    // Create email lookup map for fast access
    const emailMap = new Map<string, EmailDetail>();
    filteredEmails.forEach(email => emailMap.set(email.id, email));

    // Separate emails into cached and uncached
    const uncachedEmails: EmailDetail[] = [];
    const cachedInsights: Map<string, CachedInsight> = new Map();
    
    for (const email of filteredEmails) {
      if (email.hash && analysisCache.has(email.hash)) {
        cachedInsights.set(email.id, analysisCache.get(email.hash)!);
      } else {
        uncachedEmails.push(email);
      }
    }
    
    console.log(`📊 Cache status: ${cachedInsights.size} cached, ${uncachedEmails.length} new emails to analyze`);

    // Initialize AI service
    const aiConfig = new AIConfig();
    const aiService = aiConfig.getService();
    if (!aiService) {
      throw new Error('AI Service not available');
    }

    // Combine cached and new insights
    let rawInsights: any[] = [];
    
    // Convert cached insights to expected format
    for (const [emailId, cached] of cachedInsights) {
      rawInsights.push({
        id: `cached-${emailId}`,
        type: cached.category,
        title: cached.title,
        content: cached.content,
        metadata: {
          category: cached.category,
          priority: cached.priority,
          emails_involved: [emailId]
        }
      });
    }
    
    // Analyze only uncached emails (much faster!)
    if (uncachedEmails.length > 0) {
      console.log(`🤖 Analyzing ${uncachedEmails.length} new emails with AI...`);
      const startTime = Date.now();
      
      const aiStartTime = Date.now();
      const aiData = await aiService.generateInboxIntelligence(uncachedEmails, privacyMode);
      const aiDuration = (Date.now() - aiStartTime) / 1000;
      console.log(`🤖 AI Analysis completed in ${aiDuration.toFixed(2)}s for ${uncachedEmails.length} emails`);
      
      // Robust mapping: handle both flat array and category-keyed dictionary responses
      const newInsights: any[] = [];
      if (aiData.inbox_intelligence) {
        newInsights.push(...aiData.inbox_intelligence);
      } else {
        const categories = ['opportunity', 'urgent', 'lead', 'risk', 'follow_up', 'important'];
        categories.forEach(cat => {
          const categoryData = (aiData as any)[cat];
          if (categoryData && categoryData.ids && categoryData.ids.length > 0) {
            newInsights.push({
              type: cat,
              title: categoryData.title || cat,
              content: categoryData.summary || '',
              metadata: {
                category: cat,
                priority: (categoryData.relevance || 0) >= 8 ? 'high' : 'medium',
                emails_involved: categoryData.ids
              }
            });
          }
        });
      }
      
      // Cache new insights by email hash
      for (const insight of newInsights) {
        const involvedIds: string[] = insight.metadata?.emails_involved || [];
        for (const emailId of involvedIds) {
          const email = emailMap.get(emailId);
          if (email?.hash) {
            analysisCache.set(email.hash, {
              emailHash: email.hash,
              category: insight.metadata?.category || 'important',
              title: insight.title || 'Insight',
              content: insight.content || '',
              priority: insight.metadata?.priority || 'medium',
              timestamp: Date.now()
            });
          }
        }
      }
      
      rawInsights = [...rawInsights, ...newInsights];
      console.log(`✅ AI analysis completed in ${Date.now() - startTime}ms, generated ${newInsights.length} new insights`);
    } else {
      console.log('✅ All emails cached - instant response!');
    }
    
    // Calculate stats from all insights by counting involved emails
    const getEmailCount = (category: string) => {
      const insights = rawInsights.filter(i => i.metadata?.category === category);
      return insights.reduce((total, insight) => total + (insight.metadata?.emails_involved?.length || 0), 0);
    };

    const stats = {
      opportunities_detected: getEmailCount('opportunity'),
      urgent_action_required: getEmailCount('urgent'),
      hot_leads_heating_up: getEmailCount('lead'),
      conversations_at_risk: getEmailCount('risk'),
      missed_follow_ups: getEmailCount('follow_up'),
      unread_but_important: getEmailCount('important')
    };

    // Helper function to parse sender from "From" header
    const parseSender = (fromHeader: string): { name: string; email: string } => {
      const match = fromHeader.match(/^(.+?)\s*<(.+)>$/);
      if (match) {
        return { name: match[1].trim().replace(/"/g, ''), email: match[2].trim() };
      }
      // If no angle brackets, treat entire string as email
      return { name: fromHeader.split('@')[0] || 'Unknown', email: fromHeader };
    };

    // Enrich insights with real email data
    const enrichedInsights = rawInsights.map((insight: any, idx: number) => {
      const category = insight.metadata?.category || insight.type || 'important';
      const involvedIds: string[] = insight.metadata?.emails_involved || [];

      // Find matching emails - either by ID or by best effort matching
      let enrichedEmails: EnrichedEmail[] = [];

      if (involvedIds.length > 0) {
        // Try to match by provided IDs
        enrichedEmails = involvedIds
          .map((id: string) => {
            const email = emailMap.get(id);
            if (email) {
              const sender = parseSender(email.from);
              return {
                id: email.id,
                subject: email.subject,
                snippet: email.snippet,
                sender,
                receivedAt: email.timestamp
              };
            }
            return null;
          })
          .filter((e): e is EnrichedEmail => e !== null);
      }

      // If no emails found by ID, we do not assign random emails anymore.
      // This ensures that only AI-verified emails are shown in insights.
      if (enrichedEmails.length === 0) {
        // Leave empty
      }

      // Determine card type for frontend styling
      let cardType = 'inbox-intelligence';
      switch (category) {
        case 'opportunity': cardType = 'opportunity'; break;
        case 'urgent': cardType = 'urgent-action'; break;
        case 'lead': cardType = 'hot-leads'; break;
        case 'risk': cardType = 'at-risk'; break;
        case 'follow_up': cardType = 'missed-followups'; break;
        case 'important': cardType = 'unread-important'; break;
      }

      // Create structured metadata with source emails for each category
      const createCategoryEmails = (cat: string) => cat === category ? enrichedEmails : [];

      return {
        id: insight.id || `insight-${Date.now()}-${idx}`,
        type: cardType,
        title: insight.title || 'Insight',
        content: insight.content || '',
        timestamp: insight.timestamp || new Date().toISOString(),
        metadata: {
          category,
          priority: insight.metadata?.priority || 'medium',
          source: 'sift-ai',
          emails_involved: enrichedEmails.map(e => e.id),
          opportunityDetails: createCategoryEmails('opportunity'),
          urgentItems: createCategoryEmails('urgent'),
          hotLeads: createCategoryEmails('lead'),
          atRiskConversations: createCategoryEmails('risk'),
          missedFollowUps: createCategoryEmails('follow_up'),
          unreadImportantEmails: createCategoryEmails('important')
        },
        source_emails: enrichedEmails
      };
    });

    console.log(`✨ Returning ${enrichedInsights.length} enriched insights`);

    // Increment usage after successful analysis (non-blocking — don't let this kill the response)
    try {
      await subscriptionService.incrementFeatureUsage(userEmail, FEATURE_TYPES.SIFT_ANALYSIS);
    } catch (usageErr) {
      console.warn('⚠️ Failed to increment usage, but insights are ready:', usageErr);
    }

    return NextResponse.json({
      success: true,
      insights: enrichedInsights,
      sift_intelligence_summary: stats,
      nextPageToken,
      timestamp: new Date().toISOString(),
      userEmail
    });

  } catch (error: any) {
    console.error('💥 Insights API Error:', error?.message || error, error?.stack?.split('\n').slice(0, 3).join('\n'));
    const errorMsg = error?.message || (typeof error === 'string' ? error : 'Failed to generate insights — please try again');
    return NextResponse.json({
      success: false,
      error: errorMsg,
      insights: [],
      sift_intelligence_summary: {
        opportunities_detected: 0,
        urgent_action_required: 0,
        hot_leads_heating_up: 0,
        conversations_at_risk: 0,
        missed_follow_ups: 0,
        unread_but_important: 0
      }
    }, { status: 500 });
  }
}
