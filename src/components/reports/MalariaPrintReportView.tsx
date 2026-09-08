import React from 'react';
import { MalariaBloodSample } from '../../types';
import { formatIndianDate, formatSampleNumber } from '../../services/malariaService';

export interface PrintReportMetadata {
  reportTitleMarathi: string;
  phcName: string;
  subcentreName: string;
  villageName: string;
  employeeName: string;
  dateRangeText: string;
  generatedDate: string;
}

interface MalariaPrintReportViewProps {
  metadata: PrintReportMetadata;
  activeTab: 'collection' | 'daily' | 'monthly' | 'yearly' | 'employee' | 'village' | 'subcentre';
  samples: MalariaBloodSample[];
  employeeSummary: Array<{
    name: string;
    designation: string;
    smearCode: string;
    total: number;
    sent: number;
    pending: number;
  }>;
  villageSummary: Array<{
    name: string;
    population: number;
    houses: number;
    total: number;
    sent: number;
    pending: number;
  }>;
  subcentreSummary: Array<{
    name: string;
    population: number;
    houses: number;
    total: number;
    sent: number;
    pending: number;
  }>;
  monthlyStats?: {
    monthYear: string;
    total: number;
    sent: number;
    pending: number;
  };
  dailyStats?: {
    date: string;
    total: number;
    sent: number;
    pending: number;
  };
}

