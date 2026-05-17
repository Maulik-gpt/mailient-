// notion_calendar auth now redirects to /api/integrations/notion/callback
// This route is kept but should not be reached in normal flow.
// If it is reached (e.g. old bookmarked link), forward to the notion callback handler.
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { origin, search } = new URL(request.url);
  return NextResponse.redirect(new URL(`/api/integrations/notion/callback${search}`, origin));
}
