import { logEvent } from "@/lib/logsso";

/**
 * Catch-all debug route to log any requests
 */

export async function GET(request) {
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });

  console.log('🔍 CATCH-ALL DEBUG - GET request received:');
  console.log('📋 Full URL:', request.url);
  console.log('🔍 Query params:', Object.fromEntries(new URL(request.url).searchParams));
  console.log('📋 Headers:', Object.fromEntries(request.headers));
  console.log('📋 Method:', request.method);

  return new Response(JSON.stringify({
    message: 'Debug info logged',
    url: request.url,
    method: request.method,
    params: Object.fromEntries(new URL(request.url).searchParams),
    timestamp: new Date().toISOString(),
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(request) {
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });

  console.log('🔍 CATCH-ALL DEBUG - POST request received:');
  console.log('📋 Full URL:', request.url);
  console.log('📋 Method:', request.method);
  console.log('📋 Headers:', Object.fromEntries(request.headers));

  try {
    const body = await request.text();
    console.log('📋 Body:', body);
  } catch (e) {
    logEvent({ channel: "failures", event: "❌ API Error", description: String(e) });
    console.log('📋 Body read error:', e.message);
  }

  return new Response(JSON.stringify({
    message: 'Debug info logged',
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString(),
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
