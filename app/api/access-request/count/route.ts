import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const TOTAL_SLOTS = 45;

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { count: approvedCount } = await supabase
      .from('access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved');

    const { count: pendingCount } = await supabase
      .from('access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const slotsRemaining = Math.max(0, TOTAL_SLOTS - (approvedCount || 0));

    return NextResponse.json({
      total: TOTAL_SLOTS,
      approved: approvedCount || 0,
      pending: pendingCount || 0,
      remaining: slotsRemaining,
    });
  } catch (error) {
    console.error('[Access Count] Error:', error);
    // Return hardcoded fallback on error so the UI never breaks
    return NextResponse.json({
      total: TOTAL_SLOTS,
      approved: 0,
      pending: 0,
      remaining: TOTAL_SLOTS,
    });
  }
}
