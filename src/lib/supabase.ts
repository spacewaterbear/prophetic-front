import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallback values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client-side Supabase client (uses anon key)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Server-side Supabase client (uses service role key for admin operations)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Types for our database
export interface Profile {
  id: string;
  mail: string | null;
  username: string | null;
  avatar_url: string | null;
  status: 'unauthorized' | 'free' | 'paid' | 'discover' | 'intelligence'| 'oracle';
  updated_at: string;
}
