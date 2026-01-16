import { NextResponse } from 'next/server';

// Calendar functionality has been disabled
export async function POST(request) {
  return NextResponse.json(
    { 
      error: { 
        code: 'calendar_disabled',
        message: 'Calendar functionality has been disabled. Please use email scheduling instead.'
      }
    },
    { status: 503 }
  );
}

