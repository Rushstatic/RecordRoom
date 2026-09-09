import React, { useState, useEffect, useMemo } from 'react';
import { PageId, RecordRegisterTemplate, RecordTemplateField, DynamicRecordEntry, Subcentre, Village } from '../types';
import { templateService } from '../services/templateService';
import { masterDataService } from '../services/masterDataService';
import { DynamicRecordForm } from '../components/DynamicRecordForm';
import { useAuth } from '../hooks/useAuth';
import { auditService } from '../services/auditService';
import { storage } from '../lib/storage';
import { 
  ArrowLeft, Plus, AlertTriangle, FileSpreadsheet, Edit3, 
  Trash2, Search, Filter, Printer, Eye, Calendar, 
  Building2, CheckCircle2, ChevronRight, XCircle, Settings
} from 'lucide-react';

export default function DynamicRegisterPage({
  onNavigate,
  templateId
}: {
  onNavigate: (page: PageId) => void;
  templateId?: string;
}) {
  const { user, role } = useAuth();
  const isPhcController = role === 'phc_controller' || user?.role === 'phc_controller';

  const [availableTemplates, setAvailableTemplates] = useState<RecordRegisterTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templateId || storage.getItem('selectedTemplateId') || ''
  );

  const [template, setTemplate] = useState<RecordRegisterTemplate | null>(null);
  const [fields, setFields] = useState<RecordTemplateField[]>([]);
  const [records, setRecords] = useState<DynamicRecordEntry[]>([]);
  const [subcentres, setSubcentres] = useState<Subcentre[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DynamicRecordEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'month' | 'all'>('today');
  const [selectedSubcentreFilter, setSelectedSubcentreFilter] = useState('');

  // View Record Details Modal
  const [viewingRecord, setViewingRecord] = useState<DynamicRecordEntry | null>(null);

  useEffect(() => {
    loadTemplatesAndMaster();
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      storage.setItem('selectedTemplateId', selectedTemplateId);
      loadTemplateData(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  const loadTemplatesAndMaster = async () => {
    setLoading(true);
    try {
      const [tpls, sc, v] = await Promise.all([
        templateService.getActiveTemplates(),
        masterDataService.getSubcentres(),
        masterDataService.getVillages(),
      ]);
      setAvailableTemplates(tpls);
      setSubcentres(sc);
      setVillages(v);

      let targetId = selectedTemplateId;
      if (!targetId && tpls.length > 0) {
        targetId = tpls[0].id;
        setSelectedTemplateId(targetId);
      } else if (targetId) {
        loadTemplateData(targetId);
      }
    } catch (err: any) {
      console.error(err);
      setError('मास्टर डेटा लोड करताना अडचण आली.');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateData = async (tid: string) => {
    setLoading(true);
    try {
      const [t, f, r] = await Promise.all([
        templateService.getTemplateById(tid),
        templateService.getTemplateFields(tid),
        templateService.getDynamicRecords(tid),
      ]);
      setTemplate(t);
      setFields(f);
      setRecords(r);
    } catch (err: any) {
      console.error(err);
      setError('नोंदवही डेटा लोड करताना अडचण आली.');
    } finally {
      setLoading(false);
    }
  };

  const activeFields = useMemo(() => {
    return [...fields].sort((a, b) => a.field_order - b.field_order).filter(f => f.is_active);
  }, [fields]);

  const listFields = useMemo(() => {
    const specified = activeFields.filter(f => f.show_in_list);
    return specified.length > 0 ? specified.slice(0, 6) : activeFields.slice(0, 4);
  }, [activeFields]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7);

    return records.filter(r => {
      // Date filter
      if (dateFilter === 'today' && r.record_date !== todayStr) return false;
      if (dateFilter === 'month' && !r.record_date?.startsWith(currentMonthPrefix)) return false;

      // Subcentre filter
      if (selectedSubcentreFilter && r.subcentre_id !== selectedSubcentreFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const dataStr = JSON.stringify(r.record_data || {}).toLowerCase();
        if (!dataStr.includes(term)) return false;
      }

      return true;
    });
  }, [records, dateFilter, selectedSubcentreFilter, searchTerm]);

  const handleSaveRecord = async (
    dataToSave: any, 
    subcentreId?: string, 
    villageId?: string, 
    recordDate?: string
  ) => {
    if (!selectedTemplateId) return;
    setError(null);
    setSuccess(null);

    try {
      const recordId = editingRecord ? editingRecord.id : crypto.randomUUID();
      const newRecord: DynamicRecordEntry = {
        id: recordId,
        template_id: selectedTemplateId,
        employee_id: user?.employeeId,
        phc_id: user?.phcId,
        subcentre_id: subcentreId || user?.subcentreId,
        village_id: villageId || null,
        record_data: dataToSave,
        record_date: recordDate || new Date().toISOString().split('T')[0],
        is_printed: editingRecord?.is_printed || false,
        created_by: user?.id,
      };

      await templateService.saveDynamicRecord(newRecord);
      
      auditService.logAction({
        action: editingRecord ? 'DYNAMIC_RECORD_UPDATE' : 'DYNAMIC_RECORD_CREATE',
        module: 'Daily Work' as any,
        record_description: `Dynamic Record: ${template?.register_name} (ID: ${recordId})`,
      });

      setSuccess('नोंद यशस्वीरित्या जतन झाली!');
      setTimeout(() => {
        setShowForm(false);
        setEditingRecord(null);
        setSuccess(null);
        loadTemplateData(selectedTemplateId);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'नोंद जतन करता आली नाही. कृपया पुन्हा प्रयत्न करा.');
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm('तुम्हाला ही नोंद नक्की हटवायची आहे का?')) return;
    try {
      await templateService.deleteDynamicRecord(recordId);
      auditService.logAction({
        action: 'DYNAMIC_RECORD_DELETE',
        module: 'Daily Work' as any,
        record_description: `Dynamic Record Deleted (ID: ${recordId})`,
      });
      setSuccess('नोंद हटवली गेली.');
      setTimeout(() => setSuccess(null), 2500);
      loadTemplateData(selectedTemplateId);
    } catch (err: any) {
      setError('नोंद हटवता आली नाही: ' + err.message);
    }
  };

  const getSubcentreName = (id?: string | null) => {
    if (!id) return '-';
    const sc = subcentres.find(s => s.id === id);
    return sc ? sc.name : id;
  };

  const getVillageName = (id?: string | null) => {
    if (!id) return '-';
    const v = villages.find(x => x.id === id);
    return v ? v.name : id;
  };

  if (loading && availableTemplates.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-600">नोंदवही लोड होत आहे...</p>
      </div>
    );
  }

  if (availableTemplates.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 my-8">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">कोणतीही सक्रिय नोंदवही उपलब्ध नाही</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          डेटा एंट्री करण्यासाठी आधी PHC Controller ने Dynamic Record Builder द्वारे नोंदवही तयार करणे आवश्यक आहे.
        </p>
        {isPhcController && (
          <button
            onClick={() => onNavigate('template-builder')}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
          >
            Dynamic Record Builder उघडा →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-7xl mx-auto space-y-6">
      {/* Header & Register Selector */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                DYNAMIC REGISTER
              </span>
              {template?.program_name && (
                <span className="text-xs text-slate-500 font-medium">• {template.program_name}</span>
              )}
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900">
                {template?.register_name || 'नोंदवही'}
              </h1>

              {/* Template Switcher Dropdown */}
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 cursor-pointer focus:ring-2 focus:ring-indigo-600"
              >
                {availableTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.register_name} ({t.register_code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Report */}
            <button
              onClick={() => {
                storage.setItem('selectedTemplateId', selectedTemplateId);
                onNavigate('dynamic-report');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" /> अहवाल व प्रिंट (Reports)
            </button>

            {/* Controller fields editor */}
            {isPhcController && (
              <button
                onClick={() => {
                  storage.setItem('selectedTemplateId', selectedTemplateId);
                  onNavigate('template-fields');
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="फील्ड्स बदला"
              >
                <Settings className="w-4 h-4 text-slate-600" /> Fields
              </button>
            )}

            {/* New Entry Button */}
            {!showForm && (
              <button
                onClick={() => {
                  setEditingRecord(null);
                  setShowForm(true);
                  setError(null);
                  setSuccess(null);
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> नवीन नोंद करा
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-600 hover:text-rose-900 font-bold">×</button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-600 hover:text-emerald-900 font-bold">×</button>
        </div>
      )}

      {/* Form Drawer / Container */}
      {showForm ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">
                {editingRecord ? 'नोंद दुरुस्ती (Edit Record)' : 'नवीन नोंद (New Dynamic Entry)'}
              </h3>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingRecord(null);
              }}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          
          <DynamicRecordForm 
            fields={fields} 
            initialData={editingRecord?.record_data || {}}
            initialSubcentreId={editingRecord?.subcentre_id}
            initialVillageId={editingRecord?.village_id || undefined}
            initialRecordDate={editingRecord?.record_date}
            onSave={handleSaveRecord}
            onCancel={() => { 
              setShowForm(false); 
              setEditingRecord(null); 
            }}
            error={error}
            success={success}
          />
        </div>
      ) : (
        /* Entries Table & Filters */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="नाव, मोबाईल, किंवा इतर तपशील शोधा..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            {/* Subcentre Selector */}
            <select
              value={selectedSubcentreFilter}
              onChange={e => setSelectedSubcentreFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium"
            >
              <option value="">सर्व उपकेंद्रे</option>
              {subcentres.map(sc => (
                <option key={sc.id} value={sc.id}>{sc.name}</option>
              ))}
            </select>

            {/* Date Range Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setDateFilter('today')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === 'today' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                आज
              </button>
              <button
                onClick={() => setDateFilter('month')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === 'month' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                चालू महिना
              </button>
              <button
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                सर्व नोंदी ({records.length})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/75 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  नोंदींची यादी ({filteredRecords.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                एकूण {records.length} पैकी {filteredRecords.length} नोंदी
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4 w-12 text-center">अ.क्र.</th>
                    <th className="p-4">तारीख</th>
                    <th className="p-4">उपकेंद्र / गाव</th>
                    {listFields.map(f => (
                      <th key={f.id} className="p-4">{f.field_label}</th>
                    ))}
                    <th className="p-4 text-right">कृती</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredRecords.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-center font-mono text-xs text-slate-500">{idx + 1}</td>
                      <td className="p-4 font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                        {r.record_date}
                      </td>
                      <td className="p-4 text-xs">
                        <div className="font-semibold text-slate-800">{getSubcentreName(r.subcentre_id)}</div>
                        <div className="text-slate-400 text-[11px]">{getVillageName(r.village_id)}</div>
                      </td>
                      {listFields.map(f => {
                        const val = r.record_data ? r.record_data[f.field_key] : null;
                        const displayVal = Array.isArray(val) ? val.join(', ') : (val ?? '-');
                        return (
                          <td key={f.id} className="p-4 text-slate-700 font-medium text-xs">
                            {String(displayVal)}
                          </td>
                        );
                      })}
                      <td className="p-4 text-right space-x-1 whitespace-nowrap">
                        {/* View Details */}
                        <button
                          onClick={() => setViewingRecord(r)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="तपशील पहा"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => {
                            setEditingRecord(r);
                            setShowForm(true);
                            setError(null);
                            setSuccess(null);
                          }}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="संपादित करा"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteRecord(r.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="हटवा"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={listFields.length + 4} className="p-12 text-center text-slate-500">
                        <p className="font-semibold text-slate-700">कोणतीही नोंद सापडली नाही.</p>
                        <p className="text-xs text-slate-400 mt-1">
                          नवीन नोंद जोडण्यासाठी वर दिलेल्या 'नवीन नोंद करा' बटनावर क्लिक करा.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View Record Details Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6 border border-slate-200">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">नोंद तपशील (Record Details)</h3>
                  <p className="text-[11px] text-slate-500 font-mono">ID: {viewingRecord.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingRecord(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block">तारीख:</span>
                  <span className="font-bold text-slate-800">{viewingRecord.record_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">उपकेंद्र:</span>
                  <span className="font-bold text-slate-800">{getSubcentreName(viewingRecord.subcentre_id)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">गाव:</span>
                  <span className="font-bold text-slate-800">{getVillageName(viewingRecord.village_id)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">नोंदणी वेळ:</span>
                  <span className="font-bold text-slate-800">
                    {viewingRecord.created_at ? new Date(viewingRecord.created_at).toLocaleString() : '-'}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {activeFields.map(f => {
                  const val = viewingRecord.record_data ? viewingRecord.record_data[f.field_key] : null;
                  const display = Array.isArray(val) ? val.join(', ') : (val ?? '-');
                  return (
                    <div key={f.id} className="p-3 flex justify-between items-center text-xs hover:bg-slate-50">
                      <span className="font-bold text-slate-700">{f.field_label}</span>
                      <span className="font-semibold text-slate-900 text-right max-w-xs">{String(display)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center">
              <button
                onClick={() => {
                  const r = viewingRecord;
                  setViewingRecord(null);
                  setEditingRecord(r);
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100"
              >
                संपादित करा (Edit)
              </button>
              <button
                onClick={() => setViewingRecord(null)}
                className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900"
              >
                बंद करा
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
