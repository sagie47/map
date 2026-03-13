import React from 'react';
import { WifiOff } from 'lucide-react';
import { useConnectionStore } from '../store';

export function ConnectionBanner() {
  const status = useConnectionStore((state) => state.status);

  if (status === 'connected') return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] hud-panel border-red-500 text-red-500 px-4 py-2 flex items-center text-[11px] font-mono uppercase tracking-widest">
      <WifiOff className="w-4 h-4 mr-2" />
      /CONNECTION_LOST // RECONNECTING...
    </div>
  );
}
