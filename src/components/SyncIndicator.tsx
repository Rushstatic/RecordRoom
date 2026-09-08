import React, { useState, useEffect } from 'react';
import { RefreshCw, Cloud, AlertCircle } from 'lucide-react';
import { SyncStats, UserProfile, OfflineMalariaDraft, PageId } from '../types';
import { offlineDraftService } from '../services/offlineDraftService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { SyncDetailsModal } from './SyncDetailsModal';

interface SyncIndicatorProps {
  currentUser: UserProfile;
  onNavigatePage?: (page: PageId) => void;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  currentUser,
  onNavigatePage,
}) => {
  const { isOnline } = useNetworkStatus();
  const [stats, setStats] = useState<SyncStats>(() => offlineDraftService.getSyncStats(currentUser));
  const [drafts, setDrafts] = useState<OfflineMalariaDraft[]>(() => offlineDraftService.getDrafts(currentUser));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quickSyncing, setQuickSyncing] = useState(false);

  const refreshData = () => {
    setStats(offlineDraftService.getSyncStats(currentUser));
    setDrafts(offlineDraftService.getDrafts(currentUser));
  };

  useEffect(() => {
    refreshData();

    // Listen to custom sync events
    const handleSyncChange = () => {
      refreshData();
    };

    window.addEventListener('arogya-sync-status-changed', handleSyncChange);

    // Auto-sync trigger when network comes back online
    const handleOnline = async () => {
      if (stats.pending > 0 && currentUser) {
        try {
          await offlineDraftService.syncAllDrafts(currentUser);
          refreshData();
        } catch (err) {
          console.warn('Auto-sync error on reconnect:', err);
        }
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('arogya-sync-status-changed', handleSyncChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [currentUser, stats.pending]);

  const handleQuickSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOnline) {
      setIsModalOpen(true);
      return;
    }

    setQuickSyncing(true);
    try {
      await offlineDraftService.syncAllDrafts(currentUser);
      refreshData();
    } catch (err: any) {
      console.warn('Quick sync error:', err);
      setIsModalOpen(true);
    } finally {
      setQuickSyncing(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Sync Pill with Pending Count */}
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition shadow-xs cursor-pointer ${
            stats.pending > 0
              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
          title="सिंक तपशील पहा"
        >
          <Cloud className={`w-3.5 h-3.5 ${stats.pending > 0 ? 'text-amber-600' : 'text-slate-500'}`} />
          <span className="hidden sm:inline">सिंक:</span>
          <span className="text-emerald-700 font-bold">{stats.synced}</span>
          {stats.pending > 0 && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-amber-600 font-bold flex items-center gap-0.5">
                {stats.pending}
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
              </span>
            </>
          )}
          {stats.failed > 0 && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-rose-600 font-bold">{stats.failed}</span>
            </>
          )}
        </button>

        {/* Quick Sync Button */}
        {stats.pending > 0 && (
          <button
            onClick={handleQuickSync}
            disabled={quickSyncing || !isOnline}
            className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs transition cursor-pointer ${
              !isOnline
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : quickSyncing
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-emerald-700 text-white hover:bg-emerald-800'
            }`}
            title="आता सर्व प्रलंबित ड्राफ्ट्स सिंक करा"
          >
            <RefreshCw className={`w-3 h-3 ${quickSyncing ? 'animate-spin' : ''}`} />
            <span>{quickSyncing ? 'सिंक...' : 'आता Sync करा'}</span>
          </button>
        )}
      </div>

      <SyncDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        stats={stats}
        drafts={drafts}
        currentUser={currentUser}
        isOnline={isOnline}
        onNavigatePage={onNavigatePage}
        onSyncTriggered={refreshData}
      />
    </>
  );
};
