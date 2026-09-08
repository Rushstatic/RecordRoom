import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarCheck,
  PlusCircle,
  FileSpreadsheet,
  Send,
  Target,
  CloudOff,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Home,
  MapPin,
  User,
  Building2,
  Sparkles,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  X,
  Search,
  Filter,
  ArrowRight,
  Wifi,
  WifiOff,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import {
  PageId,
  MalariaBloodSample,
  GenderType,
  VillageMaster,
  EmployeeMaster,
  SubcentreMaster,
  PhcMaster,
  MalariaTarget,
  OfflineMalariaDraft,
} from '../types';
import { useAuth } from '../hooks/useAuth';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { malariaService, formatIndianDate } from '../services/malariaService';
import { masterDataService } from '../services/masterDataService';
import { templateService } from '../services/templateService';
import { RecordRegisterTemplate } from '../types';
import { targetService } from '../services/targetService';
import { offlineDraftService } from '../services/offlineDraftService';
import { auditService } from '../services/auditService';

interface DailyWorkPageProps {
  onNavigate: (page: PageId) => void;
}

export const DailyWorkPage: React.FC<DailyWorkPageProps> = ({ onNavigate }) => {
  const { user, role } = useAuth();
  const { isOnline } = useNetworkStatus();
  const isPhcController = role === 'phc_controller';

  // Current Date Strings
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayFormattedMarathi = useMemo(() => {
    const d = new Date();
    const days = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
    const months = [
      'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
      'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'
    ];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  // Master Data & Records State
  const [loading, setLoading] = useState(true);
  const [phcs, setPhcs] = useState<PhcMaster[]>([]);
  const [subcentres, setSubcentres] = useState<SubcentreMaster[]>([]);
  const [villages, setVillages] = useState<VillageMaster[]>([]);
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [samples, setSamples] = useState<MalariaBloodSample[]>([]);
  const [drafts, setDrafts] = useState<OfflineMalariaDraft[]>([]);
  const [targets, setTargets] = useState<MalariaTarget[]>([]);
  const [dynamicTemplates, setDynamicTemplates] = useState<RecordRegisterTemplate[]>([]);

  // Filtering & Selection
  const [selectedVillageFilter, setSelectedVillageFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick Sample Entry Modal State
  const [showEntryModal, setShowEntryModal] = useState<boolean>(false);
  const [entryPhcId, setEntryPhcId] = useState<string>('');
  const [entrySubcentreId, setEntrySubcentreId] = useState<string>('');
  const [entryEmployeeId, setEntryEmployeeId] = useState<string>('');
  const [entrySmearCode, setEntrySmearCode] = useState<string>('');
  const [entryVillageId, setEntryVillageId] = useState<string>('');
  const [entryHouseNumber, setEntryHouseNumber] = useState<string>('');
  const [entryPatientName, setEntryPatientName] = useState<string>('');
  const [entryAge, setEntryAge] = useState<string>('');
  const [entryGender, setEntryGender] = useState<GenderType>('पुरुष');
  const [entryCollectionDate, setEntryCollectionDate] = useState<string>(todayStr);

  // Form Validation & Alerts State
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    existingSampleNumber?: number | string;
    message: string;
  } | null>(null);
  const [pastDateConfirm, setPastDateConfirm] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<{
    message: string;
    sampleNumber?: number | string;
    isDraft?: boolean;
  } | null>(null);

  // View / Edit / Delete Modal States
  const [viewSample, setViewSample] = useState<MalariaBloodSample | null>(null);
  const [editingSample, setEditingSample] = useState<MalariaBloodSample | null>(null);
  const [editVillageId, setEditVillageId] = useState<string>('');
  const [editHouseNumber, setEditHouseNumber] = useState<string>('');
  const [editPatientName, setEditPatientName] = useState<string>('');
  const [editAge, setEditAge] = useState<string>('');
  const [editGender, setEditGender] = useState<GenderType>('पुरुष');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState<boolean>(false);

  const [deleteSampleTarget, setDeleteSampleTarget] = useState<MalariaBloodSample | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [deleting, setDeleting] = useState<boolean>(false);

  // Load All Relevant Data
  const loadDailyWorkData = useCallback(async () => {
    setLoading(true);
    try {
      const [phcData, subData, vilData, empData, allSamples, allTargets] = await Promise.all([
        masterDataService.getPhcs(),
        masterDataService.getSubcentres(),
        masterDataService.getVillages(),
        masterDataService.getEmployees(),
        malariaService.getSamples(),
        targetService.getTargets(),
      ]);

      setPhcs(phcData);
      setSubcentres(subData);
      setVillages(vilData);
      setEmployees(empData);
      setSamples(allSamples);
      setTargets(allTargets);

      // Load offline drafts
      const offlineDrafts = offlineDraftService.getDrafts(user);
      setDrafts(offlineDrafts);
    } catch (err) {
      console.error('Failed to load daily work data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDailyWorkData();

    // Listen to sync updates
    const handleSyncChange = () => {
      setDrafts(offlineDraftService.getDrafts(user));
    };
    window.addEventListener('arogya-sync-status-changed', handleSyncChange);
    return () => {
      window.removeEventListener('arogya-sync-status-changed', handleSyncChange);
    };
  }, [loadDailyWorkData, user]);

  // Current Employee Profile Info
  const currentEmployee = useMemo(() => {
    if (user?.employeeId) {
      return employees.find((e) => e.id === user.employeeId);
    }
    // Fallback: match by employee name or role
    if (user?.marathiName) {
      return employees.find((e) => e.employee_name.includes(user.marathiName));
    }
    return null;
  }, [employees, user]);

  const currentSubcentre = useMemo(() => {
    if (currentEmployee?.subcentre_id) {
      return subcentres.find((s) => s.id === currentEmployee.subcentre_id);
    }
    if (user?.subcentreId) {
      return subcentres.find((s) => s.id === user.subcentreId);
    }
    return null;
  }, [subcentres, currentEmployee, user]);

  const currentPhc = useMemo(() => {
    if (currentSubcentre?.phc_id) {
      return phcs.find((p) => p.id === currentSubcentre.phc_id);
    }
    if (user?.phcId) {
      return phcs.find((p) => p.id === user.phcId);
    }
    return null;
  }, [phcs, currentSubcentre, user]);

  // Assigned Villages for current Subcentre
  const assignedVillages = useMemo(() => {
    if (currentSubcentre) {
      return villages.filter((v) => v.subcentre_id === currentSubcentre.id);
    }
    return villages;
  }, [villages, currentSubcentre]);

  // Set Default values for Quick Entry Form based on Logged-in User
  useEffect(() => {
    if (!isPhcController) {
      if (currentPhc) setEntryPhcId(currentPhc.id);
      if (currentSubcentre) setEntrySubcentreId(currentSubcentre.id);
      if (currentEmployee) {
        setEntryEmployeeId(currentEmployee.id);
        setEntrySmearCode(currentEmployee.malaria_smear_code || 'JTG-ANM-1');
      }
      if (assignedVillages.length > 0 && !entryVillageId) {
        setEntryVillageId(assignedVillages[0].id);
      }
    } else {
      // PHC Controller fallback initial defaults
      if (phcs.length > 0 && !entryPhcId) setEntryPhcId(phcs[0].id);
    }
  }, [isPhcController, currentPhc, currentSubcentre, currentEmployee, assignedVillages, phcs, entryVillageId]);

  // When PHC Controller changes Subcentre, cascade update
  const handleControllerSubcentreChange = (subId: string) => {
    setEntrySubcentreId(subId);
    const sub = subcentres.find((s) => s.id === subId);
    if (sub) {
      const emps = employees.filter((e) => e.subcentre_id === subId);
      if (emps.length > 0) {
        setEntryEmployeeId(emps[0].id);
        setEntrySmearCode(emps[0].malaria_smear_code);
      }
      const vils = villages.filter((v) => v.subcentre_id === subId);
      if (vils.length > 0) {
        setEntryVillageId(vils[0].id);
      }
    }
  };

  // When PHC Controller changes Employee
  const handleControllerEmployeeChange = (empId: string) => {
    setEntryEmployeeId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      setEntrySmearCode(emp.malaria_smear_code);
    }
  };

  // Open Quick Entry Modal with optional preselected Village
  const openQuickEntryModal = (villageId?: string) => {
    setFormError(null);
    setDuplicateWarning(null);
    setPastDateConfirm(null);
    setEntryCollectionDate(todayStr);
    setEntryHouseNumber('');
    setEntryPatientName('');
    setEntryAge('');
    setEntryGender('पुरुष');
    if (villageId) {
      setEntryVillageId(villageId);
    } else if (assignedVillages.length > 0 && !entryVillageId) {
      setEntryVillageId(assignedVillages[0].id);
    }
    setShowEntryModal(true);
  };

  // Scope filter: If Subcentre Employee, restrict to their subcentre/employee
  const userScopedSamples = useMemo(() => {
    if (isPhcController) return samples;
    if (currentSubcentre) {
      return samples.filter((s) => s.subcentre_id === currentSubcentre.id || s.employee_id === user?.employeeId);
    }
    return samples;
  }, [samples, isPhcController, currentSubcentre, user]);

  // Today's Samples
  const todaySamples = useMemo(() => {
    return userScopedSamples.filter((s) => s.sample_collection_date === todayStr);
  }, [userScopedSamples, todayStr]);

  // Filtered Today's Samples (Village Filter & Search)
  const filteredTodaySamples = useMemo(() => {
    let result = [...todaySamples];
    if (selectedVillageFilter !== 'all') {
      result = result.filter((s) => s.village_id === selectedVillageFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.patient_name.toLowerCase().includes(q) ||
          s.house_number.toLowerCase().includes(q) ||
          (s.village_name && s.village_name.toLowerCase().includes(q)) ||
          String(s.sample_number).includes(q)
      );
    }
    return result;
  }, [todaySamples, selectedVillageFilter, searchQuery]);

  // Today's Summary Metrics (Live Data)
  const todaySummary = useMemo(() => {
    const totalCollected = todaySamples.length;
    const sentCount = todaySamples.filter((s) => Boolean(s.sent_date)).length;
    const pendingCount = todaySamples.filter((s) => !s.sent_date).length;

    // Drafts created today
    const todayDrafts = drafts.filter((d) => d.sample_collection_date === todayStr);
    const syncFailed = drafts.filter((d) => d.sync_status === 'ERROR');

    return {
      totalCollected,
      sentCount,
      pendingCount,
      offlineDraftsCount: todayDrafts.length,
      syncFailedCount: syncFailed.length,
    };
  }, [todaySamples, drafts, todayStr]);

  // All pending samples for current user (including earlier dates awaiting dispatch)
  const allPendingSamples = useMemo(() => {
    return userScopedSamples.filter((s) => !s.sent_date);
  }, [userScopedSamples]);

  // Target Calculation (Monthly & Daily Pro-rated)
  const targetMetrics = useMemo(() => {
    const curDate = new Date();
    const curMonth = curDate.getMonth() + 1;
    const curYear = curDate.getFullYear();
    const daysInMonth = new Date(curYear, curMonth, 0).getDate();

    // Find relevant target for employee or subcentre
    let matchedTarget: MalariaTarget | undefined;
    if (currentEmployee) {
      matchedTarget = targets.find(
        (t) => t.employee_id === currentEmployee.id && t.target_year === curYear && t.target_month === curMonth
      );
    }
    if (!matchedTarget && currentSubcentre) {
      matchedTarget = targets.find(
        (t) => t.subcentre_id === currentSubcentre.id && t.target_year === curYear && t.target_month === curMonth
      );
    }
    if (!matchedTarget && currentPhc) {
      matchedTarget = targets.find(
        (t) => t.phc_id === currentPhc.id && t.target_year === curYear && t.target_month === curMonth
      );
    }

    const monthlyTarget = matchedTarget?.target_value || 50;
    const dailyTarget = Math.max(1, Math.round(monthlyTarget / daysInMonth));

    // Month to date actuals
    const monthActual = userScopedSamples.filter((s) => {
      const d = new Date(s.sample_collection_date);
      return d.getFullYear() === curYear && d.getMonth() + 1 === curMonth;
    }).length;

    const todayActual = todaySamples.length;
    const remainingToday = Math.max(0, dailyTarget - todayActual);
    const dailyPercent = Math.round((todayActual / dailyTarget) * 100);

    const remainingMonth = Math.max(0, monthlyTarget - monthActual);
    const monthlyPercent = Math.round((monthActual / monthlyTarget) * 100);

    return {
      dailyTarget,
      todayActual,
      remainingToday,
      dailyPercent,
      monthlyTarget,
      monthActual,
      remainingMonth,
      monthlyPercent,
      targetName: matchedTarget?.remarks || 'मासिक उद्दिष्ट',
    };
  }, [currentEmployee, currentSubcentre, currentPhc, targets, userScopedSamples, todaySamples]);

  // Village-level breakdown for filter chips
  const villageStats = useMemo(() => {
    return assignedVillages.map((v) => {
      const villageTodaySamples = todaySamples.filter((s) => s.village_id === v.id);
      const uniqueHouses = new Set(villageTodaySamples.map((s) => s.house_number.trim()).filter(Boolean));
      return {
        id: v.id,
        name: v.village_name,
        todayCount: villageTodaySamples.length,
        coveredHousesCount: uniqueHouses.size,
      };
    });
  }, [assignedVillages, todaySamples]);

  // Form Submit Handler with Date Safety, Duplicate Check, and Offline Support
  const handleQuickEntrySubmit = async (e: React.FormEvent, forceDuplicate = false, forcePastDate = false) => {
    e.preventDefault();
    setFormError(null);

    // 1. Mandatory Validations
    if (!entryVillageId) {
      setFormError('कृपया गाव निवडा.');
      return;
    }
    if (!entryPatientName.trim()) {
      setFormError('कृपया रुग्णाचे नाव प्रविष्ट करा.');
      return;
    }
    if (!entryAge || isNaN(Number(entryAge)) || Number(entryAge) <= 0 || Number(entryAge) > 120) {
      setFormError('कृपया वैध वय प्रविष्ट करा (१ ते १२०).');
      return;
    }
    if (!entryCollectionDate) {
      setFormError('कृपया नमुना संकलन दिनांक निवडा.');
      return;
    }

    // 2. Date Safety Validations (Requirement 10)
    if (entryCollectionDate > todayStr) {
      setFormError('भविष्यातील दिनांक स्वीकारला जात नाही. कृपया आजचा किंवा मागील दिनांक निवडा.');
      return;
    }

    if (entryCollectionDate < todayStr && !forcePastDate && !pastDateConfirm) {
      setPastDateConfirm(entryCollectionDate);
      return;
    }

    // 3. Duplicate Entry Warning (Requirement 9)
    if (!forceDuplicate && !duplicateWarning) {
      const isDuplicate = todaySamples.some(
        (s) =>
          s.village_id === entryVillageId &&
          s.house_number.trim().toLowerCase() === entryHouseNumber.trim().toLowerCase() &&
          s.patient_name.trim().toLowerCase() === entryPatientName.trim().toLowerCase()
      );

      if (isDuplicate) {
        const existing = todaySamples.find(
          (s) =>
            s.village_id === entryVillageId &&
            s.patient_name.trim().toLowerCase() === entryPatientName.trim().toLowerCase()
        );
        setDuplicateWarning({
          existingSampleNumber: existing?.sample_number,
          message: 'याच रुग्णाची / घराची नोंद आज आधीच उपलब्ध आहे. तरीही नोंद करायची आहे का?',
        });
        return;
      }
    }

    // 4. Save Record
    setSubmitting(true);
    try {
      const selectedVillage = villages.find((v) => v.id === entryVillageId);
      const selectedSubcentre = subcentres.find((s) => s.id === entrySubcentreId) || currentSubcentre;
      const selectedPhc = phcs.find((p) => p.id === entryPhcId) || currentPhc;
      const selectedEmp = employees.find((e) => e.id === entryEmployeeId) || currentEmployee;

      // OFFLINE MODE (Requirement 11)
      if (!isOnline) {
        if (!user) {
          throw new Error('वापरकर्ता लॉगिन आवश्यक आहे.');
        }
        const savedDraft = await offlineDraftService.saveDraft(
          {
            employee_id: entryEmployeeId || currentEmployee?.id || '',
            village_id: entryVillageId,
            house_number: entryHouseNumber.trim(),
            patient_name: entryPatientName.trim(),
            age: Number(entryAge),
            gender: entryGender,
            sample_collection_date: entryCollectionDate,
            sample_year: new Date(entryCollectionDate).getFullYear(),
            malaria_smear_code: entrySmearCode || 'JTG-ANM-1',
            village_name: selectedVillage?.village_name,
            employee_name: selectedEmp?.employee_name,
            subcentre_name: selectedSubcentre?.subcentre_name,
            phc_name: selectedPhc?.phc_name,
          },
          user
        );

        // Audit Trail
        await auditService.logAction({
          action: 'QUICK_ACTION',
          module: 'Daily Work',
          record_id: savedDraft.local_id,
          record_description: `ऑफलाइन ड्राफ्ट जतन: ${entryPatientName} (${selectedVillage?.village_name || ''})`,
          new_values: {
            is_draft: true,
            patient_name: entryPatientName,
            village_name: selectedVillage?.village_name,
            date: entryCollectionDate,
          },
          user,
        });

        setSuccessToast({
          message: 'इंटरनेट उपलब्ध नसल्यामुळे नमुना ऑफलाइन ड्राफ्ट म्हणून जतन केला. सिंक झाल्यावर अंतिम नमुना क्रमांक मिळेल.',
          isDraft: true,
        });
      } else {
        // ONLINE MODE: Calculate final sample number via malariaService
        const sampleYear = new Date(entryCollectionDate).getFullYear();
        const nextNum = await malariaService.getNextSampleNumber(
          entryEmployeeId || currentEmployee?.id || '',
          sampleYear
        );

        const newSample = await malariaService.saveSample({
          employee_id: entryEmployeeId || currentEmployee?.id || '',
          village_id: entryVillageId,
          house_number: entryHouseNumber.trim(),
          patient_name: entryPatientName.trim(),
          age: Number(entryAge),
          gender: entryGender,
          sample_collection_date: entryCollectionDate,
          sample_number: nextNum,
          sample_year: sampleYear,
          malaria_smear_code: entrySmearCode || selectedEmp?.malaria_smear_code || 'JTG-ANM-1',
          sent_date: null,
          village_name: selectedVillage?.village_name,
          subcentre_name: selectedSubcentre?.subcentre_name,
          subcentre_id: selectedSubcentre?.id,
          phc_name: selectedPhc?.phc_name,
          phc_id: selectedPhc?.id,
          employee_name: selectedEmp?.employee_name,
        });

        // Audit Trail (Requirement 13)
        await auditService.logAction({
          action: 'QUICK_ACTION',
          module: 'Daily Work',
          record_id: newSample.id,
          record_description: `दैनंदिन कामात नवीन नमुना नोंद: क्र. ${newSample.sample_number} - ${newSample.patient_name} (${newSample.village_name})`,
          new_values: {
            sample_number: newSample.sample_number,
            patient_name: newSample.patient_name,
            smear_code: newSample.malaria_smear_code,
            village: newSample.village_name,
            date: newSample.sample_collection_date,
          },
          user,
          subcentre_id: newSample.subcentre_id,
          phc_id: newSample.phc_id,
        });

        setSuccessToast({
          message: `रक्त नमुना क्रमांक ${newSample.sample_number} यशस्वीरित्या नोंदविला.`,
          sampleNumber: newSample.sample_number,
          isDraft: false,
        });
      }

      // Reset Modal Form & Close
      setShowEntryModal(false);
      setDuplicateWarning(null);
      setPastDateConfirm(null);
      setEntryPatientName('');
      setEntryHouseNumber('');
      setEntryAge('');

      // Reload live data
      await loadDailyWorkData();
    } catch (err: any) {
      setFormError(err?.message || 'नोंद जतन करताना त्रुटी आली.');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Sample Handler
  const handleOpenEdit = (sample: MalariaBloodSample) => {
    setEditingSample(sample);
    setEditVillageId(sample.village_id);
    setEditHouseNumber(sample.house_number);
    setEditPatientName(sample.patient_name);
    setEditAge(String(sample.age));
    setEditGender(sample.gender);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSample) return;
    if (!editPatientName.trim()) {
      setEditError('रुग्णाचे नाव आवश्यक आहे.');
      return;
    }
    if (!editAge || isNaN(Number(editAge)) || Number(editAge) <= 0) {
      setEditError('वैध वय आवश्यक आहे.');
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      const selectedVil = villages.find((v) => v.id === editVillageId);
      await malariaService.updateSample(editingSample.id, {
        village_id: editVillageId,
        village_name: selectedVil?.village_name || editingSample.village_name,
        house_number: editHouseNumber.trim(),
        patient_name: editPatientName.trim(),
        age: Number(editAge),
        gender: editGender,
      });

      await auditService.logAction({
        action: 'UPDATE',
        module: 'Daily Work',
        record_id: editingSample.id,
        record_description: `दैनंदिन कामात नमुना सुधारणा: क्र. ${editingSample.sample_number} - ${editPatientName.trim()}`,
        old_values: {
          patient_name: editingSample.patient_name,
          house_number: editingSample.house_number,
          age: editingSample.age,
        },
        new_values: {
          patient_name: editPatientName.trim(),
          house_number: editHouseNumber.trim(),
          age: Number(editAge),
        },
        user,
      });

      setEditingSample(null);
      await loadDailyWorkData();
      setSuccessToast({
        message: `नमुना क्र. ${editingSample.sample_number} सुधारित केला.`,
      });
    } catch (err: any) {
      setEditError(err?.message || 'सुधारणा जतन करताना अडचण आली.');
    } finally {
      setEditSaving(false);
    }
  };

  // Delete Sample Handler
  const handleConfirmDelete = async () => {
    if (!deleteSampleTarget) return;
    setDeleting(true);
    try {
      await malariaService.deleteSample(deleteSampleTarget.id);

      await auditService.logAction({
        action: 'DELETE',
        module: 'Daily Work',
        record_id: deleteSampleTarget.id,
        record_description: `दैनंदिन नोंद रद्द: क्र. ${deleteSampleTarget.sample_number} - ${deleteSampleTarget.patient_name}. कारण: ${deleteReason || 'चुकीची नोंद'}`,
        old_values: {
          sample_number: deleteSampleTarget.sample_number,
          patient_name: deleteSampleTarget.patient_name,
          village: deleteSampleTarget.village_name,
        },
        user,
      });

      setDeleteSampleTarget(null);
      setDeleteReason('');
      await loadDailyWorkData();
      setSuccessToast({
        message: `नमुना क्र. ${deleteSampleTarget.sample_number} रद्द करण्यात आला.`,
      });
    } catch (err: any) {
      alert(err?.message || 'नमुना वगळताना त्रुटी आली.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      {/* SUCCESS TOAST NOTIFICATION */}
      {successToast && (
        <div className="bg-emerald-900 border-2 border-emerald-400 text-white p-4 rounded-xl shadow-lg flex items-start justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-300 shrink-0" />
            <div>
              <p className="font-bold text-sm sm:text-base">{successToast.message}</p>
              {successToast.sampleNumber && (
                <p className="text-xs text-emerald-200 mt-0.5">
                  अंतिम नमुना क्र: <span className="font-mono font-bold text-amber-300">{successToast.sampleNumber}</span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-300 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 1. HEADER SECTION (Requirement 1) */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 rounded-2xl p-4 sm:p-6 text-white shadow-md border border-emerald-700/70">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-bold uppercase tracking-wider">
              <CalendarCheck className="w-4 h-4 text-amber-400" />
              <span>आजचे काम (Daily Work & Quick Actions)</span>
              <span className="bg-emerald-950/80 text-emerald-200 text-[10px] px-2 py-0.5 rounded-full border border-emerald-600/50">
                {todayFormattedMarathi}
              </span>
              {isOnline ? (
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/40">
                  <Wifi className="w-3 h-3 text-emerald-300" />
                  <span>Online</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-amber-500/30 text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-400/50">
                  <WifiOff className="w-3 h-3 text-amber-300" />
                  <span>Offline Mode</span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{user?.marathiName || 'आरोग्य कर्मचारी'}</span>
              <span className="text-xs sm:text-sm font-normal text-emerald-200 bg-emerald-800/80 px-2.5 py-0.5 rounded-full border border-emerald-600">
                {currentEmployee?.designation || (isPhcController ? 'PHC नियंत्रक' : 'आरोग्य सेविका / MPW')}
              </span>
            </h1>

            {/* Institution Badges */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-emerald-100/90 pt-1">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>PHC: <strong>{currentPhc?.phc_name || user?.phcName || 'प्रा.आ. केंद्र, वडगाव'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>उपकेंद्र: <strong>{currentSubcentre?.subcentre_name || user?.assignedSubcentre || 'आरोग्य उपकेंद्र, जातेगाव'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Smear Code: <strong className="font-mono text-amber-200">{entrySmearCode || currentEmployee?.malaria_smear_code || 'JTG-ANM-1'}</strong></span>
              </div>
            </div>
          </div>

          {/* Top Quick Refresh & Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="daily-work-refresh-btn"
              type="button"
              onClick={loadDailyWorkData}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2.5 rounded-xl border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">डेटा रिफ्रेश</span>
            </button>
            <button
              id="daily-work-header-quick-entry-btn"
              type="button"
              onClick={() => openQuickEntryModal()}
              className="bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>+ नवीन रक्त नमुना</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. QUICK ACTION CARDS (Requirement 2) */}
      <div>
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
          <span>जलद कृती (Quick Action Cards)</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {/* Card 1: नवीन रक्त नमुना */}
          <button
            id="quick-card-new-sample"
            type="button"
            onClick={() => openQuickEntryModal()}
            className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-300 text-slate-900 hover:shadow-md hover:border-emerald-500 transition-all text-left flex flex-col justify-between h-28 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shadow-xs">
              🩸
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">नवीन रक्त नमुना</span>
              <span className="text-[10px] text-emerald-800 font-medium">नोंद करा</span>
            </div>
          </button>

          {/* Card 2: आजच्या नोंदी */}
          <button
            id="quick-card-today-records"
            type="button"
            onClick={() => {
              const el = document.getElementById('today-sample-list-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-200 text-slate-900 hover:shadow-md hover:border-blue-400 transition-all text-left flex flex-col justify-between h-28 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shadow-xs">
              📋
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">आजच्या नोंदी</span>
              <span className="text-[10px] text-blue-700 font-medium">{todaySummary.totalCollected} नमुने</span>
            </div>
          </button>

          {/* Card 3: नमुने पाठवा */}
          <button
            id="quick-card-send-samples"
            type="button"
            onClick={() => onNavigate('send-samples')}
            className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-300 text-slate-900 hover:shadow-md hover:border-amber-400 transition-all text-left flex flex-col justify-between h-28 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shadow-xs">
              📤
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">नमुने पाठवा</span>
              <span className="text-[10px] text-amber-800 font-medium">
                {todaySummary.pendingCount > 0 ? `${todaySummary.pendingCount} बाकी` : 'सर्व पाठविले'}
              </span>
            </div>
          </button>

          {/* Card 4: आजची प्रगती */}
          <button
            id="quick-card-target-progress"
            type="button"
            onClick={() => {
              const el = document.getElementById('daily-target-progress-card');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/60 border border-purple-200 text-slate-900 hover:shadow-md hover:border-purple-400 transition-all text-left flex flex-col justify-between h-28 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shadow-xs">
              🎯
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">आजची प्रगती</span>
              <span className="text-[10px] text-purple-700 font-medium">{targetMetrics.dailyPercent}% साध्य</span>
            </div>
          </button>

          {/* Card 5: Offline Drafts */}
          <button
            id="quick-card-offline-drafts"
            type="button"
            onClick={() => onNavigate('offline-drafts')}
            className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-300 text-slate-900 hover:shadow-md hover:border-slate-400 transition-all text-left flex flex-col justify-between h-28 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-700 text-white flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shadow-xs">
              📴
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">Offline Drafts</span>
              <span className="text-[10px] text-slate-600 font-medium">{drafts.length} स्थानिक</span>
            </div>
          </button>

          {/* Card 6: आजचा अहवाल */}
          <button
            id="quick-card-daily-report"
            type="button"
            onClick={() => onNavigate('malaria-reports')}
            className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100/60 border border-teal-200 text-slate-900 hover:shadow-md hover:border-teal-400 transition-all text-left flex flex-col justify-between h-28 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shadow-xs">
              📊
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">आजचा अहवाल</span>
              <span className="text-[10px] text-teal-700 font-medium">M1/M2 पहा</span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. TODAY'S SUMMARY METRICS (Requirement 3) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1 */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">आज घेतलेले नमुने</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{todaySummary.totalCollected}</span>
            <span className="text-[10px] text-slate-400">नमुने</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
            {todaySummary.totalCollected > 0 ? 'आजची सक्रिय नोंद' : 'नोंद बाकी'}
          </span>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">आज पाठविलेले</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-blue-700">{todaySummary.sentCount}</span>
            <span className="text-[10px] text-slate-400">रवाना</span>
          </div>
          <span className="text-[10px] text-blue-600 font-semibold mt-1 block">
            PHC कडे पाठवले
          </span>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">अजून पाठवायचे</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black ${todaySummary.pendingCount > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
              {todaySummary.pendingCount}
            </span>
            <span className="text-[10px] text-slate-400">प्रलंबित</span>
          </div>
          <span className="text-[10px] text-amber-600 font-semibold mt-1 block">
            {todaySummary.pendingCount > 0 ? 'नमुना पाठवणे आवश्यक' : 'सर्व अद्ययावत'}
          </span>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">आजचे Offline Drafts</span>
            <CloudOff className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-800">{todaySummary.offlineDraftsCount}</span>
            <span className="text-[10px] text-slate-400">ड्राफ्ट</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold mt-1 block">
            लोकल मेमरीमध्ये सुरक्षित
          </span>
        </div>

        {/* Metric 5 */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Sync Failed Records</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black ${todaySummary.syncFailedCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {todaySummary.syncFailedCount}
            </span>
            <span className="text-[10px] text-slate-400">त्रुटी</span>
          </div>
          <span className={`text-[10px] font-semibold mt-1 block ${todaySummary.syncFailedCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {todaySummary.syncFailedCount > 0 ? 'कृपया पुन्हा प्रयत्न करा' : 'सिंक परिपूर्ण'}
          </span>
        </div>
      </div>

      {/* 6. PENDING DISPATCH SHORTCUT & ALERT (Requirement 6) */}
      {allPendingSamples.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 sm:p-5 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-amber-900">
                आज एकूण {allPendingSamples.length} रक्त नमुने पाठविणे बाकी आहे.
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                प्राथमिक आरोग्य केंद्रात (PHC) लवकरात लवकर नमुने पाठवून डिस्पॅच पावती प्रिंट करा.
              </p>
            </div>
          </div>
          <button
            id="daily-work-goto-dispatch-btn"
            type="button"
            onClick={() => onNavigate('send-samples')}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <span>आता नमुने पाठवा (Send Samples)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 7. DAILY & MONTHLY TARGET PROGRESS (Requirement 7) */}
      <div id="daily-target-progress-card" className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-700" />
              <span>आजची व चालू महिन्याची उद्दिष्ट प्रगती (Target vs Actual Progress)</span>
            </h2>
            <p className="text-xs text-slate-500">
              {targetMetrics.targetName} - CODE 8 प्रमाणित उद्दिष्ट साध्यता
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              दैनिक लक्ष्य: <strong>{targetMetrics.dailyTarget}</strong> नमुने
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              मासिक लक्ष्य: <strong>{targetMetrics.monthlyTarget}</strong> नमुने
            </span>
          </div>
        </div>

        {/* Progress Bars (Daily & Monthly) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Daily Progress */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>आजचे संकलन (Daily Target):</span>
              <span className="font-bold">
                {targetMetrics.todayActual} / {targetMetrics.dailyTarget} नमुने ({targetMetrics.dailyPercent > 100 ? `${targetMetrics.dailyPercent}% (100%+)` : `${targetMetrics.dailyPercent}%`})
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  targetMetrics.dailyPercent >= 100
                    ? 'bg-emerald-600'
                    : targetMetrics.dailyPercent >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, targetMetrics.dailyPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span>आज बाकी: <strong>{targetMetrics.remainingToday} नमुने</strong></span>
              {targetMetrics.dailyPercent >= 100 ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>दैनिक लक्ष्य पूर्ण!</span>
                </span>
              ) : (
                <span className="text-amber-700 font-medium">प्रगतीपथावर</span>
              )}
            </div>
          </div>

          {/* Monthly Progress */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>चालू महिना संकलन (Monthly Progress):</span>
              <span className="font-bold">
                {targetMetrics.monthActual} / {targetMetrics.monthlyTarget} नमुने ({targetMetrics.monthlyPercent > 100 ? `${targetMetrics.monthlyPercent}% (100%+)` : `${targetMetrics.monthlyPercent}%`})
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  targetMetrics.monthlyPercent >= 100
                    ? 'bg-teal-600'
                    : targetMetrics.monthlyPercent >= 50
                    ? 'bg-blue-600'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, targetMetrics.monthlyPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span>महिन्याचे बाकी: <strong>{targetMetrics.remainingMonth} नमुने</strong></span>
              <span className="text-slate-600 font-medium">चालू महिना अखेरपर्यंत</span>
            </div>
          </div>
        </div>
      </div>

      {/* 8. VILLAGE QUICK FILTER (Requirement 8) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-700" />
              <span>गावनिहाय द्रुत फिल्टर (Village Quick Filter)</span>
            </h2>
            <p className="text-xs text-slate-500">
              उपकेंद्राशी संलग्न गावांचे आजचे नमुने व कव्हर झालेली घरे
            </p>
          </div>

          {selectedVillageFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedVillageFilter('all')}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline"
            >
              सर्व गावे दाखवा
            </button>
          )}
        </div>

        {/* Village Filter Chips */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* All Village Chip */}
          <button
            type="button"
            onClick={() => setSelectedVillageFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              selectedVillageFilter === 'all'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>सर्व गावे (All)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedVillageFilter === 'all' ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {todaySamples.length}
            </span>
          </button>

          {/* Individual Village Chips */}
          {villageStats.map((v) => {
            const isSelected = selectedVillageFilter === v.id;
            return (
              <div
                key={v.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-1 ring-emerald-600'
                    : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedVillageFilter(v.id)}
                  className="text-left text-xs font-semibold cursor-pointer"
                >
                  <span>{v.name}</span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span>आज: <strong>{v.todayCount}</strong></span>
                    <span>घरे: <strong>{v.coveredHousesCount}</strong></span>
                  </div>
                </button>
                <button
                  type="button"
                  title={`${v.name} साठी नवीन नोंद`}
                  onClick={() => openQuickEntryModal(v.id)}
                  className="ml-1 p-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition-colors cursor-pointer"
                >
                  + नोंद
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. TODAY'S SAMPLE LIST (Requirement 5) */}
      <div id="today-sample-list-section" className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>आजचे घेतलेले रक्त नमुने (Today's Sample List)</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                {filteredTodaySamples.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              आजच्या दिनांकाचे सर्व नमुने. येथे थेट पाहणे, दुरुस्ती (Edit) किंवा रद्द (Delete) करू शकता.
            </p>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2 w-full md:w-72">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="रुग्ण, घर क्र., नमुना क्र. शोधा..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 px-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {filteredTodaySamples.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">आज अजून कोणताही रक्त नमुना नोंदविलेला नाही.</p>
              <p className="text-xs text-slate-400 mt-1">
                {selectedVillageFilter !== 'all'
                  ? 'निवडलेल्या गावासाठी आज नोंदी नाहीत. सर्व गावे निवडा किंवा नवीन नमुना नोंदवा.'
                  : 'दिवसभराच्या कामाची सुरुवात करण्यासाठी खालील बटण दाबून पहिली नोंद करा.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openQuickEntryModal(selectedVillageFilter !== 'all' ? selectedVillageFilter : undefined)}
              className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-300" />
              <span>+ आजचा पहिला रक्त नमुना नोंदवा</span>
            </button>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">नमुना क्र.</th>
                    <th className="py-2.5 px-3">रुग्णाचे नाव</th>
                    <th className="py-2.5 px-3">गाव</th>
                    <th className="py-2.5 px-3">घर क्र.</th>
                    <th className="py-2.5 px-3">वय / लिंग</th>
                    <th className="py-2.5 px-3">Smear Code</th>
                    <th className="py-2.5 px-3">स्थिती</th>
                    <th className="py-2.5 px-3 text-right">कृती</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTodaySamples.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-900">
                        #{s.sample_number}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {s.patient_name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {s.village_name || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {s.house_number || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        {s.age} वर्ष / {s.gender}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {s.malaria_smear_code || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        {s.sent_date ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                            <span>पाठविले ({formatIndianDate(s.sent_date)})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>पाठवणे बाकी</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            title="तपशील पहा"
                            onClick={() => setViewSample(s)}
                            className="p-1 text-slate-500 hover:text-emerald-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="दुरुस्ती करा"
                            onClick={() => handleOpenEdit(s)}
                            className="p-1 text-slate-500 hover:text-blue-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="नोंद रद्द करा"
                            onClick={() => setDeleteSampleTarget(s)}
                            className="p-1 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (Requirement 14) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredTodaySamples.map((s) => (
                <div key={s.id} className="p-3.5 space-y-2 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          #{s.sample_number}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{s.patient_name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        गाव: <strong>{s.village_name || '-'}</strong> | घर क्र.: <strong>{s.house_number || '-'}</strong>
                      </p>
                    </div>

                    {s.sent_date ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 shrink-0">
                        पाठविले
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                        बाकी
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <span>{s.age} वर्ष / {s.gender}</span>
                    <span className="font-mono text-[10px] text-slate-400">{s.malaria_smear_code}</span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setViewSample(s)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>पहा</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(s)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-blue-600" />
                      <span>बदला</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteSampleTarget(s)}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>रद्द</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. QUICK SAMPLE ENTRY MODAL (Requirement 4, 9, 10, 11) */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-scale-in">
            {/* Modal Header */}
            <div className="bg-emerald-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-800 border border-emerald-700 flex items-center justify-center text-amber-300 font-bold">
                  🩸
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">नवीन रक्त नमुना नोंद (Quick Entry)</h3>
                  <p className="text-xs text-emerald-200">
                    {isOnline ? 'Online Supabase सिंक' : 'Offline Draft जतन होईल'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Error Banner */}
            {formError && (
              <div className="p-3.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Past Date Confirmation Warning (Requirement 10) */}
            {pastDateConfirm && (
              <div className="p-3.5 bg-amber-50 border-b border-amber-300 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>आपण मागील दिनांकाची ({formatIndianDate(pastDateConfirm)}) नोंद करीत आहात. कृपया दिनांक तपासा.</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  जर हा मागील दिवसाचा संकलित नमुना असेल तर खालील बटण दाबून खात्री करा.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={(e) => handleQuickEntrySubmit(e, false, true)}
                    className="bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs hover:bg-amber-700 cursor-pointer"
                  >
                    होय, मागील दिनांक कायम ठेवा
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPastDateConfirm(null);
                      setEntryCollectionDate(todayStr);
                    }}
                    className="bg-white border border-amber-300 text-amber-900 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-100 cursor-pointer"
                  >
                    आजचा दिनांक लावा
                  </button>
                </div>
              </div>
            )}

            {/* Duplicate Warning Prompt (Requirement 9) */}
            {duplicateWarning && (
              <div className="p-3.5 bg-amber-50 border-b border-amber-300 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{duplicateWarning.message}</span>
                </div>
                {duplicateWarning.existingSampleNumber && (
                  <p className="text-[11px] text-amber-800">
                    यापूर्वीचा नमुना क्रमांक: <strong>#{duplicateWarning.existingSampleNumber}</strong>
                  </p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={(e) => handleQuickEntrySubmit(e, true, true)}
                    className="bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs hover:bg-emerald-800 cursor-pointer"
                  >
                    होय, तरीही नोंद करा (Duplicate Allow)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateWarning(null)}
                    className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    रद्द करा / मागे जा
                  </button>
                </div>
              </div>
            )}

            {/* Modal Body Form */}
            <form onSubmit={(e) => handleQuickEntrySubmit(e, false, false)} className="p-4 sm:p-5 space-y-4">
              {/* Institution Pre-filled info for Subcentre Employee / Cascading for Controller */}
              {!isPhcController ? (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">PHC</span>
                    <strong className="text-slate-900">{currentPhc?.phc_name || 'प्रा.आ.के., वडगाव'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">उपकेंद्र</span>
                    <strong className="text-slate-900">{currentSubcentre?.subcentre_name || 'जातेगाव'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">कर्मचारी</span>
                    <strong className="text-slate-900">{currentEmployee?.employee_name || user?.marathiName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Smear Code</span>
                    <strong className="font-mono text-emerald-800 font-bold">{entrySmearCode}</strong>
                  </div>
                </div>
              ) : (
                /* Cascading selectors for PHC Controller */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">उपकेंद्र निवडा *</label>
                    <select
                      value={entrySubcentreId}
                      onChange={(e) => handleControllerSubcentreChange(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      {subcentres.map((s) => (
                        <option key={s.id} value={s.id}>{s.subcentre_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">कर्मचारी निवडा *</label>
                    <select
                      value={entryEmployeeId}
                      onChange={(e) => handleControllerEmployeeChange(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      {employees
                        .filter((e) => !entrySubcentreId || e.subcentre_id === entrySubcentreId)
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.employee_name} ({e.malaria_smear_code})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Village & House Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">गाव निवडा *</label>
                  <select
                    value={entryVillageId}
                    onChange={(e) => setEntryVillageId(e.target.value)}
                    required
                    className="w-full text-xs sm:text-sm p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    {assignedVillages.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.village_name} {v.is_headquarter ? '(मुख्यालय)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">घर क्रमांक</label>
                  <input
                    type="text"
                    value={entryHouseNumber}
                    onChange={(e) => setEntryHouseNumber(e.target.value)}
                    placeholder="उदा. 45/A, 112"
                    className="w-full text-xs sm:text-sm p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Patient Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">रुग्णाचे पूर्ण नाव *</label>
                <input
                  type="text"
                  value={entryPatientName}
                  onChange={(e) => setEntryPatientName(e.target.value)}
                  placeholder="उदा. रमेश सखाराम जाधव"
                  required
                  className="w-full text-xs sm:text-sm p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Age & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">वय (वर्षे) *</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={entryAge}
                    onChange={(e) => setEntryAge(e.target.value)}
                    placeholder="उदा. 35"
                    required
                    className="w-full text-xs sm:text-sm p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">लिंग *</label>
                  <select
                    value={entryGender}
                    onChange={(e) => setEntryGender(e.target.value as GenderType)}
                    className="w-full text-xs sm:text-sm p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="पुरुष">पुरुष</option>
                    <option value="स्त्री">स्त्री</option>
                    <option value="इतर">इतर</option>
                  </select>
                </div>
              </div>

              {/* Collection Date */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  नमुना संकलन दिनांक (Date of Collection) *
                </label>
                <input
                  type="date"
                  max={todayStr}
                  value={entryCollectionDate}
                  onChange={(e) => setEntryCollectionDate(e.target.value)}
                  required
                  className="w-full text-xs sm:text-sm p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  आजचा दिनांक आपोआप निवडला आहे. भविष्यातील दिनांक स्वीकारला जाणार नाही.
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>जतन होत आहे...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-amber-300" />
                      <span>रक्त नमुना नोंदवा</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW SAMPLE DETAILS MODAL */}
      {viewSample && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>नमुना क्रमांक #{viewSample.sample_number} तपशील</span>
              </h3>
              <button
                type="button"
                onClick={() => setViewSample(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block">रुग्णाचे नाव</span>
                  <strong className="text-slate-900 text-sm">{viewSample.patient_name}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">वय व लिंग</span>
                  <strong className="text-slate-900">{viewSample.age} वर्ष / {viewSample.gender}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">गाव</span>
                  <strong className="text-slate-900">{viewSample.village_name}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">घर क्रमांक</span>
                  <strong className="font-mono text-slate-900">{viewSample.house_number || '-'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">संकलन दिनांक</span>
                  <strong className="text-slate-900">{formatIndianDate(viewSample.sample_collection_date)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Smear Code</span>
                  <strong className="font-mono text-emerald-800">{viewSample.malaria_smear_code}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">उपकेंद्र</span>
                  <strong className="text-slate-900">{viewSample.subcentre_name}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">कर्मचारी</span>
                  <strong className="text-slate-900">{viewSample.employee_name}</strong>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-400 block">पाठविण्याची स्थिती (Dispatch Status)</span>
                {viewSample.sent_date ? (
                  <p className="text-blue-700 font-bold mt-0.5">
                    PHC कडे पाठविले ({formatIndianDate(viewSample.sent_date)})
                  </p>
                ) : (
                  <p className="text-amber-700 font-bold mt-0.5">
                    अजून पाठवायचे बाकी आहे (प्रलंबित)
                  </p>
                )}
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setViewSample(null)}
                className="bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer"
              >
                बंद करा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SAMPLE MODAL */}
      {editingSample && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            <div className="bg-blue-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>नमुना क्र. #{editingSample.sample_number} दुरुस्ती (Edit)</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingSample(null)}
                className="text-blue-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs border-b border-rose-200 font-medium">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">गाव निवडा</label>
                <select
                  value={editVillageId}
                  onChange={(e) => setEditVillageId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                >
                  {assignedVillages.map((v) => (
                    <option key={v.id} value={v.id}>{v.village_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">घर क्रमांक</label>
                <input
                  type="text"
                  value={editHouseNumber}
                  onChange={(e) => setEditHouseNumber(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">रुग्णाचे नाव *</label>
                <input
                  type="text"
                  value={editPatientName}
                  onChange={(e) => setEditPatientName(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">वय *</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">लिंग *</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as GenderType)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="पुरुष">पुरुष</option>
                    <option value="स्त्री">स्त्री</option>
                    <option value="इतर">इतर</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingSample(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  रद्द
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="bg-blue-800 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  {editSaving ? 'जतन होत आहे...' : 'बदल जतन करा'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteSampleTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            <div className="bg-rose-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-300" />
                <span>नोंद रद्द करणे (Delete)</span>
              </h3>
              <button
                type="button"
                onClick={() => setDeleteSampleTarget(null)}
                className="text-rose-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-3 text-xs">
              <p className="text-slate-800 font-medium leading-relaxed">
                आपण नमुना क्र. <strong>#{deleteSampleTarget.sample_number}</strong> ({deleteSampleTarget.patient_name}) रद्द करू इच्छिता काय?
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">रद्द करण्याचे कारण:</label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="उदा. चुकीची डबल नोंद, रुग्ण नाव बदल"
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteSampleTarget(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                मागे जा
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer"
              >
                {deleting ? 'रद्द होत आहे...' : 'होय, रद्द करा'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 14. STICKY BOTTOM BUTTON FOR MOBILE (Requirement 14) */}
      <div className="fixed bottom-18 right-4 md:hidden z-40">
        <button
          id="mobile-sticky-quick-entry-btn"
          type="button"
          onClick={() => openQuickEntryModal()}
          className="bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-950 text-white font-black text-sm px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 border-2 border-amber-300 cursor-pointer transform active:scale-95 transition-transform"
        >
          <PlusCircle className="w-5 h-5 text-amber-300" />
          <span>+ नवीन रक्त नमुना</span>
        </button>
      </div>
    </div>
  );
};
