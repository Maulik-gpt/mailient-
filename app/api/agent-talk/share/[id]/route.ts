import { NextResponse } from 'next/server';
// @ts-ignore
import { auth as authAny } from '@/lib/auth.js';
const auth = authAny as any;
import { DatabaseService } from '@/lib/supabase.js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Share ID is required' }, { status: 400 });
    }

    const db = new DatabaseService();
    const sharedConvo = await db.getSharedConversation(id);

    // If the conversation doesn't exist or has been unshared, return 404
    if (!sharedConvo || sharedConvo.is_unshared) {
      return NextResponse.json({ error: 'Shared conversation not found or expired' }, { status: 404 });
    }

    // Increment view count in Supabase asynchronously
    const currentViews = sharedConvo.views || 0;
    await db.supabase
      .from('shared_chats')
      .update({ views: currentViews + 1 })
      .eq('id', id);

    return NextResponse.json({
      id: sharedConvo.id,
      originalConvoId: sharedConvo.original_convo_id,
      ownerEmail: sharedConvo.owner_email,
      title: sharedConvo.title,
      messages: sharedConvo.messages,
      views: currentViews + 1, // Return the incremented view count
      isUnshared: sharedConvo.is_unshared,
      createdAt: sharedConvo.created_at,
    });
  } catch (error: any) {
    console.error('Error fetching shared conversation:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Share ID is required' }, { status: 400 });
    }

    const db = new DatabaseService();
    const sharedConvo = await db.getSharedConversation(id);

    if (!sharedConvo) {
      return NextResponse.json({ error: 'Shared conversation not found' }, { status: 404 });
    }

    // Check if the current user is the owner of the shared conversation
    const userEmail = session.user.email.toLowerCase();
    const ownerEmail = sharedConvo.owner_email.toLowerCase();

    if (userEmail !== ownerEmail) {
      return NextResponse.json({ error: 'Forbidden: You are not the owner of this link' }, { status: 403 });
    }

    // Mark as unshared to revoke public access
    const { error } = await db.supabase
      .from('shared_chats')
      .update({ is_unshared: true })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to revoke link', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Share link revoked successfully',
    });
  } catch (error: any) {
    console.error('Error revoking share link:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
