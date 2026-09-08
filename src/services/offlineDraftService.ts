import { OfflineMalariaDraft, OfflineTBDraft, OfflineSyncStatus, SyncStats, UserProfile, MalariaBloodSample, TBPatientRecord } from '../types';
import { tbService } from './tbService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { malariaService } from './malariaService';
import { masterDataService } from './masterDataService';
import { auditService } from './auditService';

const DRAFTS_STORAGE_KEY = 'arogya_malaria_offline_drafts';
const TB_DRAFTS_STORAGE_KEY = 'arogya_tb_offline_drafts';
const LAST_SYNC_KEY = 'arogya_last_sync_timestamp';

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

function notifySyncStatusChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('arogya-sync-status-changed'));
  }
}

export const offlineDraftService = {
  /**
   * Get all drafts stored in localStorage
   * Filtered by user or employee ID to protect privacy across accounts
   */
  getTBDrafts(user?: UserProfile | null): OfflineTBDraft[] {
    try {
      const raw = localStorage.getItem(TB_DRAFTS_STORAGE_KEY);
      if (!raw) return [];
      const drafts: OfflineTBDraft[] = JSON.parse(raw);
      if (!user) return drafts;
      return drafts.filter((d) => {
        if (user.role === 'phc_controller') return true;
        if (user.employeeId && d.employeeId === user.employeeId) return true;
        return false;
      });
    } catch (e) {
      return [];
    }
  },
  
  async saveTBDraft(payload: Partial<TBPatientRecord>, user: UserProfile): Promise<void> {
    const drafts = this.getTBDrafts();
    const clientRecordId = payload.client_record_id || generateUUID();
    const draft: OfflineTBDraft = {
      draftId: generateUUID(),
      clientRecordId,
      employeeId: user.employeeId || '',
      timestamp: Date.now(),
      payload: {
        ...payload,
        client_record_id: clientRecordId,
      },
    };
    drafts.push(draft);
    localStorage.setItem(TB_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    notifySyncStatusChanged();
  },

  removeTBDraft(draftId: string): void {
    const drafts = this.getTBDrafts();
    const updated = drafts.filter((d) => d.draftId !== draftId);
    localStorage.setItem(TB_DRAFTS_STORAGE_KEY, JSON.stringify(updated));
    notifySyncStatusChanged();
  },

  async syncAllTBDrafts(user: UserProfile, onProgress?: (msg: string) => void): Promise<{ success: number; failed: number; total: number }> {
    const drafts = this.getTBDrafts(user);
    if (drafts.length === 0) return { success: 0, failed: 0, total: 0 };
    
    let successCount = 0;
    let failedCount = 0;

    for (const draft of drafts) {
      try {
        if (onProgress) onProgress(`Syncing TB ${draft.payload.patient_name}...`);
        const payloadToSave = { ...draft.payload } as Omit<TBPatientRecord, 'id'>;
        await tbService.addSample(payloadToSave);
        this.removeTBDraft(draft.draftId);
        successCount++;
        
        await auditService.logAction({
          action: 'CREATE',
          module: 'TB Register',
          record_description: `Synced offline TB record: ${payloadToSave.patient_name}`,
          new_values: payloadToSave
        });
      } catch (err: any) {
        failedCount++;
      }
    }
    notifySyncStatusChanged();
    return { success: successCount, failed: failedCount, total: drafts.length };
  },

  getDrafts(user?: UserProfile | null): OfflineMalariaDraft[] {
    try {
      const raw = localStorage.getItem(DRAFTS_STORAGE_KEY);
      if (!raw) return [];
      const drafts: OfflineMalariaDraft[] = JSON.parse(raw);

      if (!user) return drafts;

      // Filter by current user profile or employee scope
      return drafts.filter((d) => {
        if (d.created_by_user_id && user.id && d.created_by_user_id === user.id) return true;
        if (d.employee_id && user.employeeId && d.employee_id === user.employeeId) return true;
        // If no user tag exists yet (legacy/demo), allow viewing if same role or controller
        if (!d.created_by_user_id && user.role === 'phc_controller') return true;
        return !d.created_by_user_id;
      });
    } catch (err) {
      console.error('Failed to load offline drafts:', err);
      return [];
    }
  },

  /**
   * Get single draft by local ID
   */
  getDraftById(localId: string): OfflineMalariaDraft | undefined {
    const drafts = this.getAllRawDrafts();
    return drafts.find((d) => d.local_id === localId);
  },

  /**
   * Internal: Get all raw drafts without user filter
   */
  getAllRawDrafts(): OfflineMalariaDraft[] {
    try {
      const raw = localStorage.getItem(DRAFTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Save a new or edited offline draft
   */
  async saveDraft(
    draftInput: Omit<OfflineMalariaDraft, 'local_id' | 'created_at' | 'updated_at' | 'sync_status' | 'retry_count'> & {
      local_id?: string;
    },
    currentUser: UserProfile
  ): Promise<OfflineMalariaDraft> {
    const isEdit = Boolean(draftInput.local_id);
    const localId = draftInput.local_id || generateUUID();
    const nowIso = new Date().toISOString();

    const dateObj = new Date(draftInput.sample_collection_date);
    const sampleYear = dateObj.getFullYear() || new Date().getFullYear();

    // Fetch helper labels if missing
    let villageName = draftInput.village_name;
    let employeeName = draftInput.employee_name;
    let subcentreName = draftInput.subcentre_name;
    let phcName = draftInput.phc_name;

    if (!villageName && draftInput.village_id) {
      const villages = await masterDataService.getVillages();
      const v = villages.find((item) => item.id === draftInput.village_id);
      if (v) villageName = v.village_name;
    }

    if (!employeeName && draftInput.employee_id) {
      const employees = await masterDataService.getEmployees();
      const emp = employees.find((item) => item.id === draftInput.employee_id);
      if (emp) employeeName = emp.employee_name;
    }

    const draftRecord: OfflineMalariaDraft = {
      local_id: localId,
      employee_id: draftInput.employee_id,
      village_id: draftInput.village_id,
      house_number: draftInput.house_number ? draftInput.house_number.trim() : '',
      patient_name: draftInput.patient_name ? draftInput.patient_name.trim() : '',
      age: Number(draftInput.age),
      gender: draftInput.gender,
      sample_collection_date: draftInput.sample_collection_date,
      sample_year: sampleYear,
      malaria_smear_code: draftInput.malaria_smear_code,
      village_name: villageName,
      employee_name: employeeName,
      subcentre_name: subcentreName,
      phc_name: phcName,
      sync_status: 'DRAFT',
      retry_count: 0,
      last_error: null,
      created_at: isEdit ? (this.getDraftById(localId)?.created_at || nowIso) : nowIso,
      updated_at: nowIso,
      created_by_user_id: currentUser.id,
    };

    const allDrafts = this.getAllRawDrafts();
    const existingIndex = allDrafts.findIndex((d) => d.local_id === localId);

    if (existingIndex >= 0) {
      allDrafts[existingIndex] = {
        ...allDrafts[existingIndex],
        ...draftRecord,
        updated_at: nowIso,
      };
    } else {
      allDrafts.unshift(draftRecord);
    }

    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(allDrafts));
    notifySyncStatusChanged();
    return draftRecord;
  },

  /**
   * Delete a draft from storage
   */
  deleteDraft(localId: string): boolean {
    const allDrafts = this.getAllRawDrafts();
    const filtered = allDrafts.filter((d) => d.local_id !== localId);
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(filtered));
    notifySyncStatusChanged();
    return true;
  },

  /**
   * Update draft status in storage
   */
  updateDraftStatus(
    localId: string,
    updates: Partial<OfflineMalariaDraft>
  ): OfflineMalariaDraft | null {
    const allDrafts = this.getAllRawDrafts();
    const idx = allDrafts.findIndex((d) => d.local_id === localId);
    if (idx === -1) return null;

    allDrafts[idx] = {
      ...allDrafts[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(allDrafts));
    notifySyncStatusChanged();
    return allDrafts[idx];
  },

  /**
   * Get sync statistics for dashboard and header
   */
  getSyncStats(user?: UserProfile | null): SyncStats {
    const drafts = this.getDrafts(user);
    const lastSyncTime = localStorage.getItem(LAST_SYNC_KEY);

    let pending = 0;
    let syncing = 0;
    let synced = 0;
    let failed = 0;

    for (const d of drafts) {
      if (d.sync_status === 'DRAFT') pending++;
      else if (d.sync_status === 'SYNCING') syncing++;
      else if (d.sync_status === 'SYNCED') synced++;
      else if (d.sync_status === 'FAILED') failed++;
    }

    return {
      total: drafts.length,
      pending: pending + failed, // Pending sync
      syncing,
      synced,
      failed,
      lastSyncTime,
    };
  },

  /**
   * Synchronize a single offline draft safely to Supabase
   * - Validates connectivity and fields
   * - Uses client_record_id for duplicate protection (idempotency)
   * - Final sample number is ASSIGNED by database sequence, NOT by client!
   * - Triggers official audit log CREATE on database success
   */
  async syncDraft(
    localId: string,
    currentUser: UserProfile
  ): Promise<{ success: boolean; sampleNumber?: number; smearCode?: string; message: string }> {
    const draft = this.getDraftById(localId);
    if (!draft) {
      return { success: false, message: 'ड्राफ्ट रेकॉर्ड सापडला नाही.' };
    }

    // Check network connectivity
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateDraftStatus(localId, {
        sync_status: 'FAILED',
        last_error: 'सध्या इंटरनेट कनेक्शन उपलब्ध नाही.',
      });
      return { success: false, message: 'सध्या इंटरनेट कनेक्शन उपलब्ध नाही.' };
    }

    // Mark syncing
    this.updateDraftStatus(localId, { sync_status: 'SYNCING' });

    try {
      // Validate core required fields
      if (!draft.patient_name || !draft.patient_name.trim()) {
        throw new Error('रुग्णाचे नाव अपूर्ण आहे.');
      }
      if (!draft.age || draft.age <= 0 || draft.age > 120) {
        throw new Error('वय १ ते १२० दरम्यान असणे आवश्यक आहे.');
      }
      if (!draft.village_id) {
        throw new Error('गाव निवडलेले नाही.');
      }
      if (!draft.employee_id) {
        throw new Error('कर्मचारी माहिती अपूर्ण आहे.');
      }
      if (!draft.sample_collection_date) {
        throw new Error('नमुना दिनांक अपूर्ण आहे.');
      }

      const sampleYear = draft.sample_year || new Date(draft.sample_collection_date).getFullYear();

      // Check if Supabase is connected
      if (isSupabaseConfigured() && supabase) {
        // Step 1: Duplicate check via client_record_id (idempotency key)
        const { data: existingRecords, error: checkError } = await supabase
          .from('malaria_blood_samples')
          .select('id, sample_number, malaria_smear_code')
          .eq('client_record_id', localId)
          .limit(1);

        if (!checkError && existingRecords && existingRecords.length > 0) {
          const existing = existingRecords[0];
          // Already successfully synced earlier!
          this.updateDraftStatus(localId, {
            sync_status: 'SYNCED',
            synced_sample_id: existing.id,
            synced_sample_number: existing.sample_number,
            synced_smear_code: existing.malaria_smear_code,
            synced_at: new Date().toISOString(),
            last_error: null,
          });

          localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
          notifySyncStatusChanged();

          return {
            success: true,
            sampleNumber: existing.sample_number,
            smearCode: existing.malaria_smear_code,
            message: `नोंद आधीच डेटाबेसमध्ये जतन झालेली आहे. नमुना क्र.: ${String(existing.sample_number).padStart(4, '0')}`,
          };
        }

        // Step 2: Concurrency-safe database-generated sample number
        const assignedSampleNumber = await malariaService.getNextSampleNumber(
          draft.employee_id,
          sampleYear
        );

        // Step 3: Insert record into Supabase with client_record_id
        const insertPayload: any = {
          employee_id: draft.employee_id,
          village_id: draft.village_id,
          house_number: draft.house_number ? draft.house_number.trim() : null,
          patient_name: draft.patient_name.trim(),
          age: Number(draft.age),
          gender: draft.gender,
          sample_collection_date: draft.sample_collection_date,
          sample_number: assignedSampleNumber,
          sample_year: sampleYear,
          malaria_smear_code: draft.malaria_smear_code,
          client_record_id: localId,
          sent_date: null, // New sample remains NULL (not dispatched yet)
        };

        const { data: inserted, error: insertError } = await supabase
          .from('malaria_blood_samples')
          .insert(insertPayload)
          .select('id, sample_number, malaria_smear_code')
          .single();

        if (insertError) {
          // If collision occurred on client_record_id, fetch existing record
          if (insertError.code === '23505' && insertError.message?.includes('client_record_id')) {
            const { data: rec } = await supabase
              .from('malaria_blood_samples')
              .select('id, sample_number, malaria_smear_code')
              .eq('client_record_id', localId)
              .single();

            if (rec) {
              this.updateDraftStatus(localId, {
                sync_status: 'SYNCED',
                synced_sample_id: rec.id,
                synced_sample_number: rec.sample_number,
                synced_smear_code: rec.malaria_smear_code,
                synced_at: new Date().toISOString(),
                last_error: null,
              });
              return {
                success: true,
                sampleNumber: rec.sample_number,
                smearCode: rec.malaria_smear_code,
                message: `ऑफलाइन नोंद यशस्वीरित्या मुख्य डेटाबेसमध्ये जतन झाली. नमुना क्र.: ${String(rec.sample_number).padStart(4, '0')}`,
              };
            }
          }

          // If collision occurred on uq_employee_year_sample, retry once with next number
          if (insertError.code === '23505') {
            const retryNum = await malariaService.getNextSampleNumber(draft.employee_id, sampleYear);
            insertPayload.sample_number = retryNum;
            const retryRes = await supabase
              .from('malaria_blood_samples')
              .insert(insertPayload)
              .select('id, sample_number, malaria_smear_code')
              .single();

            if (!retryRes.error && retryRes.data) {
              const res = retryRes.data;
              this.updateDraftStatus(localId, {
                sync_status: 'SYNCED',
                synced_sample_id: res.id,
                synced_sample_number: res.sample_number,
                synced_smear_code: res.malaria_smear_code,
                synced_at: new Date().toISOString(),
                last_error: null,
              });

              // Official Audit Trail CREATE event
              auditService.logAction({
                action: 'CREATE',
                module: 'Malaria Sample Register',
                record_id: res.id,
                record_description: `ऑफलाइन ड्राफ्ट सिंक: ${draft.patient_name} (नमुना क्र.: ${res.sample_number})`,
                new_values: {
                  sample_number: res.sample_number,
                  client_record_id: localId,
                  patient_name: draft.patient_name,
                  offline_sync: true,
                },
                user: currentUser,
              });

              localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
              notifySyncStatusChanged();

              return {
                success: true,
                sampleNumber: res.sample_number,
                smearCode: res.malaria_smear_code,
                message: `ऑफलाइन नोंद यशस्वीरित्या मुख्य डेटाबेसमध्ये जतन झाली. नमुना क्र.: ${String(res.sample_number).padStart(4, '0')}`,
              };
            }
          }

          throw new Error(insertError.message || 'डेटाबेस इन्सर्ट अयशस्वी झाले.');
        }

        // Sync successful with Supabase!
        const finalNum = inserted.sample_number;
        const finalCode = inserted.malaria_smear_code;

        this.updateDraftStatus(localId, {
          sync_status: 'SYNCED',
          synced_sample_id: inserted.id,
          synced_sample_number: finalNum,
          synced_smear_code: finalCode,
          synced_at: new Date().toISOString(),
          last_error: null,
        });

        // Official Audit Trail CREATE event
        auditService.logAction({
          action: 'CREATE',
          module: 'Malaria Sample Register',
          record_id: inserted.id,
          record_description: `ऑफलाइन ड्राफ्ट सिंक: ${draft.patient_name} (नमुना क्र.: ${finalNum})`,
          new_values: {
            sample_number: finalNum,
            client_record_id: localId,
            patient_name: draft.patient_name,
            offline_sync: true,
          },
          user: currentUser,
        });

        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
        notifySyncStatusChanged();

        return {
          success: true,
          sampleNumber: finalNum,
          smearCode: finalCode,
          message: `ऑफलाइन नोंद यशस्वीरित्या मुख्य डेटाबेसमध्ये जतन झाली. नमुना क्र.: ${String(finalNum).padStart(4, '0')}`,
        };
      } else {
        // Fallback local storage synchronization when Supabase not configured in preview
        const assignedSampleNumber = await malariaService.getNextSampleNumber(
          draft.employee_id,
          sampleYear
        );

        const newSample = await malariaService.saveSample({
          employee_id: draft.employee_id,
          village_id: draft.village_id,
          house_number: draft.house_number,
          patient_name: draft.patient_name,
          age: draft.age,
          gender: draft.gender,
          sample_collection_date: draft.sample_collection_date,
          sample_number: assignedSampleNumber,
          sample_year: sampleYear,
          malaria_smear_code: draft.malaria_smear_code,
          sent_date: null,
          client_record_id: localId,
        });

        this.updateDraftStatus(localId, {
          sync_status: 'SYNCED',
          synced_sample_id: newSample.id,
          synced_sample_number: newSample.sample_number,
          synced_smear_code: newSample.malaria_smear_code,
          synced_at: new Date().toISOString(),
          last_error: null,
        });

        auditService.logAction({
          action: 'CREATE',
          module: 'Malaria Sample Register',
          record_id: newSample.id,
          record_description: `ऑफलाइन ड्राफ्ट सिंक: ${draft.patient_name} (नमुना क्र.: ${newSample.sample_number})`,
          new_values: {
            sample_number: newSample.sample_number,
            client_record_id: localId,
            patient_name: draft.patient_name,
            offline_sync: true,
          },
          user: currentUser,
        });

        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
        notifySyncStatusChanged();

        return {
          success: true,
          sampleNumber: newSample.sample_number,
          smearCode: newSample.malaria_smear_code,
          message: `ऑफलाइन नोंद यशस्वीरित्या मुख्य डेटाबेसमध्ये जतन झाली. नमुना क्र.: ${String(newSample.sample_number).padStart(4, '0')}`,
        };
      }
    } catch (err: any) {
      console.error('Draft sync failed:', err);
      const errMsg = err?.message || 'सिंक्रोनाइझेशन दरम्यान अज्ञात त्रुटी उद्भवली.';
      this.updateDraftStatus(localId, {
        sync_status: 'FAILED',
        retry_count: (draft.retry_count || 0) + 1,
        last_error: errMsg,
      });

      notifySyncStatusChanged();
      return { success: false, message: errMsg };
    }
  },

  /**
   * Sync all pending or failed drafts
   */
  async syncAllDrafts(currentUser: UserProfile): Promise<{
    total: number;
    synced: number;
    failed: number;
    messages: string[];
  }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        total: 0,
        synced: 0,
        failed: 0,
        messages: ['सध्या इंटरनेट कनेक्शन उपलब्ध नाही.'],
      };
    }

    const drafts = this.getDrafts(currentUser).filter(
      (d) => d.sync_status === 'DRAFT' || d.sync_status === 'FAILED'
    );

    let synced = 0;
    let failed = 0;
    const messages: string[] = [];

    for (const draft of drafts) {
      const res = await this.syncDraft(draft.local_id, currentUser);
      if (res.success) {
        synced++;
        messages.push(`${draft.patient_name}: ${res.message}`);
      } else {
        failed++;
        messages.push(`${draft.patient_name}: त्रुटी - ${res.message}`);
      }
    }

    if (synced > 0) {
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    }

    notifySyncStatusChanged();
    return {
      total: drafts.length,
      synced,
      failed,
      messages,
    };
  },
};
