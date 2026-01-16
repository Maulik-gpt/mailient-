import { NextResponse } from 'next/server';

// Calendar functionality has been disabled
export async function POST(request) {
  return NextResponse.json(
    { 
      error: 'Calendar functionality has been disabled',
      message: 'Google Calendar integration is no longer available. Please use email scheduling instead.'
    },
    { status: 503 }
  );
}

