import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('[Supabase Server] Environment check:', {
    supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'UNDEFINED',
    supabaseAnonKey: supabaseAnonKey ? 'SET (hidden)' : 'UNDEFINED',
    NODE_ENV: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE')),
  });

  if (!supabaseUrl) {
    console.error('[Supabase Server] NEXT_PUBLIC_SUPABASE_URL is not set!');
    console.error('[Supabase Server] Available env vars:', Object.keys(process.env));
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set in environment variables");
  }
  if (!supabaseAnonKey) {
    console.error('[Supabase Server] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set!');
    console.error('[Supabase Server] Available env vars:', Object.keys(process.env));
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in environment variables");
  }

  console.log('[Supabase Server] Client created successfully');
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
