import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  CloudOff,
  Flag,
  ShieldAlert,
  ChevronRight,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { PageId, UserProfile } from '../types';
import { malariaService } from '../services/malariaService';
import { offlineDraftService } from '../services/offlineDraftService';
import { targetService } from '../services/targetService';
import { validationService } from '../services/validationService';
import { masterDataService } from '../services/masterDataService';

export interface AppNotification {
  id: string;
  type: 'pending_samples' | 'offline_sync' | 'target_alert' | 'quality_alert';
  titleMarathi: string;
  descriptionMarathi: string;
  targetPage: PageId;
  severity: 'high' | 'medium' | 'info';
  badgeText: string;
  actionText: string;
  count?: number;
}

interface NotificationBellProps {
  currentUser: UserProfile | null;
  onNavigatePage: (page: PageId) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  currentUser,
  onNavigatePage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    if (!currentUser) return;
    setLoading(true);

    try {
      const notifs: AppNotification[] = [];

      // 1. Check Pending Samples for Dispatch
      const samples = await malariaService.getSamples(
        currentUser.role === 'subcentre_employee' && currentUser.employeeId
          ? { employee_id: currentUser.employeeId }
          : undefined
      );

      const pendingSamples = samples.filter((s) => !s.sent_date);
      if (pendingSamples.length > 0) {
        notifs.push({
          id: 'notif-pending-samples',
          type: 'pending_samples',
          titleMarathi: 'नमुने पाठविणे बाकी (Pending Samples)',
          descriptionMarathi: `${pendingSamples.length} गोळा केलेले रक्त नमुने लॅबला पाठविणे प्रलंबित आहेत. कृपया नमुने पाठवा व पावती प्रिंट करा.`,
          targetPage: 'send-samples',
          severity: pendingSamples.length > 5 ? 'high' : 'medium',
          badgeText: `${pendingSamples.length} नमुने`,
          actionText: 'Data Entry → नमुने पाठविणे',
          count: pendingSamples.length,
        });
      }

      // 2. Check Offline Drafts Sync Status
      const syncStats = offlineDraftService.getSyncStats(currentUser);
      if (syncStats.failed > 0) {
        notifs.push({
          id: 'notif-sync-failed',
          type: 'offline_sync',
          titleMarathi: 'सिंक अयशस्वी (Sync Failed)',
          descriptionMarathi: `${syncStats.failed} ऑफलाइन ड्राफ्ट सिंक अयशस्वी झाले आहेत. कृपया डेटा व इंटरनेट तपासून पुन्हा प्रयत्न करा.`,
          targetPage: 'offline-drafts',
          severity: 'high',
          badgeText: `${syncStats.failed} अयशस्वी`,
          actionText: 'Data Entry → Offline Drafts',
          count: syncStats.failed,
        });
      } else if (syncStats.pending > 0) {
        notifs.push({
          id: 'notif-sync-pending',
          type: 'offline_sync',
          titleMarathi: 'प्रलंबित ऑफलाइन ड्राफ्ट (Pending Sync)',
          descriptionMarathi: `${syncStats.pending} नमुने ऑफलाइन ड्राफ्ट म्हणून सुरक्षित आहेत. ऑनलाइन आल्यावर सुरक्षित सिंक करा.`,
          targetPage: 'offline-drafts',
          severity: 'medium',
          badgeText: `${syncStats.pending} प्रलंबित`,
          actionText: 'Data Entry → Offline Drafts',
          count: syncStats.pending,
        });
      }

      // 3. Check Target Progress
      try {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const targets = await targetService.getTargets({
          target_year: currentYear,
          target_month: currentMonth,
          phc_id: currentUser.phcId,
        });

        const monthlyTarget = targets.find((t) => t.target_type === 'Monthly');
        if (monthlyTarget) {
          const thisMonthSamples = samples.filter((s) => {
            const d = new Date(s.sample_collection_date);
            return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
          }).length;

          const pct = Math.round((thisMonthSamples / (monthlyTarget.target_value || 1)) * 100);
          if (pct < 75) {
            notifs.push({
              id: 'notif-target-progress',
              type: 'target_alert',
              titleMarathi: 'मलेरिया लक्ष्य प्रगती (Target Progress)',
              descriptionMarathi: `चालू महिन्यात लक्ष्य ${monthlyTarget.target_value} पैकी ${thisMonthSamples} नमुने (${pct}%) संकलित झाले आहेत. गती वाढविणे आवश्यक आहे.`,
              targetPage: 'malaria-targets',
              severity: pct < 50 ? 'high' : 'medium',
              badgeText: `${pct}% पूर्ण`,
              actionText: 'Reports → लक्ष्य व प्रगती',
              count: monthlyTarget.target_value - thisMonthSamples,
            });
          }
        }
      } catch (err) {
        // Safe target check fallback
      }

      // 4. Check Data Quality Alert
      try {
        const phcs = await masterDataService.getPhcs();
        const subcentres = await masterDataService.getSubcentres();
        const villages = await masterDataService.getVillages();
        const employees = await masterDataService.getEmployees();

        const vResult = validationService.validateAll({
          phcs,
          subcentres,
          villages,
          employees,
          samples,
        });

        if (vResult.issues.length > 0) {
          const highIssues = vResult.issues.filter((i) => i.severity === 'त्रुटी' || i.severityEn === 'error').length;
          notifs.push({
            id: 'notif-data-quality',
            type: 'quality_alert',
            titleMarathi: 'डेटा गुणवत्ता तपासणी (Data Quality Alert)',
            descriptionMarathi: `सिस्टीममध्ये ${vResult.issues.length} डेटा त्रुटी/सूचना आढळल्या आहेत (गुणवत्ता स्कोर: ${vResult.qualityScore}%). दुरुस्ती आवश्यक.`,
            targetPage: 'data-validation',
            severity: highIssues > 0 ? 'high' : 'medium',
            badgeText: `${vResult.qualityScore}% Score`,
            actionText: 'Reports → डेटा गुणवत्ता',
            count: vResult.issues.length,
          });
        }
      } catch (err) {
        // Safe validation check fallback
      }

      setNotifications(notifs);
    } catch (e) {
      console.warn('Error loading notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    const handleSyncChange = () => loadNotifications();
    window.addEventListener('arogya-sync-status-changed', handleSyncChange);
    window.addEventListener('arogya-sample-saved', handleSyncChange);

    return () => {
      window.removeEventListener('arogya-sync-status-changed', handleSyncChange);
      window.removeEventListener('arogya-sample-saved', handleSyncChange);
    };
  }, [currentUser]);

