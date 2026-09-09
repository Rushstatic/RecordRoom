import React, { useState, useEffect } from 'react';
import { RecordRegisterTemplate, RecordTemplateField, PageId } from '../types';
import { templateService } from '../services/templateService';
import { useAuth } from '../hooks/useAuth';
import { storage } from '../lib/storage';
import { DynamicRecordForm } from '../components/DynamicRecordForm';
import { 
  Settings, Plus, FileText, CheckCircle2, XCircle, 
  ArrowRight, HeartPulse, Activity, Baby, Users, 
  Stethoscope, Syringe, Pill, Shield, ClipboardList, 
  Droplet, Eye, Trash2, Edit3, Sparkles, AlertCircle, 
  ChevronUp, ChevronDown, ListChecks, FileSpreadsheet
} from 'lucide-react';

const ICON_OPTIONS = [
  { name: 'FileText', label: 'फाईल / मजकूर', icon: FileText },
  { name: 'HeartPulse', label: 'हृदय / एन.सी.डी.', icon: HeartPulse },
  { name: 'Activity', label: 'आरोग्य कार्य', icon: Activity },
  { name: 'Baby', label: 'माता व बालक (ANC/PNC)', icon: Baby },
  { name: 'Users', label: 'कुटुंब नियोजन', icon: Users },
  { name: 'Syringe', label: 'लसीकरण (Immunization)', icon: Syringe },
  { name: 'Stethoscope', label: 'तपासणी / ओपीडी', icon: Stethoscope },
  { name: 'Pill', label: 'औषधोपचार', icon: Pill },
  { name: 'Droplet', label: 'रक्त / नमुना', icon: Droplet },
  { name: 'Shield', label: 'संरक्षण / कार्यक्रम', icon: Shield },
  { name: 'ClipboardList', label: 'नोंदवही यादी', icon: ClipboardList },
];

function getTemplateIcon(iconName: string | null | undefined) {
  const found = ICON_OPTIONS.find(i => i.name === iconName);
  const IconComp = found ? found.icon : FileText;
  return <IconComp className="w-5 h-5 text-indigo-600" />;
}

