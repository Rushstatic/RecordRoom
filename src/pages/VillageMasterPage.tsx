import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Home,
  Edit2,
  Trash2,
  Code2,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  Users,
  Lock,
} from 'lucide-react';
import { VillageMaster, SubcentreMaster } from '../types';
import { masterDataService } from '../services/masterDataService';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export const VillageMasterPage: React.FC = () => {
  const { role } = useAuth();
  const isPhcController = role === 'phc_controller';

  const [villages, setVillages] = useState<VillageMaster[]>([]);
  const [subcentres, setSubcentres] = useState<SubcentreMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScFilter, setSelectedScFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [editingVillage, setEditingVillage] = useState<VillageMaster | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [subcentreId, setSubcentreId] = useState('');
  const [villageName, setVillageName] = useState('');
  const [population, setPopulation] = useState<number>(1000);
  const [totalHouses, setTotalHouses] = useState<number>(200);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vList, scList] = await Promise.all([
        masterDataService.getVillages(),
        masterDataService.getSubcentres(),
      ]);
      setVillages(vList);
      setSubcentres(scList);
      if (scList.length > 0 && !subcentreId) {
        setSubcentreId(scList[0].id);
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
    setEditingVillage(null);
    setSubcentreId(subcentres[0]?.id || '');
    setVillageName('');
    setPopulation(1200);
    setTotalHouses(240);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (v: VillageMaster) => {
    setEditingVillage(v);
    setSubcentreId(v.subcentre_id);
    setVillageName(v.village_name);
    setPopulation(v.population || 0);
    setTotalHouses(v.total_houses || 0);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!villageName.trim()) {
      setErrorMsg('कृपया गाव / वस्तीचे नाव प्रविष्ट करा');
      return;
    }
    if (!subcentreId) {
      setErrorMsg('कृपया संलग्न उपकेंद्र निवडा');
      return;
    }

    try {
      if (editingVillage) {
        await masterDataService.updateVillage(editingVillage.id, {
          subcentre_id: subcentreId,
          village_name: villageName.trim(),
          population: Number(population) || 0,
          total_houses: Number(totalHouses) || 0,
        });
      } else {
        await masterDataService.createVillage({
          subcentre_id: subcentreId,
          village_name: villageName.trim(),
          population: Number(population) || 0,
          total_houses: Number(totalHouses) || 0,
        });
      }
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'त्रुटी आली, कृपया पुन्हा प्रयत्न करा.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`तुम्हाला खात्री आहे की "${name}" हे गाव रेकॉर्ड हटवायचे आहे?`)) {
      await masterDataService.deleteVillage(id);
      await loadData();
    }
  };

  const filteredVillages = villages.filter((v) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      v.village_name.toLowerCase().includes(q) ||
      (v.subcentre_name && v.subcentre_name.toLowerCase().includes(q));
    const matchesSc = selectedScFilter === 'ALL' || v.subcentre_id === selectedScFilter;
    return matchesSearch && matchesSc;
  });

  return (
    <div className="space-y-5">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                मास्टर डेटाबेस (CODE 2)
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold border border-slate-200">
                village_master
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              गाव / वस्ती मास्टर (Village Master)
            </h2>
            <p className="text-xs text-slate-500">
              उपकेंद्राशी संलग्न गावे, पाडे, लोकसंख्या (population) व एकूण कुटुंबे (total_houses)
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
              id="village-add-btn"
              type="button"
              onClick={handleOpenAdd}
              className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>नवीन गाव जोडा</span>
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
            <strong>केवळ वाचन परवानगी (Read-Only):</strong> सामान्य उपकेंद्र कर्मचाऱ्यांना गाव मास्टर बदलण्याची परवानगी नाही. हे अधिकार केवळ <strong>PHC Controller</strong> कडे आहेत.
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
              placeholder="गावाचे नाव किंवा उपकेंद्र शोधा..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <select
            value={selectedScFilter}
            onChange={(e) => setSelectedScFilter(e.target.value)}
            className="w-full sm:w-auto text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="ALL">सर्व उपकेंद्रे (All Subcentres)</option>
            {subcentres.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.subcentre_name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 self-end md:self-auto flex items-center gap-2">
          <span>नोंदणीकृत गावे: <strong className="text-slate-800">{villages.length}</strong></span>
          <span>•</span>
          <span className="text-emerald-700 font-medium">
            {isSupabaseConfigured() ? 'Supabase Connected' : 'Local Master State'}
          </span>
        </div>
      </div>

      {/* Village Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            गाव / वस्ती नोंदवही (Village Master Database)
          </span>
          <span className="text-[11px] text-slate-500">
            मलेरिया सर्व्हेक्षण व ताप रुग्ण तपासणीसाठी आवश्यक
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            डेटा लोड होत आहे...
          </div>
        ) : filteredVillages.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            कोणतेही गाव सापडले नाही. "नवीन गाव जोडा" वर क्लिक करा.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">गाव / वस्तीचे नाव (village_name)</th>
                  <th className="px-4 py-3">संलग्न उपकेंद्र (subcentre_id)</th>
                  <th className="px-4 py-3">लोकसंख्या (population)</th>
                  <th className="px-4 py-3">एकूण कुटुंबे (total_houses)</th>
                  <th className="px-4 py-3">नोंदणी तारीख</th>
                  <th className="px-4 py-3 text-right">कृती (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredVillages.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {v.village_name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <Home className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{v.subcentre_name}</span>
                      </div>
                      {v.phc_name && (
                        <div className="text-[10px] text-slate-400 pl-4.5">{v.phc_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {v.population.toLocaleString('mr-IN')} नागरिक
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {v.total_houses.toLocaleString('mr-IN')} घरे
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {v.created_at ? new Date(v.created_at).toLocaleDateString('mr-IN') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isPhcController ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(v)}
                            className="p-1 rounded text-emerald-700 hover:bg-emerald-50"
                            title="संपादित करा"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(v.id, v.village_name)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50"
                            title="हटवा"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">केवळ वाचन</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingVillage ? 'गाव माहिती संपादित करा' : 'नवीन गाव / वस्ती नोंदणी'}
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
                  संलग्न आरोग्य उपकेंद्र (subcentre_id) *
                </label>
                <select
                  required
                  value={subcentreId}
                  onChange={(e) => setSubcentreId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  {subcentres.length === 0 && (
                    <option value="">प्रथम Subcentre Master मध्ये उपकेंद्र नोंदवा</option>
                  )}
                  {subcentres.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.subcentre_name} ({sc.phc_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  गाव / वस्तीचे नाव (village_name) *
                </label>
                <input
                  type="text"
                  required
                  value={villageName}
                  onChange={(e) => setVillageName(e.target.value)}
                  placeholder="उदा. जातेगाव (मुख्य) किंवा वाघोले"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    अंदाजे लोकसंख्या (population)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={population}
                    onChange={(e) => setPopulation(Number(e.target.value))}
                    placeholder="उदा. 2500"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    एकूण कुटुंबे (total_houses)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={totalHouses}
                    onChange={(e) => setTotalHouses(Number(e.target.value))}
                    placeholder="उदा. 450"
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
                  <span>{editingVillage ? 'बदल जतन करा' : 'गाव नोंदवा'}</span>
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
                <span>Village Master - PostgreSQL / Supabase Schema</span>
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
{`-- 3. VILLAGE MASTER
create table village_master (
  id uuid primary key default uuid_generate_v4(),
  subcentre_id uuid not null references subcentre_master(id) on delete cascade,
  village_name text not null,
  population integer default 0,
  total_houses integer default 0,
  created_at timestamptz default now()
);

create index idx_village_subcentre
on village_master(subcentre_id);`}
              </pre>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">Foreign Key: <code className="text-emerald-700">subcentre_master(id)</code></span>
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
