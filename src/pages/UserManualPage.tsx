import React, { useRef } from 'react';
import {
  BookOpen,
  Printer,
  ShieldCheck,
  UserCheck,
  Building2,
  MapPin,
  Users,
  FileSpreadsheet,
  CloudOff,
  BarChart3,
  Stethoscope,
  Info
} from 'lucide-react';

export const UserManualPage: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Top action bar (hidden in print) */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">वापरकर्ता पुस्तिका (User Manual)</h1>
            <p className="text-xs text-slate-500">आरोग्य उपकेंद्र रेकॉर्ड कीपिंग सिस्टीम</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>PDF म्हणून सेव्ह करा / प्रिंट करा</span>
        </button>
      </div>

      {/* Manual Content (This is the printable part) */}
      <div className="bg-white rounded-none sm:rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 print:border-none print:shadow-none print:p-0 font-sans text-slate-800">
        
        {/* Cover Page Header */}
        <div className="text-center border-b-2 border-emerald-800 pb-8 mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-1 shadow-inner flex items-center justify-center">
              <div className="w-full h-full rounded-[8px] bg-emerald-900 flex items-center justify-center text-amber-300">
                <Stethoscope className="w-8 h-8" />
              </div>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            आरोग्य उपकेंद्र रेकॉर्ड कीपिंग सिस्टीम
          </h1>
          <h2 className="text-lg text-emerald-700 font-semibold mb-1">
            वापरकर्ता पुस्तिका (User Manual)
          </h2>
          <p className="text-sm text-slate-500">
            महाराष्ट्र शासन | सार्वजनिक आरोग्य विभाग | राष्ट्रीय आरोग्य अभियान
          </p>
          <div className="mt-4 inline-block bg-slate-100 px-3 py-1 rounded-full text-xs font-semibold text-slate-600">
            आवृत्ती १.० (सप्टेंबर २०२६)
          </div>
        </div>

        <div className="space-y-10 text-sm sm:text-base leading-relaxed">
          
          {/* Section 1 */}
          <section className="print:break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">१</span>
              सिस्टीमची ओळख (Introduction)
            </h3>
            <p className="mb-3">
              <strong>'आरोग्य उपकेंद्र रेकॉर्ड कीपिंग सिस्टीम'</strong> हे राष्ट्रीय हिवताप नियंत्रण कार्यक्रम (NVBDCP) अंतर्गत मलेरिया (हिवताप) रक्त नमुने गोळा करणे, त्यांची नोंदणी करणे, आणि अहवाल तयार करणे सोपे करण्यासाठी बनवलेले एक सुरक्षित डिजिटल प्लॅटफॉर्म आहे.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-900">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>मुख्य उद्दिष्ट:</strong> कागदी रजिस्टरचा वापर कमी करून, नमुन्यांची अचूक नोंदणी करणे, आणि ऑफलाइन (इंटरनेट नसतानाही) काम करण्याची सुविधा उपलब्ध करून देणे.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="print:break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">२</span>
              युझर रोल्स व प्रवेश (User Roles & Access)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 font-bold text-emerald-800 mb-2">
                  <ShieldCheck className="w-5 h-5" />
                  PHC Controller (प्रा.आ.कें. नियंत्रक)
                </div>
                <ul className="list-disc pl-5 text-sm space-y-1 text-slate-600">
                  <li>उपकेंद्रे, गावे, आणि कर्मचारी (Master Data) जोडणे व व्यवस्थापन करणे.</li>
                  <li>नवीन कर्मचाऱ्यांचे Login Accounts (ईमेल व पासवर्ड) तयार करणे.</li>
                  <li>मलेरिया अहवाल व Coverage Dashboard पाहणे.</li>
                </ul>
              </div>
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 font-bold text-sky-700 mb-2">
                  <UserCheck className="w-5 h-5" />
                  Subcentre Employee (उपकेंद्र कर्मचारी)
                </div>
                <ul className="list-disc pl-5 text-sm space-y-1 text-slate-600">
                  <li>रोजचे रक्त नमुने (Blood Samples) रजिस्टर करणे.</li>
                  <li>घेतलेले नमुने PHC/लॅब कडे पाठवणे.</li>
                  <li>गावातील घरे कव्हर करणे (House Coverage).</li>
                  <li>ऑफलाइन काम करणे व इंटरनेट आल्यावर सिंक करणे.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="print:break-before-page">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">३</span>
              कर्मचारी व वापरकर्ता व्यवस्थापन (PHC Controller साठी)
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 font-bold text-slate-500">A</div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">कर्मचारी मास्टरमध्ये नोंद करणे (Employee Master)</h4>
                  <p className="text-sm text-slate-600">सर्वप्रथम <strong>'कर्मचारी मास्टर'</strong> मध्ये जाऊन नवीन कर्मचाऱ्याची माहिती भरा. येथे कर्मचाऱ्याचे नाव, पदनाम, स्मीअर कोड, मोबाईल नंबर, आणि <strong>ईमेल आयडी</strong> भरणे अनिवार्य आहे.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 font-bold text-slate-500">B</div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">लॉगिन खाते तयार करणे (User Management)</h4>
                  <p className="text-sm text-slate-600">त्यानंतर <strong>'वापरकर्ता व्यवस्थापन'</strong> या टॅबमध्ये जा. 'नवीन खाते तयार करा' वर क्लिक करून संबंधित कर्मचाऱ्याला निवडा. सिस्टीम आपोआप त्यांचा ईमेल आयडी घेईल, फक्त एक सुरक्षित <strong>पासवर्ड</strong> सेट करा आणि सेव्ह करा.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="print:break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">४</span>
              दैनंदिन काम: मलेरिया रक्त नमुना नोंद (Subcentre Employee साठी)
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                रक्त नमुने कसे भरावे?
              </h4>
              <ol className="list-decimal pl-5 text-sm space-y-2 text-slate-700">
                <li>मुख्य मेनूमधून <strong>'मलेरिया रक्त नमुना नोंद'</strong> यावर क्लिक करा.</li>
                <li>'नवीन नमुना नोंदवा' या हिरव्या बटणावर क्लिक करा.</li>
                <li>रुग्णाची माहिती भरा: गावाचे नाव, घर क्रमांक, रुग्णाचे नाव, वय आणि लिंग.</li>
                <li>'सेव्ह करा' वर क्लिक केल्यास या नमुन्याला आपोआप एक <strong>सीरियल नंबर</strong> (उदा. JTG-ANM-1/2026/01) मिळेल.</li>
              </ol>
            </div>
            <p className="text-sm text-slate-600">
              <strong>टीप:</strong> एकदा सेव्ह केलेला नमुना डिलीट करता येत नाही, फक्त त्रुटी असल्यास एडिट करता येतो.
            </p>
          </section>

          {/* Section 5 */}
          <section className="print:break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">५</span>
              नमुने लॅबकडे पाठवणे (Send Samples)
            </h3>
            <p className="mb-3 text-sm">
              संकलित केलेले रक्त नमुने जेव्हा तुम्ही प्रत्यक्ष PHC किंवा लॅबकडे पाठवता, तेव्हा सिस्टीममध्ये त्यांची नोंद करणे आवश्यक आहे.
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1 text-slate-600">
              <li><strong>'नमुने पाठविणे व प्रिंट'</strong> या टॅबवर जा.</li>
              <li>जे नमुने पाठवायचे आहेत, त्यांना चेकबॉक्सने (Tick) निवडा.</li>
              <li>'PHC/लॅब कडे पाठवा' या बटणावर क्लिक करा.</li>
              <li>तुम्ही पाठवलेल्या नमुन्यांची पावती (Dispatch Slip) प्रिंट करू शकता.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="print:break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">६</span>
              ऑफलाइन मोड व सिंक (Offline Mode & Sync)
            </h3>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 text-rose-900 mb-3">
              <CloudOff className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold mb-1">इंटरनेट नसताना काम कसे चालते?</h4>
                <p className="text-sm">
                  फिल्डवर (गावात) इंटरनेट नसले तरीही हे ॲप चालू राहते. तुम्ही नेहमीप्रमाणे रक्त नमुने भरू शकता. हे सर्व नमुने तुमच्या मोबाईल/टॅब्लेटमध्ये <strong>'Offline Drafts'</strong> मध्ये सुरक्षित सेव्ह राहतात.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              जेव्हा तुम्ही परत नेटवर्कमध्ये (इंटरनेट रेंजमध्ये) याल, तेव्हा सिस्टीम आपोआप (Auto-sync) हे नमुने मुख्य सर्व्हरवर पाठवते. तुम्ही <strong>'Offline Drafts'</strong> टॅबमध्ये जाऊन मॅन्युअली देखील सिंक करू शकता.
            </p>
          </section>
          
          {/* Section 7 */}
          <section className="print:break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">७</span>
              अहवाल आणि सांख्यिकी (Reports & Analytics)
            </h3>
            <ul className="list-disc pl-5 text-sm space-y-2 text-slate-600">
              <li><strong>मलेरिया Coverage:</strong> कोणत्या गावात किती घरांमध्ये सर्वेक्षण झाले, याचा सविस्तर आढावा आणि आलेख (Charts).</li>
              <li><strong>M1 / M2 अहवाल:</strong> शासनाला पाठवण्यासाठी लागणारे अधिकृत मासिक अहवाल तुम्ही येथे एका क्लिकवर तयार करून प्रिंट (PDF) करू शकता.</li>
              <li><strong>Data Validation:</strong> कोणत्याही डेटामध्ये त्रुटी (उदा. चुकीचा स्मीअर कोड) असल्यास ही सिस्टीम आपोआप अलर्ट दाखवते.</li>
            </ul>
          </section>
          
        </div>
        
        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
          आरोग्य उपकेंद्र रेकॉर्ड कीपिंग सिस्टीम • तांत्रिक सहाय्य आणि विकास
        </div>
      </div>
    </div>
  );
};
