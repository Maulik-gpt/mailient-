import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DatabaseService } from "@/lib/supabase";

// GET - Fetch all notes for the user
export async function GET() {
  try {
    const session = await auth();
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
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subject, content, tags } = body;

    if (!subject && !content) {
      return NextResponse.json(
        { error: "Subject or content is required" },
        { status: 400 }
      );
    }

    const db = new DatabaseService();
    const userId = session.user.email;

    // Create note
    const { data, error } = await db.supabase
      .from("notes")
      .insert({
        user_id: userId,
        subject: subject || "Untitled Note",
        content: content || "",
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
    const session = await auth();
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
    const { data, error } = await db.supabase
      .from("notes")
      .update({
        subject: subject,
        content: content,
        tags: tags,
        updated_at: new Date().toISOString()
      })
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
    const session = await auth();
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