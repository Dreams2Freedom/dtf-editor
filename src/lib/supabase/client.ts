import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/config/env';

// Create a singleton Supabase client for client-side use
export const createClientSupabaseClient = () => {
  return createBrowserClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
  );
};