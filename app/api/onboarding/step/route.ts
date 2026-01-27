import { NextResponse } from "next/server";
// @ts-ignore
import { auth } from "@/lib/auth";
import { DatabaseService } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        // @ts-ignore
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { step } = await request.json();
        if (step === undefined) {
            return NextResponse.json({ error: "Step is required" }, { status: 400 });
        }

        const db = new DatabaseService(true);
        const userId = session.user.email.toLowerCase();

        // Get existing profile and merge preferences
        const profile = await db.getUserProfile(userId);
        const preferences = profile?.preferences || {};
        preferences.last_onboarding_step = step;

        const { error } = await db.supabase
            .from("user_profiles")
            .upsert({
                user_id: userId,
                email: userId,
                preferences,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: "user_id",
            });

        if (error) {
            console.error("❌ Error saving onboarding step:", error);
            return NextResponse.json({ error: "Failed to save step" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in onboarding step API:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
