import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  LayoutDashboard,
  FileEdit,
  FileSpreadsheet,
  Send,
  Target,
  CloudOff,
  Building2,
  Home,
  MapPin,
  Users,
  UserCog,
  BarChart3,
  Flag,
  ShieldCheck,
  Database,
  Bell,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Building,
  Terminal,
} from 'lucide-react';
import { PageId } from '../types';
import { useAuth } from '../hooks/useAuth';
import { offlineDraftService } from '../services/offlineDraftService';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  onOpenAccountModal?: () => void;
  onOpenNotifications?: () => void;
  pendingSamplesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpen,
  onCloseMobile,
  onOpenAccountModal,
  onOpenNotifications,
  pendingSamplesCount = 0,
}) => {
  const { user, role, switchRole, logout } = useAuth();
  const isPhcController = role === 'phc_controller';

  const [pendingDraftsCount, setPendingDraftsCount] = useState(() =>
    offlineDraftService.getSyncStats(user).pending
  );

  const [isMasterDataExpanded, setIsMasterDataExpanded] = useState(true);

  useEffect(() => {
    const updateCount = () => {
      setPendingDraftsCount(offlineDraftService.getSyncStats(user).pending);
    };

    updateCount();
    window.addEventListener('arogya-sync-status-changed', updateCount);
    return () => {
      window.removeEventListener('arogya-sync-status-changed', updateCount);
    };
  }, [user]);

  const handleItemClick = (pageId: PageId) => {
    onNavigate(pageId);
    onCloseMobile();
  };

  const isMasterActive =
    currentPage === 'phc-master' ||
    currentPage === 'subcentre-master' ||
    currentPage === 'village-master' ||
    currentPage === 'employee-master';

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="application-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out shadow-lg lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header on Mobile */}
        <div className="lg:hidden p-4 border-b border-slate-200 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-amber-400" />
            <div className="text-sm font-bold">आरोग्य उपकेंद्र प्रणाली</div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 rounded-md hover:bg-white/10 text-white text-xs font-medium cursor-pointer"
          >
            बंद करा ✕
          </button>
        </div>

        {/* User Context Capsule inside Sidebar */}
        <div className="p-3 mx-3 mt-3 mb-1 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-xl">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {isPhcController ? 'PHC' : 'SC'}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-semibold text-emerald-900 uppercase tracking-wider">
                  सध्याची भूमिका
                </span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                  isPhcController ? 'bg-amber-400 text-slate-950' : 'bg-emerald-200 text-emerald-900'
                }`}>
                  {isPhcController ? 'PHC नियंत्रक' : 'उपकेंद्र कर्मचारी'}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-800 truncate mt-0.5">
                {user?.marathiName || user?.name || 'वापरकर्ता'}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium truncate">
                {user?.assignedSubcentre || user?.assignedPhc || (isPhcController ? 'प्रा.आ.के. नियंत्रण' : 'आरोग्य उपकेंद्र')}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
          {/* ============================================================== */}
          {/* SECTION 1: 🏠 DASHBOARD                                        */}
          {/* ============================================================== */}
          <div>
            <button
              id="sidebar-nav-dashboard"
              type="button"
              onClick={() => handleItemClick('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentPage === 'dashboard'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard
                  className={`w-4 h-4 shrink-0 ${
                    currentPage === 'dashboard' ? 'text-amber-400' : 'text-slate-600'
                  }`}
                />
                <span>🏠 Dashboard</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  currentPage === 'dashboard' ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
                }`}
              >
                माहिती
              </span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* SECTION 2: 📝 DATA ENTRY                                       */}
          {/* ============================================================== */}
          <div className="space-y-1">
            <div className="px-2 py-1 flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileEdit className="w-3.5 h-3.5 text-emerald-700" />
                <span>📝 Data Entry (काम करणे)</span>
              </span>
            </div>

            {/* 0. 📅 आजचे काम (Daily Work & Quick Actions) */}
            <button
              id="sidebar-nav-daily-work"
              type="button"
              onClick={() => handleItemClick('daily-work')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                currentPage === 'daily-work'
                  ? 'bg-emerald-800 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <CalendarCheck
                  className={`w-4 h-4 shrink-0 ${
                    currentPage === 'daily-work' ? 'text-amber-400' : 'text-emerald-600'
                  }`}
                />
                <span className="truncate font-semibold">📅 आजचे काम (Daily Work)</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  currentPage === 'daily-work' ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'
                }`}
              >
                मुख्य
              </span>
            </button>

            {/* 1. Malaria Blood Sample Register */}
            <button
              id="sidebar-nav-malaria-register"
              type="button"
              onClick={() => handleItemClick('malaria-register')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                currentPage === 'malaria-register'
                  ? 'bg-emerald-800 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <FileSpreadsheet
                  className={`w-4 h-4 shrink-0 ${
                    currentPage === 'malaria-register' ? 'text-amber-400' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">रक्त नमुना नोंद (Register)</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  currentPage === 'malaria-register' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                नोंद
              </span>
            </button>

            {/* 2. Send Samples */}
            <button
              id="sidebar-nav-send-samples"
              type="button"
              onClick={() => handleItemClick('send-samples')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                currentPage === 'send-samples'
                  ? 'bg-emerald-800 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Send
                  className={`w-4 h-4 shrink-0 ${
                    currentPage === 'send-samples' ? 'text-amber-400' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">नमुने पाठविणे व पावती</span>
              </div>
              {pendingSamplesCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    currentPage === 'send-samples' ? 'bg-amber-400 text-slate-950' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {pendingSamplesCount}
                </span>
              )}
            </button>

            {/* 3. Malaria Targets Entry */}
            <button
              id="sidebar-nav-malaria-targets"
              type="button"
              onClick={() => handleItemClick('malaria-targets')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                currentPage === 'malaria-targets'
                  ? 'bg-emerald-800 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Target
                  className={`w-4 h-4 shrink-0 ${
                    currentPage === 'malaria-targets' ? 'text-amber-400' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">मलेरिया लक्ष्य (Targets)</span>
              </div>
            </button>

            {/* 4. Offline Drafts */}
            <button
              id="sidebar-nav-offline-drafts"
              type="button"
              onClick={() => handleItemClick('offline-drafts')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                currentPage === 'offline-drafts'
                  ? 'bg-emerald-800 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <CloudOff
                  className={`w-4 h-4 shrink-0 ${
                    currentPage === 'offline-drafts' ? 'text-amber-400' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">Offline Drafts</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  pendingDraftsCount > 0
                    ? 'bg-amber-500 text-slate-950 animate-pulse'
                    : currentPage === 'offline-drafts'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {pendingDraftsCount > 0 ? `${pendingDraftsCount} प्रलंबित` : 'PWA'}
              </span>
            </button>

            {/* 5. Dynamic Registers Data Entry */}
            <button
              id="sidebar-nav-dynamic-register"
              type="button"
              onClick={() => handleItemClick('dynamic-register')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                currentPage === 'dynamic-register'
                  ? 'bg-emerald-800 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <FileSpreadsheet
                  className={`w-4 h-4 shrink-0 ${
                    currentPage === 'dynamic-register' ? 'text-amber-400' : 'text-indigo-600'
                  }`}
                />
                <span className="truncate">डिजिटल नोंदवह्या (Dynamic)</span>
              </div>
            </button>

            {/* 6. Dynamic Record Builder (PHC Controller ONLY) */}
            {isPhcController && (
              <button
                id="sidebar-nav-dynamic-record-builder"
                type="button"
                onClick={() => handleItemClick('template-builder')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                  currentPage === 'template-builder' || currentPage === 'template-fields'
                    ? 'bg-indigo-900 text-white font-bold shadow-xs'
                    : 'text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileSpreadsheet
                    className={`w-4 h-4 shrink-0 ${
                      currentPage === 'template-builder' || currentPage === 'template-fields'
                        ? 'text-amber-300'
                        : 'text-indigo-700'
                    }`}
                  />
                  <span className="truncate font-semibold">Dynamic Record Builder</span>
                </div>
                <span className="text-[9px] bg-indigo-700 text-white font-bold px-1.5 py-0.5 rounded">
                  Builder
                </span>
              </button>
            )}

            {/* PHC Controller Only: Master Data & User Management */}
            {isPhcController && (
              <>
                {/* 5. Master Data Sub-group */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsMasterDataExpanded(!isMasterDataExpanded)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-md hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-emerald-800" />
                      <span>Master Data (मास्टर डेटा)</span>
                    </div>
                    {isMasterDataExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {isMasterDataExpanded && (
                    <div className="pl-6 pr-1 py-1 space-y-0.5 border-l-2 border-emerald-100 ml-3.5">
                      <button
                        type="button"
                        onClick={() => handleItemClick('phc-master')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-[11px] transition-all cursor-pointer ${
                          currentPage === 'phc-master'
                            ? 'bg-emerald-700 text-white font-bold'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span>प्रा.आ. केंद्र मास्टर (PHC)</span>
                        <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1 rounded">
                          नियंत्रक
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleItemClick('subcentre-master')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-[11px] transition-all cursor-pointer ${
                          currentPage === 'subcentre-master'
                            ? 'bg-emerald-700 text-white font-bold'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span>उपकेंद्र मास्टर (Subcentre)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleItemClick('village-master')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-[11px] transition-all cursor-pointer ${
                          currentPage === 'village-master'
                            ? 'bg-emerald-700 text-white font-bold'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span>गाव मास्टर (Village)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleItemClick('employee-master')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-[11px] transition-all cursor-pointer ${
                          currentPage === 'employee-master'
                            ? 'bg-emerald-700 text-white font-bold'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span>कर्मचारी मास्टर (Employee)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 6. User Management */}
                <button
                  id="sidebar-nav-user-management"
                  type="button"
                  onClick={() => handleItemClick('user-management')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                    currentPage === 'user-management'
                      ? 'bg-emerald-800 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <UserCog
                      className={`w-4 h-4 shrink-0 ${
                        currentPage === 'user-management' ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    />
                    <span className="truncate">वापरकर्ता व्यवस्थापन (RBAC)</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      currentPage === 'user-management' ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    नियंत्रक
                  </span>
                </button>
              </>
            )}
          </div>

          {/* ============================================================== */}
          {/* SECTION 3: 📊 REPORTS                                          */}
          {/* ============================================================== */}
          <div className="space-y-1">
            <div className="px-2 py-1 flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-teal-700" />
                <span>📊 Reports (अहवाल व विश्लेषण)</span>
              </span>
            </div>

            {/* 1. Malaria Reports */}
            <button
              id="sidebar-nav-reports"
              type="button"
              onClick={() => handleItemClick('reports')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                currentPage === 'reports' || currentPage === 'malaria-reports'
                  ? 'bg-emerald-800 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <BarChart3
                  className={`w-4 h-4 shrink-0 ${
                    currentPage === 'reports' || currentPage === 'malaria-reports'
                      ? 'text-amber-400'
                      : 'text-slate-500'
                  }`}
                />
                <span className="truncate">मलेरिया अहवाल (M1/M2)</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  currentPage === 'reports' || currentPage === 'malaria-reports'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-teal-100 text-teal-800'
                }`}
              >
                A4 Print
              </span>
            </button>

            {/* 2. Coverage */}
            <button
              id="sidebar-nav-malaria-coverage"
              type="button"
              onClick={() => handleItemClick('malaria-coverage')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                currentPage === 'malaria-coverage'
                  ? 'bg-emerald-800 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Target
                  className={`w-4 h-4 shrink-0 ${
                    currentPage === 'malaria-coverage' ? 'text-amber-400' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">मलेरिया Coverage</span>
              </div>
            </button>

            {/* 3. Targets & Progress */}
            <button
              id="sidebar-nav-targets-progress-report"
              type="button"
              onClick={() => handleItemClick('malaria-targets')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                currentPage === 'malaria-targets'
                  ? 'bg-emerald-800 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Flag
                  className={`w-4 h-4 shrink-0 ${
                    currentPage === 'malaria-targets' ? 'text-amber-400' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">लक्ष्य व प्रगती अहवाल</span>
              </div>
            </button>

            {/* 4. Data Quality */}
            <button
              id="sidebar-nav-data-validation"
              type="button"
              onClick={() => handleItemClick('data-validation')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                currentPage === 'data-validation'
                  ? 'bg-emerald-800 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <ShieldCheck
                  className={`w-4 h-4 shrink-0 ${
                    currentPage === 'data-validation' ? 'text-amber-400' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">डेटा गुणवत्ता अहवाल</span>
              </div>
            </button>

            {/* 5. Dynamic Register Reports */}
            <button
              id="sidebar-nav-dynamic-reports"
              type="button"
              onClick={() => handleItemClick('dynamic-report')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                currentPage === 'dynamic-report'
                  ? 'bg-teal-900 text-white font-bold shadow-xs'
                  : 'text-teal-900 bg-teal-50/70 hover:bg-teal-100/80 border border-teal-200/60'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <BarChart3
                  className={`w-4 h-4 shrink-0 ${
                    currentPage === 'dynamic-report' ? 'text-amber-300' : 'text-teal-700'
                  }`}
                />
                <span className="truncate font-semibold">Dynamic Register Reports</span>
              </div>
              <span className="text-[9px] bg-teal-700 text-white font-bold px-1.5 py-0.5 rounded">
                अहवाल
              </span>
            </button>

            {/* 5. Activity / Audit (PHC Controller Only) */}
            {isPhcController && (
              <>
                <button
                  id="sidebar-nav-backup-audit"
                  type="button"
                  onClick={() => handleItemClick('backup-audit')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                    currentPage === 'backup-audit'
                      ? 'bg-emerald-800 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Database
                      className={`w-4 h-4 shrink-0 ${
                        currentPage === 'backup-audit' ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    />
                    <span className="truncate">Activity / Audit Log</span>
                  </div>
                </button>

                {/* 6. SQL Query Console (Admin Only) */}
                <button
                  id="sidebar-nav-sql-query"
                  type="button"
                  onClick={() => handleItemClick('sql-query')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                    currentPage === 'sql-query'
                      ? 'bg-emerald-800 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Terminal
                      className={`w-4 h-4 shrink-0 ${
                        currentPage === 'sql-query' ? 'text-amber-400' : 'text-indigo-600'
                      }`}
                    />
                    <span className="truncate font-semibold">SQL Query Console</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      currentPage === 'sql-query'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    Admin
                  </span>
                </button>
              </>
            )}
          </div>
        </nav>

        {/* ================================================================ */}
        {/* FOOTER: 🔔 सूचना | 👤 माझे खाते | 🚪 लॉगआउट                       */}
        {/* ================================================================ */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-1.5 shrink-0">
          {/* Notifications Button */}
          <button
            id="sidebar-notifications-btn"
            type="button"
            onClick={() => {
              if (onOpenNotifications) {
                onOpenNotifications();
              }
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white hover:text-emerald-900 border border-slate-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-800" />
              <span>🔔 सूचना (Notifications)</span>
            </div>
            {pendingDraftsCount > 0 && (
              <span className="text-[10px] bg-amber-400 text-emerald-950 font-bold px-1.5 py-0.2 rounded-full">
                {pendingDraftsCount}
              </span>
            )}
          </button>

          {/* My Account Button */}
          <button
            id="sidebar-my-account-btn"
            type="button"
            onClick={() => {
              if (onOpenAccountModal) {
                onOpenAccountModal();
              }
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white hover:text-emerald-900 border border-slate-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-800" />
              <span>👤 माझे खाते (My Account)</span>
            </div>
          </button>

          {/* Logout Button */}
          <button
            id="sidebar-logout-btn"
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 hover:text-rose-900 border border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>लॉगआउट करा</span>
          </button>
        </div>
      </aside>
    </>
  );
};
