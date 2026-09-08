import React, { useState, useEffect } from 'react';
import { PageId, TBPatientRecord } from '../types';
import { tbService, formatIndianDate } from '../services/tbService';
import { masterDataService } from '../services/masterDataService';
import { Download, Printer, Search, Filter, Activity, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface TBReportsPageProps {
  onNavigate: (page: PageId) => void;
}

export const TBReportsPage: React.FC<TBReportsPageProps> = ({ onNavigate }) => {
  const { user, role } = useAuth();
  const [records, setRecords] = useState<TBPatientRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<TBPatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');
  const [selectedSampleType, setSelectedSampleType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [villages, setVillages] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedVillage, selectedSampleType, selectedLocation, records]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const v = await masterDataService.getVillages();
      setVillages(v);
      
      let filter = {};
      if (role === 'subcentre_employee' && user?.phcId) {
        filter = { phc_id: user.phcId };
      }
      const data = await tbService.getSamples(filter);
      
      // Additional client-side role filtering just in case
      let finalData = data;
      if (role === 'subcentre_employee' && user?.employeeId) {
        finalData = data.filter(d => d.employee_id === user.employeeId);
      }
      
      setRecords(finalData);
      setFilteredRecords(finalData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let result = records;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.patient_name.toLowerCase().includes(q) ||
        (r.mobile_number && r.mobile_number.includes(q)) ||
        (r.nikshay_id && r.nikshay_id.toLowerCase().includes(q))
      );
    }

    if (selectedVillage) {
      result = result.filter(r => r.village_id === selectedVillage);
    }

    if (selectedSampleType) {
      result = result.filter(r => r.sample_type === selectedSampleType);
    }

    if (selectedLocation) {
      result = result.filter(r => r.sample_given_at === selectedLocation);
    }

    setFilteredRecords(result);
  };

  const exportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      'अ.क्र.', 'संशयित रुग्णाचे नाव', 'वय', 'लिंग', 'मोबाईल', 'निक्षय ID',
      'नमुना घेतल्याचा दिनांक', 'नमुना पाठवण्याचा दिनांक', 'जोखीम प्रकार', 'नमुना प्रकार', 'कोठे दिला'
    ];
    
    const rows = filteredRecords.map((r, index) => [
      index + 1,
      r.patient_name,
      r.age,
      r.gender === 'Male' ? 'पुरुष' : r.gender === 'Female' ? 'स्त्री' : 'इतर',
      r.mobile_number || '-',
      r.nikshay_id || '-',
      formatIndianDate(r.sample_collection_date),
      formatIndianDate(r.sample_sent_date),
      r.risk_type,
      r.sample_type,
      r.sample_given_at === 'PHC_BHADA' ? 'प्राथमिक आरोग्य केंद्र भादा' : r.sample_given_at === 'RURAL_HOSPITAL_AUSA' ? 'ग्रामीण रुग्णालय औसा' : '-'
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(v => `"\${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `TB_Register_Report_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html lang="mr">
      <head>
        <meta charset="UTF-8">
        <title>TB Register Print</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          h1 { text-align: center; color: #065f46; font-size: 18px; margin-bottom: 5px; }
          h2 { text-align: center; color: #334155; font-size: 14px; margin-top: 0; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background-color: #f8fafc; font-weight: bold; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>राष्ट्रीय क्षयरोग नियंत्रण कार्यक्रम</h1>
        <h2>संशयित रुग्ण नमुना नोंदवही</h2>
        <table>
          <thead>
            <tr>
              <th>अ.क्र.</th>
              <th>संशयित रुग्णाचे नाव</th>
              <th>वय</th>
              <th>लिंग</th>
              <th>मोबाईल</th>
              <th>निक्षय ID</th>
              <th>नमुना दिनांक</th>
              <th>पाठवल्याचा दिनांक</th>
              <th>जोखीम प्रकार</th>
              <th>नमुना प्रकार</th>
              <th>कोठे दिला</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRecords.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${r.patient_name}</td>
                <td>${r.age}</td>
                <td>${r.gender === 'Male' ? 'पुरुष' : r.gender === 'Female' ? 'स्त्री' : 'इतर'}</td>
                <td>${r.mobile_number || '-'}</td>
                <td>${r.nikshay_id || '-'}</td>
                <td>${formatIndianDate(r.sample_collection_date)}</td>
                <td>${formatIndianDate(r.sample_sent_date)}</td>
                <td>${r.risk_type}</td>
                <td>${r.sample_type}</td>
                <td>${r.sample_given_at === 'PHC_BHADA' ? 'प्राथमिक आरोग्य केंद्र भादा' : r.sample_given_at === 'RURAL_HOSPITAL_AUSA' ? 'ग्रामीण रुग्णालय औसा' : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <div>PHC: ${user?.phcId ? 'भादा' : 'All'}</div>
          <div>Report Date: ${formatIndianDate(new Date().toISOString())}</div>
        </div>
        <script>
          window.onload = () => { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">TB अहवाल</h1>
            <p className="text-xs text-slate-500">राष्ट्रीय क्षयरोग नियंत्रण कार्यक्रम सांख्यिकी</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm flex items-center gap-2 cursor-pointer transition-colors">
            <Download className="w-4 h-4" /> CSV Export
          </button>
          <button onClick={printReport} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-sm flex items-center gap-2 cursor-pointer transition-colors">
            <Printer className="w-4 h-4" /> Print (A4)
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text"
              placeholder="नाव, मोबाईल, निक्षय ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <select value={selectedVillage} onChange={e => setSelectedVillage(e.target.value)} className="w-full p-2 text-sm border border-slate-300 rounded-lg">
            <option value="">सर्व गावे</option>
            {villages.filter(v => role === 'phc_controller' || v.subcentre_id === user?.subcentreId).map(v => (
              <option key={v.id} value={v.id}>{v.nameMarathi}</option>
            ))}
          </select>
          <select value={selectedSampleType} onChange={e => setSelectedSampleType(e.target.value)} className="w-full p-2 text-sm border border-slate-300 rounded-lg">
            <option value="">सर्व नमुना प्रकार</option>
            <option value="Sputum">Sputum</option>
            <option value="X-Ray">X-Ray</option>
            <option value="LPA">LPA</option>
            <option value="Followup Sputum">Followup Sputum</option>
            <option value="FoodBasket">FoodBasket</option>
          </select>
          <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} className="w-full p-2 text-sm border border-slate-300 rounded-lg">
            <option value="">सर्व लोकेशन्स</option>
            <option value="PHC_BHADA">PHC भादा</option>
            <option value="RURAL_HOSPITAL_AUSA">ग्रामीण रुग्णालय औसा</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">संशयित रुग्णाचे नाव</th>
                <th className="px-4 py-3 text-center">वय / लिंग</th>
                <th className="px-4 py-3">निक्षय ID</th>
                <th className="px-4 py-3 text-center">नमुना दिनांक</th>
                <th className="px-4 py-3 text-center">प्रकार</th>
                <th className="px-4 py-3">कोठे दिला</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">माहिती लोड होत आहे...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">कोणतीही नोंद आढळली नाही.</td></tr>
              ) : (
                filteredRecords.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {r.patient_name}
                      {r.mobile_number && <div className="text-xs text-slate-500 font-normal">{r.mobile_number}</div>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        {r.age} / {r.gender === 'Male' ? 'M' : r.gender === 'Female' ? 'F' : 'O'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.nikshay_id || '-'}</td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {formatIndianDate(r.sample_collection_date)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold \${
                        r.sample_type === 'FoodBasket' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {r.sample_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {r.sample_given_at === 'PHC_BHADA' ? 'PHC भादा' : r.sample_given_at === 'RURAL_HOSPITAL_AUSA' ? 'RH औसा' : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
