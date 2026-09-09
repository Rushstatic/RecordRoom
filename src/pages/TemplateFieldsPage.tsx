import React, { useState, useEffect } from 'react';
import { RecordTemplateField, RecordRegisterTemplate, FieldType, PageId } from '../types';
import { templateService } from '../services/templateService';
import { useAuth } from '../hooks/useAuth';
import { storage } from '../lib/storage';
import { DynamicRecordForm } from '../components/DynamicRecordForm';
import { 
  ArrowLeft, Plus, Trash2, Edit3, GripVertical, CheckCircle2, 
  XCircle, Eye, Settings, ChevronUp, ChevronDown, Sparkles, 
  AlertCircle, HelpCircle, Layers, FileSpreadsheet, Lock
} from 'lucide-react';

const FIELD_TYPE_LABELS: Record<FieldType, { label: string; desc: string; category: string }> = {
  text: { label: 'साधा मजकूर (Text)', desc: 'नाव, पत्ता, किंवा एक ओळीचा मजकूर', category: 'मूलभूत' },
  textarea: { label: 'तपशीलवार मजकूर (Textarea)', desc: 'तक्रार, शेरा, मोठे वर्णन', category: 'मूलभूत' },
  number: { label: 'संख्या (Number)', desc: 'वय, वजन, बीपी, प्रयोगशाळा वाचन', category: 'मूलभूत' },
  date: { label: 'तारीख (Date)', desc: 'कॅलेंडर तारीख निवडक', category: 'तारीख व वेळ' },
  datetime: { label: 'तारीख व वेळ (DateTime)', desc: 'तारीख आणि अचूक वेळ', category: 'तारीख व वेळ' },
  mobile: { label: 'मोबाईल नंबर (Mobile)', desc: '१० अंकी वैध मोबाईल क्रमांक', category: 'वैद्यकीय / संपर्क' },
  dropdown: { label: 'ड्रॉपडाउन निवडा (Dropdown)', desc: 'यादीतून एकच पर्याय निवडण्यासाठी', category: 'पर्याय' },
  radio: { label: 'रेडिओ बटन्स (Radio)', desc: 'बटनांमधून एक पर्याय निवडण्यासाठी', category: 'पर्याय' },
  checkbox: { label: 'चेकबॉक्स (Checkbox)', desc: 'एकापेक्षा जास्त पर्याय निवडण्यासाठी', category: 'पर्याय' },
  boolean: { label: 'होय / नाही (Boolean Switch)', desc: 'द्वि-स्थिती (Yes / No)', category: 'पर्याय' },
  auto_number: { label: 'स्वयंचलित अनुक्रमांक (Auto Number)', desc: 'सिस्टीम तयार केलेला अनुक्रमांक', category: 'प्रगत' },
  auto_date: { label: 'स्वयंचलित तारीख (Auto Date)', desc: 'नोंद करतानाची आजची तारीख', category: 'प्रगत' },
  calculated: { label: 'गणना केलेले (Calculated)', desc: 'उदा. वय (DOB वरून) किंवा BMI', category: 'प्रगत' },
  hidden: { label: 'अदृश्य फील्ड (Hidden)', desc: 'स्क्रीनवर न दाखवता अंतर्गत डेटा ठेवण्यासाठी', category: 'प्रगत' },
};

const PRESET_OPTIONS: Record<string, { label: string; options: { value: string; label: string }[] }> = {
  gender: {
    label: 'लिंग (पुरुष, स्त्री, इतर)',
    options: [
      { value: 'पुरुष', label: 'पुरुष (Male)' },
      { value: 'स्त्री', label: 'स्त्री (Female)' },
      { value: 'इतर', label: 'इतर (Other)' },
    ]
  },
  yes_no: {
    label: 'होय / नाही (Yes / No)',
    options: [
      { value: 'होय', label: 'होय (Yes)' },
      { value: 'नाही', label: 'नाही (No)' },
    ]
  },
  test_result: {
    label: 'तपासणी निष्कर्ष (Positive / Negative)',
    options: [
      { value: 'Negative', label: 'निगेटिव्ह (Negative / निरोगी)' },
      { value: 'Positive', label: 'पॉझिटिव्ह (Positive / संशयित)' },
    ]
  },
  blood_group: {
    label: 'रक्तगट (Blood Group A, B, O, AB)',
    options: [
      { value: 'A+', label: 'A+' },
      { value: 'A-', label: 'A-' },
      { value: 'B+', label: 'B+' },
      { value: 'B-', label: 'B-' },
      { value: 'AB+', label: 'AB+' },
      { value: 'AB-', label: 'AB-' },
      { value: 'O+', label: 'O+' },
      { value: 'O-', label: 'O-' },
    ]
  },
  general_status: {
    label: 'स्थिती (सामान्य / असामान्य)',
    options: [
      { value: 'सामान्य', label: 'सामान्य (Normal)' },
      { value: 'असामान्य', label: 'असामान्य (Abnormal)' },
      { value: 'गंभीर', label: 'गंभीर (Critical)' },
    ]
  },
  treatment_status: {
    label: 'उपचार स्थिती (सुरू / संदर्भित / पूर्ण)',
    options: [
      { value: 'सुरू', label: 'सुरू (Ongoing)' },
      { value: 'संदर्भित', label: 'संदर्भित (Referred)' },
      { value: 'पूर्ण', label: 'पूर्ण (Completed)' },
    ]
  }
};

