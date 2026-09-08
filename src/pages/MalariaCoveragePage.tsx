import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Target,
  Search,
  Filter,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  MapPin,
  Building2,
  Users,
  Home,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  ArrowUpDown,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  PageId,
  MalariaBloodSample,
  VillageMaster,
  SubcentreMaster,
  PhcMaster,
  EmployeeMaster,
} from '../types';
import { useAuth } from '../hooks/useAuth';
import { malariaService } from '../services/malariaService';
import { masterDataService } from '../services/masterDataService';
import {
  MalariaCoverageCharts,
  VillageChartItem,
  EmployeeChartItem,
  SubcentreChartItem,
  MonthlyChartItem,
  DailyChartItem,
} from '../components/malariaCoverage/MalariaCoverageCharts';
import {
  MalariaCoveragePrintView,
  PrintVillageRow,
  PrintEmployeeRow,
} from '../components/malariaCoverage/MalariaCoveragePrintView';

interface MalariaCoveragePageProps {
  onNavigate?: (page: PageId) => void;
}

type CoverageTab =
  | 'village'
  | 'subcentre'
  | 'employee'
  | 'phc'
  | 'daily'
  | 'ranking'
  | 'charts';

type SortOption =
  | 'samples-desc'
  | 'samples-asc'
  | 'coverage-desc'
  | 'coverage-asc'
  | 'pending-desc'
  | 'village-asc';

