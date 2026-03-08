import { auth } from '../../../lib/auth.js';

export async function GET(request) {
  try {
    const session = await auth();
    
    return Response.json({
      success: true,
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      hasRefreshToken: !!session?.refreshToken,
      userEmail: session?.user?.email,
      sessionKeys: session ? Object.keys(session) : [],
      debug: {
        NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
        GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      }
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}


