import { storage } from '../lib/storage';
import { TBPatientRecord, GenderType, TBSampleType, TBSampleGivenAt } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { masterDataService } from './masterDataService';
import { isDemoMode } from '../lib/env';
import { assertValidUUID } from '../utils/uuid';

const STORAGE_KEY = 'arogya_tb_samples';

const DEFAULT_SAMPLES: TBPatientRecord[] = [];

export const formatIndianDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const getTodayDateString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function getLocalData(): TBPatientRecord[] {
  const data = storage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : DEFAULT_SAMPLES;
}

function setLocalData(data: TBPatientRecord[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}

class TBService {
  async getSamples(filters?: { employee_id?: string; phc_id?: string }): Promise<TBPatientRecord[]> {
    let samples: TBPatientRecord[] = [];
    
    if (isSupabaseConfigured() && supabase) {
      let query = supabase.from('tb_suspected_patient_register').select('*');
      if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id);
      if (filters?.phc_id) query = query.eq('phc_id', filters.phc_id);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) console.error('Supabase error fetching TB samples:', error);
      else samples = data as TBPatientRecord[];
    } else {
      samples = getLocalData();
      if (filters?.employee_id) {
        samples = samples.filter((s) => s.employee_id === filters.employee_id);
      }
      if (filters?.phc_id) {
        samples = samples.filter((s) => s.phc_id === filters.phc_id);
      }
      samples.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }

    // Enrich with names
    const villages = await masterDataService.getVillages();
    const employees = await masterDataService.getEmployees();
    
    return samples.map(sample => {
      const village = villages.find(v => v.id === sample.village_id);
      const employee = employees.find(e => e.id === sample.employee_id);
      return {
        ...sample,
        village_name: village?.village_name,
        subcentre_name: village?.subcentre_name,
        phc_name: village?.phc_name,
        employee_name: employee?.employee_name
      };
    });
  }

  async addSample(sample: Omit<TBPatientRecord, 'id'>): Promise<TBPatientRecord> {
    if (sample.village_id) assertValidUUID(sample.village_id, 'गाव ID');
    if (sample.employee_id) assertValidUUID(sample.employee_id, 'कर्मचारी ID');
    if (sample.phc_id) assertValidUUID(sample.phc_id, 'प्रा.आ.के. ID');

    const newSample: TBPatientRecord = {
      ...sample,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.from('tb_suspected_patient_register').insert([newSample]).select();
      if (error) {
        console.error('Supabase TB insert error:', error);
        throw new Error(`क्षयरोग नोंद जतन करता आली नाही: ${error.message}`);
      }
      return data[0] as TBPatientRecord;
    } else {
      if (!isDemoMode()) {
        throw new Error('Supabase कॉन्फिगर केलेले नाही.');
      }
      const data = getLocalData();
      data.unshift(newSample);
      setLocalData(data);
      return newSample;
    }
  }

  async updateSample(id: string, updates: Partial<TBPatientRecord>): Promise<TBPatientRecord> {
    assertValidUUID(id, 'क्षयरोग नोंद ID');
    if (updates.village_id) assertValidUUID(updates.village_id, 'गाव ID');
    if (updates.employee_id) assertValidUUID(updates.employee_id, 'कर्मचारी ID');
    if (updates.phc_id) assertValidUUID(updates.phc_id, 'प्रा.आ.के. ID');

    const enrichedUpdates = { ...updates, updated_at: new Date().toISOString() };
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.from('tb_suspected_patient_register').update(enrichedUpdates).eq('id', id).select();
      if (error) {
        console.error('Supabase TB update error:', error);
        throw new Error(`क्षयरोग नोंद अद्ययावत करता आली नाही: ${error.message}`);
      }
      return data[0] as TBPatientRecord;
    } else {
      if (!isDemoMode()) {
        throw new Error('Supabase कॉन्फिगर केलेले नाही.');
      }
      const data = getLocalData();
      const index = data.findIndex(s => s.id === id);
      if (index === -1) throw new Error('Record not found');
      data[index] = { ...data[index], ...enrichedUpdates };
      setLocalData(data);
      return data[index];
    }
  }

  async deleteSample(id: string): Promise<void> {
    assertValidUUID(id, 'क्षयरोग नोंद ID');
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('tb_suspected_patient_register').delete().eq('id', id);
      if (error) {
        console.error('Supabase TB delete error:', error);
        throw new Error(`क्षयरोग नोंद हटवता आली नाही: ${error.message}`);
      }
    } else {
      if (!isDemoMode()) {
        throw new Error('Supabase कॉन्फिगर केलेले नाही.');
      }
      let data = getLocalData();
      data = data.filter(s => s.id !== id);
      setLocalData(data);
    }
  }
}

export const tbService = new TBService();
