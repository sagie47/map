import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks';

export function ToastContainer() {
  const { toasts } = useNotifications();

  return (
    <div className="absolute top-4 right-4 z-[2000] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto w-80 hud-panel p-3 transform transition-all duration-300 translate-x-0 opacity-100 ${
            toast.type === 'error'
              ? 'border-red-500'
              : toast.type === 'warning'
              ? 'border-yellow-500'
              : toast.type === 'success'
              ? 'border-[#22c55e]'
              : 'border-[#3b82f6]'
          }`}
        >
          <div className="flex items-start">
            <div
              className={`mt-0.5 mr-3 ${
                toast.type === 'error'
                  ? 'text-red-500'
                  : toast.type === 'warning'
                  ? 'text-yellow-500'
                  : toast.type === 'success'
                  ? 'text-[#22c55e]'
                  : 'text-[#3b82f6]'
              }`}
            >
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[11px] font-mono uppercase tracking-widest text-zinc-100">
                {toast.title}
              </h4>
              <p className="text-[10px] font-mono text-[#666] mt-1 uppercase">
                {toast.message}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
