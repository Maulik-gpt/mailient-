/**
 * Debug route to check environment variables
 */

export async function GET() {
  const envStatus = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    timestamp: new Date().toISOString(),
  };

  console.log('🔍 Environment variables check:', envStatus);

  return new Response(JSON.stringify(envStatus, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
