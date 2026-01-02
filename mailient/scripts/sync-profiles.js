// scripts/sync-profiles.js
// This script can be run periodically to sync all user profiles with Google

import { createClient } from '@supabase/supabase-js';
import { decrypt, encrypt } from '../lib/crypto.js';

// Initialize Supabase client lazily to avoid build-time errors
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function refreshAccessToken(row) {
  const supabase = getSupabaseClient();
  if (!row.encrypted_refresh_token) throw new Error("no_refresh_token");
  const refresh_token = decrypt(row.encrypted_refresh_token);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const body = await r.json();
  if (body.error) throw new Error(JSON.stringify(body));
  const enc = encrypt(body.access_token);
  const expiry = body.expires_in ? new Date(Date.now() + body.expires_in * 1000).toISOString() : null;
  await supabase.from("user_tokens").update({
    encrypted_access_token: enc,
    access_token_expires_at: expiry,
    updated_at: new Date().toISOString(),
  }).eq("google_email", row.google_email);
  return body.access_token;
}

async function syncProfileFromGoogle(userEmail) {
  const supabase = getSupabaseClient();
  // Get user tokens
  const { data: row, error: tokenError } = await supabase
    .from("user_tokens")
    .select("*")
    .eq("google_email", userEmail)
    .maybeSingle();

  if (tokenError || !row) {
    console.log(`No tokens found for ${userEmail}`);
    return;
  }

  let accessToken;
  try {
    accessToken = decrypt(row.encrypted_access_token);
  } catch (e) {
    // Try refresh
    try {
      accessToken = await refreshAccessToken(row);
    } catch (err) {
      console.error(`Failed to refresh token for ${userEmail}:`, err);
      return;
    }
  }

  // Fetch Google profile
  const response = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Refresh token and retry
      try {
        accessToken = await refreshAccessToken(row);
        const retryResponse = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!retryResponse.ok) {
          console.error(`Failed to fetch Google profile for ${userEmail} after refresh`);
          return;
        }
        const googleProfile = await retryResponse.json();
        // Update profile
        await supabase
          .from("user_profiles")
          .update({
            name: googleProfile.name,
            picture: googleProfile.picture,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userEmail);
        console.log(`Synced profile for ${userEmail}`);
      } catch (err) {
        console.error(`Error syncing profile for ${userEmail}:`, err);
      }
    } else {
      console.error(`Failed to fetch Google profile for ${userEmail}`);
    }
    return;
  }

  const googleProfile = await response.json();

  // Update profile in database
  await supabase
    .from("user_profiles")
    .update({
      name: googleProfile.name,
      picture: googleProfile.picture,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userEmail);

  console.log(`Synced profile for ${userEmail}`);
}

async function syncAllProfiles() {
  console.log('Starting profile sync for all users...');

  const supabase = getSupabaseClient();
  // Get all users with tokens
  const { data: users, error } = await supabase
    .from("user_tokens")
    .select("google_email");

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  for (const user of users) {
    await syncProfileFromGoogle(user.google_email);
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('Profile sync completed.');
}

export { syncAllProfiles, syncProfileFromGoogle };