import React, { useState } from 'react';
import { ValidationIssue } from '../../types';
import { AlertTriangle, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { masterDataService } from '../../services/masterDataService';
import { malariaService } from '../../services/malariaService';

interface CorrectionModalProps {
  issue: ValidationIssue | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  issue,
  onClose,
  onSuccess,
}) => {
  if (!issue) return null;

  const [newValue, setNewValue] = useState<any>(issue.currentValue ?? '');
  const [confirmed, setConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setErrorMsg('कृपया बदल जतन करण्यापूर्वी पुष्टीकरण (Checkbox) निवडा.');
      return;
    }

    if (newValue === undefined || newValue === null || String(newValue).trim() === '') {
      setErrorMsg('कृपया वैध मूल्य प्रविष्ट करा.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const fieldName = issue.fieldName;
      if (!fieldName) {
        throw new Error('दुरुस्तीसाठी फील्ड निश्चित नाही.');
      }

      // Handle based on tableName
      if (issue.tableName === 'village_master') {
        const payload: any = {};
        if (fieldName === 'population' || fieldName === 'total_houses') {
          payload[fieldName] = Number(newValue);
        } else {
          payload[fieldName] = newValue;
        }
        await masterDataService.updateVillage(issue.recordId, payload);
      } else if (issue.tableName === 'employee_master') {
        const payload: any = { [fieldName]: newValue };
        await masterDataService.updateEmployee(issue.recordId, payload);
      } else if (issue.tableName === 'subcentre_master') {
        const payload: any = { [fieldName]: newValue };
        await masterDataService.updateSubcentre(issue.recordId, payload);
      } else if (issue.tableName === 'phc_master') {
        const payload: any = { [fieldName]: newValue };
        await masterDataService.updatePhc(issue.recordId, payload);
      } else if (issue.tableName === 'malaria_blood_samples') {
        const payload: any = {};
        if (fieldName === 'age') {
          payload[fieldName] = Number(newValue);
        } else {
          payload[fieldName] = newValue;
        }
        await malariaService.updateSample(issue.recordId, payload);
      } else {
        throw new Error('असमर्थित डेटा टेबल दुरुस्ती.');
      }

      onSuccess(`'${issue.recordIdentifier}' मधील '${issue.fieldLabelMarathi || fieldName}' यशस्वीरित्या अद्ययावत केले.`);
      onClose();
    } catch (err: any) {
      console.error('Error in CorrectionModal:', err);
      setErrorMsg(err?.message || 'नोंद जतन करताना त्रुटी आली.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold">डेटा दुरुस्ती कार्यपद्धती (Data Correction)</h3>
              <p className="text-[11px] text-emerald-200">स्पष्ट वापरकर्ता पुष्टीकरणानंतरच बदल जतन केले जातील</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-emerald-200 hover:text-white hover:bg-emerald-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Issue Context Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>शोधलेली त्रुटी / सूचना:</span>
            </div>
            <p className="leading-relaxed pl-5 font-medium">{issue.issueText}</p>
          </div>

          {/* Record Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 font-semibold block text-[11px]">मॉड्यूल (Module):</span>
                <span className="font-bold text-slate-800">{issue.categoryMarathi}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[11px]">संबंधित नोंद (Record):</span>
                <span className="font-bold text-slate-800 truncate block">{issue.recordIdentifier}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 font-semibold block text-[11px]">दुरुस्त होणारे फील्ड:</span>
                <span className="font-bold text-emerald-800">{issue.fieldLabelMarathi || issue.fieldName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[11px]">आधीचे मूल्य (Before Value):</span>
                <span className="font-mono font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 inline-block">
                  {issue.currentValue === '' || issue.currentValue === null || issue.currentValue === undefined
                    ? 'रिक्त (Empty)'
                    : String(issue.currentValue)}
                </span>
              </div>
            </div>
          </div>

          {/* Value Edit Control */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              नवीन दुरुस्त मूल्य (New / After Value): <span className="text-rose-600">*</span>
            </label>

            {issue.correctionType === 'select' && issue.allowedOptions ? (
              <select
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                required
              >
                <option value="">-- पर्याय निवडा --</option>
                {issue.allowedOptions.map((opt, idx) => (
                  <option key={idx} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : issue.correctionType === 'number' ? (
              <input
                type="number"
                min="0"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
                required
              />
            ) : (
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                required
              />
            )}

            {issue.suggestedFix && (
              <p className="text-[11px] text-emerald-800 font-medium">
                💡 शिफारस: {issue.suggestedFix}
              </p>
            )}
          </div>

          {/* Safety Rule Note */}
          <div className="text-[11px] text-slate-500 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
            ⚠️ <strong>सुरक्षा सूचना:</strong> नमुना क्रमांक, पाठविण्याचा दिनांक व ऐतिहासिक नोंदणी क्रमांक आपोआप बदलले जात नाहीत. फक्त योग्य मूल्याची खात्री करून बदल करा.
          </div>

          {/* User Confirmation Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2 cursor-pointer bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4"
              />
              <span className="text-xs text-slate-800 font-semibold select-none">
                मी या दुरुस्तीची पडताळणी केली असून सदर नोंद बदलण्याची पुष्टी करत आहे. (I confirm this correction).
              </span>
            </label>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              रद्द करा
            </button>

            <button
              type="submit"
              disabled={isSaving || !confirmed}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'जतन होत आहे...' : 'बदल जतन करा (Save Fix)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
