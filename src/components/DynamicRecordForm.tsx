import React, { useState, useEffect } from 'react';
import { RecordTemplateField, Subcentre, Village } from '../types';
import { masterDataService } from '../services/masterDataService';
import { useAuth } from '../hooks/useAuth';
import { Save, AlertTriangle, FileSpreadsheet, Building2, Home, MapPin, Calendar } from 'lucide-react';

interface Props {
  fields: RecordTemplateField[];
  initialData?: any;
  initialSubcentreId?: string;
  initialVillageId?: string;
  initialRecordDate?: string;
  onSave: (recordData: any, subcentreId?: string, villageId?: string, recordDate?: string) => void;
  onCancel: () => void;
  error?: string | null;
  success?: string | null;
  readOnly?: boolean;
}

export function DynamicRecordForm({ 
  fields, 
  initialData, 
  initialSubcentreId,
  initialVillageId,
  initialRecordDate,
  onSave, 
  onCancel, 
  error, 
  success,
  readOnly = false,
}: Props) {
  const { user } = useAuth();

  const [formData, setFormData] = useState<any>(initialData || {});
  const [subcentres, setSubcentres] = useState<Subcentre[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [selectedSubcentreId, setSelectedSubcentreId] = useState<string>(
    initialSubcentreId || user?.subcentre_id || ''
  );
  const [selectedVillageId, setSelectedVillageId] = useState<string>(initialVillageId || '');
  const [recordDate, setRecordDate] = useState<string>(
    initialRecordDate || new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      const [sc, v] = await Promise.all([
        masterDataService.getSubcentres(),
        masterDataService.getVillages(),
      ]);
      setSubcentres(sc);
      setVillages(v);
      if (!selectedSubcentreId && sc.length > 0) {
        setSelectedSubcentreId(sc[0].id);
      }
    } catch (err) {
      console.error('Master data load error in DynamicRecordForm:', err);
    }
  };

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newFormData: any = { ...(initialData || {}) };

    // Set defaults and auto-dates
    fields.forEach(f => {
      if (newFormData[f.field_key] === undefined || newFormData[f.field_key] === null) {
        if (f.field_type === 'auto_date' || f.automation_json?.action === 'AUTO_DATE') {
          newFormData[f.field_key] = todayStr;
        } else if (f.field_type === 'boolean') {
          newFormData[f.field_key] = f.default_value === 'true' || f.default_value === 'होय';
        } else if (f.default_value) {
          newFormData[f.field_key] = f.default_value;
        }
      }
    });

    setFormData(newFormData);
    if (initialSubcentreId) setSelectedSubcentreId(initialSubcentreId);
    if (initialVillageId) setSelectedVillageId(initialVillageId);
    if (initialRecordDate) setRecordDate(initialRecordDate);
  }, [initialData, fields]);

  // Filter villages by selected subcentre
  const filteredVillages = villages.filter(v => 
    !selectedSubcentreId || v.subcentre_id === selectedSubcentreId
  );

  const activeFields = [...fields].sort((a, b) => a.field_order - b.field_order).filter(f => f.is_active);

  // Evaluate conditional logic
  const isFieldVisible = (f: RecordTemplateField): boolean => {
    if (!f.conditional_json) return true;
    const cond = f.conditional_json;
    const depKey = cond.depends_on || cond.field;
    if (!depKey) return true;

    const actualVal = formData[depKey];
    const targetVal = cond.value;
    const op = cond.operator || 'equals';
    const action = cond.action || 'show';

    let match = false;
    if (op === 'equals') {
      match = String(actualVal ?? '').trim().toLowerCase() === String(targetVal ?? '').trim().toLowerCase();
    } else if (op === 'not_equals') {
      match = String(actualVal ?? '').trim().toLowerCase() !== String(targetVal ?? '').trim().toLowerCase();
    } else if (op === 'is_not_empty') {
      match = actualVal !== undefined && actualVal !== null && String(actualVal).trim() !== '';
    }

    if (action === 'hide') {
      return !match;
    }
    return match;
  };

  const handleCheckboxMultiToggle = (fieldKey: string, optValue: string) => {
    const currentList: string[] = Array.isArray(formData[fieldKey]) ? formData[fieldKey] : [];
    const exists = currentList.includes(optValue);
    const updated = exists 
      ? currentList.filter(x => x !== optValue) 
      : [...currentList, optValue];
    setFormData({ ...formData, [fieldKey]: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, selectedSubcentreId, selectedVillageId, recordDate);
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden">
      {error && (
        <div className="p-3.5 m-4 sm:m-6 bg-rose-50 text-rose-800 text-sm font-semibold rounded-xl flex items-center gap-2.5 border border-rose-200">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 m-4 sm:m-6 bg-emerald-50 text-emerald-800 text-sm font-semibold rounded-xl flex items-center gap-2.5 border border-emerald-200">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
        {/* Section 1: Official Master Header (Subcentre, Village, Date) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>कार्यक्षेत्र व दिनांक (Subcentre, Village & Date)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                उपकेंद्र (Subcentre) *
              </label>
              <select
                disabled={readOnly}
                value={selectedSubcentreId}
                onChange={(e) => {
                  setSelectedSubcentreId(e.target.value);
                  setSelectedVillageId('');
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">उपकेंद्र निवडा...</option>
                {subcentres.map(sc => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                गाव (Village)
              </label>
              <select
                disabled={readOnly}
                value={selectedVillageId}
                onChange={(e) => setSelectedVillageId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">सर्व / लागू नाही</option>
                {filteredVillages.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                नोंद तारीख (Record Date) *
              </label>
              <input
                disabled={readOnly}
                required
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Dynamic Template Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {activeFields.map(f => {
            if (!isFieldVisible(f)) return null;

            const isAuto = f.field_type === 'auto_date' || f.field_type === 'auto_number' || f.automation_json?.action === 'AUTO_DATE';
            const isCalculated = f.field_type === 'calculated';
            const isHidden = f.field_type === 'hidden';

            if (isHidden) {
              return (
                <input
                  key={f.id}
                  type="hidden"
                  name={f.field_key}
                  value={formData[f.field_key] || ''}
                />
              );
            }

            // Parse options
            let options: { value: string; label: string }[] = [];
            if (f.options_json) {
              if (Array.isArray(f.options_json)) {
                options = f.options_json;
              } else if (typeof f.options_json === 'string') {
                try { options = JSON.parse(f.options_json); } catch (e) {}
              }
            }

            return (
              <div 
                key={f.id} 
                className={`space-y-1.5 ${f.field_type === 'textarea' ? 'sm:col-span-2 lg:col-span-3' : ''}`}
              >
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>
                    {f.field_label} {f.is_required && !isAuto && <span className="text-rose-500">*</span>}
                  </span>
                  {f.automation_json?.action && (
                    <span className="text-[10px] text-purple-600 font-mono">({f.automation_json.action})</span>
                  )}
                </label>

                {/* TEXTAREA */}
                {f.field_type === 'textarea' ? (
                  <textarea
                    disabled={readOnly}
                    required={f.is_required && !isAuto}
                    rows={3}
                    value={formData[f.field_key] || ''}
                    onChange={e => setFormData({...formData, [f.field_key]: e.target.value})}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-xs font-medium"
                    placeholder={f.placeholder || 'तपशील लिहा...'}
                  />
                ) : f.field_type === 'dropdown' ? (
                  <select
                    disabled={readOnly}
                    required={f.is_required && !isAuto}
                    value={formData[f.field_key] || ''}
                    onChange={e => setFormData({...formData, [f.field_key]: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-xs font-medium bg-white"
                  >
                    <option value="">निवडा...</option>
                    {options.map((opt, idx) => (
                      <option key={idx} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : f.field_type === 'radio' ? (
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {options.map((opt, idx) => {
                      const isSelected = formData[f.field_key] === opt.value;
                      return (
                        <label 
                          key={idx} 
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold' 
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            disabled={readOnly}
                            type="radio"
                            name={f.field_key}
                            value={opt.value}
                            checked={isSelected}
                            onChange={e => setFormData({...formData, [f.field_key]: e.target.value})}
                            className="text-indigo-600 focus:ring-indigo-600"
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : f.field_type === 'checkbox' ? (
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {options.map((opt, idx) => {
                      const currentArr = Array.isArray(formData[f.field_key]) ? formData[f.field_key] : [];
                      const isChecked = currentArr.includes(opt.value);
                      return (
                        <label 
                          key={idx} 
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                            isChecked 
                              ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold' 
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            disabled={readOnly}
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxMultiToggle(f.field_key, opt.value)}
                            className="text-indigo-600 rounded focus:ring-indigo-600"
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : f.field_type === 'boolean' ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      disabled={readOnly}
                      type="button"
                      onClick={() => setFormData({ ...formData, [f.field_key]: true })}
                      className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${
                        formData[f.field_key] === true 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      होय (Yes)
                    </button>
                    <button
                      disabled={readOnly}
                      type="button"
                      onClick={() => setFormData({ ...formData, [f.field_key]: false })}
                      className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${
                        formData[f.field_key] === false 
                          ? 'bg-slate-700 text-white border-slate-700 shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      नाही (No)
                    </button>
                  </div>
                ) : isAuto || isCalculated ? (
                  <input
                    type="text"
                    disabled
                    value={formData[f.field_key] || '(स्वयंचलित)'}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-600 text-xs font-mono font-bold"
                  />
                ) : f.field_type === 'mobile' ? (
                  <input
                    disabled={readOnly}
                    required={f.is_required}
                    type="tel"
                    maxLength={10}
                    value={formData[f.field_key] || ''}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormData({...formData, [f.field_key]: val});
                    }}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-xs font-mono font-medium"
                    placeholder={f.placeholder || '९८XXXXXXXX (१० अंक)'}
                  />
                ) : (
                  <input
                    disabled={readOnly}
                    required={f.is_required}
                    type={
                      f.field_type === 'number' 
                        ? 'number' 
                        : f.field_type === 'date' 
                        ? 'date' 
                        : f.field_type === 'datetime' 
                        ? 'datetime-local' 
                        : 'text'
                    }
                    value={formData[f.field_key] ?? ''}
                    onChange={e => setFormData({...formData, [f.field_key]: e.target.value})}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-xs font-medium"
                    placeholder={f.placeholder || ''}
                    min={f.validation_json?.min}
                    max={f.validation_json?.max}
                    step={f.field_type === 'number' ? 'any' : undefined}
                  />
                )}

                {f.help_text && <p className="text-[11px] text-slate-400">{f.help_text}</p>}
              </div>
            );
          })}
        </div>

        {/* Footer Action Buttons */}
        {!readOnly && (
          <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors w-full sm:w-auto cursor-pointer"
            >
              रद्द करा / बंद करा
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" /> नोंद जतन करा (Save Record)
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
