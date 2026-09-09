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

/**
 * Detailed diagnostic auditor that verifies and logs the complete linkage chain:
 * auth.users.id -> user_profiles.auth_user_id -> employee_master.id
 */
async function auditAuthLinkageChain(
  stage: string,
  authUserId: string | null | undefined,
  sessionUser?: any,
  loginIdentifier?: string,
  error?: any
) {
  try {
    const isSupabase = isSupabaseConfigured() && !!supabase;
    console.group(`[useAuth:AuthLinkageAudit] [${stage}] 🔍 Verifying Auth Linkage Chain`);
    console.info(`[useAuth] Tracing authoritative chain: auth.users.id -> user_profiles.auth_user_id -> employee_master.id`);

    // Step 1: auth.users identity
    const authId = authUserId || sessionUser?.id || null;
    const authEmail = sessionUser?.email || null;
    const authPhone = sessionUser?.phone || null;

    console.log(`[useAuth] Step 1: Supabase Auth Identity (auth.users)`, {
      authUserId: authId || 'NO_AUTH_USER_ID',
      email: authEmail,
      phone: authPhone,
      isSupabaseActive: isSupabase,
      loginIdentifier: loginIdentifier || null,
    });

    if (!isSupabase) {
      console.log(`[useAuth] ℹ️ Supabase not active. Operating in local / offline storage mode.`);
      console.groupEnd();
      return;
    }

    if (!authId) {
      console.warn(`[useAuth] ⚠️ No auth.users.id found in active session.`);
      if (loginIdentifier) {
        const cleanPhone = loginIdentifier.replace(/\D/g, '').slice(-10);
        let empQuery = supabase!.from('employee_master').select('id, employee_name, malaria_smear_code, mobile_number, email, is_active');
        if (loginIdentifier.includes('@')) {
          empQuery = empQuery.ilike('email', loginIdentifier.trim());
        } else if (cleanPhone) {
          empQuery = empQuery.or(`mobile_number.eq.${cleanPhone},mobile_number.eq.+91${cleanPhone}`);
        }
        const { data: emps } = await empQuery.limit(2);
        console.log(`[useAuth] Checking if user exists in employee_master for identifier "${loginIdentifier}":`, emps);
      }
      console.groupEnd();
      return;
    }

    // Step 2: Query user_profiles by auth_user_id
    let { data: profileByAuth, error: profileErr } = await supabase!
      .from('user_profiles')
      .select('id, auth_user_id, employee_id, role, email, mobile, display_name, is_active, last_login_at')
      .eq('auth_user_id', authId)
      .maybeSingle();

    if (profileErr) {
      console.error(`[useAuth] ❌ Error querying user_profiles by auth_user_id:`, profileErr.message);
    }

    let profileMatchSource = 'EXACT_AUTH_USER_ID';
    let profile: any = profileByAuth;

    // If not found by auth_user_id, inspect if profile exists by email/mobile to auto-link
    if (!profile) {
      console.warn(`[useAuth] ⚠️ Step 2: No user_profiles record matches auth_user_id="${authId}". Checking email/mobile fallback...`);
      const searchEmail = authEmail || (loginIdentifier?.includes('@') ? loginIdentifier : null);
      const rawPhone = authPhone || (!loginIdentifier?.includes('@') ? loginIdentifier : null);
      const cleanPhone = rawPhone ? rawPhone.replace(/\D/g, '').slice(-10) : null;

      let fallbackQuery = supabase!.from('user_profiles').select('id, auth_user_id, employee_id, role, email, mobile, display_name, is_active, last_login_at');
      if (searchEmail && cleanPhone) {
        fallbackQuery = fallbackQuery.or(`email.ilike.${searchEmail.trim().toLowerCase()},mobile.eq.${cleanPhone},mobile.eq.+91${cleanPhone}`);
      } else if (searchEmail) {
        fallbackQuery = fallbackQuery.ilike('email', searchEmail.trim().toLowerCase());
      } else if (cleanPhone) {
        fallbackQuery = fallbackQuery.or(`mobile.eq.${cleanPhone},mobile.eq.+91${cleanPhone}`);
      }

      const { data: matchedProfiles } = await fallbackQuery.limit(3);
      if (matchedProfiles && matchedProfiles.length > 0) {
        profile = matchedProfiles[0];
        profileMatchSource = 'FALLBACK_EMAIL_OR_MOBILE';
        console.warn(`[useAuth] ⚠️ Found user_profile by ${profileMatchSource}, but auth_user_id in DB is "${profile.auth_user_id || 'NULL'}" (expected "${authId}"). Auto-linking needed.`);
      } else {
        console.error(`[useAuth] ❌ No user_profile found by auth_user_id, email, or mobile.`);
      }
    }

    console.log(`[useAuth] Step 2: user_profiles Record:`, {
      found: !!profile,
      matchSource: profile ? profileMatchSource : 'NONE',
      profileId: profile?.id || null,
      authUserIdInProfile: profile?.auth_user_id || null,
      matchesCurrentAuthUser: profile?.auth_user_id === authId,
      role: profile?.role || null,
      displayName: profile?.display_name || null,
      employeeId: profile?.employee_id || null,
      isActive: profile?.is_active ?? null,
    });

    // Step 3: Query employee_master
    const targetEmployeeId = profile?.employee_id;
    let employeeRecord: any = null;
    let employeeLookupSource = 'BY_EMPLOYEE_ID';

    if (targetEmployeeId) {
      const { data: emp, error: empErr } = await supabase!
        .from('employee_master')
        .select('id, employee_name, designation, malaria_smear_code, mobile_number, email, subcentre_id, is_active')
        .eq('id', targetEmployeeId)
        .maybeSingle();

      if (empErr) {
        console.error(`[useAuth] ❌ Error querying employee_master by id "${targetEmployeeId}":`, empErr.message);
      }
      employeeRecord = emp;
    } else {
      console.warn(`[useAuth] ⚠️ user_profiles.employee_id is null or missing! Checking employee_master by credentials...`);
      const searchEmail = profile?.email || authEmail || (loginIdentifier?.includes('@') ? loginIdentifier : null);
      const rawPhone = profile?.mobile || authPhone || (!loginIdentifier?.includes('@') ? loginIdentifier : null);
      const cleanPhone = rawPhone ? rawPhone.replace(/\D/g, '').slice(-10) : null;

      let empFallbackQuery = supabase!.from('employee_master').select('id, employee_name, designation, malaria_smear_code, mobile_number, email, subcentre_id, is_active');
      if (searchEmail && cleanPhone) {
        empFallbackQuery = empFallbackQuery.or(`email.ilike.${searchEmail.trim()},mobile_number.eq.${cleanPhone},mobile_number.eq.+91${cleanPhone}`);
      } else if (searchEmail) {
        empFallbackQuery = empFallbackQuery.ilike('email', searchEmail.trim());
      } else if (cleanPhone) {
        empFallbackQuery = empFallbackQuery.or(`mobile_number.eq.${cleanPhone},mobile_number.eq.+91${cleanPhone}`);
      }
      const { data: matchedEmps } = await empFallbackQuery.limit(1);
      if (matchedEmps && matchedEmps.length > 0) {
        employeeRecord = matchedEmps[0];
        employeeLookupSource = 'FALLBACK_EMAIL_OR_MOBILE';
        console.warn(`[useAuth] ⚠️ Found matching employee in employee_master by ${employeeLookupSource}: id="${employeeRecord.id}", name="${employeeRecord.employee_name}".`);
      }
    }

    console.log(`[useAuth] Step 3: employee_master Record:`, {
      found: !!employeeRecord,
      lookupSource: employeeRecord ? employeeLookupSource : 'NONE',
      employeeId: employeeRecord?.id || null,
      employeeName: employeeRecord?.employee_name || null,
      designation: employeeRecord?.designation || null,
      smearCode: employeeRecord?.malaria_smear_code || null,
      subcentreId: employeeRecord?.subcentre_id || null,
      mobileNumber: employeeRecord?.mobile_number || null,
      email: employeeRecord?.email || null,
      isActive: employeeRecord?.is_active ?? null,
    });

    // Step 4: Diagnostic Summary Matrix
    const isAuthLinked = Boolean(profile && profile.auth_user_id === authId);
    const isEmployeeLinked = Boolean(profile && employeeRecord && profile.employee_id === employeeRecord.id);
    const isProfileActive = Boolean(profile && profile.is_active);
    const isEmployeeActive = Boolean(employeeRecord && employeeRecord.is_active);
    const isChainFullyValid = isAuthLinked && isEmployeeLinked && isProfileActive && isEmployeeActive;

    console.log(`[useAuth] Step 4: Chain Diagnostic Summary:`, {
      '1. auth.users.id': authId,
      '2. user_profiles.auth_user_id linked': isAuthLinked ? '✅ SUCCESS (Matches auth.users.id)' : '❌ FAILED / MISMATCH',
      '3. user_profiles.employee_id linked': isEmployeeLinked ? '✅ SUCCESS (Points to employee_master record)' : '❌ FAILED / NOT LINKED',
      '4. user_profiles.is_active': isProfileActive ? '✅ ACTIVE' : '❌ INACTIVE',
      '5. employee_master.is_active': isEmployeeActive ? '✅ ACTIVE' : '❌ INACTIVE',
      'Overall Linkage Status': isChainFullyValid ? '🟢 COMPLETE & AUTHORITATIVE' : '🔴 BROKEN / INCOMPLETE',
    });

    if (error) {
      console.error(`[useAuth] ❌ Encountered Error during [${stage}]:`, error);
    }
  } catch (auditErr) {
    console.warn('[useAuth] Error running linkage audit:', auditErr);
  } finally {
    console.groupEnd();
  }
}

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
          const sUser = sessionData.session.user;
          console.log(`[useAuth:resolveUserContext] Active session detected with auth.users.id="${sUser.id}"`);
          await auditAuthLinkageChain('resolveUserContext:ActiveSession', sUser.id, sUser);

          const ctx = await currentUserService.getCurrentUserContext();
          if (ctx) {
            console.log(`[useAuth:resolveUserContext] Context resolved for employee: ${ctx.employeeName} (${ctx.role})`);
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

      // If no Supabase session or not configured, check stored active session
      const localUser = authService.getCurrentUser();
      if (localUser && storage.getItem('arogya_is_logged_in') === 'true') {
        let ctx = null;
        try {
          ctx = await currentUserService.getCurrentUserContext();
        } catch (e) {
          console.warn('[AuthProvider] Local context resolution fallback:', e);
        }
        if (ctx) {
          setUserContext(ctx);
          setUser(userContextToUserProfile(ctx));
        } else {
          setUser(localUser);
        }
        setIsLoggedIn(true);
        setAuthError(null);
        return;
      }

      // No active session found
      setUserContext(null);
      setUser(null);
      setIsLoggedIn(false);
    } catch (err: any) {
      console.error('[AuthProvider] Error resolving user context:', err);
      if (isSupabaseConfigured() && supabase) {
        supabase.auth.getSession().then(({ data }) => {
          auditAuthLinkageChain('resolveUserContext:Error', data?.session?.user?.id, data?.session?.user, undefined, err);
        }).catch(() => {});
      }
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
              console.log(`[useAuth:onAuthStateChange] ⚡ Event ${event} for auth.users.id="${newSession.user.id}"`);
              await auditAuthLinkageChain(`onAuthStateChange:${event}`, newSession.user.id, newSession.user);
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
              console.log(`[useAuth:onAuthStateChange] ⚡ Token refreshed for auth.users.id="${newSession.user.id}"`);
              await auditAuthLinkageChain('onAuthStateChange:TOKEN_REFRESHED', newSession.user.id, newSession.user);
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
    console.group(`[useAuth:LoginFlow] 🔐 Login Initiated for "${emailOrMobile}"`);
    console.log(`[useAuth:LoginFlow] Step A: Authenticating credentials via authService...`);

    try {
      const loggedUser = await authService.loginWithEmail(emailOrMobile, pass);
      console.log(`[useAuth:LoginFlow] Step B: authService authenticated user:`, {
        id: loggedUser.id,
        authUserId: loggedUser.authUserId,
        role: loggedUser.role,
        name: loggedUser.name,
        email: loggedUser.email,
        phone: loggedUser.phone,
      });

      // Fetch active session from Supabase to capture auth.users.id
      let sessionUserId: string | null = null;
      let sessionUserObj: any = null;
      if (isSupabaseConfigured() && supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        sessionUserObj = sessionData?.session?.user;
        sessionUserId = sessionUserObj?.id || null;
      }

      console.log(`[useAuth:LoginFlow] Step C: Supabase auth.users verification:`, {
        authUsersId: sessionUserId || loggedUser.authUserId || 'None (Local / Preview Profile)',
        email: sessionUserObj?.email || loggedUser.email,
        phone: sessionUserObj?.phone || loggedUser.phone,
      });

      // Perform the comprehensive chain audit
      await auditAuthLinkageChain(
        'loginWithEmail:PostAuthService',
        sessionUserId || loggedUser.authUserId,
        sessionUserObj,
        emailOrMobile
      );

      // Immediately resolve authoritative fresh context
      console.log(`[useAuth:LoginFlow] Step D: Resolving authoritative user context (auth.users.id -> user_profiles -> employee_master)...`);
      let ctx: CurrentUserContext | null = null;
      try {
        ctx = await currentUserService.getCurrentUserContext();
      } catch (e: any) {
        console.warn('[useAuth:LoginFlow] ⚠️ Context resolution warning after login:', e);
        await auditAuthLinkageChain(
          'loginWithEmail:ContextResolutionError',
          sessionUserId || loggedUser.authUserId,
          sessionUserObj,
          emailOrMobile,
          e
        );
        throw e;
      }

      if (ctx) {
        console.log(`[useAuth:LoginFlow] Step E: ✅ Authoritative Context Resolved Successfully:`, {
          role: ctx.role,
          employeeName: ctx.employeeName,
          employeeId: ctx.employeeId,
          authUserId: ctx.authUserId,
          profileId: ctx.profileId,
          subcentreId: ctx.subcentreId,
          phcId: ctx.phcId,
          applicableSubcentresCount: ctx.applicableSubcentreIds?.length || 0,
          applicableVillagesCount: ctx.applicableVillageIds?.length || 0,
        });
        setUserContext(ctx);
        const mappedUser = userContextToUserProfile(ctx);
        setUser(mappedUser);
      } else {
        console.log(`[useAuth:LoginFlow] Step E: Context is null, falling back to loggedUser profile`);
        setUser(loggedUser);
      }

      setIsLoggedIn(true);
      setAuthError(null);
      console.log(`[useAuth:LoginFlow] 🎉 Login flow completed successfully!`);
    } catch (err: any) {
      console.error(`[useAuth:LoginFlow] ❌ Login flow failed with error:`, err.message || err);
      try {
        let failureSessionId: string | null = null;
        let failureSessionUser: any = null;
        if (isSupabaseConfigured() && supabase) {
          const { data: sess } = await supabase.auth.getSession();
          failureSessionUser = sess?.session?.user;
          failureSessionId = failureSessionUser?.id || null;
        }
        await auditAuthLinkageChain(
          'loginWithEmail:CaughtError',
          failureSessionId,
          failureSessionUser,
          emailOrMobile,
          err
        );
      } catch {
        // silent
      }
      setAuthError(err.message || 'लॉगिन अयशस्वी.');
      throw err;
    } finally {
      console.groupEnd();
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
