/**
 * Data Segmentation — Compartmentalization Layer
 * 
 * Maps google_uid → internal_uuid for data isolation.
 * Each user's data is stored under a non-guessable UUID,
 * not their email address or Google UID directly.
 */

import crypto from 'crypto';
import { getSupabaseAdmin } from './supabase.js';

class DataSegmentationService {
  constructor() {
    this._supabase = null;
  }

  get supabase() {
    if (!this._supabase) this._supabase = getSupabaseAdmin();
    return this._supabase;
  }

  /**
   * Get or create an internal UUID for a user.
   * The mapping table is access-controlled separately from content tables.
   */
  async getInternalId(googleEmail) {
    const email = googleEmail?.toLowerCase();
    if (!email) throw new Error('Email required for ID resolution');

    try {
      // Check existing mapping
      const { data, error } = await this.supabase
        .from('user_id_mapping')
        .select('internal_uuid')
        .eq('google_email', email)
        .maybeSingle();

      if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
        throw error;
      }

      if (data?.internal_uuid) return data.internal_uuid;

      // Create new mapping
      const internalUuid = crypto.randomUUID();
      const { error: insertError } = await this.supabase
        .from('user_id_mapping')
        .insert({
          google_email: email,
          internal_uuid: internalUuid,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        if (insertError.code === '42P01') {
          console.warn('📦 [DataSeg] user_id_mapping table not created yet. Using email hash fallback.');
          return this._generateDeterministicUuid(email);
        }
        // Race condition: another request created it first
        if (insertError.code === '23505') {
          const { data: retry } = await this.supabase
            .from('user_id_mapping')
            .select('internal_uuid')
            .eq('google_email', email)
            .maybeSingle();
          return retry?.internal_uuid || this._generateDeterministicUuid(email);
        }
        throw insertError;
      }

      return internalUuid;
    } catch (error) {
      console.error('📦 [DataSeg] ID resolution error:', error.message);
      return this._generateDeterministicUuid(email);
    }
  }

  /**
   * Resolve internal UUID back to google email (admin only).
   */
  async resolveEmail(internalUuid) {
    try {
      const { data, error } = await this.supabase
        .from('user_id_mapping')
        .select('google_email')
        .eq('internal_uuid', internalUuid)
        .maybeSingle();

      if (error) throw error;
      return data?.google_email || null;
    } catch (error) {
      console.error('📦 [DataSeg] Reverse resolution error:', error.message);
      return null;
    }
  }

  /**
   * Deterministic UUID fallback when the mapping table doesn't exist yet.
   * Uses HMAC-SHA256 of the email to produce a consistent UUID.
   */
  _generateDeterministicUuid(email) {
    const secret = process.env.ENCRYPTION_KEY || 'data-seg-fallback';
    const hash = crypto.createHmac('sha256', secret).update(email).digest('hex');
    // Format as UUID v4 shape
    return [
      hash.substring(0, 8),
      hash.substring(8, 12),
      '4' + hash.substring(13, 16),
      ((parseInt(hash.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.substring(17, 20),
      hash.substring(20, 32)
    ].join('-');
  }
}

export const dataSegmentation = new DataSegmentationService();
