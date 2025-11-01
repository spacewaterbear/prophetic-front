import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Creates a Supabase client with service role privileges.
 * This client bypasses Row Level Security (RLS) policies.
 *
 * IMPORTANT: Only use this on the server-side, never expose to the client.
 * Always validate user permissions in your application logic when using this client.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set in environment variables");
  }
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in environment variables");
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
