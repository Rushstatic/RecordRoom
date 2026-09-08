import { storage } from './lib/storage';
import DynamicReportPage from './pages/DynamicReportPage';
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppLayout } from './layouts/AppLayout';
import { PageId } from './types';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DailyWorkPage } from './pages/DailyWorkPage';
import { PHCMasterPage } from './pages/PHCMasterPage';
import { SubcentreMasterPage } from './pages/SubcentreMasterPage';
import { VillageMasterPage } from './pages/VillageMasterPage';
import { EmployeeMasterPage } from './pages/EmployeeMasterPage';
import { MalariaRegisterPage } from './pages/MalariaRegisterPage';
import { OfflineDraftsPage } from './pages/OfflineDraftsPage';
import { SendSamplesPage } from './pages/SendSamplesPage';
import { ReportsPage } from './pages/ReportsPage';
import { MalariaCoveragePage } from './pages/MalariaCoveragePage';
import { MalariaTargetsPage } from './pages/MalariaTargetsPage';
import { DataValidationPage } from './pages/DataValidationPage';
import { BackupAuditPage } from './pages/BackupAuditPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { UserManualPage } from './pages/UserManualPage';
import { TBRegisterPage } from './pages/TBRegisterPage';
import { TBReportsPage } from './pages/TBReportsPage';
import { MyAccountModal } from './components/auth/MyAccountModal';
import TemplateBuilderPage from './pages/TemplateBuilderPage';
import TemplateFieldsPage from './pages/TemplateFieldsPage';
import DynamicRegisterPage from './pages/DynamicRegisterPage';
import { ShieldAlert } from 'lucide-react';

const PHC_ONLY_PAGES: PageId[] = [
  'phc-master',
  'subcentre-master',
  'village-master',
  'employee-master',
  'template-builder',
  'template-fields',
  'user-management',
  'backup-audit',
];

const AppContent: React.FC = () => {
  const { user, role, isLoggedIn, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // While checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-400 border-t-transparent mb-4"></div>
        <p className="text-base font-bold text-white tracking-wide">आरोग्य उपकेंद्र रेकॉर्ड कीपिंग सिस्टीम</p>
        <p className="text-xs text-emerald-200/80 mt-1">प्रणाली सुरू होत आहे, कृपया प्रतीक्षा करा...</p>
      </div>
    );
  }

  // If user is not logged in or navigates to login, render Login page
  if (!isLoggedIn || currentPage === 'login') {
    return (
      <LoginPage
        onLoginSuccess={() => {
          setCurrentPage('dashboard');
        }}
      />
    );
  }

  // Route-level Authorization Guard
  if (role !== 'phc_controller' && PHC_ONLY_PAGES.includes(currentPage)) {
    return (
      <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-4 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            या पानावर जाण्याची आपल्याला परवानगी नाही
          </h2>
          <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
            हे पृष्ठ केवळ <strong>PHC नियंत्रक (PHC Controller)</strong> यांच्या अधिकारात राखीव आहे. उपकेंद्र कर्मचाऱ्यांसाठी हे पान उपलब्ध नाही.
          </p>
          <button
            type="button"
            onClick={() => setCurrentPage('dashboard')}
            className="bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
          >
            डॅशबोर्डवर परत जा →
          </button>
        </div>
      </AppLayout>
    );
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'daily-work':
        return <DailyWorkPage onNavigate={setCurrentPage} />;
      case 'phc-master':
        return <PHCMasterPage />;
      case 'subcentre-master':
        return <SubcentreMasterPage />;
      case 'village-master':
        return <VillageMasterPage />;
      case 'employee-master':
        return <EmployeeMasterPage />;
      case 'malaria-register':
        return <MalariaRegisterPage onNavigate={setCurrentPage} />;
      case 'tb-register':
        return <TBRegisterPage onNavigate={setCurrentPage} />;
      case 'tb-reports':
        return <TBReportsPage onNavigate={setCurrentPage} />;
      case 'offline-drafts':
        return <OfflineDraftsPage onNavigate={setCurrentPage} />;
      case 'send-samples':
        return <SendSamplesPage />;
      case 'dynamic-report':
        return <DynamicReportPage onNavigate={setCurrentPage} templateId={selectedTemplateId || storage.getItem('selectedTemplateId') || ''} />;
      case 'reports':
      case 'malaria-reports':
        return <ReportsPage onNavigate={setCurrentPage} />;
      case 'malaria-coverage':
        return <MalariaCoveragePage onNavigate={setCurrentPage} />;
      case 'malaria-targets':
        return <MalariaTargetsPage onNavigate={setCurrentPage} />;
      case 'data-validation':
        return <DataValidationPage onNavigate={setCurrentPage} />;
      case 'backup-audit':
        return <BackupAuditPage />;
      case 'user-management':
        return <UserManagementPage onNavigate={setCurrentPage} />;
      case 'user-manual':
        return <UserManualPage />;
      case 'template-builder':
        return <TemplateBuilderPage onNavigate={setCurrentPage} onSelectTemplate={(id: string) => setSelectedTemplateId(id)} />;
      case 'template-fields':
        return <TemplateFieldsPage onNavigate={setCurrentPage} templateId={selectedTemplateId || storage.getItem('selectedTemplateId') || ''} />;
      case 'dynamic-register':
        return <DynamicRegisterPage onNavigate={setCurrentPage} templateId={selectedTemplateId || storage.getItem('selectedTemplateId') || ''} />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderCurrentPage()}
      {user?.requirePasswordChange && (
        <MyAccountModal isOpen={true} onClose={() => {}} />
      )}
    </AppLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
