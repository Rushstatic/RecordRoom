import React, { useState } from 'react';
import {
  Menu,
  X,
  LogOut,
  ShieldCheck,
  UserCheck,
  Stethoscope,
  LayoutDashboard,
  FileEdit,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PageId } from '../types';
import { MainNavTabId, MAIN_NAV_TABS } from '../types/navigation';
import { MyAccountModal } from './auth/MyAccountModal';
import { NetworkStatusIndicator } from './NetworkStatusIndicator';
import { SyncIndicator } from './SyncIndicator';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNavigateLogin?: () => void;
  onNavigatePage?: (page: PageId) => void;
  currentTab?: MainNavTabId;
  onSelectTab?: (tabId: MainNavTabId) => void;
  isAccountModalOpen?: boolean;
  setIsAccountModalOpen?: (isOpen: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  onNavigateLogin,
  onNavigatePage,
  currentTab = 'dashboard',
  onSelectTab,
  isAccountModalOpen: controlledModalOpen,
  setIsAccountModalOpen: setControlledModalOpen,
}) => {
  const { user, role, logout } = useAuth();
  const [internalModalOpen, setInternalModalOpen] = useState(false);

  const isModalOpen = controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen;
  const setModalOpen = setControlledModalOpen || setInternalModalOpen;

  const handleLogout = async () => {
    await logout();
    if (onNavigateLogin) {
      onNavigateLogin();
    }
  };

  return (
    <>
      <header className="bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 text-white shadow-md border-b-4 border-amber-500 sticky top-0 z-30">
        {/* Top micro-bar showing government affiliation */}
        <div className="bg-black/25 text-[11px] font-medium tracking-wide py-1 px-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
            <span>महाराष्ट्र शासन | सार्वजनिक आरोग्य विभाग | राष्ट्रीय आरोग्य अभियान</span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-slate-300">
            <span>डिजिटल उपकेंद्र पोर्टल</span>
            <span>•</span>
            <span>CODE 13A नेव्हिगेशन स्ट्रक्चर</span>
          </div>
        </div>

        {/* Main Header Bar */}
        <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          {/* Left: Mobile Menu Trigger + App Name */}
          <div className="flex items-center gap-3">
            <button
              id="mobile-sidebar-toggle-btn"
              type="button"
              onClick={onToggleSidebar}
              aria-label={isSidebarOpen ? 'मेनू बंद करा' : 'मेनू उघडा'}
              className="lg:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors cursor-pointer"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Emblem & Logo Icon */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 p-0.5 shadow-inner flex items-center justify-center shrink-0">
                <div className="w-full h-full rounded-[6px] bg-emerald-900 flex items-center justify-center text-amber-300">
                  <Stethoscope className="w-5 h-5" />
                </div>
              </div>

              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base lg:text-lg font-bold text-white tracking-tight">
                    आरोग्य उपकेंद्र रेकॉर्ड कीपिंग सिस्टीम
                  </h1>
                </div>
                <p className="text-[10px] sm:text-xs text-emerald-200/90 font-normal">
                  Subcentre Health Record & Surveillance System
                </p>
              </div>
            </div>
          </div>

          {/* Center: Top 3 Main Navigation Tabs (Prominently visible on Desktop & Tablet) */}
          <div className="hidden md:flex items-center gap-1.5 bg-black/25 p-1 rounded-xl border border-white/15 shadow-inner">
            {MAIN_NAV_TABS.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`header-tab-${tab.id}`}
                  type="button"
                  onClick={() => onSelectTab && onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-sm transform scale-102'
                      : 'text-emerald-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.id === 'dashboard' && <LayoutDashboard className="w-4 h-4" />}
                  {tab.id === 'data-entry' && <FileEdit className="w-4 h-4" />}
                  {tab.id === 'reports' && <BarChart3 className="w-4 h-4" />}
                  <span>
                    {tab.id === 'dashboard'
                      ? '🏠 Dashboard'
                      : tab.id === 'data-entry'
                      ? '📝 Data Entry'
                      : '📊 Reports'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Indicators, Bell, Profile, Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* CODE 12: Network Status Indicator (🟢 Online / 🔴 Offline) */}
            <NetworkStatusIndicator />

            {/* CODE 12: Offline Sync Indicator & Manual Sync Button */}
            {user && (
              <SyncIndicator
                currentUser={user}
                onNavigatePage={onNavigatePage}
              />
            )}

            {/* CODE 13A: Notification Bell with real counter & actions */}
            <NotificationBell
              currentUser={user}
              onNavigatePage={onNavigatePage || (() => {})}
            />

            {/* Help / User Manual Button */}
            {user && onNavigatePage && (
              <button
                type="button"
                onClick={() => onNavigatePage('user-manual')}
                title="वापरकर्ता पुस्तिका (User Manual)"
                className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-amber-500 hover:text-emerald-950 text-amber-200 transition-colors cursor-pointer border border-white/10"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}

            {/* User Profile Capsule (Opens My Account Modal) */}
            {user && (
              <button
                type="button"
                id="header-user-profile-btn"
                onClick={() => setModalOpen(true)}
                title="माझे खाते पहा व पासवर्ड बदला"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-2 sm:px-2.5 py-1.5 rounded-lg border border-white/10 transition-colors cursor-pointer text-left"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400 text-emerald-950 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                  {role === 'phc_controller' ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-900" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-emerald-900" />
                  )}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1.5">
                    <span className="truncate max-w-[140px] font-bold">{user.marathiName || user.name}</span>
                  </div>
                  <div className="text-[10px] text-amber-200 font-medium leading-none mt-0.5 truncate max-w-[140px] flex items-center gap-1">
                    <span className="font-semibold text-amber-300">
                      {role === 'phc_controller' ? 'PHC नियंत्रक' : 'उपकेंद्र कर्मचारी'}
                    </span>
                    {user.assignedSubcentre && role !== 'phc_controller' && (
                      <span className="text-white/75 truncate">• {user.assignedSubcentre}</span>
                    )}
                  </div>
                </div>
              </button>
            )}

            {/* Logout Button */}
            <button
              id="header-logout-button"
              type="button"
              onClick={handleLogout}
              title="लॉगआउट करा"
              className="flex items-center gap-1.5 bg-rose-700/80 hover:bg-rose-700 active:bg-rose-800 text-white px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border border-rose-500/50 shadow-xs transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">लॉगआउट</span>
            </button>
          </div>
        </div>
      </header>

      {/* My Account Modal */}
      <MyAccountModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};
