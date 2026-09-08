import { storage } from '../lib/storage';
import React, { useState, useEffect } from 'react';
import { MalariaReportsPage } from './MalariaReportsPage';
import { PageId, RecordRegisterTemplate } from '../types';
import { templateService } from '../services/templateService';
import { FileSpreadsheet, BarChart3, Database } from 'lucide-react';

interface ReportsPageProps {
  onNavigate?: (page: PageId) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate }) => {
  const [dynamicTemplates, setDynamicTemplates] = useState<RecordRegisterTemplate[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const tpls = await templateService.getActiveTemplates();
    setDynamicTemplates(tpls.filter(t => t.register_code !== 'MALARIA' && t.register_code !== 'TB'));
  };

  return (
    <div className="space-y-6">
      {dynamicTemplates.length > 0 && (
        <div className="p-4 sm:p-6 pb-2 max-w-7xl mx-auto">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
              <Database className="w-5 h-5 text-indigo-500" /> डायनॅमिक रेजिस्टर्स (Reports)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dynamicTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    storage.setItem('selectedTemplateId', t.id);
                    if (onNavigate) onNavigate('dynamic-report');
                  }}
                  className="group relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-5 rounded-2xl border border-indigo-100 text-left hover:shadow-md transition-all duration-300 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg mb-1">{t.register_name}</h4>
                    <p className="text-sm font-medium text-indigo-600">{t.program_name}</p>
                  </div>
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <MalariaReportsPage onNavigate={onNavigate} />
    </div>
  );
};

export default ReportsPage;
