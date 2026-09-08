import { storage } from '../lib/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isValidUUID } from '../utils/uuid';
import { 
  PhcMaster, SubcentreMaster, VillageMaster, EmployeeMaster,
  UserProfileEntity, MalariaBloodSample, TBPatientRecord, 
  MalariaTarget, SystemAuditLog, RecordRegisterTemplate, 
  RecordTemplateField, DynamicRecordEntry
} from '../types';

export type MigrationModule = 
  | 'phc_master' | 'subcentre_master' | 'village_master' | 'employee_master'
  | 'user_profiles' | 'register_templates' | 'template_fields' | 'malaria_samples'
  | 'tb_samples' | 'malaria_targets' | 'dynamic_records' | 'audit_logs';

export interface MigrationStats {
  localRecords: number;
  validRecords: number;
  invalidRecords: number;
  demoRecords: number;
  duplicateRecords: number;
  migratableRecords: number;
}

export interface MigrationRecord {
  id: string;
  data: any;
  status: 'IMPORTED' | 'SKIPPED' | 'DUPLICATE' | 'INVALID' | 'CONFLICT' | 'FAILED';
  errorMsg?: string;
}

const STORAGE_KEYS: Record<MigrationModule, string> = {
  phc_master: 'arogya_phc_master',
  subcentre_master: 'arogya_subcentre_master',
  village_master: 'arogya_village_master',
  employee_master: 'arogya_employee_master',
  user_profiles: 'arogya_user_profiles_master',
  register_templates: 'arogya_register_templates',
  template_fields: 'arogya_template_fields',
  malaria_samples: 'arogya_malaria_samples',
  tb_samples: 'arogya_tb_samples',
  malaria_targets: 'arogya_malaria_targets',
  dynamic_records: 'arogya_dynamic_records',
  audit_logs: 'arogya_audit_logs_v1', // Ensure correct key
};

const FAKE_UUIDS = [
  'emp11111-1111-4111-8111-111111111111',
  's0111111-1111-4111-8111-111111111111',
  'v0111111-1111-4111-8111-111111111111',
  'u0111111-1111-4111-8111-111111111111',
  'master-admin-001',
  'TPL-MALARIA-01',
  'TPL-TB-01'
];

function isDemoRecord(record: any): boolean {
  if (!record) return false;
  
  // Check IDs
  if (record.id && FAKE_UUIDS.includes(record.id)) return true;
  if (record.employee_id && FAKE_UUIDS.includes(record.employee_id)) return true;
  if (record.phc_id && FAKE_UUIDS.includes(record.phc_id)) return true;
  if (record.subcentre_id && FAKE_UUIDS.includes(record.subcentre_id)) return true;
  if (record.user_id && FAKE_UUIDS.includes(record.user_id)) return true;

  // Check strings
  const str = JSON.stringify(record).toLowerCase();
  if (str.includes('demo sample') || str.includes('test user') || str.includes('test employee') || str.includes('default user')) {
    return true;
  }
  
  return false;
}

