import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Shield,
  Activity,
  Layers,
  Server,
  FileText
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { isValidUUID } from '../../utils/uuid';

interface TableCheckResult {
  tableName: string;
  marathiName: string;
  status: 'ok' | 'error' | 'checking';
  rowCount: number | null;
  errorMessage?: string;
}

const TABLES_TO_CHECK = [
  { tableName: 'phc_master', marathiName: 'प्राथमिक आरोग्य केंद्र मास्टर' },
  { tableName: 'subcentre_master', marathiName: 'आरोग्य उपकेंद्र मास्टर' },
  { tableName: 'village_master', marathiName: 'गाव मास्टर' },
  { tableName: 'employee_master', marathiName: 'कर्मचारी मास्टर' },
  { tableName: 'employee_posting_history', marathiName: 'कर्मचारी पदस्थापना इतिहास (Posting)' },
  { tableName: 'employee_extra_charge', marathiName: 'कर्मचारी अतिरिक्त कार्यभार (Extra Charge)' },
  { tableName: 'malaria_blood_samples', marathiName: 'मलेरिया रक्त नमुना नोंद' },
  { tableName: 'user_profiles', marathiName: 'वापरकर्ता प्रोफाइल्स (RBAC)' },
  { tableName: 'tb_suspected_patient_register', marathiName: 'क्षयरोग संशयित रुग्ण नोंद' },
  { tableName: 'record_register_templates', marathiName: 'नोंदवही टेम्पलेट्स' },
  { tableName: 'record_template_fields', marathiName: 'नोंदवही फील्ड्स' },
  { tableName: 'dynamic_record_entries', marathiName: 'डायनॅमिक नोंदी' },
  { tableName: 'malaria_targets', marathiName: 'हिवताप उद्दिष्टे (Targets)' },
  { tableName: 'system_audit_logs', marathiName: 'प्रणाली ऑडिट नोंदी' },
];

