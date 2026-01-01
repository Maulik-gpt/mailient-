import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DatabaseService } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ completed: false }, { status: 200 });
    }

    const db = new DatabaseService(true);
    const profile = await db.getUserProfile(session.user.email);

    return NextResponse.json({
      completed: profile?.onboarding_completed || false,
    });
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return NextResponse.json({ completed: false }, { status: 200 });
  }
}

