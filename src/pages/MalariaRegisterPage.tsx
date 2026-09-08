import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet,
  Search,
  Calendar,
  User,
  Home,
  Hash,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Code2,
  X,
  Lock,
  Building2,
  Save,
  RotateCcw,
  Users,
  Wifi,
  WifiOff,
  CloudOff,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { offlineDraftService } from '../services/offlineDraftService';
import {
  MalariaBloodSample,
  PhcMaster,
  SubcentreMaster,
  VillageMaster,
  EmployeeMaster,
  GenderType,
  PageId,
} from '../types';
import { masterDataService } from '../services/masterDataService';
import {
  malariaService,
  formatSampleNumber,
  formatIndianDate,
} from '../services/malariaService';
import { MalariaAdvancedSearch } from '../components/malaria/MalariaAdvancedSearch';

interface MalariaRegisterPageProps {
  onNavigate?: (page: PageId) => void;
}

export const MalariaRegisterPage: React.FC<MalariaRegisterPageProps> = ({ onNavigate }) => {
  const { user, role } = useAuth();
  const { isOnline } = useNetworkStatus();
  const isPhcController = role === 'phc_controller';

  // Offline Drafts Count
  const [pendingDraftsCount, setPendingDraftsCount] = useState(() =>
    offlineDraftService.getSyncStats(user).pending
  );

  useEffect(() => {
    const handleSyncChange = () => {
      setPendingDraftsCount(offlineDraftService.getSyncStats(user).pending);
    };
    window.addEventListener('arogya-sync-status-changed', handleSyncChange);
    return () => {
      window.removeEventListener('arogya-sync-status-changed', handleSyncChange);
    };
  }, [user]);

  // Master Data state
  const [phcs, setPhcs] = useState<PhcMaster[]>([]);
  const [subcentres, setSubcentres] = useState<SubcentreMaster[]>([]);
  const [villages, setVillages] = useState<VillageMaster[]>([]);
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [samples, setSamples] = useState<MalariaBloodSample[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form State
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedPhcId, setSelectedPhcId] = useState<string>('');
  const [selectedSubcentreId, setSelectedSubcentreId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedVillageId, setSelectedVillageId] = useState<string>('');
  const [houseNumber, setHouseNumber] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<GenderType>('पुरुष');
  const [collectionDate, setCollectionDate] = useState<string>(todayStr);

  // Computed & Live Sample number
  const [nextSampleNumber, setNextSampleNumber] = useState<number>(1);
  const [activeSmearCode, setActiveSmearCode] = useState<string>('');

  // UI Feedback & Modals
  const [saving, setSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState<{
    sampleNumber: number;
    smearCode: string;
    patientName: string;
    isDraft?: boolean;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Edit Modal State
  const [editingSample, setEditingSample] = useState<MalariaBloodSample | null>(null);
  const [editVillageId, setEditVillageId] = useState<string>('');
  const [editHouseNumber, setEditHouseNumber] = useState<string>('');
  const [editPatientName, setEditPatientName] = useState<string>('');
  const [editAge, setEditAge] = useState<string>('');
  const [editGender, setEditGender] = useState<GenderType>('पुरुष');
  const [editCollectionDate, setEditCollectionDate] = useState<string>('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // 1. Initial Data Load
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [phcList, scList, vilList, empList, sampleList] = await Promise.all([
        masterDataService.getPhcs(),
        masterDataService.getSubcentres(),
        masterDataService.getVillages(),
        masterDataService.getEmployees(),
        malariaService.getSamples(),
      ]);

      setPhcs(phcList);
      setSubcentres(scList);
      setVillages(vilList);
      setEmployees(empList);
      setSamples(sampleList);
      setRefreshTrigger(prev => prev + 1);

      // Setup initial selection based on role
      if (role === 'subcentre_employee') {
        // Find employee by user profile
        let matchedEmp = empList.find(
          (e) =>
            e.id === user?.employeeId ||
            e.employee_name === user?.marathiName ||
            e.employee_name === user?.name
        );
        if (!matchedEmp && empList.length > 0) {
          // Fallback to first active employee in subcentre
          matchedEmp = empList.find((e) => e.is_active) || empList[0];
        }

        if (matchedEmp) {
          setSelectedEmployeeId(matchedEmp.id);
          setActiveSmearCode(matchedEmp.malaria_smear_code);
          setSelectedSubcentreId(matchedEmp.subcentre_id);

          const parentSc = scList.find((s) => s.id === matchedEmp.subcentre_id);
          if (parentSc) {
            setSelectedPhcId(parentSc.phc_id);
          }

          // Compute next sample number for this employee
          const yr = new Date(collectionDate).getFullYear();
          const nextNum = await malariaService.getNextSampleNumber(matchedEmp.id, yr);
          setNextSampleNumber(nextNum);
        }
      } else {
        // PHC Controller: default to first PHC if available
        if (phcList.length > 0 && !selectedPhcId) {
          const firstPhc = phcList[0];
          setSelectedPhcId(firstPhc.id);

          // Find first subcentre of this PHC
          const phcScs = scList.filter((s) => s.phc_id === firstPhc.id);
          if (phcScs.length > 0) {
            setSelectedSubcentreId(phcScs[0].id);

            // Find first employee of this subcentre
            const scEmps = empList.filter((e) => e.subcentre_id === phcScs[0].id && e.is_active);
            if (scEmps.length > 0) {
              setSelectedEmployeeId(scEmps[0].id);
              setActiveSmearCode(scEmps[0].malaria_smear_code);
              const yr = new Date(collectionDate).getFullYear();
              const nextNum = await malariaService.getNextSampleNumber(scEmps[0].id, yr);
              setNextSampleNumber(nextNum);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load malaria data:', err);
    } finally {
      setLoading(false);
    }
  }, [role, user, collectionDate, selectedPhcId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Update next sample number whenever employee or collection date year changes
  useEffect(() => {
    if (!selectedEmployeeId || !collectionDate) return;
    const yr = new Date(collectionDate).getFullYear();
    malariaService.getNextSampleNumber(selectedEmployeeId, yr).then((num) => {
      setNextSampleNumber(num);
    });
  }, [selectedEmployeeId, collectionDate]);

  // Cascading helpers for PHC Controller
  const availableSubcentres = useMemo(() => {
    if (!selectedPhcId) return [];
    return subcentres.filter((s) => s.phc_id === selectedPhcId);
  }, [subcentres, selectedPhcId]);

  const availableEmployees = useMemo(() => {
    if (!selectedSubcentreId) return [];
    return employees.filter((e) => e.subcentre_id === selectedSubcentreId && e.is_active);
  }, [employees, selectedSubcentreId]);

  const availableVillages = useMemo(() => {
    if (!selectedSubcentreId) return [];
    return villages.filter((v) => v.subcentre_id === selectedSubcentreId);
  }, [villages, selectedSubcentreId]);

  // Handlers for PHC Controller dropdown changes
  const handlePhcChange = (phcId: string) => {
    setSelectedPhcId(phcId);
    const relatedScs = subcentres.filter((s) => s.phc_id === phcId);
    if (relatedScs.length > 0) {
      handleSubcentreChange(relatedScs[0].id);
    } else {
      setSelectedSubcentreId('');
      setSelectedEmployeeId('');
      setActiveSmearCode('');
      setSelectedVillageId('');
    }
  };

  const handleSubcentreChange = (scId: string) => {
    setSelectedSubcentreId(scId);
    setSelectedVillageId('');

    const scEmps = employees.filter((e) => e.subcentre_id === scId && e.is_active);
    if (scEmps.length > 0) {
      setSelectedEmployeeId(scEmps[0].id);
      setActiveSmearCode(scEmps[0].malaria_smear_code);
    } else {
      setSelectedEmployeeId('');
      setActiveSmearCode('');
    }
  };

  const handleEmployeeChange = (empId: string) => {
    setSelectedEmployeeId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      setActiveSmearCode(emp.malaria_smear_code);
    } else {
      setActiveSmearCode('');
    }
  };

  // Find names for locked fields in Subcentre Employee view
  const currentPhcName = useMemo(() => {
    const p = phcs.find((item) => item.id === selectedPhcId);
    return p ? p.phc_name : user?.assignedPhc || 'प्राथमिक आरोग्य केंद्र';
  }, [phcs, selectedPhcId, user]);

  const currentSubcentreName = useMemo(() => {
    const s = subcentres.find((item) => item.id === selectedSubcentreId);
    return s ? s.subcentre_name : user?.assignedSubcentre || 'आरोग्य उपकेंद्र';
  }, [subcentres, selectedSubcentreId, user]);

  // Clear / Reset Form
  const handleClearForm = () => {
    setPatientName('');
    setHouseNumber('');
    setAge('');
    setGender('पुरुष');
    setSelectedVillageId('');
    setCollectionDate(todayStr);
    setFormError(null);
    setSuccessNotice(null);
  };

  // Save Sample
  const handleSaveSample = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessNotice(null);

    // Form Validations
    if (!selectedEmployeeId) {
      setFormError('कर्मचारी व मलेरिया स्मीअर कोड उपलब्ध नाही.');
      return;
    }
    if (!selectedVillageId) {
      setFormError('गाव निवडणे अनिवार्य आहे.');
      return;
    }
    if (!patientName.trim()) {
      setFormError('ताप रुग्णाचे पूर्ण नाव टाकणे आवश्यक आहे.');
      return;
    }
    const ageVal = parseInt(age, 10);
    if (isNaN(ageVal) || ageVal <= 0 || ageVal > 120) {
      setFormError('वय १ ते १२० दरम्यान योग्य आकड्यात टाका.');
      return;
    }
    if (!collectionDate) {
      setFormError('रक्त नमुना घेतल्याचा दिनांक आवश्यक आहे.');
      return;
    }
    if (collectionDate > todayStr) {
      setFormError('रक्त नमुना घेतल्याचा दिनांक आजचा किंवा मागील असावा (भविष्यातील दिनांक चालणार नाही).');
      return;
    }

    // CODE 12: If offline, automatically save as Offline Draft with client-generated UUID
    if (!isOnline) {
      await handleSaveDraftInternal(ageVal);
      return;
    }

    try {
      setSaving(true);
      const saved = await malariaService.saveSample({
        employee_id: selectedEmployeeId,
        village_id: selectedVillageId,
        house_number: houseNumber.trim(),
        patient_name: patientName.trim(),
        age: ageVal,
        gender: gender,
        sample_collection_date: collectionDate,
        sample_number: nextSampleNumber,
        sample_year: new Date(collectionDate).getFullYear(),
        malaria_smear_code: activeSmearCode,
      });

      // Show Success notice exactly as requested:
      // "रक्त नमुना यशस्वीरित्या जतन झाला."
      // रक्त नमुना क्रमांक: 0001
      // Malaria Smear Code: BHADA-001
      setSuccessNotice({
        sampleNumber: saved.sample_number,
        smearCode: saved.malaria_smear_code,
        patientName: saved.patient_name,
        isDraft: false,
      });

      // Reset patient fields but keep employee / location / date for convenient sequential entry
      setPatientName('');
      setHouseNumber('');
      setAge('');
      setGender('पुरुष');

      // Refresh sample list & calculate next number
      const updatedSamples = await malariaService.getSamples();
      setSamples(updatedSamples);

      const yr = new Date(collectionDate).getFullYear();
      const nextNum = await malariaService.getNextSampleNumber(selectedEmployeeId, yr);
      setNextSampleNumber(nextNum);
    } catch (err: any) {
      setFormError(err.message || 'रक्त नमुना जतन करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setSaving(false);
    }
  };

  // Helper: Save Draft explicitly or when offline
  const handleSaveDraftInternal = async (parsedAge?: number) => {
    if (!user) return;
    const ageVal = parsedAge || parseInt(age, 10);
    if (isNaN(ageVal) || ageVal <= 0 || ageVal > 120) {
      setFormError('वय १ ते १२० दरम्यान योग्य आकड्यात टाका.');
      return;
    }

    try {
      setSaving(true);
      const selVil = villages.find((v) => v.id === selectedVillageId);
      const selEmp = employees.find((e) => e.id === selectedEmployeeId);
      const selSc = subcentres.find((s) => s.id === selectedSubcentreId);
      const selPhc = phcs.find((p) => p.id === selectedPhcId);

      const draft = await offlineDraftService.saveDraft(
        {
          employee_id: selectedEmployeeId,
          village_id: selectedVillageId,
          house_number: houseNumber.trim(),
          patient_name: patientName.trim(),
          age: ageVal,
          gender: gender,
          sample_collection_date: collectionDate,
          sample_year: new Date(collectionDate).getFullYear(),
          malaria_smear_code: activeSmearCode,
          village_name: selVil?.village_name,
          employee_name: selEmp?.employee_name,
          subcentre_name: selSc?.subcentre_name,
          phc_name: selPhc?.phc_name,
        },
        user
      );

      setSuccessNotice({
        sampleNumber: 0,
        smearCode: `${activeSmearCode || 'स्मीअर कोड'} [Draft]`,
        patientName: draft.patient_name,
        isDraft: true,
      });

      setPatientName('');
      setHouseNumber('');
      setAge('');
      setGender('पुरुष');
    } catch (err: any) {
      setFormError(err.message || 'ऑफलाइन ड्राफ्ट जतन करताना त्रुटी आली.');
    } finally {
      setSaving(false);
    }
  };

  // Edit Sample
  const handleOpenEdit = (sample: MalariaBloodSample) => {
    // Permission check
    if (!isPhcController && sample.employee_id !== selectedEmployeeId) {
      alert('तुम्ही केवळ स्वतः नोंदवलेले नमुने संपादित करू शकता.');
      return;
    }

    setEditingSample(sample);
    setEditVillageId(sample.village_id);
    setEditHouseNumber(sample.house_number || '');
    setEditPatientName(sample.patient_name);
    setEditAge(String(sample.age));
    setEditGender(sample.gender);
    setEditCollectionDate(sample.sample_collection_date);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSample) return;

    if (!editPatientName.trim()) {
      setEditError('ताप रुग्णाचे पूर्ण नाव आवश्यक आहे.');
      return;
    }
    const ageVal = parseInt(editAge, 10);
    if (isNaN(ageVal) || ageVal <= 0 || ageVal > 120) {
      setEditError('वय १ ते १२० दरम्यान असणे आवश्यक आहे.');
      return;
    }
    if (editCollectionDate > todayStr) {
      setEditError('रक्त नमुना घेतल्याचा दिनांक भविष्यातील असू शकत नाही.');
      return;
    }

    try {
      setEditSaving(true);
      await malariaService.updateSample(editingSample.id, {
        village_id: editVillageId,
        house_number: editHouseNumber.trim(),
        patient_name: editPatientName.trim(),
        age: ageVal,
        gender: editGender,
        sample_collection_date: editCollectionDate,
      });

      setEditingSample(null);
      const updatedList = await malariaService.getSamples();
      setSamples(updatedList);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      setEditError(err.message || 'बदल जतन करताना त्रुटी आली.');
    } finally {
      setEditSaving(false);
    }
  };

  // Delete Sample
  const handleDeleteSample = async (sample: MalariaBloodSample) => {
    // Permission check: PHC Controller can delete; employee can only delete own records
    if (!isPhcController && sample.employee_id !== selectedEmployeeId) {
      alert('तुम्ही इतर कर्मचाऱ्यांचे नमुने हटवू शकत नाही.');
      return;
    }

    const confirmMsg = `तुम्हाला खात्री आहे की रुग्ण "${sample.patient_name}" (रक्त नमुना क्र. ${formatSampleNumber(sample.sample_number)}, स्मीअर कोड ${sample.malaria_smear_code}) चा रक्त नमुना हटवायचा आहे?`;

    if (window.confirm(confirmMsg)) {
      try {
        await malariaService.deleteSample(sample.id);
        const updated = await malariaService.getSamples();
        setSamples(updated);
        setRefreshTrigger(prev => prev + 1);

        // Update next sample number
        if (selectedEmployeeId) {
          const yr = new Date(collectionDate).getFullYear();
          const nextNum = await malariaService.getNextSampleNumber(selectedEmployeeId, yr);
          setNextSampleNumber(nextNum);
        }
      } catch (err) {
        alert('नमुना हटवताना त्रुटी आली.');
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-emerald-700 text-white rounded-xl shadow-xs shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                राष्ट्रीय हिवताप नियंत्रण कार्यक्रम
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                NVBDCP M-1 Register
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              रक्त नमुना नोंदवही
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ताप रुग्णांचे दैनिक रक्त नमुने (Blood Smear) नोंदणी व अनुक्रमांक व्यवस्थापन
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Code2 className="w-4 h-4 text-emerald-700" />
            <span>SQL कोड</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div
          className={`p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200 border-2 ${
            successNotice.isDraft
              ? 'bg-amber-50 border-amber-500 text-amber-950'
              : 'bg-emerald-50 border-emerald-500/80 text-emerald-950'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2 rounded-lg shrink-0 text-white ${
                successNotice.isDraft ? 'bg-amber-600' : 'bg-emerald-600'
              }`}
            >
              {successNotice.isDraft ? (
                <CloudOff className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <div
                className={`font-extrabold text-sm sm:text-base ${
                  successNotice.isDraft ? 'text-amber-950' : 'text-emerald-900'
                }`}
              >
                {successNotice.isDraft
                  ? 'रक्त नमुना ऑफलाइन Draft म्हणून सुरक्षित झाला!'
                  : 'रक्त नमुना यशस्वीरित्या जतन झाला.'}
              </div>
              <div
                className={`text-xs mt-0.5 ${
                  successNotice.isDraft ? 'text-amber-800' : 'text-emerald-800'
                }`}
              >
                रुग्ण: <span className="font-bold">{successNotice.patientName}</span>
                {successNotice.isDraft && (
                  <span className="block mt-0.5 text-[11px] font-medium text-amber-900">
                    इंटरनेट सुरू झाल्यावर सिंक होईल किंवा 'ऑफलाइन ड्राफ्ट्स' पृष्ठावरून सिंक करा.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
            <div>
              <span className="text-slate-500 block text-[10px]">रक्त नमुना क्रमांक</span>
              {successNotice.isDraft ? (
                <span className="font-bold text-amber-700 text-xs">
                  प्रलंबित (सिंकवर मिळेल)
                </span>
              ) : (
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {formatSampleNumber(successNotice.sampleNumber)}
                </span>
              )}
            </div>
            <div className="h-6 w-px bg-slate-200 mx-1" />
            <div>
              <span className="text-slate-500 block text-[10px]">Malaria Smear Code</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {successNotice.smearCode}
              </span>
            </div>
            {successNotice.isDraft && onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('offline-drafts')}
                className="ml-2 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded text-[11px] font-bold cursor-pointer transition-colors"
              >
                ड्राफ्ट्स पहा →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Form Error Banner */}
      {formError && (
        <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-rose-900 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{formError}</span>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. BLOOD SAMPLE ENTRY FORM (Mobile Android Optimized) */}
      {/* ==================================================== */}
      <div className="bg-white rounded-2xl border-2 border-emerald-600/30 shadow-sm overflow-hidden">
        {/* Form Header with Live Sequential Display */}
        <div className="bg-linear-to-r from-emerald-800 to-teal-800 text-white p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-700/80 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider text-emerald-100">
                नवीन नोंदणी (New Entry)
              </span>
              <span className="text-xs text-emerald-100 font-medium">
                वर्ष: <strong>{new Date(collectionDate).getFullYear() || 2026}</strong>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold mt-0.5">
              मलेरिया रक्त नमुना नोंदणी फॉर्म
            </h2>
          </div>

          {/* Live Automatic Sample Number Card */}
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 px-4 py-2 rounded-xl flex items-center gap-4 text-xs">
            <div>
              <span className="text-[10px] text-emerald-100 block">रक्त नमुना क्रमांक</span>
              {isOnline ? (
                <span className="font-mono text-base font-extrabold text-amber-300 tracking-wider">
                  {formatSampleNumber(nextSampleNumber)}
                </span>
              ) : (
                <span className="font-bold text-amber-300 text-xs tracking-wide">
                  प्रलंबित (Pending)
                </span>
              )}
            </div>
            <div className="h-7 w-px bg-white/20" />
            <div>
              <span className="text-[10px] text-emerald-100 block">मलेरिया स्मीअर कोड</span>
              <span className="font-mono font-bold text-white text-xs">
                {activeSmearCode || 'निश्चित नाही'} {!isOnline ? '[Draft]' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Offline Warning Strip */}
        {!isOnline && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-2 border-b border-amber-600 shadow-inner">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-slate-950 shrink-0" />
              <span>
                <strong>ऑफलाइन मोड सक्रिय:</strong> इंटरनेट उपलब्ध नाही. नमुना स्थानिक मेमरीमध्ये <strong>Draft</strong> म्हणून सेव्ह होईल व सिंक झाल्यावरच अंतिम नमुना क्रमांक मिळेल.
              </span>
            </div>
            {pendingDraftsCount > 0 && onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('offline-drafts')}
                className="inline-flex items-center gap-1 bg-slate-900 text-white px-2.5 py-1 rounded text-[11px] font-bold hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <span>{pendingDraftsCount} प्रलंबित ड्राफ्ट्स</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSaveSample} className="p-4 sm:p-6 space-y-5">
          {/* Section 1: Location & Smear Code Assignment */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>आरोग्य केंद्र व कर्मचारी नेमणूक माहिती</span>
            </div>

            {isPhcController ? (
              /* PHC Controller: Cascading Dropdowns */
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                {/* 1. प्राथमिक आरोग्य केंद्र */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    प्राथमिक आरोग्य केंद्र <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={selectedPhcId}
                    onChange={(e) => handlePhcChange(e.target.value)}
                    className="w-full text-xs py-2.5 px-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                    required
                  >
                    <option value="">-- PHC निवडा --</option>
                    {phcs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.phc_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. उपकेंद्र */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    उपकेंद्र <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={selectedSubcentreId}
                    onChange={(e) => handleSubcentreChange(e.target.value)}
                    disabled={!selectedPhcId}
                    className="w-full text-xs py-2.5 px-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium disabled:bg-slate-100"
                    required
                  >
                    <option value="">-- उपकेंद्र निवडा --</option>
                    {availableSubcentres.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subcentre_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employee Selection for PHC Controller */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    नमुना घेणारा कर्मचारी <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    disabled={!selectedSubcentreId}
                    className="w-full text-xs py-2.5 px-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium disabled:bg-slate-100"
                    required
                  >
                    <option value="">-- कर्मचारी निवडा --</option>
                    {availableEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employee_name} ({emp.malaria_smear_code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 10. Malaria Smear Code (Auto displayed) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    मलेरिया स्मीअर कोड
                  </label>
                  <div className="w-full py-2.5 px-3 border border-slate-200 rounded-lg bg-slate-100 text-slate-800 font-mono font-bold text-xs flex items-center justify-between">
                    <span>{activeSmearCode || 'उपलब्ध नाही'}</span>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              </div>
            ) : (
              /* Subcentre Employee: Automatically determined, Locked */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* 1. प्राथमिक आरोग्य केंद्र (Automatic) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    प्राथमिक आरोग्य केंद्र
                  </label>
                  <div className="w-full py-2.5 px-3 border border-emerald-200 rounded-lg bg-emerald-50/60 text-emerald-900 font-semibold text-xs flex items-center justify-between">
                    <span className="truncate">{currentPhcName}</span>
                    <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  </div>
                </div>

                {/* 2. उपकेंद्र (Automatic) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    उपकेंद्र
                  </label>
                  <div className="w-full py-2.5 px-3 border border-emerald-200 rounded-lg bg-emerald-50/60 text-emerald-900 font-semibold text-xs flex items-center justify-between">
                    <span className="truncate">{currentSubcentreName}</span>
                    <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  </div>
                </div>

                {/* 10. Malaria Smear Code (Automatic, employee cannot change) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    मलेरिया स्मीअर कोड
                  </label>
                  <div className="w-full py-2.5 px-3 border border-slate-200 rounded-lg bg-slate-100 text-slate-900 font-mono font-bold text-xs flex items-center justify-between">
                    <span>{activeSmearCode || 'निश्चित नाही'}</span>
                    <span className="text-[10px] text-slate-500 font-sans font-semibold">
                      (कर्मचारी कोड)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Patient & Sample Details */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
              <User className="w-4 h-4 text-emerald-700" />
              <span>रुग्ण तपशील व नमुना संकलन</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 3. गाव (Village Dropdown restricted to assigned Subcentre) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  गाव <span className="text-rose-600">*</span>
                </label>
                <select
                  id="village-select"
                  value={selectedVillageId}
                  onChange={(e) => setSelectedVillageId(e.target.value)}
                  className="w-full text-xs sm:text-sm py-2.5 sm:py-3 px-3.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                  required
                >
                  <option value="">-- गाव निवडा --</option>
                  {availableVillages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.village_name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  केवळ निवडलेल्या उपकेंद्रातील गावे
                </span>
              </div>

              {/* 4. मलेरिया घर क्रमांक (Malaria House Number - Text field) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>मलेरिया घर क्रमांक</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    (उदा. 12, 12/A, 45-B)
                  </span>
                </label>
                <div className="relative">
                  <Home className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    placeholder="उदा. 12/A किंवा 45"
                    className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* 5. ताप रुग्णाचे पूर्ण नाव (Patient Full Name) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  ताप रुग्णाचे पूर्ण नाव <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="रुग्णाचे नाव, वडिलांचे/पतीचे नाव, आडनाव"
                    className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                    required
                  />
                </div>
              </div>

              {/* 6. वय (Age: positive integer, 1 to 120) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  वय <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="वय (१ ते १२०)"
                    className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                    required
                  />
                </div>
              </div>

              {/* 7. लिंग (Gender: पुरुष | स्त्री | इतर) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  लिंग <span className="text-rose-600">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as GenderType)}
                  className="w-full text-xs sm:text-sm py-2.5 sm:py-3 px-3.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                  required
                >
                  <option value="पुरुष">पुरुष</option>
                  <option value="स्त्री">स्त्री</option>
                  <option value="इतर">इतर</option>
                </select>
              </div>

              {/* 8. रक्त नमुना घेतल्याचा दिनांक (Collection Date: default today, no future) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  रक्त नमुना घेतल्याचा दिनांक <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="date"
                    max={todayStr}
                    value={collectionDate}
                    onChange={(e) => setCollectionDate(e.target.value)}
                    className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  भविष्यातील तारीख चालणार नाही
                </span>
              </div>
            </div>
          </div>

          {/* Form Action Buttons (Mobile-friendly, large touch targets) */}
          <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClearForm}
              className="w-full sm:w-auto px-5 py-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>साफ करा</span>
            </button>

            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2.5">
              {/* Optional Manual Draft Button when Online */}
              {isOnline && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveDraftInternal()}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl border-2 border-dashed border-amber-600/70 hover:bg-amber-50 text-amber-900 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  title="स्थानिक ड्राफ्ट म्हणून सेव्ह करा (नंतर सिंक करा)"
                >
                  <CloudOff className="w-4 h-4 text-amber-700" />
                  <span>Draft म्हणून ठेवा</span>
                </button>
              )}

              {/* Main Action Button */}
              {!isOnline ? (
                <button
                  id="save-malaria-sample-btn"
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 px-7 py-3.5 rounded-xl text-sm font-black shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <CloudOff className="w-4 h-4 text-slate-950" />
                  <span>{saving ? 'जतन होत आहे...' : '💾 Draft म्हणून जतन करा (ऑफलाइन)'}</span>
                </button>
              ) : (
                <button
                  id="save-malaria-sample-btn"
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white px-7 py-3.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'जतन होत आहे...' : 'रक्त नमुना जतन करा'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Pending Drafts Floating/Prominent Alert if any */}
      {pendingDraftsCount > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold shrink-0">
              <CloudOff className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-amber-950">
                ⚠️ तुमच्याकडे {pendingDraftsCount} ऑफलाइन ड्राफ्ट्स सुरक्षित आहेत (सिंक बाकी)
              </h4>
              <p className="text-[11px] sm:text-xs text-amber-900 mt-0.5">
                हे नमुने अद्याप ऑनलाइन डेटाबेसमध्ये सिंक झालेले नाहीत. सिंक झाल्यावर त्यांना अधिकृत नमुना क्रमांक मिळेल.
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('offline-drafts')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <span>ऑफलाइन ड्राफ्ट्स व्यवस्थापन ({pendingDraftsCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 11. SAMPLE LIST (Filter, Search, and Saved Records) */}
      {/* ==================================================== */}
      <MalariaAdvancedSearch 
         isPhcController={isPhcController}
         selectedPhcId={selectedPhcId}
         selectedEmployeeId={selectedEmployeeId}
         phcs={phcs}
         subcentres={subcentres}
         villages={villages}
         employees={employees}
         onEdit={handleOpenEdit}
         onDelete={handleDeleteSample}
         onNavigate={onNavigate || (() => {})}
         refreshTrigger={refreshTrigger}
      />

      {/* ==================================================== */}
      {/* 12. EDIT MODAL */}
      {/* ==================================================== */}
      {editingSample && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-700" />
                <span>रक्त नमुना संपादन (Edit Blood Sample)</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingSample(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-3 bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-rose-800 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="py-4 space-y-3.5 text-xs">
              {/* Smear code and sample number display (Locked) */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-slate-700 font-medium">
                <div>
                  <span className="text-[10px] text-slate-500 block">रक्त नमुना क्रमांक</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {formatSampleNumber(editingSample.sample_number)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">मलेरिया स्मीअर कोड</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {editingSample.malaria_smear_code}
                  </span>
                </div>
              </div>

              {/* Patient Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ताप रुग्णाचे पूर्ण नाव <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={editPatientName}
                  onChange={(e) => setEditPatientName(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Malaria House Number */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">मलेरिया घर क्रमांक</label>
                  <input
                    type="text"
                    value={editHouseNumber}
                    onChange={(e) => setEditHouseNumber(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                  />
                </div>

                {/* Village */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">गाव</label>
                  <select
                    value={editVillageId}
                    onChange={(e) => setEditVillageId(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                  >
                    {villages.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.village_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Age */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    वय <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                    required
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    लिंग <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as GenderType)}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                  >
                    <option value="पुरुष">पुरुष</option>
                    <option value="स्त्री">स्त्री</option>
                    <option value="इतर">इतर</option>
                  </select>
                </div>

                {/* Collection Date */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    नमुना दिनांक <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    max={todayStr}
                    value={editCollectionDate}
                    onChange={(e) => setEditCollectionDate(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSample(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-semibold hover:bg-slate-100"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{editSaving ? 'जतन होत आहे...' : 'बदल जतन करा'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SQL View Modal */}
      {/* ==================================================== */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-700" />
                <span>Malaria Blood Samples - PostgreSQL / Supabase Schema</span>
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
{`-- राष्ट्रीय हिवताप नियंत्रण कार्यक्रम (NVBDCP)
-- 1. TABLE: malaria_blood_samples
create table if not exists malaria_blood_samples (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employee_master(id) on delete cascade,
  village_id uuid not null references village_master(id) on delete cascade,
  house_number text,
  patient_name text not null,
  age integer not null check (age > 0 and age <= 120),
  gender text not null check (gender in ('पुरुष', 'स्त्री', 'इतर')),
  sample_collection_date date not null default current_date,
  sample_number integer not null,
  sample_year integer not null,
  malaria_smear_code text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uq_employee_year_sample unique (employee_id, sample_year, sample_number)
);

-- 2. SEQUENTIAL GENERATOR FUNCTION
create or replace function get_next_malaria_sample_number(p_employee_id uuid, p_sample_year int)
returns int as $$
declare
  v_next_num int;
begin
  select coalesce(max(sample_number), 0) + 1
  into v_next_num
  from malaria_blood_samples
  where employee_id = p_employee_id and sample_year = p_sample_year;

  return v_next_num;
end;
$$ language plpgsql;`}
              </pre>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">
                फाइल: <code className="text-emerald-700">supabase/schema.sql</code>
              </span>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-lg font-semibold"
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