export const MalariaCoveragePage: React.FC<MalariaCoveragePageProps> = ({ onNavigate }) => {
  const { role, isPhcController, isSubcentreStaff } = useAuth();

  // Master records
  const [phcs, setPhcs] = useState<PhcMaster[]>([]);
  const [subcentres, setSubcentres] = useState<SubcentreMaster[]>([]);
  const [villages, setVillages] = useState<VillageMaster[]>([]);
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [allSamples, setAllSamples] = useState<MalariaBloodSample[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active view tab
  const [activeTab, setActiveTab] = useState<CoverageTab>('village');

  // Filter States
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
      const [selectedVillageId, setSelectedVillageId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // Sorting state for village table
  const [villageSort, setVillageSort] = useState<SortOption>('samples-desc');

  // Selected year for monthly trend
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Format Helper
  const getTodayString = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getMonthStartString = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  };

  const getYearStartString = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  };

  // 1. Initial Load of Master Data & Samples
  const loadData = useCallback(async () => {
    setIsLoading(true);
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
      setAllSamples(sampList);

      // Lock filter for Subcentre staff if applicable
      if (isSubcentreStaff) {
        if (sList.length > 0) {
          const firstSub = sList[0];
          ((_: any) => {})(firstSub.id);
          ((_: any) => {})(firstSub.phc_id);
        }
      }
    } catch (err) {
      console.error('Error loading coverage data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSubcentreStaff]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Cascading Filter changes
  const handlePhcChange = (phcId: string) => {
    ((_: any) => {})(phcId);
        setSelectedVillageId('');
    setSelectedEmployeeId('');
  };

  const handleSubcentreChange = (subId: string) => {
    ((_: any) => {})(subId);
    setSelectedVillageId('');
    setSelectedEmployeeId('');

    // Sync PHC if chosen directly
    if (subId) {
      const sub = subcentres.find((s) => s.id === subId);
      if (sub && false) {
        ((_: any) => {})(sub.phc_id);
      }
    }
  };

  const handleVillageChange = (vId: string) => {
    setSelectedVillageId(vId);
    if (vId) {
      const v = villages.find((item) => item.id === vId);
      if (v) {
        ((_: any) => {})(v.subcentre_id);
        const sub = subcentres.find((s) => s.id === v.subcentre_id);
        if (sub && false) {
          ((_: any) => {})(sub.phc_id);
        }
      }
    }
  };

  // Filter Buttons
  const applyTodayFilter = () => {
    const today = getTodayString();
    setFilterStartDate(today);
    setFilterEndDate(today);
  };

  const applyThisMonthFilter = () => {
    setFilterStartDate(getMonthStartString());
    setFilterEndDate(getTodayString());
  };

  const applyThisYearFilter = () => {
    setFilterStartDate(getYearStartString());
    setFilterEndDate(getTodayString());
  };

  const handleResetFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    if (isPhcController) {
                }
    setSelectedVillageId('');
    setSelectedEmployeeId('');
  };

  // Available cascading lists based on selections
  

  // Master Entities In Scope (for Population, Houses & Villages counts)
  const scopedVillages = useMemo(() => {
    let vList = villages;
    if (isSubcentreStaff && "") {
      vList = vList.filter((v) => v.subcentre_id === "");
    } else if (selectedVillageId) {
      vList = vList.filter((v) => v.id === selectedVillageId);
    } else if (false) {
      vList = vList.filter((v) => v.subcentre_id === "");
    } else if (false) {
      const validSubIds = new Set(
        subcentres.filter((s) => s.phc_id === "").map((s) => s.id)
      );
      vList = vList.filter((v) => validSubIds.has(v.subcentre_id));
    }
    return vList;
  }, [villages, subcentres, selectedVillageId,   isSubcentreStaff]);

  const scopedSubcentres = useMemo(() => {
    if (isSubcentreStaff && "") {
      return subcentres.filter((s) => s.id === "");
    }
    if (false) {
      return subcentres.filter((s) => s.id === "");
    }
    if (false) {
      return subcentres.filter((s) => s.phc_id === "");
    }
    return subcentres;
  }, [subcentres,   isSubcentreStaff]);

  const scopedEmployees = useMemo(() => {
    if (selectedEmployeeId) {
      return employees.filter((e) => e.id === selectedEmployeeId);
    }
    if (false) {
      return employees.filter((e) => e.subcentre_id === "");
    }
    if (false) {
      const validSubIds = new Set(
        subcentres.filter((s) => s.phc_id === "").map((s) => s.id)
      );
      return employees.filter((e) => validSubIds.has(e.subcentre_id));
    }
    return employees;
  }, [employees, subcentres, selectedEmployeeId,  ""]);

  // Filtered Samples based on active filter state
  const filteredSamples = useMemo(() => {
    return allSamples.filter((samp) => {
      // 1. Role lock for subcentre staff
      if (isSubcentreStaff && "") {
        if (samp.subcentre_id && samp.subcentre_id !== "") {
          return false;
        }
      }

      // 2. PHC Filter
       {
        return false;
      }

      // 3. Subcentre Filter
       {
        return false;
      }

      // 4. Village Filter
      if (selectedVillageId && samp.village_id !== selectedVillageId) {
        return false;
      }

      // 5. Employee Filter
      if (selectedEmployeeId && samp.employee_id !== selectedEmployeeId) {
        return false;
      }

      // 6. Date Range
      const sampleDate = samp.sample_collection_date;
      if (filterStartDate && sampleDate < filterStartDate) {
        return false;
      }
      if (filterEndDate && sampleDate > filterEndDate) {
        return false;
      }

      return true;
    });
  }, [
    allSamples,
    
    
    selectedVillageId,
    selectedEmployeeId,
    filterStartDate,
    filterEndDate,
    isSubcentreStaff,
  ]);

  // 3. MAIN PERFORMANCE CARDS CALCULATIONS (8 Live KPI Cards)
  const performanceKPIs = useMemo(() => {
    const totalVillages = scopedVillages.length;
    const totalPopulation = scopedVillages.reduce((sum, v) => sum + (v.population || 0), 0);
    const totalHouses = scopedVillages.reduce((sum, v) => sum + (v.total_houses || 0), 0);

    const totalSamples = filteredSamples.length;
    const sentSamples = filteredSamples.filter(
      (s) => s.sent_date !== null && s.sent_date !== undefined && s.sent_date !== ''
    ).length;
    const pendingSamples = filteredSamples.filter(
      (s) => !s.sent_date || s.sent_date === ''
    ).length;

    const activeEmployees = scopedEmployees.filter((e) => e.is_active).length;

    const avgSamplesPerVillage =
      totalVillages > 0 ? (totalSamples / totalVillages).toFixed(1) : '0';

    return {
      totalVillages,
      totalPopulation,
      totalHouses,
      totalSamples,
      sentSamples,
      pendingSamples,
      activeEmployees,
      avgSamplesPerVillage,
    };
  }, [scopedVillages, filteredSamples, scopedEmployees]);

  // 4. COVERAGE & PERFORMANCE CALCULATIONS: VILLAGE-WISE
  const villagePerformanceList = useMemo(() => {
    // Map samples by village_id
    const samplesByVillage = new Map<string, MalariaBloodSample[]>();
    for (const samp of filteredSamples) {
      const vId = samp.village_id;
      if (!samplesByVillage.has(vId)) {
        samplesByVillage.set(vId, []);
      }
      samplesByVillage.get(vId)!.push(samp);
    }

    const list = scopedVillages.map((village) => {
      const vSamples = samplesByVillage.get(village.id) || [];
      const sampleCount = vSamples.length;

      const sentCount = vSamples.filter(
        (s) => s.sent_date !== null && s.sent_date !== undefined && s.sent_date !== ''
      ).length;
      const pendingCount = sampleCount - sentCount;

      // Unique covered houses: non-empty house_number
      const uniqueHouses = new Set<string>();
      for (const s of vSamples) {
        const rawHouse = s.house_number?.trim();
        if (rawHouse) {
          uniqueHouses.add(rawHouse.toLowerCase());
        }
      }
      const coveredHouses = uniqueHouses.size;

      const population = village.population || 0;
      const totalHouses = village.total_houses || 0;

      // House Coverage %
      const coveragePct =
        totalHouses > 0 ? (coveredHouses / totalHouses) * 100 : 0;

      // Samples per 100 Population
      const samplesPer100Pop =
        population > 0 ? (sampleCount / population) * 100 : 0;

      // Samples per 100 Houses
      const samplesPer100Houses =
        totalHouses > 0 ? (sampleCount / totalHouses) * 100 : 0;

      return {
        id: village.id,
        villageName: village.village_name,
        subcentreName: village.subcentre_name || '-',
        subcentreId: village.subcentre_id,
        population,
        totalHouses,
        samples: sampleCount,
        sent: sentCount,
        pending: pendingCount,
        coveredHouses,
        coveragePct,
        samplesPer100Pop,
        samplesPer100Houses,
      };
    });

    // Apply Sorting
    return list.sort((a, b) => {
      switch (villageSort) {
        case 'samples-desc':
          return b.samples - a.samples;
        case 'samples-asc':
          return a.samples - b.samples;
        case 'coverage-desc':
          return b.coveragePct - a.coveragePct;
        case 'coverage-asc':
          return a.coveragePct - b.coveragePct;
        case 'pending-desc':
          return b.pending - a.pending;
        case 'village-asc':
          return a.villageName.localeCompare(b.villageName, 'mr');
        default:
          return b.samples - a.samples;
      }
    });
  }, [scopedVillages, filteredSamples, villageSort]);

  // 5. SUBCENTRE-WISE PERFORMANCE
  const subcentrePerformanceList = useMemo(() => {
    return scopedSubcentres.map((sub) => {
      const subVillages = villages.filter((v) => v.subcentre_id === sub.id);
      const totalVillages = subVillages.length;
      const totalPopulation = subVillages.reduce((sum, v) => sum + (v.population || 0), 0);
      const totalHouses = subVillages.reduce((sum, v) => sum + (v.total_houses || 0), 0);

      // Samples in this subcentre
      const subSamples = filteredSamples.filter(
        (s) => s.subcentre_id === sub.id || subVillages.some((v) => v.id === s.village_id)
      );
      const sampleCount = subSamples.length;
      const sentCount = subSamples.filter(
        (s) => s.sent_date !== null && s.sent_date !== undefined && s.sent_date !== ''
      ).length;
      const pendingCount = sampleCount - sentCount;

      // Unique covered houses per village in this subcentre, then summed
      let coveredHouses = 0;
      for (const v of subVillages) {
        const vSamps = subSamples.filter((s) => s.village_id === v.id);
        const vUnique = new Set<string>();
        for (const s of vSamps) {
          const h = s.house_number?.trim();
          if (h) vUnique.add(h.toLowerCase());
        }
        coveredHouses += vUnique.size;
      }

      const coveragePct = totalHouses > 0 ? (coveredHouses / totalHouses) * 100 : 0;
      const samplesPer100Pop = totalPopulation > 0 ? (sampleCount / totalPopulation) * 100 : 0;
      const samplesPer100Houses = totalHouses > 0 ? (sampleCount / totalHouses) * 100 : 0;

      return {
        id: sub.id,
        subcentreName: sub.subcentre_name,
        phcName: sub.phc_name || '-',
        totalVillages,
        totalPopulation,
        totalHouses,
        samples: sampleCount,
        sent: sentCount,
        pending: pendingCount,
        coveredHouses,
        coveragePct,
        samplesPer100Pop,
        samplesPer100Houses,
      };
    });
  }, [scopedSubcentres, villages, filteredSamples]);

  // 6. EMPLOYEE-WISE PERFORMANCE
  const employeePerformanceList = useMemo(() => {
    return scopedEmployees.map((emp) => {
      const empSamples = filteredSamples.filter((s) => s.employee_id === emp.id);
      const sampleCount = empSamples.length;
      const sentCount = empSamples.filter(
        (s) => s.sent_date !== null && s.sent_date !== undefined && s.sent_date !== ''
      ).length;
      const pendingCount = sampleCount - sentCount;

      // Unique house_number covered by this employee
      const uniqueHouses = new Set<string>();
      for (const s of empSamples) {
        const h = s.house_number?.trim();
        if (h) uniqueHouses.add(`${s.village_id}_${h.toLowerCase()}`);
      }
      const coveredHouses = uniqueHouses.size;

      // Employee's subcentre houses for reference
      const subVillages = villages.filter((v) => v.subcentre_id === emp.subcentre_id);
      const subTotalHouses = subVillages.reduce((sum, v) => sum + (v.total_houses || 0), 0);
      const coveragePct = subTotalHouses > 0 ? (coveredHouses / subTotalHouses) * 100 : 0;

      return {
        id: emp.id,
        employeeName: emp.employee_name,
        designation: emp.designation || '-',
        smearCode: emp.malaria_smear_code,
        subcentreName: emp.subcentre_name || '-',
        samples: sampleCount,
        sent: sentCount,
        pending: pendingCount,
        coveredHouses,
        coveragePct,
      };
    }).sort((a, b) => b.samples - a.samples);
  }, [scopedEmployees, filteredSamples, villages]);

  // 7. PHC-WISE PERFORMANCE (For PHC Controller)
  const phcPerformanceList = useMemo(() => {
    return phcs.map((phc) => {
      const phcSubs = subcentres.filter((s) => s.phc_id === phc.id);
      const subIds = new Set(phcSubs.map((s) => s.id));
      const phcVillages = villages.filter((v) => subIds.has(v.subcentre_id));

      const totalSubcentres = phcSubs.length;
      const totalVillages = phcVillages.length;
      const population = phcVillages.reduce((sum, v) => sum + (v.population || 0), 0);
      const totalHouses = phcVillages.reduce((sum, v) => sum + (v.total_houses || 0), 0);

      const phcSamples = allSamples.filter(
        (s) => s.phc_id === phc.id || subIds.has(s.subcentre_id || '')
      );
      const sampleCount = phcSamples.length;
      const sentCount = phcSamples.filter(
        (s) => s.sent_date !== null && s.sent_date !== undefined && s.sent_date !== ''
      ).length;
      const pendingCount = sampleCount - sentCount;

      let coveredHouses = 0;
      for (const v of phcVillages) {
        const vSamps = phcSamples.filter((s) => s.village_id === v.id);
        const vUnique = new Set<string>();
        for (const s of vSamps) {
          const h = s.house_number?.trim();
          if (h) vUnique.add(h.toLowerCase());
        }
        coveredHouses += vUnique.size;
      }

      const coveragePct = totalHouses > 0 ? (coveredHouses / totalHouses) * 100 : 0;

      return {
        id: phc.id,
        phcName: phc.phc_name,
        taluka: phc.taluka || '-',
        totalSubcentres,
        totalVillages,
        population,
        totalHouses,
        samples: sampleCount,
        sent: sentCount,
        pending: pendingCount,
        coveredHouses,
        coveragePct,
      };
    });
  }, [phcs, subcentres, villages, allSamples]);

  // 8. DATE-WISE PERFORMANCE & DAILY SUMMARY
  const dailyPerformanceList = useMemo(() => {
    const map = new Map<string, { samples: number; sent: number; pending: number }>();

    for (const samp of filteredSamples) {
      const d = samp.sample_collection_date;
      if (!d) continue;
      if (!map.has(d)) {
        map.set(d, { samples: 0, sent: 0, pending: 0 });
      }
      const item = map.get(d)!;
      item.samples += 1;
      if (samp.sent_date) {
        item.sent += 1;
      } else {
        item.pending += 1;
      }
    }

    const dates = Array.from(map.keys()).sort();
    return dates.map((date) => {
      const val = map.get(date)!;
      // Marathi formatted display date: DD/MM/YYYY
      const parts = date.split('-');
      const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
      return {
        date,
        displayDate,
        samples: val.samples,
        sent: val.sent,
        pending: val.pending,
      };
    });
  }, [filteredSamples]);

  // 9. MONTHLY PERFORMANCE DATA (Jan – Dec of selectedYear)
  const monthlyPerformanceData: MonthlyChartItem[] = useMemo(() => {
    const monthNames = [
      'जानेवारी',
      'फेब्रुवारी',
      'मार्च',
      'एप्रिल',
      'मे',
      'जून',
      'जुलै',
      'ऑगस्ट',
      'सप्टेंबर',
      'ऑक्टोबर',
      'नोव्हेंबर',
      'डिसेंबर',
    ];

    const counts = Array.from({ length: 12 }, () => ({
      samples: 0,
      sent: 0,
      pending: 0,
    }));

    for (const samp of filteredSamples) {
      if (!samp.sample_collection_date) continue;
      const parts = samp.sample_collection_date.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (y === selectedYear && m >= 0 && m < 12) {
          counts[m].samples += 1;
          if (samp.sent_date) {
            counts[m].sent += 1;
          } else {
            counts[m].pending += 1;
          }
        }
      }
    }

    return counts.map((c, i) => ({
      monthName: monthNames[i],
      monthIndex: i + 1,
      samples: c.samples,
      sent: c.sent,
      pending: c.pending,
    }));
  }, [filteredSamples, selectedYear]);

  // 10. PENDING SAMPLES ALERT CALCULATIONS
  const pendingAlertInfo = useMemo(() => {
    const pendingList = filteredSamples.filter((s) => !s.sent_date || s.sent_date === '');
    const count = pendingList.length;
    if (count === 0) return null;

    // Find oldest date
    const sortedDates = pendingList
      .map((s) => s.sample_collection_date)
      .filter(Boolean)
      .sort();
    const oldestDate = sortedDates[0] || '-';

    // Unique employees
    const empNames = Array.from(
      new Set(pendingList.map((s) => s.employee_name).filter(Boolean))
    );

    // Unique villages
    const vNames = Array.from(
      new Set(pendingList.map((s) => s.village_name).filter(Boolean))
    );

    return {
      count,
      oldestDate,
      employees: empNames,
      villages: vNames,
    };
  }, [filteredSamples]);

  // 11. TOP 10 EMPLOYEES & VILLAGES RANKING
  const topEmployeesRanking = useMemo(() => {
    return [...employeePerformanceList].slice(0, 10);
  }, [employeePerformanceList]);

  const topVillagesCoverageRanking = useMemo(() => {
    return [...villagePerformanceList]
      .sort((a, b) => b.coveragePct - a.coveragePct)
      .slice(0, 15);
  }, [villagePerformanceList]);

  // 12. EXPORT TO CSV (WITH UTF-8 BOM)
  const handleExportCSV = () => {
    const headers = [
      'अ.क्र.',
      'गाव',
      'उपकेंद्र',
      'लोकसंख्या',
      'एकूण घरसंख्या',
      'रक्त नमुने',
      'पाठविलेले',
      'प्रलंबित',
      'Covered घरे',
      'House Coverage %',
      'Samples per 100 Population',
      'Samples per 100 Houses',
    ];

    const rows = villagePerformanceList.map((v, index) => [
      index + 1,
      `"${v.villageName}"`,
      `"${v.subcentreName}"`,
      v.population,
      v.totalHouses,
      v.samples,
      v.sent,
      v.pending,
      v.coveredHouses,
      `"${v.coveragePct.toFixed(1)}%"`,
      v.samplesPer100Pop.toFixed(2),
      v.samplesPer100Houses.toFixed(2),
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `मलेरिया_Coverage_Performance_${getTodayString()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 13. PRINT TRIGGER
  const handlePrint = () => {
    window.print();
  };

  // Metadata labels for display
  const currentPhcName =
    
    (isSubcentreStaff ? subcentres[0]?.phc_name : '') ||
    'सर्व PHC';

  const currentSubcentreName =
    
    (isSubcentreStaff ? subcentres[0]?.subcentre_name : '') ||
    'सर्व उपकेंद्र';

  const dateRangeText =
    filterStartDate || filterEndDate
      ? `${filterStartDate || 'सुरुवात'} ते ${filterEndDate || 'आजपर्यंत'}`
      : 'सर्व कालावधी';

  const todayFormatted = (() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}/${d.getFullYear()}`;
  })();

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-800 text-white rounded-xl shadow-xs">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                मलेरिया रक्त नमुना संकलन Coverage व Performance Dashboard
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                CODE 7
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              गावनिहाय, उपकेंद्रनिहाय व कर्मचारीनिहाय प्रत्यक्ष नमुना संकलन, House Coverage व प्रलंबित सांख्यिकी
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-end md:self-auto print:hidden">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel डाउनलोड</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>प्रिंट करा (PDF)</span>
          </button>
        </div>
      </div>

      {/* 2. Filters Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs print:hidden space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
            <Filter className="w-4 h-4 text-emerald-700" />
            <span>डॅशबोर्ड फिल्टर्स (Dashboard Filters)</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs text-slate-500 hover:text-emerald-800 font-medium transition-colors"
          >
            फिल्टर साफ करा (Reset)
          </button>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* From Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              दिनांकापासून (From)
            </label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-white"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              दिनांकापर्यंत (To)
            </label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-white"
            />
          </div>

          {/* PHC Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              प्राथमिक आरोग्य केंद्र (PHC)
            </label>
            <select
              value={""}
              onChange={(e) => handlePhcChange(e.target.value)}
              disabled={isSubcentreStaff}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-white disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="">सर्व PHC ({phcs.length})</option>
              {phcs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.phc_name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcentre Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              आरोग्य उपकेंद्र (Subcentre)
            </label>
            <select
              value={""}
              onChange={(e) => handleSubcentreChange(e.target.value)}
              disabled={isSubcentreStaff}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-white disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="">सर्व उपकेंद्र ({[].length})</option>
              {[].map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subcentre_name}
                </option>
              ))}
            </select>
          </div>

          {/* Village Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              गाव (Village)
            </label>
            <select
              value={selectedVillageId}
              onChange={(e) => handleVillageChange(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-white"
            >
              <option value="">सर्व गावे ({villages.length})</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.village_name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              कर्मचारी (Employee)
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-white"
            >
              <option value="">सर्व कर्मचारी ({employees.length})</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employee_name} ({e.malaria_smear_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Date Range Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={applyTodayFilter}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              आजचा अहवाल
            </button>
            <button
              onClick={applyThisMonthFilter}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              हा महिना
            </button>
            <button
              onClick={applyThisYearFilter}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              हे वर्ष ({currentYear})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>रिफ्रेश</span>
            </button>
            <button
              onClick={() => {}}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition-colors"
            >
              अहवाल पहा
            </button>
          </div>
        </div>
      </div>

      {/* 3. PENDING SAMPLES ALERT CARD */}
      {pendingAlertInfo && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-xs print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-lg mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-amber-900">
                    प्रलंबित रक्त नमुने (Pending Samples Alert)
                  </h4>
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-200 text-amber-900 rounded-full">
                    {pendingAlertInfo.count} नमुने पाठविणे शिल्लक
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  सर्वात जुना नमुना दिनांक: <span className="font-bold">{pendingAlertInfo.oldestDate}</span> |{' '}
                  संबंधित गावे: <span className="font-semibold">{pendingAlertInfo.villages.slice(0, 3).join(', ')}{pendingAlertInfo.villages.length > 3 ? '...' : ''}</span> |{' '}
                  कर्मचारी: <span className="font-semibold">{pendingAlertInfo.employees.slice(0, 3).join(', ')}{pendingAlertInfo.employees.length > 3 ? '...' : ''}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate('reports');
                } else {
                  setActiveTab('village');
                  setVillageSort('pending-desc');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors whitespace-nowrap self-start sm:self-center"
            >
              <span>तपशील पहा</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN PERFORMANCE CARDS (8 Live Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. एकूण गावे */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">एकूण गावे</span>
            <MapPin className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {performanceKPIs.totalVillages}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">निवडलेल्या कार्यक्षेत्रात</div>
        </div>

        {/* 2. एकूण लोकसंख्या */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">एकूण लोकसंख्या</span>
            <Users className="w-4 h-4 text-sky-700" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {performanceKPIs.totalPopulation.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">गावनिहाय SUM</div>
        </div>

        {/* 3. एकूण घरसंख्या */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">एकूण घरसंख्या</span>
            <Home className="w-4 h-4 text-indigo-700" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {performanceKPIs.totalHouses.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">मास्टर डेटा प्रमाणे</div>
        </div>

        {/* 4. एकूण रक्त नमुने */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">रक्त नमुने</span>
            <Target className="w-4 h-4 text-emerald-800" />
          </div>
          <div className="text-xl font-bold text-emerald-800">
            {performanceKPIs.totalSamples}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">एकूण संकलित</div>
        </div>

        {/* 5. पाठविलेले नमुने */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">पाठविलेले</span>
            <CheckCircle2 className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-xl font-bold text-teal-800">
            {performanceKPIs.sentSamples}
          </div>
          <div className="text-[10px] text-teal-600 mt-0.5">लॅबला पाठविलेले</div>
        </div>

        {/* 6. प्रलंबित नमुने */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">प्रलंबित</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700">
            {performanceKPIs.pendingSamples}
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5">पाठविणे बाकी</div>
        </div>

        {/* 7. सक्रिय कर्मचारी */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">सक्रिय कर्मचारी</span>
            <Users className="w-4 h-4 text-purple-700" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {performanceKPIs.activeEmployees}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">कार्यरत सेवक</div>
        </div>

        {/* 8. प्रति गाव सरासरी नमुने */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">प्रति गाव सरासरी</span>
            <TrendingUp className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-xl font-bold text-blue-900">
            {performanceKPIs.avgSamplesPerVillage}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">नमुने / गाव</div>
        </div>
      </div>

      {/* 5. Mathematical Metrics Disclaimer Banner */}
      <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs text-slate-600 print:hidden">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800">
            ⚠️ गणितीय Performance Metrics सूचना:
          </span>{' '}
          House Coverage % (किमान एक नमुना घेतलेली युनिक घरे ÷ एकूण घरे × 100), दर १०० लोकसंख्येमागे व दर १०० घरांमागे नमुने ही केवळ डेटावर आधारित गणितीय कार्यप्रदर्शन मोजणी असून याला शासकीय लक्ष्यपूर्ती मानले जाऊ नये.
        </div>
      </div>

      {/* 6. Dashboard Sub-Views / Tabs */}
      <div className="border-b border-slate-200 print:hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-px scrollbar-thin">
          {[
            { id: 'village', label: '१. गावनिहाय Performance', count: villagePerformanceList.length },
            { id: 'subcentre', label: '२. उपकेंद्रनिहाय Performance', count: subcentrePerformanceList.length },
            { id: 'employee', label: '३. कर्मचारीनिहाय Performance', count: employeePerformanceList.length },
            ...(isPhcController
              ? [{ id: 'phc', label: '४. PHC निहाय Performance', count: phcPerformanceList.length }]
              : []),
            { id: 'daily', label: '५. दिवसनिहाय संकलन', count: dailyPerformanceList.length },
            { id: 'ranking', label: '६. क्रमवारी (Rankings)' },
            { id: 'charts', label: '७. सर्व आलेख (Charts)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as CoverageTab)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-800 text-emerald-900 bg-emerald-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                    activeTab === tab.id
                      ? 'bg-emerald-800 text-white font-bold'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT 1: VILLAGE-WISE PERFORMANCE TABLE */}
      {activeTab === 'village' && (
        <div className="space-y-4 print:hidden">
          {/* Sorting & Filter bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <div className="text-xs font-bold text-slate-800">
              गावनिहाय रक्त नमुना संकलन व House Coverage तपशील ({villagePerformanceList.length} गावे)
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">क्रमवारी (Sort):</span>
              <select
                value={villageSort}
                onChange={(e) => setVillageSort(e.target.value as SortOption)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700 focus:ring-1 focus:ring-emerald-700"
              >
                <option value="samples-desc">जास्त नमुने (Most Samples)</option>
                <option value="samples-asc">कमी नमुने (Least Samples)</option>
                <option value="coverage-desc">जास्त House Coverage %</option>
                <option value="coverage-asc">कमी House Coverage %</option>
                <option value="pending-desc">प्रलंबित जास्त (Most Pending)</option>
                <option value="village-asc">गावाचे नाव (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-center">
                    <th className="p-2.5 w-10 border-r border-slate-100">अ.क्र.</th>
                    <th className="p-2.5 text-left border-r border-slate-100">गाव (Village)</th>
                    <th className="p-2.5 border-r border-slate-100">लोकसंख्या</th>
                    <th className="p-2.5 border-r border-slate-100">एकूण घरसंख्या</th>
                    <th className="p-2.5 border-r border-slate-100 bg-emerald-50 text-emerald-900">
                      रक्त नमुने
                    </th>
                    <th className="p-2.5 border-r border-slate-100 text-teal-800">पाठविलेले</th>
                    <th className="p-2.5 border-r border-slate-100 text-amber-700">प्रलंबित</th>
                    <th className="p-2.5 border-r border-slate-100">Covered घरे</th>
                    <th className="p-2.5 border-r border-slate-100 bg-sky-50 text-sky-900">
                      House Coverage %
                    </th>
                    <th className="p-2.5 border-r border-slate-100">नमुने / १०० लोकसंख्या</th>
                    <th className="p-2.5">नमुने / १०० घरे</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {villagePerformanceList.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400">
                        निवडलेल्या फिल्टर्सनुसार गावांची माहिती उपलब्ध नाही.
                      </td>
                    </tr>
                  ) : (
                    villagePerformanceList.map((v, idx) => (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors text-center">
                        <td className="p-2.5 text-slate-500 border-r border-slate-100 font-medium">
                          {idx + 1}
                        </td>
                        <td className="p-2.5 text-left font-semibold text-slate-900 border-r border-slate-100">
                          <div>{v.villageName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {v.subcentreName}
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-700 border-r border-slate-100">
                          {v.population.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-slate-700 border-r border-slate-100">
                          {v.totalHouses.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 font-bold text-emerald-900 bg-emerald-50/40 border-r border-slate-100">
                          {v.samples}
                        </td>
                        <td className="p-2.5 text-teal-800 border-r border-slate-100 font-medium">
                          {v.sent}
                        </td>
                        <td className="p-2.5 border-r border-slate-100 font-medium">
                          {v.pending > 0 ? (
                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm">
                              {v.pending}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-800 border-r border-slate-100 font-medium">
                          {v.coveredHouses}
                        </td>
                        <td className="p-2.5 bg-sky-50/40 border-r border-slate-100">
                          <div className="font-bold text-sky-900">
                            {v.coveragePct.toFixed(1)}%
                          </div>
                          {/* Mini visual bar */}
                          <div className="w-16 mx-auto bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
                            <div
                              style={{ width: `${Math.min(100, v.coveragePct)}%` }}
                              className="bg-sky-600 h-full rounded-full"
                            />
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-700 border-r border-slate-100">
                          {v.samplesPer100Pop.toFixed(2)}
                        </td>
                        <td className="p-2.5 text-slate-700">
                          {v.samplesPer100Houses.toFixed(2)}
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

      {/* TAB CONTENT 2: SUBCENTRE-WISE PERFORMANCE */}
      {activeTab === 'subcentre' && (
        <div className="space-y-4 print:hidden">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              उपकेंद्रनिहाय Performance सारांश (Subcentre-wise Performance)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-center">
                    <th className="p-2.5 w-10 border-r border-slate-100">अ.क्र.</th>
                    <th className="p-2.5 text-left border-r border-slate-100">उपकेंद्र नाव</th>
                    <th className="p-2.5 border-r border-slate-100">एकूण गावे</th>
                    <th className="p-2.5 border-r border-slate-100">लोकसंख्या</th>
                    <th className="p-2.5 border-r border-slate-100">घरसंख्या</th>
                    <th className="p-2.5 border-r border-slate-100 bg-emerald-50 text-emerald-900">
                      रक्त नमुने
                    </th>
                    <th className="p-2.5 border-r border-slate-100 text-teal-800">पाठविलेले</th>
                    <th className="p-2.5 border-r border-slate-100 text-amber-700">प्रलंबित</th>
                    <th className="p-2.5 border-r border-slate-100">Covered घरे</th>
                    <th className="p-2.5 border-r border-slate-100 bg-sky-50 text-sky-900">
                      House Coverage %
                    </th>
                    <th className="p-2.5 border-r border-slate-100">नमुने / १०० लोकसंख्या</th>
                    <th className="p-2.5">नमुने / १०० घरे</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subcentrePerformanceList.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-400">
                        उपकेंद्रांची माहिती उपलब्ध नाही.
                      </td>
                    </tr>
                  ) : (
                    subcentrePerformanceList.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors text-center">
                        <td className="p-2.5 text-slate-500 border-r border-slate-100 font-medium">
                          {idx + 1}
                        </td>
                        <td className="p-2.5 text-left font-semibold text-slate-900 border-r border-slate-100">
                          <div>{s.subcentreName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{s.phcName}</div>
                        </td>
                        <td className="p-2.5 text-slate-700 border-r border-slate-100">
                          {s.totalVillages}
                        </td>
                        <td className="p-2.5 text-slate-700 border-r border-slate-100">
                          {s.totalPopulation.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-slate-700 border-r border-slate-100">
                          {s.totalHouses.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 font-bold text-emerald-900 bg-emerald-50/40 border-r border-slate-100">
                          {s.samples}
                        </td>
                        <td className="p-2.5 text-teal-800 border-r border-slate-100 font-medium">
                          {s.sent}
                        </td>
                        <td className="p-2.5 border-r border-slate-100 font-medium">
                          {s.pending > 0 ? (
                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm">
                              {s.pending}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-800 border-r border-slate-100 font-medium">
                          {s.coveredHouses}
                        </td>
                        <td className="p-2.5 bg-sky-50/40 border-r border-slate-100">
                          <div className="font-bold text-sky-900">{s.coveragePct.toFixed(1)}%</div>
                          <div className="w-16 mx-auto bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
                            <div
                              style={{ width: `${Math.min(100, s.coveragePct)}%` }}
                              className="bg-sky-600 h-full rounded-full"
                            />
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-700 border-r border-slate-100">
                          {s.samplesPer100Pop.toFixed(2)}
                        </td>
                        <td className="p-2.5 text-slate-700">{s.samplesPer100Houses.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: EMPLOYEE-WISE PERFORMANCE */}
      {activeTab === 'employee' && (
        <div className="space-y-4 print:hidden">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              कर्मचारीनिहाय नमुना संकलन व Coverage तपशील
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-center">
                    <th className="p-2.5 w-10 border-r border-slate-100">अ.क्र.</th>
                    <th className="p-2.5 text-left border-r border-slate-100">कर्मचारी नाव</th>
                    <th className="p-2.5 border-r border-slate-100">पदनाम</th>
                    <th className="p-2.5 border-r border-slate-100">Smear Code</th>
                    <th className="p-2.5 text-left border-r border-slate-100">उपकेंद्र</th>
                    <th className="p-2.5 border-r border-slate-100 bg-emerald-50 text-emerald-900">
                      एकूण नमुने
                    </th>
                    <th className="p-2.5 border-r border-slate-100 text-teal-800">पाठविलेले</th>
                    <th className="p-2.5 border-r border-slate-100 text-amber-700">प्रलंबित</th>
                    <th className="p-2.5 border-r border-slate-100">Covered घरे</th>
                    <th className="p-2.5">House Coverage %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeePerformanceList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        कर्मचाऱ्यांची माहिती उपलब्ध नाही.
                      </td>
                    </tr>
                  ) : (
                    employeePerformanceList.map((e, idx) => (
                      <tr key={e.id} className="hover:bg-slate-50/80 transition-colors text-center">
                        <td className="p-2.5 text-slate-500 border-r border-slate-100 font-medium">
                          {idx + 1}
                        </td>
                        <td className="p-2.5 text-left font-semibold text-slate-900 border-r border-slate-100">
                          {e.employeeName}
                        </td>
                        <td className="p-2.5 text-slate-600 border-r border-slate-100">
                          {e.designation}
                        </td>
                        <td className="p-2.5 border-r border-slate-100">
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-sm font-mono text-[11px]">
                            {e.smearCode}
                          </span>
                        </td>
                        <td className="p-2.5 text-left text-slate-600 border-r border-slate-100">
                          {e.subcentreName}
                        </td>
                        <td className="p-2.5 font-bold text-emerald-900 bg-emerald-50/40 border-r border-slate-100">
                          {e.samples}
                        </td>
                        <td className="p-2.5 text-teal-800 border-r border-slate-100 font-medium">
                          {e.sent}
                        </td>
                        <td className="p-2.5 border-r border-slate-100 font-medium">
                          {e.pending > 0 ? (
                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm">
                              {e.pending}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-800 border-r border-slate-100 font-medium">
                          {e.coveredHouses}
                        </td>
                        <td className="p-2.5 font-bold text-sky-800">
                          {e.coveragePct > 0 ? `${e.coveragePct.toFixed(1)}%` : '-'}
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

      {/* TAB CONTENT 4: PHC-WISE PERFORMANCE (FOR PHC CONTROLLER) */}
      {activeTab === 'phc' && isPhcController && (
        <div className="space-y-4 print:hidden">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              प्राथमिक आरोग्य केंद्रनिहाय सारांश (PHC-wise Performance)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-center">
                    <th className="p-2.5 w-10 border-r border-slate-100">अ.क्र.</th>
                    <th className="p-2.5 text-left border-r border-slate-100">PHC नाव</th>
                    <th className="p-2.5 border-r border-slate-100">तालुका</th>
                    <th className="p-2.5 border-r border-slate-100">एकूण उपकेंद्र</th>
                    <th className="p-2.5 border-r border-slate-100">एकूण गावे</th>
                    <th className="p-2.5 border-r border-slate-100">लोकसंख्या</th>
                    <th className="p-2.5 border-r border-slate-100">घरसंख्या</th>
                    <th className="p-2.5 border-r border-slate-100 bg-emerald-50 text-emerald-900">
                      रक्त नमुने
                    </th>
                    <th className="p-2.5 border-r border-slate-100 text-teal-800">पाठविलेले</th>
                    <th className="p-2.5 border-r border-slate-100 text-amber-700">प्रलंबित</th>
                    <th className="p-2.5 border-r border-slate-100">Covered घरे</th>
                    <th className="p-2.5">House Coverage %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {phcPerformanceList.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors text-center">
                      <td className="p-2.5 text-slate-500 border-r border-slate-100 font-medium">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 text-left font-bold text-slate-900 border-r border-slate-100">
                        {p.phcName}
                      </td>
                      <td className="p-2.5 text-slate-600 border-r border-slate-100">{p.taluka}</td>
                      <td className="p-2.5 text-slate-700 border-r border-slate-100 font-medium">
                        {p.totalSubcentres}
                      </td>
                      <td className="p-2.5 text-slate-700 border-r border-slate-100">
                        {p.totalVillages}
                      </td>
                      <td className="p-2.5 text-slate-700 border-r border-slate-100">
                        {p.population.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-slate-700 border-r border-slate-100">
                        {p.totalHouses.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 font-bold text-emerald-900 bg-emerald-50/40 border-r border-slate-100">
                        {p.samples}
                      </td>
                      <td className="p-2.5 text-teal-800 border-r border-slate-100 font-medium">
                        {p.sent}
                      </td>
                      <td className="p-2.5 border-r border-slate-100 font-medium">
                        {p.pending > 0 ? (
                          <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm">
                            {p.pending}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-800 border-r border-slate-100 font-medium">
                        {p.coveredHouses}
                      </td>
                      <td className="p-2.5 font-bold text-sky-800">{p.coveragePct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: DATE-WISE PERFORMANCE */}
      {activeTab === 'daily' && (
        <div className="space-y-6 print:hidden">
          {/* Daily Trend Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    दिवसनिहाय रक्त नमुना संकलन (Daily Blood Sample Collection)
                  </h3>
                  <p className="text-xs text-slate-500">
                    निवडलेल्या कालावधीत दररोज गोळा केलेल्या नमुन्यांचा आलेख
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              {dailyPerformanceList.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  निवडलेल्या कालावधीत नमुन्यांची नोंद नाही.
                </p>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <div
                    className="flex items-end gap-3 h-44 pb-2 border-b border-slate-200 min-w-[500px]"
                    style={{ minWidth: `${Math.max(500, dailyPerformanceList.length * 40)}px` }}
                  >
                    {dailyPerformanceList.map((d) => {
                      const maxDaily = Math.max(...dailyPerformanceList.map((x) => x.samples), 1);
                      const barHeight = (d.samples / maxDaily) * 100;
                      return (
                        <div
                          key={d.date}
                          className="flex-1 flex flex-col items-center justify-end h-full"
                        >
                          <span className="text-[10px] text-slate-700 font-bold mb-1">
                            {d.samples}
                          </span>
                          <div
                            style={{ height: `${Math.max(barHeight, 8)}%` }}
                            className="w-full max-w-[28px] rounded-t-sm bg-teal-700 transition-all duration-300 flex flex-col-reverse overflow-hidden"
                          >
                            {d.pending > 0 && (
                              <div
                                style={{ height: `${(d.pending / d.samples) * 100}%` }}
                                className="bg-amber-500 w-full"
                              />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 mt-2 font-mono whitespace-nowrap">
                            {d.displayDate.slice(0, 5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Daily Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              दिवसनिहाय नमुना संकलन तक्ता
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-center">
                    <th className="p-2.5 w-12 border-r border-slate-100">अ.क्र.</th>
                    <th className="p-2.5 text-left border-r border-slate-100">दिनांक (Date)</th>
                    <th className="p-2.5 border-r border-slate-100 bg-emerald-50 text-emerald-900">
                      एकूण नमुने
                    </th>
                    <th className="p-2.5 border-r border-slate-100 text-teal-800">पाठविलेले</th>
                    <th className="p-2.5 text-amber-700">प्रलंबित</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyPerformanceList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        माहिती उपलब्ध नाही.
                      </td>
                    </tr>
                  ) : (
                    dailyPerformanceList.map((d, idx) => (
                      <tr key={d.date} className="hover:bg-slate-50/80 text-center">
                        <td className="p-2.5 text-slate-500 border-r border-slate-100">{idx + 1}</td>
                        <td className="p-2.5 text-left font-semibold text-slate-900 border-r border-slate-100 font-mono">
                          {d.displayDate}
                        </td>
                        <td className="p-2.5 font-bold text-emerald-900 bg-emerald-50/40 border-r border-slate-100">
                          {d.samples}
                        </td>
                        <td className="p-2.5 text-teal-800 border-r border-slate-100 font-medium">
                          {d.sent}
                        </td>
                        <td className="p-2.5 font-medium">
                          {d.pending > 0 ? (
                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm">
                              {d.pending}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
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

      {/* TAB CONTENT 6: PERFORMANCE RANKING */}
      {activeTab === 'ranking' && (
        <div className="space-y-6 print:hidden">
          {/* Note */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              ⚠️ याला सरकारी ranking किंवा official performance ranking म्हणू नका. हे फक्त application मधील data-based ranking आहे.
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section 1: Top 10 Employees */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-800" />
                  <h3 className="text-xs font-bold text-slate-900">
                    सर्वाधिक नमुना संकलन — Top १० कर्मचारी
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">नमुना संख्या उतरता क्रम</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-center">
                      <th className="p-2.5 w-12 border-r border-slate-100">क्रमांक</th>
                      <th className="p-2.5 text-left border-r border-slate-100">कर्मचारी</th>
                      <th className="p-2.5 border-r border-slate-100">Smear Code</th>
                      <th className="p-2.5 border-r border-slate-100 bg-emerald-50 text-emerald-900">
                        एकूण नमुने
                      </th>
                      <th className="p-2.5 border-r border-slate-100 text-teal-800">पाठविलेले</th>
                      <th className="p-2.5 text-amber-700">प्रलंबित</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topEmployeesRanking.map((e, idx) => (
                      <tr key={e.id} className="hover:bg-slate-50 text-center">
                        <td className="p-2.5 border-r border-slate-100">
                          <span
                            className={`w-5 h-5 inline-flex items-center justify-center rounded-full text-[11px] font-bold ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-900'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-800'
                                : idx === 2
                                ? 'bg-orange-100 text-orange-900'
                                : 'text-slate-600'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="p-2.5 text-left font-semibold text-slate-900 border-r border-slate-100">
                          <div>{e.employeeName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{e.designation}</div>
                        </td>
                        <td className="p-2.5 border-r border-slate-100 font-mono text-[11px] text-slate-600">
                          {e.smearCode}
                        </td>
                        <td className="p-2.5 font-bold text-emerald-900 bg-emerald-50/40 border-r border-slate-100">
                          {e.samples}
                        </td>
                        <td className="p-2.5 text-teal-800 border-r border-slate-100 font-medium">
                          {e.sent}
                        </td>
                        <td className="p-2.5 text-amber-700 font-medium">{e.pending}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Top Villages by House Coverage */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-sky-700" />
                  <h3 className="text-xs font-bold text-slate-900">
                    गावनिहाय House Coverage % क्रमवारी
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">Coverage % उतरता क्रम</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-center">
                      <th className="p-2.5 w-12 border-r border-slate-100">क्रमांक</th>
                      <th className="p-2.5 text-left border-r border-slate-100">गाव</th>
                      <th className="p-2.5 border-r border-slate-100">एकूण घरे</th>
                      <th className="p-2.5 border-r border-slate-100">Covered घरे</th>
                      <th className="p-2.5 border-r border-slate-100 bg-sky-50 text-sky-900">
                        House Coverage %
                      </th>
                      <th className="p-2.5">नमुने</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topVillagesCoverageRanking.map((v, idx) => (
                      <tr key={v.id} className="hover:bg-slate-50 text-center">
                        <td className="p-2.5 border-r border-slate-100">
                          <span
                            className={`w-5 h-5 inline-flex items-center justify-center rounded-full text-[11px] font-bold ${
                              idx === 0
                                ? 'bg-sky-100 text-sky-900'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-800'
                                : idx === 2
                                ? 'bg-blue-100 text-blue-900'
                                : 'text-slate-600'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="p-2.5 text-left font-semibold text-slate-900 border-r border-slate-100">
                          <div>{v.villageName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{v.subcentreName}</div>
                        </td>
                        <td className="p-2.5 text-slate-700 border-r border-slate-100">
                          {v.totalHouses}
                        </td>
                        <td className="p-2.5 text-slate-800 border-r border-slate-100 font-medium">
                          {v.coveredHouses}
                        </td>
                        <td className="p-2.5 bg-sky-50/40 border-r border-slate-100 font-bold text-sky-900">
                          {v.coveragePct.toFixed(1)}%
                        </td>
                        <td className="p-2.5 font-semibold text-emerald-900">{v.samples}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 7: ALL CHARTS */}
      {activeTab === 'charts' && (
        <div className="space-y-4 print:hidden">
          {/* Year selector for Monthly chart */}
          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
            <div className="text-xs font-bold text-slate-800">
              मलेरिया सांख्यिकी व Coverage आलेख (Visual Performance Analytics)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">वर्ष निवडा:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="text-xs px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
              >
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <MalariaCoverageCharts
            villages={villagePerformanceList.map((v) => ({
              name: v.villageName,
              subcentreName: v.subcentreName,
              samples: v.samples,
              coveredHouses: v.coveredHouses,
              totalHouses: v.totalHouses,
              coveragePct: v.coveragePct,
              sent: v.sent,
              pending: v.pending,
            }))}
            employees={employeePerformanceList.map((e) => ({
              name: e.employeeName,
              smearCode: e.smearCode,
              samples: e.samples,
              coveredHouses: e.coveredHouses,
              sent: e.sent,
              pending: e.pending,
            }))}
            subcentres={subcentrePerformanceList.map((s) => ({
              name: s.subcentreName,
              samples: s.samples,
              coveredHouses: s.coveredHouses,
              totalHouses: s.totalHouses,
              coveragePct: s.coveragePct,
              sent: s.sent,
              pending: s.pending,
            }))}
            monthlyData={monthlyPerformanceData}
            dailyData={dailyPerformanceList}
          />
        </div>
      )}

      {/* 7. PRINTABLE GOVERNMENT REPORT (Only visible during print) */}
      <MalariaCoveragePrintView
        phcName={currentPhcName}
        subcentreName={currentSubcentreName}
        dateRangeText={dateRangeText}
        reportDate={todayFormatted}
        totalVillages={performanceKPIs.totalVillages}
        totalPopulation={performanceKPIs.totalPopulation}
        totalHouses={performanceKPIs.totalHouses}
        totalSamples={performanceKPIs.totalSamples}
        totalSent={performanceKPIs.sentSamples}
        totalPending={performanceKPIs.pendingSamples}
        villageRows={villagePerformanceList.map((v, i) => ({
          srNo: i + 1,
          villageName: v.villageName,
          population: v.population,
          totalHouses: v.totalHouses,
          samples: v.samples,
          sent: v.sent,
          pending: v.pending,
          coveredHouses: v.coveredHouses,
          coveragePct: v.coveragePct.toFixed(1),
          samplesPer100Pop: v.samplesPer100Pop.toFixed(2),
          samplesPer100Houses: v.samplesPer100Houses.toFixed(2),
        }))}
        employeeRows={employeePerformanceList.map((e, i) => ({
          srNo: i + 1,
          employeeName: e.employeeName,
          designation: e.designation,
          smearCode: e.smearCode,
          samples: e.samples,
          sent: e.sent,
          pending: e.pending,
          coveredHouses: e.coveredHouses,
        }))}
      />
    </div>
  );
};
