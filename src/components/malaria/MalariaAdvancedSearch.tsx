import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Calendar,
  X,
  FileSpreadsheet,
  Edit2,
  Send,
  Printer,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { malariaService, formatSampleNumber } from '../../services/malariaService';
import { MalariaBloodSample, PageId, PhcMaster, SubcentreMaster, VillageMaster, EmployeeMaster } from '../../types';

interface Props {
  isPhcController: boolean;
  selectedPhcId: string;
  selectedEmployeeId: string;
  phcs: PhcMaster[];
  subcentres: SubcentreMaster[];
  villages: VillageMaster[];
  employees: EmployeeMaster[];
  onEdit: (s: MalariaBloodSample) => void;
  onDelete: (s: MalariaBloodSample) => void;
  onNavigate: (page: PageId) => void;
  refreshTrigger: number;
}

export const MalariaAdvancedSearch: React.FC<Props> = ({
  isPhcController,
  selectedPhcId,
  selectedEmployeeId,
  phcs,
  subcentres,
  villages,
  employees,
  onEdit,
  onDelete,
  onNavigate,
  refreshTrigger
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MalariaBloodSample[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPhc, setFilterPhc] = useState(selectedPhcId || '');
  const [filterSubcentre, setFilterSubcentre] = useState('');
  const [filterVillage, setFilterVillage] = useState('');
  const [filterEmployee, setFilterEmployee] = useState(isPhcController ? '' : selectedEmployeeId);
  const [filterSmearCode, setFilterSmearCode] = useState('');
  const [filterGender, setFilterGender] = useState('सर्व');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'SENT'>('ALL');
  
  const [filterColDateRange, setFilterColDateRange] = useState('');
  const [customColFrom, setCustomColFrom] = useState('');
  const [customColTo, setCustomColTo] = useState('');

  const [filterSentDateRange, setFilterSentDateRange] = useState('');
  const [customSentFrom, setCustomSentFrom] = useState('');
  const [customSentTo, setCustomSentTo] = useState('');

  const [filterSampleFrom, setFilterSampleFrom] = useState('');
  const [filterSampleTo, setFilterSampleTo] = useState('');
  
  const [exactSampleNumber, setExactSampleNumber] = useState('');

  // Pagination & Sorting
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MalariaBloodSample | null>(null);

  const applyFilters = useCallback(async () => {
    setLoading(true);
    try {
      // Resolve date ranges
      const today = new Date();
      let cFrom = customColFrom;
      let cTo = customColTo;
      if (filterColDateRange === 'today') { cFrom = cTo = today.toISOString().split('T')[0]; }
      if (filterColDateRange === 'yesterday') { const y = new Date(); y.setDate(y.getDate()-1); cFrom = cTo = y.toISOString().split('T')[0]; }
      if (filterColDateRange === 'last7') { const y = new Date(); y.setDate(y.getDate()-7); cFrom = y.toISOString().split('T')[0]; cTo = today.toISOString().split('T')[0]; }
      if (filterColDateRange === 'this_month') { cFrom = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`; cTo = today.toISOString().split('T')[0]; }
      if (filterColDateRange === 'this_year') { cFrom = `${today.getFullYear()}-01-01`; cTo = today.toISOString().split('T')[0]; }

      let sFrom = customSentFrom;
      let sTo = customSentTo;
      if (filterSentDateRange === 'today') { sFrom = sTo = today.toISOString().split('T')[0]; }
      if (filterSentDateRange === 'this_month') { sFrom = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`; sTo = today.toISOString().split('T')[0]; }

      // Force employee restriction for subcentre staff
      const empId = isPhcController ? filterEmployee : selectedEmployeeId;

      const res = await malariaService.searchSamples({
        searchQuery,
        phc_id: filterPhc || undefined,
        subcentre_id: filterSubcentre || undefined,
        village_id: filterVillage || undefined,
        employee_id: empId || undefined,
        smear_code: filterSmearCode || undefined,
        gender: filterGender,
        status: filterStatus,
        collection_date_from: cFrom || undefined,
        collection_date_to: cTo || undefined,
        sent_date_from: sFrom || undefined,
        sent_date_to: sTo || undefined,
        sample_number_from: filterSampleFrom ? parseInt(filterSampleFrom) : undefined,
        sample_number_to: filterSampleTo ? parseInt(filterSampleTo) : undefined,
        exact_sample_number: exactSampleNumber ? parseInt(exactSampleNumber) : undefined,
        limit,
        offset,
        sortBy,
        sortOrder
      });
      setData(res.data);
      setTotalCount(res.count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    searchQuery, filterPhc, filterSubcentre, filterVillage, filterEmployee, 
    filterSmearCode, filterGender, filterStatus, filterColDateRange, customColFrom, customColTo,
    filterSentDateRange, customSentFrom, customSentTo, filterSampleFrom, filterSampleTo, exactSampleNumber,
    limit, offset, sortBy, sortOrder, isPhcController, selectedEmployeeId
  ]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters, refreshTrigger]);

  const clearFilters = () => {
    setSearchQuery('');
    setFilterPhc(selectedPhcId || '');
    setFilterSubcentre('');
    setFilterVillage('');
    setFilterEmployee(isPhcController ? '' : selectedEmployeeId);
    setFilterSmearCode('');
    setFilterGender('सर्व');
    setFilterStatus('ALL');
    setFilterColDateRange('');
    setCustomColFrom('');
    setCustomColTo('');
    setFilterSentDateRange('');
    setCustomSentFrom('');
    setCustomSentTo('');
    setFilterSampleFrom('');
    setFilterSampleTo('');
    setExactSampleNumber('');
    setOffset(0);
    setSortBy('created_at');
    setSortOrder('desc');
  };

  const handlePrint = (sample: MalariaBloodSample) => {
    // Navigate to reports or open print window (since existing logic handles print there)
    // Actually we can just tell them to use report page.
    alert('नोंद प्रिंट करण्यासाठी "या निकालाचा अहवाल" बटण वापरा.');
  };

  const formatDate = (d: string) => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('mr-IN');
  };

  return (
    <div className="space-y-4">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-700" />
            <span>रक्त नमुना शोधा (Advanced Search)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {loading ? 'शोधत आहे...' : totalCount > 0 ? `एकूण ${totalCount} नोंदी सापडल्या` : 'दिलेल्या निकषांनुसार कोणतीही रक्त नमुना नोंद सापडली नाही.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onNavigate('reports')} className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-1">
            <Printer className="w-3.5 h-3.5" />
            या निकालाचा अहवाल
          </button>
        </div>
      </div>

      {/* Main Search Bar */}
      <div className="flex gap-2 relative z-10">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="रुग्णाचे नाव / घर क्रमांक / नमुना क्रमांक / Smear Code / गाव शोधा..."
            className="w-full text-sm pl-10 pr-3 py-3 rounded-xl border border-slate-300 shadow-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-xl border flex items-center gap-2 font-bold text-sm transition-colors ${showFilters ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">फिल्टर्स</span>
        </button>
      </div>

      {/* Quick Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { label: 'आजचे', act: () => { setFilterColDateRange('today'); setFilterStatus('ALL'); setOffset(0); } },
          { label: 'मागील 7 दिवस', act: () => { setFilterColDateRange('last7'); setFilterStatus('ALL'); setOffset(0); } },
          { label: 'या महिन्यातील', act: () => { setFilterColDateRange('this_month'); setFilterStatus('ALL'); setOffset(0); } },
          { label: 'Pending', act: () => { setFilterStatus('PENDING'); setFilterColDateRange(''); setOffset(0); } },
          { label: 'आज पाठविलेले', act: () => { setFilterSentDateRange('today'); setFilterStatus('SENT'); setOffset(0); } },
          { label: 'या वर्षातील', act: () => { setFilterColDateRange('this_year'); setFilterStatus('ALL'); setOffset(0); } },
        ].map((chip, idx) => (
          <button key={idx} onClick={chip.act} className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-full text-xs font-semibold cursor-pointer">
            {chip.label}
          </button>
        ))}
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-inner grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs relative z-0">
          
          {isPhcController && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">कर्मचारी (Employee)</label>
              <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
                <option value="">सर्व कर्मचारी</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.employee_name} ({emp.malaria_smear_code})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">गाव (Village)</label>
            <select value={filterVillage} onChange={(e) => setFilterVillage(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
              <option value="">सर्व गावे</option>
              {villages.map(v => <option key={v.id} value={v.id}>{v.village_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Smear Code</label>
            <input type="text" value={filterSmearCode} onChange={(e) => setFilterSmearCode(e.target.value)} placeholder="उदा. ANM-1" className="w-full p-2 border border-slate-300 rounded-lg" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">लिंग (Gender)</label>
            <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
              <option value="सर्व">सर्व</option>
              <option value="पुरुष">पुरुष</option>
              <option value="स्त्री">स्त्री</option>
              <option value="इतर">इतर</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">स्थिती (Status)</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="w-full p-2 border border-slate-300 rounded-lg">
              <option value="ALL">सर्व</option>
              <option value="PENDING">Pending (प्रलंबित)</option>
              <option value="SENT">Sent (पाठविले)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">नमुना संकलन दिनांक</label>
            <select value={filterColDateRange} onChange={(e) => setFilterColDateRange(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
              <option value="">सर्व</option>
              <option value="today">आज (Today)</option>
              <option value="yesterday">काल (Yesterday)</option>
              <option value="last7">मागील 7 दिवस</option>
              <option value="this_month">या महिन्यातील</option>
              <option value="this_year">या वर्षातील</option>
              <option value="custom">Custom Range</option>
            </select>
            {filterColDateRange === 'custom' && (
              <div className="flex gap-2 mt-2">
                <input type="date" value={customColFrom} onChange={e=>setCustomColFrom(e.target.value)} className="w-1/2 p-1.5 border border-slate-300 rounded text-[10px]" />
                <input type="date" value={customColTo} onChange={e=>setCustomColTo(e.target.value)} className="w-1/2 p-1.5 border border-slate-300 rounded text-[10px]" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">पाठविलेला दिनांक</label>
            <select value={filterSentDateRange} onChange={(e) => setFilterSentDateRange(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
              <option value="">सर्व</option>
              <option value="today">आज (Today)</option>
              <option value="this_month">या महिन्यातील</option>
              <option value="custom">Custom Range</option>
            </select>
            {filterSentDateRange === 'custom' && (
              <div className="flex gap-2 mt-2">
                <input type="date" value={customSentFrom} onChange={e=>setCustomSentFrom(e.target.value)} className="w-1/2 p-1.5 border border-slate-300 rounded text-[10px]" />
                <input type="date" value={customSentTo} onChange={e=>setCustomSentTo(e.target.value)} className="w-1/2 p-1.5 border border-slate-300 rounded text-[10px]" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">नमुना क्रमांक श्रेणी (उदा. 1 ते 50)</label>
            <div className="flex gap-2">
              <input type="number" placeholder="From" value={filterSampleFrom} onChange={e => setFilterSampleFrom(e.target.value)} className="w-1/2 p-2 border border-slate-300 rounded-lg" />
              <input type="number" placeholder="To" value={filterSampleTo} onChange={e => setFilterSampleTo(e.target.value)} className="w-1/2 p-2 border border-slate-300 rounded-lg" />
            </div>
          </div>
          
          <div className="col-span-1 sm:col-span-2 md:col-span-4 flex justify-between items-center mt-2 border-t border-slate-200 pt-3">
             <button onClick={clearFilters} className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1">
               <Trash2 className="w-4 h-4" /> फिल्टर साफ करा
             </button>
             <div className="flex items-center gap-3">
               <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-slate-500">Sort:</span>
                 <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="p-1.5 border border-slate-300 rounded bg-white font-medium">
                   <option value="created_at">नवीनतम प्रथम</option>
                   <option value="sample_number">Sample Number</option>
                   <option value="patient_name">Patient Name (A-Z)</option>
                   <option value="collection_date">Collection Date</option>
                 </select>
                 <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="p-1.5 border border-slate-300 rounded bg-white font-medium">
                   <option value="desc">Desc</option>
                   <option value="asc">Asc</option>
                 </select>
               </div>
               <button onClick={applyFilters} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold">
                 Apply
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Results View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">लोड होत आहे...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            कोणतीही रक्त नमुना नोंद सापडली नाही.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-3 text-center">No.</th>
                    <th className="px-3 py-3">Patient Name</th>
                    <th className="px-3 py-3">Village / House No</th>
                    <th className="px-3 py-3">Age/Gender</th>
                    <th className="px-3 py-3 text-center">Collection Dt.</th>
                    <th className="px-3 py-3 text-center">Sent Dt.</th>
                    <th className="px-3 py-3">Smear Code</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-3 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-center font-mono font-bold text-slate-900">
                        {formatSampleNumber(item.sample_number)}
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-900">{item.patient_name}</td>
                      <td className="px-3 py-2">
                        {item.village_name} <span className="text-slate-400">({item.house_number || '-'})</span>
                      </td>
                      <td className="px-3 py-2">{item.age} / {item.gender}</td>
                      <td className="px-3 py-2 text-center">{formatDate(item.sample_collection_date)}</td>
                      <td className="px-3 py-2 text-center">{item.sent_date ? formatDate(item.sent_date) : '-'}</td>
                      <td className="px-3 py-2 font-mono text-[10px] bg-slate-100">{item.malaria_smear_code}</td>
                      <td className="px-3 py-2 text-center">
                        {item.sent_date ? (
                           <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">Sent</span>
                        ) : (
                           <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center flex items-center justify-center gap-1.5">
                        <button onClick={() => setSelectedRecord(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View">
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        {(isPhcController || item.employee_id === selectedEmployeeId) && (
                           <>
                             <button onClick={() => onEdit(item)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Edit">
                               <Edit2 className="w-4 h-4" />
                             </button>
                             <button onClick={() => onDelete(item)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded" title="Delete">
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </>
                        )}
                        {!item.sent_date && (
                          <button onClick={() => onNavigate('send-samples')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Send Sample">
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {data.map((item) => (
                <div key={item.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{item.patient_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.village_name} | घर: {item.house_number || '-'}</div>
                    </div>
                    <div className="bg-slate-100 text-slate-900 font-mono font-bold text-sm px-2 py-1 rounded border border-slate-200">
                      #{formatSampleNumber(item.sample_number)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(item.sample_collection_date)}</span>
                    <span className="flex items-center gap-1">
                       {item.sent_date ? (
                         <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Sent: {formatDate(item.sent_date)}</span>
                       ) : (
                         <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Pending</span>
                       )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                    <button onClick={() => setSelectedRecord(item)} className="flex-1 py-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded text-center">
                      View
                    </button>
                    {(isPhcController || item.employee_id === selectedEmployeeId) && (
                      <>
                        <button onClick={() => onEdit(item)} className="flex-1 py-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded text-center">
                          Edit
                        </button>
                        <button onClick={() => onDelete(item)} className="flex-1 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded text-center">
                          Delete
                        </button>
                      </>
                    )}
                    {!item.sent_date && (
                      <button onClick={() => onNavigate('send-samples')} className="flex-1 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded text-center">
                        Send
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="p-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
               <div className="text-slate-600">
                 Page {Math.floor(offset / limit) + 1} of {Math.ceil(totalCount / limit) || 1}
               </div>
               <div className="flex items-center gap-2">
                 <button 
                   disabled={offset === 0} 
                   onClick={() => setOffset(Math.max(0, offset - limit))}
                   className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-700 disabled:opacity-50"
                 >
                   मागे (Prev)
                 </button>
                 <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0); }} className="p-1.5 border border-slate-300 rounded bg-white">
                   <option value="25">25 per page</option>
                   <option value="50">50 per page</option>
                   <option value="100">100 per page</option>
                 </select>
                 <button 
                   disabled={offset + limit >= totalCount}
                   onClick={() => setOffset(offset + limit)}
                   className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-700 disabled:opacity-50"
                 >
                   पुढे (Next)
                 </button>
               </div>
            </div>
          </>
        )}
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-full">
            <div className="bg-emerald-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <h3 className="font-bold flex items-center gap-2 text-sm sm:text-base">
                <FileSpreadsheet className="w-5 h-5" />
                <span>रक्त नमुना तपशील (Sample No. {formatSampleNumber(selectedRecord.sample_number)})</span>
              </h3>
              <button onClick={() => setSelectedRecord(null)} className="text-white/80 hover:text-white bg-white/10 p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 sm:p-6 overflow-y-auto">
               <div className="space-y-4">
                 
                 <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                   <div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">रुग्णाचे नाव</div>
                     <div className="text-sm font-black text-slate-900">{selectedRecord.patient_name}</div>
                   </div>
                   <div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">वय / लिंग</div>
                     <div className="text-sm font-bold text-slate-700">{selectedRecord.age} वर्षे, {selectedRecord.gender}</div>
                   </div>
                   <div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">गाव</div>
                     <div className="text-sm font-bold text-slate-700">{selectedRecord.village_name}</div>
                   </div>
                   <div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">घर क्रमांक</div>
                     <div className="text-sm font-bold text-slate-700">{selectedRecord.house_number || '-'}</div>
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                   <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                     <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">नमुना संकलन दिनांक</div>
                     <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                       <Calendar className="w-4 h-4 text-emerald-600" />
                       {formatDate(selectedRecord.sample_collection_date)}
                     </div>
                   </div>
                   <div className={`p-3 rounded-xl border ${selectedRecord.sent_date ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                     <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${selectedRecord.sent_date ? 'text-emerald-700' : 'text-amber-700'}`}>पाठविलेला दिनांक</div>
                     <div className={`text-sm font-black flex items-center gap-1.5 ${selectedRecord.sent_date ? 'text-emerald-900' : 'text-amber-900'}`}>
                       <Send className="w-4 h-4" />
                       {selectedRecord.sent_date ? formatDate(selectedRecord.sent_date) : 'Pending'}
                     </div>
                   </div>
                 </div>

                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">PHC</div>
                       <div className="text-xs font-semibold text-slate-700">{selectedRecord.phc_name}</div>
                     </div>
                     <div>
                       <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Subcentre</div>
                       <div className="text-xs font-semibold text-slate-700">{selectedRecord.subcentre_name}</div>
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Employee</div>
                       <div className="text-xs font-semibold text-slate-700">{selectedRecord.employee_name}</div>
                     </div>
                     <div>
                       <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Smear Code</div>
                       <div className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300 inline-block">{selectedRecord.malaria_smear_code}</div>
                     </div>
                   </div>
                 </div>

                 <div className="text-[10px] text-slate-400 text-center font-mono">
                    Created At: {new Date(selectedRecord.created_at || '').toLocaleString('mr-IN')}
                 </div>

               </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
               <button onClick={() => { setSelectedRecord(null); onEdit(selectedRecord); }} className="px-5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 font-bold rounded-lg text-sm transition-colors cursor-pointer flex items-center gap-2">
                 <Edit2 className="w-4 h-4" /> Edit Record
               </button>
               <button onClick={() => setSelectedRecord(null)} className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-sm transition-colors cursor-pointer">
                 Close
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
