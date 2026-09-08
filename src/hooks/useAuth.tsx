import { storage } from '../lib/storage';
import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import React from 'react';
import { UserProfile, UserRole } from '../types';
import { authService, DEMO_USERS } from '../services/authService';
import { userService } from '../services/userService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isLoggedIn: boolean;
  isPhcController: boolean;
  isSubcentreStaff: boolean;
  loginWithRole: (role: UserRole) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  refreshUser: () => Promise<void>;
  updatePassword: (newPass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    return authService.getCurrentUser();
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const hasSession = storage.getItem('arogya_is_logged_in');
    return hasSession !== 'false';
  });

  const role: UserRole = user?.role || 'subcentre_employee';
  const isPhcController = role === 'phc_controller';
  const isSubcentreStaff = role === 'subcentre_employee';

  const refreshUser = useCallback(async () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  // Listen to Supabase Auth state changes if configured
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const profile = await userService.getProfileByAuthId(session.user.id);
          if (profile) {
            const hydrated = await userService.hydrateUserProfile(profile);
            setUser(hydrated);
            setIsLoggedIn(true);
            storage.setItem('arogya_is_logged_in', 'true');
          }
        } catch (e) {
          console.warn('Error loading auth profile on state change:', e);
        }
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        storage.setItem('arogya_is_logged_in', 'false');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginWithRole = useCallback(async (selectedRole: UserRole) => {
    const loggedUser = await authService.loginWithRole(selectedRole);
    setUser(loggedUser);
    setIsLoggedIn(true);
  }, []);

  const loginWithEmail = useCallback(async (email: string, pass: string) => {
    const loggedUser = await authService.loginWithEmail(email, pass);
    setUser(loggedUser);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ action: 'CLEAR_CACHE' });
    }
    await authService.logout();
    setIsLoggedIn(false);
  }, []);

  const switchRole = useCallback((newRole: UserRole) => {
    const newUser = DEMO_USERS[newRole];
    storage.setItem('arogya_current_user_role', newRole);
    storage.setItem('arogya_current_user_profile', JSON.stringify(newUser));
    storage.setItem('arogya_is_logged_in', 'true');
    setUser(newUser);
    setIsLoggedIn(true);
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
        isPhcController,
        isSubcentreStaff,
        loginWithRole,
        loginWithEmail,
        logout,
        switchRole,
        refreshUser,
        updatePassword,
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
