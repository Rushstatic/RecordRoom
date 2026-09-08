import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  Building2,
  Users,
  MapPin,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  HelpCircle,
  Eye,
  WifiOff,
  CloudOff,
  ArrowRight,
} from 'lucide-react';
import {
  PhcMaster,
  SubcentreMaster,
  VillageMaster,
  EmployeeMaster,
  MalariaBloodSample,
  PageId,
} from '../types';
import { useAuth } from '../hooks/useAuth';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { offlineDraftService } from '../services/offlineDraftService';
import { masterDataService } from '../services/masterDataService';
import {
  malariaService,
  formatIndianDate,
  formatSampleNumber,
  getTodayIso,
} from '../services/malariaService';
import {
  MalariaPrintReportView,
  PrintReportMetadata,
} from '../components/reports/MalariaPrintReportView';
import { MalariaReportCharts } from '../components/reports/MalariaReportCharts';

interface MalariaReportsPageProps {
  onNavigate?: (page: PageId) => void;
}

type ActiveReportTab =
  | 'collection'
  | 'daily'
  | 'monthly'
  | 'yearly'
  | 'employee'
  | 'village'
  | 'subcentre'
  | 'charts';

const MARATHI_MONTHS = [
  { index: 1, name: 'जानेवारी (January)' },
  { index: 2, name: 'फेब्रुवारी (February)' },
  { index: 3, name: 'मार्च (March)' },
  { index: 4, name: 'एप्रिल (April)' },
  { index: 5, name: 'मे (May)' },
  { index: 6, name: 'जून (June)' },
  { index: 7, name: 'जुलै (July)' },
  { index: 8, name: 'ऑगस्ट (August)' },
  { index: 9, name: 'सप्टेंबर (September)' },
  { index: 10, name: 'ऑक्टोबर (October)' },
  { index: 11, name: 'नोव्हेंबर (November)' },
  { index: 12, name: 'डिसेंबर (December)' },
];