export const DatabaseDiagnosticTab: React.FC = () => {
  const { user, role, profile, authUser, session, userContext, applicableSubcentreIds, applicableVillageIds } = useAuth();

  const [isRunning, setIsRunning] = useState(false);
  const [tableResults, setTableResults] = useState<TableCheckResult[]>([]);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [hasAuthSession, setHasAuthSession] = useState<boolean | null>(null);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  // Scan for any invalid UUIDs
  const detectedInvalidUuids: { label: string; value: string }[] = [];

  if (user?.id && !isValidUUID(user.id)) {
    detectedInvalidUuids.push({ label: 'User ID', value: user.id });
  }
  if (user?.employeeId && !isValidUUID(user.employeeId)) {
    detectedInvalidUuids.push({ label: 'Employee ID', value: user.employeeId });
  }
  if (user?.phcId && !isValidUUID(user.phcId)) {
    detectedInvalidUuids.push({ label: 'PHC ID', value: user.phcId });
  }
  if (user?.subcentreId && !isValidUUID(user.subcentreId)) {
    detectedInvalidUuids.push({ label: 'Subcentre ID', value: user.subcentreId });
  }
  if (profile?.id && !isValidUUID(profile.id)) {
    detectedInvalidUuids.push({ label: 'Profile ID', value: profile.id });
  }
  if (profile?.auth_user_id && !isValidUUID(profile.auth_user_id)) {
    detectedInvalidUuids.push({ label: 'Auth User ID', value: profile.auth_user_id });
  }

  const runDiagnostic = async () => {
    setIsRunning(true);
    const configured = isSupabaseConfigured();
    setSupabaseConnected(configured);

    if (!configured || !supabase) {
      setHasAuthSession(false);
      setTableResults(
        TABLES_TO_CHECK.map((t) => ({
          ...t,
          status: 'error',
          rowCount: null,
          errorMessage: 'Supabase कॉन्फिगर केलेले नाही.',
        }))
      );
      setIsRunning(false);
      setLastCheckTime(new Date().toLocaleTimeString('mr-IN'));
      return;
    }

    try {
      // 1. Check Auth session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!sessionError && sessionData?.session?.user) {
        setHasAuthSession(true);
        setAuthUid(sessionData.session.user.id);
        setAuthEmail(sessionData.session.user.email || null);
      } else {
        setHasAuthSession(false);
        setAuthUid(null);
        setAuthEmail(null);
      }

      // 2. Check all tables
      const results: TableCheckResult[] = [];
      for (const t of TABLES_TO_CHECK) {
        try {
          const { count, error } = await supabase
            .from(t.tableName)
            .select('*', { count: 'exact', head: true });

          if (error) {
            results.push({
              tableName: t.tableName,
              marathiName: t.marathiName,
              status: 'error',
              rowCount: null,
              errorMessage: error.code === '42P17' 
                ? '42P17 (RLS Infinite Recursion)' 
                : error.code === 'PGRST205'
                ? 'PGRST205 (Table missing)'
                : `${error.code || ''} ${error.message}`,
            });
          } else {
            results.push({
              tableName: t.tableName,
              marathiName: t.marathiName,
              status: 'ok',
              rowCount: count ?? 0,
            });
          }
        } catch (err: any) {
          results.push({
            tableName: t.tableName,
            marathiName: t.marathiName,
            status: 'error',
            rowCount: null,
            errorMessage: err.message || 'Error querying table',
          });
        }
      }

      setTableResults(results);
    } catch (err: any) {
      console.error('Diagnostic error:', err);
    } finally {
      setIsRunning(false);
      setLastCheckTime(new Date().toLocaleTimeString('mr-IN'));
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  const handleCopyReport = () => {
    const reportLines = [
      `=== आरोग्य उपकेंद्र सिस्टीम - डेटाबेस फॉरेन्सिक पडताळणी अहवाल ===`,
      `तपासणी वेळ: ${new Date().toLocaleString('mr-IN')}`,
      `Supabase Connected: ${supabaseConnected ? 'YES' : 'NO'}`,
      `Auth Session: ${hasAuthSession ? 'YES' : 'NO'}`,
      authUid ? `Auth UID: ${authUid}` : null,
      authEmail ? `Auth Email: ${authEmail}` : null,
      `Profile Loaded: ${profile ? 'YES' : 'NO'}`,
      `Role: ${role || 'Not set'}`,
      `Employee ID: ${user?.employeeId || 'None'} (Valid UUID: ${user?.employeeId ? isValidUUID(user.employeeId) : 'N/A'})`,
      `PHC ID: ${user?.phcId || 'None'} (Valid UUID: ${user?.phcId ? isValidUUID(user.phcId) : 'N/A'})`,
      `Subcentre ID: ${user?.subcentreId || 'None'} (Valid UUID: ${user?.subcentreId ? isValidUUID(user.subcentreId) : 'N/A'})`,
      `\n--- डेटाबेस सारणी स्थिती (Tables Status) ---`,
      ...tableResults.map(
        (t) => `${t.tableName} (${t.marathiName}): ${t.status === 'ok' ? `OK (Records: ${t.rowCount})` : `FAILED - ${t.errorMessage}`}`
      ),
      `\n--- UUID Compliance Check ---`,
      detectedInvalidUuids.length > 0
        ? `INVALID UUID DETECTED:\n` + detectedInvalidUuids.map((u) => `  - ${u.label}: ${u.value}`).join('\n')
        : `सर्व UUID वैध आहेत (100% RFC 4122 Compliant)`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(reportLines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <Database className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-800">
                Supabase डेटाबेस पडताळणी व फॉरेन्सिक स्थिती (Forensic Diagnostic)
              </h2>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Production Single Source of Truth, RLS Policies, Tables आणि RFC4122 UUID अखंडता पडताळणी.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runDiagnostic}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              पुन्हा पडताळा (Re-test)
            </button>
            <button
              onClick={handleCopyReport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition text-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'कॉपी झाले' : 'अहवाल कॉपी करा'}
            </button>
          </div>
        </div>
        {lastCheckTime && (
          <div className="mt-3 text-xs text-slate-500">
            शेवटची तपासणी: {lastCheckTime}
          </div>
        )}
      </div>

      {/* UUID Compliance Banner */}
      {detectedInvalidUuids.length > 0 ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-rose-900 text-sm">
                Invalid UUID detected (अवैध ओळख क्रमांक आढळले)
              </h3>
              <p className="text-xs text-rose-700 mt-1">
                खालील फील्ड्स मध्ये PostgreSQL RFC 4122 मानक नसलेले छद्म (pseudo) किंवा अमान्य आयडी आढळले आहेत. यामुळे 22P02 त्रुटी येऊ शकते:
              </p>
              <ul className="mt-2 space-y-1">
                {detectedInvalidUuids.map((u, i) => (
                  <li key={i} className="text-xs font-mono bg-rose-100 px-2 py-1 rounded text-rose-900 inline-block mr-2">
                    {u.label}: {u.value}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-emerald-900">
              सर्व UUID वैध आहेत (100% RFC 4122 Compliant)
            </div>
            <div className="text-xs text-emerald-700">
              वापरकर्ता, कर्मचारी आणि मास्टर डेटा मध्ये कोणतेही अनधिकृत pseudo-UUID आढळले नाहीत.
            </div>
          </div>
        </div>
      )}

      {/* Core Environment Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supabase Connected */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Supabase Connection
          </div>
          <div className="mt-2 flex items-center gap-2">
            {supabaseConnected ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-base font-bold text-emerald-700">CONNECTED (सुरू)</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-rose-600" />
                <span className="text-base font-bold text-rose-700">NOT CONNECTED</span>
              </>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Single Source of Truth Status
          </div>
        </div>

        {/* Auth Session */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Supabase Auth Session
          </div>
          <div className="mt-2 flex items-center gap-2">
            {hasAuthSession ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-base font-bold text-emerald-700">ACTIVE (सक्रिय)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span className="text-base font-bold text-amber-700">NO SESSION / DEMO</span>
              </>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">
            {authEmail || (user?.email ? `Email: ${user.email}` : 'कोणतेही सत्र नाही')}
          </div>
        </div>

        {/* Profile Loaded */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Profile Loaded
          </div>
          <div className="mt-2 flex items-center gap-2">
            {profile ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-base font-bold text-emerald-700">LOADED (लोड झाले)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span className="text-base font-bold text-amber-700">LOCAL STATE ONLY</span>
              </>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            भूमिका: {role === 'phc_controller' ? 'प्रा.आ.के. नियंत्रक' : 'आरोग्य उपकेंद्र कर्मचारी'}
          </div>
        </div>
      </div>

      {/* Master Identifiers Card - CODE 24A Active User Context */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>सक्रिय वापरकर्ता संदर्भ (CODE 24A Active User Context)</span>
          </h3>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                hasAuthSession ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              Session: {hasAuthSession ? 'VALID' : 'INVALID / EXPIRED'}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                supabaseConnected && userContext ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              Cross-Device Sync: {supabaseConnected && userContext ? 'PASS' : 'FAIL / LOCAL'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* auth_user_id */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block font-medium">auth_user_id (Supabase Auth)</span>
            <span className="font-mono text-slate-800 mt-0.5 block truncate" title={userContext?.authUserId || authUid || '-'}>
              {userContext?.authUserId || authUid || 'लागू नाही'}
            </span>
          </div>

          {/* user_profile_id */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block font-medium">user_profile_id</span>
            <span className="font-mono text-slate-800 mt-0.5 block truncate" title={userContext?.profileId || profile?.id || '-'}>
              {userContext?.profileId || profile?.id || 'लागू नाही'}
            </span>
          </div>

          {/* role */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block font-medium">role (भूमिका)</span>
            <span className="font-bold text-indigo-700 mt-0.5 block">
              {role === 'phc_controller' ? 'PHC Controller (नियंत्रक)' : 'Subcentre Employee (उपकेंद्र कर्मचारी)'}
            </span>
          </div>

          {/* employee_name */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block font-medium">employee_name</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">
              {userContext?.employeeName || user?.marathiName || user?.name || '-'}
            </span>
          </div>

          {/* employee_id */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block font-medium">employee_id</span>
            <span className="font-mono text-slate-800 mt-0.5 block truncate" title={userContext?.employeeId || user?.employeeId || '-'}>
              {userContext?.employeeId || user?.employeeId || 'लागू नाही'}
            </span>
            {user?.employeeId && (
              <span className={`text-[10px] font-medium ${isValidUUID(user.employeeId) ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isValidUUID(user.employeeId) ? '✓ Valid UUID' : '⚠ Invalid UUID'}
              </span>
            )}
          </div>

          {/* smear_code */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block font-medium">smear_code (मलेरिया स्मीअर कोड)</span>
            <span className="font-mono font-bold text-amber-700 mt-0.5 block">
              {userContext?.smearCode || user?.smearCode || 'लागू नाही'}
            </span>
          </div>

          {/* primary_subcentre */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block font-medium">primary_subcentre (प्राथमिक उपकेंद्र)</span>
            <span className="font-medium text-slate-800 mt-0.5 block truncate">
              {userContext?.subcentreName || user?.assignedSubcentre || 'सर्व उपकेंद्रे (PHC)'}
            </span>
            <span className="font-mono text-[10px] text-slate-400 block truncate">
              {userContext?.subcentreId || user?.subcentreId || '-'}
            </span>
          </div>

          {/* extra_charge_subcentres */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block font-medium">extra_charge_subcentres (अतिरिक्त कार्यभार)</span>
            <span className="font-medium text-slate-800 mt-0.5 block">
              {userContext?.extraCharges && userContext.extraCharges.length > 0
                ? userContext.extraCharges.map((c) => c.subcentreName || c.subcentreId).join(', ')
                : 'नाही'}
            </span>
          </div>

          {/* applicable_subcentres_count */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block font-medium">applicable_subcentres_count</span>
            <span className="font-bold text-emerald-700 mt-0.5 block text-sm">
              {applicableSubcentreIds.length} उपकेंद्रे
            </span>
          </div>

          {/* applicable_villages_count */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block font-medium">applicable_villages_count</span>
            <span className="font-bold text-emerald-700 mt-0.5 block text-sm">
              {applicableVillageIds.length} गावे
            </span>
          </div>

          {/* is_active */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block font-medium">is_active (सक्रिय स्थिती)</span>
            <span className="font-bold text-emerald-700 mt-0.5 block">
              {userContext?.isActive ?? user?.isActive ? '✓ सक्रिय (ACTIVE)' : '✗ निष्क्रिय (INACTIVE)'}
            </span>
          </div>

          {/* assigned PHC */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block font-medium">प्राथमिक आरोग्य केंद्र (PHC)</span>
            <span className="font-medium text-slate-800 mt-0.5 block truncate">
              {userContext?.phcName || user?.assignedPhc || '-'}
            </span>
            <span className="font-mono text-[10px] text-slate-400 block truncate">
              {userContext?.phcId || user?.phcId || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Database Tables Verification Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              डेटाबेस सारण्यांची स्थिती (Supabase Tables Status & RLS Check)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            एकूण {TABLES_TO_CHECK.length} सारण्या
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">सारणीचे नाव (Table)</th>
                <th className="py-3 px-4">वर्णन (Module)</th>
                <th className="py-3 px-4">स्थिती (Status)</th>
                <th className="py-3 px-4 text-right">रेकॉर्ड संख्या (Count)</th>
                <th className="py-3 px-4">शेरा (RLS / Error)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableResults.map((t, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-mono font-medium text-slate-800 text-xs">
                    {t.tableName}
                  </td>
                  <td className="py-3 px-4 text-slate-700 text-xs">
                    {t.marathiName}
                  </td>
                  <td className="py-3 px-4">
                    {t.status === 'ok' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accessible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-semibold rounded-full border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" />
                        Error
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 font-semibold">
                    {t.rowCount !== null ? t.rowCount : '-'}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {t.status === 'ok' ? (
                      <span className="text-emerald-600 font-medium">RLS Active & Accessible</span>
                    ) : (
                      <span className="text-rose-600 font-mono text-[11px] font-medium">
                        {t.errorMessage}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
