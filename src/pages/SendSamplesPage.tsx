import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Send,
  Printer,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  CheckSquare,
  Square,
  Building2,
  Home,
  MapPin,
  Users,
  RotateCcw,
  FileCheck,
  FileSpreadsheet,
  ChevronRight,
  Info,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import {
  MalariaBloodSample,
  PhcMaster,
  SubcentreMaster,
  VillageMaster,
  EmployeeMaster,
} from '../types';
import { masterDataService } from '../services/masterDataService';
import {
  malariaService,
  formatSampleNumber,
  formatIndianDate,
  getTodayIso,
} from '../services/malariaService';
import { MalariaPrintPreviewModal } from '../components/MalariaPrintPreviewModal';

type ActiveTab = 'pending' | 'sent-history';

export const SendSamplesPage: React.FC = () => {
  const { user, role } = useAuth();
  const { isOnline } = useNetworkStatus();
  const isPhcController = role === 'phc_controller';

  // Active View Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('pending');

  // Master Data State
  const [phcs, setPhcs] = useState<PhcMaster[]>([]);
  const [subcentres, setSubcentres] = useState<SubcentreMaster[]>([]);
  const [villages, setVillages] = useState<VillageMaster[]>([]);
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [allSamples, setAllSamples] = useState<MalariaBloodSample[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab 1: Pending Samples Filters
  const [pendingPhcId, setPendingPhcId] = useState<string>('');
  const [pendingSubcentreId, setPendingSubcentreId] = useState<string>('');
  const [pendingVillageId, setPendingVillageId] = useState<string>('');
  const [pendingEmployeeId, setPendingEmployeeId] = useState<string>('');
  const [pendingCollectionDate, setPendingCollectionDate] = useState<string>('');

  // Tab 1: Selection State
  const [selectedSampleIds, setSelectedSampleIds] = useState<string[]>([]);

  // Tab 2: Sent Samples History Filters
  const [historySentDate, setHistorySentDate] = useState<string>('');
  const [historyDateFrom, setHistoryDateFrom] = useState<string>('');
  const [historyDateTo, setHistoryDateTo] = useState<string>('');
  const [historyPhcId, setHistoryPhcId] = useState<string>('');
  const [historySubcentreId, setHistorySubcentreId] = useState<string>('');
  const [historyVillageId, setHistoryVillageId] = useState<string>('');
  const [historyEmployeeId, setHistoryEmployeeId] = useState<string>('');
  const [historySelectedIds, setHistorySelectedIds] = useState<string[]>([]);

  // Notifications / Feedback
  const [bannerNotice, setBannerNotice] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Print Preview Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalMode, setPrintModalMode] = useState<'send' | 'reprint'>('send');
  const [samplesToPrint, setSamplesToPrint] = useState<MalariaBloodSample[]>([]);
  const [modalPrintDate, setModalPrintDate] = useState<string>('');

  // Load All Master Data & Samples
  const loadData = useCallback(async () => {
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
      setAllSamples(sampleList);

      // Setup initial employee/subcentre restriction
      if (role === 'subcentre_employee') {
        let matchedEmp = empList.find(
          (e) =>
            e.id === user?.employeeId ||
            e.employee_name === user?.marathiName ||
            e.employee_name === user?.name
        );
        if (!matchedEmp && empList.length > 0) {
          matchedEmp = empList.find((e) => e.is_active) || empList[0];
        }

        if (matchedEmp) {
          setPendingEmployeeId(matchedEmp.id);
          setPendingSubcentreId(matchedEmp.subcentre_id);
          setHistoryEmployeeId(matchedEmp.id);
          setHistorySubcentreId(matchedEmp.subcentre_id);

          const parentSc = scList.find((s) => s.id === matchedEmp.subcentre_id);
          if (parentSc) {
            setPendingPhcId(parentSc.phc_id);
            setHistoryPhcId(parentSc.phc_id);
          }
        }
      } else {
        // PHC Controller default
        if (phcList.length > 0 && !pendingPhcId) {
          const firstPhc = phcList[0];
          setPendingPhcId(firstPhc.id);
          setHistoryPhcId(firstPhc.id);
        }
      }
    } catch (err) {
      console.error('Failed to load malaria dispatch data:', err);
    } finally {
      setLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dismiss notification banner automatically after 6 seconds
  useEffect(() => {
    if (bannerNotice) {
      const timer = setTimeout(() => {
        setBannerNotice(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [bannerNotice]);

  // Derived: Filtered Subcentres & Villages for Pending Tab
  const availablePendingSubcentres = useMemo(() => {
    if (!pendingPhcId) return subcentres;
    return subcentres.filter((sc) => sc.phc_id === pendingPhcId);
  }, [subcentres, pendingPhcId]);

  const availablePendingVillages = useMemo(() => {
    if (!pendingSubcentreId) return villages;
    return villages.filter((v) => v.subcentre_id === pendingSubcentreId);
  }, [villages, pendingSubcentreId]);

  const availablePendingEmployees = useMemo(() => {
    if (!pendingSubcentreId) return employees;
    return employees.filter((e) => e.subcentre_id === pendingSubcentreId);
  }, [employees, pendingSubcentreId]);

  // Filtered Pending Samples (sent_date IS NULL)
  const pendingSamples = useMemo(() => {
    return allSamples.filter((sample) => {
      // Must NOT be sent yet
      if (sample.sent_date) return false;

      // Role check: Subcentre employees can only access their subcentre/own samples
      if (role === 'subcentre_employee') {
        if (pendingEmployeeId && sample.employee_id !== pendingEmployeeId) return false;
      }

      if (pendingPhcId && sample.phc_id && sample.phc_id !== pendingPhcId) return false;
      if (pendingSubcentreId && sample.subcentre_id && sample.subcentre_id !== pendingSubcentreId)
        return false;
      if (pendingVillageId && sample.village_id !== pendingVillageId) return false;
      if (pendingEmployeeId && sample.employee_id !== pendingEmployeeId) return false;
      if (
        pendingCollectionDate &&
        sample.sample_collection_date !== pendingCollectionDate
      )
        return false;

      return true;
    });
  }, [
    allSamples,
    role,
    pendingPhcId,
    pendingSubcentreId,
    pendingVillageId,
    pendingEmployeeId,
    pendingCollectionDate,
  ]);

  // Selection handlers for Pending Tab
  const isAllPendingSelected =
    pendingSamples.length > 0 &&
    pendingSamples.every((s) => selectedSampleIds.includes(s.id));

  const handleToggleSelectAllPending = () => {
    if (isAllPendingSelected) {
      setSelectedSampleIds([]);
    } else {
      setSelectedSampleIds(pendingSamples.map((s) => s.id));
    }
  };

  const handleToggleSelectSample = (id: string) => {
    setSelectedSampleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Trigger Send & Print Preview
  const handleInitiatePrintSelected = () => {
    // CODE 12 Safety Check: Print & Dispatch requires active internet connection
    if (!isOnline) {
      setBannerNotice({
        type: 'error',
        text: 'इंटरनेट कनेक्शन आवश्यक आहे. कृपया ऑनलाइन झाल्यावर नमुने पाठवा व प्रिंट करा.',
      });
      return;
    }

    if (selectedSampleIds.length === 0) {
      setBannerNotice({
        type: 'error',
        text: 'कृपया किमान एक रक्त नमुना निवडा.',
      });
      return;
    }

    const selectedList = pendingSamples.filter((s) => selectedSampleIds.includes(s.id));
    if (selectedList.length === 0) {
      setBannerNotice({
        type: 'error',
        text: 'कृपया किमान एक रक्त नमुना निवडा.',
      });
      return;
    }

    // Set today's date in Indian format DD/MM/YYYY
    const todayIso = getTodayIso();
    const todayIndian = formatIndianDate(todayIso);

    setSamplesToPrint(selectedList);
    setModalPrintDate(todayIndian);
    setPrintModalMode('send');
    setIsPrintModalOpen(true);

    setBannerNotice({
      type: 'info',
      text: 'नमुने प्रिंटसाठी तयार आहेत.',
    });
  };

  // Confirm Print & Save Sent Date (called by Modal on confirm)
  const handleConfirmSendAndSave = async () => {
    const todayIso = getTodayIso();
    try {
      await malariaService.markSamplesAsSent(selectedSampleIds, todayIso);

      // Success
      setBannerNotice({
        type: 'success',
        text: 'नमुने यशस्वीरित्या पाठविले म्हणून नोंदविले गेले.',
      });

      // Close modal and reset selection
      setIsPrintModalOpen(false);
      setSelectedSampleIds([]);

      // Refresh samples list from service
      const updatedSamples = await malariaService.getSamples();
      setAllSamples(updatedSamples);
    } catch (err: any) {
      console.error('Error saving sent_date:', err);
      // Re-throw so modal can display error without falsely claiming success
      throw new Error('नमुने पाठविल्याची तारीख जतन करता आली नाही. कृपया पुन्हा प्रयत्न करा.');
    }
  };

  // Tab 2: Filtered Sent Samples History (sent_date IS NOT NULL)
  const availableHistorySubcentres = useMemo(() => {
    if (!historyPhcId) return subcentres;
    return subcentres.filter((sc) => sc.phc_id === historyPhcId);
  }, [subcentres, historyPhcId]);

  const availableHistoryVillages = useMemo(() => {
    if (!historySubcentreId) return villages;
    return villages.filter((v) => v.subcentre_id === historySubcentreId);
  }, [villages, historySubcentreId]);

  const availableHistoryEmployees = useMemo(() => {
    if (!historySubcentreId) return employees;
    return employees.filter((e) => e.subcentre_id === historySubcentreId);
  }, [employees, historySubcentreId]);

  const sentSamplesHistory = useMemo(() => {
    return allSamples.filter((sample) => {
      // Must be already sent
      if (!sample.sent_date) return false;

      // Role check
      if (role === 'subcentre_employee') {
        if (historyEmployeeId && sample.employee_id !== historyEmployeeId) return false;
      }

      if (historyPhcId && sample.phc_id && sample.phc_id !== historyPhcId) return false;
      if (historySubcentreId && sample.subcentre_id && sample.subcentre_id !== historySubcentreId)
        return false;
      if (historyVillageId && sample.village_id !== historyVillageId) return false;
      if (historyEmployeeId && sample.employee_id !== historyEmployeeId) return false;

      // Date Filters
      if (historySentDate && sample.sent_date !== historySentDate) return false;
      if (historyDateFrom && sample.sent_date < historyDateFrom) return false;
      if (historyDateTo && sample.sent_date > historyDateTo) return false;

      return true;
    });
  }, [
    allSamples,
    role,
    historyPhcId,
    historySubcentreId,
    historyVillageId,
    historyEmployeeId,
    historySentDate,
    historyDateFrom,
    historyDateTo,
  ]);

  // History Selection handlers
  const isAllHistorySelected =
    sentSamplesHistory.length > 0 &&
    sentSamplesHistory.every((s) => historySelectedIds.includes(s.id));

  const handleToggleSelectAllHistory = () => {
    if (isAllHistorySelected) {
      setHistorySelectedIds([]);
    } else {
      setHistorySelectedIds(sentSamplesHistory.map((s) => s.id));
    }
  };

  const handleToggleSelectHistorySample = (id: string) => {
    setHistorySelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Reprint Action (MUST NOT change sent_date)
  const handleInitiateReprint = (specificSamples?: MalariaBloodSample[]) => {
    const targetSamples =
      specificSamples ||
      (historySelectedIds.length > 0
        ? sentSamplesHistory.filter((s) => historySelectedIds.includes(s.id))
        : sentSamplesHistory);

    if (targetSamples.length === 0) {
      setBannerNotice({
        type: 'error',
        text: 'या दिनांकासाठी कोणतेही नमुने उपलब्ध नाहीत.',
      });
      return;
    }

    // Determine the original sent_date from the samples
    const originalDate = targetSamples[0]?.sent_date || getTodayIso();
    const formattedOriginalDate = formatIndianDate(originalDate);

    setSamplesToPrint(targetSamples);
    setModalPrintDate(formattedOriginalDate);
    setPrintModalMode('reprint');
    setIsPrintModalOpen(true);
  };

  // Quick helper to get display names
  const activePhcName = useMemo(() => {
    const pid = activeTab === 'pending' ? pendingPhcId : historyPhcId;
    return phcs.find((p) => p.id === pid)?.phc_name;
  }, [phcs, activeTab, pendingPhcId, historyPhcId]);

  const activeSubcentreName = useMemo(() => {
    const sid = activeTab === 'pending' ? pendingSubcentreId : historySubcentreId;
    return subcentres.find((s) => s.id === sid)?.subcentre_name;
  }, [subcentres, activeTab, pendingSubcentreId, historySubcentreId]);

  const activeVillageName = useMemo(() => {
    const vid = activeTab === 'pending' ? pendingVillageId : historyVillageId;
    return villages.find((v) => v.id === vid)?.village_name;
  }, [villages, activeTab, pendingVillageId, historyVillageId]);

  return (
    <div className="space-y-6 pb-20">
      {/* Page Title & Navigation Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm mb-1">
            <Send className="w-4 h-4" />
            <span>राष्ट्रीय हिवताप नियंत्रण कार्यक्रम (NVBDCP)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            मलेरिया रक्त नमुने पाठविणे व प्रिंट
          </h1>
          <p className="text-slate-600 text-sm mt-0.5">
            प्रयोगशाळेत तपासणीसाठी रक्त नमुने पाठविण्याची प्रक्रिया, A4 प्रिंट व अहवाल नोंद.
          </p>
        </div>

        {/* Tab Navigation Pill Buttons */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => {
              setActiveTab('pending');
              setBannerNotice(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>पाठविण्यासाठी प्रलंबित</span>
            {pendingSamples.length > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'pending'
                    ? 'bg-emerald-800 text-emerald-100'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {pendingSamples.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('sent-history');
              setBannerNotice(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'sent-history'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>पाठविलेल्या नमुन्यांचा अहवाल</span>
            {sentSamplesHistory.length > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'sent-history'
                    ? 'bg-emerald-800 text-emerald-100'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {sentSamplesHistory.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Feedback Banner */}
      {bannerNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-xs transition-all ${
            bannerNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : bannerNotice.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-sky-50 border-sky-300 text-sky-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {bannerNotice.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            {bannerNotice.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            {bannerNotice.type === 'info' && (
              <Info className="w-5 h-5 text-sky-600 shrink-0" />
            )}
            <span className="font-semibold text-sm sm:text-base">
              {bannerNotice.text}
            </span>
          </div>
          <button
            onClick={() => setBannerNotice(null)}
            className="text-slate-500 hover:text-slate-800 font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* CODE 12: Offline Persistent Warning for Dispatch */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 p-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-3 shadow-xs border border-amber-600">
          <WifiOff className="w-6 h-6 shrink-0 text-slate-950" />
          <div>
            <div className="text-slate-950 font-black">
              इंटरनेट कनेक्शन आवश्यक आहे. कृपया ऑनलाइन झाल्यावर नमुने पाठवा व प्रिंट करा.
            </div>
            <div className="text-[11px] text-amber-950 font-medium mt-0.5">
              ऑफलाइन स्थितीत नमुने पाठविणे (Dispatch) व छापणे (Print) तात्पुरते बंद ठेवण्यात आले आहे जेणेकरून डिस्पॅच तारखेची विसंगती टळेल.
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 1: पाठविण्यासाठी प्रलंबित रक्त नमुने */}
      {/* ==================================================== */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {/* Filters Card */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <Filter className="w-4 h-4 text-emerald-700" />
                <span>प्रलंबित नमुने फिल्टर करा</span>
              </div>
              <button
                onClick={() => {
                  setPendingVillageId('');
                  setPendingCollectionDate('');
                  if (isPhcController) {
                    setPendingEmployeeId('');
                    setPendingSubcentreId('');
                  }
                }}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>फिल्टर रीसेट</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* PHC Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  प्रा.आ. केंद्र (PHC)
                </label>
                <select
                  value={pendingPhcId}
                  disabled={!isPhcController}
                  onChange={(e) => {
                    setPendingPhcId(e.target.value);
                    setPendingSubcentreId('');
                    setPendingVillageId('');
                    setPendingEmployeeId('');
                  }}
                  className="w-full text-xs sm:text-sm p-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                >
                  {phcs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.phc_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcentre Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  आरोग्य उपकेंद्र
                </label>
                <select
                  value={pendingSubcentreId}
                  disabled={!isPhcController}
                  onChange={(e) => {
                    setPendingSubcentreId(e.target.value);
                    setPendingVillageId('');
                    setPendingEmployeeId('');
                  }}
                  className="w-full text-xs sm:text-sm p-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                >
                  {isPhcController && <option value="">सर्व उपकेंद्रे</option>}
                  {availablePendingSubcentres.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.subcentre_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Village Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">गाव</label>
                <select
                  value={pendingVillageId}
                  onChange={(e) => setPendingVillageId(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                >
                  <option value="">सर्व गावे</option>
                  {availablePendingVillages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.village_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">कर्मचारी</label>
                <select
                  value={pendingEmployeeId}
                  disabled={!isPhcController}
                  onChange={(e) => setPendingEmployeeId(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                >
                  {isPhcController && <option value="">सर्व कर्मचारी</option>}
                  {availablePendingEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employee_name} ({e.malaria_smear_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sample Collection Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  नमुना संकलन दिनांक
                </label>
                <input
                  type="date"
                  value={pendingCollectionDate}
                  onChange={(e) => setPendingCollectionDate(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Action Header & Bulk Selection Bar */}
          <div className="bg-emerald-900 text-white p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 sticky top-2 z-20">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleToggleSelectAllPending}
                disabled={pendingSamples.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isAllPendingSelected ? (
                  <CheckSquare className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Square className="w-4 h-4 text-white" />
                )}
                <span>{isAllPendingSelected ? 'सर्व निवड रद्द करा' : 'सर्व निवडा (Select All)'}</span>
              </button>

              <div className="text-xs sm:text-sm font-medium">
                निवडलेले नमुने:{' '}
                <strong className="text-emerald-200 text-base font-bold">
                  {selectedSampleIds.length}
                </strong>{' '}
                / {pendingSamples.length}
              </div>
            </div>

            <button
              onClick={handleInitiatePrintSelected}
              disabled={!isOnline || pendingSamples.length === 0}
              title={
                !isOnline
                  ? 'इंटरनेट कनेक्शन आवश्यक आहे. कृपया ऑनलाइन झाल्यावर नमुने पाठवा व प्रिंट करा.'
                  : undefined
              }
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer transform active:scale-98"
            >
              <Printer className="w-5 h-5" />
              <span>
                {!isOnline
                  ? 'ऑफलाइन (प्रिंट बंद)'
                  : 'निवडलेले नमुने प्रिंट करा'}
              </span>
            </button>
          </div>

          {/* Pending Samples Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3 text-center w-12">
                      <span className="sr-only">निवडा</span>
                    </th>
                    <th className="p-3 text-center w-12">अ.क्र.</th>
                    <th className="p-3 text-center">रक्त नमुना क्र.</th>
                    <th className="p-3">ताप रुग्णाचे पूर्ण नाव</th>
                    <th className="p-3 text-center">वय / लिंग</th>
                    <th className="p-3 text-center">घर क्र.</th>
                    <th className="p-3">गाव</th>
                    <th className="p-3 text-center">स्मीअर कोड</th>
                    <th className="p-3 text-center">नमुना संकलन दिनांक</th>
                    <th className="p-3">कर्मचारी नाव</th>
                    <th className="p-3 text-center">स्थिती</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingSamples.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-10 text-center text-slate-500">
                        <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-base text-slate-700">
                          पाठविण्यासाठी कोणतेही प्रलंबित रक्त नमुने उपलब्ध नाहीत.
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          नवीन रक्त नमुने नोंदवहीमधून नोंदवून ते येथे पाठविण्यासाठी उपलब्ध होतील.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pendingSamples.map((sample, idx) => {
                      const isSelected = selectedSampleIds.includes(sample.id);
                      return (
                        <tr
                          key={sample.id}
                          onClick={() => handleToggleSelectSample(sample.id)}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                            isSelected ? 'bg-emerald-50/60' : ''
                          }`}
                        >
                          <td
                            className="p-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectSample(sample.id)}
                              className="w-5 h-5 text-emerald-700 rounded border-slate-300 focus:ring-emerald-600 cursor-pointer"
                              aria-label={`Select ${sample.patient_name}`}
                            />
                          </td>
                          <td className="p-3 text-center text-slate-500 font-medium">
                            {idx + 1}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-900">
                            {formatSampleNumber(sample.sample_number)}
                          </td>
                          <td className="p-3 font-semibold text-slate-900">
                            {sample.patient_name}
                          </td>
                          <td className="p-3 text-center text-slate-700">
                            {sample.age} वर्षे / {sample.gender}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-700">
                            {sample.house_number || '-'}
                          </td>
                          <td className="p-3 text-slate-700">{sample.village_name}</td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-800">
                            {sample.malaria_smear_code}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-700">
                            {formatIndianDate(sample.sample_collection_date)}
                          </td>
                          <td className="p-3 text-slate-700">{sample.employee_name}</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                              प्रलंबित
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Count */}
            {pendingSamples.length > 0 && (
              <div className="p-3 border-t border-slate-200 bg-slate-50 text-slate-600 text-xs flex justify-between items-center">
                <span>
                  एकूण प्रलंबित नमुने: <strong>{pendingSamples.length}</strong>
                </span>
                <span>
                  निवडलेले नमुने: <strong className="text-emerald-800">{selectedSampleIds.length}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: पाठविलेल्या नमुन्यांचा अहवाल व पुन्हा प्रिंट */}
      {/* ==================================================== */}
      {activeTab === 'sent-history' && (
        <div className="space-y-4">
          {/* History Search & Filters Card */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <Search className="w-4 h-4 text-emerald-700" />
                <span>पाठविलेले नमुने शोधा व अहवाल</span>
              </div>
              <button
                onClick={() => {
                  setHistorySentDate('');
                  setHistoryDateFrom('');
                  setHistoryDateTo('');
                  setHistoryVillageId('');
                  if (isPhcController) {
                    setHistoryEmployeeId('');
                    setHistorySubcentreId('');
                  }
                }}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>फिल्टर रीसेट</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Exact Sent Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  पाठविल्याचा दिनांक
                </label>
                <input
                  type="date"
                  value={historySentDate}
                  onChange={(e) => {
                    setHistorySentDate(e.target.value);
                    if (e.target.value) {
                      setHistoryDateFrom('');
                      setHistoryDateTo('');
                    }
                  }}
                  className="w-full text-xs sm:text-sm p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              {/* Date Range: पासून */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  दिनांक पासून (From Date)
                </label>
                <input
                  type="date"
                  value={historyDateFrom}
                  disabled={Boolean(historySentDate)}
                  onChange={(e) => setHistoryDateFrom(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              {/* Date Range: पर्यंत */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  दिनांक पर्यंत (To Date)
                </label>
                <input
                  type="date"
                  value={historyDateTo}
                  disabled={Boolean(historySentDate)}
                  onChange={(e) => setHistoryDateTo(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              {/* Village */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">गाव</label>
                <select
                  value={historyVillageId}
                  onChange={(e) => setHistoryVillageId(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                >
                  <option value="">सर्व गावे</option>
                  {availableHistoryVillages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.village_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcentre */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">उपकेंद्र</label>
                <select
                  value={historySubcentreId}
                  disabled={!isPhcController}
                  onChange={(e) => {
                    setHistorySubcentreId(e.target.value);
                    setHistoryVillageId('');
                    setHistoryEmployeeId('');
                  }}
                  className="w-full text-xs sm:text-sm p-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                >
                  {isPhcController && <option value="">सर्व उपकेंद्रे</option>}
                  {availableHistorySubcentres.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.subcentre_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">कर्मचारी</label>
                <select
                  value={historyEmployeeId}
                  disabled={!isPhcController}
                  onChange={(e) => setHistoryEmployeeId(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                >
                  {isPhcController && <option value="">सर्व कर्मचारी</option>}
                  {availableHistoryEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employee_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* History Action & Reprint Bar */}
          <div className="bg-slate-800 text-white p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleToggleSelectAllHistory}
                disabled={sentSamplesHistory.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isAllHistorySelected ? (
                  <CheckSquare className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Square className="w-4 h-4 text-white" />
                )}
                <span>{isAllHistorySelected ? 'सर्व निवड रद्द करा' : 'सर्व निवडा'}</span>
              </button>

              <div className="text-xs sm:text-sm text-slate-300 font-medium">
                एकूण शोधलेले नमुने:{' '}
                <strong className="text-white text-base font-bold">
                  {sentSamplesHistory.length}
                </strong>
                {historySelectedIds.length > 0 && (
                  <span>
                    {' '}
                    | निवडलेले: <strong className="text-emerald-400">{historySelectedIds.length}</strong>
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleInitiateReprint()}
              disabled={sentSamplesHistory.length === 0}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-5 h-5" />
              <span>पुन्हा प्रिंट करा (Reprint)</span>
            </button>
          </div>

          {/* History Samples Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3 text-center w-12">
                      <span className="sr-only">निवडा</span>
                    </th>
                    <th className="p-3 text-center w-12">अ.क्र.</th>
                    <th className="p-3 text-center">पाठविल्याचा दिनांक</th>
                    <th className="p-3 text-center">रक्त नमुना क्र.</th>
                    <th className="p-3">ताप रुग्णाचे नाव</th>
                    <th className="p-3 text-center">वय / लिंग</th>
                    <th className="p-3">गाव</th>
                    <th className="p-3 text-center">स्मीअर कोड</th>
                    <th className="p-3 text-center">संकलन दिनांक</th>
                    <th className="p-3">कर्मचारी</th>
                    <th className="p-3 text-center">कृती</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sentSamplesHistory.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-10 text-center text-slate-500">
                        <AlertCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-base text-slate-700">
                          या दिनांकासाठी कोणतेही नमुने उपलब्ध नाहीत.
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          कृपया फिल्टरमध्ये वेगळा दिनांक किंवा कालावधी निवडून पुन्हा शोधा.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    sentSamplesHistory.map((sample, idx) => {
                      const isSelected = historySelectedIds.includes(sample.id);
                      return (
                        <tr
                          key={sample.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-emerald-50/50' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectHistorySample(sample.id)}
                              className="w-5 h-5 text-emerald-700 rounded border-slate-300 focus:ring-emerald-600 cursor-pointer"
                              aria-label={`Select ${sample.patient_name}`}
                            />
                          </td>
                          <td className="p-3 text-center text-slate-500 font-medium">
                            {idx + 1}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-800">
                            {formatIndianDate(sample.sent_date)}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-900">
                            {formatSampleNumber(sample.sample_number)}
                          </td>
                          <td className="p-3 font-semibold text-slate-900">
                            {sample.patient_name}
                          </td>
                          <td className="p-3 text-center text-slate-700">
                            {sample.age} वर्षे / {sample.gender}
                          </td>
                          <td className="p-3 text-slate-700">{sample.village_name}</td>
                          <td className="p-3 text-center font-mono font-bold text-slate-800">
                            {sample.malaria_smear_code}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-700">
                            {formatIndianDate(sample.sample_collection_date)}
                          </td>
                          <td className="p-3 text-slate-700">{sample.employee_name}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleInitiateReprint([sample])}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 border border-slate-200 transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer"
                              title="हा नमुना पुन्हा प्रिंट करा"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>प्रिंट</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* History Table Footer */}
            {sentSamplesHistory.length > 0 && (
              <div className="p-3 border-t border-slate-200 bg-slate-50 text-slate-600 text-xs flex justify-between items-center">
                <span>
                  एकूण पाठविलेले नमुने: <strong>{sentSamplesHistory.length}</strong>
                </span>
                <span className="text-slate-500">
                  टीप: पुन्हा प्रिंट केल्याने पाठविण्याचा मूळ दिनांक बदलत नाही.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reusable A4 Printable Modal */}
      <MalariaPrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        samples={samplesToPrint}
        mode={printModalMode}
        printDate={modalPrintDate}
        phcName={activePhcName}
        subcentreName={activeSubcentreName}
        villageName={activeVillageName}
        onConfirmSend={handleConfirmSendAndSave}
      />
    </div>
  );
};
