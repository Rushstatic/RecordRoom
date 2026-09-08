import React, { useState, useEffect } from 'react';
import { RecordTemplateField, DynamicRecordEntry } from '../types';
import { Save, AlertTriangle, FileSpreadsheet } from 'lucide-react';

interface Props {
  fields: RecordTemplateField[];
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  error?: string | null;
  success?: string | null;
}

export function DynamicRecordForm({ fields, initialData, onSave, onCancel, error, success }: Props) {
  const [formData, setFormData] = useState<any>(initialData || {});

  useEffect(() => {
    setFormData(initialData || {});
  }, [initialData]);

  const activeFields = fields.filter(f => f.is_active);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div>
      {error && (
        <div className="p-3 m-4 bg-rose-50 text-rose-800 text-sm font-medium rounded-lg flex items-center gap-2 border border-rose-200">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}
      {success && (
        <div className="p-3 m-4 bg-emerald-50 text-emerald-800 text-sm font-medium rounded-lg flex items-center gap-2 border border-emerald-200">
          <FileSpreadsheet className="w-4 h-4" /> {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {activeFields.map(f => {
            if (f.conditional_json && f.conditional_json.depends_on) {
               const depField = f.conditional_json.depends_on;
               const depValue = f.conditional_json.value;
               if (formData[depField] !== depValue) return null;
            }
            
            const isAuto = f.field_type === 'auto_date' || f.field_type === 'auto_number' || f.automation_json?.action === 'AUTO_DATE';
            
            return (
              <div key={f.id} className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  {f.field_label} {f.is_required && !isAuto && <span className="text-rose-500">*</span>}
                </label>
                
                {f.field_type === 'textarea' ? (
                  <textarea
                    required={f.is_required && !isAuto}
                    value={formData[f.field_key] || ''}
                    onChange={e => setFormData({...formData, [f.field_key]: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm"
                    placeholder={f.placeholder || ''}
                  />
                ) : f.field_type === 'dropdown' ? (
                  <select
                    required={f.is_required && !isAuto}
                    value={formData[f.field_key] || ''}
                    onChange={e => setFormData({...formData, [f.field_key]: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm"
                  >
                    <option value="">निवडा...</option>
                    {Array.isArray(f.options_json) && f.options_json.map((opt: any, idx: number) => (
                      <option key={idx} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : f.field_type === 'radio' ? (
                  <div className="flex gap-4">
                    {Array.isArray(f.options_json) && f.options_json.map((opt: any, idx: number) => (
                      <label key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={f.field_key}
                          value={opt.value}
                          checked={formData[f.field_key] === opt.value}
                          onChange={e => setFormData({...formData, [f.field_key]: e.target.value})}
                          className="text-indigo-600 focus:ring-indigo-600"
                        />
                        <span className="text-sm text-slate-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                ) : isAuto ? (
                  <input
                    type="text"
                    disabled
                    value={formData[f.field_key] || '(Auto)'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-sm font-medium"
                  />
                ) : (
                  <input
                    required={f.is_required}
                    type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                    value={formData[f.field_key] || ''}
                    onChange={e => setFormData({...formData, [f.field_key]: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm"
                    placeholder={f.placeholder || ''}
                    min={f.validation_json?.min}
                    max={f.validation_json?.max}
                    pattern={f.validation_json?.pattern}
                  />
                )}
                {f.help_text && <p className="text-xs text-slate-500">{f.help_text}</p>}
              </div>
            );
          })}
        </div>
        <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 sm:py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors w-full sm:w-auto"
          >
            रद्द करा / साफ करा
          </button>
          <button
            type="submit"
            className="px-6 py-3 sm:py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Save className="w-5 h-5 sm:w-4 sm:h-4" /> जतन करा
          </button>
        </div>
      </form>
    </div>
  );
}
