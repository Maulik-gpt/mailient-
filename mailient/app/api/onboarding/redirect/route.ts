import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DatabaseService } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ redirectTo: "/auth/signin" });
    }

    const db = new DatabaseService();
    const profile = await db.getUserProfile(session.user.email);

    if (!profile || !profile.onboarding_completed) {
      return NextResponse.json({ redirectTo: "/onboarding" });
    }

    return NextResponse.json({ redirectTo: "/home-feed" });
  } catch (error) {
    console.error("Error checking onboarding redirect:", error);
    return NextResponse.json({ redirectTo: "/onboarding" });
  }
}

