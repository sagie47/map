import React from 'react';
import { WifiOff } from 'lucide-react';
import { useConnectionStore } from '../store';

export function ConnectionBanner() {
  const status = useConnectionStore((state) => state.status);

  if (status === 'connected') return null;

  return (
    <div className="absolute left-1/2 top-3 z-[1000] flex w-[calc(100%-1.5rem)] max-w-max -translate-x-1/2 items-center justify-center gap-2 border-red-500 px-3 py-2 text-center text-[10px] font-mono uppercase tracking-widest text-red-500 hud-panel sm:top-4 sm:w-auto sm:px-4 sm:text-[11px]">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>/CONNECTION_LOST // RECONNECTING...</span>
    </div>
  );
}
