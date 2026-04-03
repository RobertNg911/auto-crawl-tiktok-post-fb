import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

export type SupabaseClient = typeof supabase;

export function createBrowserClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}
