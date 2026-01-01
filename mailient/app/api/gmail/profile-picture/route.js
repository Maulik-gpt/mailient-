import { NextResponse } from 'next/server';
// Remove Gmail dependency to avoid triggering Gmail API limits

// Simple in-memory cache for profile picture URLs
// Keyed by lowercase email; values store { url, cachedAt }
const profilePicCache = new Map();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = (searchParams.get('email') || '').toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    // Serve cached result if fresh
    const cached = profilePicCache.get(email);
    if (cached && Date.now() - cached.cachedAt < ONE_DAY_MS) {
      return NextResponse.json({ profilePicture: cached.url });
    }

    // Compute Gravatar URL (no external validation; client onError already falls back)
    const crypto = await import('crypto');
    const emailHash = crypto.default.createHash('md5').update(email).digest('hex');
    const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=404&s=200`;

    // Prefer Gravatar; cache and return
    profilePicCache.set(email, { url: gravatarUrl, cachedAt: Date.now() });
    return NextResponse.json({ profilePicture: gravatarUrl });

  } catch (error) {
    console.error('Error in profile picture endpoint:', error);
    const email = new URL(request.url).searchParams.get('email') || 'default';
    const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email.split('@')[0]}&backgroundColor=b6e3f4,c0aede,d1d4f9&backgroundType=gradientLinear`;
    return NextResponse.json({ profilePicture: fallbackUrl });
  }
}

