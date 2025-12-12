
import { useEffect, useRef, useCallback } from 'react';
import { realtimeService } from '@/services/realtimeService';

export const useRealtimeSubscription = (channelName: string, callback: () => void, deps: any[] = []) => {
  const callbackRef = useRef(callback);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Update callback ref to always have the latest callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const stableCallback = useCallback(() => {
    callbackRef.current();
  }, []);

  useEffect(() => {
    // Unsubscribe from previous subscription if exists
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Create new subscription
    unsubscribeRef.current = realtimeService.subscribe(channelName, stableCallback);
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [channelName, stableCallback, ...deps]);
};
