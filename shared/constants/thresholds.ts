export const THRESHOLDS = {
  CONFIDENCE: {
    HIGH: 0.8,
    MEDIUM: 0.5,
    LOW: 0.2
  },
  RECEIVER: {
    HEARTBEAT_STALE_MS: 5 * 60 * 1000,
    DEGRADED_LATENCY_MS: 100,
  },
  REPLAY: {
    DEFAULT_SPEED: 1,
    MAX_SPEED: 10
  }
} as const;