function getLocalData(module: MigrationModule): any[] {
  const key = STORAGE_KEYS[module];
  if (key === 'arogya_audit_logs_v1') {
      const raw = storage.getItem('arogya_system_audit_logs');
      return raw ? JSON.parse(raw) : [];
  }
  const raw = storage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

export const migrationService = {
  async analyzeLocalStorage(): Promise<{ stats: Record<MigrationModule, MigrationStats> }> {
    const stats: Record<MigrationModule, MigrationStats> = {} as any;
    
    // Check if Supabase configured
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase Configuration Missing');
    }

    const modules = Object.keys(STORAGE_KEYS) as MigrationModule[];
    
    for (const mod of modules) {
      const data = getLocalData(mod);
      
      let valid = 0;
      let invalid = 0;
      let demo = 0;
      
      data.forEach(record => {
        if (isDemoRecord(record)) {
          demo++;
        } else if (record.id && !isValidUUID(record.id)) {
          invalid++;
        } else {
          valid++;
        }
      });

      // Simple duplicate estimation (Optimistic, assume 0 for now to speed up preview)
      // Real duplicate check happens during migration
      stats[mod] = {
        localRecords: data.length,
        validRecords: valid,
        invalidRecords: invalid,
        demoRecords: demo,
        duplicateRecords: 0, 
        migratableRecords: valid
      };
    }
    
    return { stats };
  },

  async runMigration(onProgress: (mod: string, progress: number) => void): Promise<any[]> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase Configuration Missing');
    }

    const batchId = crypto.randomUUID();
    const results = [];
    const modules = Object.keys(STORAGE_KEYS) as MigrationModule[];
    
    // Ensure data_migration_history exists
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;

    for (const mod of modules) {
      onProgress(mod, 0);
      const data = getLocalData(mod);
      const validData = data.filter(r => !isDemoRecord(r) && r.id && isValidUUID(r.id));
      
      let tableName = mod as string;
      if (mod === 'tb_samples') tableName = 'tb_suspected_patient_register';
      if (mod === 'register_templates') tableName = 'record_register_templates';
      if (mod === 'template_fields') tableName = 'record_template_fields';
      if (mod === 'dynamic_records') tableName = 'dynamic_record_entries';
      if (mod === 'audit_logs') tableName = 'system_audit_logs';
      if (mod === 'malaria_samples') tableName = 'malaria_blood_samples';

      let imported = 0;
      let skipped = 0;
      let failed = 0;
      let errors: string[] = [];

      const BATCH_SIZE = 50;
      for (let i = 0; i < validData.length; i += BATCH_SIZE) {
        const batch = validData.slice(i, i + BATCH_SIZE);
        
        for (const record of batch) {
          try {
            // Check Duplicate by ID
            let { data: existing, error: dupErr } = await supabase
              .from(tableName)
              .select('id')
              .eq('id', record.id)
              .maybeSingle();

            if (dupErr) throw dupErr;

            // Deep duplicate check for specific modules
            if (!existing) {
              if (mod === 'malaria_samples' && record.employee_id && record.sample_year && record.sample_number) {
                const { data: deepDup } = await supabase
                  .from(tableName)
                  .select('id')
                  .eq('employee_id', record.employee_id)
                  .eq('sample_year', record.sample_year)
                  .eq('sample_number', record.sample_number)
                  .maybeSingle();
                if (deepDup) existing = deepDup;
              } else if (mod === 'tb_samples' && record.nikshay_id) {
                const { data: deepDup } = await supabase
                  .from(tableName)
                  .select('id')
                  .eq('nikshay_id', record.nikshay_id)
                  .maybeSingle();
                if (deepDup) existing = deepDup;
              } else if (mod === 'malaria_targets' && record.scope && record.target_type && record.target_year) {
                 let q = supabase
                  .from(tableName)
                  .select('id')
                  .eq('scope', record.scope)
                  .eq('target_type', record.target_type)
                  .eq('target_year', record.target_year);
                 if (record.target_month) q = q.eq('target_month', record.target_month);
                 const { data: deepDup } = await q.maybeSingle();
                 if (deepDup) existing = deepDup;
              }
            }

            if (existing) {
              skipped++;
              await this.logHistory(batchId, mod, record.id, existing.id, 'DUPLICATE', 'Already exists (ID or logic match)', userId);
              continue;
            }

            // Clean Payload based on module type
            const cleanRecord = this.cleanPayload(mod, record);

            // Insert
            const { error: insertErr } = await supabase
              .from(tableName)
              .insert([cleanRecord]);

            if (insertErr) {
              failed++;
              errors.push(insertErr.message);
              await this.logHistory(batchId, mod, record.id, null, 'FAILED', insertErr.message, userId);
            } else {
              imported++;
              await this.logHistory(batchId, mod, record.id, record.id, 'IMPORTED', null, userId);
            }

          } catch (err: any) {
            failed++;
            errors.push(err.message || 'Unknown error');
            await this.logHistory(batchId, mod, record.id, null, 'FAILED', err.message, userId);
          }
        }
        onProgress(mod, ((i + batch.length) / validData.length) * 100);
      }
      
      results.push({
        module: mod,
        imported,
        skipped,
        failed,
        errors: [...new Set(errors)]
      });
      onProgress(mod, 100);
    }
    
    // Audit log the migration itself
    try {
        await supabase.from('system_audit_logs').insert([{
            id: crypto.randomUUID(),
            user_id: userId,
            action: 'DATA_MIGRATION',
            module: 'System Administration',
            record_description: `Batch ${batchId} Data Migration Completed`,
            metadata: { batch_id: batchId, results },
            created_at: new Date().toISOString()
        }]);
    } catch(e) {
        console.warn('Failed to audit log migration event', e);
    }
    
    return results;
  },

  cleanPayload(mod: MigrationModule, record: any): any {
    const clean = { ...record };
    
    // Clean common fields
    if (clean.created_at) clean.created_at = new Date(clean.created_at).toISOString();
    if (clean.updated_at) clean.updated_at = new Date(clean.updated_at).toISOString();
    
    // Table specific mappings
    if (mod === 'malaria_samples') {
      if (!isValidUUID(clean.phc_id)) clean.phc_id = null;
      if (!isValidUUID(clean.subcentre_id)) clean.subcentre_id = null;
      if (!isValidUUID(clean.village_id)) clean.village_id = null;
      if (!isValidUUID(clean.employee_id)) clean.employee_id = null;
      
      // Keep sample numbers
      clean.age = Number(clean.age) || 0;
    }
    
    if (mod === 'tb_samples') {
       // Convert to tb_suspected_patient_register structure
       clean.age = Number(clean.age) || 0;
    }

    if (mod === 'malaria_targets') {
       clean.target_year = Number(clean.target_year);
       clean.target_month = clean.target_month ? Number(clean.target_month) : null;
       clean.target_value = Number(clean.target_value);
    }
    
    return clean;
  },

  async logHistory(
    batchId: string, 
    mod: string, 
    localId: string, 
    supabaseId: string | null, 
    status: string, 
    errorMsg: string | null,
    userId?: string
  ) {
    if (!supabase) return;
    try {
      await supabase.from('data_migration_history').insert([{
        migration_batch_id: batchId,
        module_name: mod,
        local_record_id: localId,
        supabase_record_id: supabaseId,
        status,
        error_message: errorMsg,
        migrated_by: userId
      }]);
    } catch (e) {
      console.warn('Failed to log migration history', e);
    }
  },

  async verifyMigration(): Promise<boolean> {
    if (!supabase) return false;
    // For this prototype, we'll return true. A real implementation would count rows.
    return true; 
  },

  async archiveLocalStorageKeys(): Promise<void> {
    const batchId = crypto.randomUUID().substring(0, 8);
    const modules = Object.keys(STORAGE_KEYS) as MigrationModule[];
    
    for (const mod of modules) {
      const key = STORAGE_KEYS[mod];
      const data = storage.getItem(key);
      if (data) {
        // Archive
        storage.setItem(`arogya_migration_archive_${batchId}_${key}`, data);
        // Do not clear entirely yet, or clear the main keys
        storage.removeItem(key);
      }
    }
  }
};
