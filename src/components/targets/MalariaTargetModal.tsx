import React, { useState, useEffect } from 'react';
import { X, Target, Save, AlertCircle } from 'lucide-react';
import {
  MalariaTarget,
  TargetType,
  TargetScopeLevel,
  PhcMaster,
  SubcentreMaster,
  VillageMaster,
  EmployeeMaster,
} from '../../types';
import { targetService } from '../../services/targetService';
import { useAuth } from '../../hooks/useAuth';

interface MalariaTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  targetToEdit?: MalariaTarget | null;
  phcs: PhcMaster[];
  subcentres: SubcentreMaster[];
  villages: VillageMaster[];
  employees: EmployeeMaster[];
}

const MONTHS_MARATHI = [
  { value: 1, label: 'जानेवारी (January)' },
  { value: 2, label: 'फेब्रुवारी (February)' },
  { value: 3, label: 'मार्च (March)' },
  { value: 4, label: 'एप्रिल (April)' },
  { value: 5, label: 'मे (May)' },
  { value: 6, label: 'जून (June)' },
  { value: 7, label: 'जुलै (July)' },
  { value: 8, label: 'ऑगस्ट (August)' },
  { value: 9, label: 'सप्टेंबर (September)' },
  { value: 10, label: 'ऑक्टोबर (October)' },
  { value: 11, label: 'नोव्हेंबर (November)' },
  { value: 12, label: 'डिसेंबर (December)' },
];