export const MalariaPrintReportView: React.FC<MalariaPrintReportViewProps> = ({
  metadata,
  activeTab,
  samples,
  employeeSummary,
  villageSummary,
  subcentreSummary,
  monthlyStats,
  dailyStats,
}) => {
  return (
    <div id="printable-malaria-general-report" className="hidden print:block font-sans text-black">
      {/* Official Government Header */}
      <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
        <div className="text-xs uppercase tracking-wider font-semibold text-slate-700">
          महाराष्ट्र शासन - सार्वजनिक आरोग्य विभाग
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-950 mt-1">
          राष्ट्रीय हिवताप नियंत्रण कार्यक्रम
        </h1>
        <h2 className="text-base font-bold text-slate-900 mt-0.5">
          मलेरिया रक्त नमुना अहवाल ({metadata.reportTitleMarathi})
        </h2>
      </div>

      {/* Report Metadata Block */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border border-slate-300 bg-slate-50/50 p-2.5 rounded mb-4">
        <div>
          <span className="font-bold text-slate-700">प्राथमिक आरोग्य केंद्र (PHC): </span>
          <span className="font-semibold text-slate-900">{metadata.phcName || 'सर्व'}</span>
        </div>
        <div>
          <span className="font-bold text-slate-700">अहवाल कालावधी: </span>
          <span className="font-semibold text-slate-900">{metadata.dateRangeText}</span>
        </div>
        <div>
          <span className="font-bold text-slate-700">आरोग्य उपकेंद्र: </span>
          <span className="font-semibold text-slate-900">{metadata.subcentreName || 'सर्व'}</span>
        </div>
        <div>
          <span className="font-bold text-slate-700">दिनांक (Generated Date): </span>
          <span className="font-semibold text-slate-900">{metadata.generatedDate}</span>
        </div>
        <div>
          <span className="font-bold text-slate-700">गाव: </span>
          <span className="font-semibold text-slate-900">{metadata.villageName || 'सर्व'}</span>
        </div>
        <div>
          <span className="font-bold text-slate-700">कर्मचारी: </span>
          <span className="font-semibold text-slate-900">{metadata.employeeName || 'सर्व'}</span>
        </div>
      </div>

      {/* KPI Highlight Strip for Daily or Monthly */}
      {activeTab === 'daily' && dailyStats && (
        <div className="flex justify-around items-center border border-slate-300 bg-slate-100/60 p-2 text-xs font-bold mb-4">
          <div>दैनिक रक्त नमुने: {dailyStats.total}</div>
          <div>पाठविलेले नमुने: {dailyStats.sent}</div>
          <div>प्रलंबित नमुने: {dailyStats.pending}</div>
        </div>
      )}

      {activeTab === 'monthly' && monthlyStats && (
        <div className="flex justify-around items-center border border-slate-300 bg-slate-100/60 p-2 text-xs font-bold mb-4">
          <div>माहे: {monthlyStats.monthYear}</div>
          <div>एकूण रक्त नमुने: {monthlyStats.total}</div>
          <div>पाठविलेले: {monthlyStats.sent}</div>
          <div>प्रलंबित: {monthlyStats.pending}</div>
        </div>
      )}

      {/* Detailed Sample Collection Report Table */}
      {(activeTab === 'collection' || activeTab === 'daily') && (
        <div>
          <table className="w-full border-collapse border border-slate-400 text-[10px]">
            <thead>
              <tr className="bg-slate-200 font-bold text-slate-900 text-center">
                <th className="border border-slate-400 p-1 w-8">अ.क्र.</th>
                <th className="border border-slate-400 p-1">PHC</th>
                <th className="border border-slate-400 p-1">उपकेंद्र</th>
                <th className="border border-slate-400 p-1">गाव</th>
                <th className="border border-slate-400 p-1">कर्मचारी</th>
                <th className="border border-slate-400 p-1">मलेरिया स्मीअर कोड</th>
                <th className="border border-slate-400 p-1">मलेरिया घर क्र.</th>
                <th className="border border-slate-400 p-1">रुग्णाचे नाव</th>
                <th className="border border-slate-400 p-1 w-8">वय</th>
                <th className="border border-slate-400 p-1 w-10">लिंग</th>
                <th className="border border-slate-400 p-1">नमुना घेतल्याचा दिनांक</th>
                <th className="border border-slate-400 p-1">रक्त नमुना क्र.</th>
                <th className="border border-slate-400 p-1">पाठविल्याचा दिनांक</th>
                <th className="border border-slate-400 p-1">स्थिती</th>
              </tr>
            </thead>
            <tbody>
              {samples.length === 0 ? (
                <tr>
                  <td colSpan={14} className="border border-slate-400 p-4 text-center text-slate-500 italic">
                    या कालावधीत कोणतेही रक्त नमुने उपलब्ध नाहीत.
                  </td>
                </tr>
              ) : (
                samples.map((s, idx) => (
                  <tr key={s.id} className="text-center">
                    <td className="border border-slate-400 p-1">{idx + 1}</td>
                    <td className="border border-slate-400 p-1 text-left">{s.phc_name || '-'}</td>
                    <td className="border border-slate-400 p-1 text-left">{s.subcentre_name || '-'}</td>
                    <td className="border border-slate-400 p-1 text-left">{s.village_name || '-'}</td>
                    <td className="border border-slate-400 p-1 text-left">{s.employee_name || '-'}</td>
                    <td className="border border-slate-400 p-1 font-mono font-semibold">{s.malaria_smear_code}</td>
                    <td className="border border-slate-400 p-1">{s.house_number || '-'}</td>
                    <td className="border border-slate-400 p-1 text-left font-medium">{s.patient_name}</td>
                    <td className="border border-slate-400 p-1">{s.age}</td>
                    <td className="border border-slate-400 p-1">{s.gender}</td>
                    <td className="border border-slate-400 p-1">{formatIndianDate(s.sample_collection_date)}</td>
                    <td className="border border-slate-400 p-1 font-mono font-bold">
                      {formatSampleNumber(s.sample_number)}
                    </td>
                    <td className="border border-slate-400 p-1">
                      {s.sent_date ? formatIndianDate(s.sent_date) : '-'}
                    </td>
                    <td className="border border-slate-400 p-1 font-bold">
                      {s.sent_date ? 'पाठविले' : 'प्रलंबित'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Collection Summary */}
          <div className="mt-3 flex justify-between text-xs font-bold border-t border-slate-300 pt-2">
            <span>एकूण रक्त नमुने: {samples.length}</span>
            <span>पाठविलेले नमुने: {samples.filter((s) => Boolean(s.sent_date)).length}</span>
            <span>प्रलंबित नमुने: {samples.filter((s) => !s.sent_date).length}</span>
          </div>
        </div>
      )}

      {/* Employee-wise Summary Table */}
      {(activeTab === 'employee' || activeTab === 'monthly' || activeTab === 'yearly') && (
        <div className="mb-6">
          <div className="text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wide">
            कर्मचारीनिहाय अहवाल (Employee-wise Report)
          </div>
          <table className="w-full border-collapse border border-slate-400 text-xs">
            <thead>
              <tr className="bg-slate-200 font-bold text-slate-900 text-center">
                <th className="border border-slate-400 p-1.5 w-10">अ.क्र.</th>
                <th className="border border-slate-400 p-1.5 text-left">कर्मचारी</th>
                <th className="border border-slate-400 p-1.5 text-left">पदनाम</th>
                <th className="border border-slate-400 p-1.5">Malaria Smear Code</th>
                <th className="border border-slate-400 p-1.5">एकूण रक्त नमुने</th>
                <th className="border border-slate-400 p-1.5">पाठविलेले</th>
                <th className="border border-slate-400 p-1.5">प्रलंबित</th>
              </tr>
            </thead>
            <tbody>
              {employeeSummary.map((emp, idx) => (
                <tr key={emp.name + idx} className="text-center">
                  <td className="border border-slate-400 p-1.5">{idx + 1}</td>
                  <td className="border border-slate-400 p-1.5 text-left font-medium">{emp.name}</td>
                  <td className="border border-slate-400 p-1.5 text-left text-slate-700">{emp.designation || '-'}</td>
                  <td className="border border-slate-400 p-1.5 font-mono font-semibold">{emp.smearCode}</td>
                  <td className="border border-slate-400 p-1.5 font-bold">{emp.total}</td>
                  <td className="border border-slate-400 p-1.5 text-emerald-800 font-semibold">{emp.sent}</td>
                  <td className="border border-slate-400 p-1.5 text-amber-800 font-semibold">{emp.pending}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold text-center">
                <td colSpan={4} className="border border-slate-400 p-1.5 text-right pr-3">
                  एकूण (Total):
                </td>
                <td className="border border-slate-400 p-1.5">
                  {employeeSummary.reduce((sum, e) => sum + e.total, 0)}
                </td>
                <td className="border border-slate-400 p-1.5">
                  {employeeSummary.reduce((sum, e) => sum + e.sent, 0)}
                </td>
                <td className="border border-slate-400 p-1.5">
                  {employeeSummary.reduce((sum, e) => sum + e.pending, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Village-wise Summary Table */}
      {(activeTab === 'village' || activeTab === 'yearly') && (
        <div className="mb-6">
          <div className="text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wide">
            गावनिहाय अहवाल (Village-wise Report)
          </div>
          <table className="w-full border-collapse border border-slate-400 text-xs">
            <thead>
              <tr className="bg-slate-200 font-bold text-slate-900 text-center">
                <th className="border border-slate-400 p-1.5 w-10">अ.क्र.</th>
                <th className="border border-slate-400 p-1.5 text-left">गाव</th>
                <th className="border border-slate-400 p-1.5">लोकसंख्या</th>
                <th className="border border-slate-400 p-1.5">एकूण घरसंख्या</th>
                <th className="border border-slate-400 p-1.5">एकूण रक्त नमुने</th>
                <th className="border border-slate-400 p-1.5">पाठविलेले</th>
                <th className="border border-slate-400 p-1.5">प्रलंबित</th>
              </tr>
            </thead>
            <tbody>
              {villageSummary.map((v, idx) => (
                <tr key={v.name + idx} className="text-center">
                  <td className="border border-slate-400 p-1.5">{idx + 1}</td>
                  <td className="border border-slate-400 p-1.5 text-left font-medium">{v.name}</td>
                  <td className="border border-slate-400 p-1.5">{v.population?.toLocaleString('en-IN') || 0}</td>
                  <td className="border border-slate-400 p-1.5">{v.houses?.toLocaleString('en-IN') || 0}</td>
                  <td className="border border-slate-400 p-1.5 font-bold">{v.total}</td>
                  <td className="border border-slate-400 p-1.5 text-emerald-800 font-semibold">{v.sent}</td>
                  <td className="border border-slate-400 p-1.5 text-amber-800 font-semibold">{v.pending}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold text-center">
                <td colSpan={2} className="border border-slate-400 p-1.5 text-right pr-3">
                  एकूण (Total):
                </td>
                <td className="border border-slate-400 p-1.5">
                  {villageSummary.reduce((sum, v) => sum + (v.population || 0), 0).toLocaleString('en-IN')}
                </td>
                <td className="border border-slate-400 p-1.5">
                  {villageSummary.reduce((sum, v) => sum + (v.houses || 0), 0).toLocaleString('en-IN')}
                </td>
                <td className="border border-slate-400 p-1.5">
                  {villageSummary.reduce((sum, v) => sum + v.total, 0)}
                </td>
                <td className="border border-slate-400 p-1.5">
                  {villageSummary.reduce((sum, v) => sum + v.sent, 0)}
                </td>
                <td className="border border-slate-400 p-1.5">
                  {villageSummary.reduce((sum, v) => sum + v.pending, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Subcentre-wise Summary Table */}
      {(activeTab === 'subcentre' || activeTab === 'yearly') && (
        <div className="mb-6">
          <div className="text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wide">
            उपकेंद्रनिहाय अहवाल (Subcentre-wise Report)
          </div>
          <table className="w-full border-collapse border border-slate-400 text-xs">
            <thead>
              <tr className="bg-slate-200 font-bold text-slate-900 text-center">
                <th className="border border-slate-400 p-1.5 w-10">अ.क्र.</th>
                <th className="border border-slate-400 p-1.5 text-left">उपकेंद्र</th>
                <th className="border border-slate-400 p-1.5">लोकसंख्या</th>
                <th className="border border-slate-400 p-1.5">घरसंख्या</th>
                <th className="border border-slate-400 p-1.5">एकूण रक्त नमुने</th>
                <th className="border border-slate-400 p-1.5">पाठविलेले</th>
                <th className="border border-slate-400 p-1.5">प्रलंबित</th>
              </tr>
            </thead>
            <tbody>
              {subcentreSummary.map((sc, idx) => (
                <tr key={sc.name + idx} className="text-center">
                  <td className="border border-slate-400 p-1.5">{idx + 1}</td>
                  <td className="border border-slate-400 p-1.5 text-left font-medium">{sc.name}</td>
                  <td className="border border-slate-400 p-1.5">{sc.population?.toLocaleString('en-IN') || 0}</td>
                  <td className="border border-slate-400 p-1.5">{sc.houses?.toLocaleString('en-IN') || 0}</td>
                  <td className="border border-slate-400 p-1.5 font-bold">{sc.total}</td>
                  <td className="border border-slate-400 p-1.5 text-emerald-800 font-semibold">{sc.sent}</td>
                  <td className="border border-slate-400 p-1.5 text-amber-800 font-semibold">{sc.pending}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold text-center">
                <td colSpan={2} className="border border-slate-400 p-1.5 text-right pr-3">
                  एकूण (Total):
                </td>
                <td className="border border-slate-400 p-1.5">
                  {subcentreSummary.reduce((sum, sc) => sum + (sc.population || 0), 0).toLocaleString('en-IN')}
                </td>
                <td className="border border-slate-400 p-1.5">
                  {subcentreSummary.reduce((sum, sc) => sum + (sc.houses || 0), 0).toLocaleString('en-IN')}
                </td>
                <td className="border border-slate-400 p-1.5">
                  {subcentreSummary.reduce((sum, sc) => sum + sc.total, 0)}
                </td>
                <td className="border border-slate-400 p-1.5">
                  {subcentreSummary.reduce((sum, sc) => sum + sc.sent, 0)}
                </td>
                <td className="border border-slate-400 p-1.5">
                  {subcentreSummary.reduce((sum, sc) => sum + sc.pending, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Official Signatures Footer */}
      <div className="mt-14 pt-6 grid grid-cols-2 text-center text-xs font-bold border-t border-slate-300">
        <div>
          <div className="h-10"></div>
          <div>तयार करणाऱ्याची स्वाक्षरी</div>
          <div className="text-[10px] text-slate-600 font-normal">
            (आरोग्य सेवक / आरोग्य सेविका)
          </div>
        </div>
        <div>
          <div className="h-10"></div>
          <div>प्रभारी / वैद्यकीय अधिकारी स्वाक्षरी</div>
          <div className="text-[10px] text-slate-600 font-normal">
            (प्राथमिक आरोग्य केंद्र)
          </div>
        </div>
      </div>
    </div>
  );
};
