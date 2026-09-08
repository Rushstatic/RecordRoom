import React, { useState, useEffect } from 'react';
import { RecordRegisterTemplate, RecordTemplateField, FieldType, PageId } from '../types';
import { templateService } from '../services/templateService';
import { ArrowLeft, Plus, Settings2, Trash2, Save, GripVertical } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function TemplateFieldsPage({ 
  onNavigate, 
  templateId 
}: { 
  onNavigate: (page: PageId) => void;
  templateId: string;
}) {
  const { user } = useAuth();
  const [template, setTemplate] = useState<RecordRegisterTemplate | null>(null);
  const [fields, setFields] = useState<RecordTemplateField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<Partial<RecordTemplateField>>({});
  
  const isPhcController = user?.role === 'PHC_CONTROLLER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isPhcController) {
      onNavigate('dashboard');
      return;
    }
    loadData();
  }, [templateId, isPhcController, onNavigate]);

  const loadData = async () => {
    if (!templateId) {
      onNavigate('template-builder');
      return;
    }
    setLoading(true);
    const t = await templateService.getTemplateById(templateId);
    if (!t) {
      onNavigate('template-builder');
      return;
    }
    setTemplate(t);
    const f = await templateService.getTemplateFields(templateId);
    setFields(f);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId || !editingField.field_key || !editingField.field_label || !editingField.field_type) return;
    
    let optionsJson = editingField.options_json;
    if (typeof optionsJson === 'string') {
      try { optionsJson = JSON.parse(optionsJson); } catch(e) { optionsJson = []; }
    }
    
    const newField: RecordTemplateField = {
      id: editingField.id || `FLD-${Date.now()}`,
      template_id: templateId,
      field_key: editingField.field_key,
      field_label: editingField.field_label,
      field_type: editingField.field_type as FieldType,
      field_order: editingField.field_order || fields.length + 1,
      is_required: editingField.is_required || false,
      is_searchable: editingField.is_searchable || false,
      show_in_list: editingField.show_in_list ?? true,
      show_in_report: editingField.show_in_report ?? true,
      show_in_print: editingField.show_in_print ?? true,
      default_value: editingField.default_value || null,
      placeholder: editingField.placeholder || null,
      help_text: editingField.help_text || null,
      options_json: optionsJson || null,
      validation_json: editingField.validation_json || null,
      automation_json: editingField.automation_json || null,
      conditional_json: editingField.conditional_json || null,
      is_active: editingField.is_active ?? true,
    };
    
    await templateService.saveTemplateField(newField);
    setShowModal(false);
    loadData();
  };

  const handleDelete = async (fieldId: string) => {
    if (confirm('नक्की डिलीट करायचे का?')) {
      await templateService.deleteTemplateField(fieldId);
      loadData();
    }
  };

  const openNewModal = () => {
    setEditingField({ 
      field_type: 'text',
      is_active: true, 
      show_in_list: true,
      show_in_report: true,
      show_in_print: true,
      field_order: fields.length + 1 
    });
    setShowModal(true);
  };

  const openEditModal = (f: RecordTemplateField) => {
    setEditingField({
      ...f,
      options_json: f.options_json ? JSON.stringify(f.options_json, null, 2) : ''
    });
    setShowModal(true);
  };

  if (loading || !template) return <div className="p-8 text-center">लोड होत आहे...</div>;

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('template-builder')} className="p-2 bg-white rounded-full shadow-sm text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Settings2 className="w-7 h-7 text-indigo-600" />
              {template.register_name}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Fields व्यवस्थापन</p>
          </div>
        </div>
        <button
          onClick={openNewModal}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> नवीन Field
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-2">
        <div className="space-y-2">
          {fields.map(f => (
            <div key={f.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-4">
                <GripVertical className="w-5 h-5 text-slate-400 cursor-grab" />
                <div>
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    {f.field_label}
                    {f.is_required && <span className="text-rose-500">*</span>}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase">
                      {f.field_type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1">{f.field_key}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(f)}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(f.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {fields.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              कोणतेही field उपलब्ध नाही. 'नवीन Field' वर क्लिक करा.
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingField.id ? 'Field संपादित करा' : 'नवीन Field तयार करा'}
              </h3>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Field Label (मराठी) *</label>
                  <input
                    required
                    type="text"
                    value={editingField.field_label || ''}
                    onChange={e => setEditingField({...editingField, field_label: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Field Key (English/DB) *</label>
                  <input
                    required
                    type="text"
                    value={editingField.field_key || ''}
                    onChange={e => setEditingField({...editingField, field_key: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Field Type *</label>
                  <select
                    required
                    value={editingField.field_type || 'text'}
                    onChange={e => setEditingField({...editingField, field_type: e.target.value as FieldType})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm"
                  >
                    <option value="text">Text (Single Line)</option>
                    <option value="textarea">Textarea (Multi Line)</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="mobile">Mobile Number</option>
                    <option value="dropdown">Dropdown Select</option>
                    <option value="radio">Radio Buttons</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="auto_number">Auto Number (Read-only)</option>
                    <option value="auto_date">Auto Date (Read-only)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Display Order</label>
                  <input
                    type="number"
                    value={editingField.field_order || ''}
                    onChange={e => setEditingField({...editingField, field_order: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm"
                  />
                </div>
              </div>

              {(editingField.field_type === 'dropdown' || editingField.field_type === 'radio') && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Options JSON (For Dropdown/Radio)</label>
                  <textarea
                    rows={4}
                    value={typeof editingField.options_json === 'string' ? editingField.options_json : ''}
                    onChange={e => setEditingField({...editingField, options_json: e.target.value})}
                    placeholder='[{"value": "male", "label": "पुरुष"}]'
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm font-mono"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Automation Rule (JSON)</label>
                <textarea
                  rows={2}
                  value={editingField.automation_json ? JSON.stringify(editingField.automation_json) : ''}
                  onChange={e => {
                     try { setEditingField({...editingField, automation_json: JSON.parse(e.target.value)}) } catch(err) {}
                  }}
                  placeholder='{"trigger": "ON_CREATE", "action": "AUTO_DATE"}'
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingField.is_required} onChange={e => setEditingField({...editingField, is_required: e.target.checked})} className="rounded text-indigo-600" />
                  <span className="text-sm text-slate-700 font-medium">Required</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingField.is_searchable} onChange={e => setEditingField({...editingField, is_searchable: e.target.checked})} className="rounded text-indigo-600" />
                  <span className="text-sm text-slate-700 font-medium">Searchable</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingField.show_in_list} onChange={e => setEditingField({...editingField, show_in_list: e.target.checked})} className="rounded text-indigo-600" />
                  <span className="text-sm text-slate-700 font-medium">Show in List</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingField.show_in_report} onChange={e => setEditingField({...editingField, show_in_report: e.target.checked})} className="rounded text-indigo-600" />
                  <span className="text-sm text-slate-700 font-medium">Show in Report</span>
                </label>
              </div>

              <div className="pt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  जतन करा
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
