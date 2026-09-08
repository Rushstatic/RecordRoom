import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Home,
  Phone,
  Edit2,
  Trash2,
  Code2,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  Check,
  Building2,
  Lock,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { EmployeeMaster, SubcentreMaster, PhcMaster } from '../types';
import { masterDataService } from '../services/masterDataService';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const COMMON_DESIGNATIONS = [
  'आरोग्य सेविका (ANM)',
  'बहुउद्देशीय आरोग्य सेवक (MPW)',
  'समुदाय आरोग्य अधिकारी (CHO)',
  'आरोग्य सहाय्यक (Health Assistant)',
  'प्रयोगशाळा तंत्रज्ञ (Lab Tech)',
  'वैद्यकीय अधिकारी (Medical Officer)',
];

export const EmployeeMasterPage: React.FC = () => {
  const { role } = useAuth();
  const isPhcController = role === 'phc_controller';

  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [subcentres, setSubcentres] = useState<SubcentreMaster[]>([]);
  const [phcs, setPhcs] = useState<PhcMaster[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters (Requirement 5)
  const [nameSearch, setNameSearch] = useState('');
  const [smearSearch, setSmearSearch] = useState('');
  const [phcFilter, setPhcFilter] = useState('ALL');
  const [subcentreFilter, setSubcentreFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal & Edit state
  const [showModal, setShowModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<EmployeeMaster | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states (Requirement 3: Cascading PHC -> Subcentre)
  const [formPhcId, setFormPhcId] = useState('');
  const [formSubcentreId, setFormSubcentreId] = useState('');
  const [formEmployeeName, setFormEmployeeName] = useState('');
  const [formDesignation, setFormDesignation] = useState('आरोग्य सेविका (ANM)');
  const [formMobileNumber, setFormMobileNumber] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMalariaSmearCode, setFormMalariaSmearCode] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Real-time smear code check
  const [smearValidation, setSmearValidation] = useState<{
    status: 'idle' | 'valid' | 'invalid' | 'duplicate' | 'empty';
    message: string;
  }>({ status: 'idle', message: '' });

  // Load all master data
  const loadData = async () => {
    setLoading(true);
    try {
      const [empList, scList, phcList] = await Promise.all([
        masterDataService.getEmployees(),
        masterDataService.getSubcentres(),
        masterDataService.getPhcs(),
      ]);
      setEmployees(empList);
      setSubcentres(scList);
      setPhcs(phcList);
    } catch (e) {
      console.error('Error loading employee master data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter subcentres available for the selected PHC in form
  const availableSubcentresForForm = useMemo(() => {
    if (!formPhcId) return [];
    return subcentres.filter((sc) => sc.phc_id === formPhcId);
  }, [subcentres, formPhcId]);

  // Filter subcentres available for the filter bar
  const availableSubcentresForFilter = useMemo(() => {
    if (phcFilter === 'ALL') return subcentres;
    return subcentres.filter((sc) => sc.phc_id === phcFilter);
  }, [subcentres, phcFilter]);

  // Reset subcentre filter if selected subcentre no longer belongs to chosen PHC
  useEffect(() => {
    if (phcFilter !== 'ALL' && subcentreFilter !== 'ALL') {
      const exists = availableSubcentresForFilter.some((s) => s.id === subcentreFilter);
      if (!exists) {
        setSubcentreFilter('ALL');
      }
    }
  }, [phcFilter, availableSubcentresForFilter, subcentreFilter]);

  // Handle open Add Modal
  const handleOpenAdd = () => {
    if (!isPhcController) {
      alert('कर्मचारी जोडण्याचे अधिकार केवळ PHC Controller कडे आहेत.');
      return;
    }
    setEditingEmp(null);
    const initialPhc = phcs[0]?.id || '';
    setFormPhcId(initialPhc);

    const subcentresForInitial = subcentres.filter((s) => s.phc_id === initialPhc);
    setFormSubcentreId(subcentresForInitial[0]?.id || '');

    setFormEmployeeName('');
    setFormDesignation('आरोग्य सेविका (ANM)');
    setFormMobileNumber('');
    setFormEmail('');

    // Pre-generate a suggested smear code based on first subcentre or random
    const scCode = subcentresForInitial[0]?.subcentre_code?.replace('SC-', '') || 'SC';
    const suggestedCode = `${scCode}-ANM-${Math.floor(10 + Math.random() * 89)}`;
    setFormMalariaSmearCode(suggestedCode);

    setFormIsActive(true);
    setErrorMsg('');
    setSuccessMsg('');
    validateSmearCode(suggestedCode, undefined);
    setShowModal(true);
  };

  // Handle open Edit Modal
  const handleOpenEdit = (emp: EmployeeMaster) => {
    if (!isPhcController) {
      alert('कर्मचारी माहिती संपादित करण्याचे अधिकार केवळ PHC Controller कडे आहेत.');
      return;
    }
    setEditingEmp(emp);

    // Find PHC of the employee's subcentre
    const matchedSc = subcentres.find((s) => s.id === emp.subcentre_id);
    const targetPhcId = matchedSc ? matchedSc.phc_id : phcs[0]?.id || '';

    setFormPhcId(targetPhcId);
    setFormSubcentreId(emp.subcentre_id);
    setFormEmployeeName(emp.employee_name);
    setFormDesignation(emp.designation || 'आरोग्य सेविका (ANM)');
    setFormMobileNumber(emp.mobile_number || '');
    setFormEmail(emp.email || '');
    setFormMalariaSmearCode(emp.malaria_smear_code);
    setFormIsActive(emp.is_active);
    setErrorMsg('');
    setSuccessMsg('');
    validateSmearCode(emp.malaria_smear_code, emp.id);
    setShowModal(true);
  };

  // Handle PHC selection change in Form -> updates subcentre list
  const handleFormPhcChange = (newPhcId: string) => {
    setFormPhcId(newPhcId);
    const matchedScs = subcentres.filter((s) => s.phc_id === newPhcId);
    setFormSubcentreId(matchedScs[0]?.id || '');
  };

  // Live Smear Code uniqueness validator (Requirement 3)
  const validateSmearCode = (code: string, excludeId?: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setSmearValidation({
        status: 'empty',
        message: 'मलेरिया स्मीअर कोड अनिवार्य आहे. तो रिक्त ठेवता येणार नाही.',
      });
      return false;
    }

    const duplicate = employees.find(
      (e) =>
        e.malaria_smear_code.trim().toUpperCase() === trimmed &&
        (!excludeId || e.id !== excludeId)
    );

    if (duplicate) {
      setSmearValidation({
        status: 'duplicate',
        message: `हा कोड आधीच "${duplicate.employee_name}" (${duplicate.subcentre_name || 'उपकेंद्र'}) यांना दिलेला आहे. एकाच कोडची पुनरावृत्ती करता येत नाही.`,
      });
      return false;
    }

    setSmearValidation({
      status: 'valid',
      message: 'हा मलेरिया स्मीअर कोड उपलब्ध आणि युनिक आहे.',
    });
    return true;
  };

  const handleSmearCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setFormMalariaSmearCode(val);
    validateSmearCode(val, editingEmp?.id);
  };

  // Save Employee (Create or Edit)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhcController) {
      setErrorMsg('आपल्याकडे कर्मचारी मास्टरमध्ये बदल करण्याचे अधिकार नाहीत.');
      return;
    }

    const cleanName = formEmployeeName.trim();
    const cleanCode = formMalariaSmearCode.trim().toUpperCase();

    if (!cleanName) {
      setErrorMsg('कृपया कर्मचारी नाव प्रविष्ट करा');
      return;
    }
    if (!formSubcentreId) {
      setErrorMsg('कृपया संबंधित उपकेंद्र निवडा');
      return;
    }
    if (!cleanCode) {
      setErrorMsg('मलेरिया स्मीअर कोड (malaria_smear_code) अनिवार्य आहे');
      return;
    }

    // Uniqueness validation
    const isValid = validateSmearCode(cleanCode, editingEmp?.id);
    if (!isValid) {
      setErrorMsg('मलेरिया स्मीअर कोड युनिक असणे बंधनकारक आहे. कृपया योग्य कोड टाका.');
      return;
    }

    try {
      if (editingEmp) {
        await masterDataService.updateEmployee(editingEmp.id, {
          subcentre_id: formSubcentreId,
          employee_name: cleanName,
          designation: formDesignation.trim() || null,
          mobile_number: formMobileNumber.trim() || null,
          email: formEmail.trim() || null,
          malaria_smear_code: cleanCode,
          is_active: formIsActive,
        });
        setSuccessMsg(`कर्मचारी "${cleanName}" यांची माहिती यशस्वीरीत्या अद्ययावत केली.`);
      } else {
        await masterDataService.createEmployee({
          subcentre_id: formSubcentreId,
          employee_name: cleanName,
          designation: formDesignation.trim() || null,
          mobile_number: formMobileNumber.trim() || null,
          email: formEmail.trim() || null,
          malaria_smear_code: cleanCode,
          is_active: formIsActive,
        });
        setSuccessMsg(`नवीन कर्मचारी "${cleanName}" यांची नोंदणी यशस्वी झाली.`);
      }

      setShowModal(false);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'नोंदणी करताना त्रुटी आली, कृपया पुन्हा प्रयत्न करा.');
    }
  };

  // Quick Activate / Deactivate Toggle (Requirement 2 & 4)
  const handleToggleActive = async (emp: EmployeeMaster) => {
    if (!isPhcController) {
      alert('कर्मचारी स्थिती (सक्रिय/निष्क्रिय) बदलण्याचे अधिकार केवळ PHC Controller कडे आहेत.');
      return;
    }

    const targetAction = emp.is_active ? 'निष्क्रिय' : 'सक्रिय';
    const confirmChange = window.confirm(
      `तुम्हाला खात्री आहे की "${emp.employee_name}" (स्मीअर कोड: ${emp.malaria_smear_code}) यांना ${targetAction} करायचे आहे?`
    );
    if (!confirmChange) return;

    try {
      await masterDataService.toggleEmployeeStatus(emp.id);
      setSuccessMsg(`कर्मचारी "${emp.employee_name}" यांना यशस्वीरीत्या ${targetAction} केले.`);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err: any) {
      alert(err.message || 'स्थिती बदलताना त्रुटी आली.');
    }
  };

  // Reset filters helper
  const handleResetFilters = () => {
    setNameSearch('');
    setSmearSearch('');
    setPhcFilter('ALL');
    setSubcentreFilter('ALL');
    setStatusFilter('ALL');
  };

  // Filtered employee list (Requirement 5)
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Name Search
      if (nameSearch.trim()) {
        const qName = nameSearch.toLowerCase().trim();
        const matchesName = emp.employee_name.toLowerCase().includes(qName);
        if (!matchesName) return false;
      }

      // Smear Code Search
      if (smearSearch.trim()) {
        const qSmear = smearSearch.toUpperCase().trim();
        const matchesSmear = emp.malaria_smear_code.toUpperCase().includes(qSmear);
        if (!matchesSmear) return false;
      }

      // PHC Filter
      if (phcFilter !== 'ALL') {
        const empSc = subcentres.find((s) => s.id === emp.subcentre_id);
        if (!empSc || empSc.phc_id !== phcFilter) return false;
      }

      // Subcentre Filter
      if (subcentreFilter !== 'ALL') {
        if (emp.subcentre_id !== subcentreFilter) return false;
      }

      // Active / Inactive Filter
      if (statusFilter === 'ACTIVE' && !emp.is_active) return false;
      if (statusFilter === 'INACTIVE' && emp.is_active) return false;

      return true;
    });
  }, [employees, subcentres, nameSearch, smearSearch, phcFilter, subcentreFilter, statusFilter]);

  return (
    <div className="space-y-5">
      {/* Top Banner & Controller Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                PHC Controller नोंदणी कक्ष
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold border border-slate-200">
                employee_master
              </span>
              {isPhcController ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  पूर्ण संपादन अधिकार (Full Access)
                </span>
              ) : (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-700" />
                  केवळ वाचन (Read-Only)
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              कर्मचारी व्यवस्थापन (Employee Management)
            </h2>
            <p className="text-xs text-slate-500">
              उपकेंद्रनिहाय कर्मचारी नेमणूक, पदनाम, मोबाईल आणि रक्त नमुन्यांसाठी अनिवार्य मलेरिया स्मीअर कोड
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
            title="SQL Schema पहा"
          >
            <Code2 className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">SQL कोड</span>
          </button>

          {isPhcController && (
            <button
              id="employee-add-btn"
              type="button"
              onClick={handleOpenAdd}
              className="bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>नवीन कर्मचारी जोडा</span>
            </button>
          )}
        </div>
      </div>

      {/* Access alert if logged in as Subcentre Employee */}
      {!isPhcController && (
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center gap-3 text-xs text-amber-900">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <div>
            <strong>केवळ वाचन परवानगी (Read-Only):</strong> सामान्य उपकेंद्र कर्मचाऱ्यांना मास्टर डेटामध्ये (कर्मचारी जोडणे, संपादित करणे किंवा सक्रिय/निष्क्रिय करणे) बदल करण्याची परवानगी नाही. हे अधिकार केवळ <strong>PHC Controller</strong> कडे आहेत.
          </div>
        </div>
      )}

      {/* Success notification banner */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-900 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-700 hover:text-emerald-900 text-xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5. Comprehensive Search & Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>शोध व फिल्टर (Search & Filter)</span>
          </span>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-[11px] text-slate-500 hover:text-emerald-700 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>सर्व फिल्टर पूर्ववत करा</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* 1. Employee Name Search */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              कर्मचारी नाव शोध
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                placeholder="कर्मचारी नाव प्रविष्ट करा..."
                className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* 2. Malaria Smear Code Search */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              मलेरिया स्मीअर कोड शोध
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={smearSearch}
                onChange={(e) => setSmearSearch(e.target.value)}
                placeholder="उदा. JTG-ANM..."
                className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* 3. PHC Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              प्राथमिक आरोग्य केंद्र (PHC)
            </label>
            <select
              value={phcFilter}
              onChange={(e) => setPhcFilter(e.target.value)}
              className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">सर्व प्राथमिक आरोग्य केंद्रे (All)</option>
              {phcs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.phc_name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Subcentre Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              आरोग्य उपकेंद्र
            </label>
            <select
              value={subcentreFilter}
              onChange={(e) => setSubcentreFilter(e.target.value)}
              className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">सर्व उपकेंद्रे (All Subcentres)</option>
              {availableSubcentresForFilter.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.subcentre_name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Status Filter (Active / Inactive) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              स्थिती (Status)
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold"
            >
              <option value="ALL">सर्व स्थिती (सक्रिय + निष्क्रिय)</option>
              <option value="ACTIVE" className="text-emerald-700">
                सक्रिय (Active Only)
              </option>
              <option value="INACTIVE" className="text-rose-700">
                निष्क्रिय (Inactive Only)
              </option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-3">
            <span>
              दिसत असलेले कर्मचारी: <strong className="text-slate-800">{filteredEmployees.length}</strong> / {employees.length}
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">
              सक्रिय: <strong>{employees.filter((e) => e.is_active).length}</strong>
            </span>
            <span>•</span>
            <span className="text-rose-700 font-medium">
              निष्क्रिय: <strong>{employees.filter((e) => !e.is_active).length}</strong>
            </span>
          </div>

          <div className="text-[11px]">
            {isSupabaseConfigured() ? (
              <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                Supabase Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Local Master State
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Professional Employee List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              कर्मचारी यादी व मलेरिया स्मीअर कोड (Employee Register)
            </span>
            <span className="text-[11px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {filteredEmployees.length} नोंदी
            </span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            रक्त नमुन्यांसाठी मलेरिया स्मीअर कोड बंधनकारक आहे
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">
            कर्मचारी डेटा लोड होत आहे...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 space-y-2">
            <div>कोणताही कर्मचारी सापडला नाही.</div>
            {isPhcController && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="text-xs text-emerald-700 font-bold hover:underline"
              >
                + नवीन कर्मचारी जोडा
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="px-3.5 py-3 w-12 text-center">क्रमांक</th>
                  <th className="px-4 py-3">कर्मचारी नाव</th>
                  <th className="px-4 py-3">पदनाम</th>
                  <th className="px-4 py-3">PHC</th>
                  <th className="px-4 py-3">उपकेंद्र</th>
                  <th className="px-4 py-3">मोबाईल</th>
                  <th className="px-4 py-3">Malaria Smear Code</th>
                  <th className="px-4 py-3 text-center">स्थिती</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredEmployees.map((emp, index) => (
                  <tr
                    key={emp.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !emp.is_active ? 'bg-slate-50/50 opacity-90' : ''
                    }`}
                  >
                    {/* 1. क्रमांक */}
                    <td className="px-3.5 py-3 text-center font-mono text-slate-500 text-[11px]">
                      {index + 1}
                    </td>

                    {/* 2. कर्मचारी नाव */}
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{emp.employee_name}</span>
                        {!emp.is_active && (
                          <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded font-normal">
                            सेवामुक्त / निष्क्रिय
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. पदनाम */}
                    <td className="px-4 py-3 text-slate-800 font-medium">
                      {emp.designation || '-'}
                    </td>

                    {/* 4. PHC */}
                    <td className="px-4 py-3 text-slate-700">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>{emp.phc_name || '-'}</span>
                      </div>
                    </td>

                    {/* 5. उपकेंद्र */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <Home className="w-3 h-3 text-emerald-700 shrink-0" />
                        <span>{emp.subcentre_name}</span>
                      </div>
                    </td>

                    {/* 6. मोबाईल व ईमेल */}
                    <td className="px-4 py-3 font-mono text-slate-700">
                      <div className="flex flex-col gap-1">
                        {emp.mobile_number ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{emp.mobile_number}</span>
                          </span>
                        ) : null}
                        {emp.email ? (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500 font-sans">
                            <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate max-w-[120px]" title={emp.email}>{emp.email}</span>
                          </span>
                        ) : null}
                        {!emp.mobile_number && !emp.email && '-'}
                      </div>
                    </td>

                    {/* 7. Malaria Smear Code */}
                    <td className="px-4 py-3">
                      <span className="inline-block bg-amber-50 text-amber-900 font-mono font-bold px-2 py-0.5 rounded border border-amber-300 text-xs shadow-2xs">
                        {emp.malaria_smear_code}
                      </span>
                    </td>

                    {/* 8. स्थिती */}
                    <td className="px-4 py-3 text-center">
                      {emp.is_active ? (
                        <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                          सक्रिय
                        </span>
                      ) : (
                        <span className="inline-block bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-300">
                          निष्क्रिय
                        </span>
                      )}
                    </td>

                    {/* 9. Action (Edit & Activate / Deactivate) */}
                    <td className="px-4 py-3 text-right">
                      {isPhcController ? (
                        <div className="inline-flex items-center gap-1.5">
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-md border border-emerald-300 flex items-center gap-1 transition-colors"
                            title="संपादित करा"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>संपादित करा</span>
                          </button>

                          {/* Activate / Deactivate button */}
                          {emp.is_active ? (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(emp)}
                              className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-800 font-semibold px-2.5 py-1 rounded-md border border-rose-200 flex items-center gap-1 transition-colors"
                              title="निष्क्रिय करा"
                            >
                              <ToggleLeft className="w-3.5 h-3.5 text-rose-600" />
                              <span>निष्क्रिय करा</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(emp)}
                              className="text-xs bg-green-50 hover:bg-green-100 text-green-800 font-semibold px-2.5 py-1 rounded-md border border-green-300 flex items-center gap-1 transition-colors"
                              title="सक्रिय करा"
                            >
                              <ToggleRight className="w-3.5 h-3.5 text-green-700" />
                              <span>सक्रिय करा</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">केवळ वाचन</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Add / Edit Modal with Cascading PHC -> Subcentre and Malaria Smear Code check */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingEmp ? 'कर्मचारी माहिती संपादन' : 'नवीन आरोग्य कर्मचारी नेमणूक'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  PHC व उपकेंद्र निवडून युनिक मलेरिया स्मीअर कोडची नोंद करा
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="py-4 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Requirement 3: Cascading Dropdowns: PHC -> Subcentre */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-700" />
                  <span>कर्मचारी पदस्थापना (PHC & Subcentre Assignment)</span>
                </div>

                {/* Dropdown 1: PHC */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    प्राथमिक आरोग्य केंद्र (PHC) *
                  </label>
                  <select
                    required
                    value={formPhcId}
                    onChange={(e) => handleFormPhcChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-semibold text-slate-800"
                  >
                    {phcs.length === 0 && <option value="">कोणतेही PHC उपलब्ध नाही</option>}
                    {phcs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.phc_name} {p.taluka ? `(${p.taluka})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dropdown 2: Subcentre (Filtered by selected PHC) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>आरोग्य उपकेंद्र (Subcentre) *</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      (केवळ निवडलेल्या PHC ची उपकेंद्रे)
                    </span>
                  </label>
                  <select
                    required
                    value={formSubcentreId}
                    onChange={(e) => setFormSubcentreId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-semibold text-emerald-900"
                  >
                    {availableSubcentresForForm.length === 0 ? (
                      <option value="">या PHC अंतर्गत कोणतेही उपकेंद्र उपलब्ध नाही</option>
                    ) : (
                      availableSubcentresForForm.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.subcentre_name} {sc.subcentre_code ? `[${sc.subcentre_code}]` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Employee Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  कर्मचारी नाव *
                </label>
                <input
                  type="text"
                  required
                  value={formEmployeeName}
                  onChange={(e) => setFormEmployeeName(e.target.value)}
                  placeholder="उदा. सौ. सुनिता एम. कांबळे किंवा श्री. राहुल पाटील"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none text-slate-900 font-medium"
                />
              </div>

              {/* Designation */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  पदनाम (Designation)
                </label>
                <input
                  type="text"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  placeholder="उदा. आरोग्य सेविका (ANM)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none mb-1.5"
                />
                <div className="flex flex-wrap gap-1">
                  {COMMON_DESIGNATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFormDesignation(d)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        formDesignation === d
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  मोबाईल क्रमांक (Mobile Number)
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={formMobileNumber}
                  onChange={(e) => setFormMobileNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="उदा. 9822012345"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Malaria Smear Code (Required, Unique, Real-time checked) */}
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>मलेरिया स्मीअर कोड (Malaria Smear Code) *</span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                    Unique & Mandatory
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={formMalariaSmearCode}
                  onChange={handleSmearCodeChange}
                  placeholder="उदा. JTG-ANM-1 किंवा TLG-MPW-1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-emerald-800 uppercase focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                />

                {/* Real-time feedback validation */}
                <div className="mt-1.5 text-[11px]">
                  {smearValidation.status === 'valid' && (
                    <div className="text-emerald-700 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{smearValidation.message}</span>
                    </div>
                  )}
                  {smearValidation.status === 'duplicate' && (
                    <div className="text-rose-700 flex items-start gap-1 font-semibold bg-rose-50 p-1.5 rounded border border-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>{smearValidation.message}</span>
                    </div>
                  )}
                  {smearValidation.status === 'empty' && (
                    <div className="text-rose-600 flex items-center gap-1 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{smearValidation.message}</span>
                    </div>
                  )}
                  {smearValidation.status === 'idle' && (
                    <span className="text-slate-400">
                      प्रत्येक कर्मचाऱ्यासाठी हा कोड युनिक असणे बंधनकारक आहे.
                    </span>
                  )}
                </div>
              </div>

              {/* Active / Inactive Status */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="is_active_toggle_emp"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label
                  htmlFor="is_active_toggle_emp"
                  className="font-bold text-slate-700 cursor-pointer select-none"
                >
                  कर्मचारी सध्या सेवेत सक्रिय आहे (is_active = true)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-semibold hover:bg-slate-100 transition-colors"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  disabled={smearValidation.status === 'duplicate' || smearValidation.status === 'empty'}
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingEmp ? 'बदल जतन करा' : 'कर्मचारी नोंदवा'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQL Schema Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-700" />
                <span>Employee Master & Controller Permissions Schema</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 overflow-y-auto flex-1">
              <pre className="bg-slate-900 text-emerald-300 p-3.5 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed">
{`-- 4. EMPLOYEE MASTER SCHEMA WITH UNIQUE SMEAR CODE
create table if not exists employee_master (
  id uuid primary key default uuid_generate_v4(),
  subcentre_id uuid not null references subcentre_master(id) on delete cascade,
  employee_name text not null,
  designation text,
  mobile_number text,
  malaria_smear_code text not null unique,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Indexes for lightning fast lookups
create index if not exists idx_employee_subcentre on employee_master(subcentre_id);
create index if not exists idx_employee_smear_code on employee_master(malaria_smear_code);

-- ROW LEVEL SECURITY (RLS) FOR PHC CONTROLLER
alter table employee_master enable row level security;

-- Read allowed for all authenticated healthcare personnel
create policy "Allow read for all staff"
  on employee_master for select
  using (true);

-- Mutations (Insert, Update, Delete) strictly restricted to PHC Controller
create policy "Allow mutations only for phc_controller"
  on employee_master for all
  using (
    auth.jwt() ->> 'role' = 'phc_controller' or
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'phc_controller'
  );`}
              </pre>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs shrink-0">
              <span className="text-slate-500">
                तालिका: <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">employee_master</code>
              </span>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-bold"
              >
                बंद करा
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
