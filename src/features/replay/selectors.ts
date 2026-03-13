import { Incident } from "@shared/types/incidents";
import { SignalEvent } from "@shared/types/events";

export function selectReplayedIncident(
  incident: Incident | undefined,
  events: SignalEvent[],
  currentIndex: number
): Incident | null {
  const currentEvent = events[currentIndex];
  if (!incident || !currentEvent) return null;

  return {
    ...incident,
    estimatedLat: currentEvent.lat,
    estimatedLng: currentEvent.lng,
    confidenceScore: Math.min(0.99, 0.4 + currentIndex * 0.05),
    lastSeenAt: currentEvent.detectedAt,
  };
}
