import React, { useState, useEffect } from 'react';
import { PageId, RecordRegisterTemplate, RecordTemplateField, DynamicRecordEntry } from '../types';
import { templateService } from '../services/templateService';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function DynamicRegisterPage({
  onNavigate,
  templateId
}: {
  onNavigate: (page: PageId) => void;
  templateId: string;
}) {
  const { user } = useAuth();
  const [template, setTemplate] = useState<RecordRegisterTemplate | null>(null);
  const [fields, setFields] = useState<RecordTemplateField[]>([]);
  const [records, setRecords] = useState<DynamicRecordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [templateId]);

  const loadData = async () => {
    if (!templateId) {
      onNavigate('dashboard');
      return;
    }
    setLoading(true);
    const t = await templateService.getTemplateById(templateId);
    if (!t) {
      onNavigate('dashboard');
      return;
    }
    setTemplate(t);
    const f = await templateService.getTemplateFields(templateId);
    setFields(f);
    const r = await templateService.getDynamicRecords(templateId);
    setRecords(r);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId) return;

    // Execute ON_CREATE triggers, etc.
    const finalData = { ...formData };
    fields.forEach(f => {
       if (f.automation_json?.trigger === 'ON_CREATE' && f.automation_json?.action === 'AUTO_DATE') {
          finalData[f.field_key] = new Date().toISOString().split('T')[0];
       }
    });

    const newRecord: DynamicRecordEntry = {
      id: `REC-${Date.now()}`,
      template_id: templateId,
      employee_id: user?.employeeId,
      phc_id: user?.phcId,
      subcentre_id: user?.subcentreId,
      record_data: finalData,
      record_date: new Date().toISOString().split('T')[0],
      created_by: user?.id,
    };

    await templateService.saveDynamicRecord(newRecord);
    setShowForm(false);
    setFormData({});
    loadData();
  };

  const openNewForm = () => {
    setFormData({});
    setShowForm(true);
  };

  if (loading || !template) return <div className="p-8 text-center">लोड होत आहे...</div>;

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('dashboard')} className="p-2 bg-white rounded-full shadow-sm text-slate-600 hover:text-slate-900 border border-slate-200">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{template.register_name}</h1>
            <p className="text-sm text-slate-500 mt-1">{template.program_name}</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={openNewForm}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> नवीन नोंद
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800">नवीन नोंद तयार करा</h3>
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {fields.map(f => {
                // simple conditional check (mocked)
                if (f.conditional_json && f.conditional_json.depends_on) {
                   const depField = f.conditional_json.depends_on;
                   const depValue = f.conditional_json.value;
                   if (formData[depField] !== depValue) return null;
                }
                
                return (
                  <div key={f.id} className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      {f.field_label} {f.is_required && <span className="text-rose-500">*</span>}
                    </label>
                    
                    {f.field_type === 'textarea' ? (
                      <textarea
                        required={f.is_required}
                        value={formData[f.field_key] || ''}
                        onChange={e => setFormData({...formData, [f.field_key]: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm"
                        placeholder={f.placeholder || ''}
                      />
                    ) : f.field_type === 'dropdown' ? (
                      <select
                        required={f.is_required}
                        value={formData[f.field_key] || ''}
                        onChange={e => setFormData({...formData, [f.field_key]: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm"
                      >
                        <option value="">निवडा...</option>
                        {Array.isArray(f.options_json) && f.options_json.map((opt: any, idx: number) => (
                          <option key={idx} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : f.field_type === 'auto_date' || f.field_type === 'auto_number' ? (
                      <input
                        type="text"
                        disabled
                        value={formData[f.field_key] || '(Auto)'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-sm"
                      />
                    ) : (
                      <input
                        required={f.is_required}
                        type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                        value={formData[f.field_key] || ''}
                        onChange={e => setFormData({...formData, [f.field_key]: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm"
                        placeholder={f.placeholder || ''}
                      />
                    )}
                    {f.help_text && <p className="text-xs text-slate-500">{f.help_text}</p>}
                  </div>
                );
              })}
            </div>
            <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                रद्द करा
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> जतन करा
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-semibold">
                  <th className="p-4">Record Date</th>
                  {fields.filter(f => f.show_in_list).slice(0, 4).map(f => (
                    <th key={f.id} className="p-4">{f.field_label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">{r.record_date}</td>
                    {fields.filter(f => f.show_in_list).slice(0, 4).map(f => (
                      <td key={f.id} className="p-4 text-slate-600">
                        {r.record_data[f.field_key] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      कोणतीही नोंद उपलब्ध नाही.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
