/**
 * Environment configuration helpers
 */

/**
 * Checks if the application is running in explicit demo/test mode.
 * In production, VITE_DEMO_MODE should be false or undefined, which
 * strictly disables all mock/demo records, fallbacks, and quick test logins.
 */
export const isDemoMode = (): boolean => {
  return import.meta.env.VITE_DEMO_MODE === 'true';
};
