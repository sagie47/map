import { AISAdapter } from './ais/aisAdapter';
import { OpenSkyAdapter } from './opensky/openSkyAdapter';
import { SatelliteAdapter } from './satellite/satelliteAdapter';
import { GTFSAdapter } from './gtfs/gtfsAdapter';
import { adapterRegistry } from './adapterRegistry';
import { pollingScheduler } from './pollingScheduler';
import { adapterConfigManager } from './adapterConfig';
import { incidentService } from '../../domain/incidents/incidentService';
import { subsystemLoggers } from '../../app/logger';

const logger = subsystemLoggers.adapter;

export async function initializeAdapters() {
  const config = adapterConfigManager.getSettings();

  const events = {
    onPositionUpdate: (update) => {
      logger.debug('position_update', `Position update from ${update.source}`, {
        assetId: update.assetId,
        assetType: update.assetType,
        lat: update.lat,
        lng: update.lng
      });
    },
    onDetection: (detection) => {
      logger.info('detection', `Detection from ${detection.source}`, {
        beaconId: detection.beaconId,
        domainType: detection.domainType,
        lat: detection.lat,
        lng: detection.lng
      });
    },
    onCoverageEvent: (event) => {
      logger.info('coverage_event', `Coverage event from ${event.source}`, {
        satelliteId: event.satelliteId,
        eventType: event.eventType
      });
    },
    onSourceError: (error) => {
      logger.error('source_error', `Error from ${error.source}`, new Error(error.message), {
        recoverable: error.recoverable
      });
    }
  };

  if (config.ais.enabled) {
    const aisAdapter = new AISAdapter({
      streamingUrl: config.ais.streamingUrl,
      apiKey: config.ais.apiKey,
      boundingBox: config.ais.boundingBox
    });
    aisAdapter.setEvents(events);
    adapterRegistry.register('ais', aisAdapter, { enabled: true });
    logger.info('adapter_registered', 'AIS adapter registered');
  }

  if (config.opensky.enabled) {
    const openSkyAdapter = new OpenSkyAdapter({
      boundingBox: config.opensky.boundingBox,
      pollingInterval: config.opensky.pollingInterval
    });
    openSkyAdapter.setEvents(events);
    adapterRegistry.register('opensky', openSkyAdapter, { enabled: true });
    pollingScheduler.schedule('opensky', openSkyAdapter, () => openSkyAdapter.poll(), config.opensky.pollingInterval);
    logger.info('adapter_registered', 'OpenSky adapter registered');
  }

  if (config.satellite.enabled) {
    const satelliteAdapter = new SatelliteAdapter({
      provider: config.satellite.provider,
      apiKey: config.satellite.apiKey,
      satelliteIds: config.satellite.satelliteIds,
      pollingInterval: config.satellite.pollingInterval
    });
    satelliteAdapter.setEvents(events);
    adapterRegistry.register('satellite', satelliteAdapter, { enabled: true });
    pollingScheduler.schedule('satellite', satelliteAdapter, () => satelliteAdapter.pollPositions(), config.satellite.pollingInterval);
    logger.info('adapter_registered', 'Satellite adapter registered');
  }

  if (config.gtfs.enabled) {
    const gtfsAdapter = new GTFSAdapter({
      feedUrl: config.gtfs.feedUrl,
      pollingInterval: config.gtfs.pollingInterval,
      deviationThreshold: config.gtfs.deviationThreshold
    });
    gtfsAdapter.setEvents(events);
    adapterRegistry.register('gtfs', gtfsAdapter, { enabled: true });
    pollingScheduler.schedule('gtfs', gtfsAdapter, () => gtfsAdapter.poll(), config.gtfs.pollingInterval);
    logger.info('adapter_registered', 'GTFS adapter registered');
  }

  await adapterRegistry.startAll();
  pollingScheduler.startAll();

  logger.info('adapters_initialized', `Initialized ${adapterRegistry.getAllAdapters().length} adapters`);
}

export async function shutdownAdapters() {
  logger.info('shutdown_adapters', 'Shutting down adapters');
  await adapterRegistry.stopAll();
  pollingScheduler.stopAll();
  logger.info('adapters_shutdown', 'All adapters stopped');
}
