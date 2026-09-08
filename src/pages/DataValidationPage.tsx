import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Printer,
  Download,
  Search,
  Filter,
  Eye,
  Wrench,
  Building2,
  Home,
  MapPin,
  Users,
  FileSpreadsheet,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  PageId,
  ValidationIssue,
  ValidationModule,
  ValidationSeverity,
  PhcMaster,
  SubcentreMaster,
  VillageMaster,
  EmployeeMaster,
  MalariaBloodSample,
} from '../types';
import { useAuth } from '../hooks/useAuth';
import { masterDataService } from '../services/masterDataService';
import { malariaService } from '../services/malariaService';
import { validationService, ValidationResult } from '../services/validationService';
import { CorrectionModal } from '../components/validation/CorrectionModal';
import { ValidationPrintView } from '../components/validation/ValidationPrintView';

interface DataValidationPageProps {
  onNavigate?: (page: PageId) => void;
}

export const DataValidationPage: React.FC<DataValidationPageProps> = ({ onNavigate }) => {
  const { role, user } = useAuth();
  const isController = role === 'phc_controller';

  // Master Data State
  const [phcs, setPhcs] = useState<PhcMaster[]>([]);
  const [subcentres, setSubcentres] = useState<SubcentreMaster[]>([]);
  const [villages, setVillages] = useState<VillageMaster[]>([]);
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [samples, setSamples] = useState<MalariaBloodSample[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter States
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
      const [selectedVillageId, setSelectedVillageId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination State
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const pageSize = 20;

  // Active modal for correction
  const [activeIssueForCorrection, setActiveIssueForCorrection] = useState<ValidationIssue | null>(null);

  // 1. Fetch live data from database services
  const fetchData = useCallback(async () => {
    try {
      const [pList, sList, vList, eList, sampList] = await Promise.all([
        masterDataService.getPhcs(),
        masterDataService.getSubcentres(),
        masterDataService.getVillages(),
        masterDataService.getEmployees(),
        malariaService.getSamples(),
      ]);

      setPhcs(pList);
      setSubcentres(sList);
      setVillages(vList);
      setEmployees(eList);
      setSamples(sampList);

      // If Subcentre employee, auto-lock to their assigned subcentre if applicable
      if (!isController && user?.assignedSubcentre) {
        const matchingSub = sList.find(
          (s) => s.subcentre_name?.toLowerCase().trim() === user.assignedSubcentre?.toLowerCase().trim()
        );
        if (matchingSub) {
          ((_: any) => {})(matchingSub.id);
          ((_: any) => {})(matchingSub.phc_id);
        }
      }
    } catch (err) {
      console.error('Failed to load database records for validation:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isController, user?.assignedSubcentre]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Re-run validation handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    showToast('डेटाबेस तपासणी अद्ययावत केली. सर्व नियम पुन्हा तपासले गेले आहेत.');
  };

  // 2. Scoped dataset for Subcentre Employee vs PHC Controller (RLS compliance)
  const scopedData = useMemo(() => {
    if (isController) {
      return { phcs, subcentres, villages, employees, samples };
    }

    // Subcentre staff: restrict to assigned subcentre
    if (user?.assignedSubcentre) {
      const userSub = subcentres.find(
        (s) => s.subcentre_name?.toLowerCase().trim() === user.assignedSubcentre?.toLowerCase().trim()
      );
      if (userSub) {
        const allowedSubcentres = [userSub];
        const allowedPhcs = phcs.filter((p) => p.id === userSub.phc_id);
        const allowedVillages = villages.filter((v) => v.subcentre_id === userSub.id);
        const allowedEmployees = employees.filter((e) => e.subcentre_id === userSub.id);
        const allowedVillageIds = new Set(allowedVillages.map((v) => v.id));
        const allowedSamples = samples.filter(
          (s) => s.subcentre_id === userSub.id || allowedVillageIds.has(s.village_id)
        );

        return {
          phcs: allowedPhcs,
          subcentres: allowedSubcentres,
          villages: allowedVillages,
          employees: allowedEmployees,
          samples: allowedSamples,
        };
      }
    }

    return { phcs, subcentres, villages, employees, samples };
  }, [isController, phcs, subcentres, villages, employees, samples, user?.assignedSubcentre]);

  // 3. Run validation rules through validationService
  const validationResult: ValidationResult = useMemo(() => {
    return validationService.validateAll(scopedData);
  }, [scopedData]);

  // 4. Cascading filter options
  const filteredSubcentreOptions = useMemo(() => {
    if (true) return scopedData.subcentres;
    return scopedData.subcentres.filter((s) => s.phc_id === "");
  }, [scopedData.subcentres, ""]);

  const filteredVillageOptions = useMemo(() => {
    if (true) return scopedData.villages;
    return scopedData.villages.filter((v) => v.subcentre_id === "");
  }, [scopedData.villages, ""]);

  const filteredEmployeeOptions = useMemo(() => {
    if (true) return scopedData.employees;
    return scopedData.employees.filter((e) => e.subcentre_id === "");
  }, [scopedData.employees, ""]);

  // 5. Filter Issues
  const filteredIssues = useMemo(() => {
    return validationResult.issues.filter((issue) => {
      // Module filter
      if (selectedModule !== 'all' && issue.module !== selectedModule) {
        return false;
      }

      // Severity filter
      if (selectedSeverity !== 'all' && issue.severityEn !== selectedSeverity) {
        return false;
      }

      // PHC filter
       {
        return false;
      }

      // Subcentre filter
       {
        return false;
      }

      // Village filter
      if (selectedVillageId && issue.villageId && issue.villageId !== selectedVillageId) {
        return false;
      }

      // Employee filter
      if (selectedEmployeeId && issue.employeeId && issue.employeeId !== selectedEmployeeId) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesRecord = issue.recordIdentifier?.toLowerCase().includes(q);
        const matchesIssue = issue.issueText?.toLowerCase().includes(q);
        const matchesSmear = issue.smearCode?.toLowerCase().includes(q);
        const matchesSampleNum = issue.sampleNumber?.toString().includes(q);
        const matchesPatient = issue.patientName?.toLowerCase().includes(q);
        const matchesHouse = issue.houseNumber?.toLowerCase().includes(q);
        const matchesModule = issue.categoryMarathi?.toLowerCase().includes(q);

        if (
          !matchesRecord &&
          !matchesIssue &&
          !matchesSmear &&
          !matchesSampleNum &&
          !matchesPatient &&
          !matchesHouse &&
          !matchesModule
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    validationResult.issues,
    selectedModule,
    selectedSeverity,
    
    
    selectedVillageId,
    selectedEmployeeId,
    searchQuery,
  ]);

  // Pagination slice
  const totalPages = Math.ceil(filteredIssues.length / pageSize) || 1;
  const paginatedIssues = useMemo(() => {
    const start = (currentPageNum - 1) * pageSize;
    return filteredIssues.slice(start, start + pageSize);
  }, [filteredIssues, currentPageNum, pageSize]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedModule('all');
    setSelectedSeverity('all');
    ((_: any) => {})('');
    ((_: any) => {})('');
    setSelectedVillageId('');
    setSelectedEmployeeId('');
    setSearchQuery('');
    setCurrentPageNum(1);
  };

  // Quick severity filter button helper
  const setQuickSeverity = (sev: string) => {
    setSelectedSeverity(sev);
    setCurrentPageNum(1);
  };

  // 6. CSV Excel Export with UTF-8 BOM (\uFEFF)
  const handleExportCSV = () => {
    const headers = [
      'Module',
      'PHC',
      'Subcentre',
      'Village',
      'Employee',
      'Smear Code',
      'Record ID',
      'Issue Description',
      'Severity',
      'Date',
    ];

    const rows = filteredIssues.map((i) => [
      `"${i.categoryMarathi || i.module}"`,
      `"${i.phcName || '-'}"`,
      `"${i.subcentreName || '-'}"`,
      `"${i.villageName || '-'}"`,
      `"${i.employeeName || '-'}"`,
      `"${i.smearCode || '-'}"`,
      `"${i.recordId}"`,
      `"${i.issueText.replace(/"/g, '""')}"`,
      `"${i.severity}"`,
      `"${i.date}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Arogya_Data_Quality_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('डेटा गुणवत्ता एक्सेल (CSV) अहवाल यशस्वीरित्या डाउनलोड झाला.');
  };

  // 7. Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Calculate live KPI counts
  const totalPhcs = scopedData.phcs.length;
  const totalSubcentres = scopedData.subcentres.length;
  const totalVillages = scopedData.villages.length;
  const totalEmployees = scopedData.employees.length;
  const activeEmployees = scopedData.employees.filter((e) => e.is_active).length;
  const totalSamples = scopedData.samples.length;
  const pendingSamples = scopedData.samples.filter((s) => !s.sent_date || s.sent_date === '').length;
  const recordsNeedingAttention = validationResult.recordsNeedingAttentionCount;

  const currentPhcName = scopedData.phcs.find((p) => p.id === "")?.phc_name || (scopedData.phcs[0]?.phc_name ?? 'सर्व PHC');
  const currentSubcentreName = scopedData.subcentres.find((s) => s.id === "")?.subcentre_name || 'सर्व उपकेंद्र';
  const todayFormatted = new Date().toLocaleDateString('mr-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-emerald-800 text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                CODE 9 • डेटा गुणवत्ता व व्हॅलिडेशन डॅशबोर्ड
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                आरोग्य नोंदणी डेटा गुणवत्ता व तपासणी
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            मास्टर टेबल्स (PHC, उपकेंद्र, गाव, कर्मचारी) व रक्त नमुने नोंदवहीतील त्रुटी, गहाळ नमुना क्रम, स्मीअर कोड विसंगती आणि अनाथ नोंदींची स्वयंचलित पडताळणी.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            id="validation-refresh-btn"
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-700' : ''}`} />
            <span>{isRefreshing ? 'तपासणी सुरू...' : 'डेटा पुन्हा तपासा'}</span>
          </button>

          <button
            id="validation-print-btn"
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Validation Report Print</span>
          </button>

          <button
            id="validation-export-btn"
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel डाउनलोड</span>
          </button>
        </div>
      </div>

      {/* 2. Live Database 8 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. Total PHC */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">एकूण PHC</span>
            <Building2 className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="text-lg font-bold text-slate-900">{totalPhcs}</div>
        </div>

        {/* 2. Total Subcentres */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">एकूण उपकेंद्र</span>
            <Home className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="text-lg font-bold text-slate-900">{totalSubcentres}</div>
        </div>

        {/* 3. Total Villages */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">एकूण गावे</span>
            <MapPin className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="text-lg font-bold text-slate-900">{totalVillages}</div>
        </div>

        {/* 4. Total Employees */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">एकूण कर्मचारी</span>
            <Users className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="text-lg font-bold text-slate-900">{totalEmployees}</div>
        </div>

        {/* 5. Active Employees */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">सक्रिय कर्मचारी</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700">{activeEmployees}</div>
        </div>

        {/* 6. Total Blood Samples */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">एकूण रक्त नमुने</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="text-lg font-bold text-slate-900">{totalSamples}</div>
        </div>

        {/* 7. Pending Blood Samples */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">प्रलंबित नमुने</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-amber-700">{pendingSamples}</div>
        </div>

        {/* 8. Records Needing Attention */}
        <div className="bg-rose-50 rounded-xl border border-rose-200 p-3 shadow-2xs">
          <div className="flex items-center justify-between text-rose-800 mb-1">
            <span className="text-[11px] font-bold">तपासणी आवश्यक</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-lg font-bold text-rose-700">{recordsNeedingAttention}</div>
        </div>
      </div>

      {/* 3. Data Quality Score & Rating Card */}
      <div className="bg-gradient-to-br from-white to-slate-50/80 rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Circular Score display */}
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-100"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={213.6}
                  strokeDashoffset={213.6 - (213.6 * validationResult.qualityScore) / 100}
                  strokeLinecap="round"
                  className={
                    validationResult.qualityScore >= 95
                      ? 'text-emerald-700'
                      : validationResult.qualityScore >= 80
                      ? 'text-teal-600'
                      : validationResult.qualityScore >= 60
                      ? 'text-amber-500'
                      : 'text-rose-600'
                  }
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-bold text-slate-900 leading-none">
                  {validationResult.qualityScore}%
                </span>
                <span className="text-[9px] font-semibold text-slate-500 mt-0.5">गुणवत्ता</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500">डेटा गुणवत्ता निर्देशांक (Score)</div>
              <div className={`text-base font-bold mt-0.5 ${validationResult.qualityRating.color}`}>
                {validationResult.qualityRating.text}
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                तपासलेल्या एकूण {validationResult.totalCheckedRecords} नोंदींपैकी{' '}
                <strong>{validationResult.validRecordsCount} नोंदी पूर्णपणे वैध</strong> आहेत.
              </div>
            </div>
          </div>

          {/* Interpretation Guide */}
          <div className="md:col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              <span>गुणवत्ता निर्देशांक निकष व मार्गदर्शक सूचना (Interpretation Criteria):</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                <span className="font-bold block">९५%–१००%:</span> उत्कृष्ट (नोंदी परिपूर्ण)
              </div>
              <div className="p-1.5 bg-teal-50 border border-teal-200 rounded-lg text-teal-900">
                <span className="font-bold block">८०%–९४%:</span> चांगले (किरकोळ सूचना)
              </div>
              <div className="p-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                <span className="font-bold block">६०%–७९%:</span> सुधारणा आवश्यक
              </div>
              <div className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
                <span className="font-bold block">&lt; ६०%:</span> तातडीने तपासणी आवश्यक
              </div>
            </div>
            <div className="text-[10px] text-slate-400 italic pt-0.5">
              * टीप: हे ॲप्लिकेशन-परिभाषित गुणवत्ता दर्शक आहेत; शासकीय अधिकृत ग्रेडिंग नाही.
            </div>
          </div>
        </div>
      </div>

      {/* 4. Category-Wise Validation Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-800" />
            <h2 className="text-sm font-bold text-slate-900">
              विभागनिहाय पडताळणी सारांश (Category-wise Summary)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            एकूण आढळलेल्या समस्या: <strong className="text-slate-800">{validationResult.issues.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-y border-slate-200">
                <th className="py-2.5 px-3">विभाग / कॅटेगरी (Category)</th>
                <th className="py-2.5 px-3 text-center text-rose-700">गंभीर त्रुटी (Errors)</th>
                <th className="py-2.5 px-3 text-center text-amber-700">सूचना / गॅप्स (Warnings)</th>
                <th className="py-2.5 px-3 text-center">एकूण समस्या (Total)</th>
                <th className="py-2.5 px-3 text-right">कृती (Action)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {validationResult.categorySummaries.map((cat) => (
                <tr key={cat.category} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 font-semibold text-slate-800 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        cat.errors > 0 ? 'bg-rose-500' : cat.warnings > 0 ? 'bg-amber-400' : 'bg-emerald-500'
                      }`}
                    />
                    <span>{cat.labelMarathi}</span>
                  </td>
                  <td className="py-2 px-3 text-center font-bold font-mono text-rose-700">
                    {cat.errors > 0 ? cat.errors : '-'}
                  </td>
                  <td className="py-2 px-3 text-center font-bold font-mono text-amber-700">
                    {cat.warnings > 0 ? cat.warnings : '-'}
                  </td>
                  <td className="py-2 px-3 text-center font-bold font-mono text-slate-800">
                    {cat.totalIssues}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModule(cat.category);
                        setCurrentPageNum(1);
                      }}
                      className="text-[11px] text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer"
                    >
                      यादी पहा
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. PHC-Wise Data Quality (Controller sees all, staff sees assigned) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-800" />
            <h2 className="text-sm font-bold text-slate-900">
              प्राथमिक आरोग्य केंद्रनिहाय गुणवत्ता अहवाल (PHC-wise Quality)
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            {isController ? 'सर्व प्रा.आ. केंद्र सारांश' : 'आपल्या नियुक्त कार्यक्षेत्रातील सारांश'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-y border-slate-200">
                <th className="py-2.5 px-3">प्राथमिक आरोग्य केंद्र (PHC)</th>
                <th className="py-2.5 px-3 text-center">एकूण नोंदी</th>
                <th className="py-2.5 px-3 text-center text-rose-700">त्रुटी (Errors)</th>
                <th className="py-2.5 px-3 text-center text-amber-700">सूचना (Warnings)</th>
                <th className="py-2.5 px-3 text-center text-emerald-700">वैध नोंदी</th>
                <th className="py-2.5 px-3 text-center">गुणवत्ता निर्देशांक %</th>
                <th className="py-2.5 px-3 text-center">दर्जा</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {validationResult.phcSummaries.map((p) => (
                <tr key={p.phcId} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 font-semibold text-slate-800">{p.phcName}</td>
                  <td className="py-2 px-3 text-center font-mono">{p.totalRecords}</td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-rose-700">
                    {p.errorCount > 0 ? p.errorCount : '-'}
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">
                    {p.warningCount > 0 ? p.warningCount : '-'}
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">
                    {p.validRecords}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs ${
                        p.qualityScore >= 95
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.qualityScore >= 80
                          ? 'bg-teal-100 text-teal-800'
                          : p.qualityScore >= 60
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {p.qualityScore}%
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center font-semibold text-slate-700">{p.statusText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Interactive Search & Filters Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-800" />
            <h2 className="text-sm font-bold text-slate-900">
              तपासणी शोध व फिल्टर (Search & Filter Issues)
            </h2>
          </div>

          {/* Quick Severity Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setQuickSeverity('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedSeverity === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              सर्व ({validationResult.issues.length})
            </button>
            <button
              type="button"
              onClick={() => setQuickSeverity('error')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedSeverity === 'error'
                  ? 'bg-rose-700 text-white'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              🔴 फक्त Error ({validationResult.issues.filter((i) => i.severityEn === 'error').length})
            </button>
            <button
              type="button"
              onClick={() => setQuickSeverity('warning')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedSeverity === 'warning'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              🟡 फक्त Warning ({validationResult.issues.filter((i) => i.severityEn === 'warning').length})
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer ml-1"
            >
              फिल्टर साफ करा
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Module Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">मॉड्यूल निवडा</label>
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setCurrentPageNum(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="all">सर्व मॉड्यूल्स (All)</option>
              <option value="PHC">प्रा.आ. केंद्र (PHC)</option>
              <option value="Subcentre">उपकेंद्र (Subcentre)</option>
              <option value="Village">गाव मास्टर (Village)</option>
              <option value="Employee">कर्मचारी मास्टर (Employee)</option>
              <option value="Blood Samples">रक्त नमुने (Blood Samples)</option>
              <option value="Sample Number">नमुना क्रमांक व क्रम</option>
              <option value="Smear Code">स्मीअर कोड सुसंगतता</option>
              <option value="Relations">कर्मचारी-गाव संबंध</option>
              <option value="Orphan Records">अनाथ नोंदी (Orphan Records)</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">तीव्रता (Severity)</label>
            <select
              value={selectedSeverity}
              onChange={(e) => {
                setSelectedSeverity(e.target.value);
                setCurrentPageNum(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="all">सर्व स्तर (All)</option>
              <option value="error">🔴 त्रुटी (Error)</option>
              <option value="warning">🟡 सूचना (Warning)</option>
              <option value="info">🔵 माहिती (Info)</option>
            </select>
          </div>

          {/* PHC Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">प्रा.आ. केंद्र (PHC)</label>
            <select
              value={""}
              onChange={(e) => {
                ((_: any) => {})(e.target.value);
                ((_: any) => {})('');
                setSelectedVillageId('');
                setSelectedEmployeeId('');
                setCurrentPageNum(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="">सर्व PHC</option>
              {scopedData.phcs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.phc_name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcentre Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">उपकेंद्र</label>
            <select
              value={""}
              onChange={(e) => {
                ((_: any) => {})(e.target.value);
                setSelectedVillageId('');
                setSelectedEmployeeId('');
                setCurrentPageNum(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="">सर्व उपकेंद्र</option>
              {filteredSubcentreOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subcentre_name}
                </option>
              ))}
            </select>
          </div>

          {/* Village Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">गाव निवडा</label>
            <select
              value={selectedVillageId}
              onChange={(e) => {
                setSelectedVillageId(e.target.value);
                setCurrentPageNum(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="">सर्व गावे</option>
              {filteredVillageOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.village_name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">कर्मचारी निवडा</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value);
                setCurrentPageNum(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="">सर्व कर्मचारी</option>
              {filteredEmployeeOptions.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_name} ({emp.malaria_smear_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Free Text Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPageNum(1);
            }}
            placeholder="नाव, स्मीअर कोड, नमुना क्रमांक, रुग्णाचे नाव, घर क्रमांक किंवा समस्या शोधा..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* 7. Validation Results Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">तपासणी निकाल यादी</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              {filteredIssues.length} समस्या
            </span>
          </div>

          <div className="text-xs text-slate-500">
            पृष्ठ {currentPageNum} / {totalPages}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3 text-center w-12">अ.क्र.</th>
                <th className="py-2.5 px-3 w-28">मॉड्यूल</th>
                <th className="py-2.5 px-3 w-48">संबंधित नोंद (Record)</th>
                <th className="py-2.5 px-3 min-w-[280px]">समस्या / विसंगती (Issue)</th>
                <th className="py-2.5 px-3 text-center w-24">तीव्रता</th>
                <th className="py-2.5 px-3 text-center w-24">दिनांक</th>
                <th className="py-2.5 px-3 text-right w-36">कृती (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedIssues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2 opacity-80" />
                    <div className="text-sm font-bold text-slate-800">
                      निवडलेल्या फिल्टर्सनुसार कोणतीही त्रुटी आढळली नाही!
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      डेटा वैध आहे अथवा सर्व त्रुटींचे निराकरण झालेले आहे.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedIssues.map((issue, idx) => {
                  const globalIdx = (currentPageNum - 1) * pageSize + idx + 1;
                  const isError = issue.severityEn === 'error';
                  return (
                    <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Sr No */}
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-500">
                        {globalIdx}
                      </td>

                      {/* Module */}
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800 block truncate">
                          {issue.categoryMarathi}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{issue.module}</span>
                      </td>

                      {/* Record */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 truncate" title={issue.recordIdentifier}>
                          {issue.recordIdentifier}
                        </div>
                        {issue.smearCode && (
                          <div className="text-[10px] font-mono text-emerald-800">
                            कोड: {issue.smearCode}
                          </div>
                        )}
                        {issue.subcentreName && (
                          <div className="text-[10px] text-slate-500 truncate">
                            {issue.subcentreName}
                          </div>
                        )}
                      </td>

                      {/* Issue Description */}
                      <td className="py-2.5 px-3 leading-relaxed">
                        <div className="text-slate-800 font-medium">{issue.issueText}</div>
                        {issue.suggestedFix && (
                          <div className="text-[11px] text-emerald-800 mt-0.5 font-medium flex items-center gap-1">
                            <span>💡 शिफारस: {issue.suggestedFix}</span>
                          </div>
                        )}
                      </td>

                      {/* Severity */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isError
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isError ? '🔴 त्रुटी' : '🟡 सूचना'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600 text-[11px]">
                        {issue.date}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* "नोंद पहा" (View Record) */}
                          <button
                            type="button"
                            onClick={() => onNavigate && onNavigate(issue.targetPage)}
                            title="संबंधित पृष्ठावर नोंद पहा"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>पहा</span>
                          </button>

                          {/* "दुरुस्ती करा" (Fix/Correct) */}
                          {issue.canCorrect && (
                            <button
                              type="button"
                              onClick={() => setActiveIssueForCorrection(issue)}
                              title="नोंद दुरुस्ती विंडो उघडा"
                              className="px-2 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Wrench className="w-3 h-3 text-amber-300" />
                              <span>दुरुस्ती</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 flex items-center justify-between bg-slate-50 text-xs">
            <div className="text-slate-600">
              दर्शविले: {(currentPageNum - 1) * pageSize + 1} ते{' '}
              {Math.min(currentPageNum * pageSize, filteredIssues.length)} / एकूण {filteredIssues.length} समस्या
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPageNum === 1}
                onClick={() => setCurrentPageNum((p) => Math.max(p - 1, 1))}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>मागील</span>
              </button>

              <span className="font-semibold text-slate-800 px-2">
                {currentPageNum} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPageNum === totalPages}
                onClick={() => setCurrentPageNum((p) => Math.min(p + 1, totalPages))}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>पुढील</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 8. Data Correction Modal */}
      {activeIssueForCorrection && (
        <CorrectionModal
          issue={activeIssueForCorrection}
          onClose={() => setActiveIssueForCorrection(null)}
          onSuccess={async (msg) => {
            showToast(msg);
            await fetchData();
          }}
        />
      )}

      {/* 9. A4 Printable Government Quality Report (Only shown on window.print()) */}
      <ValidationPrintView
        phcName={currentPhcName}
        subcentreName={currentSubcentreName}
        reportDate={todayFormatted}
        totalRecords={validationResult.totalCheckedRecords}
        errorCount={validationResult.issues.filter((i) => i.severityEn === 'error').length}
        warningCount={validationResult.issues.filter((i) => i.severityEn === 'warning').length}
        qualityScore={validationResult.qualityScore}
        issues={filteredIssues}
      />
    </div>
  );
};
