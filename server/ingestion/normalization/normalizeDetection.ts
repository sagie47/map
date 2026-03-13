import { NormalizedDetection } from '../../domain/incidents/incidentService';

export function normalizeDetection(rawInput: any): NormalizedDetection {
  return {
    beaconId: String(rawInput.beaconId || rawInput.beacon_id || rawInput.id || ''),
    domainType: String(rawInput.domainType || rawInput.domain_type || 'unknown'),
    isTest: Boolean(rawInput.isTest || rawInput.is_test),
    lat: Number(rawInput.lat || rawInput.latitude || 0),
    lng: Number(rawInput.lng || rawInput.longitude || 0),
    receiverId: String(rawInput.receiverId || rawInput.receiver_id || ''),
    signalStrength: Number(rawInput.signalStrength || rawInput.signal_strength || 0),
    detectedAt: String(rawInput.detectedAt || rawInput.detected_at || new Date().toISOString())
  };
}
