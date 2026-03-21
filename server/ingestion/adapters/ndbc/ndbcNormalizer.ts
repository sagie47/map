import { NormalizedPositionUpdate } from '../adapterInterface';
import { NDBCObservation, NDBCTextRow } from './ndbcTypes';

export const ndbcNormalizer = {
  normalizeObservation(obs: NDBCObservation): NormalizedPositionUpdate | null {
    if (!Number.isFinite(obs.lat) || !Number.isFinite(obs.lng)) return null;

    return {
      source: 'ndbc',
      assetId: `buoy-${obs.stationId}`,
      assetType: 'ground',
      lat: obs.lat,
      lng: obs.lng,
      timestamp: obs.timestamp.toISOString(),
      metadata: {
        windSpeed: obs.windSpeed,
        windDirection: obs.windDir,
        windGust: obs.windGust,
        waveHeight: obs.waveHeight,
        wavePeriod: obs.wavePeriod,
        waveDirection: obs.waveDir,
        pressure: obs.pressure,
        airTemp: obs.airTemp,
        waterTemp: obs.waterTemp,
        visibility: obs.visibility,
        dewPoint: obs.dewPoint,
        salinity: obs.salinity,
        stationId: obs.stationId
      }
    };
  },

  parseTextRow(stationId: string, lines: string[]): NDBCObservation | null {
    if (lines.length < 2) return null;

    const headerLine = lines[0].trim();
    const dataLine = lines[1].trim();

    if (!headerLine.startsWith('#') || !dataLine.match(/^\d/)) {
      return null;
    }

    const headers = headerLine.replace(/^#/, '').trim().split(/\s+/);
    const values = dataLine.trim().split(/\s+/);

    if (values.length < headers.length) return null;

    const getValue = (header: string, fallback: number): number => {
      const index = headers.indexOf(header);
      if (index === -1 || index >= values.length) return fallback;
      const val = parseFloat(values[index]);
      return isNaN(val) ? fallback : val;
    };

    const year = parseInt(getValue('#YY', 0).toString());
    const month = parseInt(getValue('MM', 1).toString());
    const day = parseInt(getValue('DD', 1).toString());
    const hour = parseInt(getValue('hh', 0).toString());
    const minute = parseInt(getValue('mm', 0).toString());

    return {
      stationId,
      lat: getValue('Latitude', 0),
      lng: getValue('Longitude', 0),
      timestamp: new Date(Date.UTC(year, month - 1, day, hour, minute)),
      windSpeed: getValue('wspd', 0),
      windDir: getValue('wdir', 0),
      windGust: getValue('wgst', 0),
      waveHeight: getValue('wvht', 0),
      wavePeriod: getValue('dpd', 0),
      waveDir: getValue('mwdir', 0),
      pressure: getValue('pres', 0),
      airTemp: getValue('atmp', 0),
      waterTemp: getValue('wtmp', 0),
      visibility: getValue('vis', 99),
      dewPoint: getValue('dewpt', 0),
      salinity: getValue('sal', 0)
    };
  },

  isInBoundingBox(
    obs: NDBCObservation,
    bbox?: { latMin: number; latMax: number; lngMin: number; lngMax: number }
  ): boolean {
    if (!bbox) return true;
    return (
      obs.lat >= bbox.latMin &&
      obs.lat <= bbox.latMax &&
      obs.lng >= bbox.lngMin &&
      obs.lng <= bbox.lngMax
    );
  }
};
