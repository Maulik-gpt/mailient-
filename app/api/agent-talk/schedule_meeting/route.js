import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SchedulingAIService } from '@/lib/scheduling-ai';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.email;

    // Check subscription and feature usage for schedule calls
    const canUse = await subscriptionService.canUseFeature(userId, FEATURE_TYPES.SCHEDULE_CALL);
    if (!canUse) {
      const usage = await subscriptionService.getFeatureUsage(userId, FEATURE_TYPES.SCHEDULE_CALL);
      return NextResponse.json({
        error: 'limit_reached',
        message: `Sorry, but you've exhausted all the credits of ${usage.period === 'daily' ? 'the day' : 'the month'}.`,
        usage: usage.usage,
        limit: usage.limit,
        period: usage.period,
        planType: usage.planType,
        upgradeUrl: '/pricing'
      }, { status: 403 });
    }

    const { emailContent, meetingContext } = await request.json();

    console.log('🤖 Meeting scheduling request received');

    const schedulingAI = new SchedulingAIService();

    // Generate meeting details using AI
    const meetingDetails = await schedulingAI.recommendMeetingDetails(
      emailContent || meetingContext || ''
    );

    console.log('✅ Generated meeting details:', meetingDetails);

    // Increment usage after successful scheduling
    await subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.SCHEDULE_CALL);

    return NextResponse.json({
      success: true,
      meetingDetails,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Meeting scheduling error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate meeting details',
        message: error.message,
        fallback: {
          suggested_title: 'Follow-up Call',
          suggested_description: 'Discussing the recent email exchange.',
          suggested_duration: 30
        }
      },
      { status: 500 }
    );
  }
}
