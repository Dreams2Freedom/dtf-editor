import { createBrowserClient } from '@supabase/ssr';

// Create a singleton Supabase client for client-side use
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export const createClientSupabaseClient = () => {
  // In production, always validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  // Create new client only if it doesn't exist
  // Reusing the same client maintains auth session continuity
  if (!supabaseClient) {
    // Use default cookie handling - don't try to set httpOnly cookies from browser
    // Browser can't set httpOnly cookies, so we let Supabase handle it automatically
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseClient;
};
