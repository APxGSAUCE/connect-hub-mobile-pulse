
import { useEffect, useRef } from 'react';
import { realtimeService } from '@/services/realtimeService';

export const useRealtimeSubscription = (channelName: string, callback: () => void, deps: any[] = []) => {
  const callbackRef = useRef(callback);
  
  // Update callback ref to always have the latest callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const wrappedCallback = () => callbackRef.current();
    const unsubscribe = realtimeService.subscribe(channelName, wrappedCallback);
    
    return unsubscribe;
  }, [channelName, ...deps]);
};
