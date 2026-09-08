import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const NetworkStatusIndicator: React.FC = () => {
  const { isOnline, statusMessageMarathi } = useNetworkStatus();
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shadow-xs ${
          isOnline
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
            : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 animate-pulse'
        }`}
        title={statusMessageMarathi}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-emerald-500' : 'bg-rose-600 animate-ping'
          }`}
        />
        {isOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">🟢 ऑनलाइन</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-rose-600" />
            <span>🔴 ऑफलाइन</span>
          </>
        )}
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-white border border-slate-200 rounded-xl shadow-xl z-50 text-xs">
          <div className="flex items-start gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-slate-900">
                {isOnline ? '🟢 ऑनलाइन कनेक्शन' : '🔴 ऑफलाइन मोड'}
              </p>
              <p className="mt-1 text-slate-600 leading-relaxed">
                {statusMessageMarathi}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTooltip(false)}
            className="mt-2 w-full py-1 text-center font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 rounded-lg"
          >
            समजले
          </button>
        </div>
      )}
    </div>
  );
};
