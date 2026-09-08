import React, { useState } from 'react';
import { Printer, X, CheckCircle2, AlertCircle, FileText, ArrowLeft } from 'lucide-react';
import { MalariaBloodSample } from '../types';
import { formatSampleNumber, formatIndianDate } from '../services/malariaService';

interface MalariaPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: MalariaBloodSample[];
  mode: 'send' | 'reprint';
  printDate: string; // Indian format DD/MM/YYYY
  phcName?: string;
  subcentreName?: string;
  villageName?: string;
  onConfirmSend?: () => Promise<void>;
}

export const MalariaPrintPreviewModal: React.FC<MalariaPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  samples,
  mode,
  printDate,
  phcName,
  subcentreName,
  villageName,
  onConfirmSend,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Determine metadata display
  const displayPhc = phcName || samples[0]?.phc_name || 'प्राथमिक आरोग्य केंद्र';
  const displaySubcentre = subcentreName || samples[0]?.subcentre_name || 'आरोग्य उपकेंद्र';
  const displayVillage =
    villageName && villageName !== 'all'
      ? villageName
      : samples.length > 0 && samples.every((s) => s.village_name === samples[0].village_name)
      ? samples[0].village_name
      : 'सर्व समाविष्ट गावे';

  const handlePrintAction = async () => {
    setErrorMessage(null);

    if (mode === 'reprint') {
      // In reprint mode, trigger browser print without changing database sent_date
      window.print();
      return;
    }

    if (mode === 'send' && onConfirmSend) {
      setIsProcessing(true);
      try {
        // Trigger browser print
        window.print();
        // Save sent_date in database
        await onConfirmSend();
      } catch (err: any) {
        setErrorMessage(
          err?.message || 'नमुने पाठविल्याची तारीख जतन करता आली नाही. कृपया पुन्हा प्रयत्न करा.'
        );
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div
      id="malaria-print-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static"
    >
      <div
        id="malaria-print-modal-container"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col print:shadow-none print:border-none print:max-w-none print:max-h-none print:rounded-none"
      >
        {/* Modal Top Header (Hidden in Print) */}
        <div className="no-print p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">
                {mode === 'send' ? 'रक्त नमुना पाठविणे व प्रिंट पूर्वावलोकन' : 'पाठविलेले रक्त नमुने पुन्हा प्रिंट (Reprint)'}
              </h3>
              <p className="text-xs text-slate-600">
                {mode === 'send'
                  ? 'प्रिंट केल्यावर निवडलेल्या नमुन्यांची पाठविल्याची नोंद केली जाईल.'
                  : 'पुन्हा प्रिंट केल्याने पाठविण्याचा दिनांक बदलणार नाही.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="बंद करा"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert if DB save failed */}
        {errorMessage && (
          <div className="no-print mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scrollable Printable A4 Area */}
        <div className="overflow-y-auto p-4 sm:p-8 flex-1 bg-slate-100/50 print:bg-white print:p-0 print:overflow-visible">
          <div
            id="printable-malaria-report"
            className="bg-white p-6 sm:p-10 mx-auto rounded shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0 text-black"
            style={{ minHeight: '297mm' }}
          >
            {/* Report Header */}
            <div className="text-center pb-4 mb-4 border-b-2 border-slate-800">
              <h1 className="text-xl sm:text-2xl font-black tracking-wide uppercase text-slate-900">
                राष्ट्रीय हिवताप नियंत्रण कार्यक्रम
              </h1>
              <h2 className="text-lg sm:text-xl font-bold mt-1 text-slate-800 underline underline-offset-4">
                रक्त नमुना पाठविण्याची नोंद
              </h2>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mb-5 text-sm sm:text-base border border-slate-300 rounded p-3 bg-slate-50/50 print:bg-transparent">
              <div className="flex">
                <span className="font-bold w-44 text-slate-900">प्राथमिक आरोग्य केंद्र:</span>
                <span className="font-semibold text-slate-800">{displayPhc}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-44 text-slate-900">उपकेंद्र:</span>
                <span className="font-semibold text-slate-800">{displaySubcentre}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-44 text-slate-900">गाव:</span>
                <span className="font-semibold text-slate-800">{displayVillage}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-44 text-slate-900">नमुने पाठविण्याचा दिनांक:</span>
                <span className="font-bold text-emerald-800 print:text-black">{printDate}</span>
              </div>
            </div>

            {/* Samples Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 print:bg-slate-200 text-slate-900 font-bold">
                    <th className="border border-slate-400 p-2 text-center w-12">अ.क्र.</th>
                    <th className="border border-slate-400 p-2 text-center">मलेरिया घर क्रमांक</th>
                    <th className="border border-slate-400 p-2 text-left">ताप रुग्णाचे पूर्ण नाव</th>
                    <th className="border border-slate-400 p-2 text-center w-16">वय</th>
                    <th className="border border-slate-400 p-2 text-center w-16">लिंग</th>
                    <th className="border border-slate-400 p-2 text-center">नमुना घेतल्याचा दिनांक</th>
                    <th className="border border-slate-400 p-2 text-center">रक्त नमुना क्रमांक</th>
                    <th className="border border-slate-400 p-2 text-center">मलेरिया स्मीअर कोड</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((sample, index) => (
                    <tr key={sample.id} className="hover:bg-slate-50">
                      <td className="border border-slate-400 p-2 text-center font-medium">
                        {index + 1}
                      </td>
                      <td className="border border-slate-400 p-2 text-center font-mono">
                        {sample.house_number || '-'}
                      </td>
                      <td className="border border-slate-400 p-2 font-medium text-slate-900">
                        {sample.patient_name}
                      </td>
                      <td className="border border-slate-400 p-2 text-center">
                        {sample.age} वर्षे
                      </td>
                      <td className="border border-slate-400 p-2 text-center">
                        {sample.gender}
                      </td>
                      <td className="border border-slate-400 p-2 text-center font-mono">
                        {formatIndianDate(sample.sample_collection_date)}
                      </td>
                      <td className="border border-slate-400 p-2 text-center font-mono font-bold">
                        {formatSampleNumber(sample.sample_number)}
                      </td>
                      <td className="border border-slate-400 p-2 text-center font-mono font-bold">
                        {sample.malaria_smear_code}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Summary & Signatures */}
            <div className="mt-8 pt-4 border-t border-slate-300">
              <div className="text-base font-bold text-slate-900 mb-16">
                एकूण रक्त नमुने: <span className="text-emerald-800 print:text-black font-black text-lg">{samples.length}</span>
              </div>

              <div className="grid grid-cols-2 gap-8 text-center text-sm sm:text-base font-semibold text-slate-900">
                <div className="flex flex-col items-center">
                  <div className="w-52 border-b border-slate-800 mb-2"></div>
                  <p>कर्मचारी स्वाक्षरी</p>
                  <p className="text-xs text-slate-600 font-normal">
                    (आरोग्य सेवक / आरोग्य सेविका)
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-52 border-b border-slate-800 mb-2"></div>
                  <p>प्रभारी अधिकारी स्वाक्षरी</p>
                  <p className="text-xs text-slate-600 font-normal">
                    (वैद्यकीय अधिकारी, प्रा.आ. केंद्र)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer (Hidden in Print) */}
        <div className="no-print p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-xl">
          <div className="text-xs sm:text-sm text-slate-600 font-medium">
            एकूण निवडलेले नमुने: <strong className="text-slate-900">{samples.length}</strong> | दिनांक: <strong className="text-slate-900">{printDate}</strong>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-medium text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {mode === 'send' ? 'रद्द करा / मागे जा' : 'बंद करा'}
            </button>
            <button
              onClick={handlePrintAction}
              disabled={isProcessing}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              {isProcessing
                ? 'जतन होत आहे...'
                : mode === 'send'
                ? 'प्रिंट करा व पाठविल्याची नोंद करा'
                : 'पुन्हा प्रिंट करा'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
