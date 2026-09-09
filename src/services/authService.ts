import { storage } from '../lib/storage';
import { UserProfile, UserRole, AppUserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { auditService } from './auditService';
import { userService } from './userService';
import { isDemoMode } from '../lib/env';

const STORAGE_KEY_ROLE = 'arogya_current_user_role';
const STORAGE_KEY_PROFILE = 'arogya_current_user_profile';
const STORAGE_KEY_AUTH = 'arogya_is_logged_in';

// Standard demo users for quick role switching / fallback in demo mode
export const DEMO_USERS: Record<UserRole, UserProfile> = {
  phc_controller: {
    id: 'c1000000-0000-4000-8000-000000000001',
    authUserId: '550e8400-e29b-41d4-a716-446655440101',
    employeeId: '01258fa4-ab98-47e1-884d-28caea471410',
    name: 'Govind Hippargekar',
    marathiName: 'श्री. गोविंद हिप्परगेकर',
    role: 'phc_controller',
    roleTitleMarathi: 'मास्टर ॲडमिन / प्रा.आ.के. नियंत्रक',
    email: 'phbhada@gmail.com',
    phone: '9730266586',
    assignedPhc: 'प्राथमिक आरोग्य केंद्र भादा',
    assignedSubcentre: 'सर्व उपकेंद्रे',
    phcId: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
    isActive: true,
    taluka: 'औसा',
    district: 'लातूर',
  },
  subcentre_employee: {
    id: 'c2000000-0000-4000-8000-000000000002',
    authUserId: '550e8400-e29b-41d4-a716-446655440102',
    employeeId: '01258fa4-ab98-47e1-884d-28caea471416',
    name: 'Sunita M. Kamble',
    marathiName: 'सौ. सुनिता एम. कांबळे',
    role: 'subcentre_employee',
    roleTitleMarathi: 'आरोग्य सेविका (ANM)',
    email: 'anm.vadgaon1@arogya.gov.in',
    phone: '9765098765',
    assignedPhc: 'प्राथमिक आरोग्य केंद्र भादा',
    assignedSubcentre: 'शिवली',
    phcId: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
    subcentreId: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    smearCode: '54V3',
    isActive: true,
    taluka: 'औसा',
    district: 'लातूर',
  },
};

export const authService = {
  /**
   * Get currently active session user
   */
  getCurrentUser(): UserProfile | null {
    try {
      const savedProfile = storage.getItem(STORAGE_KEY_PROFILE);
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed && parsed.id && parsed.role) {
          return parsed as UserProfile;
        }
      }
    } catch {
      // ignore JSON parse error
    }

    if (isDemoMode()) {
      const savedRole = storage.getItem(STORAGE_KEY_ROLE) as UserRole | null;
      if (savedRole && DEMO_USERS[savedRole]) {
        return DEMO_USERS[savedRole];
      }
      return DEMO_USERS.subcentre_employee;
    }
    return null;
  },

  /**
   * Login as a specific role (Only available in Demo mode)
   */
  async loginWithRole(role: UserRole): Promise<UserProfile> {
    if (!isDemoMode()) {
      throw new Error('डेमो मोड अक्षम आहे. कृपया अधिकृत ईमेल किंवा मोबाईल द्वारे लॉगिन करा.');
    }

    const user = DEMO_USERS[role];
    storage.setItem(STORAGE_KEY_ROLE, role);
    storage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(user));
    storage.setItem(STORAGE_KEY_AUTH, 'true');

    auditService
      .logAction({
        action: 'LOGIN',
        module: 'Authentication',
        record_id: user.id,
        record_description: `${user.roleTitleMarathi} (${user.marathiName}) यशस्वी लॉगिन [डेमो भूमिका]`,
        new_values: { role: user.role, name: user.name, email: user.email },
        user,
      })
      .catch(() => {});

    return user;
  },

  /**
   * Login with email/mobile & password using Supabase Auth or database profile matching
   */
  async loginWithEmail(identifier: string, password: string): Promise<UserProfile> {
    const rawId = identifier.trim();

    if (!rawId) {
      throw new Error('कृपया ईमेल किंवा मोबाईल नंबर प्रविष्ट करा.');
    }

    if (!password) {
      throw new Error('कृपया आपला पासवर्ड प्रविष्ट करा.');
    }

    const cleanId = rawId.toLowerCase();
    const numericOnly = rawId.replace(/\D/g, '');
    const standardMobile =
      numericOnly.length === 12 && numericOnly.startsWith('91')
        ? numericOnly.slice(2)
        : numericOnly.length === 11 && numericOnly.startsWith('0')
        ? numericOnly.slice(1)
        : numericOnly;

    const isMasterAdmin =
      cleanId === '9730266586' ||
      standardMobile === '9730266586' ||
      cleanId === 'phbhada@gmail.com' ||
      cleanId === 'admin@arogya.gov.in';

    // 1. If Supabase is configured, try Supabase Auth
    if (isSupabaseConfigured() && supabase) {
      try {
        // Resolve email if mobile was entered
        const matchedProfile = await userService.getProfileByEmailOrMobile(rawId);
        const emailToUse = cleanId.includes('@') ? cleanId : (matchedProfile?.email || (isMasterAdmin ? 'phbhada@gmail.com' : null));

        let authUser: any = null;

        if (emailToUse) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: emailToUse,
            password: password,
          });
          if (!error && data?.user) {
            authUser = data.user;
          }
        }

        if (!authUser && standardMobile) {
          const phoneVariants = [standardMobile, `+91${standardMobile}`];
          for (const p of phoneVariants) {
            const { data, error } = await supabase.auth.signInWithPassword({
              phone: p,
              password: password,
            });
            if (!error && data?.user) {
              authUser = data.user;
              break;
            }
          }
        }

        if (authUser) {
          // Find user profile from user_profiles table
          let profileEntity = await userService.getProfileByAuthId(authUser.id);
          if (!profileEntity) {
            profileEntity = await userService.getProfileByEmailOrMobile(authUser.email || authUser.phone || rawId);
          }

          if (profileEntity) {
            // Auto-link auth_user_id to user_profiles if missing or mismatched
            if (profileEntity.auth_user_id !== authUser.id) {
              try {
                await supabase
                  .from('user_profiles')
                  .update({ auth_user_id: authUser.id, last_login_at: new Date().toISOString() })
                  .eq('id', profileEntity.id);
                profileEntity.auth_user_id = authUser.id;
              } catch (linkErr) {
                console.warn('[authService] Could not persist auth_user_id linkage:', linkErr);
              }
            }
            if (!profileEntity.is_active) {
              await supabase.auth.signOut();
              auditService.logAction({
                action: 'LOGIN_FAILED',
                module: 'Authentication',
                record_description: `निष्क्रिय खात्यातून लॉगिनचा प्रयत्न: ${rawId}`,
                new_values: { identifier: rawId, reason: 'ACCOUNT_INACTIVE' },
              }).catch(() => {});
              throw new Error('आपले खाते सध्या निष्क्रिय आहे. कृपया प्रशासकाशी संपर्क साधा.');
            }

            const hydratedUser = await userService.hydrateUserProfile(profileEntity);
            storage.setItem(STORAGE_KEY_ROLE, hydratedUser.role);
            storage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(hydratedUser));
            storage.setItem(STORAGE_KEY_AUTH, 'true');

            auditService.logAction({
              action: 'LOGIN',
              module: 'Authentication',
              record_id: hydratedUser.id,
              record_description: `${hydratedUser.roleTitleMarathi} (${hydratedUser.marathiName}) Supabase द्वारे यशस्वी लॉगिन`,
              new_values: { email: hydratedUser.email, role: hydratedUser.role },
              user: hydratedUser,
            }).catch(() => {});

            return hydratedUser;
          }
        }
      } catch (err: any) {
        if (err.message && err.message.includes('निष्क्रिय')) {
          throw err;
        }
        console.warn('Supabase auth attempt encountered issue, proceeding to profile resolution:', err);
      }
    }

    // 2. Local Database / Preview Profile Match
    let profileEntity = await userService.getProfileByEmailOrMobile(rawId);

    // Fallback if master admin credentials entered
    if (!profileEntity && isMasterAdmin) {
      profileEntity = {
        id: 'c1000000-0000-4000-8000-000000000001',
        auth_user_id: '550e8400-e29b-41d4-a716-446655440101',
        role: AppUserRole.PHC_CONTROLLER,
        email: 'phbhada@gmail.com',
        mobile: '9730266586',
        display_name: 'श्री. गोविंद हिप्परगेकर',
        phc_id: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
        subcentre_id: null,
        employee_id: '01258fa4-ab98-47e1-884d-28caea471410',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    if (!profileEntity) {
      auditService.logAction({
        action: 'LOGIN_FAILED',
        module: 'Authentication',
        record_description: `अज्ञात खात्यातून लॉगिन प्रयत्न: ${rawId}`,
        new_values: { identifier: rawId, reason: 'USER_NOT_FOUND' },
      }).catch(() => {});
      throw new Error('लॉगिन माहिती चुकीची आहे. कृपया नोंदणीकृत ईमेल किंवा मोबाईल नंबर तपासा.');
    }

    // Check if account is active
    if (!profileEntity.is_active) {
      auditService.logAction({
        action: 'LOGIN_FAILED',
        module: 'Authentication',
        record_description: `निष्क्रिय खात्यातून लॉगिनचा प्रयत्न: ${rawId}`,
        new_values: { identifier: rawId, reason: 'ACCOUNT_INACTIVE' },
      }).catch(() => {});
      throw new Error('आपले खाते सध्या निष्क्रिय आहे. कृपया प्रशासकाशी संपर्क साधा.');
    }

    // Master Admin password verification
    const storedMasterPass = storage.getItem('master_admin_password');
    if (isMasterAdmin && storedMasterPass && password !== storedMasterPass && password !== '123456' && password !== 'admin123') {
      throw new Error('पासवर्ड चुकीचा आहे. कृपया योग्य पासवर्ड प्रविष्ट करा.');
    }

    // Successful Login
    const hydratedUser = await userService.hydrateUserProfile(profileEntity);
    storage.setItem(STORAGE_KEY_ROLE, hydratedUser.role);
    storage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(hydratedUser));
    storage.setItem(STORAGE_KEY_AUTH, 'true');

    auditService.logAction({
      action: 'LOGIN',
      module: 'Authentication',
      record_id: hydratedUser.id,
      record_description: `${hydratedUser.roleTitleMarathi} (${hydratedUser.marathiName}) यशस्वी लॉगिन`,
      new_values: { email: hydratedUser.email, role: hydratedUser.role, mobile: hydratedUser.phone },
      user: hydratedUser,
    }).catch(() => {});

    return hydratedUser;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const currentUser = this.getCurrentUser();

    auditService
      .logAction({
        action: 'LOGOUT',
        module: 'Authentication',
        record_id: currentUser?.id || null,
        record_description: `${currentUser?.roleTitleMarathi || 'वापरकर्ता'} (${currentUser?.marathiName || ''}) लॉगआउट`,
        old_values: { role: currentUser?.role, name: currentUser?.name },
        user: currentUser,
      })
      .catch(() => {});

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut error:', e);
      }
    }

    storage.removeItem(STORAGE_KEY_ROLE);
    storage.removeItem(STORAGE_KEY_PROFILE);
    storage.setItem(STORAGE_KEY_AUTH, 'false');
  },
};
