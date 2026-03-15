export * from '../shared/types/domain';
export * from '../shared/types/incidents';
export * from '../shared/types/receivers';
export * from '../shared/types/events';
export * from '../shared/types/websocket';
export * from '../shared/types/api';
export * from '../shared/types/replay';
export * from '../shared/types/analytics';
export * from '../shared/types/sources';
export * from '../shared/constants/statuses';
export * from '../shared/constants/thresholds';

export interface Beacon {
  id: string;
  externalIdentifier: string;
  beaconType: string;
  protocol: string;
  frequency: string;
  registrationRegion: string;
  isTestDevice: boolean;
}
