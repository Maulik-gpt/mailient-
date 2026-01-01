import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DatabaseService } from '@/lib/supabase';

// GET - Retrieve personality preferences
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = new DatabaseService();
    const userId = session.user.email;

    // Get user profile with preferences
    const profile = await db.getUserProfile(userId);
    
    if (!profile) {
      return NextResponse.json({ personality: '' });
    }

    // Extract personality from preferences
    const personality = (profile.preferences as any)?.arcus_personality || '';

    return NextResponse.json({ personality });
  } catch (error) {
    console.error('Error fetching personality preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Save personality preferences
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { personality } = body;

    if (typeof personality !== 'string') {
      return NextResponse.json(
        { error: 'Personality must be a string' },
        { status: 400 }
      );
    }

    const db = new DatabaseService();
    const userId = session.user.email;

    // Get existing profile
    const existingProfile = await db.getUserProfile(userId);
    const existingPrefs = existingProfile?.preferences || {};

    // Update preferences with personality
    const updatedPrefs = {
      ...existingPrefs,
      arcus_personality: personality,
    };

    // Update user profile
    const { error } = await db.supabase
      .from('user_profiles')
      .update({
        preferences: updatedPrefs,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating personality preferences:', error);
      return NextResponse.json(
        { error: 'Failed to save personality preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      personality 
    });
  } catch (error) {
    console.error('Error saving personality preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

