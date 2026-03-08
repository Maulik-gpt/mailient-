import { NextResponse } from 'next/server';
import { GmailTokenService } from '@/lib/gmail-token-service';
import { auth } from '@/lib/auth';

export async function GET(request) {
  console.log('=== GMAIL TOKEN TEST API START ===');
  
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({
        error: 'No valid session found. Please sign in again.'
      }, { status: 401 });
    }

    console.log('Testing Gmail token for user:', session.user.email);

    // Test Gmail token service
    const tokenService = new GmailTokenService();
    
    // Test token retrieval
    const tokenResult = await tokenService.getGmailTokens(session.user.email);
    console.log('Token retrieval result:', tokenResult.success ? 'SUCCESS' : 'FAILED', {
      source: tokenResult.source,
      error: tokenResult.error
    });

    // Test Gmail connection if tokens found
    let connectionTest = null;
    if (tokenResult.success) {
      connectionTest = await tokenService.testGmailConnection(session.user.email);
      console.log('Gmail connection test:', connectionTest.success ? 'SUCCESS' : 'FAILED', {
        email: connectionTest.email,
        error: connectionTest.error
      });
    }

    return NextResponse.json({
      success: true,
      user: session.user.email,
      tokenResult: {
        success: tokenResult.success,
        source: tokenResult.source,
        hasAccessToken: !!tokenResult.tokens?.accessToken,
        hasRefreshToken: !!tokenResult.tokens?.refreshToken,
        error: tokenResult.error
      },
      connectionTest: connectionTest,
      session: {
        hasAccessToken: !!session.accessToken,
        hasRefreshToken: !!session.refreshToken,
        tokenKeys: Object.keys(session)
      }
    });

  } catch (error) {
    console.error('Gmail token test error:', error);
    return NextResponse.json({
      error: `Test failed: ${error.message || String(error)}`,
      details: error.stack
    }, { status: 500 });
  }
}