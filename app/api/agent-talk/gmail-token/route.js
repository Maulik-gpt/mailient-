import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { GmailTokenService } from '@/lib/gmail-token-service.ts';

// Return a fresh Gmail access token for the signed-in user so the frontend can pass it to ElevenLabs
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const tokenService = new GmailTokenService();
    const tokenResult = await tokenService.getGmailTokens(session.user.email);

    if (!tokenResult.success || !tokenResult.tokens?.accessToken) {
      return NextResponse.json(
        { error: tokenResult.error || 'Gmail not connected. Please sign in with Google.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      accessToken: tokenResult.tokens.accessToken,
      source: tokenResult.source || 'database',
      expiresAt: tokenResult.tokens.expiresAt || null,
    });
  } catch (error) {
    console.error('Gmail token endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve Gmail token', details: error.message },
      { status: 500 }
    );
  }
}

