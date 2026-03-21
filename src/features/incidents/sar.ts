import { Incident } from "@shared/types/incidents";
import { SignalEvent } from "@shared/types/events";
import { ReceiverStation } from "@shared/types/receivers";

export interface SarAsset {
  id: string;
  kind: "aircraft" | "vessel" | "receiver";
  name: string;
  source: string;
  lat: number;
  lng: number;
  speedKnots: number;
  heading?: number;
  timestamp?: string;
}

export interface SarAssetRecommendation {
  asset: SarAsset;
  distanceKm: number;
  etaMinutes: number;
  score: number;
  rationale: string;
}

export interface SarSearchArea {
  headingDeg: number;
  semiMajorKm: number;
  semiMinorKm: number;
  areaKm2: number;
  ageMinutes: number;
  searchWindowHours: number;
  driftFactor: number;
  polygon: GeoJSON.Feature<GeoJSON.Polygon>;
}

export interface SarCoverage {
  score: number;
  label: "thin" | "fair" | "strong";
  nearbyReceivers: number;
  mobileAssets: number;
  nearestReceiverKm: number | null;
  notes: string[];
}

export interface SarDispatchTask {
  id: string;
  title: string;
  owner: string;
  status: "ready" | "queued" | "monitoring";
  etaLabel: string;
  rationale: string;
}

export interface SarOperatorBrief {
  headline: string;
  summary: string;
  priority: string;
  recommendedAction: string;
  lines: string[];
}

export interface SarIntel {
  searchArea: SarSearchArea;
  recommendations: SarAssetRecommendation[];
  interceptGeoJson: GeoJSON.FeatureCollection<GeoJSON.LineString>;
  brief: SarOperatorBrief;
  nearestReceiver: {
    id: string;
    name: string;
    distanceKm: number;
  } | null;
  coverage: SarCoverage;
  dispatchTasks: SarDispatchTask[];
}

