import { createClient } from '@supabase/supabase-js';

/**
 * @fileOverview Supabase Client Initialization
 * Uses public environment variables for secure client-side communication.
 * Configured with persistSession to ensure auth remains active across reloads.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = 
  supabaseUrl !== '' && 
  supabaseAnonKey !== '' && 
  !supabaseUrl.includes('placeholder-project-id');

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn('Supabase credentials missing or using placeholders. Dashboard features and authentication will be limited until NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are provided.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project-id.supabase.co', 
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true, // Crucial for session persistence across reloads
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Global query logging wrapper for debugging runtime sequence
const rawFrom = supabase.from.bind(supabase);

(supabase as any).from = (table: string) => {
  console.log('[SUPABASE QUERY START] table:', table);
  const builder = rawFrom(table);

  return new Proxy(builder, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function' && ['select', 'update', 'insert', 'upsert', 'delete', 'maybeSingle', 'single', 'eq', 'filter', 'in'].includes(String(prop))) {
        return (...args: any[]) => {
          console.log(`[SUPABASE QUERY] table=${table} method=${String(prop)}`, args);
          return value.apply(target, args);
        };
      }
      return value;
    }
  });
};