  const handleNotificationClick = (page: PageId) => {
    setIsOpen(false);
    onNavigatePage(page);
  };

  const highSeverityCount = notifications.filter((n) => n.severity === 'high').length;

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        id="header-notification-bell-btn"
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        title="महत्त्वाच्या सूचना (Notifications)"
        className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
          isOpen
            ? 'bg-white/20 text-white shadow-inner'
            : 'bg-white/10 hover:bg-white/20 text-emerald-100 hover:text-white'
        }`}
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />

        {/* Counter Badge */}
        {notifications.length > 0 && (
          <span
            className={`absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold flex items-center justify-center min-w-[18px] shadow-sm ${
              highSeverityCount > 0
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-amber-400 text-emerald-950'
            }`}
          >
            {notifications.length}
          </span>
        )}
      </button>

      {/* Notifications Dropdown / Modal */}
      {isOpen && (
        <>
          {/* Backdrop for closing */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            id="notifications-dropdown-menu"
            className="absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mt-2 w-80 sm:w-96 max-w-[92vw] bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Dropdown Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-300" />
                <h3 className="text-sm font-bold">महत्त्वाच्या सूचना (Notifications)</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-amber-400 text-emerald-950 font-bold px-2 py-0.5 rounded-full">
                  {notifications.length} सक्रिय
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md hover:bg-white/20 text-white text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-1">
              {loading && notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 animate-spin text-emerald-700" />
                  <span>सूचना तपासत आहे...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-bold text-slate-700">सध्या कोणतीही प्रलंबित सूचना नाही</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">सर्व नोंदी आणि सिंक अद्ययावत आहेत.</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  let Icon = Bell;
                  let iconBg = 'bg-blue-100 text-blue-800';

                  if (notif.type === 'pending_samples') {
                    Icon = Send;
                    iconBg = 'bg-amber-100 text-amber-800';
                  } else if (notif.type === 'offline_sync') {
                    Icon = CloudOff;
                    iconBg = notif.severity === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800';
                  } else if (notif.type === 'target_alert') {
                    Icon = Flag;
                    iconBg = 'bg-indigo-100 text-indigo-800';
                  } else if (notif.type === 'quality_alert') {
                    Icon = ShieldAlert;
                    iconBg = 'bg-teal-100 text-teal-800';
                  }

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.targetPage)}
                      className="p-3 hover:bg-slate-50 transition-colors cursor-pointer group flex items-start gap-3"
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${iconBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors truncate">
                            {notif.titleMarathi}
                          </h4>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                              notif.severity === 'high'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {notif.badgeText}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                          {notif.descriptionMarathi}
                        </p>

                        <div className="mt-2 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-emerald-700 group-hover:text-emerald-900 flex items-center gap-0.5">
                            <span>{notif.actionText}</span>
                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Dropdown Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>सार्वजनिक आरोग्य विभाग</span>
              <button
                type="button"
                onClick={loadNotifications}
                className="text-emerald-800 hover:text-emerald-950 font-bold hover:underline"
              >
                ताजे करा (Refresh)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
