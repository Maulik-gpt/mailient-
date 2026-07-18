import { NextResponse } from "next/server";
import { auth } from "@/lib/auth.js";
import { DatabaseService } from "@/lib/supabase.js";
import { decrypt, encrypt } from "@/lib/crypto.js";
import { logEvent } from "@/lib/logsso";

const db = new DatabaseService();
const supabase = db.supabase;

async function getValidAccess(row) {
  // if expired or missing, try refresh (reuse profile's refresh logic if you want)
  if (row.encrypted_access_token) {
    try { return decrypt(row.encrypted_access_token); } catch {
      logEvent({ channel: "failures", event: "❌ API Error", description: "Unknown error" }); /* fallthrough */ }
  }
  if (!row.encrypted_refresh_token) throw new Error("no_refresh_token");
  // refresh
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
  if (!r.ok) {
    let errorText = await r.text();
    if (!errorText) errorText = 'No error details provided by API';
    throw new Error(`Token refresh failed: ${r.status} ${errorText}`);
  }
  const body = await r.json();
  if (body.error) throw new Error(JSON.stringify(body));
  const enc = body.access_token; // we'll re-encrypt when saving
  // Save encrypted in DB using server key path
  const { encrypt } = await import("@/lib/crypto.js");
  const encSaved = encrypt(enc);
  const expiry = body.expires_in ? new Date(Date.now() + body.expires_in * 1000).toISOString() : null;
  await supabase.from("user_tokens").update({ encrypted_access_token: encSaved, access_token_expires_at: expiry }).eq("google_email", row.google_email);
  return enc;
}

