import { create } from 'zustand';
import { useConnectionStore } from '../features/connection/store';
import { useNotificationStore } from '../features/notifications/store';

// This file acts as a central registry for global stores if needed, 
// though individual features should own their own stores.
// We can use this to expose a unified interface if required.

export const useAppStore = create(() => ({
  // Global app state can be added here if it doesn't belong to a specific feature
}));
