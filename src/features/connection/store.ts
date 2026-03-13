import { create } from 'zustand';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface ConnectionState {
  status: ConnectionStatus;
  lastMessageAt: string | null;
  setStatus: (status: ConnectionStatus) => void;
  setLastMessageAt: (timestamp: string) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  lastMessageAt: null,
  setStatus: (status) => set({ status }),
  setLastMessageAt: (timestamp) => set({ lastMessageAt: timestamp }),
}));
