import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks';

export function ToastContainer() {
  const { toasts } = useNotifications();

  return (
    <div className="absolute left-3 right-3 top-14 z-[2000] flex flex-col gap-2 pointer-events-none sm:left-auto sm:right-4 sm:top-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto w-full max-w-sm hud-panel p-3 transform transition-all duration-300 translate-x-0 opacity-100 ${
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
              className={`mr-3 mt-0.5 shrink-0 ${
                toast.type === 'error'
                  ? 'text-red-500'
                  : toast.type === 'warning'
                  ? 'text-yellow-500'
                  : toast.type === 'success'
                  ? 'text-[#22c55e]'
                  : 'text-[#3b82f6]'
              }`}
            >
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h4 className="break-words text-[11px] font-mono uppercase tracking-widest text-zinc-100">
                {toast.title}
              </h4>
              <p className="mt-1 break-words text-[10px] font-mono uppercase text-[#666]">
                {toast.message}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
