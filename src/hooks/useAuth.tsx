import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import React from 'react';
import { UserProfile, UserRole, UserProfileEntity } from '../types';
import { authService, DEMO_USERS } from '../services/authService';
import { userService } from '../services/userService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isDemoMode } from '../lib/env';
import { currentUserService, CurrentUserContext, userContextToUserProfile } from '../services/currentUserService';
import { storage } from '../lib/storage';

export interface AuthContextType {
  user: UserProfile | null;
  userContext: CurrentUserContext | null;
  profile: UserProfileEntity | null;
  authUser: any | null;
  session: any | null;
  role: UserRole | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  authError: string | null;
  isPhcController: boolean;
  isSubcentreStaff: boolean;
  applicableSubcentreIds: string[];
  applicableVillageIds: string[];
  loginWithRole: (role: UserRole) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole?: (role: UserRole) => void;
  refreshUser: () => Promise<void>;
  retryAuth: () => Promise<void>;
  updatePassword: (newPass: string) => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userContext, setUserContext] = useState<CurrentUserContext | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const isManualLogoutRef = React.useRef(false);

  const role: UserRole | null = userContext?.role || user?.role || null;
  const isPhcController = role === 'phc_controller';
  const isSubcentreStaff = role === 'subcentre_employee';
  const profile: UserProfileEntity | null = userContext?.rawProfile || null;
  const authUser = session?.user || null;
  const applicableSubcentreIds: string[] = userContext?.applicableSubcentreIds || [];
  const applicableVillageIds: string[] = userContext?.applicableVillageIds || [];

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Central resolution routine
  const resolveUserContext = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);

    try {
      if (isSupabaseConfigured() && supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        setSession(sessionData?.session || null);

        if (sessionData?.session?.user) {
          const ctx = await currentUserService.getCurrentUserContext();
          if (ctx) {
            setUserContext(ctx);
            const mappedUser = userContextToUserProfile(ctx);
            setUser(mappedUser);
            setIsLoggedIn(true);
            setAuthError(null);
            // Non-authoritative cache for offline fallback only
            storage.setItem('arogya_is_logged_in', 'true');
            storage.setItem('arogya_current_user_role', ctx.role);
            storage.setItem('arogya_current_user_profile', JSON.stringify(mappedUser));
            return;
          }
        }
      }

      // If no Supabase session or not configured, check demo mode
      if (isDemoMode()) {
        const localUser = authService.getCurrentUser();
        if (localUser && storage.getItem('arogya_is_logged_in') === 'true') {
          setUser(localUser);
          setIsLoggedIn(true);
          setAuthError(null);
          return;
        }
      }

      // No active session found
      setUserContext(null);
      setUser(null);
      setIsLoggedIn(false);
    } catch (err: any) {
      console.error('[AuthProvider] Error resolving user context:', err);
      setUserContext(null);
      setUser(null);
      setIsLoggedIn(false);
      setAuthError(err.message || 'आपली कर्मचारी माहिती Supabase मधून मिळवता आली नाही.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await resolveUserContext();
  }, [resolveUserContext]);

  const retryAuth = useCallback(async () => {
    await resolveUserContext();
  }, [resolveUserContext]);

  // Initial mount: load context from Supabase
  useEffect(() => {
    let isMounted = true;

    async function init() {
      await resolveUserContext();
    }

    init();

    // Supabase Auth real-time event listener
    if (isSupabaseConfigured() && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (newSession?.user) {
            try {
              const ctx = await currentUserService.getCurrentUserContext();
              if (ctx && isMounted) {
                setUserContext(ctx);
                const mappedUser = userContextToUserProfile(ctx);
                setUser(mappedUser);
                setIsLoggedIn(true);
                setAuthError(null);
              }
            } catch (err: any) {
              if (isMounted) {
                setAuthError(err.message || 'आपली कर्मचारी माहिती Supabase मधून मिळवता आली नाही.');
              }
            }
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refreshed: maintain valid context without resetting state if already authenticated
          if (!userContext && newSession?.user) {
            try {
              const ctx = await currentUserService.getCurrentUserContext();
              if (ctx && isMounted) {
                setUserContext(ctx);
                const mappedUser = userContextToUserProfile(ctx);
                setUser(mappedUser);
                setIsLoggedIn(true);
                setAuthError(null);
              }
            } catch (err: any) {
              if (isMounted) {
                setAuthError(err.message || 'आपली कर्मचारी माहिती Supabase मधून मिळवता आली नाही.');
              }
            }
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            const wasManual = isManualLogoutRef.current;
            isManualLogoutRef.current = false;
            setUserContext(null);
            setUser(null);
            setIsLoggedIn(false);
            storage.removeItem('arogya_is_logged_in');
            storage.removeItem('arogya_current_user_profile');
            storage.removeItem('arogya_current_user_role');
            if (!wasManual) {
              setAuthError('आपले login session समाप्त झाले आहे. कृपया पुन्हा login करा.');
            } else {
              setAuthError(null);
            }
          }
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
  }, [resolveUserContext]);

  const loginWithRole = useCallback(async (selectedRole: UserRole) => {
    if (!isDemoMode()) {
      throw new Error('डेमो भूमिका फक्त चाचणीसाठी उपलब्ध आहेत.');
    }
    const loggedUser = await authService.loginWithRole(selectedRole);
    setUser(loggedUser);
    setIsLoggedIn(true);
    setAuthError(null);
  }, []);

  const loginWithEmail = useCallback(async (emailOrMobile: string, pass: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await authService.loginWithEmail(emailOrMobile, pass);
      // Immediately resolve authoritative fresh context
      const ctx = await currentUserService.getCurrentUserContext();
      if (ctx) {
        setUserContext(ctx);
        const mappedUser = userContextToUserProfile(ctx);
        setUser(mappedUser);
        setIsLoggedIn(true);
        setAuthError(null);
      } else {
        throw new Error('आपल्या खात्याची कर्मचारी माहिती उपलब्ध नाही. कृपया PHC नियंत्रकाशी संपर्क साधा.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'लॉगिन अयशस्वी.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    isManualLogoutRef.current = true;
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ action: 'CLEAR_CACHE' });
      }
      await authService.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
      setUserContext(null);
      setUser(null);
      setSession(null);
      setIsLoggedIn(false);
      setAuthError(null);
      storage.removeItem('arogya_is_logged_in');
      storage.removeItem('arogya_current_user_profile');
      storage.removeItem('arogya_current_user_role');
      setIsLoading(false);
    }
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
    await resolveUserContext();
  }, [user, resolveUserContext]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userContext,
        profile,
        authUser,
        session,
        role,
        isLoggedIn,
        isLoading,
        authError,
        isPhcController,
        isSubcentreStaff,
        applicableSubcentreIds,
        applicableVillageIds,
        loginWithRole,
        loginWithEmail,
        logout,
        switchRole,
        refreshUser,
        retryAuth,
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
