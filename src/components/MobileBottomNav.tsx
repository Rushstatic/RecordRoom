import React from 'react';
import { LayoutDashboard, FileEdit, BarChart3, ShieldCheck } from 'lucide-react';
import { MainNavTabId, getMainTabsForRole } from '../types/navigation';
import { useAuth } from '../hooks/useAuth';

interface MobileBottomNavProps {
  currentTab: MainNavTabId;
  onSelectTab: (tabId: MainNavTabId) => void;
  pendingDraftsCount?: number;
  pendingSamplesCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  pendingDraftsCount = 0,
  pendingSamplesCount = 0,
}) => {
  const { role } = useAuth();
  const navTabs = getMainTabsForRole(role);

  return (
    <div
      id="mobile-bottom-navigation-bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 safe-area-pb"
    >
      <div className="flex items-center justify-around">
        {navTabs.map((tab) => {
          const isActive = currentTab === tab.id;

          const renderIcon = () => {
            const iconProps = {
              className: `w-5 h-5 transition-transform ${
                isActive ? 'scale-110 text-emerald-800' : 'text-slate-500'
              }`,
            };

            switch (tab.id) {
              case 'data-entry':
                return <FileEdit {...iconProps} />;
              case 'reports':
                return <BarChart3 {...iconProps} />;
              case 'admin':
                return <ShieldCheck {...iconProps} />;
              case 'dashboard':
                return <LayoutDashboard {...iconProps} />;
              default:
                return <FileEdit {...iconProps} />;
            }
          };

          const totalAlertsForTab =
            tab.id === 'data-entry'
              ? pendingDraftsCount + (pendingSamplesCount > 0 ? 1 : 0)
              : 0;

          return (
            <button
              key={tab.id}
              id={`mobile-nav-${tab.id}`}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-50 text-emerald-950 font-bold'
                  : 'text-slate-600 hover:text-slate-900 active:bg-slate-100'
              }`}
            >
              <div className="relative">
                {renderIcon()}
                {totalAlertsForTab > 0 && (
                  <span className="absolute -top-1 -right-2 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </div>
              <span
                className={`text-[11px] mt-0.5 tracking-tight ${
                  isActive ? 'font-bold text-emerald-900' : 'font-medium text-slate-600'
                }`}
              >
                {tab.id === 'data-entry'
                  ? '📝 Data Entry'
                  : tab.id === 'reports'
                  ? '📊 Reports'
                  : tab.id === 'admin'
                  ? '⚙️ Admin'
                  : '🏠 Dashboard'}
              </span>

              {isActive && (
                <div className="w-8 h-0.5 bg-emerald-800 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
