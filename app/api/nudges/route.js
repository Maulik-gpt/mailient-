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

    console.log('🔍 [Nudges API] Found ' + (emailList.messages?.length || 0) + ' potential emails');

    if (!emailList.messages || emailList.messages.length === 0) {
      console.log('✅ [Nudges API] No unreplied emails found in the 2-14 day window.');
      return NextResponse.json({ nudges: [] });
    }

    // 2. Fetch details for these emails
    console.log('📡 [Nudges API] Fetching details for ' + emailList.messages.length + ' emails...');
    const emailDetails = await Promise.all(
      emailList.messages.map(msg => gmailService.getEmailDetails(msg.id))
    );

    const parsedEmails = emailDetails.map(details => gmailService.parseEmailData(details));
    console.log('🤖 [Nudges API] Analyzing emails with Arcus AI...');

    // 3. Use AI to detect which ones actually need a nudge
    const nudges = await arcusAI.analyzeNeedsNudge(parsedEmails);
    console.log('✅ [Nudges API] AI returned ' + (nudges?.length || 0) + ' nudges');

    // 4. Return nudges with some metadata
    return NextResponse.json({ 
      nudges: (nudges || []).map(n => ({
        ...n,
        fullEmail: parsedEmails.find(e => e.id === n.id)
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 [Nudges API] Error:', error);
    return NextResponse.json({ 
      nudges: [], 
      error: error.message,
      status: 'error'
    }, { status: 500 });
  }
}
