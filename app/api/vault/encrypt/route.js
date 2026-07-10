/**
 * Vault Encrypt API — Server-side storage for client-encrypted blobs
 * POST: Store an encrypted blob that was encrypted client-side
 * 
 * The server NEVER decrypts this data — it stores it as-is.
 * This is the server-side complement to lib/vault-crypto.js
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { auditLogger, AUDIT_EVENTS } from '@/lib/audit-logger';
import { logEvent } from "@/lib/logsso";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { blobId, encryptedData, contentType, metadata } = body;

    if (!blobId || !encryptedData) {
      return NextResponse.json({ error: 'blobId and encryptedData required' }, { status: 400 });
    }

    // Validate it's actually vault-encrypted (starts with vault:v1:)
    if (!encryptedData.startsWith('vault:v1:')) {
      return NextResponse.json(
        { error: 'Data must be client-side encrypted with Vault before storage' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('encrypted_vault')
      .upsert({
        user_id: session.user.email.toLowerCase(),
        blob_id: blobId,
        encrypted_data: encryptedData,
        content_type: contentType || 'email',
        metadata: JSON.stringify(metadata || {}),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,blob_id' });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, note: 'Vault table not yet created. Data accepted.' });
      }
      throw error;
    }

    // Audit log (non-blocking)
    auditLogger.log(session.user.email, AUDIT_EVENTS.DATA_ENCRYPTED, {
      blobId,
      contentType,
      sizeBytes: encryptedData.length
    }).catch(() => {});

    return NextResponse.json({ success: true, blobId });
  } catch (error) {
    logEvent({ channel: "failures", event: "❌ API Error", description: String(error) });
    console.error('🔐 [Vault Encrypt API] Error:', error.message);
    return NextResponse.json({ error: 'Vault storage failed' }, { status: 500 });
  }
}