export const MalariaTargetModal: React.FC<MalariaTargetModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  targetToEdit,
  phcs,
  subcentres,
  villages,
  employees,
}) => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [targetType, setTargetType] = useState<TargetType>('Monthly');
  const [targetYear, setTargetYear] = useState<number>(currentYear);
  const [targetMonth, setTargetMonth] = useState<number>(currentMonth);
  const [scopeLevel, setScopeLevel] = useState<TargetScopeLevel>('village');

  const [selectedPhcId, setSelectedPhcId] = useState<string>('');
  const [selectedSubcentreId, setSelectedSubcentreId] = useState<string>('');
  const [selectedVillageId, setSelectedVillageId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const [targetValue, setTargetValue] = useState<string>('50');
  const [remarks, setRemarks] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Pre-fill form when editing or opening
  useEffect(() => {
    if (!isOpen) return;

    if (targetToEdit) {
      setTargetType(targetToEdit.target_type);
      setTargetYear(targetToEdit.target_year);
      setTargetMonth(targetToEdit.target_month || currentMonth);
      setTargetValue(String(targetToEdit.target_value));
      setRemarks(targetToEdit.remarks || '');

      if (targetToEdit.employee_id) {
        setScopeLevel('employee');
        setSelectedEmployeeId(targetToEdit.employee_id);
        const emp = employees.find((e) => e.id === targetToEdit.employee_id);
        if (emp) {
          setSelectedSubcentreId(emp.subcentre_id);
          const sc = subcentres.find((s) => s.id === emp.subcentre_id);
          if (sc) setSelectedPhcId(sc.phc_id);
        }
      } else if (targetToEdit.village_id) {
        setScopeLevel('village');
        setSelectedVillageId(targetToEdit.village_id);
        const vil = villages.find((v) => v.id === targetToEdit.village_id);
        if (vil) {
          setSelectedSubcentreId(vil.subcentre_id);
          const sc = subcentres.find((s) => s.id === vil.subcentre_id);
          if (sc) setSelectedPhcId(sc.phc_id);
        }
      } else if (targetToEdit.subcentre_id) {
        setScopeLevel('subcentre');
        setSelectedSubcentreId(targetToEdit.subcentre_id);
        const sc = subcentres.find((s) => s.id === targetToEdit.subcentre_id);
        if (sc) setSelectedPhcId(sc.phc_id);
      } else {
        setScopeLevel('phc');
        setSelectedPhcId(targetToEdit.phc_id || '');
      }
    } else {
      // New target defaults
      setTargetType('Monthly');
      setTargetYear(currentYear);
      setTargetMonth(currentMonth);
      setScopeLevel('village');
      setTargetValue('50');
      setRemarks('');
      setErrorMsg('');

      if (phcs.length > 0) {
        const firstPhc = phcs[0].id;
        setSelectedPhcId(firstPhc);
        const matchingSc = subcentres.filter((s) => s.phc_id === firstPhc);
        if (matchingSc.length > 0) {
          const firstSc = matchingSc[0].id;
          setSelectedSubcentreId(firstSc);
          const matchingVils = villages.filter((v) => v.subcentre_id === firstSc);
          if (matchingVils.length > 0) {
            setSelectedVillageId(matchingVils[0].id);
          }
          const matchingEmps = employees.filter((e) => e.subcentre_id === firstSc);
          if (matchingEmps.length > 0) {
            setSelectedEmployeeId(matchingEmps[0].id);
          }
        }
      }
    }
  }, [isOpen, targetToEdit, phcs, subcentres, villages, employees]);

  if (!isOpen) return null;

  // Filtered dropdown lists based on cascading selections
  const availableSubcentres = subcentres.filter((s) => !selectedPhcId || s.phc_id === selectedPhcId);
  const availableVillages = villages.filter(
    (v) => !selectedSubcentreId || v.subcentre_id === selectedSubcentreId
  );
  const availableEmployees = employees.filter(
    (e) => !selectedSubcentreId || e.subcentre_id === selectedSubcentreId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const val = Number(targetValue);
    if (isNaN(val) || val <= 0) {
      setErrorMsg('कृपया ० पेक्षा जास्त वैध लक्ष्य संख्या टाका.');
      return;
    }

    if (targetType === 'Monthly' && (!targetMonth || targetMonth < 1 || targetMonth > 12)) {
      setErrorMsg('कृपया वैध महिना निवडा.');
      return;
    }

    // Determine IDs based on scope
    let phcId: string | null = selectedPhcId || null;
    let subcentreId: string | null = null;
    let villageId: string | null = null;
    let employeeId: string | null = null;

    if (scopeLevel === 'phc') {
      if (!phcId) {
        setErrorMsg('कृपया प्राथमिक आरोग्य केंद्र निवडा.');
        return;
      }
    } else if (scopeLevel === 'subcentre') {
      if (!selectedSubcentreId) {
        setErrorMsg('कृपया आरोग्य उपकेंद्र निवडा.');
        return;
      }
      subcentreId = selectedSubcentreId;
    } else if (scopeLevel === 'village') {
      if (!selectedVillageId) {
        setErrorMsg('कृपया संबंधित गाव निवडा.');
        return;
      }
      villageId = selectedVillageId;
      const v = villages.find((item) => item.id === villageId);
      if (v) {
        subcentreId = v.subcentre_id;
        const s = subcentres.find((sc) => sc.id === v.subcentre_id);
        if (s) phcId = s.phc_id;
      }
    } else if (scopeLevel === 'employee') {
      if (!selectedEmployeeId) {
        setErrorMsg('कृपया संबंधित कर्मचारी निवडा.');
        return;
      }
      employeeId = selectedEmployeeId;
      const emp = employees.find((item) => item.id === employeeId);
      if (emp) {
        subcentreId = emp.subcentre_id;
        const s = subcentres.find((sc) => sc.id === emp.subcentre_id);
        if (s) phcId = s.phc_id;
      }
    }

    // Resolve names for display
    const phcObj = phcs.find((p) => p.id === phcId);
    const scObj = subcentres.find((s) => s.id === subcentreId);
    const vilObj = villages.find((v) => v.id === villageId);
    const empObj = employees.find((e) => e.id === employeeId);

    setSaving(true);
    try {
      if (targetToEdit) {
        const { error } = await targetService.updateTarget(targetToEdit.id, {
          target_type: targetType,
          target_year: targetYear,
          target_month: targetType === 'Monthly' ? targetMonth : null,
          target_value: val,
          phc_id: phcId,
          subcentre_id: subcentreId,
          village_id: villageId,
          employee_id: employeeId,
          remarks: remarks.trim() || null,
          phc_name: phcObj?.phc_name,
          subcentre_name: scObj?.subcentre_name,
          village_name: vilObj?.village_name,
          employee_name: empObj?.employee_name,
          designation: empObj?.designation || undefined,
          malaria_smear_code: empObj?.malaria_smear_code,
        });

        if (error) {
          setErrorMsg(error);
          setSaving(false);
          return;
        }
      } else {
        const { error } = await targetService.createTarget({
          target_type: targetType,
          target_year: targetYear,
          target_month: targetType === 'Monthly' ? targetMonth : null,
          target_value: val,
          phc_id: phcId,
          subcentre_id: subcentreId,
          village_id: villageId,
          employee_id: employeeId,
          remarks: remarks.trim() || null,
          created_by: user?.id,
          phc_name: phcObj?.phc_name,
          subcentre_name: scObj?.subcentre_name,
          village_name: vilObj?.village_name,
          employee_name: empObj?.employee_name,
          designation: empObj?.designation || undefined,
          malaria_smear_code: empObj?.malaria_smear_code,
        });

        if (error) {
          setErrorMsg(error);
          setSaving(false);
          return;
        }
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'लक्ष्य सेव्ह करताना त्रुटी आली.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {targetToEdit ? 'मलेरिया लक्ष्य संपादित करा' : 'नवीन मलेरिया लक्ष्य तयार करा'}
              </h2>
              <p className="text-xs text-slate-500">
                PHC Controller द्वारे नमुना संकलन उद्दिष्ट निश्चित करणे
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Target Type & Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                लक्ष्य प्रकार (Target Type) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('Monthly')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                    targetType === 'Monthly'
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  मासिक (Monthly)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('Yearly')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                    targetType === 'Yearly'
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  वार्षिक (Yearly)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                वर्ष (Target Year) <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetYear}
                onChange={(e) => setTargetYear(Number(e.target.value))}
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Month selector if Monthly */}
          {targetType === 'Monthly' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                महिना (Target Month) <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetMonth}
                onChange={(e) => setTargetMonth(Number(e.target.value))}
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
              >
                {MONTHS_MARATHI.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Scope Level Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              लक्ष्य स्तर (Target Scope Level) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'phc', label: 'PHC स्तर' },
                { id: 'subcentre', label: 'उपकेंद्र स्तर' },
                { id: 'village', label: 'गाव स्तर' },
                { id: 'employee', label: 'कर्मचारी स्तर' },
              ].map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => setScopeLevel(scope.id as TargetScopeLevel)}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                    scopeLevel === scope.id
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-500 font-bold shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cascading Scope Dropdowns */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-3">
            {/* 1. PHC Dropdown */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                प्राथमिक आरोग्य केंद्र (PHC) <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedPhcId}
                onChange={(e) => {
                  setSelectedPhcId(e.target.value);
                  const matchingSc = subcentres.filter((s) => s.phc_id === e.target.value);
                  if (matchingSc.length > 0) {
                    setSelectedSubcentreId(matchingSc[0].id);
                    const matchingVils = villages.filter((v) => v.subcentre_id === matchingSc[0].id);
                    if (matchingVils.length > 0) setSelectedVillageId(matchingVils[0].id);
                    const matchingEmps = employees.filter((emp) => emp.subcentre_id === matchingSc[0].id);
                    if (matchingEmps.length > 0) setSelectedEmployeeId(matchingEmps[0].id);
                  }
                }}
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
              >
                {phcs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.phc_name} {p.phc_code ? `(${p.phc_code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Subcentre Dropdown (if scope is subcentre, village, employee) */}
            {scopeLevel !== 'phc' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  आरोग्य उपकेंद्र (Subcentre) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSubcentreId}
                  onChange={(e) => {
                    setSelectedSubcentreId(e.target.value);
                    const matchingVils = villages.filter((v) => v.subcentre_id === e.target.value);
                    if (matchingVils.length > 0) setSelectedVillageId(matchingVils[0].id);
                    const matchingEmps = employees.filter((emp) => emp.subcentre_id === e.target.value);
                    if (matchingEmps.length > 0) setSelectedEmployeeId(matchingEmps[0].id);
                  }}
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
                >
                  {availableSubcentres.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subcentre_name} {s.subcentre_code ? `(${s.subcentre_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. Village Dropdown (if scope is village) */}
            {scopeLevel === 'village' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  गाव (Village) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedVillageId}
                  onChange={(e) => setSelectedVillageId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
                >
                  {availableVillages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.village_name} (लोकसंख्या: {v.population}, घरे: {v.total_houses})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 4. Employee Dropdown (if scope is employee) */}
            {scopeLevel === 'employee' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  कर्मचारी (Employee) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
                >
                  {availableEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employee_name} ({e.designation || 'कर्मचारी'}) - स्मीअर कोड: {e.malaria_smear_code}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Target Value */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              लक्ष्य संख्या (Target Blood Samples Count) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="उदा. ५०"
              className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-700 font-semibold"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              या कालावधीत गोळा करावयाच्या मलेरिया रक्त नमुन्यांची संख्या.
            </p>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              शेरा / विशेष सूचना (Remarks - ऐच्छिक)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="उदा. डास उत्पत्ती क्षेत्रात विशेष मोहीम किंवा साप्ताहिक शिबीर उद्दिष्ट"
              className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              रद्द करा
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'जतन करत आहे...' : targetToEdit ? 'बदल जतन करा' : 'लक्ष्य जतन करा'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
