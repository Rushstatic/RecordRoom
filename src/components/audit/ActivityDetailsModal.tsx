import React from 'react';
import { X, Clock, User, Shield, Layers, FileText, CheckCircle2, History } from 'lucide-react';
import { SystemAuditLog } from '../../types';

interface ActivityDetailsModalProps {
  log: SystemAuditLog | null;
  onClose: () => void;
}

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LOGIN: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
  LOGOUT: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  CREATE: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  UPDATE: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  DELETE: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  ACTIVATE: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-300' },
  DEACTIVATE: { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-300' },
  SEND_SAMPLES: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-300' },
  PRINT: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-300' },
  EXPORT: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-300' },
  BACKUP: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300' },
  RESTORE: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-800', border: 'border-fuchsia-300' },
};

export const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({ log, onClose }) => {
  if (!log) return null;

  const dateObj = new Date(log.created_at);
  const formattedDate = dateObj.toLocaleDateString('mr-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('mr-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const colors = ACTION_COLORS[log.action] || {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
  };

  // Extract all changed keys between old_values and new_values
  const oldVal = log.old_values || {};
  const newVal = log.new_values || {};
  const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]));

  return (
    <div
      id="activity-details-modal-overlay"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="activity-details-modal"
        className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                प्रणाली Activity तपशील (Audit Trail Details)
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {log.id}</p>
            </div>
          </div>
          <button
            id="close-activity-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Top Badges & Time */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Action (कृती)</span>
              <span
                className={`inline-block mt-0.5 font-bold px-2 py-0.5 rounded-md border text-[11px] ${colors.bg} ${colors.text} ${colors.border}`}
              >
                {log.action}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Module</span>
              <span className="font-semibold text-slate-800 block mt-0.5">{log.module}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">दिनांक (Date)</span>
              <span className="font-semibold text-slate-800 block mt-0.5">{formattedDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">वेळ (Time)</span>
              <span className="font-semibold text-slate-800 block mt-0.5">{formattedTime}</span>
            </div>
          </div>

          {/* User & Role Details */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-emerald-700" />
              <span>वापरकर्ता माहिती (User Information)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500">वापरकर्त्याचे नाव:</span>
                <p className="font-bold text-slate-900 mt-0.5">{log.user_name || 'सिस्टीम (System)'}</p>
              </div>
              <div>
                <span className="text-slate-500">प्रणालीतील भूमिका (Role):</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {log.role === 'phc_controller' ? 'प्रा.आ.के. नियंत्रक / वैद्यकीय अधिकारी' : 'उपकेंद्र आरोग्य कर्मचारी'}
                </p>
              </div>
              {log.user_id && (
                <div className="font-mono text-[11px] text-slate-500">User ID: {log.user_id}</div>
              )}
            </div>
          </div>

          {/* Record Description */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold border-b border-slate-100 pb-1.5">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>नोंद तपशील (Record Description)</span>
            </div>
            <p className="text-sm font-semibold text-slate-900 leading-relaxed pt-1">
              {log.record_description || 'कोणताही अतिरिक्त तपशील उपलब्ध नाही.'}
            </p>
            {log.record_id && (
              <p className="text-[11px] font-mono text-slate-400">Record ID: {log.record_id}</p>
            )}
          </div>

          {/* Before & After Data Comparison */}
          {allKeys.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  <span>डेटा बदल तुलना (Before & After Change Audit)</span>
                </span>
                <span className="text-[11px] font-normal text-slate-500">
                  {allKeys.length} फील्ड्स नोंदवले
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="p-2.5 w-1/3">फील्ड (Field)</th>
                      <th className="p-2.5 w-1/3 text-rose-800 bg-rose-50/70 border-l border-r border-slate-200">
                        जुना डेटा (Old Value)
                      </th>
                      <th className="p-2.5 w-1/3 text-emerald-800 bg-emerald-50/70">
                        नवीन डेटा (New Value)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allKeys.map((key) => {
                      const oldValStr = oldVal[key] !== undefined ? JSON.stringify(oldVal[key], null, 1) : '-';
                      const newValStr = newVal[key] !== undefined ? JSON.stringify(newVal[key], null, 1) : '-';
                      const isChanged = oldValStr !== newValStr;

                      return (
                        <tr key={key} className={isChanged ? 'bg-amber-50/30' : 'bg-white'}>
                          <td className="p-2.5 font-mono text-[11px] font-semibold text-slate-800 break-all">
                            {key}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-rose-700 bg-rose-50/30 border-l border-r border-slate-200 break-all">
                            {oldValStr}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-emerald-700 bg-emerald-50/30 break-all">
                            {newValStr}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
              या कृतीसाठी कोणतेही फील्ड बदल नोंदवलेले नाहीत (केवळ स्थिती/ऑपरेशनल लॉग).
            </div>
          )}

          {/* Technical Metadata (User Agent) */}
          {log.user_agent && (
            <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-200 font-mono break-all">
              <span className="font-semibold text-slate-600">User-Agent: </span>
              {log.user_agent}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <button
            id="close-activity-details-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            बंद करा (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
