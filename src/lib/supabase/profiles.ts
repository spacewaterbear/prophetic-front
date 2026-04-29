import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type UserStatus = Database["public"]["Enums"]["user_status"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

interface UpsertProfileParams {
  id: string;
  email: string;
  username?: string;
  avatarUrl?: string | null;
  firstName?: string;
  lastName?: string;
  status?: UserStatus;
  artStatus?: UserStatus;
}

/**
 * Upserts a profile in the profiles table.
 * - If a profile with the given email exists, updates it.
 * - Otherwise, if a profile with the given id exists, updates it.
 * - Otherwise, inserts a new profile.
 *
 * Returns the profile ID on success, or null on failure.
 */
export async function upsertProfile(
  adminClient: SupabaseClient<Database>,
  params: UpsertProfileParams,
): Promise<string | null> {
  const { id, email, username, avatarUrl, firstName, lastName, status = "unauthorized", artStatus = "unauthorized" } = params;

  try {
    // Build update fields — do NOT include status/art_status to preserve existing values
    const updateFields: ProfileUpdate = {
      updated_at: new Date().toISOString(),
    };
    if (username !== undefined) updateFields.username = username;
    if (avatarUrl !== undefined) updateFields.avatar_url = avatarUrl;
    if (firstName !== undefined) updateFields.first_name = firstName;
    if (lastName !== undefined) updateFields.last_name = lastName;

    // Check if profile exists by email
    const { data: existingByEmail } = await adminClient
      .from("profiles")
      .select("id")
      .eq("mail", email)
      .maybeSingle();

    if (existingByEmail) {
      await adminClient
        .from("profiles")
        .update(updateFields)
        .eq("id", existingByEmail.id);

      return existingByEmail.id;
    }

    // Check if profile exists by id
    const { data: existingById } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (existingById) {
      await adminClient
        .from("profiles")
        .update({ mail: email, ...updateFields })
        .eq("id", id);

      return id;
    }

    // Insert new profile with free status
    const { error } = await adminClient.from("profiles").insert({
      id,
      mail: email,
      username: username || email.split("@")[0] || "User",
      avatar_url: avatarUrl ?? null,
      first_name: firstName || null,
      last_name: lastName || null,
      status,
      art_status: artStatus,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[upsertProfile] Insert error:", error);
      return null;
    }

    return id;
  } catch (error) {
    console.error("[upsertProfile] Error:", error);
    return null;
  }
}
