import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DatabaseService } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await request.json();
    if (!username || username.length === 0) {
      return NextResponse.json({ available: false, error: "Username is required" }, { status: 400 });
    }

    // Check if username is already taken
    const db = new DatabaseService(true);
    const existingProfile = await db.supabase
      .from("user_profiles")
      .select("username")
      .eq("username", username)
      .maybeSingle();

    return NextResponse.json({ available: !existingProfile.data });
  } catch (error) {
    console.error("Error checking username:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

