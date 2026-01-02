// app/api/admin/sync-profiles/route.js
// This endpoint can be called by a cron job to sync all profiles

import { NextResponse } from "next/server";
import { syncAllProfiles } from "../../../../scripts/sync-profiles.js";

// CRITICAL: Force dynamic rendering to prevent build-time evaluation
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    // Optional: Add authentication for admin access
    // For now, allow any call (in production, add auth)

    await syncAllProfiles();

    return NextResponse.json({
      message: "Profile sync completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Admin sync error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

