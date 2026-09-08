import React, { useState, useEffect } from 'react';
import { PageId, TBPatientRecord, TBSampleType, TBSampleGivenAt, GenderType } from '../types';
import { useAuth } from '../hooks/useAuth';
import { masterDataService } from '../services/masterDataService';
import { tbService, getTodayDateString } from '../services/tbService';
import { offlineDraftService } from '../services/offlineDraftService';
import { auditService } from '../services/auditService';
import { NetworkStatusIndicator } from '../components/NetworkStatusIndicator';
import { CheckCircle2, AlertCircle, Save, Calendar, Search, MapPin, Building2, User, UserCheck, Stethoscope, WifiOff, FileSpreadsheet, Activity } from 'lucide-react';

interface TBRegisterPageProps {
  onNavigate: (page: PageId) => void;
}

export const TBRegisterPage: React.FC<TBRegisterPageProps> = ({ onNavigate }) => {
  const { user, role } = useAuth();
  
  // Master data
  const [phcs, setPhcs] = useState<any[]>([]);
  const [subcentres, setSubcentres] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [riskTypes] = useState<string[]>(['मधुमेह (Diabetes)', 'कुपोषण (Malnutrition)', 'संपर्क (Contact)', 'इतर (Other)']);
  
  // Selection
  const [selectedPhc, setSelectedPhc] = useState('');
  const [selectedSubcentre, setSelectedSubcentre] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  // Form
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<GenderType>('Male');
  const [mobileNumber, setMobileNumber] = useState('');
  const [nikshayId, setNikshayId] = useState('');
  const [collectionDate, setCollectionDate] = useState(getTodayDateString());
  const [sentDate, setSentDate] = useState(getTodayDateString());
  const [riskType, setRiskType] = useState('मधुमेह (Diabetes)');
  const [sampleType, setSampleType] = useState<TBSampleType>('Sputum');
  const [sampleGivenAt, setSampleGivenAt] = useState<TBSampleGivenAt>('PHC_BHADA');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error' | 'warning', text: string} | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    loadMasterData();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (sampleType === 'FoodBasket') {
      setSampleGivenAt(null);
    } else if (!sampleGivenAt) {
      setSampleGivenAt('PHC_BHADA');
    }
  }, [sampleType]);

  const loadMasterData = async () => {
    setIsLoading(true);
    try {
      const p = await masterDataService.getPhcs();
      const s = await masterDataService.getSubcentres();
      const v = await masterDataService.getVillages();
      const e = await masterDataService.getEmployees();
      
      setPhcs(p.filter(x => true));
      setSubcentres(s.filter(x => true));
      setVillages(v.filter(x => true));
      setEmployees(e.filter(x => true));

      if (user && role === 'subcentre_employee' && user.phc_id && user.subcentre_id) {
        setSelectedPhc(user.phc_id);
        setSelectedSubcentre(user.subcentre_id);
        
        if (user.employeeId) {
          setSelectedEmployee(user.employeeId);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollectionDateChange = (val: string) => {
    const today = getTodayDateString();
    if (val > today) {
      setStatusMessage({type: 'error', text: 'भविष्यातील तारीख (Future date) निवडता येत नाही.'});
      return;
    }
    setCollectionDate(val);
    setStatusMessage(null);
    if (val > sentDate) {
      setSentDate(val);
    }
  };

  const handleSentDateChange = (val: string) => {
    const today = getTodayDateString();
    if (val > today) {
      setStatusMessage({type: 'error', text: 'भविष्यातील तारीख (Future date) निवडता येत नाही.'});
      return;
    }
    if (val < collectionDate) {
      setStatusMessage({type: 'error', text: 'नमुना पाठवण्याचा दिनांक हा नमुना घेतल्याच्या दिनांकापेक्षा आधीचा असू शकत नाही.'});
      return;
    }
    setSentDate(val);
    setStatusMessage(null);
  };

  const validateDuplicate = async () => {
    try {
      const existing = await tbService.getSamples();
      const duplicate = existing.some(s => 
        (s.patient_name.toLowerCase() === patientName.trim().toLowerCase() && 
         (s.mobile_number === mobileNumber || (nikshayId && s.nikshay_id === nikshayId)))
      );
      if (duplicate) {
        setStatusMessage({type: 'warning', text: 'या रुग्णाची नोंद आधीपासून उपलब्ध असण्याची शक्यता आहे. कृपया तपासा.'});
      }
    } catch (e) {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhc || !selectedSubcentre || !selectedVillage || !selectedEmployee) {
      setStatusMessage({type: 'error', text: 'कृपया सर्व मास्टर माहिती (PHC, उपकेंद्र, गाव, कर्मचारी) निवडा.'});
      return;
    }
    if (!patientName.trim()) {
      setStatusMessage({type: 'error', text: 'संशयित रुग्णाचे नाव आवश्यक आहे.'});
      return;
    }
    if (!age || parseInt(age) < 1 || parseInt(age) > 120) {
      setStatusMessage({type: 'error', text: 'कृपया योग्य वय प्रविष्ट करा.'});
      return;
    }
    if (mobileNumber && mobileNumber.length !== 10) {
      setStatusMessage({type: 'error', text: 'मोबाईल क्रमांक १० अंकी असावा.'});
      return;
    }
    if (sampleType !== 'FoodBasket' && !sampleGivenAt) {
      setStatusMessage({type: 'error', text: 'कृपया "कोठे दिला" हा पर्याय निवडा.'});
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const payload: Partial<TBPatientRecord> = {
      phc_id: selectedPhc,
      subcentre_id: selectedSubcentre,
      village_id: selectedVillage,
      employee_id: selectedEmployee,
      patient_name: patientName.trim(),
      age: parseInt(age),
      gender,
      mobile_number: mobileNumber.trim() || null,
      nikshay_id: nikshayId.trim() || null,
      sample_collection_date: collectionDate,
      sample_sent_date: sentDate,
      risk_type: riskType,
      sample_type: sampleType,
      sample_given_at: sampleType === 'FoodBasket' ? null : sampleGivenAt,
    };

    try {
      if (isOffline) {
        await offlineDraftService.saveTBDraft(payload, user!);
        setStatusMessage({type: 'warning', text: 'इंटरनेट नसल्यामुळे नोंद Offline Drafts मध्ये सेव्ह केली आहे.'});
      } else {
        await tbService.addSample(payload as Omit<TBPatientRecord, 'id'>);
        setStatusMessage({type: 'success', text: 'TB रुग्ण नमुना नोंद यशस्वीरीत्या जतन झाली.'});
        await auditService.logAction({
          action: 'CREATE',
          module: 'TB Register',
          record_description: `नवीन TB संशयित नोंद: \${payload.patient_name}`,
          new_values: payload
        });
      }
      
      // Reset form
      setPatientName('');
      setAge('');
      setGender('Male');
      setMobileNumber('');
      setNikshayId('');
      setCollectionDate(getTodayDateString());
      setSentDate(getTodayDateString());
      setRiskType('मधुमेह (Diabetes)');
      setSampleType('Sputum');
      setSampleGivenAt('PHC_BHADA');
      
    } catch (err: any) {
      setStatusMessage({type: 'error', text: err.message || 'नोंद जतन करताना त्रुटी आली.'});
    } finally {
      setIsSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const filteredSubcentres = subcentres.filter(s => s.phc_id === selectedPhc);
  const filteredVillages = villages.filter(v => v.subcentre_id === selectedSubcentre);
  
  // Find employees belonging to the selected subcentre (this is simplistic, assuming direct match or via village)
  // Actually, employees are assigned to PHC and villages. Let's just filter by selected PHC for simplicity or show all active
  const filteredEmployees = employees.filter(e => e.phc_id === selectedPhc);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">माहिती लोड होत आहे...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">राष्ट्रीय क्षयरोग नियंत्रण कार्यक्रम (NTEP)</h1>
            <p className="text-xs text-slate-500">संशयित रुग्ण नमुना नोंदवही</p>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 \${
          statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          statusMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
          {statusMessage.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          {statusMessage.type === 'warning' && <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <p className="text-sm font-medium">{statusMessage.text}</p>
        </div>
      )}

      {isOffline && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-3 text-rose-700">
          <WifiOff className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">तुम्ही सध्या ऑफलाइन आहात. नोंद 'Offline Drafts' मध्ये सेव्ह केली जाईल.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Step 1: Location & Employee */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-emerald-700">1</span>
            लोकेशन व कर्मचारी निवड
          </h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> PHC
            </label>
            <select
              value={selectedPhc}
              onChange={(e) => {
                setSelectedPhc(e.target.value);
                setSelectedSubcentre('');
                setSelectedVillage('');
                setSelectedEmployee('');
              }}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
              disabled={role === 'subcentre_employee'}
            >
              <option value="">निवडा...</option>
              {phcs.map(p => (
                <option key={p.id} value={p.id}>{p.phc_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> उपकेंद्र
            </label>
            <select
              value={selectedSubcentre}
              onChange={(e) => {
                setSelectedSubcentre(e.target.value);
                setSelectedVillage('');
              }}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500"
              required
              disabled={role === 'subcentre_employee'}
            >
              <option value="">निवडा...</option>
              {filteredSubcentres.map(s => (
                <option key={s.id} value={s.id}>{s.subcentre_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> गाव
            </label>
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
              required
            >
              <option value="">निवडा...</option>
              {filteredVillages.map(v => (
                <option key={v.id} value={v.id}>{v.village_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" /> कर्मचारी
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
              required
              disabled={role === 'subcentre_employee'}
            >
              <option value="">निवडा...</option>
              {filteredEmployees.map(e => (
                <option key={e.id} value={e.id}>{e.employee_name} ({e.designation})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: Patient Info */}
        <div className="bg-slate-50 border-y border-slate-200 px-5 py-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-emerald-700">2</span>
            संशयित रुग्णाची माहिती
          </h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> संशयित रुग्णाचे संपूर्ण नाव
            </label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => {
                setPatientName(e.target.value);
                if(e.target.value.length > 5) validateDuplicate();
              }}
              onBlur={validateDuplicate}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="उदा. रमेश मारुती पाटील"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">वय</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="उदा. 45"
              min="1"
              max="120"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">लिंग</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as GenderType)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Male">पुरुष</option>
              <option value="Female">स्त्री</option>
              <option value="Other">इतर</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">मोबाईल क्रमांक (पर्यायी)</label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => {
                setMobileNumber(e.target.value.replace(/\D/g, '').slice(0,10));
              }}
              onBlur={validateDuplicate}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="10 अंकी क्रमांक"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5" /> निक्षय ID (पर्यायी)
            </label>
            <input
              type="text"
              value={nikshayId}
              onChange={(e) => setNikshayId(e.target.value)}
              onBlur={validateDuplicate}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
              placeholder="निक्षय प्रणालीतील ID"
            />
          </div>
        </div>

        {/* Step 3: Sample Info */}
        <div className="bg-slate-50 border-y border-slate-200 px-5 py-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-emerald-700">3</span>
            नमुना व वैद्यकीय माहिती
          </h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">नमुना घेतल्याचा दिनांक</label>
            <input
              type="date"
              value={collectionDate}
              onChange={(e) => handleCollectionDateChange(e.target.value)}
              max={getTodayDateString()}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">नमुना पाठवण्याचा दिनांक</label>
            <input
              type="date"
              value={sentDate}
              onChange={(e) => handleSentDateChange(e.target.value)}
              max={getTodayDateString()}
              min={collectionDate}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">जोखीम प्रकार</label>
            <select
              value={riskType}
              onChange={(e) => setRiskType(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              required
            >
              {riskTypes.map(rt => (
                <option key={rt} value={rt}>{rt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">नमुना प्रकार</label>
            <select
              value={sampleType}
              onChange={(e) => setSampleType(e.target.value as TBSampleType)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium text-emerald-900"
              required
            >
              <option value="Sputum">Sputum (स्पुटम)</option>
              <option value="X-Ray">X-Ray (एक्स-रे)</option>
              <option value="LPA">LPA (एल.पी.ए.)</option>
              <option value="Followup Sputum">Followup Sputum (फॉलोअप स्पुटम)</option>
              <option value="FoodBasket">FoodBasket (फूडबास्केट)</option>
            </select>
          </div>
          
          {sampleType !== 'FoodBasket' && (
            <div className="md:col-span-2 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <label className="block text-xs font-bold text-emerald-900 mb-2">
                कोठे दिला (Sample Given At) <span className="text-rose-600">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex items-center p-3 bg-white rounded-lg border border-emerald-200 cursor-pointer hover:border-emerald-500 transition-colors flex-1">
                  <input 
                    type="radio" 
                    name="sampleGivenAt" 
                    value="PHC_BHADA" 
                    checked={sampleGivenAt === 'PHC_BHADA'}
                    onChange={() => setSampleGivenAt('PHC_BHADA')}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300" 
                  />
                  <span className="ml-2 text-sm font-medium text-slate-800">प्राथमिक आरोग्य केंद्र भादा</span>
                </label>
                <label className="flex items-center p-3 bg-white rounded-lg border border-emerald-200 cursor-pointer hover:border-emerald-500 transition-colors flex-1">
                  <input 
                    type="radio" 
                    name="sampleGivenAt" 
                    value="RURAL_HOSPITAL_AUSA" 
                    checked={sampleGivenAt === 'RURAL_HOSPITAL_AUSA'}
                    onChange={() => setSampleGivenAt('RURAL_HOSPITAL_AUSA')}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300" 
                  />
                  <span className="ml-2 text-sm font-medium text-slate-800">ग्रामीण रुग्णालय औसा</span>
                </label>
              </div>
            </div>
          )}
          {sampleType === 'FoodBasket' && (
            <div className="md:col-span-2 p-3 bg-slate-100 rounded-lg text-sm text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400" /> 
              FoodBasket साठी 'कोठे दिला' हा पर्याय लागू नाही.
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="bg-slate-50 border-t border-slate-200 p-5 flex justify-end gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>सेव्ह करत आहे...</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                नोंद सेव्ह करा
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
