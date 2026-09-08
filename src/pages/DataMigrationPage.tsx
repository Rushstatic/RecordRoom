import React, { useState, useEffect } from 'react';
import {
  ServerCrash,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HardDriveDownload,
  ShieldCheck,
  ChevronRight,
  List,
  Check,
  Download,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { migrationService, MigrationStats, MigrationRecord, MigrationModule } from '../services/migrationService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { auditService } from '../services/auditService';

export const DataMigrationPage: React.FC = () => {
  const { role, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<MigrationModule, MigrationStats> | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'preview' | 'running' | 'completed' | 'failed' | 'verification_pending'>('idle');
  const [previewAccepted, setPreviewAccepted] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentModule, setCurrentModule] = useState<string>('');
  const [migrationResults, setMigrationResults] = useState<any[]>([]);
  const [verificationPassed, setVerificationPassed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Allow only PHC Controller
  if (role !== 'phc_controller') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">प्रवेश नाकारला (Access Denied)</h2>
        <p className="text-slate-600 mt-2">हे मॉड्यूल फक्त प्रा.आ.के. नियंत्रक (PHC Controller) साठी उपलब्ध आहे.</p>
      </div>
    );
  }

  const loadStats = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await migrationService.analyzeLocalStorage();
      setStats(result.stats);
      let total = 0;
      Object.values(result.stats).forEach((s) => (total += s.localRecords));
      setTotalRecords(total);
      setMigrationStatus('preview');
      setPreviewAccepted(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error analyzing local storage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleStartMigration = async () => {
    if (!previewAccepted) {
      setErrorMsg('कृपया आधी Migration Summary तपासा व अनुमती द्या.');
      return;
    }
    
    setLoading(true);
    setErrorMsg(null);
    
    try {
      // 1. Safety Backup
      const backupResult = await auditService.createBackup(user);
      if (!backupResult || !backupResult.payload) {
        throw new Error('सुरक्षित backup तयार करता आला नाही. Migration सुरू करण्यात आलेले नाही.');
      }

      // 2. Start Migration
      setMigrationStatus('running');
      setCurrentProgress(0);

      const onProgress = (moduleName: string, progress: number) => {
        setCurrentModule(moduleName);
        setCurrentProgress(progress);
      };

      const results = await migrationService.runMigration(onProgress);
      setMigrationResults(results);
      
      const failedCount = results.reduce((acc, curr) => acc + curr.failed, 0);
      if (failedCount > 0) {
        setMigrationStatus('failed');
      } else {
        setMigrationStatus('verification_pending');
      }
    } catch (err: any) {
      console.error('Migration failed:', err);
      setErrorMsg(err.message || 'Migration failed. Check console.');
      setMigrationStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const isValid = await migrationService.verifyMigration();
      if (isValid) {
        setVerificationPassed(true);
        setMigrationStatus('completed');
      } else {
        setErrorMsg('Verification Failed. Local आणि Supabase records जुळत नाहीत.');
        setVerificationPassed(false);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error during verification');
      setVerificationPassed(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm('तुम्हाला नक्की LocalStorage cleanup व Archive करायचे आहे का?')) return;
    
    setLoading(true);
    try {
      await migrationService.archiveLocalStorageKeys();
      alert('LocalStorage Cleanup आणि Archive यशस्वीरित्या पूर्ण झाले.');
      loadStats();
    } catch (err: any) {
      console.error(err);
      alert('Cleanup Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportFailedCsv = () => {
    // Generate CSV from migration results
    const headers = ['Module', 'Failed Records', 'Error Types'];
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";
    
    migrationResults.forEach(res => {
      if (res.failed > 0) {
        csvContent += `${res.module},${res.failed},${res.errors.join(';')}\n`;
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `migration_errors_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const modules: MigrationModule[] = [
    'phc_master', 'subcentre_master', 'village_master', 'employee_master',
    'user_profiles', 'register_templates', 'template_fields', 'malaria_samples',
    'tb_samples', 'malaria_targets', 'dynamic_records', 'audit_logs'
  ];

  const getModuleLabel = (mod: MigrationModule) => {
    const map: Record<MigrationModule, string> = {
      phc_master: 'प्रा.आ.के. मास्टर',
      subcentre_master: 'उपकेंद्र मास्टर',
      village_master: 'गाव मास्टर',
      employee_master: 'कर्मचारी मास्टर',
      user_profiles: 'User Profiles',
      register_templates: 'Templates',
      template_fields: 'Template Fields',
      malaria_samples: 'मलेरिया नमुने',
      tb_samples: 'क्षयरोग नमुने',
      malaria_targets: 'मलेरिया उद्दिष्टे',
      dynamic_records: 'Dynamic Records',
      audit_logs: 'Audit Logs'
    };
    return map[mod] || mod;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl">
              <ServerCrash className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Production Data Migration & Cleanup
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Local Storage मधील जुना डेटा सुरक्षितपणे Supabase मध्ये हलवणे (Sync) आणि Archive करणे.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={loadStats}
          disabled={loading || migrationStatus === 'running'}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading && migrationStatus === 'idle' ? 'animate-spin' : ''}`} />
          पुन्हा तपासा (Scan LocalStorage)
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-semibold text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Migration Progress Overlay */}
      {migrationStatus === 'running' && (
        <div className="bg-white p-6 rounded-xl border border-indigo-200 shadow-md">
          <h3 className="font-bold text-lg text-indigo-900 mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Migration सुरू आहे... कृपया थांबा.
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-semibold mb-1">
                <span className="text-slate-700">सध्याचे मॉड्यूल: {getModuleLabel(currentModule as MigrationModule)}</span>
                <span className="text-indigo-700">{Math.round(currentProgress)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${currentProgress}%` }}
                ></div>
              </div>
            </div>
            <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-3 rounded-lg border border-rose-100">
              ⚠ सूचना: ही प्रक्रिया पूर्ण होईपर्यंत हे पान रिफ्रेश करू नका किंवा बंद करू नका.
            </p>
          </div>
        </div>
      )}

      {/* Post Migration Verification */}
      {migrationStatus === 'verification_pending' && (
        <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 shadow-md">
          <h3 className="font-bold text-lg text-amber-900 mb-2 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Migration पूर्ण झाली आहे. LocalStorage cleanup करण्यापूर्वी Supabase data verification आवश्यक आहे.
          </h3>
          <p className="text-sm text-amber-800 mb-4">
            आम्ही Local आणि Supabase मधील डेटाची तुलना करून पडताळणी करू.
          </p>
          <button
            onClick={handleVerification}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Supabase Data Verify करा
          </button>
        </div>
      )}

      {/* Migration Completed & Cleanup Ready */}
      {migrationStatus === 'completed' && verificationPassed && (
        <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 shadow-md">
          <h3 className="font-bold text-lg text-emerald-900 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Verification Successful.
          </h3>
          <p className="text-sm text-emerald-800 mb-4">
            Supabase मध्ये डेटा यशस्वीरित्या सिंक झाला आहे. आता तुम्ही जुना LocalStorage डेटा Archive करू शकता.
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleCleanup}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              Production Local Data Cleanup & Archive
            </button>
            <button
              onClick={exportFailedCsv}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              Failed Records CSV
            </button>
          </div>
        </div>
      )}

      {/* Migration Preview Stats */}
      {stats && migrationStatus === 'preview' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <List className="w-5 h-5 text-indigo-600" />
              Migration Preview & Analysis
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4 text-right">Local Records</th>
                    <th className="py-3 px-4 text-right">Valid</th>
                    <th className="py-3 px-4 text-right text-rose-600">Invalid / Demo</th>
                    <th className="py-3 px-4 text-right text-amber-600">Duplicate (Supabase)</th>
                    <th className="py-3 px-4 text-right text-emerald-600">Ready to Migrate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modules.map(mod => {
                    const s = stats[mod];
                    if (!s) return null;
                    return (
                      <tr key={mod} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-medium text-slate-700">{getModuleLabel(mod)}</td>
                        <td className="py-3 px-4 text-right font-mono">{s.localRecords}</td>
                        <td className="py-3 px-4 text-right font-mono">{s.validRecords}</td>
                        <td className="py-3 px-4 text-right font-mono text-rose-600">{s.invalidRecords + s.demoRecords}</td>
                        <td className="py-3 px-4 text-right font-mono text-amber-600">{s.duplicateRecords}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">{s.migratableRecords}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Area */}
          <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200 flex flex-col items-center text-center">
            <AlertTriangle className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-bold text-lg text-indigo-900">Migration सुरू करण्यापूर्वी काळजीपूर्वक वाचा</h3>
            <p className="text-sm text-indigo-800 max-w-2xl mt-2 mb-6">
              Migration सुरू केल्यावर वरील "Ready to Migrate" रेकॉर्ड्स बॅच प्रोसेसिंगद्वारे Supabase प्रोडक्शन डेटाबेसमध्ये 
              जतन केले जातील. डुप्लिकेट आणि अवैध (Invalid/Demo) रेकॉर्ड्स वगळले जातील. सुरक्षिततेसाठी एक ऑटोमॅटिक बॅकअप तयार केला जाईल.
            </p>
            
            <label className="flex items-center gap-3 bg-white px-5 py-3 rounded-lg border border-indigo-100 cursor-pointer mb-6 shadow-sm">
              <input 
                type="checkbox" 
                checked={previewAccepted}
                onChange={(e) => setPreviewAccepted(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm font-bold text-slate-700">
                मी migration summary तपासली असून migration करण्यास अनुमती देत आहे.
              </span>
            </label>

            <button
              onClick={handleStartMigration}
              disabled={!previewAccepted || loading}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition shadow-sm ${
                previewAccepted && !loading
                  ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md'
                  : 'bg-slate-400 cursor-not-allowed'
              }`}
            >
              <HardDriveDownload className="w-5 h-5" />
              Migration सुरू करा (Start Import)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
