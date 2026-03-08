import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/supabase";
import { OpenRouterAIService } from "@/lib/openrouter-ai";

// Import auth with proper typing
const authFunction: () => Promise<{
  user?: {
    email?: string;
  };
}> = require("@/lib/auth").auth;

// GET - Fetch all notes for the user
export async function GET() {
  try {
    const session = await authFunction();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = new DatabaseService();
    const userId = session.user.email;

    // Fetch notes from database
    const { data: notes, error } = await db.supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
      return NextResponse.json({ notes: [] });
    }

    return NextResponse.json({ notes: notes || [] });
  } catch (error) {
    console.error("Error in GET /api/notes:", error);
    return NextResponse.json({ notes: [] });
  }
}

// POST - Create a new note
export async function POST(request: Request) {
  try {
    const session = await authFunction();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = new DatabaseService();
    const userId = session.user.email;

    const body = await request.json();
    const { subject, content, tags } = body;

    if (!subject && !content) {
      return NextResponse.json(
        { error: "Subject or content is required" },
        { status: 400 }
      );
    }

    // Check subscription and feature usage for AI-enhanced notes
    const { subscriptionService, FEATURE_TYPES } = await import("@/lib/subscription-service");
    const canUse = await subscriptionService.canUseFeature(userId, FEATURE_TYPES.AI_NOTES);
    if (!canUse) {
      const usage = await subscriptionService.getFeatureUsage(userId, FEATURE_TYPES.AI_NOTES);
      return NextResponse.json({
        error: "limit_reached",
        message: `Sorry, but you've exhausted all the credits of ${usage.period === 'daily' ? 'the day' : 'the month'}.`,
        usage: usage.usage,
        limit: usage.limit,
        period: usage.period,
        planType: usage.planType,
        upgradeUrl: "/pricing"
      }, { status: 403 });
    }

    // AI Enhancement with 6 second timeout
    let finalSubject = subject || "Untitled Note";
    let finalContent = content || "";
    let aiEnhanced = false;

    try {
      console.log("✨ Notes API: Starting AI enhancement...");
      const ai = new OpenRouterAIService();

      // Race between AI enhancement and a 6 second timeout
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ subject: finalSubject, content: finalContent, timedOut: true }), 6000);
      });

      const aiPromise = ai.enhanceNote(finalSubject, finalContent).then(result => ({ ...result, timedOut: false }));

      const result = await Promise.race([aiPromise, timeoutPromise]) as { subject: string; content: string; timedOut: boolean };

      if (result.timedOut) {
        console.log("⏱️ Notes API: AI timed out, using original content");
      } else if (result.subject && result.content && (result.subject !== finalSubject || result.content !== finalContent)) {
        finalSubject = result.subject;
        finalContent = result.content;
        aiEnhanced = true;
        console.log("✅ Notes API: AI enhancement applied");
      }
    } catch (aiError) {
      console.error("❌ Notes API: AI Enhancement failed:", aiError);
    }

    // Create note
    console.log("📝 Notes API: Inserting into database...");
    const { data, error } = await db.supabase
      .from("notes")
      .insert({
        user_id: userId,
        subject: finalSubject,
        content: finalContent,
        tags: tags || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating note:", error);
      return NextResponse.json(
        { error: "Failed to create note" },
        { status: 500 }
      );
    }

    // Increment usage only if AI enhancement actually succeeded
    if (aiEnhanced) {
      await subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.AI_NOTES);
    }

    return NextResponse.json({ success: true, note: data });
  } catch (error) {
    console.error("Error in POST /api/notes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update an existing note
export async function PUT(request: Request) {
  try {
    const session = await authFunction();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { noteId, subject, content, tags } = body;

    if (!noteId) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 }
      );
    }

    const db = new DatabaseService();
    const userId = session.user.email;

    // Update note
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (subject !== undefined) updateData.subject = subject;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;

    const { data, error } = await db.supabase
      .from("notes")
      .update(updateData)
      .eq("id", noteId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating note:", error);
      return NextResponse.json(
        { error: "Failed to update note" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, note: data });
  } catch (error) {
    console.error("Error in PUT /api/notes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a note
export async function DELETE(request: Request) {
  try {
    const session = await authFunction();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { noteId } = body;

    if (!noteId) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 }
      );
    }

    const db = new DatabaseService();
    const userId = session.user.email;

    const { error } = await db.supabase
      .from("notes")
      .delete()
      .eq("id", noteId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting note:", error);
      return NextResponse.json(
        { error: "Failed to delete note" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/notes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
