import React, { useState } from 'react';
import { HelpCircle, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { userService } from '../../services/userService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose, initialEmail = '' }) => {
  const [forgotEmail, setForgotEmail] = useState(initialEmail);
  const [forgotStatus, setForgotStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'otp' | 'new_password'>('request');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  if (!isOpen) return null;

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotStatus({ success: false, message: 'कृपया आपला नोंदणीकृत ईमेल प्रविष्ट करा.' });
      return;
    }

    setIsResetting(true);
    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      // Check if user is registered before sending OTP
      const profiles = await userService.getUserProfiles();
      const exists = profiles.some(p => p.email && p.email.toLowerCase() === cleanEmail);
      
      if (!exists) {
        setForgotStatus({ success: false, message: 'हा ईमेल आयडी सिस्टीममध्ये नोंदणीकृत नाही.' });
        setIsResetting(false);
        return;
      }

      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
        if (error) throw error;
      } else {
        // Fallback for local mock
        const response = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'OTP पाठवताना त्रुटी आली.');
      }
      
      setForgotStatus({
        success: true,
        message: 'तुमच्या नोंदणीकृत ईमेलवर 6-अंकी OTP पाठवण्यात आला आहे. कृपया तुमचा इनबॉक्स तपासा.',
      });
      setForgotStep('otp');
    } catch (err: any) {
      setForgotStatus({
        success: false,
        message: err.message || 'विनंती पाठवताना त्रुटी आली.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsResetting(true);
    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      const cleanOtp = otp.trim();

      if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanOtp, type: 'recovery' });
        if (error) throw error;
      } else {
        // Fallback for local mock
        const response = await fetch('/api/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, otp: cleanOtp }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'अवैध OTP.');
      }
      
      setForgotStatus({ success: true, message: 'OTP यशस्वीरीत्या पडताळला गेला. कृपया नवीन पासवर्ड सेट करा.' });
      setForgotStep('new_password');
    } catch (err: any) {
      setForgotStatus({ success: false, message: err.message || 'पडताळणी करताना त्रुटी आली.' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setForgotStatus({ success: false, message: 'पासवर्ड किमान 6 वर्णांचा असावा.' });
      return;
    }
    
    setIsResetting(true);
    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        // Sign out to clear the recovery session so they can login normally
        await supabase.auth.signOut();
      }

      await userService.resetPasswordByEmailOrMobile(cleanEmail, newPassword);
      setForgotStatus({ success: true, message: 'पासवर्ड यशस्वीरीत्या बदलण्यात आला आहे! आता तुम्ही लॉगिन करू शकता.' });
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err: any) {
      setForgotStatus({ success: false, message: err.message || 'पासवर्ड सेट करताना त्रुटी आली.' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = () => {
    setForgotStep('request');
    setOtp('');
    setNewPassword('');
    setForgotEmail('');
    setForgotStatus(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scaleIn">
        <div className="bg-emerald-900 text-white p-4 flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>पासवर्ड रीसेट विनंती</span>
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {forgotStatus && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                forgotStatus.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              {forgotStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <p>{forgotStatus.message}</p>
            </div>
          )}

          {forgotStep === 'request' && (
            <>
              <p className="text-xs text-slate-600 leading-relaxed">
                आपल्या खात्याशी जोडलेला अधिकृत ईमेल आयडी प्रविष्ट करा. तुम्हाला ईमेलद्वारे OTP पाठवला जाईल.
              </p>
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    नोंदणीकृत ईमेल
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="उदा. employee@arogya.gov.in"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    रद्द करा
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2 px-4 rounded-lg text-xs shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isResetting ? 'पाठवत आहे...' : 'OTP पाठवा'}
                  </button>
                </div>
              </form>
            </>
          )}

          {forgotStep === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  OTP प्रविष्ट करा
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-अंकी OTP"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none tracking-widest text-center font-bold"
                  required
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotStep('request')}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  मागे जा
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2 px-4 rounded-lg text-xs shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isResetting ? 'पडताळणी करत आहे...' : 'पुष्टी करा'}
                </button>
              </div>
            </form>
          )}

          {forgotStep === 'new_password' && (
            <form onSubmit={handleSetNewPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  नवीन पासवर्ड प्रविष्ट करा
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="किमान 6 वर्ण"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isResetting}
                className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2 px-4 rounded-lg text-xs shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isResetting ? 'सेव्ह करत आहे...' : 'पासवर्ड सेव्ह करा'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
