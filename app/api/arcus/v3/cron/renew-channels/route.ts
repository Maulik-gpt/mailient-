/**
 * Arcus V3 — GCal Channel Renewal Cron
 * GET /api/arcus/v3/cron/renew-channels
 *
 * Checks for Google Calendar webhook channels expiring within 24 hours
 * and renews them to ensure continuous event ingestion.
 *
 * Security: protected by CRON_SECRET header check.
 */

import { NextRequest, NextResponse } from 'next/server';
import { renewExpiredChannels } from '../../../../../../lib/arcus-v3/gcal-watch';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET || process.env.AUTH_SECRET;

  if (!expectedSecret || cronSecret !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await renewExpiredChannels();
    return NextResponse.json({ status: 'ok', ...results });
  } catch (error) {
    console.error('[Arcus V3] Channel renewal cron error:', (error as Error).message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
