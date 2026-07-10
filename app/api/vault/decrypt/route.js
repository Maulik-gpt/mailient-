/**
 * Vault Decrypt API — Retrieves encrypted blobs for client-side decryption
 * GET: Retrieve an encrypted blob — decryption happens in the browser
 * 
 * The server NEVER decrypts this data — it returns the ciphertext as-is.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { auditLogger, AUDIT_EVENTS } from '@/lib/audit-logger';
import { logEvent } from "@/lib/logsso";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const blobId = searchParams.get('blobId');

    if (!blobId) {
      return NextResponse.json({ error: 'blobId required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('encrypted_vault')
      .select('encrypted_data, content_type, metadata, updated_at')
      .eq('user_id', session.user.email.toLowerCase())
      .eq('blob_id', blobId)
      .maybeSingle();

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Vault not initialized' }, { status: 404 });
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json({ error: 'Blob not found' }, { status: 404 });
    }

    // Audit log (non-blocking)
    auditLogger.log(session.user.email, AUDIT_EVENTS.DATA_DECRYPTED, {
      blobId,
      contentType: data.content_type
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      blobId,
      encryptedData: data.encrypted_data,
      contentType: data.content_type,
      metadata: data.metadata,
      updatedAt: data.updated_at
    });
  } catch (error) {
    logEvent({ channel: "failures", event: "❌ API Error", description: String(error) });
    console.error('🔐 [Vault Decrypt API] Error:', error.message);
    return NextResponse.json({ error: 'Vault retrieval failed' }, { status: 500 });
  }
}
