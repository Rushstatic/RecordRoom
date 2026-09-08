import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Database,
  Shield,
  ShieldCheck,
  Download,
  Printer,
  Search,
  Filter,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  PlusCircle,
  HardDriveDownload,
  Lock,
  Layers,
  FileText,
  FileJson,
} from 'lucide-react';
import {
  SystemAuditLog,
  AuditAction,
  AuditModule,
  BackupHistoryItem,
  AuditActivityMetrics,
  UserRole,
} from '../types';
import { useAuth } from '../hooks/useAuth';
import { auditService } from '../services/auditService';
import { ActivityDetailsModal } from '../components/audit/ActivityDetailsModal';
import { ActivityPrintView } from '../components/audit/ActivityPrintView';
import { RestoreModal } from '../components/audit/RestoreModal';

const ACTION_BADGES: Record<AuditAction, { bg: string; text: string; border: string }> = {
  LOGIN: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  LOGOUT: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  CREATE: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  UPDATE: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  DELETE: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  ACTIVATE: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' },
  DEACTIVATE: { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-300' },
  SEND_SAMPLES: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  PRINT: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  EXPORT: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' },
  BACKUP: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  RESTORE: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-800', border: 'border-fuchsia-200' },
  QUICK_ACTION: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  USER_CREATED: { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300' },
  USER_ACTIVATED: { bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-300' },
  USER_DEACTIVATED: { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300' },
  ROLE_ASSIGNMENT_CHANGED: { bg: 'bg-violet-100', text: 'text-violet-900', border: 'border-violet-300' },
  PASSWORD_RESET: { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300' },
  PASSWORD_RESET_REQUEST: { bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-300' },
  LOGIN_FAILED: { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300' },
};

const MODULE_LIST: AuditModule[] = [
  'Authentication',
  'User Management',
  'PHC Master',
  'Subcentre Master',
  'Village Master',
  'Employee Master',
  'Malaria Sample Register',
  'Send Samples',
  'Malaria Reports',
  'Coverage',
  'Target Management',
  'Data Quality',
  'System Backup',
];

const ACTION_LIST: AuditAction[] = [
  'LOGIN',
  'LOGOUT',
  'CREATE',
  'UPDATE',
  'DELETE',
  'ACTIVATE',
  'DEACTIVATE',
  'SEND_SAMPLES',
  'PRINT',
  'EXPORT',
  'BACKUP',
  'RESTORE',
  'USER_CREATED',
  'USER_ACTIVATED',
  'USER_DEACTIVATED',
  'ROLE_ASSIGNMENT_CHANGED',
  'PASSWORD_RESET',
  'PASSWORD_RESET_REQUEST',
  'LOGIN_FAILED',
];

export const BackupAuditPage: React.FC = () => {
  const { user, role } = useAuth();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'activity' | 'backup' | 'restore'>('activity');

  // Audit Logs State
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<SystemAuditLog | null>(null);

  // Backup History State
  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
  const [lastCreatedBackup, setLastCreatedBackup] = useState<{
    filename: string;
    jsonString: string;
    totalRecords: number;
  } | null>(null);

  // Restore Modal State
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Print Mode
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [filterModule, setFilterModule] = useState<string>('ALL');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH'>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Load audit logs and history
  const loadData = async () => {
    setLoading(true);
    try {
      const fetchedLogs = await auditService.getAuditLogs(role, user);
      setLogs(fetchedLogs);
      const history = auditService.getBackupHistory();
      setBackupHistory(history);
    } catch (err) {
      console.error('Error loading audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role, user]);

  // Compute live activity metrics
  const metrics: AuditActivityMetrics = useMemo(() => {
    return auditService.calculateMetrics(logs);
  }, [logs]);

  // Handle Quick Date Filter click
  const applyQuickFilter = (type: 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH') => {
    setQuickFilter(type);
    setCurrentPage(1);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (type === 'ALL') {
      setDateFrom('');
      setDateTo('');
    } else if (type === 'TODAY') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (type === 'YESTERDAY') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setDateFrom(yStr);
      setDateTo(yStr);
    } else if (type === 'THIS_WEEK') {
      const dayOfWeek = now.getDay();
      const dist = (dayOfWeek + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - dist);
      setDateFrom(monday.toISOString().split('T')[0]);
      setDateTo(todayStr);
    } else if (type === 'THIS_MONTH') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(monthStart.toISOString().split('T')[0]);
      setDateTo(todayStr);
    }
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Date filter
      const logDate = log.created_at.split('T')[0];
      if (dateFrom && logDate < dateFrom) return false;
      if (dateTo && logDate > dateTo) return false;

      // Module filter
      if (filterModule !== 'ALL' && log.module !== filterModule) return false;

      // Action filter
      if (filterAction !== 'ALL' && log.action !== filterAction) return false;

      // Role filter
      if (filterRole !== 'ALL' && log.role !== filterRole) return false;

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const userName = (log.user_name || '').toLowerCase();
        const desc = (log.record_description || '').toLowerCase();
        const mod = (log.module || '').toLowerCase();
        const act = (log.action || '').toLowerCase();
        const recId = (log.record_id || '').toLowerCase();

        if (
          !userName.includes(query) &&
          !desc.includes(query) &&
          !mod.includes(query) &&
          !act.includes(query) &&
          !recId.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [logs, dateFrom, dateTo, filterModule, filterAction, filterRole, searchQuery]);

  // Paginated Logs
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const headers = [
      'अ.क्र.',
      'दिनांक',
      'वेळ',
      'वापरकर्ता',
      'भूमिका',
      'Module',
      'Action',
      'नोंद तपशील',
      'Record ID',
    ];

    const rows = filteredLogs.map((log, index) => {
      const d = new Date(log.created_at);
      const dateStr = d.toLocaleDateString('mr-IN');
      const timeStr = d.toLocaleTimeString('mr-IN');
      const roleStr = log.role === 'phc_controller' ? 'PHC Controller' : 'Subcentre Employee';

      return [
        index + 1,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${(log.user_name || 'सिस्टीम').replace(/"/g, '""')}"`,
        `"${roleStr}"`,
        `"${log.module}"`,
        `"${log.action}"`,
        `"${(log.record_description || '').replace(/"/g, '""')}"`,
        `"${log.record_id || ''}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const nowStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `system_activity_logs_${nowStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Create Backup
  const handleCreateBackup = async () => {
    if (!user) return;
    setIsCreatingBackup(true);
    try {
      const result = await auditService.createBackup(user);
      setLastCreatedBackup({
        filename: result.filename,
        jsonString: result.jsonString,
        totalRecords: result.payload.metadata.total_records,
      });
      // Direct auto-download
      auditService.downloadBackupFile(result.jsonString, result.filename);
      setNotification({
        text: `नवीन बॅकअप यशस्वीरित्या तयार करण्यात आला आणि डाऊनलोड झाला (${result.payload.metadata.total_records} नोंदी).`,
        type: 'success',
      });
      // Refresh history & logs
      loadData();
    } catch (err: any) {
      setNotification({
        text: `बॅकअप तयार करताना त्रुटी: ${err?.message || 'अज्ञात त्रुटी'}`,
        type: 'error',
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // If in Print Mode, render Print View
  if (isPrintMode && user) {
    const filterLabel =
      quickFilter !== 'ALL'
        ? quickFilter
        : dateFrom || dateTo
        ? `${dateFrom || 'आरंभापासून'} ते ${dateTo || 'आजपर्यंत'}`
        : 'सर्व उपलब्ध नोंदी';

    return (
      <ActivityPrintView
        logs={filteredLogs}
        currentUser={user}
        dateFilterLabel={filterLabel}
        onBack={() => setIsPrintMode(false)}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                CODE 10
              </span>
              <span className="text-xs text-slate-500 font-medium">डेटा सुरक्षितता व देखरेख</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              डेटा बॅकअप व प्रणाली Activity (Audit Trail)
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              प्रणालीतील सर्व घडामोडींचा अखंड नोंदींचा मागोवा (Immutable Audit Log), संपूर्ण डेटा बॅकअप व सुरक्षित रिस्टोअर.
            </p>
          </div>
        </div>

        {/* User Scope Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right text-xs">
            <span className="text-slate-500 block text-[11px]">सुरक्षा व्याप्ती (RLS Scope):</span>
            <span className="font-bold text-slate-800">
              {role === 'phc_controller' ? 'सर्व उपकेंद्रे (PHC All Scope)' : user?.assignedSubcentre || 'उपकेंद्र स्कोप'}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-700" />
            )}
            <span className="font-semibold">{notification.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-500 hover:text-slate-700 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px">
        <button
          id="tab-activity-logs"
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'activity'
              ? 'border-purple-700 text-purple-900 bg-purple-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>१. प्रणाली Activity (Audit Logs)</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 ml-1">
            {logs.length}
          </span>
        </button>

        <button
          id="tab-backup"
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'backup'
              ? 'border-purple-700 text-purple-900 bg-purple-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <HardDriveDownload className="w-4 h-4" />
          <span>२. डेटा बॅकअप (Data Backup)</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 ml-1">
            {backupHistory.length}
          </span>
        </button>

        <button
          id="tab-restore"
          type="button"
          onClick={() => setActiveTab('restore')}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'restore'
              ? 'border-purple-700 text-purple-900 bg-purple-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>३. डेटा रिस्टोअर (Data Restore)</span>
          {role !== 'phc_controller' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 ml-1 flex items-center gap-0.5">
              <Lock className="w-3 h-3" /> PHC Only
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SYSTEM ACTIVITY & AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          {/* 8 Metric Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-700" />
                <span>सिस्टीम Activity सांख्यिकी (Live Activity Stats)</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                अद्ययावत: {new Date().toLocaleTimeString('mr-IN')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {/* Card 1: Today */}
              <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-blue-900 block truncate">आजच्या Activities</span>
                <div className="text-xl font-bold text-slate-900 mt-1">{metrics.todayCount}</div>
                <span className="text-[10px] text-slate-500">आजच्या नोंदी</span>
              </div>

              {/* Card 2: This Week */}
              <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-indigo-900 block truncate">या आठवड्यातील</span>
                <div className="text-xl font-bold text-slate-900 mt-1">{metrics.thisWeekCount}</div>
                <span className="text-[10px] text-slate-500">चालू आठवडा</span>
              </div>

              {/* Card 3: This Month */}
              <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-purple-900 block truncate">या महिन्यातील</span>
                <div className="text-xl font-bold text-slate-900 mt-1">{metrics.thisMonthCount}</div>
                <span className="text-[10px] text-slate-500">चालू महिना</span>
              </div>

              {/* Card 4: Samples Created */}
              <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-emerald-900 block truncate">नमुने नोंदणी</span>
                <div className="text-xl font-bold text-emerald-700 mt-1">{metrics.sampleCreatedCount}</div>
                <span className="text-[10px] text-slate-500">नवीन संकलन</span>
              </div>

              {/* Card 5: Samples Updated */}
              <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-amber-900 block truncate">नमुने अद्ययावत</span>
                <div className="text-xl font-bold text-amber-700 mt-1">{metrics.sampleUpdatedCount}</div>
                <span className="text-[10px] text-slate-500">दुरुस्त नोंदी</span>
              </div>

              {/* Card 6: Samples Deleted */}
              <div className="bg-white p-3 rounded-xl border border-rose-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-rose-900 block truncate">नमुने हटविले</span>
                <div className="text-xl font-bold text-rose-700 mt-1">{metrics.sampleDeletedCount}</div>
                <span className="text-[10px] text-slate-500">हटवलेल्या नोंदी</span>
              </div>

              {/* Card 7: Master Data Changes */}
              <div className="bg-white p-3 rounded-xl border border-teal-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-teal-900 block truncate">मास्टर बदल</span>
                <div className="text-xl font-bold text-slate-900 mt-1">{metrics.masterDataChangesCount}</div>
                <span className="text-[10px] text-slate-500">मास्टर डेटा बदल</span>
              </div>

              {/* Card 8: Login/Logout */}
              <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-800 block truncate">लॉगिन / आउट</span>
                <div className="text-xl font-bold text-slate-900 mt-1">{metrics.loginLogoutCount}</div>
                <span className="text-[10px] text-slate-500">प्रवेश सत्रे</span>
              </div>
            </div>
          </div>

          {/* Quick Filters Bar & Export Actions */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Quick Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  त्वरित कालावधी:
                </span>
                {[
                  { id: 'ALL', label: 'सर्व (All)' },
                  { id: 'TODAY', label: 'आज (Today)' },
                  { id: 'YESTERDAY', label: 'काल (Yesterday)' },
                  { id: 'THIS_WEEK', label: 'या आठवड्यात (Week)' },
                  { id: 'THIS_MONTH', label: 'हा महिना (Month)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applyQuickFilter(item.id as any)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      quickFilter === item.id
                        ? 'bg-purple-800 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Action Buttons: Excel and Print */}
              <div className="flex items-center gap-2">
                <button
                  id="export-activity-excel-btn"
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Activity Excel डाउनलोड</span>
                </button>

                <button
                  id="print-activity-a4-btn"
                  type="button"
                  onClick={() => setIsPrintMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>A4 अहवाल प्रिंट करा</span>
                </button>
              </div>
            </div>

            {/* Detailed Filter Inputs Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 text-xs">
              {/* Search */}
              <div className="lg:col-span-2 relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="वापरकर्ता, नोंद किंवा तपशील शोधा..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Date From */}
              <div>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setQuickFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                  title="दिनांक पासून"
                />
              </div>

              {/* Date To */}
              <div>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setQuickFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                  title="दिनांक पर्यंत"
                />
              </div>

              {/* Module Filter */}
              <div>
                <select
                  value={filterModule}
                  onChange={(e) => {
                    setFilterModule(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                >
                  <option value="ALL">सर्व Modules</option>
                  {MODULE_LIST.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Filter */}
              <div>
                <select
                  value={filterAction}
                  onChange={(e) => {
                    setFilterAction(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                >
                  <option value="ALL">सर्व Actions</option>
                  {ACTION_LIST.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Activity Logs Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <History className="w-4 h-4 text-purple-700" />
                <span>प्रणाली Activity यादी (Filtered: {filteredLogs.length} नोंदी)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>प्रति पान:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3 w-12 text-center">अ.क्र.</th>
                    <th className="p-3 w-28">दिनांक व वेळ</th>
                    <th className="p-3 w-40">वापरकर्ता</th>
                    <th className="p-3 w-28">भूमिका</th>
                    <th className="p-3 w-36">Module</th>
                    <th className="p-3 w-24 text-center">Action</th>
                    <th className="p-3">नोंद तपशील (Record Details)</th>
                    <th className="p-3 w-24 text-center">कृती</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-700" />
                        <span>नोंदी लोड होत आहेत...</span>
                      </td>
                    </tr>
                  ) : paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        दिलेल्या निकषांनुसार कोणतीही Activity नोंद आढळली नाही.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log, index) => {
                      const dateObj = new Date(log.created_at);
                      const dateStr = dateObj.toLocaleDateString('mr-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      });
                      const timeStr = dateObj.toLocaleTimeString('mr-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      const actionBadge = ACTION_BADGES[log.action] || {
                        bg: 'bg-slate-100',
                        text: 'text-slate-700',
                        border: 'border-slate-300',
                      };

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center font-mono text-slate-500">
                            {(currentPage - 1) * pageSize + index + 1}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{dateStr}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {timeStr}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{log.user_name || 'सिस्टीम'}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                log.role === 'phc_controller'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {log.role === 'phc_controller' ? 'PHC नियंत्रक' : 'उपकेंद्र कर्मचारी'}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-800">{log.module}</td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded-md border ${actionBadge.bg} ${actionBadge.text} ${actionBadge.border}`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 text-slate-800 leading-snug">
                            <div className="line-clamp-2">{log.record_description || '-'}</div>
                            {log.record_id && (
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                ID: {log.record_id}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              id={`view-log-details-${log.id}`}
                              type="button"
                              onClick={() => setSelectedLog(log)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-purple-100 text-purple-900 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                              title="तपशील पहा"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>पहा</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  पान {currentPage} / {totalPages} (एकूण {filteredLogs.length} नोंदी)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-white border border-slate-300 rounded-md disabled:opacity-40 font-semibold cursor-pointer"
                  >
                    मागे
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-white border border-slate-300 rounded-md disabled:opacity-40 font-semibold cursor-pointer"
                  >
                    पुढे
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DATA BACKUP & HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Create Backup Action Card */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-800/80 border border-purple-400/40 text-xs font-bold">
                <Database className="w-3.5 h-3.5 text-amber-300" />
                <span>सुरक्षित ऑफलाइन व क्लाऊड बॅकअप</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">
                आरोग्य उपकेंद्र प्रणाली संपूर्ण डेटा बॅकअप
              </h2>
              <p className="text-xs sm:text-sm text-purple-100 leading-relaxed">
                एका क्लिकवर सर्व प्राथमिक आरोग्य केंद्र, उपकेंद्रे, गावे, कर्मचारी, मलेरिया रक्त नमुने, मासिक लक्ष्ये आणि Audit Trail चा पूर्ण सुरक्षित JSON बॅकअप तयार करा. बॅकअप फाईल त्वरित आपल्या संगणकात जतन केली जाईल.
              </p>

              <div className="pt-3 flex flex-wrap items-center gap-3">
                <button
                  id="create-new-backup-btn"
                  type="button"
                  onClick={handleCreateBackup}
                  disabled={isCreatingBackup}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCreatingBackup ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>बॅकअप तयार होत आहे...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>नवीन Backup तयार व Download करा</span>
                    </>
                  )}
                </button>

                <div className="text-xs text-purple-200">
                  फॉरमॅट: <strong className="text-white">JSON (UTF-8)</strong> • पासवर्ड किंवा गुप्त कीज समाविष्ट नसतात.
                </div>
              </div>
            </div>
          </div>

          {/* Newly Created Backup Banner */}
          {lastCreatedBackup && (
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">
                    बॅकअप यशस्वी: {lastCreatedBackup.filename}
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    एकूण {lastCreatedBackup.totalRecords} नोंदी सुरक्षितपणे जतन करण्यात आल्या आहेत.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  auditService.downloadBackupFile(
                    lastCreatedBackup.jsonString,
                    lastCreatedBackup.filename
                  )
                }
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>पुन्हा Download करा</span>
              </button>
            </div>
          )}

          {/* Backup Specifications Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Layers className="w-4 h-4 text-purple-700" />
                <span>समाविष्ट मुख्य टेबल्स (७ टेबल्स)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                PHC Master, Subcentre Master, Village Master, Employee Master, Malaria Samples Register, Malaria Targets आणि System Audit Logs.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <FileJson className="w-4 h-4 text-emerald-700" />
                <span>प्रमाणित फाईल नाव रचना</span>
              </div>
              <p className="text-xs text-slate-600 font-mono text-[11px]">
                malaria_health_backup_YYYY-MM-DD_HH-mm.json
              </p>
              <p className="text-[11px] text-slate-500">
                मराठी युनिकोड फॉन्ट सुसंगततेसह UTF-8 फॉरमॅट.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span>डेटा गोपनीयता व संरक्षण</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                बॅकअपमध्ये कोणताही यूजर पासवर्ड, ऑथेंटिकेशन टोकन्स किंवा API सिक्रेट्स समाविष्ट नसतात.
              </p>
            </div>
          </div>

          {/* Backup History Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDriveDownload className="w-4 h-4 text-purple-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  बॅकअप इतिहास (Backup History Log)
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                एकूण {backupHistory.length} बॅकअप नोंदी
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3 w-12 text-center">अ.क्र.</th>
                    <th className="p-3 w-32">दिनांक व वेळ</th>
                    <th className="p-3">फाईल नाव (Filename)</th>
                    <th className="p-3 w-44">तयार करणारा (Created By)</th>
                    <th className="p-3 w-28 text-center">एकूण नोंदी</th>
                    <th className="p-3 w-24 text-center">स्थिती</th>
                    <th className="p-3 w-28 text-center">कृती</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {backupHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        अद्याप कोणताही बॅकअप इतिहास उपलब्ध नाही.
                      </td>
                    </tr>
                  ) : (
                    backupHistory.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 text-center font-mono text-slate-500">{index + 1}</td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{item.backup_date}</div>
                          <div className="text-[11px] text-slate-500">{item.backup_time}</div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-purple-950 font-semibold">
                          {item.filename}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{item.created_by}</div>
                          <div className="text-[10px] text-slate-500">{item.created_by_role}</div>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800">
                          {item.records_count}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {item.payload_json ? (
                            <button
                              type="button"
                              onClick={() =>
                                auditService.downloadBackupFile(item.payload_json!, item.filename)
                              }
                              className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold rounded-lg border border-purple-200 transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">जतन केले</span>
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

      {/* ========================================================================= */}
      {/* TAB 3: DATA RESTORE (PHC CONTROLLER ONLY) */}
      {/* ========================================================================= */}
      {activeTab === 'restore' && (
        <div className="space-y-6">
          {role !== 'phc_controller' ? (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 text-xs text-amber-950 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-amber-950">
                  डेटा रिस्टोअर सुविधा प्रतिबंधित आहे (Access Restricted)
                </h3>
                <p className="text-xs leading-relaxed text-amber-900">
                  डेटाबेस रिस्टोअर करणे ही एक अतिसंवेदनशील प्रक्रिया असून ही सुविधा केवळ <strong>PHC Controller / वैद्यकीय अधिकारी</strong> यांच्यासाठी उपलब्ध आहे. उपकेंद्र कर्मचाऱ्यांच्या खात्यातून थेट रिस्टोअर करण्यास परवानगी नाही.
                </p>
                <p className="text-[11px] text-amber-800 pt-2">
                  आपल्याला बॅकअपमधून डेटा पूर्ववत करायचा असल्यास कृपया प्राथमिक आरोग्य केंद्राच्या वैद्यकीय अधिकाऱ्यांशी संपर्क साधा.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Restore Info & Action Hero */}
              <div className="bg-white rounded-2xl p-6 border-2 border-amber-300 shadow-sm space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      प्रणाली डेटाबेस सुरक्षित रिस्टोअर (Safe Restore Wizard)
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      पूर्वी तयार केलेल्या अधिकृत JSON बॅकअप फाईलमधून प्रणालीचा डेटा पूर्ववत करा. रिस्टोअर करण्यापूर्वी फाईल तपासणी (Validation), स्कीमा तपासणी आणि सध्याच्या डेटाचा आपोआप सेफ्टी बॅकअप (Safety Backup) घेतला जातो.
                    </p>
                  </div>
                </div>

                {/* 3 Step Guide */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                    <span className="font-bold text-purple-900 block">१. फाईल निवड व तपासणी</span>
                    <p className="text-slate-600 text-[11px]">
                      प्रणालीद्वारे प्रमाणित .json फॉरमॅटमधील बॅकअप फाईल निवडा.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                    <span className="font-bold text-amber-900 block">२. Safety Backup निर्मिती</span>
                    <p className="text-slate-600 text-[11px]">
                      कोणताही डेटा बदलण्यापूर्वी सध्याच्या चालू डेटाचा आपोआप बॅकअप जतन होतो.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                    <span className="font-bold text-emerald-900 block">३. स्पष्ट संमती व रिस्टोअर</span>
                    <p className="text-slate-600 text-[11px]">
                      परिणामांची खात्री दिल्यानंतरच संपूर्ण डेटा अखंडपणे रिस्टोअर होतो.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="open-restore-modal-btn"
                    type="button"
                    onClick={() => setShowRestoreModal(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    <Database className="w-4 h-4" />
                    <span>डेटा रिस्टोअर प्रक्रिया सुरू करा (Launch Restore Wizard)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Details Modal */}
      {selectedLog && (
        <ActivityDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}

      {/* Restore Wizard Modal */}
      {showRestoreModal && user && (
        <RestoreModal
          currentUser={user}
          onClose={() => setShowRestoreModal(false)}
          onSuccess={(msg) => {
            setNotification({ text: msg, type: 'success' });
            loadData();
          }}
        />
      )}
    </div>
  );
};
