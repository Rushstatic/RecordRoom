import { storage } from '../lib/storage';
import { RecordRegisterTemplate, RecordTemplateField, DynamicRecordEntry } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isDemoMode } from '../lib/env';
import { assertValidUUID, isValidUUID } from '../utils/uuid';

const TEMPLATES_KEY = 'arogya_register_templates';
const TEMPLATE_FIELDS_KEY = 'arogya_template_fields';
const DYNAMIC_RECORDS_KEY = 'arogya_dynamic_records';

const DEFAULT_TEMPLATES: RecordRegisterTemplate[] = [
  {
    id: 'b1000000-0000-4000-8000-000000000001',
    register_code: 'MALARIA',
    register_name: 'मलेरिया रक्त नमुना नोंद',
    program_name: 'राष्ट्रीय हिवताप नियंत्रण कार्यक्रम',
    description: 'मलेरिया रक्त नमुना नोंदवही',
    icon: 'Droplet',
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 'b2000000-0000-4000-8000-000000000002',
    register_code: 'TB',
    register_name: 'क्षयरोग संशयित रुग्ण नोंद',
    program_name: 'राष्ट्रीय क्षयरोग निर्मूलन कार्यक्रम',
    description: 'क्षयरोग संशयित रुग्ण नोंदवही',
    icon: 'Activity',
    is_active: true,
    display_order: 2,
    created_at: new Date().toISOString()
  }
];

