
import { useEffect, useRef } from 'react';
import { realtimeService } from '@/services/realtimeService';

export const useRealtimeSubscription = (channelName: string, callback: () => void, deps: any[] = []) => {
  const callbackRef = useRef(callback);
  const isSubscribedRef = useRef(false);
  
  // Update callback ref to always have the latest callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (isSubscribedRef.current) return;
    
    isSubscribedRef.current = true;
    const wrappedCallback = () => callbackRef.current();
    const unsubscribe = realtimeService.subscribe(channelName, wrappedCallback);
    
    return () => {
      isSubscribedRef.current = false;
      unsubscribe();
    };
  }, [channelName, ...deps]);
};
