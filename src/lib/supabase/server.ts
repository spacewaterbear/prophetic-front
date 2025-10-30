import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set in environment variables");
  }
  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in environment variables");
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
