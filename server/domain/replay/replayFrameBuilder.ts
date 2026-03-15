import { ReplayEvent, ReplayTransition } from '../../db/repositories/replayRepo';

export interface ReplayFrame {
  index: number;
  timestamp: string;
  incidentStatus: string;
  confidenceScore: number;
  estimatedLat: number;
  estimatedLng: number;
  activeDetections: {
    id: string;
    lat: number;
    lng: number;
    receiverId: string;
    signalStrength: number;
  }[];
  visibleReceivers: string[];
  highlightedEventId: string | null;
  transition: ReplayTransition | null;
}

export interface FrameInput {
  events: ReplayEvent[];
  transitions: ReplayTransition[];
  bounds: {
    startTime: string;
    endTime: string;
    totalDuration: number;
    eventCount: number;
  };
}

export class ReplayFrameBuilder {
  buildFrame(input: FrameInput, index: number): ReplayFrame {
    const { events, transitions, bounds } = input;
    
    if (index < 0 || index >= events.length) {
      throw new Error(`Invalid frame index: ${index}`);
    }

    const currentEvent = events[index];
    const eventsUpToNow = events.slice(0, index + 1);
    
    const transition = transitions.find(t => 
      new Date(t.transitionedAt) <= new Date(currentEvent.detectedAt)
    ) || null;

    const activeDetections = eventsUpToNow.map(e => ({
      id: e.id,
      lat: e.lat,
      lng: e.lng,
      receiverId: e.receiverStationId,
      signalStrength: e.signalStrength
    }));

    const visibleReceivers = [...new Set(eventsUpToNow.map(e => e.receiverStationId))];

    const avgLat = activeDetections.reduce((sum, d) => sum + d.lat, 0) / activeDetections.length;
    const avgLng = activeDetections.reduce((sum, d) => sum + d.lng, 0) / activeDetections.length;

    const confidenceScore = this.calculateConfidenceAtFrame(eventsUpToNow);

    return {
      index,
      timestamp: currentEvent.detectedAt,
      incidentStatus: transition?.toStatus || 'ACTIVE',
      confidenceScore,
      estimatedLat: avgLat,
      estimatedLng: avgLng,
      activeDetections,
      visibleReceivers,
      highlightedEventId: currentEvent.id,
      transition
    };
  }

  buildFrames(input: FrameInput): ReplayFrame[] {
    return input.events.map((_, index) => this.buildFrame(input, index));
  }

  getFrameAtTimestamp(input: FrameInput, timestamp: string): ReplayFrame | null {
    const { events } = input;
    
    for (let i = events.length - 1; i >= 0; i--) {
      if (new Date(events[i].detectedAt) <= new Date(timestamp)) {
        return this.buildFrame(input, i);
      }
    }
    
    return null;
  }

  getFrameAtProgress(input: FrameInput, progress: number): ReplayFrame {
    const { events } = input;
    const index = Math.min(Math.floor(progress * events.length), events.length - 1);
    return this.buildFrame(input, Math.max(0, index));
  }

  private calculateConfidenceAtFrame(events: ReplayEvent[]): number {
    const uniqueReceivers = new Set(events.map(e => e.receiverStationId)).size;
    const detectionCount = events.length;
    const avgSignalStrength = events.reduce((sum, e) => sum + e.signalStrength, 0) / events.length;

    const receiverMultiplier = Math.min(uniqueReceivers / 3, 1);
    const detectionMultiplier = Math.min(detectionCount / 5, 1);
    const signalMultiplier = Math.min((avgSignalStrength || -50) / -30, 1);

    return Math.min(
      0.3 + 
      (receiverMultiplier * 0.3) + 
      (detectionMultiplier * 0.25) + 
      (signalMultiplier * 0.15),
      1.0
    );
  }
}

export const replayFrameBuilder = new ReplayFrameBuilder();
