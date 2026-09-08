import fs from 'fs';

const filePath = 'src/services/offlineDraftService.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Add import for TB types
content = content.replace(
  `import { OfflineMalariaDraft, OfflineSyncStatus, SyncStats, UserProfile, MalariaBloodSample } from '../types';`,
  `import { OfflineMalariaDraft, OfflineTBDraft, OfflineSyncStatus, SyncStats, UserProfile, MalariaBloodSample, TBPatientRecord } from '../types';\nimport { tbService } from './tbService';`
);

// Add TB storage key
content = content.replace(
  `const DRAFTS_STORAGE_KEY = 'arogya_malaria_offline_drafts';`,
  `const DRAFTS_STORAGE_KEY = 'arogya_malaria_offline_drafts';\nconst TB_DRAFTS_STORAGE_KEY = 'arogya_tb_offline_drafts';`
);

// Add TB drafts methods
const getDraftsReplace = `  getTBDrafts(user?: UserProfile | null): OfflineTBDraft[] {
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
        if (onProgress) onProgress(\`Syncing TB \${draft.payload.patient_name}...\`);
        const payloadToSave = { ...draft.payload } as Omit<TBPatientRecord, 'id'>;
        await tbService.addSample(payloadToSave);
        this.removeTBDraft(draft.draftId);
        successCount++;
        
        await auditService.logAction({
          action: 'TB_CREATE',
          module: 'NTEP Data Entry',
          record_description: \`Synced offline TB record: \${payloadToSave.patient_name}\`,
          new_values: payloadToSave
        });
      } catch (err: any) {
        failedCount++;
      }
    }
    notifySyncStatusChanged();
    return { success: successCount, failed: failedCount, total: drafts.length };
  },

  getDrafts(`;
content = content.replace("  getDrafts(", getDraftsReplace);

const getSyncStatsReplace = `  getSyncStats(user: UserProfile | null): SyncStats {
    const malDrafts = this.getDrafts(user);
    const tbDrafts = this.getTBDrafts(user);
    const lastSyncStr = localStorage.getItem(LAST_SYNC_KEY);
    return {
      pending: malDrafts.length + tbDrafts.length,
      lastSyncTime: lastSyncStr ? parseInt(lastSyncStr, 10) : null,
    };
  },`;
content = content.replace(/  getSyncStats\(user: UserProfile \| null\): SyncStats \{[\s\S]*?\},/, getSyncStatsReplace);

fs.writeFileSync(filePath, content, 'utf8');
