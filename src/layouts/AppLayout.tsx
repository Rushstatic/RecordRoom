import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { SubNavBar } from '../components/SubNavBar';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { PWAInstallBanner } from '../components/PWAInstallBanner';
import { MyAccountModal } from '../components/auth/MyAccountModal';
import { PageId } from '../types';
import { MainNavTabId, getParentTabForPage, MAIN_NAV_TABS } from '../types/navigation';
import { useAuth } from '../hooks/useAuth';
import { offlineDraftService } from '../services/offlineDraftService';
import { malariaService } from '../services/malariaService';
import { Building2, Shield, HeartPulse } from 'lucide-react';

interface AppLayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPage,
  onNavigate,
  children,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const { user, role } = useAuth();

  // Track the active primary tab: 'dashboard' | 'data-entry' | 'reports'
  const [currentTab, setCurrentTab] = useState<MainNavTabId>(() =>
    getParentTabForPage(currentPage)
  );

  // Synchronize main tab whenever currentPage changes
  useEffect(() => {
    const parent = getParentTabForPage(currentPage, currentTab);
    setCurrentTab(parent);
  }, [currentPage]);

  // Track pending drafts count & pending samples count for badges
  const [pendingDraftsCount, setPendingDraftsCount] = useState(() =>
    offlineDraftService.getSyncStats(user).pending
  );
  const [pendingSamplesCount, setPendingSamplesCount] = useState(0);

  const loadCounts = async () => {
    try {
      setPendingDraftsCount(offlineDraftService.getSyncStats(user).pending);
      const samples = await malariaService.getSamples(
        role === 'subcentre_employee' && user?.employeeId
          ? { employee_id: user.employeeId }
          : undefined
      );
      setPendingSamplesCount(samples.filter((s) => !s.sent_date).length);
    } catch (e) {
      // Safe fallback
    }
  };

  useEffect(() => {
    loadCounts();
    const handleSyncChange = () => loadCounts();
    window.addEventListener('arogya-sync-status-changed', handleSyncChange);
    window.addEventListener('arogya-sample-saved', handleSyncChange);

    return () => {
      window.removeEventListener('arogya-sync-status-changed', handleSyncChange);
      window.removeEventListener('arogya-sample-saved', handleSyncChange);
    };
  }, [user, role]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebarMobile = () => {
    setIsSidebarOpen(false);
  };

  const handleSelectTab = (tabId: MainNavTabId) => {
    setCurrentTab(tabId);
    if (tabId === 'dashboard') {
      onNavigate('dashboard');
    } else if (tabId === 'data-entry') {
      // If currently not on a data entry page, default to daily-work
      const parent = getParentTabForPage(currentPage);
      if (parent !== 'data-entry') {
        onNavigate('daily-work');
      }
    } else if (tabId === 'reports') {
      // If currently not on a reports page, default to reports
      const parent = getParentTabForPage(currentPage);
      if (parent !== 'reports') {
        onNavigate('reports');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-sans pb-16 md:pb-0">
      {/* PWA Install Banner */}
      <PWAInstallBanner />

      {/* Top Header with 3 Main Tabs & Notification Bell */}
      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
        onNavigateLogin={() => onNavigate('login')}
        onNavigatePage={onNavigate}
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isAccountModalOpen={isAccountModalOpen}
        setIsAccountModalOpen={setIsAccountModalOpen}
      />

      {/* Secondary Sub-navigation Bar for Data Entry and Reports */}
      <SubNavBar
        currentTab={currentTab}
        currentPage={currentPage}
        onNavigate={onNavigate}
        pendingDraftsCount={pendingDraftsCount}
        pendingSamplesCount={pendingSamplesCount}
      />

      {/* Main Content Layout with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Desktop & Mobile Drawer) */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={onNavigate}
          isOpen={isSidebarOpen}
          onCloseMobile={closeSidebarMobile}
          onOpenAccountModal={() => setIsAccountModalOpen(true)}
          pendingSamplesCount={pendingSamplesCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto min-w-0 bg-slate-50/70">
          {/* Subtle Institutional Breadcrumb & Context Sub-banner */}
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
              <span className="font-semibold text-emerald-800">
                {currentTab === 'dashboard' && '🏠 Dashboard'}
                {currentTab === 'data-entry' && '📝 Data Entry'}
                {currentTab === 'reports' && '📊 Reports'}
              </span>
              <span className="text-slate-400">/</span>
              <span className="capitalize font-medium text-slate-800 text-xs">
                {currentPage === 'dashboard' && 'डॅशबोर्ड व सांख्यिकी सारांश (Summary & KPI)'}
                {currentPage === 'daily-work' && '📅 आजचे काम व Quick Action (Daily Field Work)'}
                {currentPage === 'malaria-register' && 'मलेरिया रक्त नमुना नोंदवही (Blood Sample Register)'}
                {currentPage === 'tb-register' && 'राष्ट्रीय क्षयरोग नियंत्रण कार्यक्रम — संशयित रुग्ण नमुना नोंदवही (TB Register)'}
                {currentPage === 'tb-reports' && 'क्षयरोग (TB) अहवाल व सांख्यिकी (TB Reports)'}
                {currentPage === 'send-samples' && 'नमुने पाठविणे व पावती प्रिंट (Send Samples to PHC)'}
                {currentPage === 'malaria-targets' &&
                  (currentTab === 'data-entry'
                    ? 'मलेरिया उद्दिष्टे / लक्ष्य व्यवस्थापन (Target Setting)'
                    : 'मलेरिया उद्दिष्ट व प्रगती अहवाल (Target vs Actual Report)')}
                {currentPage === 'offline-drafts' && 'ऑफलाइन ड्राफ्ट्स व सिंक (Offline Drafts & Safe Sync)'}
                {currentPage === 'phc-master' && 'प्राथमिक आरोग्य केंद्र मास्टर (PHC Master)'}
                {currentPage === 'subcentre-master' && 'आरोग्य उपकेंद्र मास्टर (Subcentre Master)'}
                {currentPage === 'village-master' && 'गाव मास्टर (Village Master)'}
                {currentPage === 'employee-master' && 'कर्मचारी मास्टर (Employee Master)'}
                {currentPage === 'user-management' && 'वापरकर्ता व्यवस्थापन व प्रवेश नियंत्रण (User Management)'}
                {currentPage === 'reports' && 'मलेरिया अहवाल (M1 व M2 अहवाल)'}
                {currentPage === 'malaria-reports' && 'मलेरिया अहवाल (M1 व M2 अहवाल)'}
                {currentPage === 'malaria-coverage' && 'मलेरिया Coverage व Performance Dashboard'}
                {currentPage === 'data-validation' && 'आरोग्य डेटा गुणवत्ता व तपासणी (Data Quality & Validation)'}
                {currentPage === 'backup-audit' && 'डेटा बॅकअप व सिस्टीम Activity (Backup & Audit Log)'}
                {currentPage === 'user-manual' && 'वापरकर्ता पुस्तिका (User Manual)'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>{role === 'phc_controller' ? 'PHC नियंत्रक' : 'उपकेंद्र कर्मचारी'}</span>
              </span>
            </div>
          </div>

          {/* Page Dynamic Content */}
          <div className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto">
            {children}
          </div>

          {/* Institutional Footer */}
          <footer className="mt-auto bg-white border-t border-slate-200 py-3.5 px-6 text-xs text-slate-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                <span>आरोग्य उपकेंद्र रेकॉर्ड कीपिंग सिस्टीम • महाराष्ट्र शासन</span>
              </div>
              <div className="text-[11px] text-slate-400">
                राष्ट्रीय कीटकजन्य रोग नियंत्रण कार्यक्रम (NVBDCP) व प्राथमिक आरोग्य सेवा
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Android Mobile Bottom Navigation Bar (Dashboard | Data Entry | Reports) */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        pendingDraftsCount={pendingDraftsCount}
        pendingSamplesCount={pendingSamplesCount}
      />

      {/* My Account Modal */}
      <MyAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </div>
  );
};
