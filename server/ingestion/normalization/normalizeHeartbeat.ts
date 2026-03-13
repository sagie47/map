export interface NormalizedHeartbeat {
  receiverId: string;
  status: string;
  timestamp: string;
}

export function normalizeHeartbeat(rawInput: any): NormalizedHeartbeat {
  return {
    receiverId: String(rawInput.receiverId || rawInput.receiver_id || rawInput.id || ''),
    status: String(rawInput.status || 'online'),
    timestamp: String(rawInput.timestamp || rawInput.time || new Date().toISOString())
  };
}
