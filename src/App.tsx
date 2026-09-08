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
import { MyAccountModal } from './components/auth/MyAccountModal';

const AppContent: React.FC = () => {
  const { user, isLoggedIn } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

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
      case 'offline-drafts':
        return <OfflineDraftsPage onNavigate={setCurrentPage} />;
      case 'send-samples':
        return <SendSamplesPage />;
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
