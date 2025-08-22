import { createClient } from '@supabase/supabase-js';

// Service role client has admin privileges - use carefully!
export function createServiceRoleSupabaseClient() {
  // Use direct process.env access for server-side code
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xysuxhdqukjtqgzetwps.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not set in environment');
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  
  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set in environment');
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  try {
    return createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  } catch (error) {
    console.error('Failed to create service role client:', error);
    throw error;
  }
}