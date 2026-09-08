import React, { useState, useEffect } from 'react';
import {
  Home,
  Plus,
  Search,
  Building2,
  Edit2,
  Trash2,
  Code2,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  Lock,
} from 'lucide-react';
import { SubcentreMaster, PhcMaster } from '../types';
import { masterDataService } from '../services/masterDataService';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export const SubcentreMasterPage: React.FC = () => {
  const { role } = useAuth();
  const isPhcController = role === 'phc_controller';

  const [subcentres, setSubcentres] = useState<SubcentreMaster[]>([]);
  const [phcs, setPhcs] = useState<PhcMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhcFilter, setSelectedPhcFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [editingSc, setEditingSc] = useState<SubcentreMaster | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form inputs
  const [phcId, setPhcId] = useState('');
  const [subcentreName, setSubcentreName] = useState('');
  const [subcentreCode, setSubcentreCode] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [scList, phcList] = await Promise.all([
        masterDataService.getSubcentres(),
        masterDataService.getPhcs(),
      ]);
      setSubcentres(scList);
      setPhcs(phcList);
      if (phcList.length > 0 && !phcId) {
        setPhcId(phcList[0].id);
      }
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
    setEditingSc(null);
    setPhcId(phcs[0]?.id || '');
    setSubcentreName('');
    setSubcentreCode(`SC-${Math.floor(100 + Math.random() * 900)}`);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (sc: SubcentreMaster) => {
    setEditingSc(sc);
    setPhcId(sc.phc_id);
    setSubcentreName(sc.subcentre_name);
    setSubcentreCode(sc.subcentre_code || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcentreName.trim()) {
      setErrorMsg('कृपया उपकेंद्राचे नाव प्रविष्ट करा');
      return;
    }
    if (!phcId) {
      setErrorMsg('कृपया संबंधित प्राथमिक आरोग्य केंद्र (PHC) निवडा');
      return;
    }

    try {
      if (editingSc) {
        await masterDataService.updateSubcentre(editingSc.id, {
          phc_id: phcId,
          subcentre_name: subcentreName.trim(),
          subcentre_code: subcentreCode.trim() || null,
        });
      } else {
        await masterDataService.createSubcentre({
          phc_id: phcId,
          subcentre_name: subcentreName.trim(),
          subcentre_code: subcentreCode.trim() || null,
        });
      }
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'त्रुटी आली, कृपया पुन्हा प्रयत्न करा.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      window.confirm(
        `तुम्हाला खात्री आहे की "${name}" हे उपकेंद्र हटवायचे आहे? (संबंधित गावे व कर्मचारी रेकॉर्ड्स देखील प्रभावित होतील)`
      )
    ) {
      await masterDataService.deleteSubcentre(id);
      await loadData();
    }
  };

  const filteredSubcentres = subcentres.filter((sc) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      sc.subcentre_name.toLowerCase().includes(q) ||
      (sc.subcentre_code && sc.subcentre_code.toLowerCase().includes(q)) ||
      (sc.phc_name && sc.phc_name.toLowerCase().includes(q));

    const matchesPhc = selectedPhcFilter === 'ALL' || sc.phc_id === selectedPhcFilter;
    return matchesSearch && matchesPhc;
  });

  return (
    <div className="space-y-5">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                मास्टर डेटाबेस (CODE 2)
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold border border-slate-200">
                subcentre_master
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              आरोग्य उपकेंद्र मास्टर (Subcentre Master)
            </h2>
            <p className="text-xs text-slate-500">
              PHC शी संलग्न उपकेंद्रांची नोंदणी, कोड व कार्यक्षेत्र मॅपिंग
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
              id="subcentre-add-btn"
              type="button"
              onClick={handleOpenAdd}
              className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>नवीन उपकेंद्र जोडा</span>
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
            <strong>केवळ वाचन परवानगी (Read-Only):</strong> सामान्य उपकेंद्र कर्मचाऱ्यांना आरोग्य उपकेंद्र मास्टर बदलण्याची परवानगी नाही. हे अधिकार केवळ <strong>PHC Controller</strong> कडे आहेत.
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-2 flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="उपकेंद्राचे नाव किंवा कोड शोधा..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <select
            value={selectedPhcFilter}
            onChange={(e) => setSelectedPhcFilter(e.target.value)}
            className="w-full sm:w-auto text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="ALL">सर्व प्राथमिक आरोग्य केंद्रे (PHC)</option>
            {phcs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.phc_name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 self-end md:self-auto flex items-center gap-2">
          <span>एकूण उपकेंद्रे: <strong className="text-slate-800">{subcentres.length}</strong></span>
          <span>•</span>
          <span className="text-emerald-700 font-medium">
            {isSupabaseConfigured() ? 'Supabase Connected' : 'Local Master State'}
          </span>
        </div>
      </div>

      {/* Subcentre Cards Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
          डेटा लोड होत आहे...
        </div>
      ) : filteredSubcentres.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
          कोणतेही उपकेंद्र सापडले नाही. "नवीन उपकेंद्र जोडा" बटण वापरून नोंदणी करा.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubcentres.map((sc) => (
            <div
              key={sc.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-emerald-400 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                      {sc.subcentre_code || 'कोड प्रलंबित'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {sc.subcentre_name}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    सक्रिय
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">संलग्न प्राथमिक आरोग्य केंद्र (phc_id):</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                      {sc.phc_name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 text-[11px]">UUID:</span>
                    <span className="font-mono text-[10px] text-slate-500 truncate max-w-[140px]">
                      {sc.id}
                    </span>
                  </div>
                </div>
              </div>

              {isPhcController ? (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(sc)}
                    className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>संपादित करा</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(sc.id, sc.subcentre_name)}
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
                {editingSc ? 'उपकेंद्र संपादित करा' : 'नवीन आरोग्य उपकेंद्र नोंदणी'}
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
                  संलग्न प्राथमिक आरोग्य केंद्र (phc_id) *
                </label>
                <select
                  required
                  value={phcId}
                  onChange={(e) => setPhcId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  {phcs.length === 0 && (
                    <option value="">प्रथम PHC Master मध्ये केंद्र नोंदवा</option>
                  )}
                  {phcs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.phc_name} ({p.taluka})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  उपकेंद्राचे नाव (subcentre_name) *
                </label>
                <input
                  type="text"
                  required
                  value={subcentreName}
                  onChange={(e) => setSubcentreName(e.target.value)}
                  placeholder="उदा. आरोग्य उपकेंद्र, जातेगाव"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  उपकेंद्र कोड (subcentre_code)
                </label>
                <input
                  type="text"
                  value={subcentreCode}
                  onChange={(e) => setSubcentreCode(e.target.value)}
                  placeholder="उदा. SC-JTG-01"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
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
                  <span>{editingSc ? 'बदल जतन करा' : 'उपकेंद्र नोंदवा'}</span>
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
                <span>Subcentre Master - PostgreSQL / Supabase Schema</span>
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
{`-- 2. SUBCENTRE MASTER
create table subcentre_master (
  id uuid primary key default uuid_generate_v4(),
  phc_id uuid not null references phc_master(id) on delete cascade,
  subcentre_name text not null,
  subcentre_code text unique,
  created_at timestamptz default now()
);

create index idx_subcentre_phc
on subcentre_master(phc_id);`}
              </pre>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">Foreign Key: <code className="text-emerald-700">phc_master(id)</code></span>
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
