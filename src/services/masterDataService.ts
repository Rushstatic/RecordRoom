import { storage } from '../lib/storage';
import { PhcMaster, SubcentreMaster, VillageMaster, EmployeeMaster, DashboardMetrics } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isDemoMode } from '../lib/env';

// Standard realistic Seed Data for offline / pre-Supabase setup
const DEFAULT_PHCS: PhcMaster[] = [
  {
    id: 'e0111111-1111-4111-8111-111111111111',
    phc_name: 'प्राथमिक आरोग्य केंद्र, वडगाव',
    phc_code: 'PHC-PUN-014',
    taluka: 'शिरूर',
    district: 'पुणे',
    created_at: new Date().toISOString(),
  },
  {
    id: 'e0222222-2222-4222-8222-222222222222',
    phc_name: 'प्राथमिक आरोग्य केंद्र, शिक्रापूर',
    phc_code: 'PHC-PUN-015',
    taluka: 'शिरूर',
    district: 'पुणे',
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_SUBCENTRES: SubcentreMaster[] = [
  {
    id: 's0111111-1111-4111-8111-111111111111',
    phc_id: 'e0111111-1111-4111-8111-111111111111',
    subcentre_name: 'आरोग्य उपकेंद्र, जातेगाव',
    subcentre_code: 'SC-JTG-01',
    created_at: new Date().toISOString(),
  },
  {
    id: 's0222222-2222-4222-8222-222222222222',
    phc_id: 'e0111111-1111-4111-8111-111111111111',
    subcentre_name: 'आरोग्य उपकेंद्र, तळेगाव ढमढेरे',
    subcentre_code: 'SC-TLG-02',
    created_at: new Date().toISOString(),
  },
  {
    id: 's0333333-3333-4333-8333-333333333333',
    phc_id: 'e0111111-1111-4111-8111-111111111111',
    subcentre_name: 'आरोग्य उपकेंद्र, कोरेगाव मूळ',
    subcentre_code: 'SC-KRD-03',
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_VILLAGES: VillageMaster[] = [
  {
    id: 'v0111111-1111-4111-8111-111111111111',
    subcentre_id: 's0111111-1111-4111-8111-111111111111',
    village_name: 'जातेगाव (मुख्य)',
    population: 2850,
    total_houses: 540,
    created_at: new Date().toISOString(),
  },
  {
    id: 'v0222222-2222-4222-8222-222222222222',
    subcentre_id: 's0111111-1111-4111-8111-111111111111',
    village_name: 'वाघोले (वस्ती)',
    population: 1420,
    total_houses: 260,
    created_at: new Date().toISOString(),
  },
  {
    id: 'v0333333-3333-4333-8333-333333333333',
    subcentre_id: 's0111111-1111-4111-8111-111111111111',
    village_name: 'पिंपळवस्ती',
    population: 1150,
    total_houses: 190,
    created_at: new Date().toISOString(),
  },
  {
    id: 'v0444444-4444-4444-8444-444444444444',
    subcentre_id: 's0222222-2222-4222-8222-222222222222',
    village_name: 'तळेगाव ढमढेरे (मुख्य)',
    population: 3900,
    total_houses: 720,
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_EMPLOYEES: EmployeeMaster[] = [
  {
    id: 'emp11111-1111-4111-8111-111111111111',
    subcentre_id: 's0111111-1111-4111-8111-111111111111',
    employee_name: 'सौ. सुनिता एम. कांबळे',
    designation: 'आरोग्य सेविका (ANM)',
    mobile_number: '9765098765',
    email: 'anm.vadgaon1@arogya.gov.in',
    malaria_smear_code: 'JTG-ANM-1',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'emp22222-2222-4222-8222-222222222222',
    subcentre_id: 's0111111-1111-4111-8111-111111111111',
    employee_name: 'श्री. राहुल डी. पाटील',
    designation: 'बहुउद्देशीय आरोग्य सेवक (MPW)',
    mobile_number: '9823456789',
    email: 'rahul.mpw@arogya.gov.in',
    malaria_smear_code: 'JTG-MPW-1',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'emp33333-3333-4333-8333-333333333333',
    subcentre_id: 's0111111-1111-4111-8111-111111111111',
    employee_name: 'डॉ. प्रियांका शिंदे',
    designation: 'समुदाय आरोग्य अधिकारी (CHO)',
    mobile_number: '9922114433',
    email: 'priyanka.cho@arogya.gov.in',
    malaria_smear_code: 'JTG-CHO-1',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'emp44444-4444-4444-8444-444444444444',
    subcentre_id: 's0222222-2222-4222-8222-222222222222',
    employee_name: 'श्रीमती अनिता मोरे',
    designation: 'आरोग्य सेविका (ANM)',
    mobile_number: '9822776655',
    malaria_smear_code: 'TLG-ANM-1',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'emp55555-5555-4555-8555-555555555555',
    subcentre_id: 's0333333-3333-4333-8333-333333333333',
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
      if (isDemoMode()) {
        storage.setItem(key, JSON.stringify(fallback));
        return fallback;
      }
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    return isDemoMode() ? fallback : [];
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
      } catch (e) {
        console.warn('Falling back to local storage for PHC', e);
      }
    }
    return getLocal<PhcMaster>(KEYS.PHC, DEFAULT_PHCS);
  },

  async createPhc(payload: Omit<PhcMaster, 'id' | 'created_at'>): Promise<PhcMaster> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('phc_master')
          .insert([payload])
          .select()
          .single();
        if (!error && data) return data;
        if (error) throw new Error(error.message);
      } catch (e: any) {
        console.warn('Supabase createPhc failed, saving locally', e);
      }
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
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('phc_master')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('Supabase updatePhc fallback', e);
      }
    }
    const list = getLocal<PhcMaster>(KEYS.PHC, DEFAULT_PHCS);
    const idx = list.findIndex((item) => item.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payload };
      setLocal(KEYS.PHC, list);
      return list[idx];
    }
    throw new Error('PHC not found');
  },

  async deletePhc(id: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('phc_master').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deletePhc fallback', e);
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
        }
      } catch (e) {
        console.warn('Falling back to local storage for Subcentres', e);
        subcentres = getLocal<SubcentreMaster>(KEYS.SUBCENTRE, DEFAULT_SUBCENTRES);
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
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('subcentre_master')
          .insert([payload])
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('Supabase createSubcentre fallback', e);
      }
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
    if (isSupabaseConfigured() && supabase) {
      try {
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
        if (!error && data) return data;
      } catch (e) {
        console.warn('Supabase updateSubcentre fallback', e);
      }
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
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('subcentre_master').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteSubcentre fallback', e);
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
        }
      } catch (e) {
        console.warn('Falling back to local storage for Villages', e);
        villages = getLocal<VillageMaster>(KEYS.VILLAGE, DEFAULT_VILLAGES);
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
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('village_master')
          .insert([payload])
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('Supabase createVillage fallback', e);
      }
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
    if (isSupabaseConfigured() && supabase) {
      try {
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
        if (!error && data) return data;
      } catch (e) {
        console.warn('Supabase updateVillage fallback', e);
      }
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
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('village_master').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteVillage fallback', e);
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
        }
      } catch (e) {
        console.warn('Falling back to local storage for Employees', e);
        employees = getLocal<EmployeeMaster>(KEYS.EMPLOYEE, DEFAULT_EMPLOYEES);
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
    // Validate unique malaria_smear_code
    const existing = await this.getEmployees();
    const duplicate = existing.find(
      (e) => e.malaria_smear_code.trim().toUpperCase() === payload.malaria_smear_code.trim().toUpperCase()
    );
    if (duplicate) {
      throw new Error(`मलेरिया स्मीअर कोड "${payload.malaria_smear_code}" आधीपासून अस्तित्वात आहे. कृपया युनिक कोड प्रविष्ट करा.`);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('employee_master')
          .insert([payload])
          .select()
          .single();
        if (!error && data) return data;
        if (error) throw new Error(error.message);
      } catch (e: any) {
        console.warn('Supabase createEmployee fallback', e);
      }
    }

    const list = getLocal<EmployeeMaster>(KEYS.EMPLOYEE, DEFAULT_EMPLOYEES);
    const newEmp: EmployeeMaster = {
      ...payload,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    list.push(newEmp);
    setLocal(KEYS.EMPLOYEE, list);
    return newEmp;
  },

  async updateEmployee(id: string, payload: Partial<EmployeeMaster>): Promise<EmployeeMaster> {
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
      try {
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
        if (!error && data) return data;
      } catch (e) {
        console.warn('Supabase updateEmployee fallback', e);
      }
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
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('employee_master').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteEmployee fallback', e);
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
  // 5. DASHBOARD METRICS FOR PHC CONTROLLER
  // ==========================================
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const [phcRes, scRes, vilRes, empActiveRes, empInactiveRes, allEmpRes, popRes] =
          await Promise.all([
            supabase.from('phc_master').select('*', { count: 'exact', head: true }),
            supabase.from('subcentre_master').select('*', { count: 'exact', head: true }),
            supabase.from('village_master').select('*', { count: 'exact', head: true }),
            supabase
              .from('employee_master')
              .select('*', { count: 'exact', head: true })
              .eq('is_active', true),
            supabase
              .from('employee_master')
              .select('*', { count: 'exact', head: true })
              .eq('is_active', false),
            supabase.from('employee_master').select('*', { count: 'exact', head: true }),
            supabase.from('village_master').select('population'),
          ]);

        const pop = popRes.data
          ? popRes.data.reduce((acc, v) => acc + (Number(v.population) || 0), 0)
          : 0;

        if (
          phcRes.count !== null &&
          scRes.count !== null &&
          vilRes.count !== null &&
          allEmpRes.count !== null
        ) {
          return {
            totalPhcs: phcRes.count ?? 0,
            totalSubcentres: scRes.count ?? 0,
            totalVillages: vilRes.count ?? 0,
            totalEmployees: allEmpRes.count ?? 0,
            activeEmployees: empActiveRes.count ?? 0,
            inactiveEmployees: empInactiveRes.count ?? 0,
            totalPopulation: pop,
          };
        }
      } catch (err) {
        console.warn('Supabase getDashboardMetrics count error, using local fallback', err);
      }
    }

    // Local / Offline fallback
    const [phcs, scs, villages, employees] = await Promise.all([
      this.getPhcs(),
      this.getSubcentres(),
      this.getVillages(),
      this.getEmployees(),
    ]);

    const activeCount = employees.filter((e) => e.is_active).length;
    const inactiveCount = employees.length - activeCount;
    const totalPop = villages.reduce((acc, v) => acc + (Number(v.population) || 0), 0);

    return {
      totalPhcs: phcs.length,
      totalSubcentres: scs.length,
      totalVillages: villages.length,
      totalEmployees: employees.length,
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
