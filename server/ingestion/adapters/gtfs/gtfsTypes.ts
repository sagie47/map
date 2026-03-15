export interface GTFSVehiclePosition {
  trip: {
    tripId: string;
    routeId: string;
    directionId?: number;
    scheduleRelationship?: string;
  };
  vehicle: {
    id: string;
    label?: string;
    licensePlate?: string;
  };
  position: {
    latitude: number;
    longitude: number;
    bearing?: number;
    speed?: number;
  };
  currentStopSequence?: number;
  stopId?: string;
  currentStatus?: string;
  timestamp?: number;
}

export interface GTFSAlert {
  alertId: string;
  cause?: string;
  effect?: string;
  headerText: { text: string };
  descriptionText: { text: string };
  activePeriod?: { start: number; end?: number }[];
}

export interface GTFSConfig {
  feedUrl: string;
  routeIds?: string[];
  pollingInterval?: number;
  deviationThreshold?: number;
}

export interface RouteDeviationInfo {
  vehicleId: string;
  routeId: string;
  stopId?: string;
  deviationDistance: number;
  deviationTime: number;
}
