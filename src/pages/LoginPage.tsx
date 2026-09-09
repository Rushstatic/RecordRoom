import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Stethoscope,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  X,
  Phone,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { userService } from '../services/userService';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';
import { isDemoMode } from '../lib/env';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { loginWithRole, loginWithEmail, authError, clearAuthError } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const isSupabaseReady = isSupabaseConfigured();

  const activeError = errorMessage || authError;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    clearAuthError();

    if (!identifier.trim()) {
      setErrorMessage('कृपया आपला नोंदणीकृत ईमेल किंवा मोबाईल नंबर प्रविष्ट करा.');
      return;
    }

    if (!password) {
      setErrorMessage('कृपया आपला पासवर्ड प्रविष्ट करा.');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithEmail(identifier.trim(), password);
      onLoginSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'लॉगिन माहिती चुकीची आहे. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role: UserRole) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await loginWithRole(role);
      onLoginSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'लॉगिन माहिती चुकीची आहे. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setIsLoading(false);
    }
  };

return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
      {/* Top Government Title */}
      <div className="w-full max-w-md mx-auto text-center text-white pt-2 sm:pt-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-emerald-950 shadow-xl mb-3 border-2 border-white/20">
          <Stethoscope className="w-8 h-8" />
        </div>
        <div className="text-xs sm:text-sm font-bold text-amber-300 tracking-wider uppercase">
          महाराष्ट्र शासन • सार्वजनिक आरोग्य विभाग
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1 tracking-tight">
          आरोग्य उपकेंद्र रेकॉर्ड कीपिंग सिस्टीम
        </h1>
        <p className="text-xs text-emerald-200/90 mt-1 font-medium">
          सुरक्षित वापरकर्ता पडताळणी व प्रवेश व्यवस्थापन (CODE 11)
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-6 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Card Header Strip */}
        <div className="bg-emerald-900 text-white px-6 py-4 border-b-4 border-amber-500">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>सुरक्षित पोर्टल लॉगिन</span>
            </h2>
            <span className="text-[11px] bg-emerald-800/80 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-700">
              अधिकृत प्रवेश
            </span>
          </div>
          <p className="text-xs text-emerald-100 mt-1">
            नोंदणीकृत ईमेल/मोबाईल व पासवर्डने लॉगिन करा
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Error Message Box */}
          {activeError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">सूचना / त्रुटी</p>
                <p className="mt-0.5 leading-relaxed">{activeError}</p>
              </div>
            </div>
          )}

          {/* Real Credentials Login Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                वापरकर्ता आयडी (ईमेल किंवा मोबाईल)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                    clearAuthError();
                  }}
                  placeholder="उदा. 9730266586 किंवा phbhada@gmail.com"
                  className="w-full text-sm pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-900 transition-all font-medium"
                  required
                />
              </div>
              <div className="flex flex-col gap-0.5 text-[11px] text-slate-500 mt-1">
                <span>
                  मास्टर ॲडमिन: <strong className="text-emerald-800">9730266586</strong> (श्री. गोविंद हिप्परगेकर)
                </span>
                <span>
                  उपकेंद्र कर्मचारी: कर्मचारी मास्टरमधील मोबाईल किंवा ईमेल (डिफॉल्ट पासवर्ड: <strong className="text-slate-700">123456</strong>)
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  पासवर्ड (Password)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotModalOpen(true);
                    
                    setForgotEmail(identifier.includes('@') ? identifier : '');
                  }}
                  className="text-xs text-emerald-800 hover:text-emerald-900 hover:underline font-semibold cursor-pointer"
                >
                  पासवर्ड विसरलात?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                    clearAuthError();
                  }}
                  placeholder="••••••••"
                  className="w-full text-sm pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-900 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>पडताळणी सुरू आहे...</span>
              ) : (
                <>
                  <span>लॉगिन करा</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Options for Evaluation (Demo Mode Only) */}
          {isDemoMode() && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  डेमो भूमिका त्वरित प्रवेश (Demo Roles)
                </span>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
                  चाचणीसाठी
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('subcentre_employee')}
                  disabled={isLoading}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-0.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>उपकेंद्र कर्मचारी</span>
                  </div>
                  <div className="text-[11px] text-slate-500 group-hover:text-emerald-900 truncate">
                    सौ. सुनिता कांबळे (ANM)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('phc_controller')}
                  disabled={isLoading}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>मास्टर ॲडमिन</span>
                  </div>
                  <div className="text-[11px] text-slate-500 group-hover:text-emerald-900 truncate">
                    गोविंद हिप्परगेकर (9730266586)
                  </div>
                </button>
              </div>

              {/* Test Inactive Account Helper */}
              <div className="mt-2 text-center">
                <button
                  type="button"
                  onClick={async () => {
                    setIdentifier('inactive.user@arogya.gov.in');
                    setPassword('Test@123');
                    setErrorMessage(null);
                    try {
                      await loginWithEmail('inactive.user@arogya.gov.in', 'Test@123');
                      onLoginSuccess();
                    } catch (err: any) {
                      setErrorMessage(err.message || 'लॉगिन माहिती चुकीची आहे.');
                    }
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                >
                  निष्क्रिय खात्याची चाचणी घ्या (Test Inactive Account Block)
                </button>
              </div>
            </div>
          )}

          {/* Security Status Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-0.5">
              <Info className="w-3.5 h-3.5 text-emerald-700" />
              <span>सुरक्षा व भूमिका मर्यादा (RBAC):</span>
            </div>
            <p className="leading-relaxed">
              प्रत्येक वापरकर्त्यास त्याच्या नियुक्त उपकेंद्र किंवा PHC अधिकारक्षेत्रानुसारच डेटा नोंदणी व अहवाल पाहण्याची परवानगी आहे.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        isOpen={isForgotModalOpen} 
        onClose={() => setIsForgotModalOpen(false)} 
        initialEmail={forgotEmail} 
      />

      {/* Footer Disclaimer */}
      <div className="text-center text-[11px] text-emerald-200/80 pb-2">
        नोंद: ही अधिकृत आरोग्य कर्मचाऱ्यांसाठीची प्रणाली आहे. अनधिकृत प्रवेशास कायद्यानुसार मज्जाव आहे.
      </div>
    </div>
  );
};
