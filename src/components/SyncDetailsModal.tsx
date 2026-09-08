import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, Clock, AlertTriangle, X, Cloud, ArrowRight } from 'lucide-react';
import { SyncStats, UserProfile, OfflineMalariaDraft, PageId } from '../types';
import { offlineDraftService } from '../services/offlineDraftService';

interface SyncDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: SyncStats;
  drafts: OfflineMalariaDraft[];
  currentUser: UserProfile;
  isOnline: boolean;
  onNavigatePage?: (page: PageId) => void;
  onSyncTriggered?: () => void;
}

export const SyncDetailsModal: React.FC<SyncDetailsModalProps> = ({
  isOpen,
  onClose,
  stats,
  drafts,
  currentUser,
  isOnline,
  onNavigatePage,
  onSyncTriggered,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSyncAll = async () => {
    if (!isOnline) {
      setSyncMessage('सध्या इंटरनेट कनेक्शन उपलब्ध नाही. कृपया ऑनलाइन झाल्यावर पुन्हा प्रयत्न करा.');
      return;
    }

    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await offlineDraftService.syncAllDrafts(currentUser);
      if (result.synced > 0) {
        setSyncMessage(`यशस्वी: ${result.synced} ड्राफ्ट मुख्य डेटाबेसमध्ये सिंक झाले.`);
      } else if (result.failed > 0) {
        setSyncMessage(`सूचना: ${result.failed} ड्राफ्ट सिंक अयशस्वी झाले.`);
      } else {
        setSyncMessage('सिंक करण्यासाठी कोणतेही प्रलंबित ड्राफ्ट्स नाहीत.');
      }
      if (onSyncTriggered) onSyncTriggered();
    } catch (err: any) {
      setSyncMessage(err?.message || 'सिंक दरम्यान त्रुटी उद्भवली.');
    } finally {
      setSyncing(false);
    }
  };

  const pendingDrafts = drafts.filter((d) => d.sync_status === 'DRAFT' || d.sync_status === 'FAILED');

  const formatTime = (iso?: string | null) => {
    if (!iso) return 'अद्याप सिंक नाही';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('mr-IN') + ' ' + d.toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base font-bold">ऑफलाइन डेटा सिंक्रोनाइझेशन</h3>
              <p className="text-xs text-emerald-100">डेटाबेस व स्थानिक ड्राफ्ट्स स्थिती</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Network Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              isOnline
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-600'}`} />
              <span className="font-semibold">
                {isOnline ? '🟢 इंटरनेट कनेक्शन चालू आहे' : '🔴 सध्या इंटरनेट बंद (ऑफलाइन) आहे'}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              शेवटचे सिंक: {formatTime(stats.lastSyncTime)}
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-center gap-1 text-slate-500 text-xs font-medium mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>प्रलंबित (Pending)</span>
              </div>
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-center gap-1 text-slate-500 text-xs font-medium mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>सिंक झाले (Synced)</span>
              </div>
              <div className="text-2xl font-bold text-emerald-700">{stats.synced}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-center gap-1 text-slate-500 text-xs font-medium mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>अयशस्वी (Failed)</span>
              </div>
              <div className="text-2xl font-bold text-rose-600">{stats.failed}</div>
            </div>
          </div>

          {/* Sync Message Feedback */}
          {syncMessage && (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 text-xs font-medium">
              {syncMessage}
            </div>
          )}

          {/* Pending Drafts List Preview */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                प्रलंबित ड्राफ्ट यादी ({pendingDrafts.length})
              </h4>
              {onNavigatePage && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigatePage('offline-drafts');
                  }}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  सर्व पहा <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {pendingDrafts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                सर्व ड्राफ्ट मुख्य डेटाबेसशी सिंक झालेले आहेत. कोणतेही प्रलंबित रेकॉर्ड नाही.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pendingDrafts.slice(0, 4).map((d) => (
                  <div
                    key={d.local_id}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{d.patient_name}</div>
                      <div className="text-slate-500">
                        {d.village_name || 'गाव'} | घर क्र: {d.house_number || '-'} | नमुना क्र: <span className="text-amber-600 font-medium">प्रलंबित</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        d.sync_status === 'FAILED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {d.sync_status === 'FAILED' ? 'अयशस्वी' : 'Draft'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {onNavigatePage && (
            <button
              onClick={() => {
                onClose();
                onNavigatePage('offline-drafts');
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              ड्राफ्ट व्यवस्थापन पृष्ठ
            </button>
          )}

          <button
            onClick={handleSyncAll}
            disabled={syncing || !isOnline || stats.pending === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer ${
              syncing || !isOnline || stats.pending === 0
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-800 active:scale-98'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'सिंक होत आहे...' : 'आता Sync करा'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
