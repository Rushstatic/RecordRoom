import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  Database,
  FileJson,
  ShieldCheck,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import { BackupPayload, UserProfile } from '../../types';
import { auditService } from '../../services/auditService';

interface RestoreModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const RestoreModal: React.FC<RestoreModalProps> = ({
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [parsedPayload, setParsedPayload] = useState<BackupPayload | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Check if role is PHC Controller
  const isAuthorized = currentUser.role === 'phc_controller';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith('.json')) {
      setValidationError('कृपया केवळ .json फॉरमॅटमधील बॅकअप फाईल निवडा.');
      setFile(null);
      setParsedPayload(null);
      return;
    }

    setFile(selected);
    setValidationError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);

      // Validate structure
      const result = auditService.validateBackupFile(content);
      if (!result.isValid || !result.payload) {
        setValidationError(result.error || 'अवैध बॅकअप फाईल');
        setParsedPayload(null);
      } else {
        setParsedPayload(result.payload);
        setValidationError(null);
      }
    };
    reader.readAsText(selected);
  };

  const handleRestore = async () => {
    if (!parsedPayload || !confirmed || !isAuthorized) return;

    setIsRestoring(true);
    try {
      const res = await auditService.restoreBackup(parsedPayload, currentUser);
      onSuccess(res.message);
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'रिस्टोअर अयशस्वी झाला.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div
      id="restore-modal-overlay"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRestoring) onClose();
      }}
    >
      <div
        id="restore-modal"
        className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                डेटाबेस रिस्टोअर (Database Safe Restore)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                बॅकअप फाईलमधून पूर्वीचा सुरक्षित डेटा पूर्ववत करणे
              </p>
            </div>
          </div>
          <button
            id="close-restore-modal-btn"
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {!isAuthorized ? (
            <div className="bg-rose-50 border border-rose-300 p-4 rounded-xl text-xs text-rose-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">परवानगी नाकारली (Permission Denied)</p>
                <p className="mt-1">
                  डेटाबेस रिस्टोअर करण्याची परवानगी केवळ <strong>PHC Controller / वैद्यकीय अधिकारी</strong> यांना आहे. उपकेंद्र कर्मचाऱ्यांना ही सुविधा उपलब्ध नाही.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: File Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  १. बॅकअप फाईल निवडा (.json format)
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-5 text-center transition-colors bg-slate-50/50">
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium mb-1">
                    बॅकअप फाईल येथे ड्रॅग करा किंवा कॉम्प्युटरवरून निवडा
                  </p>
                  <p className="text-[11px] text-slate-400 mb-3">
                    उदा. malaria_health_backup_2026-09-07_14-30.json
                  </p>
                  <input
                    id="restore-file-input"
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    disabled={isRestoring}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                  />
                </div>
              </div>

              {/* Validation Error Message */}
              {validationError && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">त्रुटी: </span>
                    {validationError}
                  </div>
                </div>
              )}

              {/* Step 2: Inspection Details if Valid */}
              {parsedPayload && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 border-b border-emerald-200 pb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>२. बॅकअप तपासणी अहवाल (Backup Verified Successfully)</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">बॅकअप दिनांक:</span>
                      <span className="font-bold text-slate-900">{parsedPayload.metadata.backup_date}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">बॅकअप वेळ:</span>
                      <span className="font-bold text-slate-900">{parsedPayload.metadata.backup_time}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">तयार करणारा:</span>
                      <span className="font-bold text-slate-900">{parsedPayload.metadata.created_by}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">स्कीमा व्हर्जन:</span>
                      <span className="font-mono text-slate-800">{parsedPayload.metadata.database_schema_version}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">एकूण नोंदी:</span>
                      <span className="font-bold text-emerald-800">{parsedPayload.metadata.total_records}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">टेबल्स संख्या:</span>
                      <span className="font-bold text-slate-800">{parsedPayload.metadata.tables_included.length} टेबल्स</span>
                    </div>
                  </div>

                  {/* Table Breakdown Cards */}
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                      टेबलनिहाय नोंदी (Table Record Counts):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {Object.entries(parsedPayload.metadata.record_counts).map(([table, count]) => (
                        <div
                          key={table}
                          className="bg-white p-2 rounded-lg border border-emerald-100 text-[11px] flex justify-between items-center"
                        >
                          <span className="text-slate-600 font-mono truncate">{table}</span>
                          <span className="font-bold text-emerald-800 ml-1">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: High-contrast Safety Warning */}
              {parsedPayload && (
                <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-xl text-xs space-y-3">
                  <div className="flex items-start gap-2.5 text-amber-950 font-bold">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-extrabold text-amber-900">
                        ⚠️ सावधान: डेटाबेसमधील विद्यमान डेटावर परिणाम होईल!
                      </p>
                      <p className="font-normal text-amber-900 mt-1 leading-relaxed">
                        Restore केल्यास सध्याचा डेटा निवडलेल्या बॅकअपमधील डेटाने बदलला जाईल.
                        आपल्या सुरक्षिततेसाठी प्रणाली आपोआप सध्याच्या चालू डेटाचा <strong>Safety Backup</strong> इतिहासामध्ये जतन करेल.
                      </p>
                    </div>
                  </div>

                  {/* Mandatory Confirmation Checkbox */}
                  <div className="pt-2 border-t border-amber-200">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        id="restore-confirmation-checkbox"
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        disabled={isRestoring}
                        className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-bold text-slate-900 text-xs">
                        मला Restore प्रक्रियेचा परिणाम समजला आहे आणि मी जबाबदारीने पुढे जात आहे.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            रद्द करा (Cancel)
          </button>

          {isAuthorized && (
            <button
              id="confirm-restore-btn"
              type="button"
              onClick={handleRestore}
              disabled={!parsedPayload || !confirmed || isRestoring}
              className="flex items-center gap-2 px-5 py-2 bg-amber-700 hover:bg-amber-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Restore सुरू आहे...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Restore सुरू करा</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
