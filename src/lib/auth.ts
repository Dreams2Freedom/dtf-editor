import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Get the authenticated user from the server
 * Use this in Server Components and Route Handlers
 */
export async function getServerUser() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin() {
  const user = await getServerUser();

  if (!user) {
    return false;
  }

  const supabase = await createServerSupabaseClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return profile?.is_admin === true;
}