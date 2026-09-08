import React, { useState, useEffect, useMemo } from 'react';
import {
  Flag,
  Target,
  PlusCircle,
  RefreshCw,
  Printer,
  Download,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Home,
  MapPin,
  Users,
  Edit2,
  Trash2,
  ArrowUpDown,
  Code2,
  ChevronDown,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import {
  PageId,
  MalariaTarget,
  TargetType,
  TargetScopeLevel,
  TargetProgressItem,
  ProgressStatus,
  PhcMaster,
  SubcentreMaster,
  VillageMaster,
  EmployeeMaster,
  MalariaBloodSample,
} from '../types';
import { useAuth } from '../hooks/useAuth';
import { targetService } from '../services/targetService';
import { masterDataService } from '../services/masterDataService';
import { malariaService } from '../services/malariaService';
import { MalariaTargetModal } from '../components/targets/MalariaTargetModal';
import { MalariaTargetCharts } from '../components/targets/MalariaTargetCharts';
import { MalariaTargetPrintView } from '../components/targets/MalariaTargetPrintView';

interface MalariaTargetsPageProps {
  onNavigate?: (page: PageId) => void;
}

type TabType = 'villages' | 'employees' | 'subcentres' | 'phcs' | 'target-list' | 'charts';
type SortOption = 'progress-desc' | 'progress-asc' | 'target-desc' | 'actual-desc' | 'pending-desc';

const MONTH_NAMES_MR = [
  '',
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

export const MalariaTargetsPage: React.FC<MalariaTargetsPageProps> = ({ onNavigate }) => {
  const { user, role } = useAuth();
  const isPhcController = role === 'phc_controller';

  // Master lists
  const [phcs, setPhcs] = useState<PhcMaster[]>([]);
  const [subcentres, setSubcentres] = useState<SubcentreMaster[]>([]);
  const [villages, setVillages] = useState<VillageMaster[]>([]);
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [samples, setSamples] = useState<MalariaBloodSample[]>([]);
  const [targets, setTargets] = useState<MalariaTarget[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState<TabType>('villages');

  // Filter state
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [filterType, setFilterType] = useState<TargetType>('Monthly');
  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);

      const [selectedVillageId, setSelectedVillageId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('progress-desc');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [targetToEdit, setTargetToEdit] = useState<MalariaTarget | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);

  // Load all foundational data
  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [phcList, scList, vilList, empList, sampleList, targetList] = await Promise.all([
        masterDataService.getPhcs(),
        masterDataService.getSubcentres(),
        masterDataService.getVillages(),
        masterDataService.getEmployees(),
        malariaService.getSamples(),
        targetService.getTargets(),
      ]);

      setPhcs(phcList);
      setSubcentres(scList);
      setVillages(vilList);
      setEmployees(empList);
      setSamples(sampleList);
      setTargets(targetList);

      // Lock assigned scope for subcentre employees
      if (!isPhcController && user?.assignedSubcentre) {
        const matchingSc = scList.find(
          (s) => s.id === user.assignedSubcentre || s.subcentre_name === user.assignedSubcentre
        );
        if (matchingSc) {
          ((_: any) => {})(matchingSc.id);
          ((_: any) => {})(matchingSc.phc_id);
        }
      }
    } catch (err) {
      console.error('Error loading target & performance data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isPhcController, user?.assignedSubcentre]);

  // Quick filter helpers
  const handleSetCurrentMonth = () => {
    setFilterType('Monthly');
    setFilterYear(currentYear);
    setFilterMonth(currentMonth);
  };

  const handleSetCurrentYear = () => {
    setFilterType('Yearly');
    setFilterYear(currentYear);
  };

  const handleResetFilters = () => {
    setFilterType('Monthly');
    setFilterYear(currentYear);
    setFilterMonth(currentMonth);
    setSearchQuery('');
    setSortOption('progress-desc');

    if (isPhcController) {
      ((_: any) => {})('');
      ((_: any) => {})('');
      setSelectedVillageId('');
      setSelectedEmployeeId('');
    } else {
      setSelectedVillageId('');
      setSelectedEmployeeId('');
    }
  };

  // Filtered dropdown helpers (cascading)
  const filteredSubcentres = useMemo(() => {
    if (true) return subcentres;
    return subcentres.filter((s) => s.phc_id === "");
  }, [subcentres, ""]);

  const filteredVillages = useMemo(() => {
    let list = villages;
    if (false) {
      list = list.filter((v) => v.subcentre_id === "");
    } else if (false) {
      const scIds = filteredSubcentres.map((s) => s.id);
      list = list.filter((v) => scIds.includes(v.subcentre_id));
    }
    return list;
  }, [villages,   filteredSubcentres]);

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (false) {
      list = list.filter((e) => e.subcentre_id === "");
    } else if (false) {
      const scIds = filteredSubcentres.map((s) => s.id);
      list = list.filter((e) => scIds.includes(e.subcentre_id));
    }
    return list;
  }, [employees,   filteredSubcentres]);

  // Samples in period (Monthly / Yearly)
  const samplesInPeriod = useMemo(() => {
    return samples.filter((s) => {
      const dt = s.sample_collection_date ? new Date(s.sample_collection_date) : null;
      if (!dt || isNaN(dt.getTime())) return false;

      const yr = dt.getFullYear();
      if (yr !== filterYear) return false;

      if (filterType === 'Monthly') {
        const mo = dt.getMonth() + 1;
        if (mo !== filterMonth) return false;
      }
      return true;
    });
  }, [samples, filterYear, filterMonth, filterType]);

  // Targets matching the current period & type
  const activeTargetsInPeriod = useMemo(() => {
    return targets.filter((t) => {
      if (t.target_year !== filterYear) return false;
      if (t.target_type !== filterType) return false;
      if (filterType === 'Monthly' && t.target_month !== filterMonth) return false;
      return true;
    });
  }, [targets, filterYear, filterMonth, filterType]);

  // Helper to determine status based on progress % (Requirement 8)
  const getProgressStatus = (pct: number): ProgressStatus => {
    if (pct >= 100) return 'लक्ष्य पूर्ण';
    if (pct >= 80) return 'चांगली प्रगती';
    if (pct >= 50) return 'मध्यम प्रगती';
    return 'कमी प्रगती';
  };

  // Helper to get covered houses for a village
  const getCoveredHousesCount = (villageId: string, sampleSublist: MalariaBloodSample[]) => {
    const villageSamples = sampleSublist.filter((s) => s.village_id === villageId);
    const uniqueHouseSet = new Set<string>();
    villageSamples.forEach((s) => {
      const h = (s.house_number || '').trim().toLowerCase();
      if (h) uniqueHouseSet.add(h);
    });
    return uniqueHouseSet.size;
  };

  // =========================================================================
  // 1. VILLAGE-WISE PROGRESS & COVERAGE (Requirement 9 & 16)
  // =========================================================================
  const villageProgressItems: TargetProgressItem[] = useMemo(() => {
    return filteredVillages
      .filter((v) => {
        if (selectedVillageId && v.id !== selectedVillageId) return false;
        return true;
      })
      .map((v) => {
        // Target for this village
        const tgt = activeTargetsInPeriod.find((t) => t.village_id === v.id);
        const targetVal = tgt ? tgt.target_value : 0;

        // Samples collected for this village in the period
        const vilSamples = samplesInPeriod.filter((s) => s.village_id === v.id);
        const actual = vilSamples.length;
        const sent = vilSamples.filter((s) => !!s.sent_date).length;
        const pending = vilSamples.filter((s) => !s.sent_date).length;

        // Covered houses in period
        const coveredHouses = getCoveredHousesCount(v.id, samplesInPeriod);
        const houseCoveragePercent =
          v.total_houses > 0 ? Math.round((coveredHouses / v.total_houses) * 1000) / 10 : 0;

        // Progress % (not capped at 100%)
        const progressPercent = targetVal > 0 ? Math.round((actual / targetVal) * 100) : 0;
        const remaining = Math.max(0, targetVal - actual);
        const status = getProgressStatus(progressPercent);

        const sc = subcentres.find((s) => s.id === v.subcentre_id);
        const phc = sc ? phcs.find((p) => p.id === sc.phc_id) : undefined;

        return {
          id: `vil-prog-${v.id}`,
          targetId: tgt?.id,
          scopeLevel: 'village' as TargetScopeLevel,
          entityId: v.id,
          entityName: v.village_name,
          population: v.population,
          totalHouses: v.total_houses,
          coveredHouses,
          houseCoveragePercent,
          targetValue: targetVal,
          actualSamples: actual,
          remainingTarget: remaining,
          progressPercent,
          sentSamples: sent,
          pendingSamples: pending,
          status,
          remarks: tgt?.remarks || undefined,
          subcentre_name: sc?.subcentre_name,
          phc_name: phc?.phc_name,
        };
      });
  }, [
    filteredVillages,
    selectedVillageId,
    activeTargetsInPeriod,
    samplesInPeriod,
    subcentres,
    phcs,
  ]);

  // =========================================================================
  // 2. EMPLOYEE-WISE PROGRESS (Requirement 10)
  // =========================================================================
  const employeeProgressItems: TargetProgressItem[] = useMemo(() => {
    return filteredEmployees
      .filter((e) => {
        if (selectedEmployeeId && e.id !== selectedEmployeeId) return false;
        return true;
      })
      .map((e) => {
        // Target for this employee
        const tgt = activeTargetsInPeriod.find((t) => t.employee_id === e.id);
        const targetVal = tgt ? tgt.target_value : 0;

        // Samples collected by this employee in period
        const empSamples = samplesInPeriod.filter((s) => s.employee_id === e.id);
        const actual = empSamples.length;
        const sent = empSamples.filter((s) => !!s.sent_date).length;
        const pending = empSamples.filter((s) => !s.sent_date).length;

        const progressPercent = targetVal > 0 ? Math.round((actual / targetVal) * 100) : 0;
        const remaining = Math.max(0, targetVal - actual);
        const status = getProgressStatus(progressPercent);

        const sc = subcentres.find((s) => s.id === e.subcentre_id);
        const phc = sc ? phcs.find((p) => p.id === sc.phc_id) : undefined;

        return {
          id: `emp-prog-${e.id}`,
          targetId: tgt?.id,
          scopeLevel: 'employee' as TargetScopeLevel,
          entityId: e.id,
          entityName: e.employee_name,
          code: e.malaria_smear_code,
          designation: e.designation || undefined,
          targetValue: targetVal,
          actualSamples: actual,
          remainingTarget: remaining,
          progressPercent,
          sentSamples: sent,
          pendingSamples: pending,
          status,
          remarks: tgt?.remarks || undefined,
          subcentre_name: sc?.subcentre_name,
          phc_name: phc?.phc_name,
        };
      });
  }, [
    filteredEmployees,
    selectedEmployeeId,
    activeTargetsInPeriod,
    samplesInPeriod,
    subcentres,
    phcs,
  ]);

  // =========================================================================
  // 3. SUBCENTRE-WISE PROGRESS (Requirement 11)
  // =========================================================================
  const subcentreProgressItems: TargetProgressItem[] = useMemo(() => {
    return filteredSubcentres
      .filter((sc) => {
         return false;
        return true;
      })
      .map((sc) => {
        // Direct target for subcentre or sum of village targets if no direct
        const directTgt = activeTargetsInPeriod.find(
          (t) => t.subcentre_id === sc.id && !t.village_id && !t.employee_id
        );
        const scVillages = villages.filter((v) => v.subcentre_id === sc.id);
        const vilIds = scVillages.map((v) => v.id);

        const villageTargetsSum = activeTargetsInPeriod
          .filter((t) => t.village_id && vilIds.includes(t.village_id))
          .reduce((acc, curr) => acc + curr.target_value, 0);

        const targetVal = directTgt ? directTgt.target_value : villageTargetsSum;

        // Samples collected in this subcentre in period
        const scSamples = samplesInPeriod.filter((s) => vilIds.includes(s.village_id));
        const actual = scSamples.length;
        const sent = scSamples.filter((s) => !!s.sent_date).length;
        const pending = scSamples.filter((s) => !s.sent_date).length;

        const pop = scVillages.reduce((acc, curr) => acc + (curr.population || 0), 0);
        const houses = scVillages.reduce((acc, curr) => acc + (curr.total_houses || 0), 0);

        const progressPercent = targetVal > 0 ? Math.round((actual / targetVal) * 100) : 0;
        const remaining = Math.max(0, targetVal - actual);
        const status = getProgressStatus(progressPercent);

        const phc = phcs.find((p) => p.id === sc.phc_id);

        return {
          id: `sc-prog-${sc.id}`,
          targetId: directTgt?.id,
          scopeLevel: 'subcentre' as TargetScopeLevel,
          entityId: sc.id,
          entityName: sc.subcentre_name,
          code: sc.subcentre_code || undefined,
          villageCount: scVillages.length,
          population: pop,
          totalHouses: houses,
          targetValue: targetVal,
          actualSamples: actual,
          remainingTarget: remaining,
          progressPercent,
          sentSamples: sent,
          pendingSamples: pending,
          status,
          remarks: directTgt?.remarks || undefined,
          phc_name: phc?.phc_name,
        };
      });
  }, [
    filteredSubcentres,
    
    activeTargetsInPeriod,
    villages,
    samplesInPeriod,
    phcs,
  ]);

  // =========================================================================
  // 4. PHC-WISE PROGRESS (Requirement 12)
  // =========================================================================
  const phcProgressItems: TargetProgressItem[] = useMemo(() => {
    return phcs
      .filter((p) => {
         return false;
        return true;
      })
      .map((p) => {
        const pSubcentres = subcentres.filter((s) => s.phc_id === p.id);
        const pScIds = pSubcentres.map((s) => s.id);
        const pVillages = villages.filter((v) => pScIds.includes(v.subcentre_id));
        const pVilIds = pVillages.map((v) => v.id);

        // Direct target or sum of subcentres
        const directTgt = activeTargetsInPeriod.find(
          (t) => t.phc_id === p.id && !t.subcentre_id && !t.village_id && !t.employee_id
        );
        const scTargetsSum = activeTargetsInPeriod
          .filter(
            (t) =>
              t.subcentre_id &&
              pScIds.includes(t.subcentre_id) &&
              !t.village_id &&
              !t.employee_id
          )
          .reduce((acc, curr) => acc + curr.target_value, 0);

        const targetVal = directTgt ? directTgt.target_value : scTargetsSum;

        const pSamples = samplesInPeriod.filter((s) => pVilIds.includes(s.village_id));
        const actual = pSamples.length;
        const sent = pSamples.filter((s) => !!s.sent_date).length;
        const pending = pSamples.filter((s) => !s.sent_date).length;

        const pop = pVillages.reduce((acc, curr) => acc + (curr.population || 0), 0);
        const houses = pVillages.reduce((acc, curr) => acc + (curr.total_houses || 0), 0);

        const progressPercent = targetVal > 0 ? Math.round((actual / targetVal) * 100) : 0;
        const remaining = Math.max(0, targetVal - actual);
        const status = getProgressStatus(progressPercent);

        return {
          id: `phc-prog-${p.id}`,
          targetId: directTgt?.id,
          scopeLevel: 'phc' as TargetScopeLevel,
          entityId: p.id,
          entityName: p.phc_name,
          code: p.phc_code || undefined,
          subcentreCount: pSubcentres.length,
          villageCount: pVillages.length,
          population: pop,
          totalHouses: houses,
          targetValue: targetVal,
          actualSamples: actual,
          remainingTarget: remaining,
          progressPercent,
          sentSamples: sent,
          pendingSamples: pending,
          status,
          remarks: directTgt?.remarks || undefined,
        };
      });
  }, [phcs,  subcentres, villages, activeTargetsInPeriod, samplesInPeriod]);

  // Overall KPI Card Summary (Requirement 7)
  const kpiSummary = useMemo(() => {
    // Collect active items based on active tab or overall villages
    let targetSum = 0;
    let actualSum = samplesInPeriod.length;
    let sentSum = samplesInPeriod.filter((s) => !!s.sent_date).length;
    let pendingSum = samplesInPeriod.filter((s) => !s.sent_date).length;

    // Calculate total targets configured in this period
    // Prefer PHC target if exists, otherwise sum of subcentre targets, otherwise sum of village targets
    const phcTgtSum = activeTargetsInPeriod
      .filter((t) => t.phc_id && !t.subcentre_id && !t.village_id && !t.employee_id)
      .reduce((a, b) => a + b.target_value, 0);

    const scTgtSum = activeTargetsInPeriod
      .filter((t) => t.subcentre_id && !t.village_id && !t.employee_id)
      .reduce((a, b) => a + b.target_value, 0);

    const vilTgtSum = activeTargetsInPeriod
      .filter((t) => t.village_id && !t.employee_id)
      .reduce((a, b) => a + b.target_value, 0);

    const empTgtSum = activeTargetsInPeriod
      .filter((t) => t.employee_id)
      .reduce((a, b) => a + b.target_value, 0);

    if (activeTab === 'employees') {
      targetSum = employeeProgressItems.reduce((a, b) => a + b.targetValue, 0);
    } else if (activeTab === 'villages') {
      targetSum = villageProgressItems.reduce((a, b) => a + b.targetValue, 0);
    } else if (activeTab === 'subcentres') {
      targetSum = subcentreProgressItems.reduce((a, b) => a + b.targetValue, 0);
    } else if (activeTab === 'phcs') {
      targetSum = phcProgressItems.reduce((a, b) => a + b.targetValue, 0);
    } else {
      targetSum = phcTgtSum || scTgtSum || vilTgtSum || empTgtSum || 0;
    }

    const remaining = Math.max(0, targetSum - actualSum);
    const progressPct = targetSum > 0 ? Math.round((actualSum / targetSum) * 100) : 0;

    return {
      target: targetSum,
      actual: actualSum,
      remaining,
      progressPercent: progressPct,
      sent: sentSum,
      pending: pendingSum,
    };
  }, [
    samplesInPeriod,
    activeTargetsInPeriod,
    activeTab,
    villageProgressItems,
    employeeProgressItems,
    subcentreProgressItems,
    phcProgressItems,
  ]);

  // Monthly trends for Jan-Dec (Requirement 13)
  const monthlyTrendsData = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const mo = idx + 1;
      const moTargets = targets.filter(
        (t) => t.target_year === filterYear && t.target_type === 'Monthly' && t.target_month === mo
      );
      const moTargetVal = moTargets.reduce((acc, curr) => acc + curr.target_value, 0);

      const moSamples = samples.filter((s) => {
        const dt = s.sample_collection_date ? new Date(s.sample_collection_date) : null;
        if (!dt || isNaN(dt.getTime())) return false;
        return dt.getFullYear() === filterYear && dt.getMonth() + 1 === mo;
      });

      const actual = moSamples.length;
      const pct = moTargetVal > 0 ? Math.round((actual / moTargetVal) * 100) : 0;

      return {
        monthNumber: mo,
        monthNameMarathi: MONTH_NAMES_MR[mo],
        target: moTargetVal,
        actual,
        progressPercent: pct,
      };
    });
  }, [targets, samples, filterYear]);

  // Sorting helper for tables
  const sortItems = <T extends TargetProgressItem>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      if (sortOption === 'progress-desc') return b.progressPercent - a.progressPercent;
      if (sortOption === 'progress-asc') return a.progressPercent - b.progressPercent;
      if (sortOption === 'target-desc') return b.targetValue - a.targetValue;
      if (sortOption === 'actual-desc') return b.actualSamples - a.actualSamples;
      if (sortOption === 'pending-desc') return b.pendingSamples - a.pendingSamples;
      return 0;
    });
  };

  // Search filter helper
  const filterBySearch = <T extends TargetProgressItem>(items: T[]): T[] => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.entityName.toLowerCase().includes(q) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.subcentre_name && item.subcentre_name.toLowerCase().includes(q)) ||
        (item.phc_name && item.phc_name.toLowerCase().includes(q)) ||
        (item.remarks && item.remarks.toLowerCase().includes(q))
    );
  };

  // Sorted and searched lists
  const displayVillages = useMemo(
    () => sortItems(filterBySearch(villageProgressItems)),
    [villageProgressItems, sortOption, searchQuery]
  );
  const displayEmployees = useMemo(
    () => sortItems(filterBySearch(employeeProgressItems)),
    [employeeProgressItems, sortOption, searchQuery]
  );
  const displaySubcentres = useMemo(
    () => sortItems(filterBySearch(subcentreProgressItems)),
    [subcentreProgressItems, sortOption, searchQuery]
  );
  const displayPhcs = useMemo(
    () => sortItems(filterBySearch(phcProgressItems)),
    [phcProgressItems, sortOption, searchQuery]
  );

  // Alerts calculation (Requirement 15)
  const lowProgressVillages = useMemo(
    () => villageProgressItems.filter((v) => v.targetValue > 0 && v.progressPercent < 50),
    [villageProgressItems]
  );
  const lowProgressEmployees = useMemo(
    () => employeeProgressItems.filter((e) => e.targetValue > 0 && e.progressPercent < 50),
    [employeeProgressItems]
  );
  const achievedVillages = useMemo(
    () => villageProgressItems.filter((v) => v.targetValue > 0 && v.progressPercent >= 100),
    [villageProgressItems]
  );
  const achievedEmployees = useMemo(
    () => employeeProgressItems.filter((e) => e.targetValue > 0 && e.progressPercent >= 100),
    [employeeProgressItems]
  );
  const totalPendingInPeriod = useMemo(
    () => samplesInPeriod.filter((s) => !s.sent_date).length,
    [samplesInPeriod]
  );

  // Print triggered
  const handlePrint = () => {
    window.print();
  };

  // CSV / Excel Export (Requirement 18)
  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `malaria_targets_${filterYear}`;

    if (filterType === 'Monthly') {
      filename += `_${MONTH_NAMES_MR[filterMonth]}`;
    }

    if (activeTab === 'villages') {
      filename += '_villages.csv';
      headers = [
        'अ.क्र.',
        'गाव नाव',
        'उपकेंद्र',
        'प्राथमिक आरोग्य केंद्र',
        'लोकसंख्या',
        'एकूण घरे',
        'Covered घरे',
        'House Coverage %',
        'लक्ष्य (Target)',
        'प्रत्यक्ष नमुने (Actual)',
        'बाकी (Remaining)',
        'प्रगती % (Progress)',
        'पाठविलेले (Sent)',
        'प्रलंबित (Pending)',
        'दर्जा (Status)',
      ];
      rows = displayVillages.map((item, idx) => [
        idx + 1,
        item.entityName,
        item.subcentre_name || '',
        item.phc_name || '',
        item.population || 0,
        item.totalHouses || 0,
        item.coveredHouses || 0,
        `${item.houseCoveragePercent || 0}%`,
        item.targetValue,
        item.actualSamples,
        item.remainingTarget,
        `${item.progressPercent}%`,
        item.sentSamples,
        item.pendingSamples,
        item.status,
      ]);
    } else if (activeTab === 'employees') {
      filename += '_employees.csv';
      headers = [
        'अ.क्र.',
        'कर्मचारी नाव',
        'पदनाम',
        'स्मीअर कोड',
        'उपकेंद्र',
        'प्राथमिक आरोग्य केंद्र',
        'लक्ष्य (Target)',
        'प्रत्यक्ष नमुने (Actual)',
        'बाकी (Remaining)',
        'प्रगती % (Progress)',
        'पाठविलेले (Sent)',
        'प्रलंबित (Pending)',
        'दर्जा (Status)',
      ];
      rows = displayEmployees.map((item, idx) => [
        idx + 1,
        item.entityName,
        item.designation || '',
        item.code || '',
        item.subcentre_name || '',
        item.phc_name || '',
        item.targetValue,
        item.actualSamples,
        item.remainingTarget,
        `${item.progressPercent}%`,
        item.sentSamples,
        item.pendingSamples,
        item.status,
      ]);
    } else if (activeTab === 'subcentres') {
      filename += '_subcentres.csv';
      headers = [
        'अ.क्र.',
        'उपकेंद्र नाव',
        'कोड',
        'प्राथमिक आरोग्य केंद्र',
        'गावे संख्या',
        'लोकसंख्या',
        'एकूण घरे',
        'लक्ष्य (Target)',
        'प्रत्यक्ष नमुने (Actual)',
        'बाकी (Remaining)',
        'प्रगती % (Progress)',
        'पाठविलेले (Sent)',
        'प्रलंबित (Pending)',
        'दर्जा (Status)',
      ];
      rows = displaySubcentres.map((item, idx) => [
        idx + 1,
        item.entityName,
        item.code || '',
        item.phc_name || '',
        item.villageCount || 0,
        item.population || 0,
        item.totalHouses || 0,
        item.targetValue,
        item.actualSamples,
        item.remainingTarget,
        `${item.progressPercent}%`,
        item.sentSamples,
        item.pendingSamples,
        item.status,
      ]);
    } else if (activeTab === 'target-list') {
      filename += '_target_master_list.csv';
      headers = [
        'अ.क्र.',
        'वर्ष',
        'महिना',
        'लक्ष्य प्रकार',
        'स्तर',
        'PHC नाव',
        'उपकेंद्र',
        'गाव',
        'कर्मचारी',
        'लक्ष्य संख्या',
        'शेरा',
      ];
      rows = targets.map((t, idx) => [
        idx + 1,
        t.target_year,
        t.target_month ? MONTH_NAMES_MR[t.target_month] : 'वार्षिक',
        t.target_type,
        t.employee_id
          ? 'कर्मचारी'
          : t.village_id
          ? 'गाव'
          : t.subcentre_id
          ? 'उपकेंद्र'
          : 'PHC',
        t.phc_name || '',
        t.subcentre_name || '',
        t.village_name || '',
        t.employee_name || '',
        t.target_value,
        t.remarks || '',
      ]);
    } else {
      filename += '_phc_summary.csv';
      headers = [
        'अ.क्र.',
        'PHC नाव',
        'कोड',
        'उपकेंद्र संख्या',
        'गावे संख्या',
        'लोकसंख्या',
        'लक्ष्य (Target)',
        'प्रत्यक्ष नमुने (Actual)',
        'बाकी (Remaining)',
        'प्रगती % (Progress)',
        'पाठविलेले (Sent)',
        'प्रलंबित (Pending)',
        'दर्जा (Status)',
      ];
      rows = displayPhcs.map((item, idx) => [
        idx + 1,
        item.entityName,
        item.code || '',
        item.subcentreCount || 0,
        item.villageCount || 0,
        item.population || 0,
        item.targetValue,
        item.actualSamples,
        item.remainingTarget,
        `${item.progressPercent}%`,
        item.sentSamples,
        item.pendingSamples,
        item.status,
      ]);
    }

    // Build CSV with UTF-8 BOM
    const csvContent =
      '\uFEFF' +
      [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',')]
        .concat(
          rows.map((row) =>
            row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
          )
        )
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Delete target handler (Requirement 5)
  const handleDeleteTarget = async (id: string) => {
    try {
      const res = await targetService.deleteTarget(id);
      if (res.success) {
        setDeleteTargetId(null);
        await loadData(true);
      } else {
        alert(res.error || 'लक्ष्य हटवताना त्रुटी आली.');
      }
    } catch (err: any) {
      alert(err.message || 'लक्ष्य हटवताना त्रुटी आली.');
    }
  };

  // Period label for print and UI
  const periodLabel =
    filterType === 'Monthly'
      ? `${MONTH_NAMES_MR[filterMonth]} ${filterYear} (मासिक)`
      : `सन ${filterYear} (वार्षिक)`;

  // Scope title for print
  const printItemsList =
    activeTab === 'employees'
      ? displayEmployees
      : activeTab === 'subcentres'
      ? displaySubcentres
      : activeTab === 'phcs'
      ? displayPhcs
      : displayVillages;

  const activeScopeTitle =
    activeTab === 'employees'
      ? 'कर्मचारीनिहाय उद्दिष्ट व कामगिरी'
      : activeTab === 'subcentres'
      ? 'उपकेंद्रनिहाय उद्दिष्ट व कामगिरी'
      : activeTab === 'phcs'
      ? 'PHC-निहाय उद्दिष्ट व कामगिरी'
      : 'गावनिहाय उद्दिष्ट व House Coverage प्रगती';

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Header & Quick Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-800 text-white shrink-0 shadow-xs">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                मलेरिया रक्त नमुना लक्ष्य व प्रगती व्यवस्थापन
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                CODE 8
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {periodLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isPhcController
                ? 'PHC Controller: उद्दिष्ट निश्चिती (Target Setting), प्रत्यक्ष संकलन तुलना व कार्यप्रगती विश्लेषण.'
                : 'Subcentre Employee: कार्यक्षेत्रातील नेमून दिलेले उद्दिष्ट व प्रत्यक्ष संकलन प्रगती दर्शक.'}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* PHC Controller: Create Target Button (Requirement 4) */}
          {isPhcController && (
            <button
              id="create-target-btn"
              type="button"
              onClick={() => {
                setTargetToEdit(null);
                setIsModalOpen(true);
              }}
              className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>नवीन लक्ष्य तयार करा</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            title="रिफ्रेश करा"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Print Button (Requirement 17) */}
          <button
            id="target-print-btn"
            type="button"
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="A4 शासकीय अहवाल प्रिंट करा"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">A4 प्रिंट</span>
          </button>

          {/* Export Excel/CSV Button (Requirement 18) */}
          <button
            id="target-export-csv-btn"
            type="button"
            onClick={handleExportCsv}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="UTF-8 BOM Excel डाउनलोड"
          >
            <Download className="w-4 h-4" />
            <span>Excel डाउनलोड</span>
          </button>

          {/* SQL Schema Button for reference */}
          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            title="Database Schema व RLS"
          >
            <Code2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Cascading Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-800" />
            <span className="text-xs font-bold text-slate-800">
              कालावधी व कार्यक्षेत्र फिल्टर्स (Cascading Filters)
            </span>
          </div>
          {/* Quick buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSetCurrentMonth}
              className="text-[11px] font-semibold py-1 px-2.5 rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              चालू महिना
            </button>
            <button
              type="button"
              onClick={handleSetCurrentYear}
              className="text-[11px] font-semibold py-1 px-2.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              चालू वर्ष
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-medium py-1 px-2 text-slate-500 hover:text-slate-800 hover:underline"
            >
              साफ करा
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
          {/* 1. Target Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              प्रकार (Type)
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TargetType)}
              className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white font-medium focus:ring-2 focus:ring-emerald-700"
            >
              <option value="Monthly">मासिक (Monthly)</option>
              <option value="Yearly">वार्षिक (Yearly)</option>
            </select>
          </div>

          {/* 2. Year */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              वर्ष (Year)
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white font-medium focus:ring-2 focus:ring-emerald-700"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Month (if monthly) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              महिना (Month)
            </label>
            <select
              disabled={filterType === 'Yearly'}
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white font-medium focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {MONTH_NAMES_MR.slice(1).map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {mName}
                </option>
              ))}
            </select>
          </div>

          {/* 4. PHC Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              PHC
            </label>
            <select
              disabled={!isPhcController}
              value={""}
              onChange={(e) => {
                ((_: any) => {})(e.target.value);
                ((_: any) => {})('');
                setSelectedVillageId('');
                setSelectedEmployeeId('');
              }}
              className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white font-medium focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100"
            >
              <option value="">सर्व PHCs</option>
              {phcs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.phc_name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Subcentre Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              उपकेंद्र (Subcentre)
            </label>
            <select
              disabled={!isPhcController}
              value={""}
              onChange={(e) => {
                ((_: any) => {})(e.target.value);
                setSelectedVillageId('');
                setSelectedEmployeeId('');
              }}
              className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white font-medium focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100"
            >
              <option value="">सर्व उपकेंद्रे</option>
              {filteredSubcentres.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.subcentre_name}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Village Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              गाव (Village)
            </label>
            <select
              value={selectedVillageId}
              onChange={(e) => setSelectedVillageId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white font-medium focus:ring-2 focus:ring-emerald-700"
            >
              <option value="">सर्व गावे</option>
              {filteredVillages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.village_name}
                </option>
              ))}
            </select>
          </div>

          {/* 7. Employee Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              कर्मचारी (Staff)
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white font-medium focus:ring-2 focus:ring-emerald-700"
            >
              <option value="">सर्व कर्मचारी</option>
              {filteredEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employee_name} ({e.malaria_smear_code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Six Live Progress Dashboard Cards (Requirement 7) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: लक्ष्य (Target) */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">निश्चित लक्ष्य</span>
            <Target className="w-4 h-4 text-emerald-800" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {loading ? '...' : kpiSummary.target}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Target Samples</div>
          </div>
        </div>

        {/* Card 2: प्रत्यक्ष संकलन (Actual) */}
        <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-xs flex flex-col justify-between bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[11px] font-bold">प्रत्यक्ष संकलन</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-900">
              {loading ? '...' : kpiSummary.actual}
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5">Actual Collected</div>
          </div>
        </div>

        {/* Card 3: बाकी लक्ष्य (Remaining Target) */}
        <div className="bg-white rounded-xl border border-amber-200 p-3.5 shadow-xs flex flex-col justify-between bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-semibold">बाकी लक्ष्य</span>
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {loading ? '...' : kpiSummary.remaining}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {kpiSummary.actual >= kpiSummary.target && kpiSummary.target > 0
                ? 'उद्दिष्ट साध्य'
                : 'Remaining'}
            </div>
          </div>
        </div>

        {/* Card 4: प्रगती % (Progress %) */}
        <div className="bg-white rounded-xl border border-teal-200 p-3.5 shadow-xs flex flex-col justify-between bg-teal-50/20">
          <div className="flex items-center justify-between text-teal-800 mb-1">
            <span className="text-[11px] font-bold">प्रगती %</span>
            <Flag className="w-4 h-4 text-teal-700" />
          </div>
          <div>
            <div className="text-xl font-bold text-teal-900">
              {loading ? '...' : `${kpiSummary.progressPercent}%`}
            </div>
            <div className="text-[10px] text-teal-700 mt-0.5 font-semibold">
              {getProgressStatus(kpiSummary.progressPercent)}
            </div>
          </div>
        </div>

        {/* Card 5: पाठविलेले (Sent Samples) */}
        <div className="bg-white rounded-xl border border-blue-200 p-3.5 shadow-xs flex flex-col justify-between bg-blue-50/20">
          <div className="flex items-center justify-between text-blue-800 mb-1">
            <span className="text-[11px] font-semibold">पाठविलेले</span>
            <CheckCircle2 className="w-4 h-4 text-blue-700" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {loading ? '...' : kpiSummary.sent}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Sent to Lab</div>
          </div>
        </div>

        {/* Card 6: प्रलंबित (Pending Samples) */}
        <div className="bg-white rounded-xl border border-rose-200 p-3.5 shadow-xs flex flex-col justify-between bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-800 mb-1">
            <span className="text-[11px] font-bold">प्रलंबित</span>
            <AlertTriangle className="w-4 h-4 text-rose-700" />
          </div>
          <div>
            <div className="text-xl font-bold text-rose-900">
              {loading ? '...' : kpiSummary.pending}
            </div>
            <div className="text-[10px] text-rose-700 mt-0.5">Pending Dispatch</div>
          </div>
        </div>
      </div>

      {/* Progress Status Legend / Note (Requirement 8) */}
      <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600">
          <span className="font-semibold text-slate-700">दर्जा स्तर (Progress Status):</span>
          <span className="px-2 py-0.5 rounded-sm bg-rose-100 text-rose-800 font-medium">0–49%: कमी प्रगती</span>
          <span className="px-2 py-0.5 rounded-sm bg-amber-100 text-amber-800 font-medium">50–79%: मध्यम प्रगती</span>
          <span className="px-2 py-0.5 rounded-sm bg-sky-100 text-sky-800 font-medium">80–99%: चांगली प्रगती</span>
          <span className="px-2 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 font-bold">100%+: लक्ष्य पूर्ण</span>
        </div>
        <div className="text-[11px] text-slate-500 italic">
          * हे ॲप्लिकेशन-परिभाषित प्रगती स्तर आहेत; हे शासकीय अधिकृत ग्रेडिंग नाही.
        </div>
      </div>

      {/* 4. Progress Alerts Section (Requirement 15) */}
      {(lowProgressVillages.length > 0 || achievedVillages.length > 0 || totalPendingInPeriod > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Alert 1: Low progress */}
          {lowProgressVillages.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-rose-900">
                  लक्ष्यापेक्षा कमी प्रगती (&lt;50%) : {lowProgressVillages.length} गावे
                </div>
                <div className="text-rose-700 mt-0.5 truncate">
                  उदा. {lowProgressVillages.slice(0, 3).map((v) => v.entityName).join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Alert 2: Target Achieved */}
          {achievedVillages.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-emerald-900">
                  लक्ष्य पूर्ण (100%+) : {achievedVillages.length} गावे
                </div>
                <div className="text-emerald-700 mt-0.5 truncate">
                  उदा. {achievedVillages.slice(0, 3).map((v) => v.entityName).join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Alert 3: Pending Samples Dispatch */}
          {totalPendingInPeriod > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 text-xs">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-900">
                    प्रलंबित नमुने: {totalPendingInPeriod}
                  </div>
                  <div className="text-amber-700 mt-0.5">
                    लॅबमध्ये पाठविण्यासाठी प्रलंबित
                  </div>
                </div>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('send-samples')}
                  className="text-[11px] font-bold text-amber-900 underline shrink-0 hover:text-amber-950"
                >
                  पाठवा &gt;
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Navigation Tabs & Search/Sort Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border-b border-slate-200">
          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('villages')}
              className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'villages'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              गावनिहाय प्रगती व Coverage
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('employees')}
              className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'employees'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              कर्मचारीनिहाय प्रगती
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('subcentres')}
              className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'subcentres'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              उपकेंद्रनिहाय प्रगती
            </button>

            {isPhcController && (
              <button
                type="button"
                onClick={() => setActiveTab('phcs')}
                className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'phcs'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                PHC-निहाय प्रगती
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('charts')}
              className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'charts'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              आलेख व कल (Charts)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('target-list')}
              className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'target-list'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              लक्ष्य यादी (Target Master)
            </button>
          </div>

          {/* Search & Sort controls (for tables) */}
          {activeTab !== 'charts' && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="नाव शोधा..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 pl-8 pr-2 py-1.5 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              {activeTab !== 'target-list' && (
                <div className="relative">
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="text-xs rounded-lg border border-slate-300 py-1.5 px-2 bg-white focus:outline-hidden"
                  >
                    <option value="progress-desc">Progress जास्त</option>
                    <option value="progress-asc">Progress कमी</option>
                    <option value="target-desc">Target जास्त</option>
                    <option value="actual-desc">Actual जास्त</option>
                    <option value="pending-desc">Pending जास्त</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6. TAB CONTENTS */}

        {/* TAB 1: Village-wise Target vs Actual + CODE 7 Coverage Integration (Requirements 9 & 16) */}
        {activeTab === 'villages' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-bold">
                  <th className="py-2.5 px-3 w-10">अ.क्र.</th>
                  <th className="py-2.5 px-3">गाव</th>
                  <th className="py-2.5 px-3">उपकेंद्र</th>
                  <th className="py-2.5 px-3 text-right">लोकसंख्या</th>
                  <th className="py-2.5 px-3 text-right">एकूण घरे</th>
                  <th className="py-2.5 px-3 text-right">Covered घरे</th>
                  <th className="py-2.5 px-3 text-right">Coverage %</th>
                  <th className="py-2.5 px-3 text-right font-bold text-slate-900">लक्ष्य</th>
                  <th className="py-2.5 px-3 text-right font-bold text-emerald-900">प्रत्यक्ष</th>
                  <th className="py-2.5 px-3 text-right">बाकी</th>
                  <th className="py-2.5 px-3 text-right font-bold">Progress %</th>
                  <th className="py-2.5 px-3 text-center">पाठविलेले</th>
                  <th className="py-2.5 px-3 text-center font-bold text-rose-800">प्रलंबित</th>
                  <th className="py-2.5 px-3 text-center">दर्जा</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayVillages.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-8 text-slate-500 text-xs">
                      कोणतीही गावनिहाय माहिती उपलब्ध नाही.
                    </td>
                  </tr>
                ) : (
                  displayVillages.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{item.entityName}</td>
                      <td className="py-2 px-3 text-slate-600">{item.subcentre_name || '-'}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {item.population?.toLocaleString('mr-IN') || 0}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {item.totalHouses || 0}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">
                        {item.coveredHouses || 0}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                        {item.houseCoveragePercent || 0}%
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                        {item.targetValue}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-900 font-mono">
                        {item.actualSamples}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {item.remainingTarget}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-sm ${
                            item.targetValue === 0
                              ? 'text-slate-400'
                              : item.progressPercent >= 100
                              ? 'bg-emerald-100 text-emerald-900'
                              : item.progressPercent >= 50
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {item.progressPercent}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-700">
                        {item.sentSamples}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-rose-700">
                        {item.pendingSamples}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            item.status === 'लक्ष्य पूर्ण'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'चांगली प्रगती'
                              ? 'bg-sky-100 text-sky-800'
                              : item.status === 'मध्यम प्रगती'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Employee-wise Target vs Actual (Requirement 10) */}
        {activeTab === 'employees' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-bold">
                  <th className="py-2.5 px-3 w-10">अ.क्र.</th>
                  <th className="py-2.5 px-3">कर्मचारी नाव</th>
                  <th className="py-2.5 px-3">पदनाम</th>
                  <th className="py-2.5 px-3">स्मीअर कोड</th>
                  <th className="py-2.5 px-3">उपकेंद्र</th>
                  <th className="py-2.5 px-3 text-right font-bold text-slate-900">लक्ष्य</th>
                  <th className="py-2.5 px-3 text-right font-bold text-emerald-900">प्रत्यक्ष नमुने</th>
                  <th className="py-2.5 px-3 text-right">बाकी</th>
                  <th className="py-2.5 px-3 text-right font-bold">Progress %</th>
                  <th className="py-2.5 px-3 text-center">पाठविलेले</th>
                  <th className="py-2.5 px-3 text-center font-bold text-rose-800">प्रलंबित</th>
                  <th className="py-2.5 px-3 text-center">दर्जा</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-8 text-slate-500 text-xs">
                      कोणतीही कर्मचारी माहिती उपलब्ध नाही.
                    </td>
                  </tr>
                ) : (
                  displayEmployees.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{item.entityName}</td>
                      <td className="py-2 px-3 text-slate-600">{item.designation || '-'}</td>
                      <td className="py-2 px-3">
                        <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-200 text-slate-800">
                          {item.code}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{item.subcentre_name || '-'}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                        {item.targetValue}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-900 font-mono">
                        {item.actualSamples}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {item.remainingTarget}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-sm ${
                            item.targetValue === 0
                              ? 'text-slate-400'
                              : item.progressPercent >= 100
                              ? 'bg-emerald-100 text-emerald-900'
                              : item.progressPercent >= 50
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {item.progressPercent}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-700">
                        {item.sentSamples}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-rose-700">
                        {item.pendingSamples}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            item.status === 'लक्ष्य पूर्ण'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'चांगली प्रगती'
                              ? 'bg-sky-100 text-sky-800'
                              : item.status === 'मध्यम प्रगती'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Subcentre-wise Target vs Actual (Requirement 11) */}
        {activeTab === 'subcentres' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-bold">
                  <th className="py-2.5 px-3 w-10">अ.क्र.</th>
                  <th className="py-2.5 px-3">उपकेंद्र नाव</th>
                  <th className="py-2.5 px-3">PHC</th>
                  <th className="py-2.5 px-3 text-center">गावे संख्या</th>
                  <th className="py-2.5 px-3 text-right">लोकसंख्या</th>
                  <th className="py-2.5 px-3 text-right">एकूण घरे</th>
                  <th className="py-2.5 px-3 text-right font-bold text-slate-900">लक्ष्य</th>
                  <th className="py-2.5 px-3 text-right font-bold text-emerald-900">Actual Samples</th>
                  <th className="py-2.5 px-3 text-right">बाकी</th>
                  <th className="py-2.5 px-3 text-right font-bold">Progress %</th>
                  <th className="py-2.5 px-3 text-center">Sent</th>
                  <th className="py-2.5 px-3 text-center font-bold text-rose-800">Pending</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displaySubcentres.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-8 text-slate-500 text-xs">
                      कोणतीही उपकेंद्रनिहाय माहिती उपलब्ध नाही.
                    </td>
                  </tr>
                ) : (
                  displaySubcentres.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {item.entityName} {item.code ? `(${item.code})` : ''}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{item.phc_name || '-'}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-700">
                        {item.villageCount || 0}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {item.population?.toLocaleString('mr-IN') || 0}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {item.totalHouses || 0}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                        {item.targetValue}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-900 font-mono">
                        {item.actualSamples}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {item.remainingTarget}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-sm ${
                            item.targetValue === 0
                              ? 'text-slate-400'
                              : item.progressPercent >= 100
                              ? 'bg-emerald-100 text-emerald-900'
                              : item.progressPercent >= 50
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {item.progressPercent}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-700">
                        {item.sentSamples}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-rose-700">
                        {item.pendingSamples}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            item.status === 'लक्ष्य पूर्ण'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'चांगली प्रगती'
                              ? 'bg-sky-100 text-sky-800'
                              : item.status === 'मध्यम प्रगती'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: PHC-wise Target vs Actual (Requirement 12) */}
        {activeTab === 'phcs' && isPhcController && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-bold">
                  <th className="py-2.5 px-3 w-10">अ.क्र.</th>
                  <th className="py-2.5 px-3">प्राथमिक आरोग्य केंद्र (PHC)</th>
                  <th className="py-2.5 px-3 text-center">उपकेंद्र संख्या</th>
                  <th className="py-2.5 px-3 text-center">गावे</th>
                  <th className="py-2.5 px-3 text-right">लोकसंख्या</th>
                  <th className="py-2.5 px-3 text-right">एकूण घरे</th>
                  <th className="py-2.5 px-3 text-right font-bold text-slate-900">लक्ष्य</th>
                  <th className="py-2.5 px-3 text-right font-bold text-emerald-900">Actual Samples</th>
                  <th className="py-2.5 px-3 text-right">बाकी</th>
                  <th className="py-2.5 px-3 text-right font-bold">Progress %</th>
                  <th className="py-2.5 px-3 text-center">Sent</th>
                  <th className="py-2.5 px-3 text-center font-bold text-rose-800">Pending</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayPhcs.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {item.entityName} {item.code ? `(${item.code})` : ''}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-slate-700">
                      {item.subcentreCount || 0}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-slate-700">
                      {item.villageCount || 0}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      {item.population?.toLocaleString('mr-IN') || 0}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      {item.totalHouses || 0}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                      {item.targetValue}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-900 font-mono">
                      {item.actualSamples}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      {item.remainingTarget}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded-sm ${
                          item.targetValue === 0
                            ? 'text-slate-400'
                            : item.progressPercent >= 100
                            ? 'bg-emerald-100 text-emerald-900'
                            : item.progressPercent >= 50
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-rose-100 text-rose-900'
                        }`}
                      >
                        {item.progressPercent}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-slate-700">
                      {item.sentSamples}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-rose-700">
                      {item.pendingSamples}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          item.status === 'लक्ष्य पूर्ण'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'चांगली प्रगती'
                            ? 'bg-sky-100 text-sky-800'
                            : item.status === 'मध्यम प्रगती'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: Target Master Management List (Requirement 5) */}
        {activeTab === 'target-list' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-bold">
                  <th className="py-2.5 px-3 w-10">अ.क्र.</th>
                  <th className="py-2.5 px-3">वर्ष</th>
                  <th className="py-2.5 px-3">महिना</th>
                  <th className="py-2.5 px-3">स्तर (Scope)</th>
                  <th className="py-2.5 px-3">PHC</th>
                  <th className="py-2.5 px-3">उपकेंद्र</th>
                  <th className="py-2.5 px-3">गाव</th>
                  <th className="py-2.5 px-3">कर्मचारी</th>
                  <th className="py-2.5 px-3 text-right font-bold text-slate-900">लक्ष्य</th>
                  <th className="py-2.5 px-3">Remarks</th>
                  {isPhcController && <th className="py-2.5 px-3 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {targets.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-slate-500 text-xs">
                      अद्याप कोणतेही लक्ष्य तयार केलेले नाही.
                    </td>
                  </tr>
                ) : (
                  targets.map((t, idx) => {
                    const scopeLabel = t.employee_id
                      ? 'कर्मचारी'
                      : t.village_id
                      ? 'गाव'
                      : t.subcentre_id
                      ? 'उपकेंद्र'
                      : 'PHC';

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{t.target_year}</td>
                        <td className="py-2 px-3">
                          {t.target_type === 'Monthly' && t.target_month
                            ? MONTH_NAMES_MR[t.target_month]
                            : 'वार्षिक'}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                            {scopeLabel}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-700">{t.phc_name || '-'}</td>
                        <td className="py-2 px-3 text-slate-700">{t.subcentre_name || '-'}</td>
                        <td className="py-2 px-3 text-slate-700">{t.village_name || '-'}</td>
                        <td className="py-2 px-3 text-slate-700">
                          {t.employee_name ? (
                            <span>
                              {t.employee_name} ({t.malaria_smear_code || 'ANM/MPW'})
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-900 text-sm">
                          {t.target_value}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                          {t.remarks || '-'}
                        </td>
                        {isPhcController && (
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetToEdit(t);
                                  setIsModalOpen(true);
                                }}
                                className="p-1 rounded-md text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="संपादित करा"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTargetId(t.id)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="हटवा"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: Charts (Requirements 13 & 14) */}
        {activeTab === 'charts' && (
          <div className="p-4 sm:p-5">
            <MalariaTargetCharts
              monthlyTrends={monthlyTrendsData}
              employeeProgressList={employeeProgressItems}
              villageProgressList={villageProgressItems}
              selectedYear={filterYear}
            />
          </div>
        )}
      </div>

      {/* Delete Target Confirmation Modal (Requirement 5) */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3 text-rose-700">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">लक्ष्य हटविणे</h3>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              हे लक्ष्य कायमस्वरूपी हटवायचे आहे का? हटवल्यानंतर या उद्दिष्टाची पुनर्प्राप्ती करता येणार नाही.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTarget(deleteTargetId)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-xs cursor-pointer"
              >
                हटवा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Target Modal (Create / Edit) */}
      <MalariaTargetModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTargetToEdit(null);
        }}
        onSaved={() => loadData(true)}
        targetToEdit={targetToEdit}
        phcs={phcs}
        subcentres={subcentres}
        villages={villages}
        employees={employees}
      />

      {/* SQL & RLS Schema Reference Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-800" />
                <h3 className="text-sm font-bold text-slate-900">
                  CODE 8: Database Schema व RLS Policies (malaria_targets)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 overflow-y-auto font-mono text-[11px] bg-slate-950 text-slate-200 p-3.5 rounded-xl flex-1 select-all">
              <pre>{targetService.getSchemaSql()}</pre>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900"
              >
                बंद करा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A4 Printable View (Requirement 17) */}
      <MalariaTargetPrintView
        items={printItemsList}
        selectedPeriodLabel={periodLabel}
        phcName={phcs.find((p) => p.id === "")?.phc_name}
        subcentreName={subcentres.find((s) => s.id === "")?.subcentre_name}
        villageName={villages.find((v) => v.id === selectedVillageId)?.village_name}
        employeeName={employees.find((e) => e.id === selectedEmployeeId)?.employee_name}
        totalTarget={kpiSummary.target}
        totalActual={kpiSummary.actual}
        totalRemaining={kpiSummary.remaining}
        overallProgressPercent={kpiSummary.progressPercent}
        totalSent={kpiSummary.sent}
        totalPending={kpiSummary.pending}
        activeScopeTitle={activeScopeTitle}
      />
    </div>
  );
};
