// app/api/profile/avatar/route.js
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase.js";
import { auth } from "@/lib/auth.js";

// CRITICAL: Force dynamic rendering to prevent build-time evaluation
export const dynamic = 'force-dynamic';

const supabase = new Proxy({}, {
  get: (target, prop) => getSupabaseAdmin()[prop]
});

// Simple UUID replacement
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// POST - Upload avatar image
export async function POST(req) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.email;

    // Get form data
    const formData = await req.formData();
    const file = formData.get("avatar") || formData.get("banner");
    const isBanner = formData.has("banner");

    if (!file || !file.size) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."
      }, { status: 400 });
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({
        error: "File too large. Maximum size is 5MB."
      }, { status: 400 });
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${generateId()}.${fileExt}`;

    // Choose storage bucket based on file type
    const bucket = isBanner ? "banners" : "avatars";

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: `Failed to upload ${isBanner ? 'banner' : 'avatar'}` }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    // Update user profile with new URL
    const updateField = isBanner ? "banner_url" : "avatar_url";
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .update({
        [updateField]: publicUrl,
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .select(updateField)
      .maybeSingle();

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Don't fail the request if profile update fails, but log it
    }

    return NextResponse.json({
      url: publicUrl,
      field: updateField,
      message: `${isBanner ? 'Banner' : 'Avatar'} uploaded successfully`
    });

  } catch (err) {
    console.error("Avatar upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove avatar
export async function DELETE(req) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.email;

    // Get current URLs from profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("avatar_url, banner_url")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: "Profile error" }, { status: 500 });
    }

    // Check if user has any images to delete
    if (!profile?.avatar_url && !profile?.banner_url) {
      return NextResponse.json({ error: "No images found" }, { status: 404 });
    }

    const deletePromises = [];
    const updateFields = {};

    // Handle avatar deletion
    if (profile.avatar_url) {
      const avatarUrlParts = profile.avatar_url.split("/");
      const avatarFileName = avatarUrlParts[avatarUrlParts.length - 1];

      deletePromises.push(
        supabase.storage.from("avatars").remove([avatarFileName])
      );
      updateFields.avatar_url = null;
    }

    // Handle banner deletion
    if (profile.banner_url) {
      const bannerUrlParts = profile.banner_url.split("/");
      const bannerFileName = bannerUrlParts[bannerUrlParts.length - 1];

      deletePromises.push(
        supabase.storage.from("banners").remove([bannerFileName])
      );
      updateFields.banner_url = null;
    }

    // Delete files from storage
    const deleteResults = await Promise.allSettled(deletePromises);

    // Check for deletion errors
    for (const result of deleteResults) {
      if (result.status === 'rejected') {
        console.error("File deletion error:", result.reason);
        return NextResponse.json({ error: "Failed to delete files" }, { status: 500 });
      }
    }

    // Update profile to remove URLs
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        ...updateFields,
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Profile update error:", updateError);
    }

    return NextResponse.json({ message: "Avatar deleted successfully" });

  } catch (err) {
    console.error("Avatar delete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

