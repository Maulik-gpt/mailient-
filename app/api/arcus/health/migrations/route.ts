/**
 * F5 — Arcus migration health check.
 *
 * GET /api/arcus/health/migrations
 *
 * Probes Supabase for the existence of the tables Arcus depends on. Returns
 * a structured JSON the settings card can read to show a red "memory not
 * configured" banner when a migration was never applied to the live project.
 *
 * Cheap probe: SELECT 1 with a LIMIT and head-only request — no rows read.
 * If the table is missing, the driver surfaces a 42P01 / PGRST205 error
 * which we map to `missing`.
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUIRED_TABLES = [
  'arcus_memories',
  'arcus_agent_runs',
  'arcus_agent_scratchpad',
] as const;

type TableStatus = 'ok' | 'missing' | 'error';

interface Probe {
  table: string;
  status: TableStatus;
  message?: string;
}

async function probeTable(table: string): Promise<Probe> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .limit(1);

    if (!error) return { table, status: 'ok' };

    // PostgREST "relation does not exist" → 42P01 / PGRST205.
    const code = (error as any).code || '';
    const msg = error.message || '';
    if (
      code === '42P01' ||
      code === 'PGRST205' ||
      /does not exist|not found|schema cache/i.test(msg)
    ) {
      return { table, status: 'missing', message: msg };
    }
    return { table, status: 'error', message: msg };
  } catch (err: any) {
    return { table, status: 'error', message: err?.message || 'probe failed' };
  }
}

export async function GET() {
  const probes = await Promise.all(REQUIRED_TABLES.map(probeTable));
  const missing = probes.filter(p => p.status === 'missing').map(p => p.table);
  const errored = probes.filter(p => p.status === 'error');
  const allOk = missing.length === 0 && errored.length === 0;

  return NextResponse.json({
    ok: allOk,
    missing,
    errored: errored.map(e => ({ table: e.table, message: e.message })),
    probes,
    checkedAt: new Date().toISOString(),
  }, {
    status: allOk ? 200 : 503,
  });
}