interface AssetPositionLike {
  source: string;
  assetId: string;
  assetType: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface AlertLike {
  source: string;
  alertId: string;
  type: string;
  severity: string;
  headline: string;
  polygon?: number[][][];
  coordinates?: [number, number];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingBetween(lat1: number, lng1: number, lat2: number, lng2: number) {
  const y = Math.sin(toRadians(lng2 - lng1)) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.cos(toRadians(lng2 - lng1));
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function offsetCoordinate(lat: number, lng: number, eastKm: number, northKm: number): [number, number] {
  const latDelta = northKm / 110.574;
  const lngDivisor = 111.32 * Math.cos(toRadians(lat));
  const lngDelta = eastKm / (Math.abs(lngDivisor) < 0.0001 ? 0.0001 : lngDivisor);
  return [lng + lngDelta, lat + latDelta];
}

function buildEllipsePolygon(
  centerLat: number,
  centerLng: number,
  semiMajorKm: number,
  semiMinorKm: number,
  headingDeg: number,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const points: [number, number][] = [];
  const rotation = toRadians(headingDeg);

  for (let index = 0; index <= 64; index += 1) {
    const angle = (index / 64) * Math.PI * 2;
    const x = semiMajorKm * Math.cos(angle);
    const y = semiMinorKm * Math.sin(angle);
    const eastKm = x * Math.cos(rotation) - y * Math.sin(rotation);
    const northKm = x * Math.sin(rotation) + y * Math.cos(rotation);
    points.push(offsetCoordinate(centerLat, centerLng, eastKm, northKm));
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [points],
    },
    properties: {
      kind: "sar-search-area",
    },
  };
}

function defaultHeadingForDomain(domainType: Incident["domainType"]) {
  switch (domainType) {
    case "marine":
      return 60;
    case "aviation":
      return 85;
    case "ground":
      return 35;
    case "personal":
    default:
      return 20;
  }
}

function defaultSpeedKnots(kind: SarAsset["kind"]) {
  switch (kind) {
    case "aircraft":
      return 180;
    case "vessel":
      return 24;
    case "receiver":
    default:
      return 38;
  }
}

function preferredBias(kind: SarAsset["kind"], domainType: Incident["domainType"]) {
  if (domainType === "marine") {
    if (kind === "vessel") return 0.88;
    if (kind === "aircraft") return 1.04;
    return 1.55;
  }
  if (domainType === "aviation") {
    if (kind === "aircraft") return 0.82;
    if (kind === "vessel") return 1.2;
    return 1.65;
  }
  if (kind === "aircraft") return 0.92;
  if (kind === "vessel") return 1.08;
  return 1.45;
}

function severityWeight(severity: Incident["severity"]) {
  if (severity === "high") return 1.25;
  if (severity === "medium") return 1.05;
  return 0.9;
}

function alertSeverityWeight(severity: string) {
  switch (severity.toLowerCase()) {
    case "extreme":
    case "critical":
      return 1.3;
    case "severe":
    case "high":
      return 1.18;
    case "moderate":
    case "medium":
      return 1.08;
    default:
      return 1;
  }
}

function assetName(asset: AssetPositionLike) {
  const metadata = asset.metadata ?? {};
  const named =
    metadata.vesselName ??
    metadata.callsign ??
    metadata.flight ??
    metadata.name ??
    metadata.satelliteName;
  return typeof named === "string" && named.trim().length > 0
    ? named.trim()
    : `${asset.assetType.toUpperCase()} ${asset.assetId}`;
}

function alertAnchor(alert: AlertLike): [number, number] | null {
  if (alert.coordinates) {
    return alert.coordinates;
  }

  const ring = alert.polygon?.[0];
  if (!ring || ring.length === 0) {
    return null;
  }

  let latTotal = 0;
  let lngTotal = 0;
  for (const [lng, lat] of ring) {
    latTotal += lat;
    lngTotal += lng;
  }

  return [lngTotal / ring.length, latTotal / ring.length];
}

function formatMinutes(value: number) {
  if (value < 60) {
    return `${Math.round(value)} min`;
  }
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

export function buildSarIntel(params: {
  incident: Incident;
  events: SignalEvent[];
  vessels: AssetPositionLike[];
  aircraft: AssetPositionLike[];
  receivers: ReceiverStation[];
  alerts: AlertLike[];
}): SarIntel {
  const { incident, events, vessels, aircraft, receivers, alerts } = params;
  const now = Date.now();
  const lastSeenMs = Date.parse(incident.lastSeenAt);
  const ageMinutes = Math.max(1, (now - lastSeenMs) / 60000);
  const confidenceGap = 1 - incident.confidenceScore;

  const sortedEvents = [...events].sort(
    (left, right) => Date.parse(left.detectedAt) - Date.parse(right.detectedAt),
  );
  const firstEvent = sortedEvents[0];
  const lastEvent = sortedEvents[sortedEvents.length - 1];
  const eventSpreadKm =
    sortedEvents.length > 0
      ? sortedEvents.reduce((maxSpread, event) => {
          return Math.max(
            maxSpread,
            haversineKm(incident.estimatedLat, incident.estimatedLng, event.lat, event.lng),
          );
        }, 0)
      : 0;

  const baseHeading =
    firstEvent && lastEvent
      ? haversineKm(firstEvent.lat, firstEvent.lng, lastEvent.lat, lastEvent.lng) > 1
        ? bearingBetween(firstEvent.lat, firstEvent.lng, lastEvent.lat, lastEvent.lng)
        : defaultHeadingForDomain(incident.domainType)
      : defaultHeadingForDomain(incident.domainType);

  const nearestAlert = alerts
    .map((alert) => {
      const anchor = alertAnchor(alert);
      if (!anchor) {
        return null;
      }
      return {
        headline: alert.headline,
        type: alert.type,
        severity: alert.severity,
        distanceKm: haversineKm(incident.estimatedLat, incident.estimatedLng, anchor[1], anchor[0]),
        bearingDeg: bearingBetween(incident.estimatedLat, incident.estimatedLng, anchor[1], anchor[0]),
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .sort((left, right) => left.distanceKm - right.distanceKm)[0];

  const nearestReceiver =
    receivers.length === 0
      ? null
      : receivers
          .map((receiver) => ({
            id: receiver.id,
            name: receiver.stationName,
            distanceKm: haversineKm(
              incident.estimatedLat,
              incident.estimatedLng,
              receiver.lat,
              receiver.lng,
            ),
          }))
          .sort((left, right) => left.distanceKm - right.distanceKm)[0];

  const nearbyReceivers = receivers.filter((receiver) => {
    return haversineKm(incident.estimatedLat, incident.estimatedLng, receiver.lat, receiver.lng) <= 250;
  });

  const mobileAssets: SarAsset[] = [
    ...aircraft.map((asset) => ({
      id: asset.assetId,
      kind: "aircraft" as const,
      name: assetName(asset),
      source: asset.source,
      lat: asset.lat,
      lng: asset.lng,
      speedKnots: asset.speed && asset.speed > 5 ? asset.speed : defaultSpeedKnots("aircraft"),
      heading: asset.heading,
      timestamp: asset.timestamp,
    })),
    ...vessels.map((asset) => ({
      id: asset.assetId,
      kind: "vessel" as const,
      name: assetName(asset),
      source: asset.source,
      lat: asset.lat,
      lng: asset.lng,
      speedKnots: asset.speed && asset.speed > 1 ? asset.speed : defaultSpeedKnots("vessel"),
      heading: asset.heading,
      timestamp: asset.timestamp,
    })),
  ];

  const domainBaseMajor =
    incident.domainType === "marine"
      ? 10
      : incident.domainType === "aviation"
        ? 18
        : incident.domainType === "ground"
          ? 6
          : 5;
  const domainDriftRate =
    incident.domainType === "marine"
      ? 5.5
      : incident.domainType === "aviation"
        ? 9
        : incident.domainType === "ground"
          ? 3
          : 2.4;
  const domainMinorRatio =
    incident.domainType === "aviation"
      ? 0.45
      : incident.domainType === "marine"
        ? 0.62
        : 0.72;

  const severityFactor = severityWeight(incident.severity);
  const searchWindowHours = clamp(
    (incident.domainType === "marine" ? 4 : incident.domainType === "aviation" ? 3 : 2) +
      (incident.severity === "high" ? 2 : incident.severity === "medium" ? 1 : 0),
    2,
    8,
  );

  const alertWeatherPenalty =
    nearestAlert && nearestAlert.distanceKm < 450
      ? alertSeverityWeight(nearestAlert.severity) + clamp((450 - nearestAlert.distanceKm) / 900, 0, 0.25)
      : 1;
  const receiverTightening = clamp(1 - nearbyReceivers.length * 0.05, 0.8, 1);
  const driftFactor = clamp(
    (1 + ageMinutes / 220 + confidenceGap * 0.9 + eventSpreadKm / 55) *
      alertWeatherPenalty *
      receiverTightening,
    0.9,
    3.4,
  );

  const driftHeading =
    nearestAlert && nearestAlert.distanceKm < 350
      ? (baseHeading * 0.72 + nearestAlert.bearingDeg * 0.28) % 360
      : baseHeading;

  const semiMajorKm = clamp(
    (domainBaseMajor +
      (ageMinutes / 60) * domainDriftRate +
      eventSpreadKm * 0.9 +
      confidenceGap * 22 +
      Math.max(0, 4 - sortedEvents.length) * 1.2) *
      severityFactor *
      driftFactor,
    3,
    240,
  );
  const semiMinorKm = clamp(
    (semiMajorKm * domainMinorRatio + eventSpreadKm * 0.25 + confidenceGap * 4) *
      clamp(0.9 + (alertWeatherPenalty - 1) * 0.4, 0.9, 1.15),
    1.5,
    semiMajorKm * 0.88,
  );
  const areaKm2 = Math.PI * semiMajorKm * semiMinorKm;
  const polygon = buildEllipsePolygon(
    incident.estimatedLat,
    incident.estimatedLng,
    semiMajorKm,
    semiMinorKm,
    driftHeading,
  );

  const recommendations = mobileAssets
    .map((asset) => {
      const distanceKm = haversineKm(
        incident.estimatedLat,
        incident.estimatedLng,
        asset.lat,
        asset.lng,
      );
      const speedKmh = Math.max(20, asset.speedKnots * 1.852);
      const etaMinutes = (distanceKm / speedKmh) * 60;
      const freshnessMinutes = asset.timestamp
        ? Math.max(0, (now - Date.parse(asset.timestamp)) / 60000)
        : 0;
      const score =
        etaMinutes *
        preferredBias(asset.kind, incident.domainType) *
        (freshnessMinutes > 20 ? 1.15 : 1) *
        (nearestAlert && nearestAlert.distanceKm < 350 && asset.kind === "aircraft" ? 0.97 : 1);
      const role =
        asset.kind === "aircraft"
          ? incident.domainType === "marine"
            ? "overwatch and vector confirmation"
            : "rapid airborne intercept"
          : incident.domainType === "marine"
            ? "surface pickup candidate"
            : "nearby surface response";

      return {
        asset,
        distanceKm,
        etaMinutes,
        score,
        rationale: `${role}, ${Math.round(distanceKm)} km out, ETA ${formatMinutes(etaMinutes)}`,
      };
    })
    .sort((left, right) => left.score - right.score)
    .slice(0, 3);

  const interceptGeoJson: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
    type: "FeatureCollection",
    features: recommendations.map((recommendation, index) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [recommendation.asset.lng, recommendation.asset.lat],
          [incident.estimatedLng, incident.estimatedLat],
        ],
      },
      properties: {
        id: recommendation.asset.id,
        kind: recommendation.asset.kind,
        etaMinutes: Math.round(recommendation.etaMinutes),
        label: `${index === 0 ? "PRIMARY" : index === 1 ? "SECONDARY" : "AIR COVER"} // ${formatMinutes(recommendation.etaMinutes).toUpperCase()}`,
        priority: index === 0 ? "primary" : index === 1 ? "secondary" : "support",
      },
    })),
  };

  const coverageScore = clamp(
    incident.confidenceScore * 45 +
      nearbyReceivers.length * 12 +
      Math.min(25, mobileAssets.length * 4) +
      (nearestReceiver ? clamp(25 - nearestReceiver.distanceKm / 8, 0, 25) : 0),
    12,
    99,
  );
  const coverageLabel: SarCoverage["label"] =
    coverageScore >= 75 ? "strong" : coverageScore >= 45 ? "fair" : "thin";
  const coverageNotes = [
    `${nearbyReceivers.length} receiver node${nearbyReceivers.length === 1 ? "" : "s"} within 250 km of the fix.`,
    nearestReceiver
      ? `${nearestReceiver.name} is ${Math.round(nearestReceiver.distanceKm)} km from the search center.`
      : "No nearby receiver node is currently inside the search support radius.",
    `${mobileAssets.length} live mobile asset${mobileAssets.length === 1 ? "" : "s"} available for intercept ranking.`,
  ];

  if (nearestAlert && nearestAlert.distanceKm < 450) {
    coverageNotes.push(
      `${nearestAlert.type.toUpperCase()} conditions may broaden drift on the ${Math.round(nearestAlert.bearingDeg)} deg axis.`,
    );
  }

  const bestAsset = recommendations[0];
  const secondaryAsset = recommendations[1];
  const priority =
    incident.severity === "high" || incident.confidenceScore >= 0.85
      ? "Immediate dispatch"
      : incident.severity === "medium"
        ? "Accelerated verification"
        : "Monitor and verify";

  const dispatchTasks: SarDispatchTask[] = [];
  if (bestAsset) {
    dispatchTasks.push({
      id: `dispatch-${bestAsset.asset.id}`,
      title: `Primary intercept: ${bestAsset.asset.name}`,
      owner: bestAsset.asset.kind === "aircraft" ? "Air desk" : "Surface desk",
      status: "ready",
      etaLabel: formatMinutes(bestAsset.etaMinutes),
      rationale: `Best intercept score with ${Math.round(bestAsset.distanceKm)} km stand-off and ${bestAsset.asset.kind} suitability.`,
    });
  }
  if (secondaryAsset) {
    dispatchTasks.push({
      id: `support-${secondaryAsset.asset.id}`,
      title: `Backup asset: ${secondaryAsset.asset.name}`,
      owner: secondaryAsset.asset.kind === "aircraft" ? "Air desk" : "Surface desk",
      status: "queued",
      etaLabel: formatMinutes(secondaryAsset.etaMinutes),
      rationale: `Secondary asset positioned to widen coverage if the primary misses the beacon box.`,
    });
  }
  if (nearestReceiver) {
    dispatchTasks.push({
      id: `relay-${nearestReceiver.id}`,
      title: `Receiver relay check: ${nearestReceiver.name}`,
      owner: "Network ops",
      status: "monitoring",
      etaLabel: "Live",
      rationale: `Nearest receiver should stay watched for fresh hits and confidence tightening.`,
    });
  }
  dispatchTasks.push({
    id: `drift-${incident.id}`,
    title: "Recenter search ellipse on next hit",
    owner: "SAR command",
    status: "queued",
    etaLabel: `${searchWindowHours} hr`,
    rationale: `Current drift factor is ${driftFactor.toFixed(2)}; recenter immediately if a stronger burst or new receiver geometry arrives.`,
  });

  const lines = [
    `${sortedEvents.length || 1} signal hit${sortedEvents.length === 1 ? "" : "s"} supporting the current fix.`,
    `Probable search area spans ${Math.round(semiMajorKm * 2)} x ${Math.round(semiMinorKm * 2)} km on bearing ${Math.round(driftHeading)} deg.`,
    bestAsset
      ? `${bestAsset.asset.name} is the fastest ${bestAsset.asset.kind} intercept at ${formatMinutes(bestAsset.etaMinutes)}.`
      : "No mobile rescue asset is currently tracked near the incident.",
    nearestReceiver
      ? `${nearestReceiver.name} is the nearest receiver node at ${Math.round(nearestReceiver.distanceKm)} km.`
      : "No receiver node is currently available for relay support.",
  ];

  if (nearestAlert && nearestAlert.distanceKm < 400) {
    lines.push(
      `${nearestAlert.headline} sits ${Math.round(nearestAlert.distanceKm)} km from the beacon and is widening drift assumptions.`,
    );
  }

  const recommendedAction = bestAsset
    ? `Launch ${bestAsset.asset.name} as primary intercept, hold ${secondaryAsset ? secondaryAsset.asset.name : "secondary cover"} in support, and keep the search box centered on the last valid beacon position for the next ${searchWindowHours} hours.`
    : `Expand verification through the nearest receiver network and keep the search box active for the next ${searchWindowHours} hours while waiting for a fresh hit.`;

  return {
    searchArea: {
      headingDeg: driftHeading,
      semiMajorKm,
      semiMinorKm,
      areaKm2,
      ageMinutes,
      searchWindowHours,
      driftFactor,
      polygon,
    },
    recommendations,
    interceptGeoJson,
    brief: {
      headline: `SAR BRIEF // ${incident.domainType.toUpperCase()} // ${incident.severity.toUpperCase()}`,
      summary: `Last beacon activity was ${formatMinutes(ageMinutes)} ago with ${(incident.confidenceScore * 100).toFixed(0)}% confidence. Search planning should assume a ${Math.round(areaKm2)} km2 drift box with ${coverageLabel} coverage confidence around the current fix.`,
      priority,
      recommendedAction,
      lines,
    },
    nearestReceiver,
    coverage: {
      score: coverageScore,
      label: coverageLabel,
      nearbyReceivers: nearbyReceivers.length,
      mobileAssets: mobileAssets.length,
      nearestReceiverKm: nearestReceiver ? nearestReceiver.distanceKm : null,
      notes: coverageNotes,
    },
    dispatchTasks,
  };
}