export const MalariaReportsPage: React.FC<MalariaReportsPageProps> = ({ onNavigate }) => {
  const { role, user } = useAuth();
  const { isOnline } = useNetworkStatus();

  // CODE 12: Offline Draft Count
  const [pendingDraftsCount, setPendingDraftsCount] = useState(() =>
    offlineDraftService.getSyncStats(user).pending
  );

  useEffect(() => {
    const handleCount = () => {
      setPendingDraftsCount(offlineDraftService.getSyncStats(user).pending);
    };
    window.addEventListener('arogya-sync-status-changed', handleCount);
    return () => {
      window.removeEventListener('arogya-sync-status-changed', handleCount);
    };
  }, [user]);

  // Master Data State
  const [phcs, setPhcs] = useState<PhcMaster[]>([]);
  const [subcentres, setSubcentres] = useState<SubcentreMaster[]>([]);
  const [villages, setVillages] = useState<VillageMaster[]>([]);
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [allSamples, setAllSamples] = useState<MalariaBloodSample[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Report Sub-Tab
  const [activeTab, setActiveTab] = useState<ActiveReportTab>('collection');

  // Hierarchy Filters
      const [filterVillageId, setFilterVillageId] = useState<string>('');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('');

  // Date Range Filters
  const todayIso = getTodayIso();
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState<string>(() => {
    // Default to first day of current year
    return `${currentYear}-01-01`;
  });
  const [toDate, setToDate] = useState<string>(todayIso);

  // Daily Report specific date
  const [dailyDate, setDailyDate] = useState<string>(todayIso);

  // Monthly Report specific month/year
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedMonthYear, setSelectedMonthYear] = useState<number>(currentYear);

  // Yearly Report specific year
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Search keyword inside table
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination for Detailed Collection Table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  // Load All Data
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

      // Set role-based initial filters
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
          setFilterEmployeeId(matchedEmp.id);

          const parentSc = scList.find((s) => s.id === matchedEmp.subcentre_id);
          if (parentSc) {
          }
        }
      } else {
        // PHC Controller default
        
      }
    } catch (err) {
      console.error('Failed to load malaria report data:', err);
    } finally {
      setLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dependent Subcentres
  const availableEmployees = useMemo(() => {
    return employees;
  }, [employees]);

  const availableVillages = useMemo(() => {
    let targetEmployeeId = filterEmployeeId;
    if (role === 'subcentre_employee' && user?.employeeId) {
      targetEmployeeId = user.employeeId;
    }
    
    if (!targetEmployeeId) {
      return villages;
    }
    
    const employee = employees.find(e => e.id === targetEmployeeId);
    const employeeSubcentreId = employee?.subcentre_id;
    
    const primaryVillages = villages.filter(v => v.subcentre_id === employeeSubcentreId);
    const historicalVillageIds = new Set(allSamples.filter(s => s.employee_id === targetEmployeeId).map(s => s.village_id));
    
    const result = [...primaryVillages];
    const primaryIds = new Set(primaryVillages.map(v => v.id));
    
    for (const vid of historicalVillageIds) {
      if (vid && !primaryIds.has(vid)) {
        const v = villages.find(v => v.id === vid);
        if (v) result.push(v);
      }
    }
    return result;
  }, [filterEmployeeId, villages, employees, allSamples, role, user]);

  // When PHC changes (for Controller), reset subcentre/village if no longer valid
    // Base Scoped Samples (based on PHC / Subcentre / Village / Employee permissions)
  const scopedSamples = useMemo(() => {
    return allSamples.filter((s) => {
                  if (filterVillageId && s.village_id !== filterVillageId) return false;
      if (filterEmployeeId && s.employee_id !== filterEmployeeId) return false;
      return true;
    });
  }, [allSamples,   filterVillageId, filterEmployeeId]);

  // 1. LIVE REPORT DASHBOARD STATS (Requirement 2)
  const dashboardStats = useMemo(() => {
    const currentMonthPrefix = todayIso.substring(0, 7); // YYYY-MM
    const currentYearPrefix = String(currentYear);

    // आजचे रक्त नमुने
    const todaySamples = scopedSamples.filter((s) => s.sample_collection_date === todayIso);
    // आज पाठविलेले नमुने
    const todaySent = scopedSamples.filter((s) => s.sent_date === todayIso);

    // या महिन्यातील रक्त नमुने
    const monthSamples = scopedSamples.filter((s) => s.sample_collection_date.startsWith(currentMonthPrefix));
    // या महिन्यात पाठविलेले नमुने
    const monthSent = scopedSamples.filter((s) => s.sent_date && s.sent_date.startsWith(currentMonthPrefix));

    // या वर्षातील रक्त नमुने
    const yearSamples = scopedSamples.filter(
      (s) => s.sample_year === currentYear || s.sample_collection_date.startsWith(currentYearPrefix)
    );
    // या वर्षातील पाठविलेले नमुने
    const yearSent = scopedSamples.filter((s) => s.sent_date && s.sent_date.startsWith(currentYearPrefix));

    // प्रलंबित रक्त नमुने (sent_date IS NULL)
    const pendingSamples = scopedSamples.filter((s) => !s.sent_date);

    return {
      todaySamplesCount: todaySamples.length,
      todaySentCount: todaySent.length,
      monthSamplesCount: monthSamples.length,
      monthSentCount: monthSent.length,
      yearSamplesCount: yearSamples.length,
      yearSentCount: yearSent.length,
      totalPendingCount: pendingSamples.length,
    };
  }, [scopedSamples, todayIso, currentYear]);

  // Date Range Filtered Samples (For Detailed Collection, Employee-wise, Village-wise, Subcentre-wise)
  const dateRangeFilteredSamples = useMemo(() => {
    return scopedSamples.filter((s) => {
      if (fromDate && s.sample_collection_date < fromDate) return false;
      if (toDate && s.sample_collection_date > toDate) return false;
      return true;
    });
  }, [scopedSamples, fromDate, toDate]);

  // Search filtered for detailed collection table
  const finalCollectionSamples = useMemo(() => {
    if (!searchQuery.trim()) return dateRangeFilteredSamples;
    const q = searchQuery.toLowerCase().trim();
    return dateRangeFilteredSamples.filter(
      (s) =>
        s.patient_name.toLowerCase().includes(q) ||
        s.malaria_smear_code.toLowerCase().includes(q) ||
        String(s.sample_number).includes(q) ||
        (s.village_name && s.village_name.toLowerCase().includes(q)) ||
        (s.employee_name && s.employee_name.toLowerCase().includes(q)) ||
        s.house_number.toLowerCase().includes(q)
    );
  }, [dateRangeFilteredSamples, searchQuery]);

  // Pagination for Collection Table
  const totalPages = Math.ceil(finalCollectionSamples.length / itemsPerPage) || 1;
  const paginatedCollectionSamples = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return finalCollectionSamples.slice(start, start + itemsPerPage);
  }, [finalCollectionSamples, currentPage, itemsPerPage]);

  // 10. DAILY REPORT LOGIC
  const dailySamples = useMemo(() => {
    return scopedSamples.filter((s) => s.sample_collection_date === dailyDate);
  }, [scopedSamples, dailyDate]);

  const dailyStats = useMemo(() => {
    const total = dailySamples.length;
    const sent = dailySamples.filter((s) => Boolean(s.sent_date)).length;
    const pending = dailySamples.filter((s) => !s.sent_date).length;
    return { date: dailyDate, total, sent, pending };
  }, [dailySamples, dailyDate]);

  // 11. MONTHLY REPORT LOGIC
  const monthlySelectedSamples = useMemo(() => {
    const monthStr = String(selectedMonth).padStart(2, '0');
    const prefix = `${selectedMonthYear}-${monthStr}`;
    return scopedSamples.filter((s) => s.sample_collection_date.startsWith(prefix));
  }, [scopedSamples, selectedMonth, selectedMonthYear]);

  const monthlyStats = useMemo(() => {
    const monthObj = MARATHI_MONTHS.find((m) => m.index === selectedMonth);
    const total = monthlySelectedSamples.length;
    const sent = monthlySelectedSamples.filter((s) => Boolean(s.sent_date)).length;
    const pending = monthlySelectedSamples.filter((s) => !s.sent_date).length;
    return {
      monthYear: `${monthObj?.name.split(' ')[0] || ''} ${selectedMonthYear}`,
      total,
      sent,
      pending,
    };
  }, [monthlySelectedSamples, selectedMonth, selectedMonthYear]);

  // 12. YEARLY REPORT LOGIC
  const yearlySelectedSamples = useMemo(() => {
    const yearStr = String(selectedYear);
    return scopedSamples.filter(
      (s) => s.sample_year === selectedYear || s.sample_collection_date.startsWith(yearStr)
    );
  }, [scopedSamples, selectedYear]);

  const yearlyStats = useMemo(() => {
    const total = yearlySelectedSamples.length;
    const sent = yearlySelectedSamples.filter((s) => Boolean(s.sent_date)).length;
    const pending = yearlySelectedSamples.filter((s) => !s.sent_date).length;
    return { year: selectedYear, total, sent, pending };
  }, [yearlySelectedSamples, selectedYear]);

  // 13. EMPLOYEE-WISE SUMMARY (Filtered by Date Range or Selected Tab Scope)
  const currentWorkingSamples = useMemo(() => {
    if (activeTab === 'monthly') return monthlySelectedSamples;
    if (activeTab === 'yearly') return yearlySelectedSamples;
    if (activeTab === 'daily') return dailySamples;
    return dateRangeFilteredSamples;
  }, [activeTab, monthlySelectedSamples, yearlySelectedSamples, dailySamples, dateRangeFilteredSamples]);

  const employeeSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        designation: string;
        smearCode: string;
        total: number;
        sent: number;
        pending: number;
      }
    >();

    // Seed from available employees
    availableEmployees.forEach((emp) => {
      map.set(emp.id, {
        name: emp.employee_name,
        designation: emp.designation || 'आरोग्य सेवक / सेविका',
        smearCode: emp.malaria_smear_code,
        total: 0,
        sent: 0,
        pending: 0,
      });
    });

    // Populate from samples
    currentWorkingSamples.forEach((s) => {
      if (s.employee_id && map.has(s.employee_id)) {
        const item = map.get(s.employee_id)!;
        item.total += 1;
        if (s.sent_date) {
          item.sent += 1;
        } else {
          item.pending += 1;
        }
      } else if (s.employee_name) {
        // Fallback employee by name
        const key = s.employee_id || s.employee_name;
        if (!map.has(key)) {
          map.set(key, {
            name: s.employee_name,
            designation: 'आरोग्य सेवक / सेविका',
            smearCode: s.malaria_smear_code,
            total: 0,
            sent: 0,
            pending: 0,
          });
        }
        const item = map.get(key)!;
        item.total += 1;
        if (s.sent_date) {
          item.sent += 1;
        } else {
          item.pending += 1;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [availableEmployees, currentWorkingSamples]);

  // 14. VILLAGE-WISE SUMMARY (IMPORTANT: Population & houses come from village_master)
  const villageSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        population: number;
        houses: number;
        total: number;
        sent: number;
        pending: number;
      }
    >();

    // Seed from available villages with real master values
    availableVillages.forEach((vil) => {
      map.set(vil.id, {
        name: vil.village_name,
        population: vil.population || 0,
        houses: vil.total_houses || 0,
        total: 0,
        sent: 0,
        pending: 0,
      });
    });

    currentWorkingSamples.forEach((s) => {
      if (s.village_id && map.has(s.village_id)) {
        const item = map.get(s.village_id)!;
        item.total += 1;
        if (s.sent_date) {
          item.sent += 1;
        } else {
          item.pending += 1;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [availableVillages, currentWorkingSamples]);

  // 15. SUBCENTRE-WISE SUMMARY (Population & houses calculated from villages of that Subcentre)
  const subcentreSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        population: number;
        houses: number;
        total: number;
        sent: number;
        pending: number;
      }
    >();

    // Calculate sum of population and houses for each subcentre
    [].forEach((sc) => {
      const subcentreVillages = villages.filter((v) => v.subcentre_id === sc.id);
      const totalPop = subcentreVillages.reduce((sum, v) => sum + (v.population || 0), 0);
      const totalHouses = subcentreVillages.reduce((sum, v) => sum + (v.total_houses || 0), 0);

      map.set(sc.id, {
        name: sc.subcentre_name,
        population: totalPop,
        houses: totalHouses,
        total: 0,
        sent: 0,
        pending: 0,
      });
    });

    currentWorkingSamples.forEach((s) => {
      if (s.subcentre_id && map.has(s.subcentre_id)) {
        const item = map.get(s.subcentre_id)!;
        item.total += 1;
        if (s.sent_date) {
          item.sent += 1;
        } else {
          item.pending += 1;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [ villages, currentWorkingSamples]);

  // 18. CHARTS DATA (Monthly Trend, Employee, Village)
  const chartMonthlyData = useMemo(() => {
    return MARATHI_MONTHS.map((m) => {
      const monthPrefix = `${selectedYear}-${String(m.index).padStart(2, '0')}`;
      const monthSamples = scopedSamples.filter((s) => s.sample_collection_date.startsWith(monthPrefix));
      const totalCollected = monthSamples.length;
      const totalSent = monthSamples.filter((s) => Boolean(s.sent_date)).length;
      const totalPending = monthSamples.filter((s) => !s.sent_date).length;

      return {
        monthNameMarathi: m.name.split(' ')[0],
        monthIndex: m.index,
        totalCollected,
        totalSent,
        totalPending,
      };
    });
  }, [scopedSamples, selectedYear]);

  const chartEmployeeData = useMemo(() => {
    return employeeSummary.slice(0, 8).map((emp) => ({
      employeeName: emp.name,
      smearCode: emp.smearCode,
      totalCollected: emp.total,
      totalSent: emp.sent,
      totalPending: emp.pending,
    }));
  }, [employeeSummary]);

  const chartVillageData = useMemo(() => {
    return villageSummary.slice(0, 8).map((vil) => ({
      villageName: vil.name,
      totalCollected: vil.total,
      totalSent: vil.sent,
      totalPending: vil.pending,
    }));
  }, [villageSummary]);

  // Metadata for Print Layout
  const printMetadata: PrintReportMetadata = useMemo(() => {
        const activeSc = subcentres.find((s) => s.id === "");
    const activeVil = villages.find((v) => v.id === filterVillageId);
    const activeEmp = employees.find((e) => e.id === filterEmployeeId);

    let reportTitleMarathi = 'रक्त नमुना संकलन अहवाल';
    let dateRangeText = `${formatIndianDate(fromDate)} ते ${formatIndianDate(toDate)}`;

    if (activeTab === 'daily') {
      reportTitleMarathi = 'दैनिक रक्त नमुना अहवाल';
      dateRangeText = formatIndianDate(dailyDate);
    } else if (activeTab === 'monthly') {
      const monthObj = MARATHI_MONTHS.find((m) => m.index === selectedMonth);
      reportTitleMarathi = 'मासिक रक्त नमुना अहवाल';
      dateRangeText = `${monthObj?.name.split(' ')[0] || ''} ${selectedMonthYear}`;
    } else if (activeTab === 'yearly') {
      reportTitleMarathi = 'वार्षिक रक्त नमुना अहवाल';
      dateRangeText = `वर्ष ${selectedYear}`;
    } else if (activeTab === 'employee') {
      reportTitleMarathi = 'कर्मचारीनिहाय नमुना अहवाल';
    } else if (activeTab === 'village') {
      reportTitleMarathi = 'गावनिहाय नमुना अहवाल';
    } else if (activeTab === 'subcentre') {
      reportTitleMarathi = 'उपकेंद्रनिहाय नमुना अहवाल';
    }

    return {
      reportTitleMarathi,
      phcName: 'सर्व',
      subcentreName: activeSc ? activeSc.subcentre_name : 'सर्व उपकेंद्र',
      villageName: activeVil ? activeVil.village_name : 'सर्व गावे',
      employeeName: activeEmp ? `${activeEmp.employee_name} (${activeEmp.malaria_smear_code})` : 'सर्व कर्मचारी',
      dateRangeText,
      generatedDate: formatIndianDate(todayIso),
    };
  }, [
    phcs,
    subcentres,
    villages,
    employees,
    
    
    filterVillageId,
    filterEmployeeId,
    activeTab,
    fromDate,
    toDate,
    dailyDate,
    selectedMonth,
    selectedMonthYear,
    selectedYear,
    todayIso,
  ]);

  // 16. PRINT FUNCTION
  const handlePrint = () => {
    window.print();
  };

  // 17. EXCEL / CSV EXPORT WITH UTF-8 BOM
  const handleExportExcel = () => {
    let csvContent = '\uFEFF'; // UTF-8 Byte Order Mark so Marathi characters render properly in Excel

    if (activeTab === 'collection' || activeTab === 'daily') {
      const dataToExport = activeTab === 'daily' ? dailySamples : finalCollectionSamples;
      csvContent += 'अ.क्र.,PHC,उपकेंद्र,गाव,कर्मचारी,मलेरिया स्मीअर कोड,मलेरिया घर क्रमांक,रुग्णाचे नाव,वय,लिंग,नमुना घेतल्याचा दिनांक,रक्त नमुना क्रमांक,पाठविल्याचा दिनांक,स्थिती\n';

      dataToExport.forEach((s, idx) => {
        const row = [
          idx + 1,
          `"${s.phc_name || ''}"`,
          `"${s.subcentre_name || ''}"`,
          `"${s.village_name || ''}"`,
          `"${s.employee_name || ''}"`,
          `"${s.malaria_smear_code}"`,
          `"${s.house_number || ''}"`,
          `"${s.patient_name}"`,
          s.age,
          s.gender,
          formatIndianDate(s.sample_collection_date),
          formatSampleNumber(s.sample_number),
          s.sent_date ? formatIndianDate(s.sent_date) : '-',
          s.sent_date ? 'पाठविले' : 'प्रलंबित',
        ];
        csvContent += row.join(',') + '\n';
      });
    } else if (activeTab === 'employee' || activeTab === 'monthly') {
      csvContent += 'अ.क्र.,कर्मचारी,पदनाम,Malaria Smear Code,एकूण रक्त नमुने,पाठविलेले,प्रलंबित\n';
      employeeSummary.forEach((emp, idx) => {
        const row = [
          idx + 1,
          `"${emp.name}"`,
          `"${emp.designation}"`,
          `"${emp.smearCode}"`,
          emp.total,
          emp.sent,
          emp.pending,
        ];
        csvContent += row.join(',') + '\n';
      });
    } else if (activeTab === 'village') {
      csvContent += 'अ.क्र.,गाव,लोकसंख्या,एकूण घरसंख्या,एकूण रक्त नमुने,पाठविलेले,प्रलंबित\n';
      villageSummary.forEach((v, idx) => {
        const row = [
          idx + 1,
          `"${v.name}"`,
          v.population,
          v.houses,
          v.total,
          v.sent,
          v.pending,
        ];
        csvContent += row.join(',') + '\n';
      });
    } else if (activeTab === 'subcentre' || activeTab === 'yearly') {
      csvContent += 'अ.क्र.,उपकेंद्र,लोकसंख्या,घरसंख्या,एकूण रक्त नमुने,पाठविलेले,प्रलंबित\n';
      subcentreSummary.forEach((sc, idx) => {
        const row = [
          idx + 1,
          `"${sc.name}"`,
          sc.population,
          sc.houses,
          sc.total,
          sc.sent,
          sc.pending,
        ];
        csvContent += row.join(',') + '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `malaria_report_${activeTab}_${todayIso}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Quick button: आजचा अहवाल
  const handleQuickTodayReport = () => {
    setDailyDate(todayIso);
    setFromDate(todayIso);
    setToDate(todayIso);
    setActiveTab('daily');
  };

  return (
    <div className="space-y-6">
      {/* CODE 12: Offline Pending Drafts Alert in Reports */}
      {pendingDraftsCount > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold shrink-0">
              <CloudOff className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-amber-950">
                ⚠️ Offline Data: काही नमुने अद्याप सिंक झालेले नाहीत ({pendingDraftsCount} नमुने प्रलंबित)
              </h4>
              <p className="text-[11px] sm:text-xs text-amber-900 mt-0.5">
                अहवालामध्ये केवळ ऑनलाइन डेटाबेसमध्ये सुरक्षित झालेले अधिकृत नमुने समाविष्ट आहेत. सर्व नमुने समाविष्ट करण्यासाठी कृपया सिंक करा.
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('offline-drafts')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <span>ड्राफ्ट्स सिंक करा</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* CODE 12: Offline No-Connection Banner if Reports cannot load */}
      {!isOnline && allSamples.length === 0 && !loading && (
        <div className="bg-rose-50 border border-rose-300 p-6 rounded-2xl text-center space-y-3 print:hidden">
          <WifiOff className="w-10 h-10 mx-auto text-rose-600" />
          <h3 className="font-extrabold text-base text-rose-900">
            इंटरनेट कनेक्शन आवश्यक आहे
          </h3>
          <p className="text-xs text-rose-700 max-w-md mx-auto">
            अहवाल डेटा लोड करण्यासाठी सक्रिय इंटरनेट कनेक्शन आवश्यक आहे. कृपया इंटरनेट सुरू करून पुन्हा प्रयत्न करा.
          </p>
          <button
            onClick={() => loadData()}
            className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
          >
            पुन्हा प्रयत्न करा
          </button>
        </div>
      )}

      {/* 1. Header Navigation & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-700 text-white shadow-xs">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              राष्ट्रीय हिवताप नियंत्रण कार्यक्रम
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              मलेरिया अहवाल (Malaria Reports & Analytics)
            </h2>
            <p className="text-xs text-slate-500">
              रक्त नमुना संकलन, प्रलंबित नमुने, सांख्यिकी विश्लेषण व शासकीय A4 प्रिंट अहवाल
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="report-quick-today-btn"
            type="button"
            onClick={handleQuickTodayReport}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold py-2.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>आजचा अहवाल</span>
          </button>

          <button
            id="report-excel-download-btn"
            type="button"
            onClick={handleExportExcel}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold py-2.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Excel डाउनलोड</span>
          </button>

          <button
            id="report-print-btn"
            type="button"
            onClick={handlePrint}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>प्रिंट करा (PDF)</span>
          </button>
        </div>
      </div>

      {/* 2. REPORT DASHBOARD KPI CARDS (Requirement 2) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 print:hidden">
        {/* Card 1: आजचे रक्त नमुने */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between hover:border-emerald-500 transition-colors">
          <div className="text-[11px] font-bold text-slate-500 leading-tight">
            आजचे रक्त नमुने
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {loading ? '...' : dashboardStats.todaySamplesCount}
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              आज
            </span>
          </div>
        </div>

        {/* Card 2: आज पाठविलेले नमुने */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between hover:border-emerald-500 transition-colors">
          <div className="text-[11px] font-bold text-slate-500 leading-tight">
            आज पाठविलेले नमुने
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-emerald-700">
              {loading ? '...' : dashboardStats.todaySentCount}
            </span>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
              पाठविले
            </span>
          </div>
        </div>

        {/* Card 3: या महिन्यातील रक्त नमुने */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between hover:border-emerald-500 transition-colors">
          <div className="text-[11px] font-bold text-slate-500 leading-tight">
            या महिन्यातील रक्त नमुने
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {loading ? '...' : dashboardStats.monthSamplesCount}
            </span>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
              चालू महिना
            </span>
          </div>
        </div>

        {/* Card 4: या महिन्यात पाठविलेले नमुने */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between hover:border-emerald-500 transition-colors">
          <div className="text-[11px] font-bold text-slate-500 leading-tight">
            या महिन्यात पाठविलेले
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-teal-700">
              {loading ? '...' : dashboardStats.monthSentCount}
            </span>
            <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded">
              पाठविले
            </span>
          </div>
        </div>

        {/* Card 5: या वर्षातील रक्त नमुने */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between hover:border-emerald-500 transition-colors">
          <div className="text-[11px] font-bold text-slate-500 leading-tight">
            या वर्षातील रक्त नमुने
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {loading ? '...' : dashboardStats.yearSamplesCount}
            </span>
            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
              {currentYear}
            </span>
          </div>
        </div>

        {/* Card 6: या वर्षातील पाठविलेले नमुने */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between hover:border-emerald-500 transition-colors">
          <div className="text-[11px] font-bold text-slate-500 leading-tight">
            या वर्षात पाठविलेले
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-emerald-800">
              {loading ? '...' : dashboardStats.yearSentCount}
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              एकूण
            </span>
          </div>
        </div>

        {/* Card 7: प्रलंबित रक्त नमुने */}
        <div className="bg-amber-50/80 rounded-xl border-2 border-amber-300 p-3.5 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-colors col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-amber-900 leading-tight">
            प्रलंबित रक्त नमुने
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-amber-900">
              {loading ? '...' : dashboardStats.totalPendingCount}
            </span>
            <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded">
              प्रलंबित
            </span>
          </div>
        </div>
      </div>

      {/* 3. FILTERS CARD (Requirements 3, 4, 5, 6, 7) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs print:hidden">
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              अहवाल शोध व गाळणी निकष (Report Filter Criteria)
            </span>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>रिफ्रेश</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          

          

          {/* Village Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              गाव (Village)
            </label>
            <select
              id="report-filter-village"
              value={filterVillageId}
              onChange={(e) => setFilterVillageId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
            >
              <option value="">सर्व गावे</option>
              {availableVillages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.village_name}
                </option>
              ))}
            </select>
          </div>

          {role === 'phc_controller' && (
      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">
          कर्मचारी (Employee)
        </label>
        <select
          id="report-filter-employee"
          value={filterEmployeeId}
          onChange={(e) => {
            setFilterEmployeeId(e.target.value);
            setFilterVillageId('');
          }}
          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
        >
          <option value="">सर्व कर्मचारी</option>
          {availableEmployees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.employee_name} {e.designation ? `(${e.designation})` : ''}
            </option>
          ))}
        </select>
      </div>
    )}

          {/* From Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              दिनांकापासून (From Date)
            </label>
            <input
              id="report-filter-from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
            />
          </div>

          {/* To Date & Submit */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              दिनांकापर्यंत (To Date)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id="report-filter-to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
              />
              <button
                id="report-filter-submit-btn"
                type="button"
                onClick={() => setCurrentPage(1)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-lg shrink-0 transition-colors cursor-pointer"
              >
                अहवाल पहा
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SUB-TABS NAVIGATION (Navigation between distinct government report types) */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-1 print:hidden">
        <button
          id="tab-collection-report"
          type="button"
          onClick={() => {
            setActiveTab('collection');
            setCurrentPage(1);
          }}
          className={`text-xs font-bold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'collection'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>रक्त नमुना संकलन अहवाल</span>
        </button>

        <button
          id="tab-daily-report"
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`text-xs font-bold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'daily'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>दैनिक अहवाल</span>
        </button>

        <button
          id="tab-monthly-report"
          type="button"
          onClick={() => setActiveTab('monthly')}
          className={`text-xs font-bold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'monthly'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>मासिक अहवाल</span>
        </button>

        <button
          id="tab-yearly-report"
          type="button"
          onClick={() => setActiveTab('yearly')}
          className={`text-xs font-bold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'yearly'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>वार्षिक अहवाल</span>
        </button>

        <button
          id="tab-employee-report"
          type="button"
          onClick={() => setActiveTab('employee')}
          className={`text-xs font-bold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'employee'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>कर्मचारीनिहाय अहवाल</span>
        </button>

        <button
          id="tab-village-report"
          type="button"
          onClick={() => setActiveTab('village')}
          className={`text-xs font-bold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'village'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>गावनिहाय अहवाल</span>
        </button>

        <button
          id="tab-subcentre-report"
          type="button"
          onClick={() => setActiveTab('subcentre')}
          className={`text-xs font-bold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'subcentre'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>उपकेंद्रनिहाय अहवाल</span>
        </button>

        <button
          id="tab-charts-view"
          type="button"
          onClick={() => setActiveTab('charts')}
          className={`text-xs font-bold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'charts'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>सांख्यिकी आलेख (Charts)</span>
        </button>
      </div>

      {/* 5. TAB CONTENT RENDERING */}

      {/* TAB 1: SAMPLE COLLECTION REPORT (रक्त नमुना संकलन अहवाल) */}
      {activeTab === 'collection' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                रक्त नमुना संकलन अहवाल (Sample Collection Report)
              </h3>
              <p className="text-xs text-slate-500">
                निवडलेल्या कालावधीतील सर्व रक्त नमुने, रुग्णांचा तपशील व प्रयोगशाळेत पाठविण्याची स्थिती
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="रुग्ण नाव, स्मीअर कोड, गाव..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">अ.क्र.</th>
                  <th className="px-3 py-3">PHC</th>
                  <th className="px-3 py-3">उपकेंद्र</th>
                  <th className="px-3 py-3">गाव</th>
                  <th className="px-3 py-3">कर्मचारी</th>
                  <th className="px-3 py-3">मलेरिया स्मीअर कोड</th>
                  <th className="px-3 py-3">मलेरिया घर क्र.</th>
                  <th className="px-3 py-3">रुग्णाचे नाव</th>
                  <th className="px-3 py-3 text-center w-12">वय</th>
                  <th className="px-3 py-3 text-center w-14">लिंग</th>
                  <th className="px-3 py-3">नमुना घेतल्याचा दिनांक</th>
                  <th className="px-3 py-3 text-center font-mono">रक्त नमुना क्र.</th>
                  <th className="px-3 py-3">पाठविल्याचा दिनांक</th>
                  <th className="px-3 py-3 text-center">स्थिती</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedCollectionSamples.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-8 text-center text-slate-400 italic">
                      या कालावधीत कोणतेही रक्त नमुने आढळले नाहीत.
                    </td>
                  </tr>
                ) : (
                  paginatedCollectionSamples.map((s, idx) => {
                    const rowNum = (currentPage - 1) * itemsPerPage + idx + 1;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 text-center font-mono text-slate-500">{rowNum}</td>
                        <td className="px-3 py-2.5 text-slate-900 font-medium">{s.phc_name || '-'}</td>
                        <td className="px-3 py-2.5 text-slate-800">{s.subcentre_name || '-'}</td>
                        <td className="px-3 py-2.5 text-slate-800">{s.village_name || '-'}</td>
                        <td className="px-3 py-2.5 text-slate-700">{s.employee_name || '-'}</td>
                        <td className="px-3 py-2.5 font-mono font-semibold text-emerald-800">
                          {s.malaria_smear_code}
                        </td>
                        <td className="px-3 py-2.5 font-mono">{s.house_number || '-'}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-900">{s.patient_name}</td>
                        <td className="px-3 py-2.5 text-center">{s.age}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              s.gender === 'पुरुष'
                                ? 'bg-blue-50 text-blue-700'
                                : s.gender === 'स्त्री'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {s.gender}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-700">
                          {formatIndianDate(s.sample_collection_date)}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-900">
                          {formatSampleNumber(s.sample_number)}
                        </td>
                        <td className="px-3 py-2.5 font-mono">
                          {s.sent_date ? (
                            <span className="text-emerald-700 font-semibold">
                              {formatIndianDate(s.sent_date)}
                            </span>
                          ) : (
                            <span className="text-amber-700 font-medium">प्रलंबित</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {s.sent_date ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              पाठविले
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                              <Clock className="w-3 h-3" />
                              प्रलंबित
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              एकूण <span className="font-bold text-slate-900">{finalCollectionSamples.length}</span> रक्त नमुने
              {finalCollectionSamples.length > 0 && (
                <span> (पृष्ठ {currentPage} / {totalPages})</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded p-1 text-xs"
              >
                <option value={15}>15 प्रति पृष्ठ</option>
                <option value={25}>25 प्रति पृष्ठ</option>
                <option value={50}>50 प्रति पृष्ठ</option>
              </select>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-semibold text-slate-800">{currentPage}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAILY REPORT (दैनिक अहवाल - Requirement 10) */}
      {activeTab === 'daily' && (
        <div className="space-y-4 print:hidden">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  दैनिक अहवाल (Daily Malaria Report)
                </h3>
                <p className="text-xs text-slate-500">
                  विशिष्ट दिनांकाचे रक्त नमुना संकलन, पाठविलेले व प्रलंबित नमुने
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">दिनांक:</label>
              <input
                id="daily-report-date-picker"
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold"
              />
              <button
                type="button"
                onClick={() => setDailyDate(todayIso)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors"
              >
                आजचा अहवाल
              </button>
            </div>
          </div>

          {/* Daily 3 Key Counters (Requirement 10) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-xs font-bold text-slate-500">आज किती रक्त नमुने घेतले</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{dailyStats.total}</div>
              <div className="text-[11px] text-slate-500 mt-1">दिनांक: {formatIndianDate(dailyDate)}</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-xs font-bold text-emerald-800">आज किती नमुने पाठविले</div>
              <div className="mt-2 text-2xl font-black text-emerald-700">{dailyStats.sent}</div>
              <div className="text-[11px] text-emerald-600 mt-1">प्रयोगशाळेत पोहोचलेले</div>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-300 p-4 shadow-xs">
              <div className="text-xs font-bold text-amber-900">आज किती प्रलंबित आहेत</div>
              <div className="mt-2 text-2xl font-black text-amber-900">{dailyStats.pending}</div>
              <div className="text-[11px] text-amber-700 mt-1">पाठविण्यासाठी बाकी</div>
            </div>
          </div>

          {/* Daily Samples Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              {formatIndianDate(dailyDate)} रोजीचे रक्त नमुने तपशील ({dailySamples.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="p-2.5 text-center w-8">अ.क्र.</th>
                    <th className="p-2.5">उपकेंद्र</th>
                    <th className="p-2.5">गाव</th>
                    <th className="p-2.5">कर्मचारी</th>
                    <th className="p-2.5">स्मीअर कोड</th>
                    <th className="p-2.5">रुग्णाचे नाव</th>
                    <th className="p-2.5 text-center">वय</th>
                    <th className="p-2.5 text-center">लिंग</th>
                    <th className="p-2.5 text-center">रक्त नमुना क्र.</th>
                    <th className="p-2.5 text-center">स्थिती</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dailySamples.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-400 italic">
                        {formatIndianDate(dailyDate)} या दिनांकासाठी कोणतेही रक्त नमुने नोंदविलेले नाहीत.
                      </td>
                    </tr>
                  ) : (
                    dailySamples.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 font-medium">{s.subcentre_name}</td>
                        <td className="p-2.5">{s.village_name}</td>
                        <td className="p-2.5">{s.employee_name}</td>
                        <td className="p-2.5 font-mono font-semibold">{s.malaria_smear_code}</td>
                        <td className="p-2.5 font-bold text-slate-900">{s.patient_name}</td>
                        <td className="p-2.5 text-center">{s.age}</td>
                        <td className="p-2.5 text-center">{s.gender}</td>
                        <td className="p-2.5 text-center font-mono font-bold">
                          {formatSampleNumber(s.sample_number)}
                        </td>
                        <td className="p-2.5 text-center">
                          {s.sent_date ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                              पाठविले
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                              प्रलंबित
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MONTHLY REPORT (मासिक अहवाल - Requirement 11) */}
      {activeTab === 'monthly' && (
        <div className="space-y-4 print:hidden">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                मासिक अहवाल (Monthly Malaria Summary)
              </h3>
              <p className="text-xs text-slate-500">
                महिन्याची निवड करून कर्मचारीनिहाय नमुना सारांश पहा
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-bold text-slate-700">महिना:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold"
              >
                {MARATHI_MONTHS.map((m) => (
                  <option key={m.index} value={m.index}>
                    {m.name}
                  </option>
                ))}
              </select>

              <label className="text-xs font-bold text-slate-700 ml-2">वर्ष:</label>
              <select
                value={selectedMonthYear}
                onChange={(e) => setSelectedMonthYear(Number(e.target.value))}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Monthly 3 Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-xs font-bold text-slate-500">एकूण रक्त नमुने</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{monthlyStats.total}</div>
              <div className="text-[11px] text-slate-500 mt-1">{monthlyStats.monthYear}</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-xs font-bold text-emerald-800">पाठविलेले नमुने</div>
              <div className="mt-2 text-2xl font-black text-emerald-700">{monthlyStats.sent}</div>
              <div className="text-[11px] text-emerald-600 mt-1">प्रयोगशाळेत पाठविलेले</div>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-300 p-4 shadow-xs">
              <div className="text-xs font-bold text-amber-900">प्रलंबित नमुने</div>
              <div className="mt-2 text-2xl font-black text-amber-900">{monthlyStats.pending}</div>
              <div className="text-[11px] text-amber-700 mt-1">उपकेंद्र स्तरावर प्रलंबित</div>
            </div>
          </div>

          {/* Monthly Employee-wise Summary Table (Requirement 11) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex justify-between items-center">
              <span>कर्मचारीनिहाय सारांश (Employee-wise Summary)</span>
              <span className="text-[11px] text-slate-500 font-normal">{monthlyStats.monthYear}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="p-2.5 text-center w-8">अ.क्र.</th>
                    <th className="p-2.5">कर्मचारी</th>
                    <th className="p-2.5">पदनाम</th>
                    <th className="p-2.5 font-mono">Smear Code</th>
                    <th className="p-2.5 text-center">एकूण नमुने</th>
                    <th className="p-2.5 text-center">पाठविलेले</th>
                    <th className="p-2.5 text-center">प्रलंबित</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {employeeSummary.map((emp, idx) => (
                    <tr key={emp.name + idx} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900">{emp.name}</td>
                      <td className="p-2.5 text-slate-600">{emp.designation}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-800">{emp.smearCode}</td>
                      <td className="p-2.5 text-center font-bold text-slate-900">{emp.total}</td>
                      <td className="p-2.5 text-center font-semibold text-emerald-700">{emp.sent}</td>
                      <td className="p-2.5 text-center font-semibold text-amber-700">{emp.pending}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={4} className="p-2.5 text-right pr-4">
                      एकूण (Total):
                    </td>
                    <td className="p-2.5 text-center text-slate-900">{monthlyStats.total}</td>
                    <td className="p-2.5 text-center text-emerald-800">{monthlyStats.sent}</td>
                    <td className="p-2.5 text-center text-amber-800">{monthlyStats.pending}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: YEARLY REPORT (वार्षिक अहवाल - Requirement 12) */}
      {activeTab === 'yearly' && (
        <div className="space-y-6 print:hidden">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                वार्षिक अहवाल (Yearly Malaria Report)
              </h3>
              <p className="text-xs text-slate-500">
                वार्षिक नमुना संकलन, कर्मचारीनिहाय, गावनिहाय व उपकेंद्रनिहाय संपूर्ण अहवाल
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">वर्ष (Year):</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Yearly 3 Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-xs font-bold text-slate-500">एकूण रक्त नमुने</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{yearlyStats.total}</div>
              <div className="text-[11px] text-slate-500 mt-1">वर्ष: {selectedYear}</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-xs font-bold text-emerald-800">पाठविलेले नमुने</div>
              <div className="mt-2 text-2xl font-black text-emerald-700">{yearlyStats.sent}</div>
              <div className="text-[11px] text-emerald-600 mt-1">तपासणीसाठी पाठविलेले</div>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-300 p-4 shadow-xs">
              <div className="text-xs font-bold text-amber-900">प्रलंबित नमुने</div>
              <div className="mt-2 text-2xl font-black text-amber-900">{yearlyStats.pending}</div>
              <div className="text-[11px] text-amber-700 mt-1">पाठविणे बाकी</div>
            </div>
          </div>

          {/* 1. Employee-wise Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              १. कर्मचारीनिहाय वार्षिक सारांश (Employee-wise Summary - {selectedYear})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 font-bold border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="p-2.5 text-center w-8">अ.क्र.</th>
                    <th className="p-2.5">कर्मचारी</th>
                    <th className="p-2.5 font-mono">Smear Code</th>
                    <th className="p-2.5 text-center">एकूण नमुने</th>
                    <th className="p-2.5 text-center">पाठविलेले</th>
                    <th className="p-2.5 text-center">प्रलंबित</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {employeeSummary.map((emp, idx) => (
                    <tr key={emp.name + idx} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900">{emp.name}</td>
                      <td className="p-2.5 font-mono font-semibold text-emerald-800">{emp.smearCode}</td>
                      <td className="p-2.5 text-center font-bold">{emp.total}</td>
                      <td className="p-2.5 text-center text-emerald-700 font-semibold">{emp.sent}</td>
                      <td className="p-2.5 text-center text-amber-700 font-semibold">{emp.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Village-wise Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              २. गावनिहाय वार्षिक सारांश (Village-wise Summary - {selectedYear})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 font-bold border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="p-2.5 text-center w-8">अ.क्र.</th>
                    <th className="p-2.5">गाव</th>
                    <th className="p-2.5 text-center">लोकसंख्या</th>
                    <th className="p-2.5 text-center">एकूण घरसंख्या</th>
                    <th className="p-2.5 text-center">एकूण रक्त नमुने</th>
                    <th className="p-2.5 text-center">पाठविलेले</th>
                    <th className="p-2.5 text-center">प्रलंबित</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {villageSummary.map((v, idx) => (
                    <tr key={v.name + idx} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900">{v.name}</td>
                      <td className="p-2.5 text-center">{v.population.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-center">{v.houses.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-center font-bold">{v.total}</td>
                      <td className="p-2.5 text-center text-emerald-700 font-semibold">{v.sent}</td>
                      <td className="p-2.5 text-center text-amber-700 font-semibold">{v.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Subcentre-wise Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              ३. उपकेंद्रनिहाय वार्षिक सारांश (Subcentre-wise Summary - {selectedYear})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 font-bold border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="p-2.5 text-center w-8">अ.क्र.</th>
                    <th className="p-2.5">उपकेंद्र</th>
                    <th className="p-2.5 text-center">लोकसंख्या</th>
                    <th className="p-2.5 text-center">घरसंख्या</th>
                    <th className="p-2.5 text-center">एकूण रक्त नमुने</th>
                    <th className="p-2.5 text-center">पाठविलेले</th>
                    <th className="p-2.5 text-center">प्रलंबित</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {subcentreSummary.map((sc, idx) => (
                    <tr key={sc.name + idx} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900">{sc.name}</td>
                      <td className="p-2.5 text-center">{sc.population.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-center">{sc.houses.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-center font-bold">{sc.total}</td>
                      <td className="p-2.5 text-center text-emerald-700 font-semibold">{sc.sent}</td>
                      <td className="p-2.5 text-center text-amber-700 font-semibold">{sc.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EMPLOYEE-WISE REPORT (कर्मचारीनिहाय अहवाल - Requirement 13) */}
      {activeTab === 'employee' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                कर्मचारीनिहाय अहवाल (Employee-wise Report)
              </h3>
              <p className="text-xs text-slate-500">
                कालावधी: {formatIndianDate(fromDate)} ते {formatIndianDate(toDate)}
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-600">
              एकूण कर्मचारी: {employeeSummary.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="p-3 text-center w-10">अ.क्र.</th>
                  <th className="p-3">कर्मचारी</th>
                  <th className="p-3">पदनाम</th>
                  <th className="p-3 font-mono">Malaria Smear Code</th>
                  <th className="p-3 text-center">एकूण रक्त नमुने</th>
                  <th className="p-3 text-center">पाठविलेले</th>
                  <th className="p-3 text-center">प्रलंबित</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {employeeSummary.map((emp, idx) => (
                  <tr key={emp.name + idx} className="hover:bg-slate-50">
                    <td className="p-3 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{emp.name}</td>
                    <td className="p-3 text-slate-600">{emp.designation}</td>
                    <td className="p-3 font-mono font-bold text-emerald-800">{emp.smearCode}</td>
                    <td className="p-3 text-center font-black text-slate-900 text-sm">{emp.total}</td>
                    <td className="p-3 text-center font-bold text-emerald-700">{emp.sent}</td>
                    <td className="p-3 text-center font-bold text-amber-700">{emp.pending}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={4} className="p-3 text-right pr-6">
                    एकूण (Total):
                  </td>
                  <td className="p-3 text-center text-slate-950 text-sm">
                    {employeeSummary.reduce((sum, e) => sum + e.total, 0)}
                  </td>
                  <td className="p-3 text-center text-emerald-800">
                    {employeeSummary.reduce((sum, e) => sum + e.sent, 0)}
                  </td>
                  <td className="p-3 text-center text-amber-800">
                    {employeeSummary.reduce((sum, e) => sum + e.pending, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: VILLAGE-WISE REPORT (गावनिहाय अहवाल - Requirement 14) */}
      {activeTab === 'village' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                गावनिहाय अहवाल (Village-wise Report)
              </h3>
              <p className="text-xs text-slate-500">
                गावपातळीवरील लोकसंख्या, एकूण घरे व संकलित रक्त नमुने स्थिती
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-600">
              एकूण गावे: {villageSummary.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="p-3 text-center w-10">अ.क्र.</th>
                  <th className="p-3">गाव</th>
                  <th className="p-3 text-center">लोकसंख्या (village_master)</th>
                  <th className="p-3 text-center">एकूण घरसंख्या</th>
                  <th className="p-3 text-center">एकूण रक्त नमुने</th>
                  <th className="p-3 text-center">पाठविलेले</th>
                  <th className="p-3 text-center">प्रलंबित</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {villageSummary.map((v, idx) => (
                  <tr key={v.name + idx} className="hover:bg-slate-50">
                    <td className="p-3 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{v.name}</td>
                    <td className="p-3 text-center font-mono">{v.population.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-center font-mono">{v.houses.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-center font-black text-slate-900 text-sm">{v.total}</td>
                    <td className="p-3 text-center font-bold text-emerald-700">{v.sent}</td>
                    <td className="p-3 text-center font-bold text-amber-700">{v.pending}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={2} className="p-3 text-right pr-6">
                    एकूण (Total):
                  </td>
                  <td className="p-3 text-center">
                    {villageSummary.reduce((sum, v) => sum + v.population, 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-center">
                    {villageSummary.reduce((sum, v) => sum + v.houses, 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-center text-slate-950 text-sm">
                    {villageSummary.reduce((sum, v) => sum + v.total, 0)}
                  </td>
                  <td className="p-3 text-center text-emerald-800">
                    {villageSummary.reduce((sum, v) => sum + v.sent, 0)}
                  </td>
                  <td className="p-3 text-center text-amber-800">
                    {villageSummary.reduce((sum, v) => sum + v.pending, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: SUBCENTRE-WISE REPORT (उपकेंद्रनिहाय अहवाल - Requirement 15) */}
      {activeTab === 'subcentre' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                उपकेंद्रनिहाय अहवाल (Subcentre-wise Report)
              </h3>
              <p className="text-xs text-slate-500">
                उपकेंद्राशी संलग्न गावांच्या लोकसंख्या व घरसंख्येनुसार नमुना कामगिरी
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-600">
              एकूण उपकेंद्रे: {subcentreSummary.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="p-3 text-center w-10">अ.क्र.</th>
                  <th className="p-3">उपकेंद्र</th>
                  <th className="p-3 text-center">लोकसंख्या (गावांची बेरीज)</th>
                  <th className="p-3 text-center">घरसंख्या</th>
                  <th className="p-3 text-center">एकूण रक्त नमुने</th>
                  <th className="p-3 text-center">पाठविलेले</th>
                  <th className="p-3 text-center">प्रलंबित</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {subcentreSummary.map((sc, idx) => (
                  <tr key={sc.name + idx} className="hover:bg-slate-50">
                    <td className="p-3 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{sc.name}</td>
                    <td className="p-3 text-center font-mono">{sc.population.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-center font-mono">{sc.houses.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-center font-black text-slate-900 text-sm">{sc.total}</td>
                    <td className="p-3 text-center font-bold text-emerald-700">{sc.sent}</td>
                    <td className="p-3 text-center font-bold text-amber-700">{sc.pending}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={2} className="p-3 text-right pr-6">
                    एकूण (Total):
                  </td>
                  <td className="p-3 text-center">
                    {subcentreSummary.reduce((sum, sc) => sum + sc.population, 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-center">
                    {subcentreSummary.reduce((sum, sc) => sum + sc.houses, 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-center text-slate-950 text-sm">
                    {subcentreSummary.reduce((sum, sc) => sum + sc.total, 0)}
                  </td>
                  <td className="p-3 text-center text-emerald-800">
                    {subcentreSummary.reduce((sum, sc) => sum + sc.sent, 0)}
                  </td>
                  <td className="p-3 text-center text-amber-800">
                    {subcentreSummary.reduce((sum, sc) => sum + sc.pending, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: CHARTS VIEW (सांख्यिकी आलेख - Requirement 18) */}
      {activeTab === 'charts' && (
        <div className="print:hidden">
          <MalariaReportCharts
            monthlyData={chartMonthlyData}
            employeeData={chartEmployeeData}
            villageData={chartVillageData}
          />
        </div>
      )}

      {/* 6. A4 PRINT-ONLY VIEW (Requirement 16) */}
      {/* Visible ONLY when window.print() is called */}
      <MalariaPrintReportView
        metadata={printMetadata}
        activeTab={activeTab === 'charts' ? 'collection' : activeTab}
        samples={activeTab === 'daily' ? dailySamples : finalCollectionSamples}
        employeeSummary={employeeSummary}
        villageSummary={villageSummary}
        subcentreSummary={subcentreSummary}
        monthlyStats={monthlyStats}
        dailyStats={dailyStats}
      />
    </div>
  );
};
