import { storage } from '../lib/storage';
import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import React from 'react';
import { UserProfile, UserRole } from '../types';
import { authService, DEMO_USERS } from '../services/authService';
import { userService } from '../services/userService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isDemoMode } from '../lib/env';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  authError: string | null;
  isPhcController: boolean;
  isSubcentreStaff: boolean;
  loginWithRole: (role: UserRole) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole?: (role: UserRole) => void;
  refreshUser: () => Promise<void>;
  updatePassword: (newPass: string) => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    return authService.getCurrentUser();
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const hasSession = storage.getItem('arogya_is_logged_in');
    const profile = authService.getCurrentUser();
    return hasSession === 'true' && !!profile;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const role: UserRole | null = user?.role || null;
  const isPhcController = role === 'phc_controller';
  const isSubcentreStaff = role === 'subcentre_employee';

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  // Initialize and check Supabase Auth session & profile
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      setIsLoading(true);
      setAuthError(null);
      try {
        if (isSupabaseConfigured() && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await userService.getProfileByAuthId(session.user.id);
            if (!profile) {
              if (isMounted) {
                setAuthError('वापरकर्त्याची प्रोफाइल सापडली नाही. कृपया प्रशासकाशी संपर्क साधा.');
                setIsLoggedIn(false);
                setUser(null);
              }
              return;
            }

            if (!profile.is_active) {
              await supabase.auth.signOut();
              if (isMounted) {
                setAuthError('आपले खाते सध्या निष्क्रिय आहे. कृपया प्रशासकाशी संपर्क साधा.');
                setIsLoggedIn(false);
                setUser(null);
              }
              return;
            }

            if (!profile.role || (profile.role !== 'phc_controller' && profile.role !== 'subcentre_employee')) {
              await supabase.auth.signOut();
              if (isMounted) {
                setAuthError('वापरकर्त्याची भूमिका निश्चित करता आली नाही. कृपया प्रशासकाशी संपर्क साधा.');
                setIsLoggedIn(false);
                setUser(null);
              }
              return;
            }

            const hydrated = await userService.hydrateUserProfile(profile);
            if (isMounted) {
              setUser(hydrated);
              setIsLoggedIn(true);
              storage.setItem('arogya_is_logged_in', 'true');
              storage.setItem('arogya_current_user_role', hydrated.role);
              storage.setItem('arogya_current_user_profile', JSON.stringify(hydrated));
            }
            return;
          }
        }

        // Local storage profile verification
        const localUser = authService.getCurrentUser();
        const hasLoggedInFlag = storage.getItem('arogya_is_logged_in') === 'true';

        if (localUser && hasLoggedInFlag) {
          if (!localUser.role) {
            if (isMounted) {
              setAuthError('वापरकर्त्याची भूमिका निश्चित करता आली नाही. कृपया प्रशासकाशी संपर्क साधा.');
              setIsLoggedIn(false);
              setUser(null);
            }
            return;
          }
          if (isMounted) {
            setUser(localUser);
            setIsLoggedIn(true);
          }
        } else {
          if (isMounted) {
            setIsLoggedIn(false);
            setUser(null);
          }
        }
      } catch (err: any) {
        console.warn('Auth initialization error:', err);
        if (isMounted) {
          setAuthError(err.message || 'ऑथेंटिकेशन त्रुटी.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    // Listen to Supabase Auth state changes if configured
    if (isSupabaseConfigured() && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            const profile = await userService.getProfileByAuthId(session.user.id);
            if (profile && profile.role) {
              const hydrated = await userService.hydrateUserProfile(profile);
              setUser(hydrated);
              setIsLoggedIn(true);
              setAuthError(null);
              storage.setItem('arogya_is_logged_in', 'true');
            } else {
              setAuthError('वापरकर्त्याची भूमिका निश्चित करता आली नाही. कृपया प्रशासकाशी संपर्क साधा.');
            }
          } catch (e) {
            console.warn('Error loading auth profile on state change:', e);
          }
        } else if (event === 'SIGNED_OUT') {
          setIsLoggedIn(false);
          setUser(null);
          storage.setItem('arogya_is_logged_in', 'false');
          storage.removeItem('arogya_current_user_profile');
          storage.removeItem('arogya_current_user_role');
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } else {
      return () => {
        isMounted = false;
      };
    }
  }, []);

  const loginWithRole = useCallback(async (selectedRole: UserRole) => {
    const loggedUser = await authService.loginWithRole(selectedRole);
    setUser(loggedUser);
    setIsLoggedIn(true);
    setAuthError(null);
  }, []);

  const loginWithEmail = useCallback(async (email: string, pass: string) => {
    const loggedUser = await authService.loginWithEmail(email, pass);
    setUser(loggedUser);
    setIsLoggedIn(true);
    setAuthError(null);
  }, []);

  const logout = useCallback(async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ action: 'CLEAR_CACHE' });
    }
    await authService.logout();
    setUser(null);
    setIsLoggedIn(false);
    setAuthError(null);
  }, []);

  const switchRole = useCallback((newRole: UserRole) => {
    if (!isDemoMode()) {
      console.warn('Role switching is disabled in production mode.');
      return;
    }
    const newUser = DEMO_USERS[newRole];
    storage.setItem('arogya_current_user_role', newRole);
    storage.setItem('arogya_current_user_profile', JSON.stringify(newUser));
    storage.setItem('arogya_is_logged_in', 'true');
    setUser(newUser);
    setIsLoggedIn(true);
    setAuthError(null);
  }, []);

  const updatePassword = useCallback(async (newPass: string) => {
    if (!user) throw new Error('वापरकर्ता लॉगिन केलेला नाही.');
    await userService.updateUserPassword(newPass, user);
    
    // Refresh user state to reflect changes (e.g. requirePasswordChange)
    const updatedUser = authService.getCurrentUser();
    if (updatedUser) setUser(updatedUser);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoggedIn,
        isLoading,
        authError,
        isPhcController,
        isSubcentreStaff,
        loginWithRole,
        loginWithEmail,
        logout,
        switchRole,
        refreshUser,
        updatePassword,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

