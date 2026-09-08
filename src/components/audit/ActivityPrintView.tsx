import React from 'react';
import { ArrowLeft, Printer, ShieldCheck } from 'lucide-react';
import { SystemAuditLog, UserProfile } from '../../types';

interface ActivityPrintViewProps {
  logs: SystemAuditLog[];
  currentUser: UserProfile;
  dateFilterLabel: string;
  onBack: () => void;
}

export const ActivityPrintView: React.FC<ActivityPrintViewProps> = ({
  logs,
  currentUser,
  dateFilterLabel,
  onBack,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const printTime = new Date().toLocaleString('mr-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="bg-slate-100 min-h-screen py-6 px-4 print:p-0 print:bg-white text-slate-900">
      {/* Top action bar - Hidden when printing */}
      <div className="max-w-5xl mx-auto mb-4 flex items-center justify-between print:hidden bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>मागे जा (Back to Dashboard)</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>A4 प्रिंट करा (Print Report)</span>
        </button>
      </div>

      {/* Printable Sheet (A4 Portrait optimized) */}
      <div className="max-w-5xl mx-auto bg-white p-8 rounded-xl border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-4 print:max-w-none print:w-full">
        {/* Header */}
        <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
          <div className="text-xs uppercase tracking-widest text-slate-600 font-semibold mb-0.5">
            महाराष्ट्र शासन • सार्वजनिक आरोग्य विभाग
          </div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">
            आरोग्य उपकेंद्र रेकॉर्ड कीपिंग सिस्टीम
          </h1>
          <h2 className="text-sm font-semibold text-emerald-800 mt-1">
            प्रणाली Activity व Audit Trail अहवाल
          </h2>
        </div>

        {/* Meta Info Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 border border-slate-300 p-3 rounded-lg text-xs mb-4">
          <div>
            <span className="text-slate-500 block text-[11px]">प्राथमिक आरोग्य केंद्र (PHC):</span>
            <span className="font-bold text-slate-900">
              {currentUser.assignedPhc || 'प्रा.आ.के. वडगाव'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">आरोग्य उपकेंद्र:</span>
            <span className="font-bold text-slate-900">
              {currentUser.assignedSubcentre || 'सर्व उपकेंद्रे'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">निवडलेला कालावधी:</span>
            <span className="font-bold text-slate-900">{dateFilterLabel}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">अहवाल निर्मिती वेळ:</span>
            <span className="font-semibold text-slate-800">{printTime}</span>
          </div>
        </div>

        {/* Count Summary */}
        <div className="flex items-center justify-between text-xs text-slate-600 mb-2 font-medium">
          <span>एकूण नोंदी: <strong className="text-slate-900">{logs.length}</strong></span>
          <span>काढणारा: <strong className="text-slate-900">{currentUser.marathiName} ({currentUser.roleTitleMarathi})</strong></span>
        </div>

        {/* Activity Table */}
        <div className="border border-slate-300 rounded-lg overflow-hidden mb-8">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                <th className="p-2 border-r border-slate-300 w-10 text-center">अ.क्र.</th>
                <th className="p-2 border-r border-slate-300 w-24">दिनांक व वेळ</th>
                <th className="p-2 border-r border-slate-300 w-36">वापरकर्ता</th>
                <th className="p-2 border-r border-slate-300 w-24">भूमिका</th>
                <th className="p-2 border-r border-slate-300 w-28">Module</th>
                <th className="p-2 border-r border-slate-300 w-20 text-center">Action</th>
                <th className="p-2">तपशील (Record / Activity)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    या कालावधीत कोणतीही Activity नोंद आढळली नाही.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => {
                  const dateObj = new Date(log.created_at);
                  const dateStr = dateObj.toLocaleDateString('mr-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });
                  const timeStr = dateObj.toLocaleTimeString('mr-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 text-center font-medium text-slate-600">
                        {index + 1}
                      </td>
                      <td className="p-2 border-r border-slate-200 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{dateStr}</div>
                        <div className="text-[10px] text-slate-500">{timeStr}</div>
                      </td>
                      <td className="p-2 border-r border-slate-200 font-medium text-slate-900">
                        {log.user_name || 'सिस्टीम'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-[11px] text-slate-700">
                        {log.role === 'phc_controller' ? 'PHC नियंत्रक' : 'उपकेंद्र कर्मचारी'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-[11px] font-medium text-slate-800">
                        {log.module}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center">
                        <span className="font-bold text-[10px] px-1.5 py-0.5 rounded border border-slate-300 bg-slate-50">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-2 text-[11px] text-slate-800 leading-snug">
                        {log.record_description || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Official Signatures Footer */}
        <div className="pt-8 border-t-2 border-slate-800 grid grid-cols-2 gap-8 text-xs text-slate-800 mt-12">
          <div className="space-y-6">
            <div>
              <p className="font-bold">तपासणी करणाऱ्याची स्वाक्षरी (Staff/Auditor):</p>
              <div className="h-12 border-b border-dashed border-slate-400 mt-2"></div>
              <p className="text-[11px] text-slate-500 mt-1">नाव व पद: ____________________________</p>
            </div>
          </div>

          <div className="space-y-6 text-right">
            <div>
              <p className="font-bold">वैद्यकीय अधिकाऱ्याची स्वाक्षरी (Medical Officer):</p>
              <div className="h-12 border-b border-dashed border-slate-400 mt-2"></div>
              <p className="text-[11px] text-slate-500 mt-1">दिनांक व शिक्का: ____________________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
