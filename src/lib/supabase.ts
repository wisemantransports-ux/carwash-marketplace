import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallback to placeholders
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Connection validation logic for IDX environment
export const isSupabaseConfigured = 
  supabaseUrl !== '' && 
  supabaseAnonKey !== '' && 
  !supabaseUrl.includes('placeholder-project-id');

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials are missing or invalid. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project-id.supabase.co', 
  supabaseAnonKey || 'placeholder-anon-key'
);