export default function TemplateFieldsPage({ 
  onNavigate, 
  templateId 
}: { 
  onNavigate: (page: PageId) => void;
  templateId: string;
}) {
  const { user, role } = useAuth();
  const isPhcController = role === 'phc_controller' || user?.role === 'phc_controller';

  const [template, setTemplate] = useState<RecordRegisterTemplate | null>(null);
  const [fields, setFields] = useState<RecordTemplateField[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Field Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<Partial<RecordTemplateField>>({});
  
  // Custom option pairs state for Dropdown / Radio / Checkbox
  const [customOptions, setCustomOptions] = useState<{ value: string; label: string }[]>([]);
  
  // Conditional logic state
  const [enableCondition, setEnableCondition] = useState(false);
  const [condDependsOn, setCondDependsOn] = useState('');
  const [condOperator, setCondOperator] = useState('equals');
  const [condValue, setCondValue] = useState('');
  const [condAction, setCondAction] = useState('show');

  // Preview Modal
  const [showPreview, setShowPreview] = useState(false);

  const activeTemplateId = templateId || storage.getItem('selectedTemplateId') || '';

  useEffect(() => {
    if (!isPhcController) {
      onNavigate('dashboard');
      return;
    }
    if (!activeTemplateId) {
      onNavigate('template-builder');
      return;
    }
    loadData();
  }, [activeTemplateId, isPhcController]);

  const loadData = async () => {
    setLoading(true);
    try {
      const templates = await templateService.getTemplates();
      const t = templates.find(x => x.id === activeTemplateId);
      if (!t) {
        setErrorMsg('टेम्पलेट सापडले नाही.');
        setLoading(false);
        return;
      }
      setTemplate(t);

      const f = await templateService.getTemplateFields(activeTemplateId);
      setFields(f);
    } catch (err: any) {
      setErrorMsg('डेटा लोड करताना त्रुटी: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openNewFieldModal = () => {
    const nextOrder = fields.length + 1;
    setEditingField({
      field_type: 'text',
      field_order: nextOrder,
      is_required: false,
      is_searchable: false,
      show_in_list: true,
      show_in_report: true,
      show_in_print: true,
      is_active: true,
    });
    setCustomOptions([
      { value: 'पर्याय १', label: 'पर्याय १' },
      { value: 'पर्याय २', label: 'पर्याय २' },
    ]);
    setEnableCondition(false);
    setCondDependsOn('');
    setCondOperator('equals');
    setCondValue('');
    setCondAction('show');
    setShowModal(true);
  };

  const openEditModal = (f: RecordTemplateField) => {
    setEditingField(f);

    // Options
    let parsedOpts: { value: string; label: string }[] = [];
    if (f.options_json) {
      if (Array.isArray(f.options_json)) {
        parsedOpts = f.options_json;
      } else if (typeof f.options_json === 'string') {
        try { parsedOpts = JSON.parse(f.options_json); } catch (e) {}
      }
    }
    if (parsedOpts.length === 0) {
      parsedOpts = [{ value: '', label: '' }];
    }
    setCustomOptions(parsedOpts);

    // Conditional
    if (f.conditional_json && (f.conditional_json.depends_on || f.conditional_json.field)) {
      setEnableCondition(true);
      setCondDependsOn(f.conditional_json.depends_on || f.conditional_json.field || '');
      setCondOperator(f.conditional_json.operator || 'equals');
      setCondValue(f.conditional_json.value || '');
      setCondAction(f.conditional_json.action || 'show');
    } else {
      setEnableCondition(false);
      setCondDependsOn('');
      setCondOperator('equals');
      setCondValue('');
      setCondAction('show');
    }

    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField.field_label || !editingField.field_key) {
      setErrorMsg('कृपया फील्ड लेबल आणि फील्ड की प्रविष्ट करा.');
      return;
    }

    const cleanKey = editingField.field_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Check key uniqueness
    const keyExists = fields.some(
      f => f.id !== editingField.id && f.field_key.toLowerCase() === cleanKey
    );
    if (keyExists) {
      setErrorMsg(`फील्ड की '${cleanKey}' या टेम्पलेटमध्ये आधीच अस्तित्वात आहे. कृपया वेगळी की वापरा.`);
      return;
    }

    // Process options
    let optionsJson: any = null;
    if (['dropdown', 'radio', 'checkbox'].includes(editingField.field_type || '')) {
      const validOptions = customOptions.filter(o => o.value.trim() !== '');
      if (validOptions.length === 0) {
        setErrorMsg('कृपया किमान एक पर्याय जोडा.');
        return;
      }
      optionsJson = validOptions;
    }

    // Process conditional logic
    let conditionalJson: any = null;
    if (enableCondition && condDependsOn) {
      conditionalJson = {
        depends_on: condDependsOn,
        operator: condOperator,
        value: condValue,
        action: condAction,
      };
    }

    try {
      const newFieldId = editingField.id || crypto.randomUUID();
      const savedField: RecordTemplateField = {
        id: newFieldId,
        template_id: activeTemplateId,
        field_key: cleanKey,
        field_label: editingField.field_label.trim(),
        field_type: editingField.field_type || 'text',
        field_order: editingField.field_order || fields.length + 1,
        is_required: editingField.is_required ?? false,
        is_searchable: editingField.is_searchable ?? false,
        show_in_list: editingField.show_in_list ?? true,
        show_in_report: editingField.show_in_report ?? true,
        show_in_print: editingField.show_in_print ?? true,
        default_value: editingField.default_value || null,
        placeholder: editingField.placeholder || null,
        help_text: editingField.help_text || null,
        options_json: optionsJson,
        validation_json: editingField.validation_json || null,
        automation_json: editingField.automation_json || null,
        conditional_json: conditionalJson,
        is_active: editingField.is_active ?? true,
      };

      await templateService.saveTemplateField(savedField);
      setShowModal(false);
      setSuccessMsg('फील्ड यशस्वीरित्या जतन केले गेले.');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (err: any) {
      setErrorMsg('फील्ड जतन करता आले नाही: ' + err.message);
    }
  };

  const handleDelete = async (fieldId: string) => {
    if (!window.confirm('तुम्हाला हे फील्ड नक्की डिलीट करायचे आहे का?')) return;
    try {
      await templateService.deleteTemplateField(fieldId);
      setSuccessMsg('फील्ड हटवले गेले.');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (err: any) {
      setErrorMsg('फील्ड हटवता आले नाही: ' + err.message);
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;

    const orderedIds = newFields.map(f => f.id);
    await templateService.reorderFields(activeTemplateId, orderedIds);
    loadData();
  };

  const applyPreset = (presetKey: string) => {
    const p = PRESET_OPTIONS[presetKey];
    if (p) {
      setCustomOptions([...p.options]);
    }
  };

  const addOptionRow = () => {
    setCustomOptions([...customOptions, { value: '', label: '' }]);
  };

  const updateOptionRow = (index: number, key: 'value' | 'label', text: string) => {
    const updated = [...customOptions];
    updated[index][key] = text;
    if (key === 'label' && !updated[index].value) {
      updated[index].value = text;
    }
    setCustomOptions(updated);
  };

  const removeOptionRow = (index: number) => {
    setCustomOptions(customOptions.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-600">फील्ड्स लोड होत आहेत...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation & Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() => onNavigate('template-builder')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 mb-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> सर्व नोंदवह्यांकडे परत जा
            </button>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                {template?.register_code}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-600">{template?.program_name || 'आरोग्य कार्यक्रम'}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">
              {template?.register_name} - फील्ड्स व्यवस्थापन (Field Builder)
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowPreview(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-slate-600" /> फॉर्म प्रीव्ह्यू पहा
            </button>
            <button
              onClick={() => {
                storage.setItem('selectedTemplateId', activeTemplateId);
                onNavigate('dynamic-register');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-emerald-600" /> नोंदवहीत जा
            </button>
            <button
              onClick={openNewFieldModal}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> नवीन Field जोडा
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-rose-600 hover:text-rose-900 font-bold">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-600 hover:text-emerald-900 font-bold">×</button>
        </div>
      )}

      {/* Fields List */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50/75 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              या नोंदवहीतील सक्रिय फील्ड्स ({fields.length})
            </span>
          </div>
          <span className="text-xs text-slate-500">
            वर-खाली बाण वापरून फॉर्ममधील क्रम बदला
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {fields.map((f, idx) => (
            <div 
              key={f.id} 
              className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                {/* Reordering */}
                <div className="flex flex-col items-center gap-0.5 text-slate-400">
                  <button
                    disabled={idx === 0}
                    onClick={() => handleMoveOrder(idx, 'up')}
                    className="hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                    title="वर हलवा"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-600">{f.field_order}</span>
                  <button
                    disabled={idx === fields.length - 1}
                    onClick={() => handleMoveOrder(idx, 'down')}
                    className="hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                    title="खाली हलवा"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Field Details */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{f.field_label}</span>
                    {f.is_required && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-50 text-rose-700 rounded border border-rose-200">
                        आवश्यक *
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                      {f.field_type}
                    </span>
                    {f.conditional_json?.depends_on && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-50 text-amber-800 rounded border border-amber-200">
                        अट लागू (Conditional)
                      </span>
                    )}
                    {f.automation_json?.action && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold bg-purple-50 text-purple-700 rounded border border-purple-200">
                        {f.automation_json.action}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-700 font-semibold">
                      {f.field_key}
                    </span>
                    {f.placeholder && <span>Placeholder: "{f.placeholder}"</span>}
                    {f.show_in_list && <span className="text-emerald-700 font-medium">✓ यादीत</span>}
                    {f.show_in_report && <span className="text-teal-700 font-medium">✓ अहवालात</span>}
                    {f.show_in_print && <span className="text-indigo-700 font-medium">✓ प्रिंटमध्ये</span>}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEditModal(f)}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                  title="संपादित करा"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(f.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="डिलीट करा"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {fields.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              <p className="font-bold text-slate-800">या नोंदवहीत अद्याप कोणतेही फील्ड नाही.</p>
              <p className="text-xs text-slate-400 mt-1">
                फॉर्म तयार करण्यासाठी वर दिलेल्या 'नवीन Field जोडा' बटनावर क्लिक करा.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Field Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingField.id ? 'Field संपादित करा' : 'नवीन Field तयार करा (Add Register Field)'}
                </h3>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* Field Label & Key */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Field Label (मराठी नाव) *
                  </label>
                  <input
                    required
                    type="text"
                    value={editingField.field_label || ''}
                    onChange={e => setEditingField({...editingField, field_label: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-sm font-medium"
                    placeholder="उदा. रुग्णाचे पूर्ण नाव"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Field Key (Database Key) *
                  </label>
                  <input
                    required
                    type="text"
                    value={editingField.field_key || ''}
                    onChange={e => setEditingField({...editingField, field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')})}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-sm font-mono"
                    placeholder="उदा. patient_name"
                  />
                  <p className="text-[10px] text-slate-400">फक्त लहान इंग्रजी अक्षरे आणि अंडरस्कोर</p>
                </div>
              </div>

              {/* Field Type & Display Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Field Type (डेटा प्रकार) *
                  </label>
                  <select
                    required
                    value={editingField.field_type || 'text'}
                    onChange={e => setEditingField({...editingField, field_type: e.target.value as FieldType})}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-sm font-medium bg-white"
                  >
                    {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label} - {v.desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Placeholder / मजकूर सूचना
                  </label>
                  <input
                    type="text"
                    value={editingField.placeholder || ''}
                    onChange={e => setEditingField({...editingField, placeholder: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-sm"
                    placeholder="उदा. नाव, आडनाव लिहा"
                  />
                </div>
              </div>

              {/* Options Builder for Dropdown, Radio, Checkbox */}
              {['dropdown', 'radio', 'checkbox'].includes(editingField.field_type || '') && (
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                        पर्याय व्यवस्थापन (Options Builder)
                      </h4>
                      <p className="text-[11px] text-indigo-700">या पर्यायांपैकी कर्मचारी निवड करू शकतील</p>
                    </div>

                    {/* Quick presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-semibold">रेडीमेड सेट्स:</span>
                      {Object.entries(PRESET_OPTIONS).map(([pk, pv]) => (
                        <button
                          key={pk}
                          type="button"
                          onClick={() => applyPreset(pk)}
                          className="px-2 py-0.5 rounded bg-white border border-indigo-200 text-[10px] font-bold text-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          {pv.label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {customOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt.label}
                          onChange={e => updateOptionRow(i, 'label', e.target.value)}
                          placeholder={`पर्याय ${i + 1} लेबल (उदा. पुरुष)`}
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={opt.value}
                          onChange={e => updateOptionRow(i, 'value', e.target.value)}
                          placeholder="Value (DB Value)"
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeOptionRow(i)}
                          className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addOptionRow}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> आणखी पर्याय जोडा
                  </button>
                </div>
              )}

              {/* Conditional Visibility Logic */}
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableCondition}
                      onChange={e => setEnableCondition(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-600 border-slate-300"
                    />
                    <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                      या फील्डवर अट (Conditional Logic) लागू करा
                    </span>
                  </label>
                  <span className="text-[11px] text-amber-800">
                    उदा. 'गर्भवती?' होय असेल तरच EDD दाखवा
                  </span>
                </div>

                {enableCondition && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">अवलंबून असलेले फील्ड</label>
                      <select
                        value={condDependsOn}
                        onChange={e => setCondDependsOn(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        <option value="">फील्ड निवडा...</option>
                        {fields
                          .filter(f => f.id !== editingField.id)
                          .map(f => (
                            <option key={f.field_key} value={f.field_key}>
                              {f.field_label} ({f.field_key})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">ऑपरेटर</label>
                      <select
                        value={condOperator}
                        onChange={e => setCondOperator(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        <option value="equals">समान असेल तर (equals)</option>
                        <option value="not_equals">समान नसेल तर (not equals)</option>
                        <option value="is_not_empty">रिकामे नसेल तर (has value)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">तपासणी मूल्य (Value)</label>
                      <input
                        type="text"
                        value={condValue}
                        onChange={e => setCondValue(e.target.value)}
                        placeholder="उदा. होय किंवा Positive"
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">कृती (Action)</label>
                      <select
                        value={condAction}
                        onChange={e => setCondAction(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        <option value="show">दाखवा (Show)</option>
                        <option value="hide">लपवा (Hide)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Automation Rules */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  ऑटोमेशन नियम (Automation Rule)
                </label>
                <select
                  value={editingField.automation_json?.action || ''}
                  onChange={e => {
                    const action = e.target.value;
                    if (action) {
                      setEditingField({
                        ...editingField,
                        automation_json: { trigger: 'ON_CREATE', action }
                      });
                    } else {
                      setEditingField({ ...editingField, automation_json: null });
                    }
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-sm bg-white"
                >
                  <option value="">कोणतेही नाही (सामान्य इनपुट)</option>
                  <option value="AUTO_DATE">AUTO_DATE - आजची तारीख आपोआप भरा</option>
                  <option value="AUTO_NUMBER">AUTO_NUMBER - सिस्टीम अनुक्रमांक व्युत्पन्न करा</option>
                  <option value="LOCK_AFTER_PRINT">LOCK_AFTER_PRINT - प्रिंट झाल्यानंतर लॉक करा</option>
                </select>
              </div>

              {/* Display & Validation Flags */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingField.is_required ?? false}
                    onChange={e => setEditingField({...editingField, is_required: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-800">Required *</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingField.is_searchable ?? false}
                    onChange={e => setEditingField({...editingField, is_searchable: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-800">Searchable</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingField.show_in_list ?? true}
                    onChange={e => setEditingField({...editingField, show_in_list: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-800">यादीत दाखवा</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingField.show_in_report ?? true}
                    onChange={e => setEditingField({...editingField, show_in_report: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-800">अहवालात दाखवा</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingField.show_in_print ?? true}
                    onChange={e => setEditingField({...editingField, show_in_print: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-800">प्रिंटमध्ये दाखवा</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  {editingField.id ? 'बदल जतन करा' : 'Field जतन करा'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {showPreview && template && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    LIVE FIELD PREVIEW
                  </span>
                  <h3 className="font-black text-slate-900 text-lg mt-0.5">
                    {template.register_name} (फॉर्म कसा दिसेल ते पहा)
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setShowPreview(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs">
                <DynamicRecordForm
                  fields={fields}
                  onSave={(data) => {
                    alert('प्रीव्ह्यू यशस्वी! डेटा व्हॅलिडेशन पास झाले.\n' + JSON.stringify(data, null, 2));
                  }}
                  onCancel={() => setShowPreview(false)}
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-white flex justify-end shrink-0">
              <button
                onClick={() => setShowPreview(false)}
                className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900"
              >
                प्रीव्ह्यू बंद करा
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
