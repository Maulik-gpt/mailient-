import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';
import { decrypt } from '@/lib/crypto.js';
import { GmailService } from '@/lib/gmail.js';
import { ArcusAIService } from '@/lib/arcus-ai.js';

export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = new DatabaseService();
    const userTokens = await db.getUserTokens(session.user.email);
    
    if (!userTokens || !userTokens.encrypted_access_token) {
      return NextResponse.json({ nudges: [], status: 'no_gmail_connected' });
    }

    const accessToken = decrypt(userTokens.encrypted_access_token);
    const refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';
    
    const gmailService = new GmailService(accessToken, refreshToken);
    const arcusAI = new ArcusAIService();

    // 1. Search for unreplied incoming emails older than 2 days but within 14 days
    // We search for emails in inbox that aren't from 'me' and haven't been replied to.
    const query = 'is:inbox -from:me -is:answered older_than:2d newer_than:14d';
    const emailList = await gmailService.getEmails(15, query);

    if (!emailList.messages || emailList.messages.length === 0) {
      return NextResponse.json({ nudges: [] });
    }

    // 2. Fetch details for these emails
    const emailDetails = await Promise.all(
      emailList.messages.map(msg => gmailService.getEmailDetails(msg.id))
    );

    const parsedEmails = emailDetails.map(details => gmailService.parseEmailData(details));

    // 3. Use AI to detect which ones actually need a nudge
    const nudges = await arcusAI.analyzeNeedsNudge(parsedEmails);

    // 4. Return nudges with some metadata
    return NextResponse.json({ 
      nudges: nudges.map(n => ({
        ...n,
        // Match the nudge back to the parsed email to get full details if needed
        fullEmail: parsedEmails.find(e => e.id === n.id)
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Nudges API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
