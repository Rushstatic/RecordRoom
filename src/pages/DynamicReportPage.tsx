import React, { useState, useEffect, useMemo } from 'react';
import { PageId, RecordRegisterTemplate, RecordTemplateField, DynamicRecordEntry, EmployeeMaster, VillageMaster, Subcentre } from '../types';
import { templateService } from '../services/templateService';
import { masterDataService } from '../services/masterDataService';
import { auditService } from '../services/auditService';
import { useAuth } from '../hooks/useAuth';
import { storage } from '../lib/storage';
import { 
  ArrowLeft, Search, Download, Printer, 
  ChevronLeft, ChevronRight, Eye, Edit3, Trash2,
  FileSpreadsheet, User, MapPin, Calendar, Activity, XCircle, AlertTriangle
} from 'lucide-react';
import { DynamicRecordForm } from '../components/DynamicRecordForm';

export default function DynamicReportPage({
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

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<RecordRegisterTemplate | null>(null);
  const [fields, setFields] = useState<RecordTemplateField[]>([]);
  const [allRecords, setAllRecords] = useState<DynamicRecordEntry[]>([]);
  
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [villages, setVillages] = useState<VillageMaster[]>([]);
  const [subcentres, setSubcentres] = useState<Subcentre[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');
  const [filterVillageId, setFilterVillageId] = useState<string>('all');
  const [filterSubcentreId, setFilterSubcentreId] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('this_month');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Modals
  const [viewRecord, setViewRecord] = useState<DynamicRecordEntry | null>(null);
  const [editRecord, setEditRecord] = useState<DynamicRecordEntry | null>(null);

  useEffect(() => {
    loadAllTemplatesAndMaster();
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      storage.setItem('selectedTemplateId', selectedTemplateId);
      loadTemplateData(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  const loadAllTemplatesAndMaster = async () => {
    setLoading(true);
    try {
      const [tpls, emps, vils, scs] = await Promise.all([
        templateService.getActiveTemplates(),
        masterDataService.getEmployees(),
        masterDataService.getVillages(),
        masterDataService.getSubcentres(),
      ]);
      setAvailableTemplates(tpls);
      setEmployees(emps);
      setVillages(vils);
      setSubcentres(scs);

      let tid = selectedTemplateId;
      if (!tid && tpls.length > 0) {
        tid = tpls[0].id;
        setSelectedTemplateId(tid);
      } else if (tid) {
        loadTemplateData(tid);
      }
    } catch (e) {
      console.error(e);
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

      // Access control
      let accessible = r;
      if (!isPhcController && user?.employeeId) {
        accessible = r.filter(x => x.employee_id === user.employeeId || x.created_by === user.id);
      }
      setAllRecords(accessible);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeFields = useMemo(() => fields.filter(f => f.is_active), [fields]);
  const reportFields = useMemo(() => {
    const specified = activeFields.filter(f => f.show_in_report).sort((a,b) => a.field_order - b.field_order);
    return specified.length > 0 ? specified : activeFields.slice(0, 8);
  }, [activeFields]);

  const filteredRecords = useMemo(() => {
    let result = [...allRecords];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => {
        const dataStr = JSON.stringify(r.record_data || {}).toLowerCase();
        return dataStr.includes(q);
      });
    }

    // Subcentre
    if (filterSubcentreId !== 'all') {
      result = result.filter(r => r.subcentre_id === filterSubcentreId);
    }

    // Village
    if (filterVillageId !== 'all') {
      result = result.filter(r => r.village_id === filterVillageId);
    }

    // Employee
    if (isPhcController && filterEmployeeId !== 'all') {
      result = result.filter(r => r.employee_id === filterEmployeeId);
    }

    // Date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (filterDateRange === 'today') {
      result = result.filter(r => r.record_date === todayStr);
    } else if (filterDateRange === 'this_month') {
      const ym = todayStr.substring(0, 7);
      result = result.filter(r => r.record_date?.startsWith(ym));
    } else if (filterDateRange === 'custom') {
      if (customFromDate) result = result.filter(r => r.record_date >= customFromDate);
      if (customToDate) result = result.filter(r => r.record_date <= customToDate);
    }

    return result;
  }, [allRecords, searchQuery, filterSubcentreId, filterVillageId, filterEmployeeId, filterDateRange, customFromDate, customToDate, isPhcController]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  // CSV Export
  const handleExportCSV = () => {
    auditService.logAction({
      action: 'DYNAMIC_RECORD_EXPORT',
      module: 'Reports' as any,
      record_description: `Exported CSV: ${template?.register_name}`,
    });

    const headers = [
      'अ.क्र.', 
      'नोंद तारीख (Record Date)', 
      'उपकेंद्र (Subcentre)', 
      'गाव (Village)', 
      ...reportFields.map(f => f.field_label)
    ];
    
    const rows = filteredRecords.map((r, i) => {
      const scName = subcentres.find(s => s.id === r.subcentre_id)?.name || r.subcentre_id || '';
      const vName = villages.find(v => v.id === r.village_id)?.name || r.village_id || '';
      
      const rowData = [
        i + 1,
        r.record_date,
        `"${scName}"`,
        `"${vName}"`,
        ...reportFields.map(f => {
          let val = r.record_data ? r.record_data[f.field_key] : '';
          if (val === null || val === undefined) val = '';
          if (Array.isArray(val)) val = val.join('; ');
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        })
      ];
      return rowData.join(',');
    });

    // UTF-8 BOM for Marathi Excel display
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${template?.register_code || 'REPORT'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    auditService.logAction({
      action: 'DYNAMIC_RECORD_PRINT',
      module: 'Reports' as any,
      record_description: `Printed Register: ${template?.register_name}`,
    });
    window.print();
  };

  const handleEditSave = async (data: any, subcentreId?: string, villageId?: string, recordDate?: string) => {
    if (!editRecord || !selectedTemplateId) return;
    try {
      const updatedRecord: DynamicRecordEntry = {
        ...editRecord,
        subcentre_id: subcentreId || editRecord.subcentre_id,
        village_id: villageId !== undefined ? villageId : editRecord.village_id,
        record_date: recordDate || editRecord.record_date,
        record_data: data,
        updated_at: new Date().toISOString(),
      };
      await templateService.saveDynamicRecord(updatedRecord);
      
      auditService.logAction({
        action: 'DYNAMIC_RECORD_UPDATE',
        module: 'Reports' as any,
        record_description: `Edited Dynamic Record: ${template?.register_name}`,
      });

      setEditRecord(null);
      loadTemplateData(selectedTemplateId);
    } catch (e: any) {
      alert('Error saving record: ' + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('तुम्हाला ही नोंद खरोखर हटवायची आहे का?')) return;
    try {
      await templateService.deleteDynamicRecord(id);
      auditService.logAction({
        action: 'DYNAMIC_RECORD_DELETE',
        module: 'Reports' as any,
        record_description: `Deleted Dynamic Record (ID: ${id})`,
      });
      loadTemplateData(selectedTemplateId);
    } catch (e: any) {
      alert('नोंद हटवता आली नाही: ' + e.message);
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

  if (loading && !template) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-600">अहवाल लोड होत आहे...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-7xl mx-auto space-y-6">
      {/* Non-print Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('reports')} 
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full shadow-xs text-slate-600 border border-slate-200 cursor-pointer"
            title="मागे जा"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                DYNAMIC REGISTER REPORT
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-600">{template?.program_name || 'आरोग्य कार्यक्रम'}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap mt-1">
              <h1 className="text-2xl font-black text-slate-900">{template?.register_name || 'नोंदवही अहवाल'}</h1>
              {/* Template Switcher */}
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 cursor-pointer focus:ring-2 focus:ring-teal-600"
              >
                {availableTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.register_name} ({t.register_code})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <button 
            onClick={handlePrint} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-700" /> <span>A4 प्रिंट करा</span>
          </button>
          <button 
            onClick={handleExportCSV} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-teal-700 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" /> <span>CSV Export (Excel)</span>
          </button>
        </div>
      </div>

      {/* Official Government Print Header (Visible in print) */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-4">
        <h2 className="text-lg font-bold text-slate-900">महाराष्ट्र शासन - सार्वजनिक आरोग्य विभाग</h2>
        <h1 className="text-xl font-black text-slate-950 mt-0.5">{template?.register_name}</h1>
        <p className="text-xs text-slate-700 mt-1 font-semibold">
          कार्यक्रम: {template?.program_name || '-'} | रजिस्टर कोड: {template?.register_code}
        </p>
        <div className="flex justify-between items-center text-xs text-slate-700 mt-2 px-2 font-medium">
          <span>तपासणी / अहवाल कालावधी: {filterDateRange === 'today' ? 'आज' : filterDateRange === 'this_month' ? 'चालू महिना' : 'सर्व नोंदी'}</span>
          <span>एकूण नोंदी संख्या: {filteredRecords.length}</span>
          <span>दिनांक: {new Date().toLocaleDateString('mr-IN')}</span>
        </div>
      </div>

      {/* Filters (Hidden in print) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="रुग्ण नाव, मोबाईल किंवा तपशील शोधा..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Subcentre */}
          <select
            value={filterSubcentreId}
            onChange={e => setFilterSubcentreId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium"
          >
            <option value="all">सर्व उपकेंद्रे</option>
            {subcentres.map(sc => (
              <option key={sc.id} value={sc.id}>{sc.name}</option>
            ))}
          </select>

          {/* Village */}
          <select
            value={filterVillageId}
            onChange={e => setFilterVillageId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium"
          >
            <option value="all">सर्व गावे</option>
            {villages
              .filter(v => filterSubcentreId === 'all' || v.subcentre_id === filterSubcentreId)
              .map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
          </select>

          {/* Date Filter */}
          <select
            value={filterDateRange}
            onChange={e => setFilterDateRange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium"
          >
            <option value="today">आजच्या नोंदी (Today)</option>
            <option value="this_month">चालू महिना (This Month)</option>
            <option value="all">सर्व नोंदी (All Time)</option>
            <option value="custom">सानुकूल तारीख (Custom Range)</option>
          </select>
        </div>

        {filterDateRange === 'custom' && (
          <div className="flex gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">पासून:</span>
              <input
                type="date"
                value={customFromDate}
                onChange={e => setCustomFromDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">पर्यंत:</span>
              <input
                type="date"
                value={customToDate}
                onChange={e => setCustomToDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Report Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px] print:min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider print:bg-slate-100">
                <th className="p-3 w-12 text-center border-r border-slate-200">अ.क्र.</th>
                <th className="p-3 border-r border-slate-200">नोंद तारीख</th>
                <th className="p-3 border-r border-slate-200">उपकेंद्र / गाव</th>
                {reportFields.map(f => (
                  <th key={f.id} className="p-3 border-r border-slate-200">
                    {f.field_label}
                  </th>
                ))}
                <th className="p-3 text-right print:hidden">कृती</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {paginatedRecords.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 text-center font-mono font-bold text-slate-600 border-r border-slate-200">
                    {(page - 1) * pageSize + i + 1}
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                    {r.record_date}
                  </td>
                  <td className="p-3 border-r border-slate-200 whitespace-nowrap">
                    <div className="font-semibold text-slate-800">{getSubcentreName(r.subcentre_id)}</div>
                    <div className="text-[10px] text-slate-400">{getVillageName(r.village_id)}</div>
                  </td>
                  {reportFields.map(f => {
                    const val = r.record_data ? r.record_data[f.field_key] : null;
                    const display = Array.isArray(val) ? val.join(', ') : (val ?? '-');
                    return (
                      <td key={f.id} className="p-3 text-slate-800 font-medium border-r border-slate-200">
                        {String(display)}
                      </td>
                    );
                  })}
                  <td className="p-3 text-right print:hidden space-x-1 whitespace-nowrap">
                    <button 
                      onClick={() => setViewRecord(r)}
                      className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded" 
                      title="पहा"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setEditRecord(r)}
                      className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" 
                      title="संपादित करा"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {isPhcController && (
                      <button 
                        onClick={() => handleDelete(r.id)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded" 
                        title="हटवा"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={reportFields.length + 4} className="p-12 text-center text-slate-500">
                    कोणत्याही नोंदी आढळल्या नाहीत.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (Hidden in print) */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
          <div className="text-xs text-slate-600 font-medium">
            एकूण <span className="font-bold text-slate-900">{filteredRecords.length}</span> नोंदींपैकी पृष्ठ {page} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Official Signatures Section (Visible in print) */}
      <div className="hidden print:grid grid-cols-3 gap-8 pt-16 text-center text-xs font-bold text-slate-900">
        <div>
          <div className="border-t border-slate-800 pt-2">आरोग्य कर्मचारी / सेविका स्वाक्षरी</div>
        </div>
        <div>
          <div className="border-t border-slate-800 pt-2">आरोग्य पर्यवेक्षक स्वाक्षरी</div>
        </div>
        <div>
          <div className="border-t border-slate-800 pt-2">वैद्यकीय अधिकारी स्वाक्षरी व शिक्का</div>
        </div>
      </div>

      {/* View Record Modal */}
      {viewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-6 border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">नोंद सविस्तर माहिती</h3>
              <button onClick={() => setViewRecord(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div><span className="text-slate-400">तारीख:</span> <span className="font-bold text-slate-800">{viewRecord.record_date}</span></div>
                <div><span className="text-slate-400">उपकेंद्र:</span> <span className="font-bold text-slate-800">{getSubcentreName(viewRecord.subcentre_id)}</span></div>
                <div><span className="text-slate-400">गाव:</span> <span className="font-bold text-slate-800">{getVillageName(viewRecord.village_id)}</span></div>
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {activeFields.map(f => {
                  const val = viewRecord.record_data ? viewRecord.record_data[f.field_key] : null;
                  const display = Array.isArray(val) ? val.join(', ') : (val ?? '-');
                  return (
                    <div key={f.id} className="p-3 flex justify-between">
                      <span className="font-bold text-slate-700">{f.field_label}</span>
                      <span className="font-semibold text-slate-900">{String(display)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-3 border-t border-slate-200 bg-white flex justify-end">
              <button onClick={() => setViewRecord(null)} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold">
                बंद करा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6 border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">नोंद दुरुस्ती (Edit Record)</h3>
              <button onClick={() => setEditRecord(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2">
              <DynamicRecordForm
                fields={fields}
                initialData={editRecord.record_data}
                initialSubcentreId={editRecord.subcentre_id}
                initialVillageId={editRecord.village_id || undefined}
                initialRecordDate={editRecord.record_date}
                onSave={handleEditSave}
                onCancel={() => setEditRecord(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
