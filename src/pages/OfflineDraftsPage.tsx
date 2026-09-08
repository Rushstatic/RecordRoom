import React, { useState, useEffect, useMemo } from 'react';
import {
  CloudOff,
  Cloud,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  Edit2,
  Wifi,
  WifiOff,
  ShieldCheck,
  Smartphone,
  Hash,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';
import { OfflineMalariaDraft, OfflineSyncStatus, UserProfile, PageId, GenderType } from '../types';
import { offlineDraftService } from '../services/offlineDraftService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAuth } from '../hooks/useAuth';
import { formatIndianDate } from '../services/malariaService';

interface OfflineDraftsPageProps {
  onNavigate?: (page: PageId, draftToEdit?: OfflineMalariaDraft) => void;
}

export const OfflineDraftsPage: React.FC<OfflineDraftsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();

  const [drafts, setDrafts] = useState<OfflineMalariaDraft[]>([]);
  const [stats, setStats] = useState(() => offlineDraftService.getSyncStats(user));
  const [loading, setLoading] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'synced' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Delete modal
  const [deletingDraft, setDeletingDraft] = useState<OfflineMalariaDraft | null>(null);

  // Edit Modal
  const [editingDraft, setEditingDraft] = useState<OfflineMalariaDraft | null>(null);
  const [editPatientName, setEditPatientName] = useState('');
  const [editHouseNo, setEditHouseNo] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState<GenderType>('पुरुष');
  const [editDate, setEditDate] = useState('');

  const loadDrafts = () => {
    const list = offlineDraftService.getDrafts(user);
    setDrafts(list);
    setStats(offlineDraftService.getSyncStats(user));
  };

  useEffect(() => {
    loadDrafts();

    const handleSyncChange = () => {
      loadDrafts();
    };

    window.addEventListener('arogya-sync-status-changed', handleSyncChange);
    return () => {
      window.removeEventListener('arogya-sync-status-changed', handleSyncChange);
    };
  }, [user]);

  // Filtered drafts
  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      // Status filter
      if (statusFilter === 'pending' && !(d.sync_status === 'DRAFT' || d.sync_status === 'FAILED')) {
        return false;
      }
      if (statusFilter === 'synced' && d.sync_status !== 'SYNCED') {
        return false;
      }
      if (statusFilter === 'failed' && d.sync_status !== 'FAILED') {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = d.patient_name?.toLowerCase().includes(q);
        const matchesVillage = d.village_name?.toLowerCase().includes(q);
        const matchesHouse = d.house_number?.toLowerCase().includes(q);
        return matchesName || matchesVillage || matchesHouse;
      }

      return true;
    });
  }, [drafts, statusFilter, searchTerm]);

  // Sync single draft
  const handleSyncSingle = async (draft: OfflineMalariaDraft) => {
    if (!isOnline) {
      setFeedback({
        type: 'error',
        message: 'सध्या इंटरनेट कनेक्शन उपलब्ध नाही.',
      });
      return;
    }
    if (!user) return;

    setSyncingId(draft.local_id);
    setFeedback(null);
    try {
      const res = await offlineDraftService.syncDraft(draft.local_id, user);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.message,
        });
      }
      loadDrafts();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'सिंक त्रुटी.',
      });
    } finally {
      setSyncingId(null);
    }
  };

  // Sync all drafts
  const handleSyncAll = async () => {
    if (!isOnline) {
      setFeedback({
        type: 'error',
        message: 'सध्या इंटरनेट कनेक्शन उपलब्ध नाही. कृपया ऑनलाइन झाल्यावर पुन्हा प्रयत्न करा.',
      });
      return;
    }
    if (!user) return;

    setSyncingAll(true);
    setFeedback(null);
    try {
      const res = await offlineDraftService.syncAllDrafts(user);
      if (res.synced > 0) {
        setFeedback({
          type: 'success',
          message: `यशस्वी: ${res.synced} ऑफलाइन नोंदी मुख्य डेटाबेसमध्ये जतन झाल्या.`,
        });
      } else if (res.failed > 0) {
        setFeedback({
          type: 'error',
          message: `सूचना: ${res.failed} नोंदी सिंक होऊ शकल्या नाहीत.`,
        });
      } else {
        setFeedback({
          type: 'info',
          message: 'सिंक करण्यासाठी कोणतेही प्रलंबित ड्राफ्ट उपलब्ध नाहीत.',
        });
      }
      loadDrafts();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'सिंक करताना त्रुटी आली.',
      });
    } finally {
      setSyncingAll(false);
    }
  };

  // Confirm delete
  const handleDeleteDraft = () => {
    if (!deletingDraft) return;
    offlineDraftService.deleteDraft(deletingDraft.local_id);
    setDeletingDraft(null);
    setFeedback({
      type: 'info',
      message: 'ऑफलाइन ड्राफ्ट सुरक्षितपणे काढून टाकण्यात आला.',
    });
    loadDrafts();
  };

  // Open edit modal
  const openEditModal = (draft: OfflineMalariaDraft) => {
    setEditingDraft(draft);
    setEditPatientName(draft.patient_name || '');
    setEditHouseNo(draft.house_number || '');
    setEditAge(String(draft.age || ''));
    setEditGender(draft.gender || 'पुरुष');
    setEditDate(draft.sample_collection_date || '');
  };

  // Save edited draft
  const handleSaveEditedDraft = () => {
    if (!editingDraft) return;
    if (!editPatientName.trim()) {
      alert('रुग्णाचे नाव आवश्यक आहे.');
      return;
    }
    const ageNum = Number(editAge);
    if (!ageNum || isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      alert('वय १ ते १२० दरम्यान असणे आवश्यक आहे.');
      return;
    }
    if (!editDate) {
      alert('नमुना दिनांक आवश्यक आहे.');
      return;
    }

    offlineDraftService.updateDraftStatus(editingDraft.local_id, {
      patient_name: editPatientName.trim(),
      house_number: editHouseNo.trim(),
      age: ageNum,
      gender: editGender,
      sample_collection_date: editDate,
      sync_status: 'DRAFT', // reset to draft for re-validation
      last_error: null,
    });

    setEditingDraft(null);
    setFeedback({
      type: 'success',
      message: 'ड्राफ्टमधील बदल यशस्वीरीत्या जतन झाले.',
    });
    loadDrafts();
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <CloudOff className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                ऑफलाइन ड्राफ्ट्स (Offline Drafts)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                इंटरनेट उपलब्ध नसताना घेतलेले मलेरिया रक्त नमुने व सुरक्षित सिंक व्यवस्थापन
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigate && onNavigate('malaria-register')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold text-xs sm:text-sm hover:bg-emerald-100 transition cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>नवीन ऑफलाइन नोंद</span>
          </button>

          <button
            onClick={handleSyncAll}
            disabled={syncingAll || !isOnline || stats.pending === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm text-white shadow-xs transition cursor-pointer min-h-[44px] ${
              syncingAll || !isOnline || stats.pending === 0
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-800 active:scale-98'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${syncingAll ? 'animate-spin' : ''}`} />
            <span>{syncingAll ? 'सिंक सुरू आहे...' : 'आता Sync करा'}</span>
          </button>
        </div>
      </div>

      {/* Network Alert Banner */}
      <div
        className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm shadow-xs ${
          isOnline
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-emerald-700 shrink-0" />
          ) : (
            <WifiOff className="w-5 h-5 text-amber-700 shrink-0" />
          )}
          <div>
            <span className="font-bold">
              {isOnline ? '🟢 इंटरनेट कनेक्शन उपलब्ध आहे.' : '🔴 इंटरनेट कनेक्शन उपलब्ध नाही (ऑफलाइन मोड).'}
            </span>{' '}
            <span className="text-slate-600">
              {isOnline
                ? 'नवीन ऑफलाइन ड्राफ्ट्स आपोआप सिंक केले जातील किंवा तुम्ही वर दिलेल्या बटणाने त्वरित सिंक करू शकता.'
                : 'तुम्ही निर्धास्तपणे रक्त नमुने नोंदवू शकता. त्या स्थानिक पातळीवर सुरक्षित राहतील व ऑनलाइन झाल्यावर सिंक होतील.'}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-500 shrink-0">
          शेवटचे सिंक:{' '}
          {stats.lastSyncTime
            ? new Date(stats.lastSyncTime).toLocaleDateString('mr-IN') +
              ' ' +
              new Date(stats.lastSyncTime).toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' })
            : 'अद्याप नाही'}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : feedback.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />}
            {feedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />}
            {feedback.type === 'info' && <Info className="w-4 h-4 text-blue-700 shrink-0" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Drafts */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>एकूण ड्राफ्ट्स (Total)</span>
            <Cloud className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">{stats.total}</div>
          <p className="mt-1 text-[11px] text-slate-500">स्थानिक मेमरीमध्ये साठवलेले</p>
        </div>

        {/* Pending Sync */}
        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>प्रलंबित सिंक (Pending)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-amber-600">{stats.pending}</div>
          <p className="mt-1 text-[11px] text-amber-700">डेटाबेसमध्ये पाठवणे बाकी</p>
        </div>

        {/* Successfully Synced */}
        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>सिंक झालेले (Synced)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-700">{stats.synced}</div>
          <p className="mt-1 text-[11px] text-emerald-700">अंतिम नमुना क्र. प्राप्त झाले</p>
        </div>

        {/* Failed */}
        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold">
            <span>अयशस्वी (Failed)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-rose-600">{stats.failed}</div>
          <p className="mt-1 text-[11px] text-rose-700">दुरुस्ती किंवा पुन्हा प्रयत्न आवश्यक</p>
        </div>
      </div>

      {/* Duplicate & Safety Guarantee Card */}
      <div className="p-4 rounded-2xl bg-linear-to-r from-teal-50 to-emerald-50 border border-teal-200 text-teal-950 text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">सुरक्षित ऑफलाइन सिंक व डुप्लिकेट संरक्षण (Duplicate Protection & Safety):</p>
          <p className="text-slate-600 leading-relaxed">
            प्रत्येक ड्राफ्टला युनिक क्लायंट UUID (Idempotency Key) नियुक्त केला आहे. सिंक करताना नेटवर्कमध्ये व्यत्यय आला किंवा पुन्हा सिंक केले तरी एकच नोंद दोनदा निर्माण होत नाही. तसेच ऑफलाइन मोडमध्ये नमुना क्रमांक मॅन्युअली दिला जात नाही — डेटाबेस सिक्वेन्सद्वारेच अंतिम नंबर सुरक्षितपणे दिला जातो.
          </p>
        </div>
      </div>

      {/* Filters & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[38px] ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            सर्व ({drafts.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[38px] ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            प्रलंबित ({stats.pending})
          </button>
          <button
            onClick={() => setStatusFilter('synced')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[38px] ${
              statusFilter === 'synced'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            सिंक झालेले ({stats.synced})
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[38px] ${
              statusFilter === 'failed'
                ? 'bg-rose-700 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            अयशस्वी ({stats.failed})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="रुग्णाचे नाव किंवा गाव शोधा..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 transition min-h-[38px]"
          />
        </div>
      </div>

      {/* Drafts List / Cards */}
      {filteredDrafts.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white rounded-2xl border border-slate-200">
          <CloudOff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">कोणतेही ऑफलाइन ड्राफ्ट्स आढळले नाहीत</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {searchTerm
              ? 'शोध परिणामांशी जुळणारे कोणतेही ड्राफ्ट्स नाहीत. कृपया शोध शब्द तपासा.'
              : 'सर्व रक्त नमुन्यांच्या नोंदी मुख्य डेटाबेसमध्ये सुरक्षित आहेत. नवीन नमुना नोंदवण्यासाठी खालील बटण दाबा.'}
          </p>
          <button
            onClick={() => onNavigate && onNavigate('malaria-register')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>नवीन नमुना नोंद करा</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Table View (hidden on small screens) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-4">स्थिती (Status)</th>
                  <th className="py-3 px-4">रुग्णाचे नाव व लिंग/वय</th>
                  <th className="py-3 px-4">गाव व घर क्र.</th>
                  <th className="py-3 px-4">नमुना दिनांक</th>
                  <th className="py-3 px-4">नमुना क्रमांक (Sample No)</th>
                  <th className="py-3 px-4">नोंद वेळ</th>
                  <th className="py-3 px-4 text-right">कृती (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredDrafts.map((draft) => {
                  const isSyncing = syncingId === draft.local_id || draft.sync_status === 'SYNCING';
                  return (
                    <tr key={draft.local_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            draft.sync_status === 'SYNCED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : draft.sync_status === 'FAILED'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isSyncing
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {draft.sync_status === 'SYNCED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {draft.sync_status === 'FAILED' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          {draft.sync_status === 'DRAFT' && <Clock className="w-3 h-3 text-amber-600" />}
                          {isSyncing && <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />}
                          <span>
                            {draft.sync_status === 'SYNCED'
                              ? 'सिंक झाले'
                              : draft.sync_status === 'FAILED'
                              ? 'अयशस्वी'
                              : isSyncing
                              ? 'सिंक होत आहे...'
                              : 'Draft'}
                          </span>
                        </span>
                        {draft.last_error && (
                          <p className="text-[10px] text-rose-600 font-medium mt-1 max-w-xs truncate" title={draft.last_error}>
                            {draft.last_error}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{draft.patient_name}</div>
                        <div className="text-slate-500 text-[11px]">
                          {draft.gender} • वय: {draft.age} वर्षे
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{draft.village_name || 'गाव'}</div>
                        <div className="text-slate-500 text-[11px]">घर क्र: {draft.house_number || '-'}</div>
                      </td>

                      <td className="py-3 px-4 font-medium">
                        {formatIndianDate(draft.sample_collection_date)}
                      </td>

                      <td className="py-3 px-4">
                        {draft.sync_status === 'SYNCED' && draft.synced_sample_number ? (
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {String(draft.synced_sample_number).padStart(4, '0')} ({draft.synced_smear_code || draft.malaria_smear_code})
                          </span>
                        ) : (
                          <span className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            प्रलंबित (Pending)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(draft.created_at).toLocaleDateString('mr-IN')}{' '}
                        {new Date(draft.created_at).toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {draft.sync_status !== 'SYNCED' && (
                            <button
                              onClick={() => handleSyncSingle(draft)}
                              disabled={isSyncing || !isOnline}
                              className={`p-1.5 rounded-lg border font-semibold transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
                                !isOnline
                                  ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title="सिंक करा"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            </button>
                          )}

                          {draft.sync_status !== 'SYNCED' && (
                            <button
                              onClick={() => openEditModal(draft)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                              title="दुरुस्ती करा"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => setDeletingDraft(draft)}
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="काढून टाका"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Cards (optimized for Android touch, min 44px targets) */}
          <div className="md:hidden space-y-3">
            {filteredDrafts.map((draft) => {
              const isSyncing = syncingId === draft.local_id || draft.sync_status === 'SYNCING';
              return (
                <div
                  key={draft.local_id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{draft.patient_name}</h4>
                      <p className="text-xs text-slate-500">
                        {draft.gender} • {draft.age} वर्षे • घर क्र: {draft.house_number || '-'}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                        draft.sync_status === 'SYNCED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : draft.sync_status === 'FAILED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : isSyncing
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {draft.sync_status === 'SYNCED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {draft.sync_status === 'FAILED' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                      {draft.sync_status === 'DRAFT' && <Clock className="w-3 h-3 text-amber-600" />}
                      {isSyncing && <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />}
                      <span>
                        {draft.sync_status === 'SYNCED'
                          ? 'सिंक झाले'
                          : draft.sync_status === 'FAILED'
                          ? 'अयशस्वी'
                          : isSyncing
                          ? 'सिंक सुरू...'
                          : 'Draft'}
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-500">गाव:</span>{' '}
                      <span className="font-medium text-slate-800">{draft.village_name || 'गाव'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">नमुना दिनांक:</span>{' '}
                      <span className="font-medium text-slate-800">
                        {formatIndianDate(draft.sample_collection_date)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500">नमुना क्र.:</span>{' '}
                      {draft.sync_status === 'SYNCED' && draft.synced_sample_number ? (
                        <span className="font-bold text-emerald-700">
                          {String(draft.synced_sample_number).padStart(4, '0')} ({draft.synced_smear_code})
                        </span>
                      ) : (
                        <span className="font-bold text-amber-700">प्रलंबित (Pending)</span>
                      )}
                    </div>
                  </div>

                  {draft.last_error && (
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                      {draft.last_error}
                    </div>
                  )}

                  {/* Touch Friendly Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    {draft.sync_status !== 'SYNCED' && (
                      <button
                        onClick={() => handleSyncSingle(draft)}
                        disabled={isSyncing || !isOnline}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition min-h-[44px] cursor-pointer ${
                          !isOnline
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-emerald-700 text-white hover:bg-emerald-800'
                        }`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'सिंक सुरू...' : 'आता Sync करा'}</span>
                      </button>
                    )}

                    {draft.sync_status !== 'SYNCED' && (
                      <button
                        onClick={() => openEditModal(draft)}
                        className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition min-h-[44px] cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>दुरुस्ती</span>
                      </button>
                    )}

                    <button
                      onClick={() => setDeletingDraft(draft)}
                      className="py-2.5 px-3 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition min-h-[44px] cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>हटवा</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 text-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ड्राफ्ट हटवायचा आहे का?</h3>
                <p className="text-xs text-slate-500">स्थानिक मेमरीमधून ही नोंद कायमची काढली जाईल.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p><strong>रुग्णाचे नाव:</strong> {deletingDraft.patient_name}</p>
              <p><strong>गाव:</strong> {deletingDraft.village_name || 'गाव'}</p>
              <p><strong>नमुना दिनांक:</strong> {formatIndianDate(deletingDraft.sample_collection_date)}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingDraft(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition min-h-[44px]"
              >
                रद्द करा
              </button>
              <button
                onClick={handleDeleteDraft}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition min-h-[44px]"
              >
                होय, हटवा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Modal */}
      {editingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-700" />
                ऑफलाइन ड्राफ्ट दुरुस्ती
              </h3>
              <button onClick={() => setEditingDraft(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">रुग्णाचे नाव *</label>
                <input
                  type="text"
                  value={editPatientName}
                  onChange={(e) => setEditPatientName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">घर क्रमांक</label>
                  <input
                    type="text"
                    value={editHouseNo}
                    onChange={(e) => setEditHouseNo(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">वय (वर्षे) *</label>
                  <input
                    type="number"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600"
                    min="1"
                    max="120"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">लिंग *</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as GenderType)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                  >
                    <option value="पुरुष">पुरुष</option>
                    <option value="स्त्री">स्त्री</option>
                    <option value="इतर">इतर</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">नमुना दिनांक *</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingDraft(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition min-h-[44px]"
              >
                रद्द करा
              </button>
              <button
                onClick={handleSaveEditedDraft}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition min-h-[44px]"
              >
                बदल जतन करा
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