class TemplateService {
  async getTemplates(): Promise<RecordRegisterTemplate[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('record_register_templates').select('*').order('display_order');
        if (!error && data) {
          storage.setItem(TEMPLATES_KEY, JSON.stringify(data));
          return data as RecordRegisterTemplate[];
        }
      } catch (e) { console.warn('Supabase templates error, using local'); }
    }
    let raw = storage.getItem(TEMPLATES_KEY);
    if (!raw) {
      if (isDemoMode()) {
        storage.setItem(TEMPLATES_KEY, JSON.stringify(DEFAULT_TEMPLATES));
        return DEFAULT_TEMPLATES;
      }
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return isDemoMode() ? DEFAULT_TEMPLATES : [];
    }
  }

  async getActiveTemplates(): Promise<RecordRegisterTemplate[]> {
    const templates = await this.getTemplates();
    return templates.filter(t => t.is_active).sort((a, b) => a.display_order - b.display_order);
  }

  async getTemplateById(id: string): Promise<RecordRegisterTemplate | null> {
    const templates = await this.getTemplates();
    return templates.find(t => t.id === id) || null;
  }

  async saveTemplate(template: RecordRegisterTemplate): Promise<void> {
    const validId = isValidUUID(template.id) ? template.id : crypto.randomUUID();
    const cleanTemplate: RecordRegisterTemplate = {
      ...template,
      id: validId,
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = {
        id: cleanTemplate.id,
        register_code: cleanTemplate.register_code,
        register_name: cleanTemplate.register_name,
        program_name: cleanTemplate.program_name || null,
        description: cleanTemplate.description || null,
        icon: cleanTemplate.icon || 'FileText',
        is_active: cleanTemplate.is_active ?? true,
        display_order: cleanTemplate.display_order ?? 0,
        created_by: isValidUUID(cleanTemplate.created_by) ? cleanTemplate.created_by : null,
        updated_at: cleanTemplate.updated_at,
      };

      const { error } = await supabase.from('record_register_templates').upsert(dbPayload);
      if (error) {
        console.error('Supabase save template error:', error);
        if (!isDemoMode()) {
          throw new Error(`नोंदवही टेम्पलेट जतन करता आले नाही: ${error.message}`);
        }
      }
    } else if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }

    const templates = await this.getTemplates();
    const index = templates.findIndex(t => t.id === cleanTemplate.id);
    if (index >= 0) {
      templates[index] = cleanTemplate;
    } else {
      templates.push({ ...cleanTemplate, created_at: new Date().toISOString() });
    }
    storage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  }

  async deleteTemplate(templateId: string): Promise<{ success: boolean; message: string; archived: boolean }> {
    assertValidUUID(templateId, 'टेम्पलेट ID');
    
    // Check if dynamic records exist for this template
    let recordCount = 0;
    if (isSupabaseConfigured() && supabase) {
      try {
        const { count, error } = await supabase
          .from('dynamic_record_entries')
          .select('id', { count: 'exact', head: true })
          .eq('template_id', templateId);
        if (!error && typeof count === 'number') {
          recordCount = count;
        }
      } catch (e) {
        console.warn('Could not check record count in Supabase:', e);
      }
    } else {
      const records = await this.getDynamicRecords(templateId);
      recordCount = records.length;
    }

    // If records exist, DO NOT hard delete to protect clinical data integrity. Soft-archive instead.
    if (recordCount > 0) {
      const existing = await this.getTemplateById(templateId);
      if (existing) {
        await this.saveTemplate({ ...existing, is_active: false });
      }
      return {
        success: true,
        archived: true,
        message: `या नोंदवहीत ${recordCount} नोंदी असल्याने डेटा सुरक्षिततेसाठी हे रजिस्टर हटवण्याऐवजी निष्क्रीय (Archived/Inactive) करण्यात आले आहे.`
      };
    }

    // Hard delete when no records exist
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('record_register_templates').delete().eq('id', templateId);
      if (error) {
        console.error('Supabase delete template error:', error);
        if (!isDemoMode()) {
          throw new Error(`नोंदवही टेम्पलेट हटवता आले नाही: ${error.message}`);
        }
      }
    }

    let raw = storage.getItem(TEMPLATES_KEY);
    let templates = raw ? JSON.parse(raw) as RecordRegisterTemplate[] : [];
    templates = templates.filter(t => t.id !== templateId);
    storage.setItem(TEMPLATES_KEY, JSON.stringify(templates));

    return {
      success: true,
      archived: false,
      message: 'नोंदवही टेम्पलेट यशस्वीरित्या डिलीट केले गेले.'
    };
  }

  async reorderTemplates(orderedIds: string[]): Promise<void> {
    const templates = await this.getTemplates();
    const updated = templates.map(t => {
      const idx = orderedIds.indexOf(t.id);
      return idx >= 0 ? { ...t, display_order: idx + 1 } : t;
    });
    
    if (isSupabaseConfigured() && supabase) {
      for (const t of updated) {
        await supabase.from('record_register_templates').update({ display_order: t.display_order }).eq('id', t.id);
      }
    }
    storage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
  }

  async getTemplateFields(templateId: string): Promise<RecordTemplateField[]> {
    if (isSupabaseConfigured() && supabase && isValidUUID(templateId)) {
      try {
        const { data, error } = await supabase.from('record_template_fields').select('*').eq('template_id', templateId).order('field_order');
        if (!error && data) return data as RecordTemplateField[];
      } catch (e) { console.warn('Supabase fields error, using local'); }
    }
    const raw = storage.getItem(TEMPLATE_FIELDS_KEY);
    if (!raw) return [];
    const fields = JSON.parse(raw) as RecordTemplateField[];
    return fields.filter(f => f.template_id === templateId).sort((a, b) => a.field_order - b.field_order);
  }

  async saveTemplateField(field: RecordTemplateField): Promise<void> {
    assertValidUUID(field.template_id, 'टेम्पलेट ID');
    const validId = isValidUUID(field.id) ? field.id : crypto.randomUUID();
    const cleanField: RecordTemplateField = {
      ...field,
      id: validId,
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = {
        id: cleanField.id,
        template_id: cleanField.template_id,
        field_key: cleanField.field_key,
        field_label: cleanField.field_label,
        field_type: cleanField.field_type,
        field_order: cleanField.field_order ?? 0,
        is_required: cleanField.is_required ?? false,
        is_searchable: cleanField.is_searchable ?? false,
        show_in_list: cleanField.show_in_list ?? true,
        show_in_report: cleanField.show_in_report ?? true,
        show_in_print: cleanField.show_in_print ?? true,
        default_value: cleanField.default_value || null,
        placeholder: cleanField.placeholder || null,
        help_text: cleanField.help_text || null,
        options_json: cleanField.options_json || [],
        validation_json: cleanField.validation_json || {},
        automation_json: cleanField.automation_json || {},
        conditional_json: cleanField.conditional_json || {},
        is_active: cleanField.is_active ?? true,
        updated_at: cleanField.updated_at,
      };

      const { error } = await supabase.from('record_template_fields').upsert(dbPayload);
      if (error) {
        console.error('Supabase save field error:', error);
        if (!isDemoMode()) {
          throw new Error(`नोंदवही फील्ड जतन करता आले नाही: ${error.message}`);
        }
      }
    } else if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }

    let raw = storage.getItem(TEMPLATE_FIELDS_KEY);
    let fields = raw ? JSON.parse(raw) as RecordTemplateField[] : [];
    const index = fields.findIndex(f => f.id === cleanField.id);
    if (index >= 0) {
      fields[index] = cleanField;
    } else {
      fields.push({ ...cleanField, created_at: new Date().toISOString() });
    }
    storage.setItem(TEMPLATE_FIELDS_KEY, JSON.stringify(fields));
  }
  
  async deleteTemplateField(fieldId: string): Promise<void> {
    assertValidUUID(fieldId, 'फील्ड ID');
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('record_template_fields').delete().eq('id', fieldId);
      if (error) {
        console.error('Supabase delete field error:', error);
        if (!isDemoMode()) {
          throw new Error(`नोंदवही फील्ड हटवता आले नाही: ${error.message}`);
        }
      }
    } else if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }

    let raw = storage.getItem(TEMPLATE_FIELDS_KEY);
    let fields = raw ? JSON.parse(raw) as RecordTemplateField[] : [];
    fields = fields.filter(f => f.id !== fieldId);
    storage.setItem(TEMPLATE_FIELDS_KEY, JSON.stringify(fields));
  }

  async getDynamicRecords(templateId: string): Promise<DynamicRecordEntry[]> {
    if (isSupabaseConfigured() && supabase && isValidUUID(templateId)) {
      try {
        const { data, error } = await supabase.from('dynamic_record_entries').select('*').eq('template_id', templateId).order('created_at', { ascending: false });
        if (!error && data) return data as DynamicRecordEntry[];
      } catch (e) { console.warn('Supabase records error, using local'); }
    }
    const raw = storage.getItem(DYNAMIC_RECORDS_KEY);
    if (!raw) return [];
    const records = JSON.parse(raw) as DynamicRecordEntry[];
    return records.filter(r => r.template_id === templateId).sort((a, b) => {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }

  async saveDynamicRecord(record: DynamicRecordEntry): Promise<void> {
    assertValidUUID(record.template_id, 'टेम्पलेट ID');
    assertValidUUID(record.employee_id, 'कर्मचारी ID');
    assertValidUUID(record.phc_id, 'प्रा.आ.के. ID');
    assertValidUUID(record.subcentre_id, 'उपकेंद्र ID');
    if (record.village_id) assertValidUUID(record.village_id, 'गाव ID');

    const validId = isValidUUID(record.id) ? record.id : crypto.randomUUID();
    const cleanRecord: DynamicRecordEntry = {
      ...record,
      id: validId,
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = {
        id: cleanRecord.id,
        template_id: cleanRecord.template_id,
        employee_id: cleanRecord.employee_id,
        phc_id: cleanRecord.phc_id,
        subcentre_id: cleanRecord.subcentre_id,
        village_id: cleanRecord.village_id || null,
        record_data: cleanRecord.record_data || {},
        record_date: cleanRecord.record_date || new Date().toISOString().split('T')[0],
        is_printed: cleanRecord.is_printed ?? false,
        printed_at: cleanRecord.printed_at || null,
        printed_by: isValidUUID(cleanRecord.printed_by) ? cleanRecord.printed_by : null,
        print_count: cleanRecord.print_count ?? 0,
        created_by: isValidUUID(cleanRecord.created_by) ? cleanRecord.created_by : null,
        updated_by: isValidUUID(cleanRecord.updated_by) ? cleanRecord.updated_by : null,
        updated_at: cleanRecord.updated_at,
      };

      const { error } = await supabase.from('dynamic_record_entries').upsert(dbPayload);
      if (error) {
        console.error('Supabase save record error:', error);
        if (!isDemoMode()) {
          throw new Error(`डायनॅमिक नोंद जतन करता आली नाही: ${error.message}`);
        }
      }
    } else if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }

    let raw = storage.getItem(DYNAMIC_RECORDS_KEY);
    let records = raw ? JSON.parse(raw) as DynamicRecordEntry[] : [];
    const index = records.findIndex(r => r.id === cleanRecord.id);
    if (index >= 0) {
      records[index] = cleanRecord;
    } else {
      records.push({ ...cleanRecord, created_at: new Date().toISOString() });
    }
    storage.setItem(DYNAMIC_RECORDS_KEY, JSON.stringify(records));
  }

  async deleteDynamicRecord(recordId: string): Promise<void> {
    assertValidUUID(recordId, 'नोंद ID');
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('dynamic_record_entries').delete().eq('id', recordId);
      if (error) {
        console.error('Supabase delete record error:', error);
        if (!isDemoMode()) {
          throw new Error(`डायनॅमिक नोंद हटवता आली नाही: ${error.message}`);
        }
      }
    } else if (!isDemoMode()) {
      throw new Error('Supabase कॉन्फिगर केलेले नाही.');
    }

    let raw = storage.getItem(DYNAMIC_RECORDS_KEY);
    let records = raw ? JSON.parse(raw) as DynamicRecordEntry[] : [];
    records = records.filter(r => r.id !== recordId);
    storage.setItem(DYNAMIC_RECORDS_KEY, JSON.stringify(records));
  }

  async reorderFields(templateId: string, orderedFieldIds: string[]): Promise<void> {
    assertValidUUID(templateId, 'टेम्पलेट ID');
    const fields = await this.getTemplateFields(templateId);
    const updated = fields.map(f => {
      const idx = orderedFieldIds.indexOf(f.id);
      return idx >= 0 ? { ...f, field_order: idx + 1 } : f;
    });

    if (isSupabaseConfigured() && supabase) {
      for (const f of updated) {
        await supabase.from('record_template_fields').update({ field_order: f.field_order }).eq('id', f.id);
      }
    }

    let raw = storage.getItem(TEMPLATE_FIELDS_KEY);
    let allFields = raw ? JSON.parse(raw) as RecordTemplateField[] : [];
    allFields = allFields.map(f => {
      if (f.template_id === templateId) {
        const found = updated.find(u => u.id === f.id);
        return found || f;
      }
      return f;
    });
    storage.setItem(TEMPLATE_FIELDS_KEY, JSON.stringify(allFields));
  }

  async getRecordStats(templateId: string): Promise<{ total: number; today: number; printed: number }> {
    const records = await this.getDynamicRecords(templateId);
    const todayStr = new Date().toISOString().split('T')[0];
    const today = records.filter(r => r.record_date === todayStr).length;
    const printed = records.filter(r => r.is_printed).length;
    return {
      total: records.length,
      today,
      printed
    };
  }
}

export const templateService = new TemplateService();
