import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase.js';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Share ID is required' }, { status: 400 });
    }

    const db = new DatabaseService();
    const sharedData = await db.getSharedConversation(id);

    if (!sharedData) {
      return NextResponse.json({ error: 'Shared conversation not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: sharedData.id,
      title: sharedData.title,
      messages: sharedData.messages,
      createdAt: sharedData.created_at,
      owner: sharedData.owner_email
    });

  } catch (error) {
    console.error('Share API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
