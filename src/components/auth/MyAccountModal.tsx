import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  Phone,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface MyAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MyAccountModal: React.FC<MyAccountModalProps> = ({ isOpen, onClose }) => {
  const { user, isPhcController, updatePassword } = useAuth();

  const [isChangingPass, setIsChangingPass] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen && user?.requirePasswordChange) {
      setIsChangingPass(true);
    }
  }, [isOpen, user?.requirePasswordChange]);

  if (!isOpen || !user) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPassword.length < 6) {
      setPassError('पासवर्ड किमान ६ अक्षरांचा असणे आवश्यक आहे.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('नवीन पासवर्ड आणि खात्री पासवर्ड जुळत नाहीत.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(newPassword);
      setPassSuccess('आपला पासवर्ड यशस्वीरित्या बदलला आहे.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsChangingPass(false);
        setPassSuccess(null);
      }, 3000);
    } catch (err: any) {
      setPassError(err.message || 'पासवर्ड बदलताना त्रुटी आली.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="bg-emerald-900 text-white p-4 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-400 text-emerald-950 flex items-center justify-center font-bold">
              {isPhcController ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold">माझे खाते (My Profile)</h3>
              <p className="text-[11px] text-emerald-200">सध्या लॉगिन असलेले वापरकर्ता तपशील</p>
            </div>
          </div>
          {!user.requirePasswordChange && (
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Status Capsule */}
          <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            <div>
              <div className="text-[11px] text-emerald-700 font-semibold">खाते स्थिती</div>
              <div className="font-bold text-emerald-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>सक्रिय (Active & Verified)</span>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-200/80 text-emerald-900 border border-emerald-300">
              {user.roleTitleMarathi}
            </span>
          </div>

          {/* User Details Grid */}
          <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">नाव:</span>
              <span className="font-bold text-slate-900">{user.marathiName}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">ईमेल:</span>
              <span className="font-mono font-medium text-slate-800">{user.email || '-'}</span>
            </div>

            {user.phone && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">मोबाईल:</span>
                <span className="font-mono text-slate-800">{user.phone}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">प्रा.आ. केंद्र (PHC):</span>
              <span className="font-semibold text-slate-900">{user.assignedPhc}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">उपकेंद्र अधिकारक्षेत्र:</span>
              <span className="font-semibold text-emerald-900">{user.assignedSubcentre}</span>
            </div>

            {user.smearCode && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">मलेरिया स्मीअर कोड:</span>
                <span className="font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                  {user.smearCode}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">तालुका व जिल्हा:</span>
              <span className="text-slate-700">
                {user.taluka || 'शिरूर'}, {user.district || 'पुणे'}
              </span>
            </div>
          </div>

          {/* Change Password Toggle or Form */}
          {!isChangingPass ? (
            <button
              type="button"
              onClick={() => setIsChangingPass(true)}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-slate-600" />
              <span>पासवर्ड बदला (Change Password)</span>
            </button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-3 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                  <span>नवीन पासवर्ड सेट करा</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsChangingPass(false)}
                  className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                >
                  रद्द करा
                </button>
              </div>

              {passError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-1.5 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              {passSuccess && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{passSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  नवीन पासवर्ड (किमान ६ अक्षरे)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  नवीन पासवर्ड खात्री करा
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold py-2 rounded-lg text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'जतन करत आहे...' : 'पासवर्ड अद्यतन करा'}
              </button>
            </form>
          )}

          {/* Close button */}
          {!user.requirePasswordChange && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                पूर्ण झाले
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
