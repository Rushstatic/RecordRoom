import { isSupabaseConfigured } from './supabase';

/**
 * Environment configuration helpers
 */

/**
 * Checks if the application is running in explicit demo/test mode or standalone preview.
 * If VITE_DEMO_MODE is explicitly defined as 'true' or 'false', that is honored.
 * Otherwise, if Supabase backend is not configured, demo/offline fallback mode
 * is enabled so all features and logins function seamlessly.
 */
export const isDemoMode = (): boolean => {
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    return true;
  }
  if (import.meta.env.VITE_DEMO_MODE === 'false') {
    return false;
  }
  return !isSupabaseConfigured();
};
