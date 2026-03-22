import React from 'react';
import { WifiOff } from 'lucide-react';
import { useConnectionStore } from '../store';

export function ConnectionBanner() {
  const status = useConnectionStore((state) => state.status);

  if (status === 'connected') return null;

  return (
    <div className="absolute top-0 left-0 w-full z-[2000] bg-red-900/20 border-b border-red-500/50 backdrop-blur-md text-red-500 px-4 py-1.5 flex items-center justify-center text-[10px] font-mono uppercase tracking-[0.2em] shadow-[0_2px_15px_rgba(239,68,68,0.15)]">
      <WifiOff className="w-3.5 h-3.5 mr-2 animate-pulse" />
      /CONNECTION_LOST // ATTEMPTING_RECOVERY // NO_STATION_SYNC
    </div>
  );
}
