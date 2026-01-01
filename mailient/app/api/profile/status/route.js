// app/api/profile/status/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Helper function to get authenticated user
async function getAuthenticatedUser(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("No authorization header");
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error("Invalid token");
    }

    return user;
  } catch (error) {
    throw new Error("Authentication required");
  }
}

// GET - Get user status
export async function GET(req) {
  try {
    const user = await getAuthenticatedUser(req);

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("status, last_seen_at")
      .eq("user_id", user.email)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Status fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
    }

    return NextResponse.json({
      status: profile?.status || 'offline',
      last_seen_at: profile?.last_seen_at || new Date().toISOString()
    });

  } catch (err) {
    console.error("Status GET error:", err);
    if (err.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update user status
export async function PUT(req) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const { status } = body;

    // Validate status
    const validStatuses = ['online', 'away', 'offline'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({
        error: "Invalid status. Must be 'online', 'away', or 'offline'"
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Update status and last seen timestamp
    const { data, error } = await supabase
      .from("user_profiles")
      .update({
        status,
        last_seen_at: now,
        updated_at: now,
        last_synced_at: now
      })
      .eq("user_id", user.email)
      .select("status, last_seen_at")
      .maybeSingle();

    if (error) {
      console.error("Status update error:", error);
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }

    // Broadcast status change to other users (you can implement WebSocket or SSE here)
    // For now, we'll just return the updated status

    return NextResponse.json({
      status: data.status,
      last_seen_at: data.last_seen_at,
      message: "Status updated successfully"
    });

  } catch (err) {
    console.error("Status PUT error:", err);
    if (err.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Quick status toggle
export async function PATCH(req) {
  try {
    const user = await getAuthenticatedUser(req);

    // Get current status
    const { data: currentProfile, error: fetchError } = await supabase
      .from("user_profiles")
      .select("status")
      .eq("user_id", user.email)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Status fetch error:", fetchError);
      return NextResponse.json({ error: "Failed to fetch current status" }, { status: 500 });
    }

    // Toggle status: online -> away -> offline -> online
    const currentStatus = currentProfile?.status || 'offline';
    let newStatus;

    switch (currentStatus) {
      case 'online':
        newStatus = 'away';
        break;
      case 'away':
        newStatus = 'offline';
        break;
      case 'offline':
      default:
        newStatus = 'online';
        break;
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("user_profiles")
      .update({
        status: newStatus,
        last_seen_at: now,
        updated_at: now,
        last_synced_at: now
      })
      .eq("user_id", user.email)
      .select("status, last_seen_at")
      .maybeSingle();

    if (error) {
      console.error("Status toggle error:", error);
      return NextResponse.json({ error: "Failed to toggle status" }, { status: 500 });
    }

    return NextResponse.json({
      status: data.status,
      last_seen_at: data.last_seen_at,
      message: "Status toggled successfully"
    });

  } catch (err) {
    console.error("Status PATCH error:", err);
    if (err.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

