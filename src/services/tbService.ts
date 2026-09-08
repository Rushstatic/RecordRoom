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

function normalizeTBGender(gender: any): 'पुरुष' | 'स्त्री' | 'इतर' {
  if (!gender) return 'पुरुष';
  const g = String(gender).trim().toLowerCase();
  if (g === 'female' || g === 'f' || g === 'स्त्री' || g === 'महिला') return 'स्त्री';
  if (g === 'other' || g === 'o' || g === 'इतर') return 'इतर';
  return 'पुरुष';
}

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
      if (filters?.employee_id) {
        assertValidUUID(filters.employee_id, 'कर्मचारी ID');
        query = query.eq('employee_id', filters.employee_id);
      }
      if (filters?.phc_id) {
        assertValidUUID(filters.phc_id, 'प्रा.आ.के. ID');
        query = query.eq('phc_id', filters.phc_id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase error fetching TB samples:', error);
        if (!isDemoMode()) {
          throw new Error(`क्षयरोग यादी आणता आली नाही: ${error.message}`);
        }
      } else {
        samples = data as TBPatientRecord[];
      }
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
    assertValidUUID(sample.employee_id, 'कर्मचारी ID');
    assertValidUUID(sample.phc_id, 'प्रा.आ.के. ID');
    assertValidUUID(sample.subcentre_id, 'उपकेंद्र ID');
    if (sample.village_id) assertValidUUID(sample.village_id, 'गाव ID');

    if (sample.sample_sent_date < sample.sample_collection_date) {
      throw new Error('नमुना पाठवल्याची तारीख नमुना घेतल्याच्या तारखेपेक्षा आधीची असू शकत नाही.');
    }
    if (sample.sample_type !== 'FoodBasket' && (!sample.sample_given_at || !sample.sample_given_at.trim())) {
      throw new Error('नमुना कोठे दिला (Sample Given At) निवडणे आवश्यक आहे.');
    }

    const newSample: TBPatientRecord = {
      ...sample,
      gender: normalizeTBGender(sample.gender),
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = {
        id: newSample.id,
        employee_id: newSample.employee_id,
        phc_id: newSample.phc_id,
        subcentre_id: newSample.subcentre_id,
        village_id: newSample.village_id || null,
        patient_name: newSample.patient_name.trim(),
        age: Number(newSample.age),
        gender: newSample.gender,
        mobile_number: newSample.mobile_number ? newSample.mobile_number.trim() : null,
        nikshay_id: newSample.nikshay_id ? newSample.nikshay_id.trim() : null,
        sample_collection_date: newSample.sample_collection_date,
        sample_sent_date: newSample.sample_sent_date,
        risk_type: newSample.risk_type,
        sample_type: newSample.sample_type,
        sample_given_at: newSample.sample_given_at ? newSample.sample_given_at.trim() : null,
        created_at: newSample.created_at,
        updated_at: newSample.updated_at,
      };

      const { data, error } = await supabase.from('tb_suspected_patient_register').insert([dbPayload]).select();
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
    if (updates.subcentre_id) assertValidUUID(updates.subcentre_id, 'उपकेंद्र ID');

    const enrichedUpdates = { 
      ...updates, 
      ...(updates.gender ? { gender: normalizeTBGender(updates.gender) } : {}),
      updated_at: new Date().toISOString() 
    };

    if (isSupabaseConfigured() && supabase) {
      const dbUpdates: any = {
        updated_at: enrichedUpdates.updated_at,
      };
      if (updates.employee_id) dbUpdates.employee_id = updates.employee_id;
      if (updates.phc_id) dbUpdates.phc_id = updates.phc_id;
      if (updates.subcentre_id) dbUpdates.subcentre_id = updates.subcentre_id;
      if (updates.village_id !== undefined) dbUpdates.village_id = updates.village_id || null;
      if (updates.patient_name !== undefined) dbUpdates.patient_name = updates.patient_name.trim();
      if (updates.age !== undefined) dbUpdates.age = Number(updates.age);
      if (updates.gender !== undefined) dbUpdates.gender = normalizeTBGender(updates.gender);
      if (updates.mobile_number !== undefined) dbUpdates.mobile_number = updates.mobile_number ? updates.mobile_number.trim() : null;
      if (updates.nikshay_id !== undefined) dbUpdates.nikshay_id = updates.nikshay_id ? updates.nikshay_id.trim() : null;
      if (updates.sample_collection_date !== undefined) dbUpdates.sample_collection_date = updates.sample_collection_date;
      if (updates.sample_sent_date !== undefined) dbUpdates.sample_sent_date = updates.sample_sent_date;
      if (updates.risk_type !== undefined) dbUpdates.risk_type = updates.risk_type;
      if (updates.sample_type !== undefined) dbUpdates.sample_type = updates.sample_type;
      if (updates.sample_given_at !== undefined) dbUpdates.sample_given_at = updates.sample_given_at ? updates.sample_given_at.trim() : null;

      const { data, error } = await supabase.from('tb_suspected_patient_register').update(dbUpdates).eq('id', id).select();
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
