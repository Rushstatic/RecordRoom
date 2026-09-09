import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isDemoMode } from '../lib/env';
import { UserRole, AppUserRole, UserProfile, UserProfileEntity, EmployeeMaster } from '../types';
import { DEMO_USERS } from './authService';
import { storage } from '../lib/storage';
import { masterDataService } from './masterDataService';
import { userService } from './userService';

export interface CurrentUserContext {
  authUserId: string;
  profileId: string;
  role: UserRole; // 'phc_controller' | 'subcentre_employee'
  employeeId?: string | null;
  employeeName: string;
  designation?: string | null;
  mobile?: string | null;
  email?: string | null;
  smearCode?: string | null;
  phcId: string;
  phcName: string;
  subcentreId?: string | null;
  subcentreName?: string | null;
  applicableSubcentreIds: string[];
  applicableVillageIds: string[];
  isActive: boolean;
  extraCharges?: Array<{ subcentreId: string; subcentreName: string }>;
  primaryPosting?: { subcentreId: string; subcentreName: string };
  rawProfile?: UserProfileEntity;
}

/**
 * Transforms a UserProfile into a CurrentUserContext
 */
export function mapUserProfileToContext(user: UserProfile): CurrentUserContext {
  const isController = user.role === 'phc_controller';
  return {
    authUserId: user.authUserId || user.id,
    profileId: user.id,
    role: user.role,
    employeeId: user.employeeId || (isController ? '01258fa4-ab98-47e1-884d-28caea471410' : null),
    employeeName: user.marathiName || user.name,
    designation: user.roleTitleMarathi || (isController ? 'मास्टर ॲडमिन / प्रा.आ.के. नियंत्रक' : 'आरोग्य कर्मचारी'),
    mobile: user.phone || null,
    email: user.email || null,
    smearCode: user.smearCode || undefined,
    phcId: user.phcId || '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
    phcName: user.assignedPhc || 'प्राथमिक आरोग्य केंद्र भादा',
    subcentreId: user.subcentreId || null,
    subcentreName: user.assignedSubcentre || (isController ? 'सर्व उपकेंद्रे' : 'शिवली'),
    applicableSubcentreIds: isController ? ['all-subcentres'] : [user.subcentreId || '4e6bf085-07e6-4c93-b366-5fb61fd1c618'],
    applicableVillageIds: [],
    isActive: true,
    primaryPosting: {
      subcentreId: user.subcentreId || null,
      subcentreName: user.assignedSubcentre || (isController ? 'सर्व उपकेंद्रे' : 'शिवली'),
    },
  };
}

/**
 * Transforms a fully resolved CurrentUserContext into the standard UserProfile interface
 * expected by existing legacy components across the app.
 */
export function userContextToUserProfile(ctx: CurrentUserContext): UserProfile {
  const isController = ctx.role === 'phc_controller';
  return {
    id: ctx.profileId,
    authUserId: ctx.authUserId,
    name: ctx.employeeName,
    marathiName: ctx.employeeName,
    role: ctx.role,
    roleTitleMarathi: isController
      ? 'मास्टर ॲडमिन / प्रा.आ.के. नियंत्रक'
      : ctx.designation || 'उपकेंद्र आरोग्य कर्मचारी',
    email: ctx.email || '',
    phone: ctx.mobile || '',
    assignedPhc: ctx.phcName,
    assignedSubcentre: ctx.subcentreName || (isController ? 'सर्व उपकेंद्रे' : ''),
    employeeId: ctx.employeeId || undefined,
    phcId: ctx.phcId,
    subcentreId: ctx.subcentreId || undefined,
    smearCode: ctx.smearCode || undefined,
    isActive: ctx.isActive,
  };
}

