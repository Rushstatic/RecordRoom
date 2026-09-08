import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  statusTextMarathi: string;
  statusMessageMarathi: string;
  lastChangedAt: Date;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastChangedAt, setLastChangedAt] = useState<Date>(new Date());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastChangedAt(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastChangedAt(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    statusTextMarathi: isOnline ? 'ऑनलाइन' : 'ऑफलाइन',
    statusMessageMarathi: isOnline
      ? 'इंटरनेट कनेक्शन उपलब्ध आहे.'
      : 'इंटरनेट कनेक्शन उपलब्ध नाही. नवीन नोंदी Draft म्हणून सुरक्षित केल्या जातील.',
    lastChangedAt,
  };
}
