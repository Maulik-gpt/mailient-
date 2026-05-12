/**
 * Audit Log API — User Activity Log
 * GET: Retrieve audit logs for the authenticated user
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { auditLogger } from '@/lib/audit-logger';

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const eventType = searchParams.get('type') || undefined;
    const startDate = searchParams.get('start') || undefined;
    const endDate = searchParams.get('end') || undefined;

    const result = await auditLogger.getUserLogs(session.user.email, {
      limit, offset, eventType, startDate, endDate
    });

    return NextResponse.json({
      success: true,
      logs: result.data,
      total: result.total,
      pagination: { limit, offset, hasMore: (offset + limit) < result.total }
    });
  } catch (error) {
    console.error('📋 [AuditLog API] Error:', error.message);
    return NextResponse.json({ error: 'Failed to retrieve audit logs' }, { status: 500 });
  }
}
