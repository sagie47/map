import { AISAdapter } from './ais/aisAdapter';
import { OpenSkyAdapter } from './opensky/openSkyAdapter';
import { SatelliteAdapter } from './satellite/satelliteAdapter';
import { CelesTrakAdapter, CelesTrakGroup } from './satellite/celestrakAdapter';
import { GTFSAdapter } from './gtfs/gtfsAdapter';
import { NWSAdapter } from './nws/nwsAdapter';
import { MarineTrafficAdapter } from './marinetraffic/mtAdapter';
import { ADSBAdapter } from './adsb/adsbAdapter';
import { WindyAdapter } from './windy/windyAdapter';
import { USGSAdapter } from './usgs/usgsAdapter';
import { NDBCAdapter } from './ndbc/ndbcAdapter';
import { NWWSAdapter } from './nwws/nwwsAdapter';
import { adapterRegistry } from './adapterRegistry';
import { pollingScheduler } from './pollingScheduler';
import { adapterConfigManager } from './adapterConfig';
import { subsystemLoggers } from '../../app/logger';
import { broadcaster } from '../../realtime/broadcaster';
import { WEBSOCKET_EVENTS } from '../../../shared/types/websocket';
import { eventIngestionService } from '../../domain/events/eventIngestionService';
import { mapAndBroadcast } from '../../realtime/wsMessages';
import { receiversRepo } from '../../db/repositories/receiversRepo';
import { RECEIVER_STATUSES } from '../../../shared/constants/statuses';

const logger = subsystemLoggers.adapter;
const virtualReceiverCache = new Set<string>();
const lastPositionBroadcastByAsset = new Map<string, number>();
const positionUpdateBuffer = new Map<string, any>();
let positionFlushTimer: ReturnType<typeof setInterval> | null = null;
const POSITION_BROADCAST_MIN_INTERVAL_MS = Number.parseInt(
  process.env.POSITION_BROADCAST_MIN_INTERVAL_MS || '1200',
  10
);
const POSITION_BROADCAST_FLUSH_MS = Number.parseInt(
  process.env.POSITION_BROADCAST_FLUSH_MS || '400',
  10
);
const MAX_POSITION_BUFFER_SIZE = Number.parseInt(
  process.env.POSITION_BROADCAST_BUFFER_MAX || '6000',
  10
);

function normalizeDomainType(value: unknown): 'marine' | 'aviation' | 'personal' | 'ground' {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'marine' || normalized === 'aviation' || normalized === 'personal' || normalized === 'ground') {
    return normalized;
  }
  return 'ground';
}

function buildVirtualReceiverId(source: string): string {
  const suffix = source.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 18);
  return `SRC-${suffix}`;
}

function ensureVirtualReceiver(source: string, lat: number, lng: number): string {
  const id = buildVirtualReceiverId(source);
  if (virtualReceiverCache.has(id)) {
    return id;
  }

  virtualReceiverCache.add(id);

  try {
    const existing = receiversRepo.getById(id);
    if (!existing) {
      const now = new Date().toISOString();
      receiversRepo.createReceiver({
        id,
        station_code: id,
        station_name: `Source ${source.toUpperCase()}`,
        lat,
        lng,
        region: 'VIRTUAL',
        status: RECEIVER_STATUSES.ONLINE,
        last_heartbeat_at: now,
        packet_delay_ms: 0
      });
    }
  } catch (error) {
    virtualReceiverCache.delete(id);
    throw error;
  }
  return id;
}

