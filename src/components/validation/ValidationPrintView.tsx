import React from 'react';
import { ValidationIssue } from '../../types';

interface ValidationPrintViewProps {
  phcName?: string;
  subcentreName?: string;
  reportDate: string;
  totalRecords: number;
  errorCount: number;
  warningCount: number;
  qualityScore: number;
  issues: ValidationIssue[];
}

export const ValidationPrintView: React.FC<ValidationPrintViewProps> = ({
  phcName,
  subcentreName,
  reportDate,
  totalRecords,
  errorCount,
  warningCount,
  qualityScore,
  issues,
}) => {
  return (
    <div className="hidden print:block text-black bg-white p-6 font-serif">
      {/* Official Header */}
      <div className="text-center border-b-2 border-black pb-3 mb-4">
        <div className="text-xs uppercase tracking-wider font-semibold">
          महाराष्ट्र शासन • सार्वजनिक आरोग्य विभाग
        </div>
        <h1 className="text-base font-bold uppercase mt-1">
          राष्ट्रीय आरोग्य कार्यक्रम
        </h1>
        <h2 className="text-sm font-bold text-slate-900 mt-0.5">
          आरोग्य नोंदणी डेटा गुणवत्ता व तपासणी अहवाल
        </h2>

        <div className="grid grid-cols-2 text-xs mt-3 pt-2 border-t border-slate-300 text-left">
          <div>
            <strong>प्रा.आ. केंद्र (PHC):</strong> {phcName || 'सर्व उपलब्ध PHC'}
          </div>
          <div>
            <strong>उपकेंद्र (Subcentre):</strong> {subcentreName || 'सर्व उपकेंद्र'}
          </div>
          <div className="mt-1">
            <strong>कालावधी / सत्र:</strong> चालू आर्थिक वर्ष (Current Session)
          </div>
          <div className="mt-1">
            <strong>अहवाल दिनांक:</strong> {reportDate}
          </div>
        </div>
      </div>

      {/* Summary Box */}
      <div className="border border-black p-3 mb-4 grid grid-cols-4 gap-2 text-center text-xs">
        <div className="border-r border-slate-300">
          <div className="font-bold">एकूण तपासलेल्या नोंदी</div>
          <div className="text-sm font-semibold mt-1">{totalRecords}</div>
        </div>
        <div className="border-r border-slate-300">
          <div className="font-bold text-rose-800">गंभीर त्रुटी (Errors)</div>
          <div className="text-sm font-semibold mt-1">{errorCount}</div>
        </div>
        <div className="border-r border-slate-300">
          <div className="font-bold text-amber-800">सूचना / गॅप्स (Warnings)</div>
          <div className="text-sm font-semibold mt-1">{warningCount}</div>
        </div>
        <div>
          <div className="font-bold">गुणवत्ता निर्देशांक (Quality %)</div>
          <div className="text-sm font-bold mt-1">{qualityScore}%</div>
        </div>
      </div>

      {/* Validation Issues Table */}
      <div className="mb-8">
        <h3 className="text-xs font-bold uppercase mb-1">
          तपासणीत आढळलेल्या त्रुटी व विसंगती यादी ({issues.length})
        </h3>
        <table className="w-full text-[10px] border-collapse border border-black">
          <thead>
            <tr className="bg-slate-100 border-b border-black">
              <th className="border border-black p-1 text-center w-8">अ.क्र.</th>
              <th className="border border-black p-1 text-left w-24">मॉड्यूल</th>
              <th className="border border-black p-1 text-left w-36">संबंधित नोंद (Record)</th>
              <th className="border border-black p-1 text-left">समस्या / विसंगती (Issue Description)</th>
              <th className="border border-black p-1 text-center w-16">तीव्रता</th>
              <th className="border border-black p-1 text-center w-20">दिनांक</th>
            </tr>
          </thead>
          <tbody>
            {issues.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-black p-4 text-center text-xs italic">
                  कोणतीही त्रुटी अथवा विसंगती आढळली नाही. डेटा पूर्णपणे वैध आहे.
                </td>
              </tr>
            ) : (
              issues.map((issue, idx) => (
                <tr key={issue.id || idx} className="border-b border-slate-300">
                  <td className="border border-black p-1 text-center">{idx + 1}</td>
                  <td className="border border-black p-1 font-semibold">{issue.categoryMarathi}</td>
                  <td className="border border-black p-1">{issue.recordIdentifier}</td>
                  <td className="border border-black p-1 leading-relaxed">{issue.issueText}</td>
                  <td className="border border-black p-1 text-center font-bold">
                    {issue.severity === 'त्रुटी' ? '🔴 त्रुटी' : '🟡 सूचना'}
                  </td>
                  <td className="border border-black p-1 text-center">{issue.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Official Signatures */}
      <div className="flex justify-between items-end pt-16 text-xs">
        <div className="text-center">
          <div className="border-t border-black w-48 pt-1">
            तपासणी करणाऱ्याची स्वाक्षरी: __________
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">
            आरोग्य सेवक / संगणक ऑपरेटर
          </div>
        </div>

        <div className="text-center">
          <div className="border-t border-black w-48 pt-1">
            अधिकाऱ्याची स्वाक्षरी: __________
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">
            वैद्यकीय अधिकारी, प्रा.आ. केंद्र
          </div>
        </div>
      </div>
    </div>
  );
};
