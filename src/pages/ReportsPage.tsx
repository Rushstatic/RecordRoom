import React from 'react';
import { MalariaReportsPage } from './MalariaReportsPage';
import { PageId } from '../types';

interface ReportsPageProps {
  onNavigate?: (page: PageId) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate }) => {
  return <MalariaReportsPage onNavigate={onNavigate} />;
};

export default ReportsPage;
