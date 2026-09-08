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

const AppContent: React.FC = () => {
  const { user, isLoggedIn } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

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
        return <DynamicReportPage onNavigate={setCurrentPage} templateId={selectedTemplateId || localStorage.getItem('selectedTemplateId') || ''} />;
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
        return <TemplateFieldsPage onNavigate={setCurrentPage} templateId={selectedTemplateId || localStorage.getItem('selectedTemplateId') || ''} />;
      case 'dynamic-register':
        return <DynamicRegisterPage onNavigate={setCurrentPage} templateId={selectedTemplateId || localStorage.getItem('selectedTemplateId') || ''} />;
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
