import fs from 'fs';

let content = fs.readFileSync('src/services/templateService.ts', 'utf8');

const replacement = `import { RecordRegisterTemplate, RecordTemplateField, DynamicRecordEntry } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';`;

content = content.replace("import { RecordRegisterTemplate, RecordTemplateField, DynamicRecordEntry } from '../types';", replacement);

// Replace getTemplates
content = content.replace(
  "  async getTemplates(): Promise<RecordRegisterTemplate[]> {",
  `  async getTemplates(): Promise<RecordRegisterTemplate[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('record_register_templates').select('*').order('display_order');
        if (!error && data) return data as RecordRegisterTemplate[];
      } catch (e) { console.warn('Supabase templates error, using local'); }
    }`
);

// Replace saveTemplate
content = content.replace(
  "  async saveTemplate(template: RecordRegisterTemplate): Promise<void> {",
  `  async saveTemplate(template: RecordRegisterTemplate): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('record_register_templates').upsert({...template, updated_at: new Date().toISOString()});
      } catch (e) { console.warn('Supabase save error, using local'); }
    }`
);

// Replace getTemplateFields
content = content.replace(
  "  async getTemplateFields(templateId: string): Promise<RecordTemplateField[]> {",
  `  async getTemplateFields(templateId: string): Promise<RecordTemplateField[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('record_template_fields').select('*').eq('template_id', templateId).order('field_order');
        if (!error && data) return data as RecordTemplateField[];
      } catch (e) { console.warn('Supabase fields error, using local'); }
    }`
);

// Replace saveTemplateField
content = content.replace(
  "  async saveTemplateField(field: RecordTemplateField): Promise<void> {",
  `  async saveTemplateField(field: RecordTemplateField): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('record_template_fields').upsert({...field, updated_at: new Date().toISOString()});
      } catch (e) { console.warn('Supabase save field error, using local'); }
    }`
);

// Replace deleteTemplateField
content = content.replace(
  "  async deleteTemplateField(fieldId: string): Promise<void> {",
  `  async deleteTemplateField(fieldId: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('record_template_fields').delete().eq('id', fieldId);
      } catch (e) { console.warn('Supabase delete field error, using local'); }
    }`
);

// Replace getDynamicRecords
content = content.replace(
  "  async getDynamicRecords(templateId: string): Promise<DynamicRecordEntry[]> {",
  `  async getDynamicRecords(templateId: string): Promise<DynamicRecordEntry[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('dynamic_record_entries').select('*').eq('template_id', templateId).order('created_at', { ascending: false });
        if (!error && data) return data as DynamicRecordEntry[];
      } catch (e) { console.warn('Supabase records error, using local'); }
    }`
);

// Replace saveDynamicRecord
content = content.replace(
  "  async saveDynamicRecord(record: DynamicRecordEntry): Promise<void> {",
  `  async saveDynamicRecord(record: DynamicRecordEntry): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('dynamic_record_entries').upsert({...record, updated_at: new Date().toISOString()});
      } catch (e) { console.warn('Supabase save record error, using local'); }
    }`
);

fs.writeFileSync('src/services/templateService.ts', content, 'utf8');
