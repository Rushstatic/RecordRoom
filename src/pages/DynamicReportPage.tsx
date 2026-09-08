import React, { useState, useEffect, useMemo } from 'react';
import { PageId, RecordRegisterTemplate, RecordTemplateField, DynamicRecordEntry, EmployeeMaster, VillageMaster } from '../types';
import { templateService } from '../services/templateService';
import { masterDataService } from '../services/masterDataService';
import { auditService } from '../services/auditService';
import { useAuth } from '../hooks/useAuth';
import { 
  ArrowLeft, Search, Filter, Download, Printer, 
  ChevronLeft, ChevronRight, Eye, Edit, Trash2,
  FileSpreadsheet, User, MapPin, Calendar, Activity, X
} from 'lucide-react';
import { DynamicRecordForm } from '../components/DynamicRecordForm';

export default function DynamicReportPage({
  onNavigate,
  templateId
}: {
  onNavigate: (page: PageId) => void;
  templateId: string;
}) {
  const { user, role } = useAuth();
  const isPhcController = role === 'phc_controller';

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<RecordRegisterTemplate | null>(null);
  const [fields, setFields] = useState<RecordTemplateField[]>([]);
  const [allRecords, setAllRecords] = useState<DynamicRecordEntry[]>([]);
  
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [villages, setVillages] = useState<VillageMaster[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');
  const [filterVillageId, setFilterVillageId] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('this_month');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');
  
  // Generic Filters (Dropdowns)
  const [genericFilters, setGenericFilters] = useState<Record<string, string>>({});

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Modals
  const [viewRecord, setViewRecord] = useState<DynamicRecordEntry | null>(null);
  const [editRecord, setEditRecord] = useState<DynamicRecordEntry | null>(null);

  useEffect(() => {
    loadData();
  }, [templateId]);

  const loadData = async () => {
    if (!templateId) {
      onNavigate('reports');
      return;
    }
    setLoading(true);
    try {
      const [t, f, r, emps, vils] = await Promise.all([
        templateService.getTemplateById(templateId),
        templateService.getTemplateFields(templateId),
        templateService.getDynamicRecords(templateId),
        masterDataService.getEmployees(),
        masterDataService.getVillages()
      ]);
      
      if (!t) {
        onNavigate('reports');
        return;
      }

      setTemplate(t);
      setFields(f);
      
      // Filter records based on role
      let accessibleRecords = r;
      if (!isPhcController && user?.employeeId) {
        accessibleRecords = r.filter(record => record.employee_id === user.employeeId);
      }
      setAllRecords(accessibleRecords);
      
      setEmployees(emps);
      setVillages(vils);
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const activeFields = useMemo(() => fields.filter(f => f.is_active), [fields]);
  const listFields = useMemo(() => activeFields.filter(f => f.show_in_list).sort((a,b) => a.field_order - b.field_order), [activeFields]);
  const reportFields = useMemo(() => activeFields.filter(f => f.show_in_report).sort((a,b) => a.field_order - b.field_order), [activeFields]);
  const filterableFields = useMemo(() => activeFields.filter(f => f.field_type === 'dropdown' || f.field_type === 'radio' || f.field_type === 'boolean'), [activeFields]);
  const searchableFields = useMemo(() => activeFields.filter(f => f.is_searchable), [activeFields]);

  const filteredRecords = useMemo(() => {
    let result = [...allRecords];

    // 1. Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => {
        return searchableFields.some(f => {
          const val = r.record_data[f.field_key];
          return val && val.toString().toLowerCase().includes(q);
        });
      });
    }

    // 2. Employee Filter (PHC Controller only)
    if (isPhcController && filterEmployeeId !== 'all') {
      result = result.filter(r => r.employee_id === filterEmployeeId);
    }

    // 3. Date Filter
    if (filterDateRange !== 'all') {
      const today = new Date();
      let fromDate = new Date(0);
      let toDate = new Date();
      toDate.setHours(23, 59, 59, 999);

      if (filterDateRange === 'today') {
        fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0);
      } else if (filterDateRange === 'yesterday') {
        fromDate = new Date();
        fromDate.setDate(today.getDate() - 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(fromDate);
        toDate.setHours(23, 59, 59, 999);
      } else if (filterDateRange === 'this_week') {
        fromDate = new Date();
        fromDate.setDate(today.getDate() - today.getDay()); // Sunday
        fromDate.setHours(0, 0, 0, 0);
      } else if (filterDateRange === 'this_month') {
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
      } else if (filterDateRange === 'this_year') {
        fromDate = new Date(today.getFullYear(), 0, 1);
      } else if (filterDateRange === 'custom') {
        if (customFromDate) fromDate = new Date(customFromDate);
        if (customToDate) {
           toDate = new Date(customToDate);
           toDate.setHours(23, 59, 59, 999);
        }
      }

      result = result.filter(r => {
        const d = new Date(r.record_date);
        return d >= fromDate && d <= toDate;
      });
    }

    // 4. Generic Filters
    Object.keys(genericFilters).forEach(key => {
      const val = genericFilters[key];
      if (val && val !== 'all') {
        result = result.filter(r => r.record_data[key] === val);
      }
    });

    return result.sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
  }, [allRecords, searchQuery, filterEmployeeId, filterDateRange, customFromDate, customToDate, genericFilters, searchableFields, isPhcController]);

  // KPIs
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = useMemo(() => filteredRecords.filter(r => r.record_date === todayStr).length, [filteredRecords]);
  const thisMonthCount = useMemo(() => {
    const m = new Date().getMonth();
    const y = new Date().getFullYear();
    return filteredRecords.filter(r => {
      const d = new Date(r.record_date);
      return d.getMonth() === m && d.getFullYear() === y;
    }).length;
  }, [filteredRecords]);
  
  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const currentRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  const clearFilters = () => {
    setSearchQuery('');
    setFilterEmployeeId('all');
    setFilterDateRange('this_month');
    setGenericFilters({});
    setPage(1);
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    
    auditService.logAction({
      action: 'DYNAMIC_RECORD_EXPORT',
      module: 'Reports' as any,
      record_description: `Exported ${filteredRecords.length} ${template?.register_name} records`,
    });

    const headers = ['अ.क्र.', 'Record Date', 'Employee', ...reportFields.map(f => f.field_label)];
    
    const rows = filteredRecords.map((r, i) => {
      const emp = employees.find(e => e.id === r.employee_id)?.name_marathi || r.employee_id;
      const rowData = [
        i + 1,
        r.record_date,
        emp,
        ...reportFields.map(f => {
          let val = r.record_data[f.field_key];
          // Handle commas and quotes in CSV
          if (val === null || val === undefined) val = '';
          val = val.toString().replace(/"/g, '""');
          return `"${val}"`;
        })
      ];
      return rowData.join(',');
    });

    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${template?.register_code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    auditService.logAction({
      action: 'DYNAMIC_RECORD_PRINT',
      module: 'Reports' as any,
      record_description: `Printed ${template?.register_name}`,
    });
    window.print();
  };

  const handleEditSave = async (data: any) => {
    if (!editRecord || !templateId) return;
    try {
      const updatedRecord: DynamicRecordEntry = {
        ...editRecord,
        record_data: data,
        updated_at: new Date().toISOString(),
      };
      await templateService.saveDynamicRecord(updatedRecord);
      
      auditService.logAction({
        action: 'DYNAMIC_RECORD_UPDATE',
        module: 'Reports' as any,
        record_description: `Edited Record: ${template?.register_name}`,
      });

      setEditRecord(null);
      loadData();
    } catch (e) {
      alert('Error saving record');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('ही नोंद खरोखर हटवायची आहे का?')) {
      alert('Delete feature coming soon (API requires delete method).');
      auditService.logAction({
        action: 'DYNAMIC_RECORD_DELETE',
        module: 'Reports' as any,
        record_description: `Deleted Record`,
      });
      // In a real app we'd call templateService.deleteRecord(id)
    }
  };

  if (loading || !template) return <div className="p-8 text-center text-slate-500">अहवाल लोड होत आहे...</div>;

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('reports')} className="p-2 bg-white rounded-full shadow-sm text-slate-600 hover:text-slate-900 border border-slate-200">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{template.register_name}</h1>
            <p className="text-sm text-slate-500 mt-1">{template.program_name}</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={handlePrint} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50">
            <Printer className="w-4 h-4" /> <span className="hidden sm:inline">प्रिंट</span>
          </button>
          <button onClick={handleExportCSV} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-100">
            <Download className="w-4 h-4" /> <span>CSV Export</span>
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{template.register_name}</h1>
        <p className="text-slate-600">{template.program_name}</p>
        <p className="text-sm text-slate-500 mt-2">एकूण नोंदी: {filteredRecords.length}</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">एकूण नोंदी</p>
              <h4 className="text-xl font-bold text-slate-800">{filteredRecords.length}</h4>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">आजच्या नोंदी</p>
              <h4 className="text-xl font-bold text-slate-800">{todayCount}</h4>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">या महिन्यातील</p>
              <h4 className="text-xl font-bold text-slate-800">{thisMonthCount}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="माहिती शोधा..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-sm"
            />
          </div>
          
          <select
            value={filterDateRange}
            onChange={(e) => { setFilterDateRange(e.target.value); setPage(1); }}
            className="w-full md:w-48 px-3 py-2 border border-slate-300 rounded-xl text-sm bg-slate-50"
          >
            <option value="all">सर्व दिनांक</option>
            <option value="today">आज</option>
            <option value="yesterday">काल</option>
            <option value="this_week">या आठवड्यात</option>
            <option value="this_month">या महिन्यात</option>
            <option value="this_year">या वर्षात</option>
            <option value="custom">कस्टम (Custom)</option>
          </select>

          {isPhcController && (
            <select
              value={filterEmployeeId}
              onChange={(e) => { setFilterEmployeeId(e.target.value); setPage(1); }}
              className="w-full md:w-48 px-3 py-2 border border-slate-300 rounded-xl text-sm bg-slate-50"
            >
              <option value="all">सर्व कर्मचारी</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name_marathi}</option>)}
            </select>
          )}
        </div>

        {filterDateRange === 'custom' && (
          <div className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">पासून (From Date)</label>
              <input type="date" value={customFromDate} onChange={e => setCustomFromDate(e.target.value)} className="w-full text-sm p-2 border border-slate-300 rounded-lg" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">पर्यंत (To Date)</label>
              <input type="date" value={customToDate} onChange={e => setCustomToDate(e.target.value)} className="w-full text-sm p-2 border border-slate-300 rounded-lg" />
            </div>
          </div>
        )}

        {filterableFields.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100">
            {filterableFields.map(f => (
              <select
                key={f.id}
                value={genericFilters[f.field_key] || 'all'}
                onChange={(e) => {
                  setGenericFilters({...genericFilters, [f.field_key]: e.target.value});
                  setPage(1);
                }}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700"
              >
                <option value="all">सर्व {f.field_label}</option>
                {Array.isArray(f.options_json) && f.options_json.map((opt: any, i: number) => (
                  <option key={i} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button onClick={clearFilters} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <X className="w-3 h-3" /> फिल्टर साफ करा
          </button>
        </div>
      </div>

      {/* Table / Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse print:text-[10px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider print:bg-white print:border-b-2 print:border-slate-800">
                <th className="p-4 py-3 print:p-2">अ.क्र.</th>
                <th className="p-4 py-3 print:p-2">Date</th>
                {isPhcController && <th className="p-4 py-3 print:p-2">Employee</th>}
                {listFields.map(f => (
                  <th key={f.id} className="p-4 py-3 print:p-2">{f.field_label}</th>
                ))}
                <th className="p-4 py-3 text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm print:text-[10px] print:divide-slate-300">
              {currentRecords.map((r, i) => {
                const empName = employees.find(e => e.id === r.employee_id)?.name_marathi || 'Unknown';
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 py-3 print:p-2 font-medium text-slate-500">{(page - 1) * pageSize + i + 1}</td>
                    <td className="p-4 py-3 print:p-2 text-slate-800 font-medium whitespace-nowrap">{r.record_date}</td>
                    {isPhcController && (
                      <td className="p-4 py-3 print:p-2 text-slate-600">
                        {empName}
                      </td>
                    )}
                    {listFields.map(f => (
                      <td key={f.id} className="p-4 py-3 print:p-2 text-slate-700">
                        {r.record_data[f.field_key] || '-'}
                      </td>
                    ))}
                    <td className="p-4 py-3 text-right flex justify-end gap-2 print:hidden">
                      <button onClick={() => setViewRecord(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditRecord(r)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {currentRecords.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">
                    या निवडलेल्या कालावधी/फिल्टरसाठी कोणतीही नोंद उपलब्ध नाही.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div className="text-sm text-slate-600">
              एकूण <strong>{filteredRecords.length}</strong> नोंदी (Page {page} of {totalPages})
            </div>
            <div className="flex items-center gap-2">
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs mr-2">
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 bg-white border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50"><ChevronLeft className="w-5 h-5"/></button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 bg-white border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50"><ChevronRight className="w-5 h-5"/></button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-white/90 backdrop-blur-md p-4 border-b border-slate-100 flex justify-between items-center z-10">
              <h3 className="font-bold text-lg text-slate-800">नोंद तपशील</h3>
              <button onClick={() => setViewRecord(null)} className="text-slate-400 hover:text-slate-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl">
                <div><span className="text-slate-500 block text-xs">Record Date</span><span className="font-semibold text-slate-800">{viewRecord.record_date}</span></div>
                <div><span className="text-slate-500 block text-xs">Employee</span><span className="font-semibold text-slate-800">{employees.find(e => e.id === viewRecord.employee_id)?.name_marathi || '-'}</span></div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <h4 className="font-bold text-slate-700 mb-3 text-sm">फॉर्म मधील माहिती</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  {reportFields.map(f => (
                    <div key={f.id} className="border-b border-slate-50 pb-2">
                      <span className="text-slate-500 block text-xs mb-1">{f.field_label}</span>
                      <span className="font-medium text-slate-800">{viewRecord.record_data[f.field_key] || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button onClick={() => setViewRecord(null)} className="px-6 py-2 bg-slate-200 text-slate-800 rounded-xl font-medium hover:bg-slate-300">बंद करा</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-white/90 backdrop-blur-md p-4 border-b border-slate-100 flex justify-between items-center z-10">
              <h3 className="font-bold text-lg text-slate-800">नोंद दुरुस्ती (Edit)</h3>
              <button onClick={() => setEditRecord(null)} className="text-slate-400 hover:text-slate-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-2">
              <DynamicRecordForm 
                fields={fields} 
                initialData={editRecord.record_data} 
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
