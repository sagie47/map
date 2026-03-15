import { NormalizedPositionUpdate, NormalizedRouteDeviation } from '../adapterInterface';
import { GTFSVehiclePosition, RouteDeviationInfo } from './gtfsTypes';

export class GTFSNormalizer {
  private deviationThreshold = 500; // meters

  normalizeVehiclePosition(vehicle: GTFSVehiclePosition): NormalizedPositionUpdate | null {
    if (!vehicle.position?.latitude || !vehicle.position?.longitude) {
      return null;
    }

    return {
      source: 'gtfs',
      assetId: vehicle.vehicle.id,
      assetType: 'ground',
      lat: vehicle.position.latitude,
      lng: vehicle.position.longitude,
      heading: vehicle.position.bearing,
      speed: vehicle.position.speed,
      timestamp: vehicle.timestamp 
        ? new Date(vehicle.timestamp * 1000).toISOString()
        : new Date().toISOString(),
      metadata: {
        tripId: vehicle.trip?.tripId,
        routeId: vehicle.trip?.routeId,
        vehicleLabel: vehicle.vehicle?.label,
        licensePlate: vehicle.vehicle?.licensePlate,
        stopId: vehicle.stopId,
        currentStatus: vehicle.currentStatus
      }
    };
  }

  detectRouteDeviation(
    vehicle: GTFSVehiclePosition,
    scheduledLat: number,
    scheduledLng: number
  ): NormalizedRouteDeviation | null {
    if (!vehicle.position?.latitude || !vehicle.position?.longitude) {
      return null;
    }

    const distance = this.calculateDistance(
      vehicle.position.latitude,
      vehicle.position.longitude,
      scheduledLat,
      scheduledLng
    );

    if (distance > this.deviationThreshold) {
      return {
        source: 'gtfs',
        assetId: vehicle.vehicle.id,
        routeId: vehicle.trip?.routeId || 'unknown',
        deviationDistance: distance,
        offRoute: true,
        lat: vehicle.position.latitude,
        lng: vehicle.position.longitude,
        timestamp: vehicle.timestamp 
          ? new Date(vehicle.timestamp * 1000).toISOString()
          : new Date().toISOString()
      };
    }

    return null;
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  setDeviationThreshold(meters: number) {
    this.deviationThreshold = meters;
  }
}

export const gtfsNormalizer = new GTFSNormalizer();