export const currentUserService = {
  /**
   * Fetches fresh user profile context from Supabase on every login/session initialization.
   * Resolves the entire authoritative chain:
   * auth.users.id -> user_profiles -> employee_master -> PHC / Subcentre / Villages.
   * Does NOT rely on LocalStorage for user identity or scope.
   */
  async getCurrentUserContext(): Promise<CurrentUserContext | null> {
    const isSupabase = isSupabaseConfigured() && !!supabase;

    // 1. If Supabase is NOT configured:
    if (!isSupabase) {
      try {
        const storedProfile = storage.getItem('arogya_current_user_profile');
        if (storedProfile && storage.getItem('arogya_is_logged_in') === 'true') {
          const parsed = JSON.parse(storedProfile);
          if (parsed && parsed.role) {
            return mapUserProfileToContext(parsed);
          }
        }
      } catch (e) {
        console.warn('Error reading stored user profile:', e);
      }

      if (isDemoMode()) {
        return null;
      }
      return null;
    }

    // 2. Fetch active Supabase session
    const { data: sessionData, error: sessionError } = await supabase!.auth.getSession();
    if (sessionError) {
      console.error('[currentUserService] Session error:', sessionError);
      throw new Error(`सत्र पडताळणी त्रुटी: ${sessionError.message}`);
    }

    const sessionUser = sessionData?.session?.user;
    if (!sessionUser) {
      // Check if user has active local session
      try {
        const storedProfile = storage.getItem('arogya_current_user_profile');
        if (storedProfile && storage.getItem('arogya_is_logged_in') === 'true') {
          const parsed = JSON.parse(storedProfile);
          if (parsed && parsed.role) {
            const ctx = mapUserProfileToContext(parsed);
            if (ctx.subcentreId && (!ctx.applicableVillageIds || ctx.applicableVillageIds.length === 0)) {
              try {
                const villages = await masterDataService.getVillages();
                ctx.applicableVillageIds = villages
                  .filter((v) => v.subcentre_id === ctx.subcentreId)
                  .map((v) => v.id);
              } catch (ve) {
                console.warn('Village mapping error:', ve);
              }
            }
            return ctx;
          }
        }
      } catch (e) {
        console.warn('Error reading stored user profile:', e);
      }
      return null;
    }

    const authUserId = sessionUser.id;

    // 3. Query user_profiles table strictly for this auth_user_id
    let { data: profileRow, error: profileErr } = await supabase!
      .from('user_profiles')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (profileErr) {
      console.error('[currentUserService] Error fetching user profile:', profileErr);
      throw new Error('आपली कर्मचारी माहिती Supabase मधून मिळवता आली नाही.');
    }

    // If profile not found by auth_user_id directly, check if email/phone matches and auto-link
    if (!profileRow) {
      const email = sessionUser.email;
      const phone = sessionUser.phone;
      const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';

      if (email || cleanPhone) {
        let query = supabase!.from('user_profiles').select('*');
        if (email && cleanPhone) {
          query = query.or(`email.ilike.${email.trim().toLowerCase()},mobile.eq.${cleanPhone},mobile.eq.+91${cleanPhone},mobile.eq.${phone?.trim()}`);
        } else if (email) {
          query = query.ilike('email', email.trim().toLowerCase());
        } else if (cleanPhone) {
          query = query.or(`mobile.eq.${cleanPhone},mobile.eq.+91${cleanPhone},mobile.eq.${phone?.trim()}`);
        }

        const { data: matchedRows } = await query.limit(1);
        if (matchedRows && matchedRows.length > 0) {
          profileRow = matchedRows[0];
          // Auto-bind auth_user_id to user_profiles for this user
          try {
            await supabase!
              .from('user_profiles')
              .update({ auth_user_id: authUserId, last_login_at: new Date().toISOString() })
              .eq('id', profileRow.id);
            profileRow.auth_user_id = authUserId;
          } catch (e) {
            console.warn('[currentUserService] Failed to update auth_user_id link in DB:', e);
          }
        }
      }
    }

    // If still not found, check employee_master in Supabase and provision profile
    if (!profileRow && (sessionUser.email || sessionUser.phone)) {
      try {
        const cleanEmpPhone = sessionUser.phone ? sessionUser.phone.replace(/\D/g, '').slice(-10) : '';
        let empQuery = supabase!.from('employee_master').select('*');
        if (sessionUser.email && cleanEmpPhone) {
          empQuery = empQuery.or(
            `email.ilike.${sessionUser.email.trim()},mobile_number.eq.${cleanEmpPhone},mobile_number.eq.+91${cleanEmpPhone},mobile_number.eq.${sessionUser.phone}`
          );
        } else if (sessionUser.email) {
          empQuery = empQuery.ilike('email', sessionUser.email.trim());
        } else if (cleanEmpPhone) {
          empQuery = empQuery.or(
            `mobile_number.eq.${cleanEmpPhone},mobile_number.eq.+91${cleanEmpPhone},mobile_number.eq.${sessionUser.phone}`
          );
        }
        const { data: empMatch } = await empQuery.limit(1).maybeSingle();
        if (empMatch) {
          profileRow = await userService.provisionProfileForEmployee(empMatch, authUserId);
        }
      } catch (err) {
        console.warn('[currentUserService] Failed to auto-provision profile from employee_master:', err);
      }
    }

    // 4. If profile is NOT found in database: DO NOT SHOW FAKE USER
    if (!profileRow) {
      throw new Error('आपल्या खात्याची कर्मचारी माहिती उपलब्ध नाही. कृपया PHC नियंत्रकाशी संपर्क साधा.');
    }

    const rawProfile = profileRow as UserProfileEntity;

    // 5. Check if user is active
    if (!rawProfile.is_active) {
      throw new Error('आपले खाते सध्या निष्क्रिय आहे. कृपया PHC नियंत्रकाशी संपर्क साधा.');
    }

    // Normalize role
    const isController =
      rawProfile.role === 'phc_controller' ||
      rawProfile.role === AppUserRole.PHC_CONTROLLER ||
      rawProfile.role === 'PHC_CONTROLLER';

    const normalizedRole: UserRole = isController ? 'phc_controller' : 'subcentre_employee';

    // 6. Handle PHC Controller
    if (normalizedRole === 'phc_controller') {
      let phcId = rawProfile.phc_id;
      let phcName = 'प्राथमिक आरोग्य केंद्र';

      // Query PHC Master
      if (phcId) {
        const { data: phcData } = await supabase!
          .from('phc_master')
          .select('id, phc_name')
          .eq('id', phcId)
          .maybeSingle();
        if (phcData) {
          phcName = phcData.phc_name;
        }
      } else {
        const { data: firstPhc } = await supabase!
          .from('phc_master')
          .select('id, phc_name')
          .limit(1)
          .maybeSingle();
        if (firstPhc) {
          phcId = firstPhc.id;
          phcName = firstPhc.phc_name;
        }
      }

      // PHC Controller has scope of all subcentres in that PHC
      let applicableSubcentreIds: string[] = [];
      if (phcId) {
        const { data: subcentres } = await supabase!
          .from('subcentre_master')
          .select('id')
          .eq('phc_id', phcId);
        if (subcentres) {
          applicableSubcentreIds = subcentres.map((s) => s.id);
        }
      } else {
        const { data: allSubcentres } = await supabase!
          .from('subcentre_master')
          .select('id');
        if (allSubcentres) {
          applicableSubcentreIds = allSubcentres.map((s) => s.id);
        }
      }

      // Fetch all villages for these subcentres
      let applicableVillageIds: string[] = [];
      if (applicableSubcentreIds.length > 0) {
        const { data: villages } = await supabase!
          .from('village_master')
          .select('id')
          .in('subcentre_id', applicableSubcentreIds);
        if (villages) {
          applicableVillageIds = villages.map((v) => v.id);
        }
      }

      // Optional employee details if linked
      let empName = rawProfile.display_name || 'प्रा.आ.के. नियंत्रक';
      let designation = 'वैद्यकीय अधिकारी / नियंत्रक';
      let smearCode: string | null = null;
      let mobile = rawProfile.mobile || null;

      if (rawProfile.employee_id) {
        const { data: empData } = await supabase!
          .from('employee_master')
          .select('*')
          .eq('id', rawProfile.employee_id)
          .maybeSingle();
        if (empData) {
          empName = empData.employee_name;
          if (empData.designation) designation = empData.designation;
          if (empData.mobile_number) mobile = empData.mobile_number;
          if (empData.malaria_smear_code) smearCode = empData.malaria_smear_code;
        }
      }

      return {
        authUserId,
        profileId: rawProfile.id,
        role: 'phc_controller',
        employeeId: rawProfile.employee_id || null,
        employeeName: empName,
        designation,
        mobile,
        email: rawProfile.email || sessionUser.email || null,
        smearCode,
        phcId: phcId || '',
        phcName,
        subcentreId: null,
        subcentreName: 'सर्व उपकेंद्रे',
        applicableSubcentreIds,
        applicableVillageIds,
        isActive: true,
        rawProfile,
      };
    }

    // 7. Handle Subcentre Employee
    // Verify employee_id presence - if missing, attempt fallback match from employee_master
    if (!rawProfile.employee_id) {
      console.warn('[currentUserService] rawProfile.employee_id is missing. Attempting fallback match from employee_master...');
      try {
        let fallbackEmpQuery = supabase!.from('employee_master').select('*');
        const cleanEmpPhone = rawProfile.mobile ? rawProfile.mobile.replace(/\D/g, '').slice(-10) : null;
        if (rawProfile.email && cleanEmpPhone) {
          fallbackEmpQuery = fallbackEmpQuery.or(`email.ilike.${rawProfile.email.trim().toLowerCase()},mobile_number.eq.${cleanEmpPhone},mobile_number.eq.+91${cleanEmpPhone}`);
        } else if (rawProfile.email) {
          fallbackEmpQuery = fallbackEmpQuery.ilike('email', rawProfile.email.trim().toLowerCase());
        } else if (cleanEmpPhone) {
          fallbackEmpQuery = fallbackEmpQuery.or(`mobile_number.eq.${cleanEmpPhone},mobile_number.eq.+91${cleanEmpPhone}`);
        }
        const { data: matchedEmp } = await fallbackEmpQuery.limit(1).maybeSingle();
        if (matchedEmp) {
          rawProfile.employee_id = matchedEmp.id;
          try {
            await supabase!.from('user_profiles').update({ employee_id: matchedEmp.id }).eq('id', rawProfile.id);
          } catch (updateErr) {
            console.warn('[currentUserService] Failed to persist linked employee_id:', updateErr);
          }
        }
      } catch (findErr) {
        console.warn('[currentUserService] Failed to auto-match employee_master by profile credentials:', findErr);
      }
    }

    if (!rawProfile.employee_id) {
      throw new Error(
        'आपल्या खात्याशी जोडलेली कर्मचारी नोंद (Employee Record) सापडली नाही. कृपया PHC नियंत्रकाशी संपर्क साधा.'
      );
    }

    // Query Employee Master
    let { data: employeeRow, error: empErr } = await supabase!
      .from('employee_master')
      .select('*')
      .eq('id', rawProfile.employee_id)
      .maybeSingle();

    // Fallback if not found in Supabase: check masterDataService
    if (!employeeRow) {
      try {
        const localEmployees = await masterDataService.getEmployees();
        const foundLocal = localEmployees.find((e: any) => e.id === rawProfile.employee_id);
        if (foundLocal) {
          employeeRow = foundLocal;
          empErr = null;
        }
      } catch (localErr) {
        console.warn('[currentUserService] Fallback to masterDataService failed:', localErr);
      }
    }

    if (empErr || !employeeRow) {
      console.error('[currentUserService] Error fetching employee record:', empErr);
      throw new Error(
        'आपल्या खात्याशी जोडलेली कर्मचारी नोंद डेटाबेसमध्ये सापडली नाही. कृपया PHC नियंत्रकाशी संपर्क साधा.'
      );
    }

    const employee = employeeRow as EmployeeMaster;

    // Check if employee is active
    if (!employee.is_active) {
      throw new Error('आपले कर्मचारी खाते सध्या निष्क्रिय आहे. कृपया PHC नियंत्रकाशी संपर्क साधा.');
    }

    // Resolve Primary Posting
    // Try employee_posting_history first if available
    let primarySubcentreId = employee.subcentre_id;
    try {
      const { data: postingRow } = await supabase!
        .from('employee_posting_history')
        .select('subcentre_id')
        .eq('employee_id', employee.id)
        .eq('is_active', true)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (postingRow?.subcentre_id) {
        primarySubcentreId = postingRow.subcentre_id;
      }
    } catch {
      // Table may not exist yet; gracefully fallback to employee.subcentre_id
    }

    // Resolve Active Extra Charge(s)
    const extraCharges: Array<{ subcentreId: string; subcentreName: string }> = [];
    try {
      const { data: chargeRows } = await supabase!
        .from('employee_extra_charge')
        .select('subcentre_id')
        .eq('employee_id', employee.id)
        .eq('is_active', true);
      if (chargeRows && chargeRows.length > 0) {
        for (const row of chargeRows) {
          if (row.subcentre_id && row.subcentre_id !== primarySubcentreId) {
            extraCharges.push({ subcentreId: row.subcentre_id, subcentreName: '' });
          }
        }
      }
    } catch {
      // Table may not exist yet; ignore
    }

    // Build applicable subcentre IDs array
    const applicableSubcentreIds = Array.from(
      new Set([primarySubcentreId, ...extraCharges.map((c) => c.subcentreId)])
    ).filter(Boolean);

    // Fetch Subcentres info
    let primarySubcentreName = 'आरोग्य उपकेंद्र';
    let phcId = rawProfile.phc_id || '';
    let phcName = 'प्राथमिक आरोग्य केंद्र';

    const { data: subcentreDataList } = await supabase!
      .from('subcentre_master')
      .select('id, subcentre_name, phc_id')
      .in('id', applicableSubcentreIds);

    if (subcentreDataList && subcentreDataList.length > 0) {
      const primarySc = subcentreDataList.find((s) => s.id === primarySubcentreId);
      if (primarySc) {
        primarySubcentreName = primarySc.subcentre_name;
        if (!phcId) phcId = primarySc.phc_id;
      }

      // Populate extra charges names
      for (const ec of extraCharges) {
        const found = subcentreDataList.find((s) => s.id === ec.subcentreId);
        if (found) {
          ec.subcentreName = found.subcentre_name;
        }
      }
    }

    // Fetch PHC Name
    if (phcId) {
      const { data: phcData } = await supabase!
        .from('phc_master')
        .select('phc_name')
        .eq('id', phcId)
        .maybeSingle();
      if (phcData) {
        phcName = phcData.phc_name;
      }
    }

    // Fetch applicable villages
    let applicableVillageIds: string[] = [];
    if (applicableSubcentreIds.length > 0) {
      const { data: villageRows } = await supabase!
        .from('village_master')
        .select('id')
        .in('subcentre_id', applicableSubcentreIds);
      if (villageRows) {
        applicableVillageIds = villageRows.map((v) => v.id);
      }
    }

    return {
      authUserId,
      profileId: rawProfile.id,
      role: 'subcentre_employee',
      employeeId: employee.id,
      employeeName: employee.employee_name,
      designation: employee.designation || 'उपकेंद्र आरोग्य कर्मचारी',
      mobile: employee.mobile_number || rawProfile.mobile || null,
      email: employee.email || rawProfile.email || sessionUser.email || null,
      smearCode: employee.malaria_smear_code,
      phcId,
      phcName,
      subcentreId: primarySubcentreId,
      subcentreName: primarySubcentreName,
      applicableSubcentreIds,
      applicableVillageIds,
      isActive: true,
      extraCharges,
      primaryPosting: {
        subcentreId: primarySubcentreId,
        subcentreName: primarySubcentreName,
      },
      rawProfile,
    };
  },
};