export async function initializeAdapters() {
  adapterConfigManager.reloadFromEnv();
  const config = adapterConfigManager.getSettings();
  const configIssues = adapterConfigManager.validateSettings();
  if (configIssues.length > 0) {
    const message = `Adapter configuration invalid:\n- ${configIssues.join('\n- ')}`;
    if (process.env.RUNTIME_MODE === 'live') {
      throw new Error(message);
    }
    logger.warn('adapter_config_invalid', message);
  }

  const events = {
    onPositionUpdate: (update) => {
      const now = Date.now();
      const lastSentAt = lastPositionBroadcastByAsset.get(update.assetId) ?? 0;
      if (now - lastSentAt < POSITION_BROADCAST_MIN_INTERVAL_MS) {
        return;
      }
      lastPositionBroadcastByAsset.set(update.assetId, now);
      positionUpdateBuffer.set(update.assetId, update);
      if (positionUpdateBuffer.size > MAX_POSITION_BUFFER_SIZE) {
        const oldestKey = positionUpdateBuffer.keys().next().value;
        if (oldestKey) {
          positionUpdateBuffer.delete(oldestKey);
        }
      }
    },
    onDetection: (detection) => {
      try {
        const receiverId = ensureVirtualReceiver(
          detection.source,
          Number.isFinite(detection.lat) ? detection.lat : 0,
          Number.isFinite(detection.lng) ? detection.lng : 0
        );
        const beaconId = detection.beaconId || `${detection.source}-${Date.now().toString(36)}`;
        const ingestedEvents = eventIngestionService.ingestDetection({
          beaconId,
          domainType: normalizeDomainType(detection.domainType),
          isTest: false,
          lat: Number.isFinite(detection.lat) ? detection.lat : 0,
          lng: Number.isFinite(detection.lng) ? detection.lng : 0,
          receiverId,
          signalStrength: detection.signalStrength ?? 60,
          detectedAt: detection.timestamp || new Date().toISOString()
        });
        mapAndBroadcast(ingestedEvents);
        logger.info('detection_ingested', `Detection ingested from ${detection.source}`, {
          beaconId,
          receiverId,
          eventsEmitted: ingestedEvents.length
        });
      } catch (error) {
        logger.error('detection_ingest_failed', `Failed to ingest detection from ${detection.source}`, error as Error);
      }
    },
    onHeartbeat: (heartbeat) => {
      try {
        const events = eventIngestionService.ingestHeartbeat(heartbeat);
        mapAndBroadcast(events);
      } catch (error) {
        logger.error('heartbeat_ingest_failed', `Failed to ingest heartbeat from ${heartbeat.source}`, error as Error);
      }
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
    },
    onAlert: (alert) => {
      logger.info('weather_alert', `Weather alert from ${alert.source}`, {
        alertId: alert.alertId,
        type: alert.type,
        severity: alert.severity
      });
      broadcaster.broadcast(WEBSOCKET_EVENTS.ALERT_UPSERT, alert);
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
      clientId: config.opensky.clientId,
      clientSecret: config.opensky.clientSecret,
      boundingBox: config.opensky.boundingBox,
      pollingInterval: config.opensky.pollingInterval
    });
    openSkyAdapter.setEvents(events);
    adapterRegistry.register('opensky', openSkyAdapter, { enabled: true });
    pollingScheduler.schedule('opensky', openSkyAdapter, () => openSkyAdapter.poll(), config.opensky.pollingInterval);
    logger.info('adapter_registered', 'OpenSky adapter registered');
  }

  if (config.satellite.enabled) {
    if (config.satellite.provider === 'celestrak') {
      const celestrakAdapter = new CelesTrakAdapter({
        groups: (config.satellite.celestrakGroups || ['stations', 'visual', 'gps-ops']) as CelesTrakGroup[],
        pollingInterval: config.satellite.pollingInterval
      });
      celestrakAdapter.setEvents(events);
      adapterRegistry.register('celestrak', celestrakAdapter, { enabled: true });
      
      pollingScheduler.schedule('celestrak-tle', celestrakAdapter, () => celestrakAdapter.fetchAllGroups(), config.satellite.pollingInterval);
      pollingScheduler.schedule('celestrak-positions', celestrakAdapter, () => celestrakAdapter.emitAllPositions(), 10000);
      
      logger.info('adapter_registered', 'CelesTrak adapter registered');
    } else {
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

  if (config.nws.enabled) {
    const nwsAdapter = new NWSAdapter({
      pollingInterval: config.nws.pollingInterval
    });
    nwsAdapter.setEvents(events);
    adapterRegistry.register('nws', nwsAdapter, { enabled: true });
    pollingScheduler.schedule('nws', nwsAdapter, () => nwsAdapter.poll(), config.nws.pollingInterval);
    logger.info('adapter_registered', 'NWS adapter registered');
  }

  if (config.marinetraffic.enabled) {
    const mtAdapter = new MarineTrafficAdapter({
      apiKey: config.marinetraffic.apiKey,
      boundingBox: config.marinetraffic.boundingBox,
      pollingInterval: config.marinetraffic.pollingInterval
    });
    mtAdapter.setEvents(events);
    adapterRegistry.register('marinetraffic', mtAdapter, { enabled: true });
    pollingScheduler.schedule('marinetraffic', mtAdapter, () => mtAdapter.poll(), config.marinetraffic.pollingInterval);
    logger.info('adapter_registered', 'MarineTraffic adapter registered');
  }

  if (config.adsb.enabled) {
    const adsbAdapter = new ADSBAdapter({
      boundingBox: config.adsb.boundingBox,
      pollingInterval: config.adsb.pollingInterval
    });
    adsbAdapter.setEvents(events);
    adapterRegistry.register('adsb', adsbAdapter, { enabled: true });
    pollingScheduler.schedule('adsb', adsbAdapter, () => adsbAdapter.poll(), config.adsb.pollingInterval);
    logger.info('adapter_registered', 'ADSB adapter registered');
  }

  if (config.windy.enabled) {
    const windyAdapter = new WindyAdapter({
      apiKey: config.windy.apiKey,
      streamingUrl: config.windy.streamingUrl,
      boundingBox: config.windy.boundingBox
    });
    windyAdapter.setEvents(events);
    adapterRegistry.register('windy', windyAdapter, { enabled: true });
    logger.info('adapter_registered', 'Windy adapter registered');
  }

  if (config.usgs.enabled) {
    const usgsAdapter = new USGSAdapter({
      pollingInterval: config.usgs.pollingInterval
    });
    usgsAdapter.setEvents(events);
    adapterRegistry.register('usgs', usgsAdapter, { enabled: true });
    pollingScheduler.schedule('usgs', usgsAdapter, () => usgsAdapter.poll(), config.usgs.pollingInterval);
    logger.info('adapter_registered', 'USGS adapter registered');
  }

  if (config.ndbc.enabled) {
    const ndbcAdapter = new NDBCAdapter({
      pollingInterval: config.ndbc.pollingInterval,
      stationIds: config.ndbc.stationIds
    });
    ndbcAdapter.setEvents(events);
    adapterRegistry.register('ndbc', ndbcAdapter, { enabled: true });
    pollingScheduler.schedule('ndbc', ndbcAdapter, () => ndbcAdapter.poll(), config.ndbc.pollingInterval);
    logger.info('adapter_registered', 'NDBC adapter registered');
  }

  if (config.nwws.enabled) {
    const nwwsAdapter = new NWWSAdapter({
      username: config.nwws.username,
      password: config.nwws.password,
      pollingInterval: config.nwws.pollingInterval
    });
    nwwsAdapter.setEvents(events);
    adapterRegistry.register('nwws', nwwsAdapter, { enabled: true });
    pollingScheduler.schedule('nwws', nwwsAdapter, () => nwwsAdapter.poll(), config.nwws.pollingInterval);
    logger.info('adapter_registered', 'NWWS adapter registered');
  }

  await adapterRegistry.startAll();
  pollingScheduler.startAll();
  if (!positionFlushTimer) {
    positionFlushTimer = setInterval(() => {
      if (positionUpdateBuffer.size === 0) return;
      for (const update of positionUpdateBuffer.values()) {
        broadcaster.broadcast(WEBSOCKET_EVENTS.POSITION_UPDATE, update);
      }
      positionUpdateBuffer.clear();
    }, POSITION_BROADCAST_FLUSH_MS);
  }

  logger.info('adapters_initialized', `Initialized ${adapterRegistry.getAllAdapters().length} adapters`);
}

export async function shutdownAdapters() {
  logger.info('shutdown_adapters', 'Shutting down adapters');
  if (positionFlushTimer) {
    clearInterval(positionFlushTimer);
    positionFlushTimer = null;
  }
  positionUpdateBuffer.clear();
  lastPositionBroadcastByAsset.clear();
  await adapterRegistry.stopAll();
  pollingScheduler.stopAll();
  logger.info('adapters_shutdown', 'All adapters stopped');
}
