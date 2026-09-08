import { storage } from '../lib/storage';
import { MalariaTarget, TargetType } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { masterDataService } from './masterDataService';
import { isDemoMode } from '../lib/env';
import { assertValidUUID } from '../utils/uuid';

const STORAGE_KEY = 'arogya_malaria_targets';

// Default realistic target records for initial offline viewing & testing
const DEFAULT_TARGETS: MalariaTarget[] = [];

export interface TargetFilter {
  target_year?: number;
  target_month?: number | null;
  target_type?: TargetType;
  phc_id?: string;
  subcentre_id?: string;
  village_id?: string;
  employee_id?: string;
}

export const targetService = {
  // 1. Get targets from Supabase or fallback
  async getTargets(filter?: TargetFilter): Promise<MalariaTarget[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('malaria_targets')
          .select(`
            id,
            phc_id,
            subcentre_id,
            village_id,
            employee_id,
            target_year,
            target_month,
            target_type,
            target_value,
            remarks,
            created_by,
            created_at,
            updated_at,
            phc:phc_id ( phc_name ),
            subcentre:subcentre_id ( subcentre_name ),
            village:village_id ( village_name ),
            employee:employee_id ( employee_name, designation, malaria_smear_code )
          `)
          .order('target_year', { ascending: false })
          .order('target_month', { ascending: false, nullsFirst: false });

        if (filter?.target_year) {
          query = query.eq('target_year', filter.target_year);
        }
        if (filter?.target_type) {
          query = query.eq('target_type', filter.target_type);
        }
        if (filter?.target_month !== undefined && filter?.target_month !== null) {
          query = query.eq('target_month', filter.target_month);
        }
        if (filter?.phc_id) {
          query = query.eq('phc_id', filter.phc_id);
        }
        if (filter?.subcentre_id) {
          query = query.eq('subcentre_id', filter.subcentre_id);
        }
        if (filter?.village_id) {
          query = query.eq('village_id', filter.village_id);
        }
        if (filter?.employee_id) {
          query = query.eq('employee_id', filter.employee_id);
        }

        const { data, error } = await query;
        if (!error && data) {
          return data.map((item: any) => ({
            id: item.id,
            phc_id: item.phc_id,
            subcentre_id: item.subcentre_id,
            village_id: item.village_id,
            employee_id: item.employee_id,
            target_year: Number(item.target_year),
            target_month: item.target_month ? Number(item.target_month) : null,
            target_type: item.target_type as TargetType,
            target_value: Number(item.target_value),
            remarks: item.remarks || '',
            created_by: item.created_by,
            created_at: item.created_at,
            updated_at: item.updated_at,
            phc_name: item.phc?.phc_name || '',
            subcentre_name: item.subcentre?.subcentre_name || '',
            village_name: item.village?.village_name || '',
            employee_name: item.employee?.employee_name || '',
            designation: item.employee?.designation || '',
            malaria_smear_code: item.employee?.malaria_smear_code || '',
          }));
        }
        console.warn('Supabase targets query failed, falling back to local storage:', error?.message);
      } catch (err) {
        console.warn('Exception in targets Supabase query, using local storage:', err);
      }
    }

    // LocalStorage fallback
    return this.getLocalTargets(filter);
  },

  getLocalTargets(filter?: TargetFilter): MalariaTarget[] {
    try {
      let raw = storage.getItem(STORAGE_KEY);
    if (raw && raw.includes('tgt-phc-2026-m09')) {
      const parsed = JSON.parse(raw).filter((t: any) => !['tgt-phc-2026-m09', 'tgt-sc-2026-m09', 'tgt-vil-2026-m09-01', 'tgt-emp-2026-m09-01', 'tgt-emp-2026-m09-02', 'tgt-sc-2026-yearly'].includes(t.id));
      raw = JSON.stringify(parsed);
      storage.setItem(STORAGE_KEY, raw);
    }
      let list: MalariaTarget[] = raw ? JSON.parse(raw) : [...DEFAULT_TARGETS];
      if (!raw) {
        storage.setItem(STORAGE_KEY, JSON.stringify(list));
      }

      if (filter) {
        if (filter.target_year) {
          list = list.filter((t) => t.target_year === Number(filter.target_year));
        }
        if (filter.target_type) {
          list = list.filter((t) => t.target_type === filter.target_type);
        }
        if (filter.target_month !== undefined && filter.target_month !== null) {
          list = list.filter((t) => Number(t.target_month) === Number(filter.target_month));
        }
        if (filter.phc_id) {
          list = list.filter((t) => t.phc_id === filter.phc_id);
        }
        if (filter.subcentre_id) {
          list = list.filter((t) => t.subcentre_id === filter.subcentre_id);
        }
        if (filter.village_id) {
          list = list.filter((t) => t.village_id === filter.village_id);
        }
        if (filter.employee_id) {
          list = list.filter((t) => t.employee_id === filter.employee_id);
        }
      }

      return list.sort((a, b) => {
        if (b.target_year !== a.target_year) return b.target_year - a.target_year;
        return (b.target_month || 0) - (a.target_month || 0);
      });
    } catch {
      return [...DEFAULT_TARGETS];
    }
  },

  // 2. Check for duplicate target
  async checkDuplicate(
    target: {
      target_year: number;
      target_month?: number | null;
      target_type: TargetType;
      phc_id?: string | null;
      subcentre_id?: string | null;
      village_id?: string | null;
      employee_id?: string | null;
    },
    excludeId?: string
  ): Promise<boolean> {
    const all = await this.getTargets({
      target_year: target.target_year,
      target_type: target.target_type,
    });

    const isMonthMatch = (m1?: number | null, m2?: number | null) => {
      if (target.target_type === 'Yearly') return true;
      return Number(m1) === Number(m2);
    };

    const isScopeMatch = (item: MalariaTarget) => {
      // Compare specific scope IDs
      const p1 = target.phc_id || null;
      const p2 = item.phc_id || null;
      const s1 = target.subcentre_id || null;
      const s2 = item.subcentre_id || null;
      const v1 = target.village_id || null;
      const v2 = item.village_id || null;
      const e1 = target.employee_id || null;
      const e2 = item.employee_id || null;

      return p1 === p2 && s1 === s2 && v1 === v2 && e1 === e2;
    };

    return all.some((item) => {
      if (excludeId && item.id === excludeId) return false;
      return (
        item.target_year === target.target_year &&
        item.target_type === target.target_type &&
        isMonthMatch(item.target_month, target.target_month) &&
        isScopeMatch(item)
      );
    });
  },

  // 3. Create target
  async createTarget(
    data: Omit<MalariaTarget, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ data: MalariaTarget | null; error: string | null }> {
    // Check validation
    if (!data.target_value || data.target_value <= 0) {
      return { data: null, error: 'लक्ष्य संख्या शून्य किंवा त्यापेक्षा जास्त असणे आवश्यक आहे.' };
    }
    if (data.target_type === 'Monthly' && (!data.target_month || data.target_month < 1 || data.target_month > 12)) {
      return { data: null, error: 'मासिक लक्ष्यासाठी वैध महिना निवडणे आवश्यक आहे.' };
    }

    // Check duplicate
    const isDup = await this.checkDuplicate(data);
    if (isDup) {
      return {
        data: null,
        error: 'या स्तर, वर्ष व महिन्यासाठी आधीच लक्ष्य अस्तित्वात आहे. कृपया ते तपासा किंवा संपादित करा.',
      };
    }

    const payload = {
      phc_id: data.phc_id || null,
      subcentre_id: data.subcentre_id || null,
      village_id: data.village_id || null,
      employee_id: data.employee_id || null,
      target_year: Number(data.target_year),
      target_month: data.target_type === 'Monthly' ? Number(data.target_month) : null,
      target_type: data.target_type,
      target_value: Number(data.target_value),
      remarks: data.remarks?.trim() || null,
      created_by: data.created_by || null,
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: inserted, error } = await supabase
          .from('malaria_targets')
          .insert([payload])
          .select()
          .single();

        if (!error && inserted) {
          const formatted: MalariaTarget = {
            ...inserted,
            target_year: Number(inserted.target_year),
            target_month: inserted.target_month ? Number(inserted.target_month) : null,
            target_value: Number(inserted.target_value),
            phc_name: data.phc_name,
            subcentre_name: data.subcentre_name,
            village_name: data.village_name,
            employee_name: data.employee_name,
            designation: data.designation,
            malaria_smear_code: data.malaria_smear_code,
          };
          this.syncLocalAdd(formatted);
          return { data: formatted, error: null };
        }
        console.error('Supabase insert failed:', error?.message);
        if (!isDemoMode()) {
          return { data: null, error: `लक्ष्य जतन करता आले नाही: ${error?.message}` };
        }
      } catch (err: any) {
        console.error('Exception during target insert:', err);
        if (!isDemoMode()) {
          return { data: null, error: err.message || 'सर्व्हर त्रुटी' };
        }
      }
    } else if (!isDemoMode()) {
      return { data: null, error: 'Supabase कॉन्फिगर केलेले नाही.' };
    }

    // Fallback: local storage (only demo mode)
    const newTarget: MalariaTarget = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tgt-${Date.now()}`,
      ...payload,
      phc_name: data.phc_name,
      subcentre_name: data.subcentre_name,
      village_name: data.village_name,
      employee_name: data.employee_name,
      designation: data.designation,
      malaria_smear_code: data.malaria_smear_code,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.syncLocalAdd(newTarget);
    return { data: newTarget, error: null };
  },

  // 4. Update target
  async updateTarget(
    id: string,
    data: Partial<MalariaTarget>
  ): Promise<{ data: MalariaTarget | null; error: string | null }> {
    assertValidUUID(id, 'लक्ष्य ID');
    if (data.target_value !== undefined && data.target_value <= 0) {
      return { data: null, error: 'लक्ष्य संख्या शून्य किंवा त्यापेक्षा जास्त असणे आवश्यक आहे.' };
    }

    if (data.target_type && data.target_year) {
      const isDup = await this.checkDuplicate(
        {
          target_year: data.target_year,
          target_month: data.target_type === 'Monthly' ? data.target_month : null,
          target_type: data.target_type,
          phc_id: data.phc_id,
          subcentre_id: data.subcentre_id,
          village_id: data.village_id,
          employee_id: data.employee_id,
        },
        id
      );
      if (isDup) {
        return {
          data: null,
          error: 'या स्तर, वर्ष व महिन्यासाठी आधीच दुसरे लक्ष्य अस्तित्वात आहे.',
        };
      }
    }

    const payload: any = {
      ...data,
      target_month: data.target_type === 'Yearly' ? null : data.target_month,
      updated_at: new Date().toISOString(),
    };
    delete payload.id;
    delete payload.phc_name;
    delete payload.subcentre_name;
    delete payload.village_name;
    delete payload.employee_name;
    delete payload.designation;
    delete payload.malaria_smear_code;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: updated, error } = await supabase
          .from('malaria_targets')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (!error && updated) {
          const formatted: MalariaTarget = {
            ...updated,
            phc_name: data.phc_name,
            subcentre_name: data.subcentre_name,
            village_name: data.village_name,
            employee_name: data.employee_name,
            designation: data.designation,
            malaria_smear_code: data.malaria_smear_code,
          };
          this.syncLocalUpdate(id, formatted);
          return { data: formatted, error: null };
        }
        console.error('Supabase update failed:', error?.message);
        if (!isDemoMode()) {
          return { data: null, error: `लक्ष्य अद्ययावत करता आले नाही: ${error?.message}` };
        }
      } catch (err: any) {
        console.error('Supabase update exception:', err);
        if (!isDemoMode()) {
          return { data: null, error: err.message || 'सर्व्हर त्रुटी' };
        }
      }
    } else if (!isDemoMode()) {
      return { data: null, error: 'Supabase कॉन्फिगर केलेले नाही.' };
    }

    const localList = this.getLocalTargets();
    const idx = localList.findIndex((t) => t.id === id);
    if (idx >= 0) {
      localList[idx] = {
        ...localList[idx],
        ...data,
        updated_at: new Date().toISOString(),
      };
      storage.setItem(STORAGE_KEY, JSON.stringify(localList));
      return { data: localList[idx], error: null };
    }

    return { data: null, error: 'लक्ष्य सापडले नाही.' };
  },

  // 5. Delete target
  async deleteTarget(id: string): Promise<{ success: boolean; error: string | null }> {
    assertValidUUID(id, 'लक्ष्य ID');
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('malaria_targets').delete().eq('id', id);
        if (!error) {
          this.syncLocalDelete(id);
          return { success: true, error: null };
        }
        console.error('Supabase delete failed:', error?.message);
        if (!isDemoMode()) {
          return { success: false, error: `लक्ष्य हटवता आले नाही: ${error.message}` };
        }
      } catch (err: any) {
        console.error('Supabase delete exception:', err);
        if (!isDemoMode()) {
          return { success: false, error: err.message || 'सर्व्हर त्रुटी' };
        }
      }
    } else if (!isDemoMode()) {
      return { success: false, error: 'Supabase कॉन्फिगर केलेले नाही.' };
    }

    this.syncLocalDelete(id);
    return { success: true, error: null };
  },

  // Helpers for local sync
  syncLocalAdd(item: MalariaTarget) {
    try {
      const list = this.getLocalTargets();
      list.unshift(item);
      storage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  },

  syncLocalUpdate(id: string, item: MalariaTarget) {
    try {
      const list = this.getLocalTargets();
      const idx = list.findIndex((t) => t.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...item };
        storage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
    } catch (e) {
      console.error(e);
    }
  },

  syncLocalDelete(id: string) {
    try {
      const list = this.getLocalTargets();
      const filtered = list.filter((t) => t.id !== id);
      storage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error(e);
    }
  },

  // SQL definition for users / administrators
  getSchemaSql(): string {
    return `-- ==========================================
