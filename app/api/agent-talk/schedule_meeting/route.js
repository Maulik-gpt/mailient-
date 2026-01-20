import { NextResponse } from 'next/server';
import { SchedulingAIService } from '@/lib/scheduling-ai';

export async function POST(request) {
  try {
    const { emailContent, meetingContext } = await request.json();
    
    console.log('🤖 Meeting scheduling request received');
    
    const schedulingAI = new SchedulingAIService();
    
    // Generate meeting details using AI
    const meetingDetails = await schedulingAI.recommendMeetingDetails(
      emailContent || meetingContext || ''
    );
    
    console.log('✅ Generated meeting details:', meetingDetails);
    
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

