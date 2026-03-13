import { useEffect } from 'react';
import { socketClient } from './socketClient';
import { useConnectionStore } from './store';

export function useSocketConnection() {
  const status = useConnectionStore((state) => state.status);
  const lastMessageAt = useConnectionStore((state) => state.lastMessageAt);

  useEffect(() => {
    socketClient.connect();
    return () => {
      socketClient.disconnect();
    };
  }, []);

  return { status, lastMessageAt };
}

export function useSocketSubscription(handler: (type: string, payload: any) => void) {
  useEffect(() => {
    return socketClient.subscribe(handler);
  }, [handler]);
}
