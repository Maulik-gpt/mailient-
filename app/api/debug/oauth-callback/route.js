/**
 * Debug endpoint for OAuth callback troubleshooting
 * This helps diagnose OAuth flow issues
 */

export async function GET(request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);

  console.log('🔍 OAuth Debug - Callback URL received:');
  console.log('📋 Full URL:', request.url);
  console.log('🔍 Query params:', params);
  console.log('📋 Headers:', Object.fromEntries(request.headers));

  // Check for common OAuth parameters
  const hasCode = params.code ? '✅' : '❌';
  const hasState = params.state ? '✅' : '❌';
  const hasError = params.error ? '⚠️' : '✅';

  console.log('🔍 OAuth parameter check:');
  console.log(`  Code: ${hasCode} (${params.code ? 'present' : 'missing'})`);
  console.log(`  State: ${hasState} (${params.state ? 'present' : 'missing'})`);
  console.log(`  Error: ${hasError} (${params.error || 'none'})`);

  return new Response(JSON.stringify({
    message: 'OAuth callback debug info logged',
    url: request.url,
    params: params,
    timestamp: new Date().toISOString(),
    checks: {
      hasCode: !!params.code,
      hasState: !!params.state,
      hasError: !!params.error
    }
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}