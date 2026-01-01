import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DatabaseService } from "@/lib/supabase";

// GET - Fetch all bookmarked posts for the user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = new DatabaseService();
    const userId = session.user.email;

    // Fetch bookmarks from database
    const { data: bookmarks, error } = await db.supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching bookmarks:", error);
      return NextResponse.json({ bookmarks: [] });
    }

    // Return bookmarks with post_data
    const formattedBookmarks = (bookmarks || []).map((bookmark: any) => ({
      id: bookmark.id,
      post_id: bookmark.post_id,
      post_data: bookmark.post_data || {},
      created_at: bookmark.created_at,
    }));

    return NextResponse.json({ bookmarks: formattedBookmarks });
  } catch (error) {
    console.error("Error in GET /api/bookmarks:", error);
    return NextResponse.json({ bookmarks: [] });
  }
}

// POST - Bookmark a post
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { postId, postData } = body;

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    const db = new DatabaseService();
    const userId = session.user.email;

    // Check if already bookmarked
    const { data: existing } = await db.supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .maybeSingle();

    if (existing) {
      // Unbookmark if already bookmarked
      const { error: deleteError } = await db.supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);

      if (deleteError) {
        console.error("Error deleting bookmark:", deleteError);
        return NextResponse.json(
          { error: "Failed to unbookmark post" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, bookmarked: false });
    }

    // Create bookmark
    const { data, error } = await db.supabase
      .from("bookmarks")
      .insert({
        user_id: userId,
        post_id: postId,
        post_data: postData || {},
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating bookmark:", error);
      return NextResponse.json(
        { error: "Failed to bookmark post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, bookmarked: true, bookmark: data });
  } catch (error) {
    console.error("Error in POST /api/bookmarks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Unbookmark a post
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    const db = new DatabaseService();
    const userId = session.user.email;

    const { error } = await db.supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);

    if (error) {
      console.error("Error deleting bookmark:", error);
      return NextResponse.json(
        { error: "Failed to unbookmark post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/bookmarks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

