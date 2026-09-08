import React from 'react';
import { TargetProgressItem } from '../../types';

interface MalariaTargetPrintViewProps {
  items: TargetProgressItem[];
  selectedPeriodLabel: string;
  phcName?: string;
  subcentreName?: string;
  villageName?: string;
  employeeName?: string;
  totalTarget: number;
  totalActual: number;
  totalRemaining: number;
  overallProgressPercent: number;
  totalSent: number;
  totalPending: number;
  activeScopeTitle: string;
}

export const MalariaTargetPrintView: React.FC<MalariaTargetPrintViewProps> = ({
  items,
  selectedPeriodLabel,
  phcName,
  subcentreName,
  villageName,
  employeeName,
  totalTarget,
  totalActual,
  totalRemaining,
  overallProgressPercent,
  totalSent,
  totalPending,
  activeScopeTitle,
}) => {
  const currentDate = new Date().toLocaleDateString('mr-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div id="printable-malaria-target-report" className="hidden print:block font-sans text-black">
      {/* Official Government Header */}
      <div className="text-center border-b-2 border-black pb-3 mb-4">
        <h3 className="text-sm font-semibold tracking-wide">महाराष्ट्र शासन — सार्वजनिक आरोग्य विभाग</h3>
        <h1 className="text-lg font-bold uppercase tracking-wider mt-0.5">
          राष्ट्रीय हिवताप नियंत्रण कार्यक्रम (NVBDCP)
        </h1>
        <h2 className="text-base font-bold mt-1 underline">
          मलेरिया रक्त नमुना लक्ष्य व प्रगती अहवाल ({activeScopeTitle})
        </h2>
      </div>

      {/* Scope Details Header Grid */}
      <div className="border border-black p-3 mb-4 text-xs">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div>
            <strong>प्राथमिक आरोग्य केंद्र (PHC):</strong> {phcName || 'सर्व प्राथमिक आरोग्य केंद्रे'}
          </div>
          <div>
            <strong>आरोग्य उपकेंद्र (Subcentre):</strong> {subcentreName || 'सर्व उपकेंद्रे'}
          </div>
          <div>
            <strong>समाविष्ट गाव / क्षेत्र:</strong> {villageName || 'सर्व गावे'}
          </div>
          <div>
            <strong>कर्मचारी नाव:</strong> {employeeName || 'सर्व कर्मचारी'}
          </div>
          <div>
            <strong>कालावधी (Period):</strong> {selectedPeriodLabel}
          </div>
          <div>
            <strong>अहवाल दिनांक:</strong> {currentDate}
          </div>
        </div>
      </div>

      {/* Summary KPI Box */}
      <div className="border border-black p-2.5 mb-4 bg-slate-50/50 text-xs">
        <div className="font-bold mb-1.5 underline">एकूण सारांश (Consolidated Summary):</div>
        <div className="grid grid-cols-6 gap-2 text-center">
          <div className="border-r border-black/40 pr-1">
            <div className="text-[10px]">एकूण लक्ष्य</div>
            <div className="font-bold text-sm">{totalTarget}</div>
          </div>
          <div className="border-r border-black/40 pr-1">
            <div className="text-[10px]">प्रत्यक्ष संकलन</div>
            <div className="font-bold text-sm">{totalActual}</div>
          </div>
          <div className="border-r border-black/40 pr-1">
            <div className="text-[10px]">बाकी लक्ष्य</div>
            <div className="font-bold text-sm">{totalRemaining}</div>
          </div>
          <div className="border-r border-black/40 pr-1">
            <div className="text-[10px]">प्रगती %</div>
            <div className="font-bold text-sm">{overallProgressPercent}%</div>
          </div>
          <div className="border-r border-black/40 pr-1">
            <div className="text-[10px]">पाठविलेले</div>
            <div className="font-bold text-sm">{totalSent}</div>
          </div>
          <div>
            <div className="text-[10px]">प्रलंबित</div>
            <div className="font-bold text-sm">{totalPending}</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <table className="w-full border-collapse border border-black text-[11px] mb-6">
        <thead>
          <tr className="bg-slate-100 text-center font-bold">
            <th className="border border-black px-1.5 py-1.5 w-10">अ.क्र.</th>
            <th className="border border-black px-2 py-1.5 text-left">घटक / नाव</th>
            <th className="border border-black px-1.5 py-1.5">लोकसंख्या / कोड</th>
            <th className="border border-black px-1.5 py-1.5">लक्ष्य</th>
            <th className="border border-black px-1.5 py-1.5">प्रत्यक्ष</th>
            <th className="border border-black px-1.5 py-1.5">बाकी</th>
            <th className="border border-black px-1.5 py-1.5">प्रगती %</th>
            <th className="border border-black px-1.5 py-1.5">पाठविलेले</th>
            <th className="border border-black px-1.5 py-1.5">प्रलंबित</th>
            <th className="border border-black px-2 py-1.5">दर्जा (Status)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id || idx} className="text-center">
              <td className="border border-black px-1 py-1 font-mono">{idx + 1}</td>
              <td className="border border-black px-2 py-1 text-left font-semibold">
                {item.entityName}
                {item.designation ? ` (${item.designation})` : ''}
              </td>
              <td className="border border-black px-1.5 py-1">
                {item.code || (item.population ? item.population.toLocaleString('mr-IN') : '-')}
              </td>
              <td className="border border-black px-1.5 py-1 font-bold">{item.targetValue}</td>
              <td className="border border-black px-1.5 py-1 font-bold">{item.actualSamples}</td>
              <td className="border border-black px-1.5 py-1 font-bold">{item.remainingTarget}</td>
              <td className="border border-black px-1.5 py-1 font-bold">{item.progressPercent}%</td>
              <td className="border border-black px-1.5 py-1">{item.sentSamples}</td>
              <td className="border border-black px-1.5 py-1 font-bold">{item.pendingSamples}</td>
              <td className="border border-black px-2 py-1 text-xs">{item.status}</td>
            </tr>
          ))}
          {/* Total Row */}
          <tr className="bg-slate-100 font-bold text-center border-t-2 border-black">
            <td colSpan={3} className="border border-black px-2 py-1.5 text-right">
              एकूण बेरीज (Total):
            </td>
            <td className="border border-black px-1.5 py-1.5">{totalTarget}</td>
            <td className="border border-black px-1.5 py-1.5">{totalActual}</td>
            <td className="border border-black px-1.5 py-1.5">{totalRemaining}</td>
            <td className="border border-black px-1.5 py-1.5">{overallProgressPercent}%</td>
            <td className="border border-black px-1.5 py-1.5">{totalSent}</td>
            <td className="border border-black px-1.5 py-1.5">{totalPending}</td>
            <td className="border border-black px-2 py-1.5">
              {overallProgressPercent >= 100
                ? 'लक्ष्य पूर्ण'
                : overallProgressPercent >= 80
                ? 'चांगली प्रगती'
                : overallProgressPercent >= 50
                ? 'मध्यम प्रगती'
                : 'कमी प्रगती'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Official Signatures Footer (Requirement 17) */}
      <div className="pt-10 flex items-center justify-between text-xs font-semibold px-4">
        <div className="text-left">
          <div className="mb-8">अहवाल तयार करणाऱ्याची स्वाक्षरी: ___________________</div>
          <div className="text-slate-600 font-normal">नाव व पदनाम: </div>
        </div>

        <div className="text-right">
          <div className="mb-8">अधिकाऱ्याची स्वाक्षरी: ___________________</div>
          <div className="text-slate-600 font-normal">वैद्यकीय अधिकारी / तालुका आरोग्य अधिकारी</div>
        </div>
      </div>
    </div>
  );
};
