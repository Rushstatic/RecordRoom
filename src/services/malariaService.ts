import { storage } from '../lib/storage';
import { MalariaBloodSample, GenderType } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { masterDataService } from './masterDataService';
import { isDemoMode } from '../lib/env';
import { assertValidUUID } from '../utils/uuid';

const STORAGE_KEY = 'arogya_malaria_samples';

// Default realistic sample records for initial offline viewing & testing
const DEFAULT_SAMPLES: MalariaBloodSample[] = [];

/**
 * Format date in standard Indian format (DD/MM/YYYY)
 */
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

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayIso = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Format sample number with leading zeros (4 digits: 0001, 0002...)
 */
export const formatSampleNumber = (num: number): string => {
  if (!num || isNaN(num)) return '0001';
  return String(num).padStart(4, '0');
};

/**
 * Safe client-side UUID generator (RFC 4122 v4)
 */
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const malariaService = {
  /**
   * CODE 15: Advanced Blood Sample Search, Filter & Record Management
   * Does not mutate existing getSamples logic. Provides pagination, advanced filters and exact match.
   */
  async searchSamples(params: {
    searchQuery?: string;
    employee_id?: string;
    subcentre_id?: string;
    village_id?: string;
    phc_id?: string;
    gender?: string;
    smear_code?: string;
    status?: 'ALL' | 'PENDING' | 'SENT';
    collection_date_from?: string;
    collection_date_to?: string;
    sent_date_from?: string;
    sent_date_to?: string;
    sample_number_from?: number;
    sample_number_to?: number;
    exact_sample_number?: number;
    limit: number;
    offset: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }): Promise<{ data: MalariaBloodSample[]; count: number }> {
    try {
      // 1. Fetch via existing full local/Supabase logic to guarantee exact existing formatting & joins
      // Optimization: We could write a pure Supabase query here, but to ensure 100% compatibility 
      // with offline/fallback and joined master data, we fetch the scoped set and filter/paginate locally.
      // Since it's a small-scale system, this is reliable. If performance demands, we can pure-SQL it later.
      let allSamples = await this.getSamples({
        employee_id: params.employee_id,
        subcentre_id: params.subcentre_id,
        village_id: params.village_id,
        phc_id: params.phc_id,
      });

      // Apply Advanced Filters
      let filtered = allSamples;

      // Exact Sample Number
      if (params.exact_sample_number) {
        filtered = filtered.filter(s => Number(s.sample_number) === params.exact_sample_number);
      } else {
        // Range Sample Number
        if (params.sample_number_from) {
          filtered = filtered.filter(s => Number(s.sample_number) >= params.sample_number_from!);
        }
        if (params.sample_number_to) {
          filtered = filtered.filter(s => Number(s.sample_number) <= params.sample_number_to!);
        }
      }

      // Gender
      if (params.gender && params.gender !== 'सर्व') {
        filtered = filtered.filter(s => s.gender === params.gender);
      }

      // Smear Code
      if (params.smear_code) {
        filtered = filtered.filter(s => s.malaria_smear_code.toLowerCase().includes(params.smear_code!.toLowerCase()));
      }

      // Status
      if (params.status === 'PENDING') {
        filtered = filtered.filter(s => !s.sent_date);
      } else if (params.status === 'SENT') {
        filtered = filtered.filter(s => !!s.sent_date);
      }

      // Collection Date Range
      if (params.collection_date_from) {
        filtered = filtered.filter(s => s.sample_collection_date >= params.collection_date_from!);
      }
      if (params.collection_date_to) {
        filtered = filtered.filter(s => s.sample_collection_date <= params.collection_date_to!);
      }

      // Sent Date Range
      if (params.sent_date_from) {
        filtered = filtered.filter(s => s.sent_date && s.sent_date >= params.sent_date_from!);
      }
      if (params.sent_date_to) {
        filtered = filtered.filter(s => s.sent_date && s.sent_date <= params.sent_date_to!);
      }

      // Universal Text Search (Patient Name, House No, Smear Code, Village, Number)
      if (params.searchQuery) {
        const q = params.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(s => 
          s.patient_name.toLowerCase().includes(q) ||
          (s.house_number && s.house_number.toLowerCase().includes(q)) ||
          s.malaria_smear_code.toLowerCase().includes(q) ||
          (s.village_name && s.village_name.toLowerCase().includes(q)) ||
          String(s.sample_number).includes(q) ||
          (s.employee_name && s.employee_name.toLowerCase().includes(q))
        );
      }

      // Sorting
      filtered.sort((a, b) => {
        let valA: any = a.sample_collection_date;
        let valB: any = b.sample_collection_date;

        switch (params.sortBy) {
          case 'sample_number':
            valA = Number(a.sample_number);
            valB = Number(b.sample_number);
            break;
          case 'patient_name':
            valA = a.patient_name.toLowerCase();
            valB = b.patient_name.toLowerCase();
            break;
          case 'collection_date':
            valA = new Date(a.sample_collection_date).getTime();
            valB = new Date(b.sample_collection_date).getTime();
            break;
          case 'created_at':
          default:
            valA = new Date(a.created_at || a.sample_collection_date).getTime();
            valB = new Date(b.created_at || b.sample_collection_date).getTime();
            break;
        }

        if (valA < valB) return params.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return params.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      const totalCount = filtered.length;
      
      // Pagination
      const paginated = filtered.slice(params.offset, params.offset + params.limit);

      return { data: paginated, count: totalCount };
    } catch (err) {
      console.error('Error in searchSamples:', err);
      return { data: [], count: 0 };
    }
  },

  /**
   * Get all samples from Supabase or LocalStorage
   */
  async getSamples(filter?: {
    employee_id?: string;
    subcentre_id?: string;
    village_id?: string;
    phc_id?: string;
    pending_only?: boolean;
    sent_only?: boolean;
    sent_date?: string;
    sent_date_from?: string;
    sent_date_to?: string;
    collection_date?: string;
    collection_date_from?: string;
    collection_date_to?: string;
    sample_year?: number;
  }): Promise<MalariaBloodSample[]> {
    // 1. If Supabase is configured, fetch with joins
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('malaria_blood_samples')
          .select(`
            id,
            employee_id,
            village_id,
            house_number,
            patient_name,
            age,
            gender,
            sample_collection_date,
            sample_number,
            sample_year,
            malaria_smear_code,
            sent_date,
            created_at,
            updated_at,
            village:village_master(
              id,
              village_name,
              subcentre:subcentre_master(
                id,
                subcentre_name,
                phc:phc_master(
                  id,
                  phc_name
                )
              )
            ),
            employee:employee_master(
              id,
              employee_name,
              malaria_smear_code
            )
          `)
          .order('sample_collection_date', { ascending: false })
          .order('sample_number', { ascending: false });

        if (filter?.employee_id) {
          query = query.eq('employee_id', filter.employee_id);
        }
        if (filter?.village_id) {
          query = query.eq('village_id', filter.village_id);
        }
        if (filter?.pending_only) {
          query = query.is('sent_date', null);
        } else if (filter?.sent_only) {
          query = query.not('sent_date', 'is', null);
        }
        if (filter?.sent_date) {
          query = query.eq('sent_date', filter.sent_date);
        }
        if (filter?.sent_date_from) {
          query = query.gte('sent_date', filter.sent_date_from);
        }
        if (filter?.sent_date_to) {
          query = query.lte('sent_date', filter.sent_date_to);
        }
        if (filter?.collection_date) {
          query = query.eq('sample_collection_date', filter.collection_date);
        }
        if (filter?.collection_date_from) {
          query = query.gte('sample_collection_date', filter.collection_date_from);
        }
        if (filter?.collection_date_to) {
          query = query.lte('sample_collection_date', filter.collection_date_to);
        }
        if (filter?.sample_year) {
          query = query.eq('sample_year', filter.sample_year);
        }

        const { data, error } = await query;
        if (!error && data) {
          let list = data.map((item: any) => {
            const village = item.village;
            const subcentre = village?.subcentre;
            const phc = subcentre?.phc;
            const employee = item.employee;

            return {
              id: item.id,
              employee_id: item.employee_id,
              village_id: item.village_id,
              house_number: item.house_number || '',
              patient_name: item.patient_name,
              age: Number(item.age),
              gender: item.gender as GenderType,
              sample_collection_date: item.sample_collection_date,
              sample_number: Number(item.sample_number),
              sample_year: Number(item.sample_year),
              malaria_smear_code: item.malaria_smear_code || employee?.malaria_smear_code || '',
              sent_date: item.sent_date || null,
              created_at: item.created_at,
              updated_at: item.updated_at,
              village_name: village?.village_name || '',
              subcentre_name: subcentre?.subcentre_name || '',
              subcentre_id: subcentre?.id,
              phc_name: phc?.phc_name || '',
              phc_id: phc?.id,
              employee_name: employee?.employee_name || '',
            };
          });

          // Post-query subcentre / phc filtering if requested
          if (filter?.subcentre_id) {
            list = list.filter((s: MalariaBloodSample) => s.subcentre_id === filter.subcentre_id);
          }
          if (filter?.phc_id) {
            list = list.filter((s: MalariaBloodSample) => s.phc_id === filter.phc_id);
          }

          return list;
        }
        console.warn('Supabase query error, fallback to local storage:', error?.message);
      } catch (err) {
        console.warn('Supabase getSamples failed, using local fallback:', err);
      }
    }

    // 2. LocalStorage Fallback with Master data join
    let raw = storage.getItem(STORAGE_KEY);
    if (raw && raw.includes('m-samp-001')) {
      const parsed = JSON.parse(raw).filter((s: any) => !['m-samp-001', 'm-samp-002', 'm-samp-003'].includes(s.id));
      raw = JSON.stringify(parsed);
      storage.setItem(STORAGE_KEY, raw);
    }
    let list: MalariaBloodSample[] = raw ? JSON.parse(raw) : [];
    if (list.length === 0) {
      list = DEFAULT_SAMPLES;
      storage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    // Fetch master records to ensure join names are up-to-date
    const [villages, subcentres, phcs, employees] = await Promise.all([
      masterDataService.getVillages(),
      masterDataService.getSubcentres(),
      masterDataService.getPhcs(),
      masterDataService.getEmployees(),
    ]);

    const villageMap = new Map(villages.map((v) => [v.id, v]));
    const scMap = new Map(subcentres.map((s) => [s.id, s]));
    const phcMap = new Map(phcs.map((p) => [p.id, p]));
    const empMap = new Map(employees.map((e) => [e.id, e]));

    let enriched = list.map((sample) => {
      const v = villageMap.get(sample.village_id);
      const sc = v ? scMap.get(v.subcentre_id) : undefined;
      const p = sc ? phcMap.get(sc.phc_id) : undefined;
      const emp = empMap.get(sample.employee_id);

      return {
        ...sample,
        sent_date: sample.sent_date || null,
        village_name: sample.village_name || v?.village_name || '',
        subcentre_name: sample.subcentre_name || sc?.subcentre_name || '',
        subcentre_id: sample.subcentre_id || sc?.id || v?.subcentre_id,
        phc_name: sample.phc_name || p?.phc_name || '',
        phc_id: sample.phc_id || p?.id || sc?.phc_id,
        employee_name: sample.employee_name || emp?.employee_name || '',
        malaria_smear_code: sample.malaria_smear_code || emp?.malaria_smear_code || '',
      };
    });

    // Apply filters
    if (filter?.employee_id) {
      enriched = enriched.filter((s) => s.employee_id === filter.employee_id);
    }
    if (filter?.village_id) {
      enriched = enriched.filter((s) => s.village_id === filter.village_id);
    }
    if (filter?.subcentre_id) {
      enriched = enriched.filter((s) => s.subcentre_id === filter.subcentre_id);
    }
    if (filter?.phc_id) {
      enriched = enriched.filter((s) => s.phc_id === filter.phc_id);
    }
    if (filter?.pending_only) {
      enriched = enriched.filter((s) => !s.sent_date);
    } else if (filter?.sent_only) {
      enriched = enriched.filter((s) => Boolean(s.sent_date));
    }
    if (filter?.sent_date) {
      enriched = enriched.filter((s) => s.sent_date === filter.sent_date);
    }
    if (filter?.sent_date_from) {
      enriched = enriched.filter((s) => s.sent_date && s.sent_date >= filter.sent_date_from!);
    }
    if (filter?.sent_date_to) {
      enriched = enriched.filter((s) => s.sent_date && s.sent_date <= filter.sent_date_to!);
    }
    if (filter?.collection_date) {
      enriched = enriched.filter((s) => s.sample_collection_date === filter.collection_date);
    }
    if (filter?.collection_date_from) {
      enriched = enriched.filter((s) => s.sample_collection_date >= filter.collection_date_from!);
    }
    if (filter?.collection_date_to) {
      enriched = enriched.filter((s) => s.sample_collection_date <= filter.collection_date_to!);
    }
    if (filter?.sample_year) {
      enriched = enriched.filter((s) => s.sample_year === filter.sample_year);
    }

    // Sort by date desc, then sample_number desc
    enriched.sort((a, b) => {
      const dDiff = new Date(b.sample_collection_date).getTime() - new Date(a.sample_collection_date).getTime();
      if (dDiff !== 0) return dDiff;
      return b.sample_number - a.sample_number;
    });

    return enriched;
  },

  /**
   * Database-safe Next Sample Number calculation
   * Uniqueness rule: employee_id + sample_year + sample_number
   */
  async getNextSampleNumber(employeeId: string, sampleYear: number): Promise<number> {
    if (!employeeId || !sampleYear) return 1;

    // 1. Try Supabase RPC or Max query
    if (isSupabaseConfigured() && supabase) {
      try {
        // Try calling the PostgreSQL function
        const { data: rpcVal, error: rpcErr } = await supabase.rpc('get_next_malaria_sample_number', {
          p_employee_id: employeeId,
          p_sample_year: sampleYear,
        });

        if (!rpcErr && typeof rpcVal === 'number') {
          return rpcVal;
        }

        // Fallback: direct max query from database
        const { data, error } = await supabase
          .from('malaria_blood_samples')
          .select('sample_number')
          .eq('employee_id', employeeId)
          .eq('sample_year', sampleYear)
          .order('sample_number', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          return (Number(data[0].sample_number) || 0) + 1;
        } else if (!error && data && data.length === 0) {
          return 1;
        }
      } catch (err) {
        console.warn('Supabase getNextSampleNumber failed, checking local:', err);
      }
    }

    // 2. LocalStorage calculation
    const raw = storage.getItem(STORAGE_KEY);
    const list: MalariaBloodSample[] = raw ? JSON.parse(raw) : DEFAULT_SAMPLES;
    const empSamples = list.filter(
      (s) => s.employee_id === employeeId && Number(s.sample_year) === Number(sampleYear)
    );

    if (empSamples.length === 0) {
      return 1;
    }

    const maxNum = Math.max(...empSamples.map((s) => Number(s.sample_number) || 0));
    return maxNum + 1;
  },

  /**
   * Save a new blood sample
   */
  async saveSample(
    sampleData: Omit<MalariaBloodSample, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MalariaBloodSample> {
    // Validate required fields
    if (!sampleData.employee_id) {
      throw new Error('कर्मचारी माहिती (Employee) आवश्यक आहे.');
    }
    assertValidUUID(sampleData.employee_id, 'कर्मचारी ID');

    if (!sampleData.village_id) {
      throw new Error('गाव निवडणे अनिवार्य आहे.');
    }
    assertValidUUID(sampleData.village_id, 'गाव ID');

    if (!sampleData.patient_name || !sampleData.patient_name.trim()) {
      throw new Error('ताप रुग्णाचे पूर्ण नाव आवश्यक आहे.');
    }
    const ageNum = Number(sampleData.age);
    if (!ageNum || isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      throw new Error('वय १ ते १२० दरम्यान असणे आवश्यक आहे.');
    }
    if (!sampleData.gender) {
      throw new Error('लिंग निवडणे आवश्यक आहे.');
    }
    if (!sampleData.sample_collection_date) {
      throw new Error('रक्त नमुना घेतल्याचा दिनांक आवश्यक आहे.');
    }

    // Check future date
    const todayStr = new Date().toISOString().split('T')[0];
    if (sampleData.sample_collection_date > todayStr) {
      throw new Error('रक्त नमुना घेतल्याचा दिनांक भविष्यातील असू शकत नाही.');
    }

    // Derive sample_year
    const dateObj = new Date(sampleData.sample_collection_date);
    const sampleYear = dateObj.getFullYear() || new Date().getFullYear();

    // Determine sequential sample_number
    let assignedSampleNumber = sampleData.sample_number;
    if (!assignedSampleNumber || assignedSampleNumber <= 0) {
      assignedSampleNumber = await this.getNextSampleNumber(sampleData.employee_id, sampleYear);
    }

    const newId = generateId();
    const nowIso = new Date().toISOString();

    const recordToInsert: MalariaBloodSample = {
      ...sampleData,
      id: newId,
      sample_year: sampleYear,
      sample_number: assignedSampleNumber,
      sent_date: null, // New sample MUST remain NULL
      created_at: nowIso,
      updated_at: nowIso,
    };

    // 1. Try Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('malaria_blood_samples')
          .insert({
            id: newId,
            employee_id: sampleData.employee_id,
            village_id: sampleData.village_id,
            house_number: sampleData.house_number ? sampleData.house_number.trim() : null,
            patient_name: sampleData.patient_name.trim(),
            age: ageNum,
            gender: sampleData.gender,
            sample_collection_date: sampleData.sample_collection_date,
            sample_number: assignedSampleNumber,
            sample_year: sampleYear,
            malaria_smear_code: sampleData.malaria_smear_code,
          })
          .select(`
            *,
            village:village_master(village_name, subcentre:subcentre_master(id, subcentre_name, phc:phc_master(id, phc_name))),
            employee:employee_master(employee_name, malaria_smear_code)
          `)
          .single();

        if (error) {
          // If collision occurred (unique violation), re-generate and retry once
          if (error.code === '23505') {
            const nextNum = await this.getNextSampleNumber(sampleData.employee_id, sampleYear);
            const retryRes = await supabase
              .from('malaria_blood_samples')
              .insert({
                id: newId,
                employee_id: sampleData.employee_id,
                village_id: sampleData.village_id,
                house_number: sampleData.house_number ? sampleData.house_number.trim() : null,
                patient_name: sampleData.patient_name.trim(),
                age: ageNum,
                gender: sampleData.gender,
                sample_collection_date: sampleData.sample_collection_date,
                sample_number: nextNum,
                sample_year: sampleYear,
                malaria_smear_code: sampleData.malaria_smear_code,
              })
              .select()
              .single();

            if (!retryRes.error && retryRes.data) {
              recordToInsert.sample_number = nextNum;
            } else if (!isDemoMode()) {
              throw new Error(`रक्त नमुना जतन करता आला नाही: ${retryRes.error?.message || error.message}`);
            }
          } else {
            console.error('Supabase insert sample error:', error.message);
            if (!isDemoMode()) {
              throw new Error(`रक्त नमुना जतन करता आला नाही: ${error.message}`);
            }
          }
        }
      } catch (err: any) {
        console.error('Supabase saveSample exception:', err);
        if (!isDemoMode()) {
          throw new Error(err.message || 'रक्त नमुना जतन करता आला नाही.');
        }
      }
    } else if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }

    // 2. Save in LocalStorage cache
    const raw = storage.getItem(STORAGE_KEY);
    const list: MalariaBloodSample[] = raw ? JSON.parse(raw) : DEFAULT_SAMPLES;
    
    // Ensure uniqueness in local store as well
    const exists = list.some(
      (s) =>
        s.employee_id === recordToInsert.employee_id &&
        s.sample_year === recordToInsert.sample_year &&
        s.sample_number === recordToInsert.sample_number
    );
    if (exists) {
      const nextNum = Math.max(...list.filter(s => s.employee_id === recordToInsert.employee_id && s.sample_year === recordToInsert.sample_year).map(s => s.sample_number), 0) + 1;
      recordToInsert.sample_number = nextNum;
    }

    list.unshift(recordToInsert);
    storage.setItem(STORAGE_KEY, JSON.stringify(list));

    return recordToInsert;
  },

  /**
   * Update an existing blood sample
   */
  async updateSample(id: string, updates: Partial<MalariaBloodSample>): Promise<void> {
    assertValidUUID(id, 'रक्त नमुना ID');
    if (updates.village_id) assertValidUUID(updates.village_id, 'गाव ID');
    if (updates.employee_id) assertValidUUID(updates.employee_id, 'कर्मचारी ID');

    const nowIso = new Date().toISOString();

    // 1. Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        const payload: any = { updated_at: nowIso };
        if (updates.patient_name) payload.patient_name = updates.patient_name.trim();
        if (updates.house_number !== undefined) payload.house_number = updates.house_number ? updates.house_number.trim() : null;
        if (updates.age !== undefined) payload.age = Number(updates.age);
        if (updates.gender) payload.gender = updates.gender;
        if (updates.village_id) payload.village_id = updates.village_id;
        if (updates.sample_collection_date) {
          payload.sample_collection_date = updates.sample_collection_date;
          payload.sample_year = new Date(updates.sample_collection_date).getFullYear();
        }

        const { error } = await supabase.from('malaria_blood_samples').update(payload).eq('id', id);
        if (error) {
          console.error('Supabase update sample error:', error.message);
          if (!isDemoMode()) {
            throw new Error(`रक्त नमुना अद्ययावत करता आला नाही: ${error.message}`);
          }
        }
      } catch (err: any) {
        console.error('Supabase updateSample exception:', err);
        if (!isDemoMode()) {
          throw new Error(err.message || 'रक्त नमुना अद्ययावत करता आला नाही.');
        }
      }
    } else if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }

    // 2. LocalStorage
    const raw = storage.getItem(STORAGE_KEY);
    let list: MalariaBloodSample[] = raw ? JSON.parse(raw) : DEFAULT_SAMPLES;
    list = list.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          ...updates,
          updated_at: nowIso,
        };
      }
      return item;
    });
    storage.setItem(STORAGE_KEY, JSON.stringify(list));
  },

  /**
   * Mark blood samples as sent with given sent_date
   */
  async markSamplesAsSent(sampleIds: string[], sentDate: string): Promise<boolean> {
    if (!sampleIds || sampleIds.length === 0) {
      throw new Error('कृपया किमान एक रक्त नमुना निवडा.');
    }
    sampleIds.forEach(id => assertValidUUID(id, 'रक्त नमुना ID'));

    const nowIso = new Date().toISOString();

    // 1. Supabase Update
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('malaria_blood_samples')
          .update({
            sent_date: sentDate,
            updated_at: nowIso,
          })
          .in('id', sampleIds);

        if (error) {
          console.error('Supabase update sent_date error:', error);
          throw new Error(`नमुने पाठविल्याची तारीख जतन करता आली नाही: ${error.message}`);
        }
      } catch (err: any) {
        console.error('Supabase markSamplesAsSent failed:', err);
        throw new Error(err.message || 'नमुने पाठविल्याची तारीख जतन करता आली नाही.');
      }
    } else if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }

    // 2. LocalStorage Update
    try {
      const raw = storage.getItem(STORAGE_KEY);
      let list: MalariaBloodSample[] = raw ? JSON.parse(raw) : DEFAULT_SAMPLES;
      list = list.map((item) => {
        if (sampleIds.includes(item.id)) {
          return {
            ...item,
            sent_date: sentDate,
            updated_at: nowIso,
          };
        }
        return item;
      });
      storage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (err) {
      console.error('LocalStorage markSamplesAsSent failed:', err);
      throw new Error('नमुने पाठविल्याची तारीख जतन करता आली नाही.');
    }
  },

  /**
   * Delete blood sample
   */
  async deleteSample(id: string): Promise<boolean> {
    assertValidUUID(id, 'रक्त नमुना ID');
    // 1. Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('malaria_blood_samples').delete().eq('id', id);
        if (error) {
          console.error('Supabase delete sample error:', error.message);
          if (!isDemoMode()) {
            throw new Error(`रक्त नमुना हटवता आला नाही: ${error.message}`);
          }
        }
      } catch (err: any) {
        console.error('Supabase deleteSample exception:', err);
        if (!isDemoMode()) {
          throw new Error(err.message || 'रक्त नमुना हटवता आला नाही.');
        }
      }
    } else if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }

    // 2. LocalStorage
    const raw = storage.getItem(STORAGE_KEY);
    let list: MalariaBloodSample[] = raw ? JSON.parse(raw) : DEFAULT_SAMPLES;
    list = list.filter((s) => s.id !== id);
    storage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  },

  /**
   * Calculate live reporting statistics based on scope filter and date range
   */
  async getReportingStats(filter?: {
    phc_id?: string;
    subcentre_id?: string;
    village_id?: string;
    employee_id?: string;
    from_date?: string;
    to_date?: string;
  }) {
    const all = await this.getSamples({
      phc_id: filter?.phc_id,
      subcentre_id: filter?.subcentre_id,
      village_id: filter?.village_id,
      employee_id: filter?.employee_id,
    });

    const todayIso = getTodayIso();
    const currentYear = new Date().getFullYear();
    const currentMonthPrefix = todayIso.substring(0, 7); // YYYY-MM
    const currentYearPrefix = String(currentYear);

    // 1. Today
    const todaySamples = all.filter((s) => s.sample_collection_date === todayIso);
    const todaySent = all.filter((s) => s.sent_date === todayIso);
    const todayPending = todaySamples.filter((s) => !s.sent_date);

    // 2. This Month
    const monthSamples = all.filter((s) => s.sample_collection_date.startsWith(currentMonthPrefix));
    const monthSent = all.filter((s) => s.sent_date && s.sent_date.startsWith(currentMonthPrefix));
    const monthPending = monthSamples.filter((s) => !s.sent_date);

    // 3. This Year
    const yearSamples = all.filter((s) => s.sample_year === currentYear || s.sample_collection_date.startsWith(currentYearPrefix));
    const yearSent = all.filter((s) => s.sent_date && s.sent_date.startsWith(currentYearPrefix));
    const yearPending = yearSamples.filter((s) => !s.sent_date);

    // 4. Overall Pending
    const totalPending = all.filter((s) => !s.sent_date);
    const totalSent = all.filter((s) => Boolean(s.sent_date));

    // 5. Selected Date Range
    let rangeSamples = all;
    if (filter?.from_date) {
      rangeSamples = rangeSamples.filter((s) => s.sample_collection_date >= filter.from_date!);
    }
    if (filter?.to_date) {
      rangeSamples = rangeSamples.filter((s) => s.sample_collection_date <= filter.to_date!);
    }

    const rangeSent = rangeSamples.filter((s) => Boolean(s.sent_date));
    const rangePending = rangeSamples.filter((s) => !s.sent_date);

    return {
      todaySamplesCount: todaySamples.length,
      todaySentCount: todaySent.length,
      todayPendingCount: todayPending.length,
      monthSamplesCount: monthSamples.length,
      monthSentCount: monthSent.length,
      monthPendingCount: monthPending.length,
      yearSamplesCount: yearSamples.length,
      yearSentCount: yearSent.length,
      yearPendingCount: yearPending.length,
      totalPendingCount: totalPending.length,
      totalSentCount: totalSent.length,
      totalSamplesCount: all.length,
      rangeSamplesCount: rangeSamples.length,
      rangeSentCount: rangeSent.length,
      rangePendingCount: rangePending.length,
      rangeSamples,
    };
  },
};
