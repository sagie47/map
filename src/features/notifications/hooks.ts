import { useNotificationStore } from './store';

export function useNotifications() {
  const toasts = useNotificationStore((state) => state.toasts);
  const addToast = useNotificationStore((state) => state.addToast);
  const removeToast = useNotificationStore((state) => state.removeToast);

  return { toasts, addToast, removeToast };
}
