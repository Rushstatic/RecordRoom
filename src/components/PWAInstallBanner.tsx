import React, { useState } from 'react';
import { Download, Smartphone, X, Check, HelpCircle } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already installed as PWA or user dismissed this session
  if (isInstalled || dismissed) {
    return null;
  }

  // Only show if browser supports install or is iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  return (
    <>
      <div className="bg-linear-to-r from-emerald-800 to-teal-900 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-700/80 border border-emerald-500/50 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-emerald-200" />
          </div>
          <div>
            <span className="font-semibold">मोबाईल अॅप इन्स्टॉल करा:</span>{' '}
            <span className="text-emerald-100">
              हे अॅप मोबाईलमध्ये Install करून इंटरनेटशिवाय Draft नोंदी करण्याची सुविधा वापरू शकता.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            disabled={installing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isIOS ? 'iOS वर इन्स्टॉल' : 'अॅप इन्स्टॉल करा'}</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md text-emerald-200 hover:text-white hover:bg-emerald-700 transition"
            title="बंद करा"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Safari Installation Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-slate-800 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-700" />
                iPhone / iPad वर इन्स्टॉल करा
              </h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <p className="font-medium text-slate-800">
                Apple Safari ब्राउझरमध्ये हे अॅप होम स्क्रीनवर जोडण्यासाठी पुढील पायऱ्या वापरा:
              </p>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>Safari खालील <strong>Share (शेअर)</strong> चिन्हावर टॅप करा.</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>खाली स्क्रोल करून <strong>'Add to Home Screen'</strong> निवडा.</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>वर उजवीकडे <strong>'Add'</strong> दाबा.</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs transition"
            >
              समजले
            </button>
          </div>
        </div>
      )}
    </>
  );
};
