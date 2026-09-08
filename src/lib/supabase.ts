import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables read via Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Check if Supabase credentials are configured in .env or deployment environment
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key'
  );
};

/**
 * Supabase client instance
 * Returns a configured client if credentials exist, or a dummy/null client for safe initialization
 */
let client: SupabaseClient | null = null;

if (isSupabaseConfigured() && supabaseUrl && supabaseAnonKey) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (error) {
    console.warn('Failed to initialize Supabase client:', error);
  }
}

export const supabase = client;

export const getSupabaseConfig = () => {
  return {
    url: supabaseUrl || '',
    isConfigured: isSupabaseConfigured(),
  };
};
