import React from 'react';

export interface PrintVillageRow {
  srNo: number;
  villageName: string;
  population: number;
  totalHouses: number;
  samples: number;
  sent: number;
  pending: number;
  coveredHouses: number;
  coveragePct: string;
  samplesPer100Pop: string;
  samplesPer100Houses: string;
}

export interface PrintEmployeeRow {
  srNo: number;
  employeeName: string;
  designation: string;
  smearCode: string;
  samples: number;
  sent: number;
  pending: number;
  coveredHouses: number;
}

interface MalariaCoveragePrintViewProps {
  phcName: string;
  subcentreName: string;
  dateRangeText: string;
  reportDate: string;
  totalVillages: number;
  totalPopulation: number;
  totalHouses: number;
  totalSamples: number;
  totalSent: number;
  totalPending: number;
  villageRows: PrintVillageRow[];
  employeeRows: PrintEmployeeRow[];
}

export const MalariaCoveragePrintView: React.FC<MalariaCoveragePrintViewProps> = ({
  phcName,
  subcentreName,
  dateRangeText,
  reportDate,
  totalVillages,
  totalPopulation,
  totalHouses,
  totalSamples,
  totalSent,
  totalPending,
  villageRows,
  employeeRows,
}) => {
  return (
    <div className="hidden print:block font-sans text-black p-4">
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-xl font-bold uppercase tracking-wider mb-1">
          राष्ट्रीय हिवताप नियंत्रण कार्यक्रम (NVBDCP)
        </h1>
        <h2 className="text-lg font-bold mb-2">मलेरिया रक्त नमुने व कव्हरेज अहवाल</h2>
        <div className="flex justify-center items-center gap-6 text-sm font-semibold">
          <span>प्राथमिक आरोग्य केंद्र: {phcName}</span>
          <span>उपकेंद्र: {subcentreName || 'सर्व'}</span>
        </div>
        <div className="flex justify-center items-center gap-6 text-sm mt-1">
          <span>कालावधी: {dateRangeText}</span>
          <span>अहवाल दिनांक: {reportDate}</span>
        </div>
      </div>

      {/* Summary KPI */}
      <div className="flex justify-between items-center bg-gray-100 border border-black p-3 mb-6 text-sm font-bold">
        <div>एकूण गावे: {totalVillages}</div>
        <div>एकूण लोकसंख्या: {totalPopulation}</div>
        <div>एकूण घरे: {totalHouses}</div>
        <div>एकूण नमुने: {totalSamples}</div>
        <div>पाठवलेले: {totalSent}</div>
        <div>प्रलंबित: {totalPending}</div>
      </div>

      {/* Village Table */}
      <div className="mb-8">
        <h3 className="text-md font-bold mb-2 uppercase">१. गावनिहाय कामगिरी</h3>
        <table className="w-full border-collapse border border-black text-xs text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-black p-1.5 w-10">अ.क्र.</th>
              <th className="border border-black p-1.5 text-left">गावाचे नाव</th>
              <th className="border border-black p-1.5">लोकसंख्या</th>
              <th className="border border-black p-1.5">एकूण घरे</th>
              <th className="border border-black p-1.5">Covered घरे</th>
              <th className="border border-black p-1.5">House Cov %</th>
              <th className="border border-black p-1.5">नमुने</th>
              <th className="border border-black p-1.5">नमुने/१०० लो.</th>
            </tr>
          </thead>
          <tbody>
            {villageRows.map((v) => (
              <tr key={v.srNo}>
                <td className="border border-black p-1.5">{v.srNo}</td>
                <td className="border border-black p-1.5 text-left font-semibold">{v.villageName}</td>
                <td className="border border-black p-1.5">{v.population}</td>
                <td className="border border-black p-1.5">{v.totalHouses}</td>
                <td className="border border-black p-1.5">{v.coveredHouses}</td>
                <td className="border border-black p-1.5">{v.coveragePct}%</td>
                <td className="border border-black p-1.5 font-bold">{v.samples}</td>
                <td className="border border-black p-1.5">{v.samplesPer100Pop}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Employee Table */}
      <div>
        <h3 className="text-md font-bold mb-2 uppercase">२. कर्मचारीनिहाय कामगिरी</h3>
        <table className="w-full border-collapse border border-black text-xs text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-black p-1.5 w-10">अ.क्र.</th>
              <th className="border border-black p-1.5 text-left">कर्मचाऱ्याचे नाव</th>
              <th className="border border-black p-1.5">पदनाम</th>
              <th className="border border-black p-1.5">स्मीअर कोड</th>
              <th className="border border-black p-1.5">Covered घरे</th>
              <th className="border border-black p-1.5">नमुने</th>
              <th className="border border-black p-1.5">पाठवलेले</th>
              <th className="border border-black p-1.5">प्रलंबित</th>
            </tr>
          </thead>
          <tbody>
            {employeeRows.map((e) => (
              <tr key={e.srNo}>
                <td className="border border-black p-1.5">{e.srNo}</td>
                <td className="border border-black p-1.5 text-left font-semibold">{e.employeeName}</td>
                <td className="border border-black p-1.5">{e.designation}</td>
                <td className="border border-black p-1.5 font-mono">{e.smearCode}</td>
                <td className="border border-black p-1.5">{e.coveredHouses}</td>
                <td className="border border-black p-1.5 font-bold">{e.samples}</td>
                <td className="border border-black p-1.5">{e.sent}</td>
                <td className="border border-black p-1.5">{e.pending}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-16 flex justify-between text-sm font-bold px-8">
        <div>स्वाक्षरी / शिक्का<br/>(प्रयोगशाळा तंत्रज्ञ)</div>
        <div>स्वाक्षरी / शिक्का<br/>(वैद्यकीय अधिकारी)</div>
      </div>
    </div>
  );
};