export default function TemplateBuilderPage({ 
  onNavigate, 
  onSelectTemplate 
}: { 
  onNavigate: (page: PageId) => void;
  onSelectTemplate: (id: string) => void;
}) {
  const { user, role } = useAuth();
  const isPhcController = role === 'phc_controller' || user?.role === 'phc_controller';

  const [templates, setTemplates] = useState<RecordRegisterTemplate[]>([]);
  const [templateStats, setTemplateStats] = useState<Record<string, { total: number; today: number; fieldsCount: number }>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<RecordRegisterTemplate>>({});
  
  // Preview Modal
  const [previewTemplate, setPreviewTemplate] = useState<RecordRegisterTemplate | null>(null);
  const [previewFields, setPreviewFields] = useState<RecordTemplateField[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (!isPhcController) {
      onNavigate('dashboard');
      return;
    }
    loadTemplates();
  }, [isPhcController]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await templateService.getTemplates();
      setTemplates(data);

      // Load field & record counts
      const statsMap: Record<string, { total: number; today: number; fieldsCount: number }> = {};
      await Promise.all(
        data.map(async (t) => {
          const [f, stats] = await Promise.all([
            templateService.getTemplateFields(t.id),
            templateService.getRecordStats(t.id)
          ]);
          statsMap[t.id] = {
            total: stats.total,
            today: stats.today,
            fieldsCount: f.length
          };
        })
      );
      setTemplateStats(statsMap);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('नोंदवह्या लोड करताना त्रुटी आली. कृपया तपासा.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate.register_name || !editingTemplate.register_code) {
      setErrorMsg('कृपया रजिस्टर नाव आणि रजिस्टर कोड भरा.');
      return;
    }

    const cleanCode = editingTemplate.register_code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    // Check code uniqueness
    const codeExists = templates.some(
      t => t.id !== editingTemplate.id && t.register_code.toUpperCase() === cleanCode
    );
    if (codeExists) {
      setErrorMsg(`रजिस्टर कोड '${cleanCode}' आधीच वापरलेला आहे. कृपया वेगळा कोड द्या.`);
      return;
    }

    try {
      const templateId = editingTemplate.id || crypto.randomUUID();
      const newTemplate: RecordRegisterTemplate = {
        id: templateId,
        register_code: cleanCode,
        register_name: editingTemplate.register_name.trim(),
        program_name: editingTemplate.program_name?.trim() || null,
        description: editingTemplate.description?.trim() || null,
        icon: editingTemplate.icon || 'FileText',
        is_active: editingTemplate.is_active ?? true,
        display_order: editingTemplate.display_order || templates.length + 1,
        created_by: user?.id,
      };
      
      await templateService.saveTemplate(newTemplate);
      setShowModal(false);
      setSuccessMsg('नोंदवही यशस्वीरित्या जतन केली गेली.');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadTemplates();
    } catch (err: any) {
      setErrorMsg(err.message || 'नोंदवही जतन करता आली नाही. Supabase डेटाबेस तपासा.');
    }
  };

  const openNewModal = () => {
    setEditingTemplate({ 
      is_active: true, 
      display_order: templates.length + 1, 
      icon: 'FileText' 
    });
    setErrorMsg(null);
    setShowModal(true);
  };

  const openEditModal = (t: RecordRegisterTemplate) => {
    setEditingTemplate(t);
    setErrorMsg(null);
    setShowModal(true);
  };

  const toggleStatus = async (t: RecordRegisterTemplate) => {
    try {
      await templateService.saveTemplate({ ...t, is_active: !t.is_active });
      loadTemplates();
    } catch (err: any) {
      setErrorMsg('स्थिती बदलता आली नाही: ' + err.message);
    }
  };

  const handleDelete = async (t: RecordRegisterTemplate) => {
    const stats = templateStats[t.id];
    const hasRecords = stats && stats.total > 0;
    const confirmPrompt = hasRecords
      ? `या '${t.register_name}' नोंदवहीत ${stats.total} नोंदी आहेत.\nसुरक्षिततेसाठी ही नोंदवही डिलीट न होता निष्क्रीय (Archived/Inactive) केली जाईल. पुढे जायचे का?`
      : `तुम्हाला '${t.register_name}' ही नोंदवही नक्की डिलीट करायची आहे का?`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      const res = await templateService.deleteTemplate(t.id);
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(null), 4000);
      loadTemplates();
    } catch (err: any) {
      setErrorMsg('नोंदवही हटवता आली नाही: ' + err.message);
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === templates.length - 1) return;

    const newTemplates = [...templates];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newTemplates[index];
    newTemplates[index] = newTemplates[targetIndex];
    newTemplates[targetIndex] = temp;

    const orderedIds = newTemplates.map(t => t.id);
    await templateService.reorderTemplates(orderedIds);
    loadTemplates();
  };

  const handleOpenPreview = async (t: RecordRegisterTemplate) => {
    setPreviewTemplate(t);
    setLoadingPreview(true);
    try {
      const f = await templateService.getTemplateFields(t.id);
      setPreviewFields(f);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Quick Starter Preset Generator
  const createStarterRegister = async (type: 'NCD' | 'ANC' | 'IMMUNIZATION' | 'FAMILY_PLANNING') => {
    const starterConfigs = {
      NCD: {
        code: 'NCD_REGISTER',
        name: 'असंक्रामक रोग नोंदवही (NCD Patient Register)',
        program: 'राष्ट्रीय असंक्रामक रोग नियंत्रण कार्यक्रम (NP-NCD)',
        desc: 'उच्चरक्तदाब व मधुमेह संशयित/उपचारित रुग्ण नियमित नोंदवही',
        icon: 'HeartPulse',
        fields: [
          { key: 'patient_name', label: 'रुग्णाचे नाव', type: 'text', req: true, search: true, list: true },
          { key: 'age', label: 'वय (वर्षे)', type: 'number', req: true, search: false, list: true },
          { key: 'gender', label: 'लिंग', type: 'dropdown', req: true, search: false, list: true, options: [{ value: 'पुरुष', label: 'पुरुष' }, { value: 'स्त्री', label: 'स्त्री' }, { value: 'इतर', label: 'इतर' }] },
          { key: 'mobile_number', label: 'मोबाईल नंबर', type: 'mobile', req: false, search: true, list: true },
          { key: 'bp_systolic', label: 'रक्तदाब Systolic (mmHg)', type: 'number', req: false, search: false, list: true },
          { key: 'bp_diastolic', label: 'रक्तदाब Diastolic (mmHg)', type: 'number', req: false, search: false, list: true },
          { key: 'blood_sugar_rbs', label: 'रँडम ब्लड शुगर RBS (mg/dL)', type: 'number', req: false, search: false, list: true },
          { key: 'diagnosis', label: 'निदान', type: 'dropdown', req: false, search: false, list: true, options: [{ value: 'सामान्य', label: 'सामान्य (Normal)' }, { value: 'संशयित उच्चरक्तदाब', label: 'संशयित उच्चरक्तदाब (HTN)' }, { value: 'संशयित मधुमेह', label: 'संशयित मधुमेह (DM)' }, { value: 'दोन्ही (HTN + DM)', label: 'दोन्ही (HTN + DM)' }] },
          { key: 'treatment_status', label: 'उपचार स्थिती', type: 'dropdown', req: false, search: false, list: true, options: [{ value: 'सुरू', label: 'सुरू (On Treatment)' }, { value: 'नवीन शोध', label: 'नवीन शोध (Newly Detected)' }, { value: 'संदर्भित', label: 'संदर्भित (Referred to MO/RH)' }] },
          { key: 'checkup_date', label: 'तपासणी तारीख', type: 'date', req: true, search: false, list: true, auto: { action: 'AUTO_DATE' } },
          { key: 'remarks', label: 'शेरा व औषधे', type: 'textarea', req: false, search: false, list: false }
        ]
      },
      ANC: {
        code: 'ANC_REGISTER',
        name: 'प्रसूतीपूर्व तपासणी नोंदवही (ANC Register)',
        program: 'मातृ व बाल संगोपन कार्यक्रम (RCH)',
        desc: 'गरोदर माता नोंदणी, तपासणी व जोखीम व्यवस्थापन',
        icon: 'Baby',
        fields: [
          { key: 'mother_name', label: 'गरोदर मातेचे नाव', type: 'text', req: true, search: true, list: true },
          { key: 'husband_name', label: 'पतीचे नाव', type: 'text', req: true, search: true, list: true },
          { key: 'age', label: 'वय', type: 'number', req: true, search: false, list: true },
          { key: 'mobile_number', label: 'मोबाईल नंबर', type: 'mobile', req: false, search: true, list: true },
          { key: 'gravida', label: 'गरोदरपण (Gravida G)', type: 'number', req: false, search: false, list: true },
          { key: 'lmp_date', label: 'मासिक पाळीची शेवटची तारीख (LMP)', type: 'date', req: true, search: false, list: true },
          { key: 'edd_date', label: 'अपेक्षित प्रसूती तारीख (EDD)', type: 'date', req: false, search: false, list: true },
          { key: 'weight_kg', label: 'वजन (kg)', type: 'number', req: false, search: false, list: true },
          { key: 'hemoglobin', label: 'हिमोग्लोबिन (Hb gm%)', type: 'number', req: false, search: false, list: true },
          { key: 'is_high_risk', label: 'उच्च जोखीम (HRP)?', type: 'dropdown', req: true, search: false, list: true, options: [{ value: 'सामान्य', label: 'सामान्य (Normal)' }, { value: 'उच्च जोखीम', label: 'उच्च जोखीम (High Risk)' }] },
          { key: 'checkup_date', label: 'तपासणी दिनांक', type: 'date', req: true, search: false, list: true, auto: { action: 'AUTO_DATE' } }
        ]
      },
      IMMUNIZATION: {
        code: 'IMMUNIZATION_REGISTER',
        name: 'बालक लसीकरण नोंदवही (Immunization Register)',
        program: 'सार्वत्रिक लसीकरण कार्यक्रम (UIP)',
        desc: 'जन्म ते १६ वर्षे बालकांचे नियमित लसीकरण ट्रॅकिंग',
        icon: 'Syringe',
        fields: [
          { key: 'child_name', label: 'बालकाचे नाव', type: 'text', req: true, search: true, list: true },
          { key: 'parent_name', label: 'आई / वडिलांचे नाव', type: 'text', req: true, search: true, list: true },
          { key: 'dob', label: 'जन्मतारीख', type: 'date', req: true, search: false, list: true },
          { key: 'gender', label: 'लिंग', type: 'dropdown', req: true, search: false, list: true, options: [{ value: 'मुलगा', label: 'मुलगा (Male)' }, { value: 'मुलगी', label: 'मुलगी (Female)' }] },
          { key: 'mobile_number', label: 'मोबाईल नंबर', type: 'mobile', req: false, search: true, list: true },
          { key: 'vaccine_name', label: 'लसीचे नाव', type: 'dropdown', req: true, search: false, list: true, options: [
            { value: 'BCG', label: 'BCG' }, { value: 'OPV-0', label: 'OPV-0' }, { value: 'Hep-B', label: 'Hep-B' },
            { value: 'Pentavalent-1', label: 'Pentavalent-1' }, { value: 'Pentavalent-2', label: 'Pentavalent-2' }, { value: 'Pentavalent-3', label: 'Pentavalent-3' },
            { value: 'MR-1', label: 'MR-1 (गोवर-रुबेला)' }, { value: 'DPT Booster', label: 'DPT Booster' }
          ] },
          { key: 'dose_given_date', label: 'लस दिल्याची तारीख', type: 'date', req: true, search: false, list: true, auto: { action: 'AUTO_DATE' } },
          { key: 'next_due_date', label: 'पुढील डोस देय दिनांक', type: 'date', req: false, search: false, list: true }
        ]
      },
      FAMILY_PLANNING: {
        code: 'FP_REGISTER',
        name: 'कुटुंब नियोजन नोंदवही (Family Planning Register)',
        program: 'कुटुंब कल्याण कार्यक्रम',
        desc: 'तात्पुरती व कायमस्वरूपी कुटुंब नियोजन पद्धती वापरकर्ते नोंद',
        icon: 'Users',
        fields: [
          { key: 'client_name', label: 'लाभार्थ्याचे नाव', type: 'text', req: true, search: true, list: true },
          { key: 'spouse_name', label: 'पती / पत्नीचे नाव', type: 'text', req: true, search: true, list: true },
          { key: 'age', label: 'वय', type: 'number', req: true, search: false, list: true },
          { key: 'living_children', label: 'हयात मुले संख्या', type: 'number', req: false, search: false, list: true },
          { key: 'method_chosen', label: 'पद्धत', type: 'dropdown', req: true, search: false, list: true, options: [
            { value: 'अंतरा', label: 'अंतरा इंजेक्शन (Antara)' },
            { value: 'छाया', label: 'छाया गोळ्या (Chhaya)' },
            { value: 'कॉपर-टी', label: 'कॉपर-टी (IUCD)' },
            { value: 'कंडोम', label: 'कंडोम (Condom/Nirodh)' },
            { value: 'स्त्री नसबंदी', label: 'स्त्री नसबंदी (Tubectomy)' },
            { value: 'पुरुष नसबंदी', label: 'पुरुष नसबंदी (NSV)' }
          ] },
          { key: 'service_date', label: 'सेवा तारीख', type: 'date', req: true, search: false, list: true, auto: { action: 'AUTO_DATE' } }
        ]
      }
    };

    const cfg = starterConfigs[type];
    if (!cfg) return;

    // Check if code already exists
    if (templates.some(t => t.register_code.toUpperCase() === cfg.code)) {
      setErrorMsg(`'${cfg.name}' आधीच तयार केलेले आहे.`);
      return;
    }

    try {
      setLoading(true);
      const newId = crypto.randomUUID();
      const newTpl: RecordRegisterTemplate = {
        id: newId,
        register_code: cfg.code,
        register_name: cfg.name,
        program_name: cfg.program,
        description: cfg.desc,
        icon: cfg.icon,
        is_active: true,
        display_order: templates.length + 1,
        created_by: user?.id,
      };

      await templateService.saveTemplate(newTpl);

      // Create fields
      let order = 1;
      for (const f of cfg.fields) {
        await templateService.saveTemplateField({
          id: crypto.randomUUID(),
          template_id: newId,
          field_key: f.key,
          field_label: f.label,
          field_type: f.type as any,
          field_order: order++,
          is_required: f.req,
          is_searchable: f.search,
          show_in_list: f.list,
          show_in_report: true,
          show_in_print: true,
          default_value: null,
          placeholder: null,
          help_text: null,
          options_json: (f as any).options || null,
          validation_json: null,
          automation_json: (f as any).auto || null,
          conditional_json: null,
          is_active: true,
        });
      }

      setSuccessMsg(`'${cfg.name}' आणि त्याचे सर्व स्टँडर्ड फील्ड्स यशस्वीरित्या तयार झाले!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      loadTemplates();
    } catch (err: any) {
      setErrorMsg('टेम्पलेट तयार करताना त्रुटी: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && templates.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-600">डायनॅमिक रेकॉर्ड बिल्डर लोड होत आहे...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
              PHC Controller
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-emerald-700 font-semibold">Production Engine (CODE 18–21)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 mt-1">
            <Settings className="w-7 h-7 text-indigo-600" />
            डायनॅमिक रेकॉर्ड बिल्डर (Dynamic Record Builder)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            नवीन शासकीय व आरोग्य नोंदवह्या, फॉर्म्स, फील्ड्स व अहवाल तयार करा आणि व्यवस्थापित करा.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigate('dynamic-report')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-600" /> सर्व डायनॅमिक अहवाल
          </button>
          <button
            onClick={openNewModal}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" /> नवीन Register तयार करा
          </button>
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

      {/* Quick 1-Click Starter Presets */}
      <div className="bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50 border border-indigo-100 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              १-क्लिक स्टँडर्ड नोंदवह्या तयार करा (Quick Preset Starters)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            क्लिक करताच सर्व प्रमाणित फील्ड्स आपोआप तयार होतात
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => createStarterRegister('NCD')}
            className="bg-white hover:bg-indigo-50/50 p-3 rounded-xl border border-indigo-200/80 hover:border-indigo-400 text-left transition-all group shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <HeartPulse className="w-4 h-4" />
              <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">NCD Register</span>
            </div>
            <p className="text-[11px] text-slate-500">BP, Sugar, निदान व उपचार</p>
          </button>

          <button
            onClick={() => createStarterRegister('ANC')}
            className="bg-white hover:bg-indigo-50/50 p-3 rounded-xl border border-indigo-200/80 hover:border-indigo-400 text-left transition-all group shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-2 text-pink-600 mb-1">
              <Baby className="w-4 h-4" />
              <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">ANC Register</span>
            </div>
            <p className="text-[11px] text-slate-500">LMP, EDD, Hb, वजन, HRP</p>
          </button>

          <button
            onClick={() => createStarterRegister('IMMUNIZATION')}
            className="bg-white hover:bg-indigo-50/50 p-3 rounded-xl border border-indigo-200/80 hover:border-indigo-400 text-left transition-all group shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <Syringe className="w-4 h-4" />
              <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">लसीकरण नोंदवही</span>
            </div>
            <p className="text-[11px] text-slate-500">UIP बालके व लस डोस</p>
          </button>

          <button
            onClick={() => createStarterRegister('FAMILY_PLANNING')}
            className="bg-white hover:bg-indigo-50/50 p-3 rounded-xl border border-indigo-200/80 hover:border-indigo-400 text-left transition-all group shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-2 text-teal-600 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">कुटुंब नियोजन</span>
            </div>
            <p className="text-[11px] text-slate-500">अंतरा, छाया, कॉपर-टी, नसबंदी</p>
          </button>
        </div>
      </div>

      {/* Main Templates Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900 text-base">उपलब्ध नोंदवह्यांची यादी ({templates.length})</h2>
          </div>
          <span className="text-xs text-slate-500">
            सक्रिय नोंदवह्या Dashboard व Data Entry मध्ये कर्मचाऱ्यांना दिसतात
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <th className="p-4 w-12 text-center">क्रम</th>
                <th className="p-4">रजिस्टरचे नाव / कोड</th>
                <th className="p-4">आरोग्य कार्यक्रम</th>
                <th className="p-4 text-center">फील्ड्स</th>
                <th className="p-4 text-center">एकूण नोंदी</th>
                <th className="p-4 text-center">स्थिती</th>
                <th className="p-4 text-right">कृती (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {templates.map((t, idx) => {
                const stats = templateStats[t.id] || { total: 0, today: 0, fieldsCount: 0 };
                return (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Reordering */}
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveOrder(idx, 'up')}
                          className="hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                          title="वर हलवा"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-slate-700">{t.display_order || idx + 1}</span>
                        <button
                          disabled={idx === templates.length - 1}
                          onClick={() => handleMoveOrder(idx, 'down')}
                          className="hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                          title="खाली हलवा"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                    {/* Name & Code */}
                    <td className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 shrink-0">
                          {getTemplateIcon(t.icon)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{t.register_name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                              {t.register_code}
                            </span>
                            {t.description && (
                              <span className="text-xs text-slate-500 truncate max-w-xs">{t.description}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Program Name */}
                    <td className="p-4 text-xs font-medium text-slate-600">
                      {t.program_name ? (
                        <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                          {t.program_name}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Fields Count */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => {
                          onSelectTemplate(t.id);
                          storage.setItem('selectedTemplateId', t.id);
                          onNavigate('template-fields');
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                        title="फील्ड्स व्यवस्थापन"
                      >
                        <span>{stats.fieldsCount} फील्ड्स</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>

                    {/* Records Count */}
                    <td className="p-4 text-center">
                      <div className="font-bold text-slate-800">{stats.total}</div>
                      {stats.today > 0 && (
                        <div className="text-[10px] text-emerald-700 font-semibold">आज: +{stats.today}</div>
                      )}
                    </td>

                    {/* Status Toggle */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleStatus(t)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          t.is_active 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {t.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {t.is_active ? 'सक्रिय (Active)' : 'निष्क्रीय (Inactive)'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right space-x-1.5">
                      {/* Preview Button */}
                      <button
                        onClick={() => handleOpenPreview(t)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="फॉर्म प्रीव्ह्यू पहा"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Open Register Entry */}
                      <button
                        onClick={() => {
                          onSelectTemplate(t.id);
                          storage.setItem('selectedTemplateId', t.id);
                          onNavigate('dynamic-register');
                        }}
                        className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                        title="नोंदवही उघडा व नवीन नोंद करा"
                      >
                        नोंद करा
                      </button>

                      {/* Open Report */}
                      <button
                        onClick={() => {
                          onSelectTemplate(t.id);
                          storage.setItem('selectedTemplateId', t.id);
                          onNavigate('dynamic-report');
                        }}
                        className="px-2.5 py-1 text-xs font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
                        title="नोंदवही अहवाल पहा"
                      >
                        अहवाल
                      </button>

                      {/* Edit Template */}
                      <button
                        onClick={() => openEditModal(t)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="माहिती संपादित करा"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete / Archive */}
                      <button
                        onClick={() => handleDelete(t)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="डिलीट / पुराभिलेखात हलवा"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {templates.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <p className="font-semibold text-slate-700">कोणतीही नोंदवही उपलब्ध नाही.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      वर दिलेल्या '१-क्लिक स्टँडर्ड नोंदवह्या' बटनावर क्लिक करून तात्काळ सुरुवात करा.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-6 border border-slate-200">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingTemplate.id ? 'नोंदवही संपादित करा' : 'नवीन नोंदवही तयार करा (Create Register)'}
                </h3>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  रजिस्टरचे नाव (Register Name) *
                </label>
                <input
                  required
                  type="text"
                  value={editingTemplate.register_name || ''}
                  onChange={e => setEditingTemplate({...editingTemplate, register_name: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm font-medium"
                  placeholder="उदा. असंक्रामक रोग नोंद (NCD Register)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    रजिस्टर कोड (Unique Code) *
                  </label>
                  <input
                    required
                    type="text"
                    value={editingTemplate.register_code || ''}
                    onChange={e => setEditingTemplate({...editingTemplate, register_code: e.target.value.toUpperCase().replace(/\s+/g, '_')})}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-sm font-mono uppercase"
                    placeholder="उदा. NCD_REGISTER"
                  />
                  <p className="text-[10px] text-slate-400">फक्त इंग्रजी कॅपिटल अक्षरे, अंक आणि अंडरस्कोर</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    आरोग्य कार्यक्रम (Program Name)
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.program_name || ''}
                    onChange={e => setEditingTemplate({...editingTemplate, program_name: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-sm"
                    placeholder="उदा. राष्ट्रीय आरोग्य अभियान (NHM)"
                  />
                </div>
              </div>

              {/* Icon Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  आयकॉन निवडा (Select Icon)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-200 rounded-xl">
                  {ICON_OPTIONS.map((opt) => {
                    const isSelected = (editingTemplate.icon || 'FileText') === opt.name;
                    const IconC = opt.icon;
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setEditingTemplate({...editingTemplate, icon: opt.name})}
                        className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <IconC className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                        <span className="text-[11px] truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  वर्णन (Description)
                </label>
                <textarea
                  rows={2}
                  value={editingTemplate.description || ''}
                  onChange={e => setEditingTemplate({...editingTemplate, description: e.target.value})}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-sm"
                  placeholder="या नोंदवहीचा उद्देश किंवा सूचना..."
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTemplate.is_active ?? true}
                    onChange={e => setEditingTemplate({...editingTemplate, is_active: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-600 border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">सक्रिय ठेवा (Active)</span>
                    <span className="text-[11px] text-slate-500">सक्रिय नोंदवही सर्व कर्मचाऱ्यांना डेटा एंट्रीसाठी दिसेल</span>
                  </div>
                </label>
              </div>

              <div className="pt-3 flex gap-3 border-t border-slate-100">
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
                  {editingTemplate.id ? 'बदल जतन करा' : 'नोंदवही तयार करा'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      LIVE PREVIEW
                    </span>
                    <span className="text-xs text-slate-500">{previewTemplate.program_name}</span>
                  </div>
                  <h3 className="font-black text-slate-900 text-lg mt-0.5">
                    {previewTemplate.register_name} (फॉर्म प्रीव्ह्यू)
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setPreviewTemplate(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {loadingPreview ? (
                <div className="p-12 text-center text-slate-500">फील्ड्स लोड होत आहेत...</div>
              ) : previewFields.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-700 font-bold">या नोंदवहीत अद्याप कोणतेही फील्ड नाही.</p>
                  <button
                    onClick={() => {
                      const id = previewTemplate.id;
                      setPreviewTemplate(null);
                      onSelectTemplate(id);
                      storage.setItem('selectedTemplateId', id);
                      onNavigate('template-fields');
                    }}
                    className="mt-3 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700"
                  >
                    फील्ड्स जोडा (Add Fields) →
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs">
                  <div className="p-3 bg-amber-50/80 border-b border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between">
                    <span>💡 हा प्रत्यक्ष कर्मचाऱ्यांना दिसणारा फॉर्म आहे. येथे तुम्ही कंडिशनल व्हिजिबिलिटी व पर्याय तपासून पाहू शकता.</span>
                    <span className="text-[10px] text-amber-800">प्रीव्ह्यू मोड (डेटा सेव्ह होणार नाही)</span>
                  </div>
                  <DynamicRecordForm
                    fields={previewFields}
                    onSave={(data) => {
                      alert('प्रीव्ह्यू यशस्वी! डेटा व्हॅलिडेशन पास झाले.\n' + JSON.stringify(data, null, 2));
                    }}
                    onCancel={() => setPreviewTemplate(null)}
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-500">
                एकूण {previewFields.length} फील्ड्स
              </span>
              <button
                onClick={() => setPreviewTemplate(null)}
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
