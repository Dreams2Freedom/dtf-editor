import { createBrowserClient } from '@supabase/ssr';

// Create a singleton Supabase client for client-side use
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export const createClientSupabaseClient = () => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  
  return supabaseClient;
};