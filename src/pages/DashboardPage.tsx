import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  LayoutDashboard,
  Building2,
  Home,
  MapPin,
  Users,
  FileSpreadsheet,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Code2,
  CheckCircle2,
  X,
  Database,
  UserCheck,
  UserX,
  RefreshCw,
  Send,
  Printer,
  Target,
  Flag,
  CloudOff,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  PlusCircle,
  FileEdit,
} from 'lucide-react';
import { PageId, DashboardMetrics, MalariaBloodSample } from '../types';
import { useAuth } from '../hooks/useAuth';
import { masterDataService } from '../services/masterDataService';
import { malariaService } from '../services/malariaService';
import { tbService, getTodayDateString } from '../services/tbService';
import { Stethoscope } from 'lucide-react';
import { targetService } from '../services/targetService';
import { validationService } from '../services/validationService';
import { offlineDraftService } from '../services/offlineDraftService';
import { isSupabaseConfigured } from '../lib/supabase';

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, role } = useAuth();
  const isPhcController = role === 'phc_controller';

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalPhcs: 0,
    totalSubcentres: 0,
    totalVillages: 0,
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    totalPopulation: 0,
  });

  const [samples, setSamples] = useState<MalariaBloodSample[]>([]);
  const [targetProgress, setTargetProgress] = useState({ target: 120, actual: 0, percentage: 0 });
  const [qualityScore, setQualityScore] = useState(100);
  const [syncStats, setSyncStats] = useState({ pending: 0, synced: 0, failed: 0, total: 0 });
  const [showSqlModal, setShowSqlModal] = useState(false);

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const loadAllDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Master metrics
      const mData = await masterDataService.getDashboardMetrics();
      setMetrics(mData);

      // 2. Fetch blood samples
      const allSamples = await malariaService.getSamples(
        !isPhcController && user?.employeeId ? { employee_id: user.employeeId } : undefined
      );
      setSamples(allSamples);

      // 3. Targets progress
      const curYear = new Date().getFullYear();
      const curMonth = new Date().getMonth() + 1;
      const tgts = await targetService.getTargets({
        target_year: curYear,
        target_month: curMonth,
        phc_id: user?.phcId,
      });
      const monthTgt = tgts.find((t) => t.target_type === 'Monthly')?.target_value || 120;
      const curMonthSamples = allSamples.filter((s) => {
        const d = new Date(s.sample_collection_date);
        return d.getFullYear() === curYear && d.getMonth() + 1 === curMonth;
      }).length;
      setTargetProgress({
        target: monthTgt,
        actual: curMonthSamples,
        percentage: Math.min(100, Math.round((curMonthSamples / monthTgt) * 100)),
      });

      // 4. Data Quality Score
      const [phcs, subcentres, villages, employees] = await Promise.all([
        masterDataService.getPhcs(),
        masterDataService.getSubcentres(),
        masterDataService.getVillages(),
        masterDataService.getEmployees(),
      ]);
      const vResult = validationService.validateAll({
        phcs,
        subcentres,
        villages,
        employees,
        samples: allSamples,
      });
      setQualityScore(vResult.qualityScore || 96);

      // 5. Sync stats
      setSyncStats(offlineDraftService.getSyncStats(user));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllDashboardData();

    const handleSyncChange = () => {
      setSyncStats(offlineDraftService.getSyncStats(user));
    };
    window.addEventListener('arogya-sync-status-changed', handleSyncChange);
    window.addEventListener('arogya-sample-saved', loadAllDashboardData);

    return () => {
      window.removeEventListener('arogya-sync-status-changed', handleSyncChange);
      window.removeEventListener('arogya-sample-saved', loadAllDashboardData);
    };
  }, [user]);

  // Operational metrics calculated from samples
  const todaySamplesCount = useMemo(() => {
    return samples.filter((s) => s.sample_collection_date === todayStr).length;
  }, [samples, todayStr]);

  const todaySentSamplesCount = useMemo(() => {
    return samples.filter((s) => s.sent_date === todayStr).length;
  }, [samples, todayStr]);

  const monthlySamplesCount = useMemo(() => {
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    return samples.filter((s) => {
      const d = new Date(s.sample_collection_date);
      return d.getFullYear() === curYear && d.getMonth() + 1 === curMonth;
    }).length;
  }, [samples]);

  const pendingSamplesCount = useMemo(() => {
    return samples.filter((s) => !s.sent_date).length;
  }, [samples]);

  // Coverage metric (% of villages covered)
  const coveragePercentage = useMemo(() => {
    if (!metrics.totalVillages || metrics.totalVillages === 0) return 0;
    const coveredVillageIds = new Set(samples.map((s) => s.village_id));
    return Math.min(100, Math.round((coveredVillageIds.size / metrics.totalVillages) * 100));
  }, [samples, metrics.totalVillages]);

  // Chart 1: Daily Trend (Last 7 Days)
  const dailyTrendData = useMemo(() => {
    const days: { dateStr: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const ds = `${y}-${m}-${day}`;
      const count = samples.filter((s) => s.sample_collection_date === ds).length;
      days.push({
        dateStr: ds,
        label: `${day}/${m}`,
        count,
      });
    }
    return days;
  }, [samples]);

  // Chart 2: Monthly Trend (Jan - Dec current year)
  const monthlyTrendData = useMemo(() => {
    const curYear = new Date().getFullYear();
    const months = ['जाने', 'फेब्रु', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टें', 'ऑक्टो', 'नोव्हे', 'डिसें'];
    return months.map((name, idx) => {
      const count = samples.filter((s) => {
        const d = new Date(s.sample_collection_date);
        return d.getFullYear() === curYear && d.getMonth() === idx;
      }).length;
      return { month: name, count };
    });
  }, [samples]);

  // Chart 3: Village Performance (Top 5 villages)
  const villagePerformanceData = useMemo(() => {
    const map = new Map<string, number>();
    samples.forEach((s) => {
      const name = s.village_name || 'इतर';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([village, count]) => ({ village, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [samples]);

  // Chart 4: Employee Performance (Top 5 staff)
  const employeePerformanceData = useMemo(() => {
    const map = new Map<string, { count: number; smear: string }>();
    samples.forEach((s) => {
      const name = s.employee_name || 'आरोग्य कर्मचारी';
      const smear = s.malaria_smear_code || '-';
      const existing = map.get(name) || { count: 0, smear };
      map.set(name, { count: existing.count + 1, smear });
    });
    return Array.from(map.entries())
      .map(([name, val]) => ({ name, count: val.count, smear: val.smear }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [samples]);

  const maxDailyCount = Math.max(...dailyTrendData.map((d) => d.count), 5);
  const maxMonthlyCount = Math.max(...monthlyTrendData.map((m) => m.count), 10);
  const maxVillageCount = Math.max(...villagePerformanceData.map((v) => v.count), 5);
  const maxEmployeeCount = Math.max(...employeePerformanceData.map((e) => e.count), 5);

  return (
    <div className="space-y-6">
      {/* 1. Header Hero Banner with Quick CTA */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 rounded-2xl p-5 sm:p-6 text-white shadow-md border border-emerald-700/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-amber-300 font-bold uppercase tracking-wider mb-1">
              <LayoutDashboard className="w-4 h-4" />
              <span>
                {isPhcController ? 'PHC Controller सांख्यिकी व संनियंत्रण डॅशबोर्ड' : 'उपकेंद्र संनियंत्रण डॅशबोर्ड'}
              </span>
              <span className="bg-emerald-950/80 text-emerald-200 text-[10px] px-2 py-0.5 rounded-full border border-emerald-600/50">
                माहिती पाहणे (Monitoring)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              सस्नेह नमस्कार, {user?.marathiName || 'आरोग्य कर्मचारी'}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              सर्व उपकेंद्रे, गावे, दैनंदिन मलेरिया नमुना संकलन, उद्दिष्ट प्रगती आणि डेटा गुणवत्तेचा रिअल-टाईम आढावा.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Primary CTA: “आजचे काम सुरू करा” leading to Data Entry → आजचे काम (CODE 14) */}
            <button
              id="dashboard-goto-daily-work-btn"
              type="button"
              onClick={() => onNavigate('daily-work')}
              className="bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4 text-slate-950" />
              <span>आजचे काम सुरू करा →</span>
            </button>

            {/* Direct CTA: “नवीन नोंद करा” leading to Data Entry tab */}
            <button
              id="dashboard-goto-data-entry-btn"
              type="button"
              onClick={() => onNavigate('malaria-register')}
              className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-white/20 shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-300" />
              <span>रक्त नमुना नोंदवही</span>
            </button>

            <button
              type="button"
              onClick={loadAllDashboardData}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2.5 rounded-xl border border-white/15 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="डॅशबोर्ड डेटा रिफ्रेश करा"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">रिफ्रेश</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Operational KPIs Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-700" />
            <span>दैनिक व मासिक संकलन स्थिती (Operational KPI)</span>
          </h3>
          <span className="text-[11px] text-slate-500">
            आजचा दिनांक: {new Date().toLocaleDateString('mr-IN')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Today's Samples */}
          <div
            onClick={() => onNavigate('malaria-register')}
            className="bg-white rounded-xl border border-emerald-200 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-900 leading-tight">Today's Samples</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 group-hover:bg-emerald-100 transition-colors">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                {loading ? '...' : todaySamplesCount}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">आजचे घेतलेले नमुने</div>
            </div>
          </div>

          {/* 2. Today's Sent Samples */}
          <div
            onClick={() => onNavigate('send-samples')}
            className="bg-white rounded-xl border border-blue-200 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-900 leading-tight">Today's Sent Samples</span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-800 group-hover:bg-blue-100 transition-colors">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                {loading ? '...' : todaySentSamplesCount}
              </div>
              <div className="text-[11px] text-blue-700 font-medium mt-0.5">आज लॅबला पाठवलेले नमुने</div>
            </div>
          </div>

          {/* 3. Monthly Samples */}
          <div
            onClick={() => onNavigate('reports')}
            className="bg-white rounded-xl border border-teal-200 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-teal-900 leading-tight">Monthly Samples</span>
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-800 group-hover:bg-teal-100 transition-colors">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                {loading ? '...' : monthlySamplesCount}
              </div>
              <div className="text-[11px] text-teal-700 font-medium mt-0.5">चालू महिन्यातील एकूण संकलन</div>
            </div>
          </div>

          {/* 4. Pending Samples (Waiting to send) */}
          <div
            onClick={() => onNavigate('send-samples')}
            className="bg-white rounded-xl border-2 border-amber-300 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between bg-amber-50/40"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-950 leading-tight">Pending Samples</span>
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900 group-hover:bg-amber-200 transition-colors">
                <Clock className="w-4 h-4 text-amber-900" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-amber-900">
                {loading ? '...' : pendingSamplesCount}
              </div>
              <div className="text-[11px] text-amber-800 font-semibold mt-0.5 flex items-center justify-between">
                <span>पाठविणे प्रलंबित</span>
                <span className="text-[10px] text-amber-900 underline font-bold">पाठवा →</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Performance & Quality Indices Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Target Progress */}
        <div
          onClick={() => onNavigate('malaria-targets')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Target Progress (लक्ष्यपूर्ती)</span>
            <Flag className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-800">{targetProgress.percentage}%</span>
            <span className="text-xs text-slate-500 font-medium">
              ({targetProgress.actual} / {targetProgress.target})
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, targetProgress.percentage)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 mt-1.5 flex justify-between">
            <span>मासिक उद्दिष्ट</span>
            <span className="font-semibold text-emerald-800">तपशील →</span>
          </div>
        </div>

        {/* Coverage */}
        <div
          onClick={() => onNavigate('malaria-coverage')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Coverage (गावनिहाय व्याप्ती)</span>
            <Target className="w-4 h-4 text-teal-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal-800">{coveragePercentage}%</span>
            <span className="text-xs text-slate-500 font-medium">कार्यक्षेत्र गावे</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${coveragePercentage}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 mt-1.5 flex justify-between">
            <span>{metrics.totalVillages} पैकी गावे समाविष्ट</span>
            <span className="font-semibold text-teal-800">Coverage अहवाल →</span>
          </div>
        </div>

        {/* Data Quality Score */}
        <div
          onClick={() => onNavigate('data-validation')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Data Quality Score</span>
            <ShieldCheck className="w-4 h-4 text-indigo-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-800">{qualityScore}%</span>
            <span className="text-xs text-emerald-600 font-semibold">अचूकता निर्देशांक</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${qualityScore}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 mt-1.5 flex justify-between">
            <span>NVBDCP गुणवत्ता मानके</span>
            <span className="font-semibold text-indigo-800">तपासणी अहवाल →</span>
          </div>
        </div>

        {/* Sync Status */}
        <div
          onClick={() => onNavigate('offline-drafts')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Sync Status (ऑफलाइन)</span>
            <CloudOff className="w-4 h-4 text-amber-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{syncStats.pending}</span>
            <span className="text-xs text-amber-700 font-semibold">प्रलंबित ड्राफ्ट्स</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-2 flex items-center justify-between">
            <span className="text-emerald-700 font-medium">सिंक झालेले: {syncStats.synced}</span>
            {syncStats.failed > 0 && (
              <span className="text-rose-600 font-bold">त्रुटी: {syncStats.failed}</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
            <span>सुरक्षित PWA स्टोरेज</span>
            <span className="font-semibold text-amber-800">सिंक पहा →</span>
          </div>
        </div>
      </div>

      {/* 4. Visual Charts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-700" />
            <span>सांख्यिकी व आलेख विश्लेषण (Analytics Charts)</span>
          </h3>
          <span className="text-[11px] text-slate-500">स्थानिक व Supabase डेटावर आधारित</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: Daily Trend (Last 7 Days) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Daily Trend (दैनिक संकलन कल)</h4>
                <p className="text-[11px] text-slate-500">मागील ७ दिवसांत गोळा केलेले रक्त नमुने</p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                ७ दिवस
              </span>
            </div>

            {/* SVG / Bar Chart Representation */}
            <div className="h-44 flex items-end justify-between gap-2 pt-6 px-2 border-b border-slate-100">
              {dailyTrendData.map((d) => {
                const heightPct = Math.max(8, Math.round((d.count / maxDailyCount) * 100));
                return (
                  <div key={d.dateStr} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] font-bold text-slate-700">{d.count}</span>
                    <div
                      className="w-full max-w-[28px] bg-gradient-to-t from-emerald-700 to-teal-500 rounded-t-md transition-all duration-300 hover:opacity-90"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[10px] text-slate-500 truncate max-w-[36px]">{d.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
              <span>एकूण कल: {dailyTrendData.reduce((a, b) => a + b.count, 0)} नमुने</span>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                दैनिक अहवाल पहा →
              </button>
            </div>
          </div>

          {/* Chart 2: Monthly Trend */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Monthly Trend (मासिक संकलन कल)</h4>
                <p className="text-[11px] text-slate-500">चालू वर्षातील महिनानिहाय संकलन</p>
              </div>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-1 rounded-md border border-teal-200">
                वर्ष २०२६
              </span>
            </div>

            <div className="h-44 flex items-end justify-between gap-1 pt-6 px-1 border-b border-slate-100">
              {monthlyTrendData.map((m) => {
                const heightPct = Math.max(6, Math.round((m.count / maxMonthlyCount) * 100));
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[9px] font-bold text-slate-700">{m.count}</span>
                    <div
                      className="w-full max-w-[18px] bg-gradient-to-t from-teal-700 to-emerald-400 rounded-t-sm transition-all duration-300 hover:opacity-90"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] text-slate-500">{m.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
              <span>मासिक संकलन विश्लेषण</span>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="text-teal-700 font-bold hover:underline cursor-pointer"
              >
                मासिक अहवाल पहा →
              </button>
            </div>
          </div>
        </div>

        {/* Chart 3 & 4: Village Performance & Employee Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Village Performance */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Village Performance (गावनिहाय संकलन)</h4>
                <p className="text-[11px] text-slate-500">सर्वाधिक नमुने घेतलेली गावे</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('malaria-coverage')}
                className="text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                सर्व गावे →
              </button>
            </div>

            <div className="space-y-3 py-2">
              {villagePerformanceData.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">नोंदी उपलब्ध नाहीत</div>
              ) : (
                villagePerformanceData.map((v, i) => {
                  const pct = Math.max(10, Math.round((v.count / maxVillageCount) * 100));
                  return (
                    <div key={v.village} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                          {i + 1}. {v.village}
                        </span>
                        <span className="font-bold text-emerald-800">{v.count} नमुने</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Employee Performance */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Employee Performance (कर्मचारी कामगिरी)</h4>
                <p className="text-[11px] text-slate-500">आरोग्य कर्मचारी व स्मीअर कोडनिहाय संकलन</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('employee-master')}
                className="text-[11px] text-indigo-700 font-bold hover:underline cursor-pointer"
              >
                कर्मचारी यादी →
              </button>
            </div>

            <div className="space-y-3 py-2">
              {employeePerformanceData.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">नोंदी उपलब्ध नाहीत</div>
              ) : (
                employeePerformanceData.map((e, i) => {
                  const pct = Math.max(10, Math.round((e.count / maxEmployeeCount) * 100));
                  return (
                    <div key={e.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="truncate max-w-[220px]">
                          <span className="font-semibold text-slate-800">{i + 1}. {e.name}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5 font-mono font-bold">[{e.smear}]</span>
                        </div>
                        <span className="font-bold text-indigo-800">{e.count} नमुने</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Master Architecture Cards (Total PHCs, Subcentres, Villages, Employees) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span>मास्टर डेटा सांख्यिकी सारांश (Master Statistics)</span>
          </h3>
          <span className="text-[11px] text-slate-500">
            {isSupabaseConfigured() ? 'Supabase Database' : 'Local Offline Master'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div
            onClick={() => onNavigate('phc-master')}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-600">Total PHCs</span>
              <Building2 className="w-4 h-4 text-blue-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{metrics.totalPhcs}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">प्राथमिक आरोग्य केंद्रे</div>
          </div>

          <div
            onClick={() => onNavigate('subcentre-master')}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-600">Total Subcentres</span>
              <Home className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{metrics.totalSubcentres}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">आरोग्य उपकेंद्रे</div>
          </div>

          <div
            onClick={() => onNavigate('village-master')}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-600">Total Villages</span>
              <MapPin className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{metrics.totalVillages}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">एकूण समाविष्ट गावे</div>
          </div>

          <div
            onClick={() => onNavigate('employee-master')}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-600">Total Employees</span>
              <Users className="w-4 h-4 text-indigo-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{metrics.totalEmployees}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              सक्रिय: {metrics.activeEmployees}
            </div>
          </div>
        </div>
      </div>

      {/* SQL View Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  मास्टर डेटाबेस रचना (Database Schema)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-bold text-xs"
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
