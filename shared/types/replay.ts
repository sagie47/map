export interface ReplayEventDto {
  id: string;
  incidentId: string;
  receiverStationId: string;
  eventType: string;
  signalStrength: number;
  lat: number;
  lng: number;
  detectedAt: string;
  stationName?: string;
  stationCode?: string;
}

export interface ReplayTransitionDto {
  id: string;
  incidentId: string;
  fromStatus: string | null;
  toStatus: string;
  confidenceScore: number | null;
  reason: string | null;
  transitionedAt: string;
}

export interface ReplayBoundsDto {
  startTime: string;
  endTime: string;
  totalDuration: number;
  eventCount: number;
}

export interface ReplayIncidentDto {
  id: string;
  beaconId: string;
  domainType: string;
  status: string;
  severity: string;
  firstSeenAt: string;
  lastSeenAt: string;
  estimatedLat: number;
  estimatedLng: number;
  confidenceScore: number;
  externalIdentifier?: string;
  beaconType?: string;
}

export interface ReplayResponseDto {
  incident: ReplayIncidentDto;
  events: ReplayEventDto[];
  transitions: ReplayTransitionDto[];
  bounds: ReplayBoundsDto;
}

export interface ReplayFrameDto {
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
  transition: ReplayTransitionDto | null;
}