-- CODE 8: MALARIA TARGET MASTER TABLE & RLS POLICIES
-- ==========================================

CREATE TABLE IF NOT EXISTS malaria_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phc_id UUID REFERENCES phc_master(id) ON DELETE CASCADE,
  subcentre_id UUID REFERENCES subcentre_master(id) ON DELETE CASCADE,
  village_id UUID REFERENCES village_master(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employee_master(id) ON DELETE CASCADE,
  target_year INTEGER NOT NULL,
  target_month INTEGER CHECK (target_month >= 1 AND target_month <= 12),
  target_type TEXT NOT NULL CHECK (target_type IN ('Monthly', 'Yearly')),
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  remarks TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE malaria_targets ENABLE ROW LEVEL SECURITY;

-- 1. PHC Controller has full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "PHC Controller full access on malaria_targets"
  ON malaria_targets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'phc_controller'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'phc_controller'
    )
  );

-- 2. Subcentre Employee has read-only access for their assigned scope
CREATE POLICY "Subcentre Employee read-only access on malaria_targets"
  ON malaria_targets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        malaria_targets.subcentre_id = user_profiles.assigned_subcentre_id
        OR malaria_targets.phc_id = user_profiles.assigned_phc_id
        OR malaria_targets.employee_id = user_profiles.employee_id
        OR (malaria_targets.village_id IN (
          SELECT id FROM village_master WHERE subcentre_id = user_profiles.assigned_subcentre_id
        ))
      )
    )
  );
`;
  },
};
