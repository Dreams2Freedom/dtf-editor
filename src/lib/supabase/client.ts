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
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        if (typeof document === 'undefined') return [];

        return document.cookie.split('; ').map(cookie => {
          const [name, ...value] = cookie.split('=');
          return { name, value: value.join('=') };
        });
      },
      setAll(cookiesToSet) {
        if (typeof document === 'undefined') return;

        cookiesToSet.forEach(({ name, value, options }) => {
          const cookieStr = `${name}=${value}`;
          const optionsStr = Object.entries(options || {})
            .map(([key, val]) => {
              if (key === 'maxAge') return `max-age=${val}`;
              if (key === 'httpOnly' && val) return 'HttpOnly';
              if (key === 'secure' && val) return 'Secure';
              if (key === 'sameSite') return `SameSite=${val}`;
              if (typeof val === 'boolean') return val ? key : '';
              return `${key}=${val}`;
            })
            .filter(Boolean)
            .join('; ');

          document.cookie = `${cookieStr}; ${optionsStr}`;
        });
      },
      remove(name, options) {
        if (typeof document === 'undefined') return;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${options?.path || '/'}`;
      }
    }
    });
  }

  return supabaseClient;
};