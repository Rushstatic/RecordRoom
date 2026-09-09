import { storage } from '../lib/storage';
import { PhcMaster, SubcentreMaster, VillageMaster, EmployeeMaster, DashboardMetrics } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isDemoMode } from '../lib/env';
import { assertValidUUID, isValidUUID } from '../utils/uuid';

// Standard realistic Seed Data matching actual Supabase records
const DEFAULT_PHCS: PhcMaster[] = [
  {
    id: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
    phc_name: 'प्राथमिक आरोग्य केंद्र भादा',
    phc_code: 'PHC-615',
    taluka: 'औसा',
    district: 'लातूर',
    created_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    phc_name: 'प्राथमिक आरोग्य केंद्र, शिक्रापूर',
    phc_code: 'PHC-PUN-015',
    taluka: 'शिरूर',
    district: 'पुणे',
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_SUBCENTRES: SubcentreMaster[] = [
  {
    id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    phc_id: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
    subcentre_name: 'शिवली',
    subcentre_code: 'SC-842',
    created_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    phc_id: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
    subcentre_name: 'आरोग्य उपकेंद्र, तळेगाव ढमढेरे',
    subcentre_code: 'SC-TLG-02',
    created_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012',
    phc_id: '9dc0d6cf-d4fe-4554-a5ec-7d4f63a5d8da',
    subcentre_name: 'आरोग्य उपकेंद्र, कोरेगाव मूळ',
    subcentre_code: 'SC-KRD-03',
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_VILLAGES: VillageMaster[] = [
  {
    id: 'f4d995fa-8245-4922-b9d3-642cec604923',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    village_name: 'शिवली',
    population: 2850,
    total_houses: 540,
    created_at: new Date().toISOString(),
  },
  {
    id: '9b74805a-25a6-4ac1-ac9e-04ca9fe1e28f',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    village_name: 'वरवडा',
    population: 1420,
    total_houses: 260,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fffb5580-a7de-4924-acef-2b459be7f273',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    village_name: 'जायफळ',
    population: 1150,
    total_houses: 190,
    created_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440021',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    village_name: 'तळेगाव ढमढेरे (मुख्य)',
    population: 3900,
    total_houses: 720,
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_EMPLOYEES: EmployeeMaster[] = [
  {
    id: '01258fa4-ab98-47e1-884d-28caea471410',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    employee_name: 'श्री. गोविंद हिप्परगेकर',
    designation: 'मास्टर ॲडमिन / प्रा.आ.के. नियंत्रक',
    mobile_number: '9730266586',
    email: 'phbhada@gmail.com',
    malaria_smear_code: 'BHADA-ADM',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cbbe9908-d712-4f22-978b-061d7abcf42b',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    employee_name: 'श्री अनिल एकनाथ भराडे',
    designation: 'बहुउद्देशीय आरोग्य सेवक (MPW)',
    mobile_number: '9823456789',
    email: 'rahul.mpw@arogya.gov.in',
    malaria_smear_code: '54V1',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '01258fa4-ab98-47e1-884d-28caea471415',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    employee_name: 'डॉ. प्रियांका शिंदे',
    designation: 'समुदाय आरोग्य अधिकारी (CHO)',
    mobile_number: '9922114433',
    email: 'priyanka.cho@arogya.gov.in',
    malaria_smear_code: '54V2',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '01258fa4-ab98-47e1-884d-28caea471416',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    employee_name: 'सौ. सुनिता एम. कांबळे',
    designation: 'आरोग्य सेविका (ANM)',
    mobile_number: '9765098765',
    email: 'anm.vadgaon1@arogya.gov.in',
    malaria_smear_code: '54V3',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440031',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    employee_name: 'श्रीमती अनिता मोरे',
    designation: 'आरोग्य सेविका (ANM)',
    mobile_number: '9822776655',
    malaria_smear_code: 'TLG-ANM-1',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440032',
    subcentre_id: '4e6bf085-07e6-4c93-b366-5fb61fd1c618',
    employee_name: 'श्री. विकास एस. जाधव',
    designation: 'आरोग्य सेवक (MPW)',
    mobile_number: '9421098765',
    malaria_smear_code: 'KRD-MPW-1',
    is_active: false,
    created_at: new Date().toISOString(),
  },
];

// Local storage key constants
const KEYS = {
  PHC: 'arogya_phc_master',
  SUBCENTRE: 'arogya_subcentre_master',
  VILLAGE: 'arogya_village_master',
  EMPLOYEE: 'arogya_employee_master',
};

// Local storage helpers
function getLocal<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) {
      storage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T[]) {
  try {
    storage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage', e);
  }
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const masterDataService = {
  // ==========================================
  // 1. PHC MASTER OPERATIONS
  // ==========================================
  async getPhcs(): Promise<PhcMaster[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('phc_master')
          .select('*')
          .order('phc_name', { ascending: true });
        if (!error && data) {
          setLocal(KEYS.PHC, data);
          return data;
        }
        if (error) {
          console.error('[masterDataService.getPhcs] Supabase query error:', error);
          if (!isDemoMode()) {
            const cached = getLocal<PhcMaster>(KEYS.PHC, []);
            if (cached.length > 0) return cached;
            throw new Error(`PHC माहिती लोड करता आली नाही: ${error.message}`);
          }
        }
      } catch (e: any) {
        console.error('[masterDataService.getPhcs] Exception:', e);
        if (!isDemoMode()) {
          const cached = getLocal<PhcMaster>(KEYS.PHC, []);
          if (cached.length > 0) return cached;
          throw e;
        }
      }
    }
    return getLocal<PhcMaster>(KEYS.PHC, DEFAULT_PHCS);
  },

  async createPhc(payload: Omit<PhcMaster, 'id' | 'created_at'>): Promise<PhcMaster> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('phc_master')
        .insert([payload])
        .select()
        .single();
      if (error) {
        console.error('[masterDataService.createPhc] Supabase error:', error);
        if (!isDemoMode()) {
          throw new Error(`PHC नोंद जतन करता आली नाही: ${error.message}`);
        }
      } else if (data) {
        const list = getLocal<PhcMaster>(KEYS.PHC, DEFAULT_PHCS);
        list.push(data);
        setLocal(KEYS.PHC, list);
        return data;
      }
    }
    if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही. कृपया डेटाबेस जोडणी तपासा.');
    }
    const list = getLocal<PhcMaster>(KEYS.PHC, DEFAULT_PHCS);
    const newPhc: PhcMaster = {
      ...payload,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    list.push(newPhc);
    setLocal(KEYS.PHC, list);
    return newPhc;
  },

  async updatePhc(id: string, payload: Partial<PhcMaster>): Promise<PhcMaster> {
    assertValidUUID(id, 'PHC ID');
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('phc_master')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error('[masterDataService.updatePhc] Supabase error:', error);
        if (!isDemoMode()) {
          throw new Error(`PHC माहिती अद्ययावत करता आली नाही: ${error.message}`);
        }
      } else if (data) {
        const list = getLocal<PhcMaster>(KEYS.PHC, DEFAULT_PHCS);
        const idx = list.findIndex((item) => item.id === id);
        if (idx >= 0) list[idx] = data;
        setLocal(KEYS.PHC, list);
        return data;
      }
    }
    if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }
    const list = getLocal<PhcMaster>(KEYS.PHC, DEFAULT_PHCS);
    const idx = list.findIndex((item) => item.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payload };
      setLocal(KEYS.PHC, list);
      return list[idx];
    }
    throw new Error('PHC सापडला नाही');
  },

  async deletePhc(id: string): Promise<void> {
    assertValidUUID(id, 'PHC ID');
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('phc_master').delete().eq('id', id);
      if (error) {
        console.error('[masterDataService.deletePhc] Supabase error:', error);
        if (!isDemoMode()) {
          throw new Error(`PHC हटवता आला नाही: ${error.message}`);
        }
      }
    }
    const list = getLocal<PhcMaster>(KEYS.PHC, DEFAULT_PHCS).filter((i) => i.id !== id);
    setLocal(KEYS.PHC, list);
  },

  // ==========================================
  // 2. SUBCENTRE MASTER OPERATIONS
  // ==========================================
  async getSubcentres(): Promise<SubcentreMaster[]> {
    let subcentres: SubcentreMaster[] = [];
    const phcs = await this.getPhcs();
    const phcMap = new Map<string, string>();
    phcs.forEach((p) => phcMap.set(p.id, p.phc_name));

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('subcentre_master')
          .select('*')
          .order('subcentre_name', { ascending: true });
        if (!error && data) {
          subcentres = data;
          setLocal(KEYS.SUBCENTRE, data);
        } else if (error) {
          console.error('[masterDataService.getSubcentres] Supabase error:', error);
          if (!isDemoMode()) {
            const cached = getLocal<SubcentreMaster>(KEYS.SUBCENTRE, []);
            if (cached.length > 0) subcentres = cached;
            else throw new Error(`उपकेंद्र माहिती लोड करता आली नाही: ${error.message}`);
          } else {
            subcentres = getLocal<SubcentreMaster>(KEYS.SUBCENTRE, DEFAULT_SUBCENTRES);
          }
        }
      } catch (e: any) {
        console.error('[masterDataService.getSubcentres] Exception:', e);
        if (!isDemoMode()) {
          const cached = getLocal<SubcentreMaster>(KEYS.SUBCENTRE, []);
          if (cached.length > 0) subcentres = cached;
          else throw e;
        } else {
          subcentres = getLocal<SubcentreMaster>(KEYS.SUBCENTRE, DEFAULT_SUBCENTRES);
        }
      }
    } else {
      subcentres = getLocal<SubcentreMaster>(KEYS.SUBCENTRE, DEFAULT_SUBCENTRES);
    }

    // Attach phc_name for display
    return subcentres.map((sc) => ({
      ...sc,
      phc_name: phcMap.get(sc.phc_id) || 'अज्ञात PHC',
    }));
  },

  async createSubcentre(
    payload: Omit<SubcentreMaster, 'id' | 'created_at' | 'phc_name'>
  ): Promise<SubcentreMaster> {
    assertValidUUID(payload.phc_id, 'PHC ID');
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('subcentre_master')
        .insert([payload])
        .select()
        .single();
      if (error) {
        console.error('[masterDataService.createSubcentre] Supabase error:', error);
        if (!isDemoMode()) {
          throw new Error(`उपकेंद्र नोंद जतन करता आली नाही: ${error.message}`);
        }
      } else if (data) {
        const list = getLocal<SubcentreMaster>(KEYS.SUBCENTRE, DEFAULT_SUBCENTRES);
        list.push(data);
        setLocal(KEYS.SUBCENTRE, list);
        return data;
      }
    }
    if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }
    const list = getLocal<SubcentreMaster>(KEYS.SUBCENTRE, DEFAULT_SUBCENTRES);
    const newSc: SubcentreMaster = {
      ...payload,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    list.push(newSc);
    setLocal(KEYS.SUBCENTRE, list);
    return newSc;
  },

  async updateSubcentre(id: string, payload: Partial<SubcentreMaster>): Promise<SubcentreMaster> {
    assertValidUUID(id, 'उपकेंद्र ID');
    if (payload.phc_id) assertValidUUID(payload.phc_id, 'PHC ID');
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('subcentre_master')
        .update({
          phc_id: payload.phc_id,
          subcentre_name: payload.subcentre_name,
          subcentre_code: payload.subcentre_code,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error('[masterDataService.updateSubcentre] Supabase error:', error);
        if (!isDemoMode()) {
          throw new Error(`उपकेंद्र माहिती अद्ययावत करता आली नाही: ${error.message}`);
        }
      } else if (data) {
        const list = getLocal<SubcentreMaster>(KEYS.SUBCENTRE, DEFAULT_SUBCENTRES);
        const idx = list.findIndex((i) => i.id === id);
        if (idx >= 0) list[idx] = { ...list[idx], ...data };
        setLocal(KEYS.SUBCENTRE, list);
        return data;
      }
    }
    if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }
    const list = getLocal<SubcentreMaster>(KEYS.SUBCENTRE, DEFAULT_SUBCENTRES);
    const idx = list.findIndex((i) => i.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payload };
      setLocal(KEYS.SUBCENTRE, list);
      return list[idx];
    }
    throw new Error('Subcentre not found');
  },

  async deleteSubcentre(id: string): Promise<void> {
    assertValidUUID(id, 'उपकेंद्र ID');
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('subcentre_master').delete().eq('id', id);
      if (error) {
        console.error('[masterDataService.deleteSubcentre] Supabase error:', error);
        if (!isDemoMode()) {
          throw new Error(`उपकेंद्र हटवता आले नाही: ${error.message}`);
        }
      }
    }
    const list = getLocal<SubcentreMaster>(KEYS.SUBCENTRE, DEFAULT_SUBCENTRES).filter(
      (i) => i.id !== id
    );
    setLocal(KEYS.SUBCENTRE, list);
  },

  // ==========================================
  // 3. VILLAGE MASTER OPERATIONS
  // ==========================================
  async getVillages(): Promise<VillageMaster[]> {
    let villages: VillageMaster[] = [];
    const subcentres = await this.getSubcentres();
    const scMap = new Map<string, { scName: string; phcName?: string }>();
    subcentres.forEach((s) => scMap.set(s.id, { scName: s.subcentre_name, phcName: s.phc_name }));

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('village_master')
          .select('*')
          .order('village_name', { ascending: true });
        if (!error && data) {
          villages = data;
          setLocal(KEYS.VILLAGE, data);
        } else if (error) {
          console.error('[masterDataService.getVillages] Supabase error:', error);
          if (!isDemoMode()) {
            const cached = getLocal<VillageMaster>(KEYS.VILLAGE, []);
            if (cached.length > 0) villages = cached;
            else throw new Error(`गाव माहिती लोड करता आली नाही: ${error.message}`);
          } else {
            villages = getLocal<VillageMaster>(KEYS.VILLAGE, DEFAULT_VILLAGES);
          }
        }
      } catch (e: any) {
        console.error('[masterDataService.getVillages] Exception:', e);
        if (!isDemoMode()) {
          const cached = getLocal<VillageMaster>(KEYS.VILLAGE, []);
          if (cached.length > 0) villages = cached;
          else throw e;
        } else {
          villages = getLocal<VillageMaster>(KEYS.VILLAGE, DEFAULT_VILLAGES);
        }
      }
    } else {
      villages = getLocal<VillageMaster>(KEYS.VILLAGE, DEFAULT_VILLAGES);
    }

    return villages.map((v) => {
      const match = scMap.get(v.subcentre_id);
      return {
        ...v,
        subcentre_name: match?.scName || 'अज्ञात उपकेंद्र',
        phc_name: match?.phcName || '',
      };
    });
  },

  async createVillage(
    payload: Omit<VillageMaster, 'id' | 'created_at' | 'subcentre_name' | 'phc_name'>
  ): Promise<VillageMaster> {
    assertValidUUID(payload.subcentre_id, 'उपकेंद्र ID');
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('village_master')
        .insert([payload])
        .select()
        .single();
      if (error) {
        console.error('[masterDataService.createVillage] Supabase error:', error);
        if (!isDemoMode()) {
          throw new Error(`गाव नोंद जतन करता आली नाही: ${error.message}`);
        }
      } else if (data) {
        const list = getLocal<VillageMaster>(KEYS.VILLAGE, DEFAULT_VILLAGES);
        list.push(data);
        setLocal(KEYS.VILLAGE, list);
        return data;
      }
    }
    if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }
    const list = getLocal<VillageMaster>(KEYS.VILLAGE, DEFAULT_VILLAGES);
    const newVillage: VillageMaster = {
      ...payload,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    list.push(newVillage);
    setLocal(KEYS.VILLAGE, list);
    return newVillage;
  },

  async updateVillage(id: string, payload: Partial<VillageMaster>): Promise<VillageMaster> {
    assertValidUUID(id, 'गाव ID');
    if (payload.subcentre_id) assertValidUUID(payload.subcentre_id, 'उपकेंद्र ID');
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('village_master')
        .update({
          subcentre_id: payload.subcentre_id,
          village_name: payload.village_name,
          population: payload.population,
          total_houses: payload.total_houses,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error('[masterDataService.updateVillage] Supabase error:', error);
        if (!isDemoMode()) {
          throw new Error(`गाव माहिती अद्ययावत करता आली नाही: ${error.message}`);
        }
      } else if (data) {
        const list = getLocal<VillageMaster>(KEYS.VILLAGE, DEFAULT_VILLAGES);
        const idx = list.findIndex((i) => i.id === id);
        if (idx >= 0) list[idx] = { ...list[idx], ...data };
        setLocal(KEYS.VILLAGE, list);
        return data;
      }
    }
    if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }
    const list = getLocal<VillageMaster>(KEYS.VILLAGE, DEFAULT_VILLAGES);
    const idx = list.findIndex((i) => i.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payload };
      setLocal(KEYS.VILLAGE, list);
      return list[idx];
    }
    throw new Error('Village not found');
  },

  async deleteVillage(id: string): Promise<void> {
    assertValidUUID(id, 'गाव ID');
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('village_master').delete().eq('id', id);
      if (error) {
        console.error('[masterDataService.deleteVillage] Supabase error:', error);
        if (!isDemoMode()) {
          throw new Error(`गाव हटवता आले नाही: ${error.message}`);
        }
      }
    }
    const list = getLocal<VillageMaster>(KEYS.VILLAGE, DEFAULT_VILLAGES).filter((i) => i.id !== id);
    setLocal(KEYS.VILLAGE, list);
  },

  // ==========================================
  // 4. EMPLOYEE MASTER OPERATIONS
  // ==========================================
  async getEmployees(): Promise<EmployeeMaster[]> {
    let employees: EmployeeMaster[] = [];
    const subcentres = await this.getSubcentres();
    const scMap = new Map<string, { scName: string; phcName?: string }>();
    subcentres.forEach((s) => scMap.set(s.id, { scName: s.subcentre_name, phcName: s.phc_name }));

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('employee_master')
          .select('*')
          .order('employee_name', { ascending: true });
        if (!error && data) {
          employees = data;
          setLocal(KEYS.EMPLOYEE, data);
        } else if (error) {
          console.error('[masterDataService.getEmployees] Supabase error:', error);
          if (!isDemoMode()) {
            const cached = getLocal<EmployeeMaster>(KEYS.EMPLOYEE, []);
            if (cached.length > 0) employees = cached;
            else throw new Error(`कर्मचारी माहिती लोड करता आली नाही: ${error.message}`);
          } else {
            employees = getLocal<EmployeeMaster>(KEYS.EMPLOYEE, DEFAULT_EMPLOYEES);
          }
        }
      } catch (e: any) {
        console.error('[masterDataService.getEmployees] Exception:', e);
        if (!isDemoMode()) {
          const cached = getLocal<EmployeeMaster>(KEYS.EMPLOYEE, []);
          if (cached.length > 0) employees = cached;
          else throw e;
        } else {
          employees = getLocal<EmployeeMaster>(KEYS.EMPLOYEE, DEFAULT_EMPLOYEES);
        }
      }
    } else {
      employees = getLocal<EmployeeMaster>(KEYS.EMPLOYEE, DEFAULT_EMPLOYEES);
    }

    return employees.map((emp) => {
      const match = scMap.get(emp.subcentre_id);
      return {
        ...emp,
        subcentre_name: match?.scName || 'अज्ञात उपकेंद्र',
        phc_name: match?.phcName || '',
      };
    });
  },

  async createEmployee(
    payload: Omit<EmployeeMaster, 'id' | 'created_at' | 'subcentre_name' | 'phc_name'>
  ): Promise<EmployeeMaster> {
    assertValidUUID(payload.subcentre_id, 'उपकेंद्र ID');
    // Validate unique malaria_smear_code
    const existing = await this.getEmployees();
    const duplicate = existing.find(
      (e) => e.malaria_smear_code.trim().toUpperCase() === payload.malaria_smear_code.trim().toUpperCase()
    );
    if (duplicate) {
      throw new Error(`मलेरिया स्मीअर कोड "${payload.malaria_smear_code}" आधीपासून अस्तित्वात आहे. कृपया युनिक कोड प्रविष्ट करा.`);
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('employee_master')
        .insert([payload])
        .select()
        .single();
      if (error) {
        console.error('[masterDataService.createEmployee] Supabase error:', error);
        if (!isDemoMode()) {
          throw new Error(`कर्मचारी नोंद जतन करता आली नाही: ${error.message}`);
        }
      } else if (data) {
        const list = getLocal<EmployeeMaster>(KEYS.EMPLOYEE, DEFAULT_EMPLOYEES);
        list.push(data);
        setLocal(KEYS.EMPLOYEE, list);
        // Auto-provision corresponding user_profiles row in Supabase and local cache
        this.syncUserProfileForEmployee(data).catch((err) =>
          console.warn('[masterDataService.createEmployee] User profile sync warning:', err)
        );
        return data;
      }
    }
    if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }

    const list = getLocal<EmployeeMaster>(KEYS.EMPLOYEE, DEFAULT_EMPLOYEES);
    const newEmp: EmployeeMaster = {
      ...payload,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    list.push(newEmp);
    setLocal(KEYS.EMPLOYEE, list);
    this.syncUserProfileForEmployee(newEmp).catch(() => {});
    return newEmp;
  },

  /**
   * Automatically creates or updates the corresponding user_profiles row
   * so new employees can login immediately via mobile or email.
   */
  async syncUserProfileForEmployee(employee: EmployeeMaster): Promise<void> {
    try {
      const subcentres = await this.getSubcentres();
      const sc = subcentres.find((s) => s.id === employee.subcentre_id);
      const designation = (employee.designation || '').toLowerCase();
      const isCtrl =
        designation.includes('वैद्यकीय अधिकारी') ||
        designation.includes('नियंत्रक') ||
        designation.includes('medical officer') ||
        designation.includes('controller');
      const cleanSmear = (employee.malaria_smear_code || 'emp')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const cleanPhone = (employee.mobile_number || '').replace(/\D/g, '');
      const autoEmail =
        employee.email && employee.email.includes('@')
          ? employee.email.toLowerCase().trim()
          : `${cleanSmear || cleanPhone || 'employee'}@arogya.gov.in`;

      const now = new Date().toISOString();
      const profileRow = {
        id: generateUUID(),
        auth_user_id: null,
        employee_id: employee.id,
        role: isCtrl ? 'PHC_CONTROLLER' : 'SUBCENTRE_EMPLOYEE',
        phc_id: sc ? sc.phc_id : null,
        subcentre_id: employee.subcentre_id,
        is_active: employee.is_active ?? true,
        email: autoEmail,
        mobile: employee.mobile_number || null,
        display_name: employee.employee_name,
        last_login_at: null,
        created_at: now,
        updated_at: now,
      };

      if (isSupabaseConfigured() && supabase) {
        // Upsert by employee_id if exists
        const { data: existing } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('employee_id', employee.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('user_profiles')
            .update({
              display_name: employee.employee_name,
              mobile: employee.mobile_number || null,
              email: autoEmail,
              subcentre_id: employee.subcentre_id,
              phc_id: sc ? sc.phc_id : null,
              is_active: employee.is_active ?? true,
              updated_at: now,
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('user_profiles').insert([profileRow]);
        }
      }

      // Update local storage
      const cached = getLocal<any>('arogya_user_profiles_master', []);
      const existingIdx = cached.findIndex((p: any) => p.employee_id === employee.id);
      if (existingIdx >= 0) {
        cached[existingIdx] = {
          ...cached[existingIdx],
          display_name: employee.employee_name,
          mobile: employee.mobile_number || null,
          email: autoEmail,
          subcentre_id: employee.subcentre_id,
          phc_id: sc ? sc.phc_id : null,
          is_active: employee.is_active ?? true,
          updated_at: now,
        };
      } else {
        cached.unshift(profileRow);
      }
      setLocal('arogya_user_profiles_master', cached);
    } catch (e) {
      console.warn('[syncUserProfileForEmployee] Exception:', e);
    }
  },

  async updateEmployee(id: string, payload: Partial<EmployeeMaster>): Promise<EmployeeMaster> {
    assertValidUUID(id, 'कर्मचारी ID');
    if (payload.subcentre_id) assertValidUUID(payload.subcentre_id, 'उपकेंद्र ID');
    if (payload.malaria_smear_code) {
      const existing = await this.getEmployees();
      const duplicate = existing.find(
        (e) =>
          e.id !== id &&
          e.malaria_smear_code.trim().toUpperCase() === payload.malaria_smear_code!.trim().toUpperCase()
      );
      if (duplicate) {
        throw new Error(`मलेरिया स्मीअर कोड "${payload.malaria_smear_code}" इतर कर्मचाऱ्यासाठी वापरलेला आहे.`);
      }
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('employee_master')
        .update({
          subcentre_id: payload.subcentre_id,
          employee_name: payload.employee_name,
          designation: payload.designation,
          mobile_number: payload.mobile_number,
          email: payload.email,
          malaria_smear_code: payload.malaria_smear_code,
          is_active: payload.is_active,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error('[masterDataService.updateEmployee] Supabase error:', error);
        if (!isDemoMode()) {
          throw new Error(`कर्मचारी माहिती अद्ययावत करता आली नाही: ${error.message}`);
        }
      } else if (data) {
        const list = getLocal<EmployeeMaster>(KEYS.EMPLOYEE, DEFAULT_EMPLOYEES);
        const idx = list.findIndex((i) => i.id === id);
        if (idx >= 0) list[idx] = { ...list[idx], ...data };
        setLocal(KEYS.EMPLOYEE, list);
        this.syncUserProfileForEmployee(data).catch(() => {});
        return data;
      }
    }
    if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }

    const list = getLocal<EmployeeMaster>(KEYS.EMPLOYEE, DEFAULT_EMPLOYEES);
    const idx = list.findIndex((i) => i.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payload };
      setLocal(KEYS.EMPLOYEE, list);
      return list[idx];
    }
    throw new Error('Employee not found');
  },

  async deleteEmployee(id: string): Promise<void> {
    assertValidUUID(id, 'कर्मचारी ID');
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('employee_master').delete().eq('id', id);
      if (error) {
        console.error('[masterDataService.deleteEmployee] Supabase error:', error);
        if (!isDemoMode()) {
          throw new Error(`कर्मचारी हटवता आला नाही: ${error.message}`);
        }
      }
    }
    const list = getLocal<EmployeeMaster>(KEYS.EMPLOYEE, DEFAULT_EMPLOYEES).filter(
      (i) => i.id !== id
    );
    setLocal(KEYS.EMPLOYEE, list);
  },

  async toggleEmployeeStatus(id: string): Promise<EmployeeMaster> {
    const employees = await this.getEmployees();
    const target = employees.find((e) => e.id === id);
    if (!target) {
      throw new Error('कर्मचारी सापडला नाही');
    }
    return this.updateEmployee(id, {
      is_active: !target.is_active,
    });
  },

  async checkSmearCodeUnique(
    code: string,
    excludeEmployeeId?: string
  ): Promise<{ isUnique: boolean; conflictingEmployeeName?: string }> {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { isUnique: false };
    }
    const employees = await this.getEmployees();
    const match = employees.find(
      (e) =>
        e.malaria_smear_code.trim().toUpperCase() === cleanCode &&
        (!excludeEmployeeId || e.id !== excludeEmployeeId)
    );
    if (match) {
      return { isUnique: false, conflictingEmployeeName: match.employee_name };
    }
    return { isUnique: true };
  },

  // ==========================================
  // 5. DASHBOARD METRICS FOR PHC CONTROLLER / SUBCENTRE EMPLOYEE
  // ==========================================
  async getDashboardMetrics(scope?: {
    phcId?: string;
    applicableSubcentreIds?: string[];
  }): Promise<DashboardMetrics> {
    if (isSupabaseConfigured() && supabase) {
      try {
        let scQuery = supabase.from('subcentre_master').select('id, phc_id');
        let vilQuery = supabase.from('village_master').select('id, subcentre_id, population');
        let empQuery = supabase.from('employee_master').select('id, subcentre_id, is_active');

        if (scope?.applicableSubcentreIds && scope.applicableSubcentreIds.length > 0) {
          scQuery = scQuery.in('id', scope.applicableSubcentreIds);
          vilQuery = vilQuery.in('subcentre_id', scope.applicableSubcentreIds);
          empQuery = empQuery.in('subcentre_id', scope.applicableSubcentreIds);
        } else if (scope?.phcId) {
          scQuery = scQuery.eq('phc_id', scope.phcId);
        }

        const [scRes, vilRes, empRes] = await Promise.all([
          scQuery,
          vilQuery,
          empQuery,
        ]);

        if (scRes.data && vilRes.data && empRes.data) {
          const scList = scRes.data;
          let vilList = vilRes.data;
          let empList = empRes.data;

          // If phcId filter was applied on subcentres, also filter villages & employees by those subcentres
          if (scope?.phcId && (!scope?.applicableSubcentreIds || scope.applicableSubcentreIds.length === 0)) {
            const scIds = new Set(scList.map((s) => s.id));
            vilList = vilList.filter((v) => scIds.has(v.subcentre_id));
            empList = empList.filter((e) => scIds.has(e.subcentre_id));
          }

          const activeCount = empList.filter((e) => e.is_active).length;
          const inactiveCount = empList.length - activeCount;
          const pop = vilList.reduce((acc, v) => acc + (Number(v.population) || 0), 0);

          return {
            totalPhcs: scope?.phcId ? 1 : 1,
            totalSubcentres: scList.length,
            totalVillages: vilList.length,
            totalEmployees: empList.length,
            activeEmployees: activeCount,
            inactiveEmployees: inactiveCount,
            totalPopulation: pop,
          };
        }
      } catch (err) {
        console.warn('Supabase getDashboardMetrics query error, using local fallback', err);
      }
    }

    // Local / Offline fallback with scope filtering
    const [phcs, scs, villages, employees] = await Promise.all([
      this.getPhcs(),
      this.getSubcentres(),
      this.getVillages(),
      this.getEmployees(),
    ]);

    let filteredScs = scs;
    let filteredVils = villages;
    let filteredEmps = employees;

    if (scope?.applicableSubcentreIds && scope.applicableSubcentreIds.length > 0) {
      const scIds = new Set(scope.applicableSubcentreIds);
      filteredScs = scs.filter((s) => scIds.has(s.id));
      filteredVils = villages.filter((v) => scIds.has(v.subcentre_id));
      filteredEmps = employees.filter((e) => scIds.has(e.subcentre_id));
    } else if (scope?.phcId) {
      filteredScs = scs.filter((s) => s.phc_id === scope.phcId);
      const scIds = new Set(filteredScs.map((s) => s.id));
      filteredVils = villages.filter((v) => scIds.has(v.subcentre_id));
      filteredEmps = employees.filter((e) => scIds.has(e.subcentre_id));
    }

    const activeCount = filteredEmps.filter((e) => e.is_active).length;
    const inactiveCount = filteredEmps.length - activeCount;
    const totalPop = filteredVils.reduce((acc, v) => acc + (Number(v.population) || 0), 0);

    return {
      totalPhcs: scope?.phcId ? 1 : phcs.length,
      totalSubcentres: filteredScs.length,
      totalVillages: filteredVils.length,
      totalEmployees: filteredEmps.length,
      activeEmployees: activeCount,
      inactiveEmployees: inactiveCount,
      totalPopulation: totalPop,
    };
  },

  // Reset database back to default demo records if needed
  resetToDefaults() {
    storage.setItem(KEYS.PHC, JSON.stringify(DEFAULT_PHCS));
    storage.setItem(KEYS.SUBCENTRE, JSON.stringify(DEFAULT_SUBCENTRES));
    storage.setItem(KEYS.VILLAGE, JSON.stringify(DEFAULT_VILLAGES));
    storage.setItem(KEYS.EMPLOYEE, JSON.stringify(DEFAULT_EMPLOYEES));
  },
};
