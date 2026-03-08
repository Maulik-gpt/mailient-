import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase.js';
import { isFeatureEnabled } from '@/lib/feature-flags.js';

export async function POST(request) {
  try {
    if (!isFeatureEnabled('arcusOperatorRuntimeV2')) {
      return NextResponse.json({ success: true, claimed: 0, processed: 0 });
    }

    const { maxJobs = 5, workerId = 'api-worker' } = await request.json().catch(() => ({}));
    const db = new DatabaseService();
    const jobs = await db.claimOperatorJobs(maxJobs, workerId);

    let processed = 0;
    for (const job of jobs) {
      try {
        await db.appendOperatorRunEvent(job.user_id, job.run_id, {
          type: 'job_processed',
          phase: 'executing',
          payload: {
            jobId: job.id,
            jobType: job.job_type,
            workerId
          }
        });
        await db.completeOperatorJob(job.id, 'completed', null);
        processed += 1;
      } catch (err) {
        await db.completeOperatorJob(job.id, 'retry', err.message || 'Job failed');
      }
    }

    return NextResponse.json({
      success: true,
      claimed: jobs.length,
      processed
    });
  } catch (error) {
    console.error('Operator jobs worker error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Worker failed' }, { status: 500 });
  }
}
