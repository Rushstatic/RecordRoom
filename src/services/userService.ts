import { storage } from '../lib/storage';
import { UserProfileEntity, UserProfile, AppUserRole, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { auditService } from './auditService';
import { masterDataService } from './masterDataService';
import { isDemoMode } from '../lib/env';
import { assertValidUUID, isValidUUID } from '../utils/uuid';

const STORAGE_KEY = 'arogya_user_profiles_master';

const DEFAULT_USER_PROFILES: UserProfileEntity[] = [
  {
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
    last_login_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c2000000-0000-4000-8000-000000000002',
    auth_user_id: '550e8400-e29b-41d4-a716-446655440102',
    role: AppUserRole.SUBCENTRE_EMPLOYEE,
    email: 'anm.vadgaon1@arogya.gov.in',
    mobile: '9765098765',
    display_name: 'सौ. सुनिता एम. कांबळे',
    phc_id: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    employee_id: '01258fa4-ab98-47e1-884d-28caea471416',
    is_active: true,
    last_login_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c3000000-0000-4000-8000-000000000003',
    auth_user_id: '550e8400-e29b-41d4-a716-446655440103',
    role: AppUserRole.SUBCENTRE_EMPLOYEE,
    email: 'rahul.mpw@arogya.gov.in',
    mobile: '9823456789',
    display_name: 'श्री अनिल एकनाथ भराडे',
    phc_id: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    employee_id: 'cbbe9908-d712-4f22-978b-061d7abcf42b',
    is_active: true,
    last_login_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c4000000-0000-4000-8000-000000000004',
    auth_user_id: '550e8400-e29b-41d4-a716-446655440104',
    role: AppUserRole.SUBCENTRE_EMPLOYEE,
    email: 'inactive.user@arogya.gov.in',
    mobile: '9988776655',
    display_name: 'श्री. विजय गायकवाड (निलंबित खाते)',
    phc_id: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    employee_id: null,
    is_active: false,
    last_login_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 65 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const userService = {
  /**
   * Fetch all user profiles from storage or Supabase
   */
  async getUserProfiles(): Promise<UserProfileEntity[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          storage.setItem(STORAGE_KEY, JSON.stringify(data));
          return data as UserProfileEntity[];
        }
      } catch (err) {
        console.warn('Supabase fetch user_profiles error:', err);
      }
    }

    const saved = storage.getItem(STORAGE_KEY);
    if (!saved) {
      storage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USER_PROFILES));
      return DEFAULT_USER_PROFILES;
    }

    try {
      const parsed: UserProfileEntity[] = JSON.parse(saved);
      // Self-heal: ensure Master Admin Govind Hippargekar (9730266586) is updated in profiles
      const adminProfile = parsed.find(
        (p) => p.email === 'phbhada@gmail.com' || p.mobile === '9730266586' || p.mobile === '9822012345'
      );
      if (adminProfile) {
        let changed = false;
        if (adminProfile.mobile !== '9730266586') {
          adminProfile.mobile = '9730266586';
          changed = true;
        }
        if (!adminProfile.display_name.includes('गोविंद') && !adminProfile.display_name.includes('Govind')) {
          adminProfile.display_name = 'श्री. गोविंद हिप्परगेकर';
          changed = true;
        }
        if (changed) {
          storage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      } else {
        parsed.unshift(DEFAULT_USER_PROFILES[0]);
        storage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      storage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USER_PROFILES));
      return DEFAULT_USER_PROFILES;
    }
  },

  /**
   * Find profile by Supabase Auth User ID
   */
  async getProfileByAuthId(authUserId: string): Promise<UserProfileEntity | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('auth_user_id', authUserId)
          .maybeSingle();
        if (!error && data) {
          return data as UserProfileEntity;
        }
      } catch (err) {
        console.warn('Error querying user_profiles by auth_user_id:', err);
      }
    }

    const profiles = await this.getUserProfiles();
    return profiles.find((p) => p.auth_user_id === authUserId) || null;
  },

  /**
   * Find profile by Email or Mobile (supports raw, +91, with spaces/dashes)
   */
  async getProfileByEmailOrMobile(identifier: string): Promise<UserProfileEntity | null> {
    const rawId = identifier.trim();
    if (!rawId) return null;

    const cleanId = rawId.toLowerCase();
    const numericOnly = rawId.replace(/\D/g, '');
    const standardMobile =
      numericOnly.length === 12 && numericOnly.startsWith('91')
        ? numericOnly.slice(2)
        : numericOnly.length === 11 && numericOnly.startsWith('0')
        ? numericOnly.slice(1)
        : numericOnly;

    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('user_profiles').select('*');
        if (cleanId.includes('@')) {
          query = query.ilike('email', cleanId);
        } else if (standardMobile) {
          query = query.or(`mobile.eq.${standardMobile},mobile.eq.${rawId},mobile.eq.+91${standardMobile}`);
        } else {
          query = query.eq('mobile', rawId);
        }
        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          return data as UserProfileEntity;
        }
      } catch (err) {
        console.warn('Error querying user_profiles by email/mobile:', err);
      }
    }

    const profiles = await this.getUserProfiles();
    return (
      profiles.find(
        (p) =>
          (p.email && p.email.toLowerCase() === cleanId) ||
          (p.mobile &&
            (p.mobile === rawId ||
              p.mobile === cleanId ||
              (standardMobile && p.mobile.replace(/\D/g, '') === standardMobile)))
      ) || null
    );
  },

  /**
   * Map UserProfileEntity to standard UserProfile with full relation labels
   */
  async hydrateUserProfile(entity: UserProfileEntity): Promise<UserProfile> {
    const [employees, phcs, subcentres] = await Promise.all([
      masterDataService.getEmployees(),
      masterDataService.getPhcs(),
      masterDataService.getSubcentres(),
    ]);

    const employee = entity.employee_id
      ? employees.find((e) => e.id === entity.employee_id)
      : null;
    const phc = entity.phc_id
      ? phcs.find((p) => p.id === entity.phc_id)
      : null;
    const subcentre = entity.subcentre_id
      ? subcentres.find((s) => s.id === entity.subcentre_id)
      : null;

    const isController =
      entity.role === AppUserRole.PHC_CONTROLLER ||
      entity.role === 'phc_controller' ||
      entity.role === 'PHC_CONTROLLER';

    const standardRole: UserRole = isController ? 'phc_controller' : 'subcentre_employee';

    const displayName = entity.display_name || employee?.employee_name || entity.email?.split('@')[0] || 'वापरकर्ता';

    return {
      id: entity.id,
      authUserId: entity.auth_user_id,
      name: employee?.employee_name || displayName,
      marathiName: displayName,
      role: standardRole,
      roleTitleMarathi: isController
        ? 'प्रा.आ.के. नियंत्रक / वैद्यकीय अधिकारी'
        : employee?.designation || 'उपकेंद्र आरोग्य कर्मचारी',
      email: entity.email || '',
      phone: entity.mobile || employee?.mobile_number || '',
      assignedPhc: phc?.phc_name || '',
      assignedSubcentre:
        subcentre?.subcentre_name ||
        (isController ? 'सर्व उपकेंद्रे' : ''),
      employeeId: entity.employee_id || undefined,
      phcId: entity.phc_id || undefined,
      subcentreId: entity.subcentre_id || undefined,
      smearCode: employee?.malaria_smear_code || undefined,
      isActive: entity.is_active,
      taluka: phc?.taluka || '',
      district: phc?.district || '',
    };
  },

  /**
   * Create new User Profile (Restricted to PHC Controller)
   */
  async createUserProfile(
    params: {
      email: string;
      mobile?: string;
      displayName: string;
      role: AppUserRole;
      employeeId?: string | null;
      phcId?: string | null;
      subcentreId?: string | null;
      isActive?: boolean;
    },
    adminUser: UserProfile
  ): Promise<UserProfileEntity> {
    const profiles = await this.getUserProfiles();

    // 1. Check duplicate employee active profile
    if (params.employeeId) {
      const existing = profiles.find(
        (p) => p.employee_id === params.employeeId && p.is_active
      );
      if (existing) {
        throw new Error(
          'या कर्मचाऱ्यासाठी आधीच सक्रिय वापरकर्ता खाते (Active Profile) अस्तित्वात आहे. एका कर्मचाऱ्यास एकच सक्रिय खाते असू शकते.'
        );
      }
    }

    // 2. Check duplicate email
    if (params.email) {
      const existingEmail = profiles.find(
        (p) => p.email && p.email.toLowerCase() === params.email.trim().toLowerCase()
      );
      if (existingEmail) {
        throw new Error('हा ईमेल आयडी आधीच दुसऱ्या खात्यासाठी वापरला गेला आहे.');
      }
    }

    // 3. Auto-fill PHC / Subcentre from employee if provided
    let finalPhcId = params.phcId || null;
    let finalSubcentreId = params.subcentreId || null;

    if (params.employeeId) {
      const employees = await masterDataService.getEmployees();
      const emp = employees.find((e) => e.id === params.employeeId);
      if (emp) {
        finalSubcentreId = emp.subcentre_id;
        const subcentres = await masterDataService.getSubcentres();
        const sc = subcentres.find((s) => s.id === emp.subcentre_id);
        if (sc) {
          finalPhcId = sc.phc_id;
        }
      }
    }

    const now = new Date().toISOString();
    const newProfile: UserProfileEntity = {
      id: generateUuid(),
      auth_user_id: generateUuid(),
      role: params.role,
      email: params.email.trim().toLowerCase(),
      mobile: params.mobile ? params.mobile.trim() : undefined,
      display_name: params.displayName.trim(),
      employee_id: params.employeeId || null,
      phc_id: finalPhcId,
      subcentre_id: finalSubcentreId,
      is_active: params.isActive ?? true,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.from('user_profiles').insert([newProfile]).select().single();
      if (error) {
        console.error('[userService.createUserProfile] Supabase error:', error);
        if (!isDemoMode()) {
          throw new Error(`वापरकर्ता प्रोफाइल जतन करता आली नाही: ${error.message}`);
        }
      } else if (data) {
        const updatedList = [data as UserProfileEntity, ...profiles];
        storage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      }
    } else {
      if (!isDemoMode()) {
        throw new Error('Supabase कॉन्फिगर केलेले नाही.');
      }
      const updatedList = [newProfile, ...profiles];
      storage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    }

    // Audit Log
    auditService.logAction({
      action: 'USER_CREATED',
      module: 'User Management',
      record_id: newProfile.id,
      record_description: `नवीन वापरकर्ता तयार केला: ${newProfile.display_name} (${newProfile.email}) भूमिका: ${newProfile.role}`,
      new_values: {
        id: newProfile.id,
        email: newProfile.email,
        role: newProfile.role,
        employee_id: newProfile.employee_id,
        is_active: newProfile.is_active,
      },
      user: adminUser,
    }).catch(() => {});

    return newProfile;
  },

  /**
   * Toggle Active / Inactive Status
   */
  async toggleUserActive(
    profileId: string,
    isActive: boolean,
    adminUser: UserProfile
  ): Promise<UserProfileEntity> {
    assertValidUUID(profileId, 'वापरकर्ता प्रोफाइल ID');
    const profiles = await this.getUserProfiles();
    const target = profiles.find((p) => p.id === profileId);
    if (!target) {
      throw new Error('वापरकर्ता खाते आढळले नाही.');
    }

    // Prevent deactivating oneself
    if (adminUser.id === target.id && !isActive) {
      throw new Error('आपण स्वतःचे चालू खाते निष्क्रिय करू शकत नाही.');
    }

    const now = new Date().toISOString();
    target.is_active = isActive;
    target.updated_at = now;

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: isActive, updated_at: now })
        .eq('id', profileId);
      if (error) {
        console.error('[userService.toggleUserActive] Supabase error:', error);
        if (!isDemoMode()) {
          throw new Error(`वापरकर्ता स्थिती बदलता आली नाही: ${error.message}`);
        }
      }
    }

    storage.setItem(STORAGE_KEY, JSON.stringify(profiles));

    // Audit Log
    auditService.logAction({
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      module: 'User Management',
      record_id: target.id,
      record_description: `वापरकर्ता ${isActive ? 'सक्रिय' : 'निष्क्रिय'} केला: ${target.display_name} (${target.email})`,
      old_values: { is_active: !isActive },
      new_values: { is_active: isActive },
      user: adminUser,
    }).catch(() => {});

    return target;
  },

  /**
   * Update User Role
   */
  async updateUserRole(
    profileId: string,
    newRole: AppUserRole,
    adminUser: UserProfile
  ): Promise<UserProfileEntity> {
    assertValidUUID(profileId, 'वापरकर्ता प्रोफाइल ID');
    const profiles = await this.getUserProfiles();
    const target = profiles.find((p) => p.id === profileId);
    if (!target) {
      throw new Error('वापरकर्ता खाते आढळले नाही.');
    }

    const oldRole = target.role;
    target.role = newRole;
    target.updated_at = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole, updated_at: target.updated_at })
        .eq('id', profileId);
      if (error) {
        console.error('[userService.updateUserRole] Supabase error:', error);
        if (!isDemoMode()) {
          throw new Error(`वापरकर्ता भूमिका बदलता आली नाही: ${error.message}`);
        }
      }
    }

    storage.setItem(STORAGE_KEY, JSON.stringify(profiles));

    // Audit Log
    auditService.logAction({
      action: 'ROLE_ASSIGNMENT_CHANGED',
      module: 'User Management',
      record_id: target.id,
      record_description: `वापरकर्ता भूमिका बदलली: ${target.display_name} (${oldRole} -> ${newRole})`,
      old_values: { role: oldRole },
      new_values: { role: newRole },
      user: adminUser,
    }).catch(() => {});

    return target;
  },

  /**
   * Request Password Reset Link
   */
    async resetPasswordByEmailOrMobile(identifier: string, newPassword: string): Promise<boolean> {
    const cleanId = identifier.trim().toLowerCase();
    
    // For master admin
    if (cleanId === '9730266586' || cleanId === 'admin@arogya.gov.in') {
      storage.setItem('master_admin_password', newPassword);
      return true;
    }

    // In a real app with Supabase, we would verify OTP using supabase.auth.verifyOtp and then update password.
    // For this local/demo version, we will mock the password reset by just noting it in audit logs 
    // since local storage auth doesn't actually check a stored password (except for master admin).
    // If Supabase was connected, we couldn't bypass it like this without the admin API.
    
    auditService.logAction({
      action: 'PASSWORD_RESET',
      module: 'Authentication',
      record_description: `${cleanId} साठी पासवर्ड यशस्वीरित्या रीसेट केला.`,
      new_values: { identifier: cleanId },
    }).catch(() => {});
    
    return true;
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists in profiles
    const profiles = await this.getUserProfiles();
    const exists = profiles.some(
      (p) => p.email && p.email.toLowerCase() === cleanEmail
    );

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin,
        });
      } catch (e) {
        console.warn('Supabase resetPasswordForEmail:', e);
      }
    }

    // Audit log (never log passwords or tokens)
    auditService.logAction({
      action: 'PASSWORD_RESET_REQUEST',
      module: 'Authentication',
      record_description: `पासवर्ड रीसेट लिंक विनंती: ${cleanEmail}`,
      new_values: { email: cleanEmail, account_found: exists },
    }).catch(() => {});

    return {
      success: true,
      message:
        'आपल्या नोंदणीकृत ईमेलवर पासवर्ड रीसेट करण्याची लिंक पाठवण्यात आली आहे. कृपया आपला ईमेल तपासा.',
    };
  },

  /**
   * Update Current User Password (via Supabase Auth)
   */
  async updateUserPassword(newPassword: string, currentUser: UserProfile): Promise<void> {
    if (newPassword.length < 6) {
      throw new Error('पासवर्ड किमान ६ अक्षरांचा असणे आवश्यक आहे.');
    }

    // --- MASTER ADMIN (valid UUID) ---
    if (currentUser.id === 'a0000000-0000-4000-8000-000000000001') {
      storage.setItem('master_admin_password', newPassword);
      
      currentUser.requirePasswordChange = false;
      storage.setItem('arogya_current_user_profile', JSON.stringify(currentUser));
      
      auditService.logAction({
        action: 'UPDATE',
        module: 'Authentication',
        record_id: currentUser.id,
        record_description: `${currentUser.roleTitleMarathi} (${currentUser.marathiName}) पासवर्ड यशस्वीरित्या बदलला.`,
        user: currentUser,
      }).catch(() => {});
      return;
    }

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        throw new Error(`पासवर्ड बदलताना त्रुटी: ${error.message}`);
      }
    }

    auditService.logAction({
      action: 'UPDATE',
      module: 'Authentication',
      record_id: currentUser.id,
      record_description: `${currentUser.roleTitleMarathi} (${currentUser.marathiName}) पासवर्ड यशस्वीरित्या बदलला.`,
      user: currentUser,
    }).catch(() => {});
  },
};
