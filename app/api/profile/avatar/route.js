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

// POST - Upload avatar or banner image
export async function POST(req) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.email;

    // Get form data
    let formData;
    try {
      formData = await req.formData();
    } catch (e) {
      console.error("[Avatar API] Failed to parse form data:", e);
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    // Check which type of file was uploaded
    const avatarFile = formData.get("avatar");
    const bannerFile = formData.get("banner");

    const file = avatarFile || bannerFile;
    const isBanner = !!bannerFile;
    const imageType = isBanner ? 'banner' : 'avatar';

    console.log("[Avatar API] Upload request:", {
      hasAvatar: !!avatarFile,
      hasBanner: !!bannerFile,
      isBanner,
      imageType,
      userId,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size
    });

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check if it's actually a file
    if (typeof file === 'string') {
      return NextResponse.json({ error: "Invalid file format - received string instead of file" }, { status: 400 });
    }

    if (!file.size || file.size === 0) {
      return NextResponse.json({ error: "Empty file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: `Invalid file type: ${file.type}. Only JPEG, PNG, GIF, and WebP are allowed.`
      }, { status: 400 });
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({
        error: `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 5MB.`
      }, { status: 400 });
    }

    // Convert file to buffer for Supabase upload
    let fileBuffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } catch (e) {
      console.error("[Avatar API] Failed to convert file to buffer:", e);
      return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
    }

    // Generate unique filename - sanitize email for filename
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9]/g, '_');
    const fileExt = file.name?.split(".").pop()?.toLowerCase() || 'jpg';
    const fileName = `${sanitizedUserId}-${imageType}-${generateId()}.${fileExt}`;

    console.log("[Avatar API] Uploading file:", fileName, "size:", fileBuffer.length);

    // Use profile-images bucket - create if doesn't exist
    const bucket = "profile-images";

    // Check if bucket exists, create if not
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === bucket);

      if (!bucketExists) {
        console.log("[Avatar API] Creating bucket:", bucket);
        const { error: createError } = await supabase.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024, // 5MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        });

        if (createError) {
          console.error("[Avatar API] Failed to create bucket:", createError);
          // Continue anyway - bucket might exist but we couldn't list it
        } else {
          console.log("[Avatar API] Bucket created successfully");
        }
      }
    } catch (bucketError) {
      console.warn("[Avatar API] Bucket check failed, continuing anyway:", bucketError);
    }

    // Upload to Supabase Storage

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      console.error("[Avatar API] Upload error:", JSON.stringify(uploadError));
      // Check if bucket doesn't exist
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: "Storage bucket not configured. Please contact support."
        }, { status: 500 });
      }
      return NextResponse.json({
        error: `Failed to upload ${imageType}: ${uploadError.message}`
      }, { status: 500 });
    }

    console.log("[Avatar API] Upload successful:", uploadData);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) {
      return NextResponse.json({ error: "Failed to get public URL" }, { status: 500 });
    }

    console.log("[Avatar API] Public URL:", publicUrl);

    // Update user profile with new URL
    const updateField = isBanner ? "banner_url" : "avatar_url";
    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        [updateField]: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId);

    if (profileError) {
      console.error("[Avatar API] Profile update error:", profileError);
      // Don't fail - the image is uploaded, just couldn't update profile
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      field: updateField,
      message: `${isBanner ? 'Banner' : 'Avatar'} uploaded successfully`
    });

  } catch (err) {
    console.error("[Avatar API] Unexpected error:", err);
    return NextResponse.json({
      error: err.message || "Internal server error"
    }, { status: 500 });
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

