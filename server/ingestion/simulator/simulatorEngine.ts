import { receiversRepo } from '../../db/repositories/receiversRepo';
import { RECEIVER_STATUSES } from '../../../shared/constants/statuses';
import { eventIngestionService } from '../../domain/events/eventIngestionService';
import { mapAndBroadcast } from '../../realtime/wsMessages';
import { createRandomScenario, Scenario } from './scenarioFactory';

let heartbeatInterval: NodeJS.Timeout | null = null;
let incidentInterval: NodeJS.Timeout | null = null;

export function startSimulation() {
  console.log('Starting simulation engine...');

  // Simulate receiver heartbeats
  heartbeatInterval = setInterval(() => {
    const receivers = receiversRepo.listReceivers();
    receivers.forEach(receiver => {
      const isOnline = Math.random() > 0.05;
      const status = isOnline ? RECEIVER_STATUSES.ONLINE : RECEIVER_STATUSES.DEGRADED;
      
      const events = eventIngestionService.ingestHeartbeat({
        receiverId: receiver.id,
        status,
        timestamp: new Date().toISOString()
      });
      
      mapAndBroadcast(events);
    });
  }, 10000);

  // Generate a new incident every 30-60 seconds
  incidentInterval = setInterval(() => {
    if (Math.random() > 0.5) return;

    const scenario = createRandomScenario();
    simulateDetections(scenario);

  }, 15000);
}

export function stopSimulation() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (incidentInterval) clearInterval(incidentInterval);
  heartbeatInterval = null;
  incidentInterval = null;
  console.log('Simulation engine stopped');
}

export function triggerDemoIncident() {
  const scenario = createRandomScenario();
  simulateDetections(scenario);
  return scenario;
}

function simulateDetections(scenario: Scenario) {
  let count = 0;
  let currentLat = scenario.baseLat;
  let currentLng = scenario.baseLng;

  const interval = setInterval(() => {
    if (count >= scenario.maxDetections) {
      clearInterval(interval);
      return;
    }

    const allReceivers = receiversRepo.listReceivers();
    const receivers = allReceivers.filter(r => r.status === RECEIVER_STATUSES.ONLINE);
    if (receivers.length === 0) return;

    const now = new Date().toISOString();
    const numReceivers = Math.floor(Math.random() * 3) + 1;
    
    currentLat += scenario.latDrift;
    currentLng += scenario.lngDrift;

    const lat = currentLat + (Math.random() * 0.05 - 0.025);
    const lng = currentLng + (Math.random() * 0.05 - 0.025);

    for (let i = 0; i < numReceivers; i++) {
      const receiver = receivers[Math.floor(Math.random() * receivers.length)];
      
      const events = eventIngestionService.ingestDetection({
        beaconId: scenario.beaconId,
        domainType: scenario.domainType,
        isTest: scenario.isTest,
        lat,
        lng,
        receiverId: receiver.id,
        signalStrength: Math.random() * 100,
        detectedAt: now
      });
      
      mapAndBroadcast(events);
    }

    count++;
  }, 5000);
}
