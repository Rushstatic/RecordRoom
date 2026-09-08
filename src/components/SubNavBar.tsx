import React from 'react';
import {
  CalendarCheck,
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
  Layers,
} from 'lucide-react';
import { PageId } from '../types';
import { MainNavTabId, DATA_ENTRY_SUB_ITEMS, REPORTS_SUB_ITEMS } from '../types/navigation';
import { useAuth } from '../hooks/useAuth';

interface SubNavBarProps {
  currentTab: MainNavTabId;
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  pendingDraftsCount?: number;
  pendingSamplesCount?: number;
}

export const SubNavBar: React.FC<SubNavBarProps> = ({
  currentTab,
  currentPage,
  onNavigate,
  pendingDraftsCount = 0,
  pendingSamplesCount = 0,
}) => {
  const { role } = useAuth();
  const isPhcController = role === 'phc_controller';

  if (currentTab === 'dashboard') {
    return null; // Dashboard is a single dedicated monitoring view
  }

  const items = currentTab === 'data-entry' ? DATA_ENTRY_SUB_ITEMS : REPORTS_SUB_ITEMS;

  const renderIcon = (iconName: string, active: boolean) => {
    const iconClasses = `w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
      active ? 'text-amber-400' : 'text-slate-500 group-hover:text-emerald-700'
    }`;

    switch (iconName) {
      case 'CalendarCheck':
        return <CalendarCheck className={iconClasses} />;
      case 'FileSpreadsheet':
        return <FileSpreadsheet className={iconClasses} />;
      case 'Send':
        return <Send className={iconClasses} />;
      case 'Target':
        return <Target className={iconClasses} />;
      case 'CloudOff':
        return <CloudOff className={iconClasses} />;
      case 'Building2':
        return <Building2 className={iconClasses} />;
      case 'Home':
        return <Home className={iconClasses} />;
      case 'MapPin':
        return <MapPin className={iconClasses} />;
      case 'Users':
        return <Users className={iconClasses} />;
      case 'UserCog':
        return <UserCog className={iconClasses} />;
      case 'BarChart3':
        return <BarChart3 className={iconClasses} />;
      case 'Flag':
        return <Flag className={iconClasses} />;
      case 'ShieldCheck':
        return <ShieldCheck className={iconClasses} />;
      case 'Database':
        return <Database className={iconClasses} />;
      default:
        return <Layers className={iconClasses} />;
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Module Title / Pill Category */}
        <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0">
          <span className="p-1 rounded-md bg-emerald-100 text-emerald-800">
            {currentTab === 'data-entry' ? '📝 Data Entry' : '📊 Reports'}
          </span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-500 text-[11px] font-medium">विभाग निवडा:</span>
        </div>

        {/* Scrollable Sub-items Tab Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full md:w-auto">
          {items.map((item) => {
            // For controller-only items like user-management or phc-master, show differently or filter
            if (item.isControllerOnly && !isPhcController && item.id === 'user-management') {
              return null;
            }

            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                id={`subnav-${item.id}`}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-800 text-white font-bold shadow-xs'
                    : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/90 hover:text-slate-900 border border-slate-200/80'
                }`}
              >
                {renderIcon(item.iconName, isActive)}
                <span>{item.labelMarathi}</span>

                {/* Badges */}
                {item.id === 'offline-drafts' && pendingDraftsCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                      isActive ? 'bg-amber-400 text-emerald-950' : 'bg-amber-500 text-slate-950 animate-pulse'
                    }`}
                  >
                    {pendingDraftsCount}
                  </span>
                )}

                {item.id === 'send-samples' && pendingSamplesCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                      isActive ? 'bg-amber-400 text-emerald-950' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {pendingSamplesCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
