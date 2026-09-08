import { RecordRegisterTemplate, RecordTemplateField, DynamicRecordEntry } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const TEMPLATES_KEY = 'arogya_register_templates';
const TEMPLATE_FIELDS_KEY = 'arogya_template_fields';
const DYNAMIC_RECORDS_KEY = 'arogya_dynamic_records';

const DEFAULT_TEMPLATES: RecordRegisterTemplate[] = [
  {
    id: 'TPL-MALARIA-01',
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
    id: 'TPL-TB-01',
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
        if (!error && data) return data as RecordRegisterTemplate[];
      } catch (e) { console.warn('Supabase templates error, using local'); }
    }
    let raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    }
    return JSON.parse(raw);
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
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('record_register_templates').upsert({...template, updated_at: new Date().toISOString()});
      } catch (e) { console.warn('Supabase save error, using local'); }
    }
    const templates = await this.getTemplates();
    const index = templates.findIndex(t => t.id === template.id);
    if (index >= 0) {
      templates[index] = { ...template, updated_at: new Date().toISOString() };
    } else {
      templates.push({ ...template, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  }

  async getTemplateFields(templateId: string): Promise<RecordTemplateField[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('record_template_fields').select('*').eq('template_id', templateId).order('field_order');
        if (!error && data) return data as RecordTemplateField[];
      } catch (e) { console.warn('Supabase fields error, using local'); }
    }
    const raw = localStorage.getItem(TEMPLATE_FIELDS_KEY);
    if (!raw) return [];
    const fields = JSON.parse(raw) as RecordTemplateField[];
    return fields.filter(f => f.template_id === templateId).sort((a, b) => a.field_order - b.field_order);
  }

  async saveTemplateField(field: RecordTemplateField): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('record_template_fields').upsert({...field, updated_at: new Date().toISOString()});
      } catch (e) { console.warn('Supabase save field error, using local'); }
    }
    let raw = localStorage.getItem(TEMPLATE_FIELDS_KEY);
    let fields = raw ? JSON.parse(raw) as RecordTemplateField[] : [];
    const index = fields.findIndex(f => f.id === field.id);
    if (index >= 0) {
      fields[index] = { ...field, updated_at: new Date().toISOString() };
    } else {
      fields.push({ ...field, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    localStorage.setItem(TEMPLATE_FIELDS_KEY, JSON.stringify(fields));
  }
  
  async deleteTemplateField(fieldId: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('record_template_fields').delete().eq('id', fieldId);
      } catch (e) { console.warn('Supabase delete field error, using local'); }
    }
    let raw = localStorage.getItem(TEMPLATE_FIELDS_KEY);
    let fields = raw ? JSON.parse(raw) as RecordTemplateField[] : [];
    fields = fields.filter(f => f.id !== fieldId);
    localStorage.setItem(TEMPLATE_FIELDS_KEY, JSON.stringify(fields));
  }

  async getDynamicRecords(templateId: string): Promise<DynamicRecordEntry[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('dynamic_record_entries').select('*').eq('template_id', templateId).order('created_at', { ascending: false });
        if (!error && data) return data as DynamicRecordEntry[];
      } catch (e) { console.warn('Supabase records error, using local'); }
    }
    const raw = localStorage.getItem(DYNAMIC_RECORDS_KEY);
    if (!raw) return [];
    const records = JSON.parse(raw) as DynamicRecordEntry[];
    return records.filter(r => r.template_id === templateId).sort((a, b) => {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }

  async saveDynamicRecord(record: DynamicRecordEntry): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('dynamic_record_entries').upsert({...record, updated_at: new Date().toISOString()});
      } catch (e) { console.warn('Supabase save record error, using local'); }
    }
    let raw = localStorage.getItem(DYNAMIC_RECORDS_KEY);
    let records = raw ? JSON.parse(raw) as DynamicRecordEntry[] : [];
    const index = records.findIndex(r => r.id === record.id);
    if (index >= 0) {
      records[index] = { ...record, updated_at: new Date().toISOString() };
    } else {
      records.push({ ...record, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    localStorage.setItem(DYNAMIC_RECORDS_KEY, JSON.stringify(records));
  }
}

export const templateService = new TemplateService();
