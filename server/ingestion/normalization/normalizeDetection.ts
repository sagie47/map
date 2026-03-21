import { NormalizedDetection } from '../../domain/incidents/incidentService';

function normalizeDomainType(value: unknown): 'marine' | 'aviation' | 'personal' | 'ground' {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'marine' || normalized === 'aviation' || normalized === 'personal' || normalized === 'ground') {
    return normalized;
  }
  return 'ground';
}

export function normalizeDetection(rawInput: any): NormalizedDetection {
  const lat = Number(rawInput.lat ?? rawInput.latitude ?? 0);
  const lng = Number(rawInput.lng ?? rawInput.longitude ?? 0);

  return {
    beaconId: String(rawInput.beaconId || rawInput.beacon_id || rawInput.id || ''),
    domainType: normalizeDomainType(rawInput.domainType || rawInput.domain_type),
    isTest: Boolean(rawInput.isTest || rawInput.is_test),
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
    receiverId: String(rawInput.receiverId || rawInput.receiver_id || ''), 
    signalStrength: Number(rawInput.signalStrength || rawInput.signal_strength || 0),
    detectedAt: String(rawInput.detectedAt || rawInput.detected_at || new Date().toISOString())
  };
}
