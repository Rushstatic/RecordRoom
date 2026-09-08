import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Edit2,
  Trash2,
  Code2,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { PhcMaster } from '../types';
import { masterDataService } from '../services/masterDataService';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export const PHCMasterPage: React.FC = () => {
  const { role } = useAuth();
  const isPhcController = role === 'phc_controller';

  const [phcs, setPhcs] = useState<PhcMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [editingPhc, setEditingPhc] = useState<PhcMaster | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [phcName, setPhcName] = useState('');
  const [phcCode, setPhcCode] = useState('');
  const [taluka, setTaluka] = useState('शिरूर');
  const [district, setDistrict] = useState('पुणे');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await masterDataService.getPhcs();
      setPhcs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingPhc(null);
    setPhcName('');
    setPhcCode(`PHC-${Math.floor(100 + Math.random() * 900)}`);
    setTaluka('शिरूर');
    setDistrict('पुणे');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (phc: PhcMaster) => {
    setEditingPhc(phc);
    setPhcName(phc.phc_name);
    setPhcCode(phc.phc_code || '');
    setTaluka(phc.taluka || '');
    setDistrict(phc.district || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phcName.trim()) {
      setErrorMsg('कृपया प्राथमिक आरोग्य केंद्राचे नाव प्रविष्ट करा');
      return;
    }

    try {
      if (editingPhc) {
        await masterDataService.updatePhc(editingPhc.id, {
          phc_name: phcName.trim(),
          phc_code: phcCode.trim() || null,
          taluka: taluka.trim() || null,
          district: district.trim() || null,
        });
      } else {
        await masterDataService.createPhc({
          phc_name: phcName.trim(),
          phc_code: phcCode.trim() || null,
          taluka: taluka.trim() || null,
          district: district.trim() || null,
        });
      }
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'त्रुटी आली, कृपया पुन्हा प्रयत्न करा.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`तुम्हाला खात्री आहे की "${name}" हे प्राथमिक आरोग्य केंद्र हटवायचे आहे? (याशी संबंधित उपकेंद्रे देखील काढली जातील)`)) {
      await masterDataService.deletePhc(id);
      await loadData();
    }
  };

  const filteredPhcs = phcs.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.phc_name.toLowerCase().includes(q) ||
      (p.phc_code && p.phc_code.toLowerCase().includes(q)) ||
      (p.taluka && p.taluka.toLowerCase().includes(q)) ||
      (p.district && p.district.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                मास्टर डेटाबेस (CODE 2)
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold border border-slate-200">
                phc_master
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              प्राथमिक आरोग्य केंद्र मास्टर (PHC Master)
            </h2>
            <p className="text-xs text-slate-500">
              तालुका व जिल्हा स्तरावरील प्राथमिक आरोग्य केंद्रांची अधिकृत नोंदणी व कोड व्यवस्थापन
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
            title="SQL Schema पहा"
          >
            <Code2 className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">SQL कोड</span>
          </button>

          {isPhcController ? (
            <button
              id="phc-add-btn"
              type="button"
              onClick={handleOpenAdd}
              className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>नवीन PHC जोडा</span>
            </button>
          ) : (
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-3 py-2 rounded-lg border border-amber-300 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>केवळ वाचन (Read-Only)</span>
            </span>
          )}
        </div>
      </div>

      {/* Access alert if logged in as Subcentre Employee */}
      {!isPhcController && (
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center gap-3 text-xs text-amber-900">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <div>
            <strong>केवळ वाचन परवानगी (Read-Only):</strong> सामान्य उपकेंद्र कर्मचाऱ्यांना प्राथमिक आरोग्य केंद्र (PHC) मास्टर बदलण्याची परवानगी नाही. हे अधिकार केवळ <strong>PHC Controller</strong> कडे आहेत.
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="PHC नाव, कोड, तालुका किंवा जिल्हा शोधा..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 self-start sm:self-auto">
          <span>एकूण PHC नोंदी: <strong className="text-slate-800">{phcs.length}</strong></span>
          <span>•</span>
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isSupabaseConfigured() ? 'Supabase Live Connected' : 'Local Master State'}
          </span>
        </div>
      </div>

      {/* PHC Cards Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
          डेटा लोड होत आहे...
        </div>
      ) : filteredPhcs.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
          कोणतेही प्राथमिक आरोग्य केंद्र सापडले नाही. "नवीन PHC जोडा" बटण वापरून नोंदणी करा.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPhcs.map((phc) => (
            <div
              key={phc.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-emerald-400 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {phc.phc_code || 'कोड प्रलंबित'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {phc.phc_name}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    सक्रिय
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">तालुका:</span>
                    <span className="font-semibold text-slate-800">{phc.taluka || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">जिल्हा:</span>
                    <span className="font-semibold text-slate-800">{phc.district || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 text-[11px]">सिस्टीम UUID:</span>
                    <span className="font-mono text-[10px] text-slate-500 truncate max-w-[130px]">
                      {phc.id}
                    </span>
                  </div>
                </div>
              </div>

              {isPhcController ? (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(phc)}
                    className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>संपादित करा</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(phc.id, phc.phc_name)}
                    className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>हटवा</span>
                  </button>
                </div>
              ) : (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>वाचन परवानगी</span>
                  <span className="font-mono text-[10px]">Active</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingPhc ? 'PHC संपादित करा' : 'नवीन प्राथमिक आरोग्य केंद्र नोंदणी'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="py-4 space-y-3.5 text-xs">
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  PHC चे नाव (phc_name) *
                </label>
                <input
                  type="text"
                  required
                  value={phcName}
                  onChange={(e) => setPhcName(e.target.value)}
                  placeholder="उदा. प्राथमिक आरोग्य केंद्र, वडगाव"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  PHC कोड (phc_code)
                </label>
                <input
                  type="text"
                  value={phcCode}
                  onChange={(e) => setPhcCode(e.target.value)}
                  placeholder="उदा. PHC-PUN-014"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    तालुका (taluka)
                  </label>
                  <input
                    type="text"
                    value={taluka}
                    onChange={(e) => setTaluka(e.target.value)}
                    placeholder="उदा. शिरूर"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    जिल्हा (district)
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="उदा. पुणे"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-semibold hover:bg-slate-100"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingPhc ? 'बदल जतन करा' : 'PHC नोंदवा'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQL View Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-700" />
                <span>PHC Master - PostgreSQL / Supabase Schema</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3">
              <pre className="bg-slate-900 text-emerald-300 p-3.5 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed">
{`-- 1. PHC MASTER
create table phc_master (
  id uuid primary key default uuid_generate_v4(),
  phc_name text not null,
  phc_code text unique,
  taluka text,
  district text,
  created_at timestamptz default now()
);`}
              </pre>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">फाइल: <code className="text-emerald-700">supabase/schema.sql</code></span>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-lg font-semibold"
              >
                बंद करा
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
