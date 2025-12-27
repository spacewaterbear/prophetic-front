import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // File validation
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: "File size exceeds 50MB limit" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (file.size === 0) {
      return new Response(JSON.stringify({ error: "File is empty" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const supabase = createAdminClient();

    // Sanitize filename
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const folder = conversationId || 'temp';
    const path = `${session.user.id}/${folder}/${timestamp}_${sanitizedName}`;

    console.log('[Upload API] Uploading file:', {
      userId: session.user.id,
      path,
      fileName: file.name,
      fileSize: file.size
    });

    // Convert File to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('attachement')
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('[Upload API] Upload error:', error);
      return new Response(JSON.stringify({ error: `Upload failed: ${error.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('attachement')
      .getPublicUrl(path);

    return new Response(JSON.stringify({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        url: publicUrl,
        path: path
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('[Upload API] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Upload failed'
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await request.json();
    const { path } = body;

    if (!path) {
      return new Response(JSON.stringify({ error: "No path provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify the path belongs to the current user
    if (!path.startsWith(session.user.id)) {
      return new Response(JSON.stringify({ error: "Unauthorized: Cannot delete files from other users" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const supabase = createAdminClient();

    const { error } = await supabase.storage
      .from('attachement')
      .remove([path]);

    if (error) {
      console.error('[Upload API] Delete error:', error);
      return new Response(JSON.stringify({ error: `Delete failed: ${error.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('[Upload API] Delete error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Delete failed'
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
