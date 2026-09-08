import { storage } from '../lib/storage';
import {
  SystemAuditLog,
  AuditAction,
  AuditModule,
  UserProfile,
  UserRole,
  BackupPayload,
  BackupHistoryItem,
  BackupMetadata,
  AuditActivityMetrics,
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { masterDataService } from './masterDataService';
import { malariaService } from './malariaService';
import { targetService } from './targetService';

const AUDIT_STORAGE_KEY = 'arogya_system_audit_logs';
const BACKUP_HISTORY_KEY = 'arogya_backup_history';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Realistic seed logs for initial display
const INITIAL_AUDIT_LOGS: SystemAuditLog[] = [
  {
    id: 'log-001',
    user_id: 'c1000000-0000-4000-8000-000000000001',
    user_name: 'डॉ. अमोल एस. पाटील',
    role: 'phc_controller',
    action: 'LOGIN',
    module: 'Authentication',
    record_id: 'c1000000-0000-4000-8000-000000000001',
    record_description: 'प्रा.आ.के. नियंत्रक यशस्वी लॉगिन',
    old_values: null,
    new_values: { session: 'active', role: 'phc_controller' },
    ip_address: null,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    created_at: '2026-09-07T08:15:20.000Z',
    phc_id: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
  },
  {
    id: 'log-002',
    user_id: 'c2000000-0000-4000-8000-000000000002',
    user_name: 'सौ. सुनिता एम. कांबळे',
    role: 'subcentre_employee',
    action: 'LOGIN',
    module: 'Authentication',
    record_id: 'c2000000-0000-4000-8000-000000000002',
    record_description: 'उपकेंद्र आरोग्य सेविका लॉगिन',
    old_values: null,
    new_values: { session: 'active', subcentre: 'शिवली' },
    ip_address: null,
    user_agent: 'Mozilla/5.0 (Android; Mobile; rv:109.0)',
    created_at: '2026-09-07T08:30:11.000Z',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    phc_id: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
  },
  {
    id: 'log-003',
    user_id: 'c2000000-0000-4000-8000-000000000002',
    user_name: 'सौ. सुनिता एम. कांबळे',
    role: 'subcentre_employee',
    action: 'CREATE',
    module: 'Malaria Sample Register',
    record_id: 'a1000000-0000-4000-8000-000000000001',
    record_description: 'नमुना क्र. १: रमेश सखाराम जाधव (घर क्र. 12/A)',
    old_values: null,
    new_values: {
      patient_name: 'रमेश सखाराम जाधव',
      sample_number: 1,
      malaria_smear_code: '54V3',
      house_number: '12/A',
      age: 38,
      gender: 'पुरुष',
    },
    ip_address: null,
    user_agent: 'Mozilla/5.0 (Android; Mobile; rv:109.0)',
    created_at: '2026-09-04T10:30:00.000Z',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    phc_id: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
  },
  {
    id: 'log-004',
    user_id: 'c2000000-0000-4000-8000-000000000002',
    user_name: 'सौ. सुनिता एम. कांबळे',
    role: 'subcentre_employee',
    action: 'CREATE',
    module: 'Malaria Sample Register',
    record_id: 'a2000000-0000-4000-8000-000000000002',
    record_description: 'नमुना क्र. २: सुमन बाळू पवार (घर क्र. 45)',
    old_values: null,
    new_values: {
      patient_name: 'सुमन बाळू पवार',
      sample_number: 2,
      malaria_smear_code: '54V3',
      house_number: '45',
      age: 29,
      gender: 'स्त्री',
    },
    ip_address: null,
    user_agent: 'Mozilla/5.0 (Android; Mobile; rv:109.0)',
    created_at: '2026-09-05T11:15:00.000Z',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    phc_id: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
  },
  {
    id: 'log-005',
    user_id: 'c1000000-0000-4000-8000-000000000001',
    user_name: 'डॉ. अमोल एस. पाटील',
    role: 'phc_controller',
    action: 'UPDATE',
    module: 'Employee Master',
    record_id: '01258fa4-ab98-47e1-884d-28caea471416',
    record_description: 'कर्मचारी संपर्क क्रमांक अद्ययावत: सौ. सुनिता एम. कांबळे',
    old_values: { mobile_number: '9800000010' },
    new_values: { mobile_number: '9765098765' },
    ip_address: null,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    created_at: '2026-09-06T14:20:45.000Z',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    phc_id: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
  },
  {
    id: 'log-006',
    user_id: 'c2000000-0000-4000-8000-000000000002',
    user_name: 'सौ. सुनिता एम. कांबळे',
    role: 'subcentre_employee',
    action: 'PRINT',
    module: 'Send Samples',
    record_id: 'dispatch-batch-01',
    record_description: 'प्रा.आ. केंद्र तपासणीसाठी नमुना यादी (Dispatch Slip) प्रिंट',
    old_values: null,
    new_values: { batch_count: 5, dispatch_date: '2026-09-06' },
    ip_address: null,
    user_agent: 'Mozilla/5.0 (Android; Mobile; rv:109.0)',
    created_at: '2026-09-06T16:05:00.000Z',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    phc_id: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
  },
  {
    id: 'log-007',
    user_id: 'c1000000-0000-4000-8000-000000000001',
    user_name: 'डॉ. अमोल एस. पाटील',
    role: 'phc_controller',
    action: 'BACKUP',
    module: 'System Backup',
    record_id: 'bkp-initial-01',
    record_description: 'नियमित साप्ताहिक प्रणाली डेटा बॅकअप यशस्वीरित्या जतन',
    old_values: null,
    new_values: {
      tables: ['phc_master', 'subcentre_master', 'village_master', 'employee_master', 'malaria_blood_samples'],
      total_records: 25,
      filename: 'malaria_health_backup_2026-09-05_18-00.json',
    },
    ip_address: null,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    created_at: '2026-09-05T18:00:00.000Z',
    phc_id: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
  },
];

// Initial backup history items
const INITIAL_BACKUP_HISTORY: BackupHistoryItem[] = [
  {
    id: 'bkp-hist-001',
    backup_date: '2026-09-05',
    backup_time: '18:00:00',
    filename: 'malaria_health_backup_2026-09-05_18-00.json',
    created_by: 'डॉ. अमोल एस. पाटील',
    created_by_role: 'प्रा.आ.के. नियंत्रक / वैद्यकीय अधिकारी',
    tables: [
      'phc_master',
      'subcentre_master',
      'village_master',
      'employee_master',
      'malaria_blood_samples',
      'malaria_targets',
      'system_audit_logs',
    ],
    records_count: 25,
    status: 'यशस्वी',
    size_bytes: 42560,
    created_at: '2026-09-05T18:00:00.000Z',
  },
];

export const auditService = {
  /**
   * Get raw logs from storage
   */
  getRawLogs(): SystemAuditLog[] {
    try {
      const raw = storage.getItem(AUDIT_STORAGE_KEY);
      if (!raw) {
        storage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
        return INITIAL_AUDIT_LOGS;
      }
      return JSON.parse(raw);
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  },

  /**
   * Get logs with RLS Scoping applied
   * - PHC Controller: all logs
   * - Subcentre Employee: only their assigned subcentre or their user activities
   */
  async getAuditLogs(userRole: UserRole, userProfile?: UserProfile | null): Promise<SystemAuditLog[]> {
    let allLogs = this.getRawLogs();

    // If Supabase is configured, try fetching remote logs
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('system_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        if (!error && data && data.length > 0) {
          // Merge remote with local deduplicating by ID
          const existingIds = new Set(data.map((d: any) => d.id));
          const localOnly = allLogs.filter((l) => !existingIds.has(l.id));
          allLogs = [...data, ...localOnly];
        }
      } catch (err) {
        console.warn('Supabase audit logs fetch fallback to local:', err);
      }
    }

    // Sort newest first
    allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // RLS Scoping
    if (userRole === 'phc_controller') {
      return allLogs;
    }

    // Subcentre staff: restrict to their assigned subcentre or user ID
    if (userProfile?.assignedSubcentre) {
      const assignedSub = userProfile.assignedSubcentre.toLowerCase().trim();
      return allLogs.filter((log) => {
        // Matches user's own id
        if (log.user_id === userProfile.id) return true;
        // Matches user's name
        if (log.user_name && userProfile.marathiName && log.user_name.includes(userProfile.marathiName)) return true;
        // Matches record description containing subcentre
        if (log.record_description && log.record_description.toLowerCase().includes(assignedSub)) return true;
        // Or if new_values/old_values mentions subcentre
        const valStr = JSON.stringify({ old: log.old_values, new: log.new_values }).toLowerCase();
        if (valStr.includes(assignedSub)) return true;
        return false;
      });
    }

    return allLogs.filter((l) => l.user_id === userProfile?.id || l.role === 'subcentre_employee');
  },

  /**
   * Central Audit Logging Function
   * Immutable logging: adds new entry to start, syncs to Supabase
   */
  async logAction(entry: {
    action: AuditAction;
    module: AuditModule;
    record_id?: string | null;
    record_description?: string | null;
    old_values?: Record<string, any> | null;
    new_values?: Record<string, any> | null;
    user?: UserProfile | null;
    subcentre_id?: string | null;
    phc_id?: string | null;
  }): Promise<SystemAuditLog> {
    const user = entry.user || null;
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

    // Sanitize old and new values to prevent sensitive data leaks
    const sanitize = (obj: Record<string, any> | null | undefined) => {
      if (!obj) return null;
      const clean = { ...obj };
      delete clean.password;
      delete clean.token;
      delete clean.secret;
      delete clean.key;
      delete clean.service_role;
      return clean;
    };

    const newLog: SystemAuditLog = {
      id: generateUUID(),
      user_id: user?.id || null,
      user_name: user?.marathiName || user?.name || 'सिस्टीम (System)',
      role: user?.role || null,
      action: entry.action,
      module: entry.module,
      record_id: entry.record_id || null,
      record_description: entry.record_description || null,
      old_values: sanitize(entry.old_values),
      new_values: sanitize(entry.new_values),
      ip_address: null, // browser cannot reliably get real public IP without external call
      user_agent: userAgent,
      created_at: new Date().toISOString(),
      subcentre_id: entry.subcentre_id || null,
      phc_id: entry.phc_id || null,
    };

    // Save to local storage
    try {
      const logs = this.getRawLogs();
      logs.unshift(newLog);
      // Keep up to 2000 logs in local storage
      if (logs.length > 2000) {
        logs.length = 2000;
      }
      storage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn('Failed to save audit log to localStorage:', e);
    }

    // Try async write to Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('system_audit_logs').insert([newLog]);
      } catch (err) {
        // Non-blocking
        console.warn('Supabase audit log insert non-fatal error:', err);
      }
    }

    return newLog;
  },

  /**
   * Compute live activity metrics from audit logs
   */
  calculateMetrics(logs: SystemAuditLog[]): AuditActivityMetrics {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Calculate start of current week (Monday)
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayCount = 0;
    let thisWeekCount = 0;
    let thisMonthCount = 0;
    let sampleCreatedCount = 0;
    let sampleUpdatedCount = 0;
    let sampleDeletedCount = 0;
    let masterDataChangesCount = 0;
    let loginLogoutCount = 0;

    const masterModules = new Set(['PHC Master', 'Subcentre Master', 'Village Master', 'Employee Master']);

    for (const log of logs) {
      const logDate = new Date(log.created_at);

      // Date buckets
      if (log.created_at.startsWith(todayStr)) {
        todayCount++;
      }
      if (logDate >= startOfWeek) {
        thisWeekCount++;
      }
      if (logDate >= startOfMonth) {
        thisMonthCount++;
      }

      // Sample activity
      if (log.module === 'Malaria Sample Register') {
        if (log.action === 'CREATE') sampleCreatedCount++;
        else if (log.action === 'UPDATE') sampleUpdatedCount++;
        else if (log.action === 'DELETE') sampleDeletedCount++;
      }

      // Master data changes
      if (masterModules.has(log.module) && (log.action === 'CREATE' || log.action === 'UPDATE' || log.action === 'DELETE' || log.action === 'ACTIVATE' || log.action === 'DEACTIVATE')) {
        masterDataChangesCount++;
      }

      // Login / Logout
      if (log.action === 'LOGIN' || log.action === 'LOGOUT') {
        loginLogoutCount++;
      }
    }

    return {
      todayCount,
      thisWeekCount,
      thisMonthCount,
      sampleCreatedCount,
      sampleUpdatedCount,
      sampleDeletedCount,
      masterDataChangesCount,
      loginLogoutCount,
    };
  },

  // ==========================================
  // BACKUP OPERATIONS
  // ==========================================

  getBackupHistory(): BackupHistoryItem[] {
    try {
      const raw = storage.getItem(BACKUP_HISTORY_KEY);
      if (!raw) {
        storage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(INITIAL_BACKUP_HISTORY));
        return INITIAL_BACKUP_HISTORY;
      }
      return JSON.parse(raw);
    } catch {
      return INITIAL_BACKUP_HISTORY;
    }
  },

  /**
   * Generate Full Application Backup
   */
  async createBackup(user: UserProfile): Promise<{ payload: BackupPayload; filename: string; jsonString: string }> {
    const [phcs, subcentres, villages, employees, samples, targets] = await Promise.all([
      masterDataService.getPhcs(),
      masterDataService.getSubcentres(),
      masterDataService.getVillages(),
      masterDataService.getEmployees(),
      malariaService.getSamples(),
      targetService.getTargets(),
    ]);

    const auditLogs = this.getRawLogs();

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const filename = `malaria_health_backup_${dateStr}_${hours}-${minutes}.json`;

    const recordCounts: Record<string, number> = {
      phc_master: phcs.length,
      subcentre_master: subcentres.length,
      village_master: villages.length,
      employee_master: employees.length,
      malaria_blood_samples: samples.length,
      malaria_targets: targets.length,
      system_audit_logs: auditLogs.length,
    };

    const totalRecords = Object.values(recordCounts).reduce((a, b) => a + b, 0);

    const metadata: BackupMetadata = {
      application_name: 'आरोग्य उपकेंद्र रेकॉर्ड कीपिंग सिस्टीम (Arogya Subcentre Record Keeping System)',
      backup_date: dateStr,
      backup_time: timeStr,
      database_schema_version: '2.0.0',
      created_by: user.marathiName || user.name,
      created_by_role: user.roleTitleMarathi || user.role,
      tables_included: Object.keys(recordCounts),
      record_counts: recordCounts,
      total_records: totalRecords,
      environment: 'production-cloud-storage',
    };

    const payload: BackupPayload = {
      metadata,
      data: {
        phc_master: phcs,
        subcentre_master: subcentres,
        village_master: villages,
        employee_master: employees,
        malaria_blood_samples: samples,
        malaria_targets: targets,
        system_audit_logs: auditLogs,
      },
    };

    const jsonString = JSON.stringify(payload, null, 2);

    // Record in history
    const historyItem: BackupHistoryItem = {
      id: generateUUID(),
      backup_date: dateStr,
      backup_time: timeStr,
      filename,
      created_by: user.marathiName || user.name,
      created_by_role: user.roleTitleMarathi || user.role,
      tables: Object.keys(recordCounts),
      records_count: totalRecords,
      status: 'यशस्वी',
      size_bytes: new Blob([jsonString]).size,
      created_at: now.toISOString(),
      payload_json: jsonString,
    };

    try {
      const history = this.getBackupHistory();
      history.unshift(historyItem);
      // Keep up to 50 backups in history
      if (history.length > 50) history.length = 50;
      storage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save backup history:', e);
    }

    // Log the BACKUP action
    await this.logAction({
      action: 'BACKUP',
      module: 'System Backup',
      record_id: historyItem.id,
      record_description: `नवीन प्रणाली बॅकअप तयार केला (${totalRecords} नोंदी, फाईल: ${filename})`,
      old_values: null,
      new_values: {
        filename,
        total_records: totalRecords,
        tables: Object.keys(recordCounts),
        record_counts: recordCounts,
      },
      user,
    });

    return { payload, filename, jsonString };
  },

  /**
   * Trigger Download of Backup JSON File
   */
  downloadBackupFile(jsonString: string, filename: string): void {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Validate uploaded backup JSON
   */
  validateBackupFile(fileContent: string): {
    isValid: boolean;
    error?: string;
    payload?: BackupPayload;
  } {
    try {
      const parsed = JSON.parse(fileContent);

      if (!parsed || typeof parsed !== 'object') {
        return { isValid: false, error: 'अवैध JSON फाईल फॉरमॅट.' };
      }

      if (!parsed.metadata) {
        return { isValid: false, error: 'बॅकअप फाईलमध्ये Metadata उपलब्ध नाही.' };
      }

      if (!parsed.data || typeof parsed.data !== 'object') {
        return { isValid: false, error: 'बॅकअप फाईलमध्ये Data ऑब्जेक्ट उपलब्ध नाही.' };
      }

      // Check required tables
      const reqTables = ['phc_master', 'subcentre_master', 'village_master', 'employee_master', 'malaria_blood_samples'];
      for (const t of reqTables) {
        if (!Array.isArray(parsed.data[t])) {
          return { isValid: false, error: `अपेक्षित टेबल '${t}' बॅकअपमध्ये आढळले नाही.` };
        }
      }

      return {
        isValid: true,
        payload: parsed as BackupPayload,
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: `JSON पार्स करताना त्रुटी: ${err?.message || 'अवैध फाईल'}`,
      };
    }
  },

  /**
   * Safe Restore from validated BackupPayload
   * ONLY FOR PHC CONTROLLER
   * Automatically creates a safety backup of existing live data first!
   */
  async restoreBackup(
    backupPayload: BackupPayload,
    user: UserProfile
  ): Promise<{ success: boolean; message: string }> {
    if (user.role !== 'phc_controller') {
      throw new Error('Restore करण्याची परवानगी फक्त PHC Controller यांना आहे.');
    }

    // 1. Create automatic safety backup first!
    try {
      const safetyBackup = await this.createBackup(user);
      console.log('Automatic safety backup created before restore:', safetyBackup.filename);
    } catch (e) {
      console.warn('Safety backup creation failed, proceeding with caution:', e);
    }

    // 2. Perform Restore across localStorage
    try {
      const data = backupPayload.data;

      // Master Data
      if (Array.isArray(data.phc_master)) {
        storage.setItem('arogya_phc_master', JSON.stringify(data.phc_master));
      }
      if (Array.isArray(data.subcentre_master)) {
        storage.setItem('arogya_subcentre_master', JSON.stringify(data.subcentre_master));
      }
      if (Array.isArray(data.village_master)) {
        storage.setItem('arogya_village_master', JSON.stringify(data.village_master));
      }
      if (Array.isArray(data.employee_master)) {
        storage.setItem('arogya_employee_master', JSON.stringify(data.employee_master));
      }

      // Blood samples
      if (Array.isArray(data.malaria_blood_samples)) {
        storage.setItem('arogya_malaria_samples', JSON.stringify(data.malaria_blood_samples));
      }

      // Targets
      if (Array.isArray(data.malaria_targets)) {
        storage.setItem('arogya_malaria_targets', JSON.stringify(data.malaria_targets));
      }

      // System audit logs - merge restored logs with existing
      if (Array.isArray(data.system_audit_logs)) {
        const currentLogs = this.getRawLogs();
        const existingIds = new Set(currentLogs.map((l) => l.id));
        const merged = [...currentLogs];
        for (const log of data.system_audit_logs) {
          if (!existingIds.has(log.id)) {
            merged.push(log);
          }
        }
        storage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(merged));
      }

      // 3. Log the RESTORE action
      await this.logAction({
        action: 'RESTORE',
        module: 'System Backup',
        record_id: `rst-${Date.now()}`,
        record_description: `प्रणाली बॅकअप रिस्टोअर यशस्वी (${backupPayload.metadata.total_records} नोंदी, बॅकअप तारीख: ${backupPayload.metadata.backup_date})`,
        old_values: null,
        new_values: {
          restored_from: backupPayload.metadata.backup_date,
          tables: backupPayload.metadata.tables_included,
          record_counts: backupPayload.metadata.record_counts,
        },
        user,
      });

      return {
        success: true,
        message: `प्रणाली बॅकअप यशस्वीरित्या रिस्टोअर झाला. एकूण ${backupPayload.metadata.total_records} नोंदी पूर्ववत करण्यात आल्या.`,
      };
    } catch (err: any) {
      console.error('Error during restore operation:', err);
      throw new Error(err?.message || 'डेटा रिस्टोअर करताना त्रुटी आली.');
    }
  },
};