export async function GET(req) {
  try {
    // AUTH REQUIRED. This route used to take ?email= as its ONLY identity input,
    // with no session check — so anyone could sync (and persist) another user's
    // entire mailbox by guessing their address. Identity now comes from the
    // session; ?email= is accepted only when it matches the caller's own.
    const session = await auth();
    const sessionEmail = session?.user?.email;
    if (!sessionEmail) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const url = new URL(req.url);
    const requested = url.searchParams.get("email");
    if (requested && requested.toLowerCase() !== sessionEmail.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const email = sessionEmail;
    const max = Number(url.searchParams.get("max") || "100"); // Increased default
    const fetchAll = url.searchParams.get("all") === "true"; // New parameter to fetch all emails

    const { data: row } = await supabase.from("user_tokens").select("*").eq("google_email", email).maybeSingle();
    if (!row) return NextResponse.json({ error: "no_tokens" }, { status: 404 });

    let accessToken;
    try { accessToken = await getValidAccess(row); } catch (e) {
      logEvent({ channel: "failures", event: "❌ API Error", description: String(e) }); return NextResponse.json({ error: String(e) }, { status: 401 }); }

    let allMessages = [];
    let pageToken = null;
    let totalFetched = 0;
    const apiBatchSize = Math.min(max, 500); // Gmail API max is 500

    do {
      const params = new URLSearchParams({
        maxResults: apiBatchSize.toString(),
      });
      if (pageToken) {
        params.append('pageToken', pageToken);
      }

      console.log(`Fetching messages batch, pageToken: ${pageToken}, total so far: ${totalFetched}`);

      const { googleFetch } = await import('@/lib/arcus/tools/http-tokens');
      const listRes = await googleFetch(email, 'gmail', `https://www.googleapis.com/gmail/v1/users/me/messages?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!listRes.ok) {
        const t = await listRes.text();
        return NextResponse.json({ error: `Gmail API error: ${t}` }, { status: listRes.status });
      }

      const listJson = await listRes.json();
      const messages = listJson.messages || [];
      allMessages.push(...messages);
      totalFetched += messages.length;

      pageToken = listJson.nextPageToken;
      console.log(`Fetched ${messages.length} messages, total: ${totalFetched}, nextPageToken: ${pageToken}`);

      // If not fetching all, break after first batch
      if (!fetchAll) break;

      // Safety limit to prevent infinite loops or excessive API calls
      if (totalFetched >= 10000) {
        console.log('Reached safety limit of 10000 messages');
        break;
      }

    } while (pageToken);

    console.log(`Total messages to process: ${allMessages.length}`);

    const saved = [];
    // Process in batches to avoid timeouts
    const processBatch = async (batch) => {
      const emailObjects = await Promise.all(batch.map(async (m) => {
        try {
          console.log(`Processing message ${m.id}...`);
          const { googleFetch } = await import('@/lib/arcus/tools/http-tokens');
          const msgRes = await googleFetch(email, 'gmail', `https://www.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!msgRes.ok) {
            console.error(`Message fetch failed for ${m.id}`);
            return null;
          }
          const msgJson = await msgRes.json();
          // extract headers
          const headers = (msgJson.payload?.headers || []).reduce((acc, h) => { acc[h.name] = h.value; return acc; }, {});

          return {
            id: msgJson.id,
            threadId: msgJson.threadId,
            subject: headers.Subject || "",
            from: headers.From || null,
            to: headers.To || "",
            date: msgJson.internalDate ? new Date(Number(msgJson.internalDate)).toISOString() : new Date().toISOString(),
            snippet: msgJson.snippet || "",
            labels: msgJson.labelIds || []
          };
        } catch (error) {
          logEvent({ channel: "failures", event: "❌ API Error", description: String(error) });
          console.error(`Error processing message ${m.id}:`, error);
          return null;
        }
      }));

      const validEmails = emailObjects.filter(e => e !== null);
      if (validEmails.length > 0) {
        await db.storeEmails(row.google_email, validEmails);
      }
      return validEmails.map(e => e.id);
    };

    // Process in smaller batches
    const batchSize = 10;
    for (let i = 0; i < allMessages.length; i += batchSize) {
      const batch = allMessages.slice(i, i + batchSize);
      const batchResults = await processBatch(batch);
      saved.push(...batchResults);
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}, saved ${batchResults.length} emails`);
    }

    // VOICE PROFILE AUTO-GENERATION (fire-and-forget — never blocks sync response)
    // This runs after a successful sync to ensure users get a voice profile automatically
    try {
      const userEmail = row.google_email || email;
      const { voiceProfileService } = await import('@/lib/voice-profile-service');
      const needsRefresh = await voiceProfileService.needsRefresh(userEmail, 7);
      
      if (needsRefresh) {
        console.log('🎭 [Sync] Voice profile needs refresh — generating in background...');
        // Fire-and-forget: don't await, don't block response
        (async () => {
          try {
            const { GmailService } = await import('@/lib/gmail');
            const gmailService = new GmailService(accessToken, null);
            const sentEmails = await voiceProfileService.fetchSentEmails(gmailService, 30);
            if (sentEmails.length >= 3) {
              const profile = await voiceProfileService.analyzeVoiceProfile(sentEmails);
              await voiceProfileService.saveVoiceProfile(userEmail, profile);
              console.log('✅ [Sync] Voice profile auto-generated for', userEmail);
            } else {
              console.log('⚠️ [Sync] Not enough sent emails for voice profile:', sentEmails.length);
            }
          } catch (vpError) {
            logEvent({ channel: "failures", event: "❌ API Error", description: String(vpError) });
            console.warn('⚠️ [Sync] Voice profile auto-generation failed (non-blocking):', vpError.message);
          }
        })();
      }
    } catch (vpCheckError) {
      logEvent({ channel: "failures", event: "❌ API Error", description: String(vpCheckError) });
      // Silent — voice profile is optional, never break sync
      console.warn('⚠️ [Sync] Voice profile check skipped:', vpCheckError.message);
    }

    return NextResponse.json({
      ok: true,
      synced: saved.length,
      totalFetched: allMessages.length,
      fetchedAll: fetchAll
    });
  } catch (err) {
    logEvent({ channel: "failures", event: "❌ API Error", description: String(err) });
    console.error("sync error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}


