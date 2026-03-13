export interface Scenario {
  beaconId: string;
  domainType: string;
  isTest: boolean;
  baseLat: number;
  baseLng: number;
  latDrift: number;
  lngDrift: number;
  maxDetections: number;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function createRandomScenario(): Scenario {
  const beaconId = `B-${generateId()}`;
  const lat = (Math.random() * 140) - 70;
  const lng = (Math.random() * 360) - 180;
  const types = ['aviation', 'marine', 'personal'];
  const domainType = types[Math.floor(Math.random() * types.length)];
  const isTest = Math.random() > 0.8;

  const latDrift = domainType === 'marine' ? (Math.random() * 0.02 - 0.01) : 0;
  const lngDrift = domainType === 'marine' ? (Math.random() * 0.02 - 0.01) : 0;

  const maxDetections = Math.floor(Math.random() * 10) + 5;

  return {
    beaconId,
    domainType,
    isTest,
    baseLat: lat,
    baseLng: lng,
    latDrift,
    lngDrift,
    maxDetections
  };
}
