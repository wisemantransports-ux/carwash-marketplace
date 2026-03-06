import { createClient } from '@supabase/supabase-js';

/**
 * @fileOverview Supabase Admin Client
 * This client uses the SERVICE_ROLE_KEY and should ONLY be used in server-side API routes.
 * It bypasses RLS and allows for user management and administrative database operations.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseAdminConfigured = 
  supabaseUrl !== '' && 
  supabaseServiceKey !== '' &&
  !supabaseUrl.includes('placeholder-project-id');

// We initialize the client only if the keys are present to avoid "supabaseKey is required" errors during build/dev evaluation
export const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null as any;
