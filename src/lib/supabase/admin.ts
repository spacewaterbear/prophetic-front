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

  console.log('[Supabase Admin] Environment check:', {
    supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'UNDEFINED',
    supabaseServiceRoleKey: supabaseServiceRoleKey ? 'SET (hidden)' : 'UNDEFINED',
    NODE_ENV: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE')),
  });

  if (!supabaseUrl) {
    console.error('[Supabase Admin] NEXT_PUBLIC_SUPABASE_URL is not set!');
    console.error('[Supabase Admin] Available env vars:', Object.keys(process.env));
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set in environment variables");
  }
  if (!supabaseServiceRoleKey) {
    console.error('[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is not set!');
    console.error('[Supabase Admin] Available env vars:', Object.keys(process.env));
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in environment variables");
  }

  console.log('[Supabase Admin] Client created successfully');
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
