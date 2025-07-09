
import { useState, useEffect } from 'react';

interface PWAState {
  isInstalled: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  isOnline: boolean;
  isIOS: boolean;
  isAndroid: boolean;
}

export const usePWA = () => {
  const [pwaState, setPWAState] = useState<PWAState>({
    isInstalled: false,
    isStandalone: false,
    canInstall: false,
    isOnline: navigator.onLine,
    isIOS: false,
    isAndroid: false
  });

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    // Check if app is in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Check if app is installed
    const isInstalled = isStandalone || 
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

    setPWAState(prev => ({
      ...prev,
      isIOS,
      isAndroid,
      isStandalone,
      isInstalled
    }));

    // Listen for online/offline events
    const handleOnline = () => setPWAState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setPWAState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = () => {
      setPWAState(prev => ({ ...prev, canInstall: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  return pwaState;
};
