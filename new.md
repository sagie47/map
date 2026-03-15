Phase 4: Real Data Adapters + Multi-Domain Integration
Objective

Replace simulator-only inputs with real external feeds behind the ingestion boundary built in Phase 1.

End state:

real sources plug into the same normalized event pipeline

simulator and real feeds can coexist

each adapter is isolated from domain logic and UI

source-specific failure, rate-limit, and staleness handling are explicit

incidents can be created from real marine / aviation / orbital / ground feeds without rewriting the dashboard

Non-goals

Do not do:

major frontend redesign

auth / permissions

full production hardening across all ops concerns

advanced operator workflows

custom orbital math engine unless needed

replacing every simulator path immediately

overfitting UI to one source

Core intent

The app should treat external feeds as adapters, not as special-case app logic.

Pattern:

adapter fetches raw source data

normalizer converts raw payload into internal event shape

ingestion service routes it to domain services

domain services create/update incidents and history

WebSocket + REST expose the results to the frontend

The dashboard should not know whether an update came from simulation, AIS, OpenSky, satellite pass data, or GTFS.

Target backend structure
server/
  ingestion/
    adapters/
      ais/
        aisAdapter.ts
        aisNormalizer.ts
        aisTypes.ts
      opensky/
        openSkyAdapter.ts
        openSkyNormalizer.ts
        openSkyTypes.ts
      satellite/
        satelliteAdapter.ts
        satelliteNormalizer.ts
        satelliteTypes.ts
      gtfs/
        gtfsAdapter.ts
        gtfsNormalizer.ts
        gtfsTypes.ts
    scheduler/
      pollingJobs.ts
      adapterRegistry.ts
    normalization/
      normalizeDetection.ts
      normalizeHeartbeat.ts
      normalizePositionUpdate.ts
      normalizeCoverageEvent.ts

  domain/
    marine/
    aviation/
    satellite/
    ground/
External sources in scope
1. AISStream

Use for:

live vessel positions

geofence breaches

marine track updates

SOG / heading vector overlays

marine incident generation

2. OpenSky

Use for:

aircraft tracking in defined region

stale track / signal loss detection

last-known-state prediction inputs

aviation incident generation

3. N2YO or Space-Track

Use for:

satellite orbital path / pass windows

visibility / relay opportunity overlays

satellite coverage events

orbital context for beacon scenarios

4. BC Transit GTFS-Realtime

Use for:

protobuf ingestion

vehicle positions

route deviation / off-course alerts

ground telemetry pipeline validation

Workstreams
1. Adapter interface
Goal

Standardize how all external sources plug into the app.

Create

adapterRegistry.ts

shared adapter interface/type

Each adapter should expose

start()

stop()

health()

sourceName

mode (streaming or polling)

normalized output callbacks or event emission

Requirements

domain services should not know source-specific APIs

adapter lifecycle should be centrally managed

simulator should be able to implement the same interface if useful

2. Source-specific normalizers
Goal

Convert raw payloads into stable internal shapes before domain logic.

Create

aisNormalizer.ts

openSkyNormalizer.ts

satelliteNormalizer.ts

gtfsNormalizer.ts

Normalize into internal shapes such as

detection

position update

heartbeat / source health

coverage event

route deviation input

stale track input

Requirements

raw source schema should not leak past adapter + normalizer boundary

unit conversion, field mapping, missing value handling, and source quirks should be resolved here

internal event contracts from Phase 1 remain the source of truth

3. AIS adapter
Goal

Integrate real marine telemetry first.

Create

aisAdapter.ts

aisNormalizer.ts

Responsibilities

connect to AISStream over backend WebSocket

subscribe by bounding box / filters

handle reconnects

parse incoming vessel events

normalize vessel position reports

emit internal position/detection events

Marine features to support

vessel markers

geofence breach detection

marine incident creation/update

heading/SOG forward vector generation

optional vessel metadata enrichment

Requirements

connection lifecycle is robust

malformed events are ignored/logged safely

stale vessel updates are detectable

geofence checks happen in domain/app logic, not in the adapter itself

4. OpenSky adapter
Goal

Integrate aviation polling cleanly.

Create

openSkyAdapter.ts

openSkyNormalizer.ts

Responsibilities

poll state vectors on schedule

apply regional filtering

normalize aircraft state updates

detect stale/missing updates relative to last-known state

emit position updates and possible track-loss candidate events

Aviation features to support

aircraft markers

heading/speed/altitude tracking

stale track detection

switch to predicted search-area mode after track loss

aviation incident creation/update

Requirements

polling cadence is centralized

rate-limit awareness is explicit

stale track logic is not mixed into routes/UI

track-loss should be modeled as an inferred state, not a raw source event

5. Satellite adapter
Goal

Add orbital/pass-window context without polluting incident logic.

Create

satelliteAdapter.ts

satelliteNormalizer.ts

Responsibilities

fetch satellite positions / TLE-derived data

compute pass windows or consume provider pass endpoints

normalize path / coverage events

publish orbital overlays and visibility events

Satellite features to support

orbital path visualization

pass-window timeline

visibility / relay opportunity overlays

optional coverage circle / line-of-sight approximations

Requirements

satellite data should be exposed as context and coverage events

orbital source choice should be swappable

UI should consume stable path/pass DTOs, not provider-specific payloads

6. GTFS-Realtime adapter
Goal

Add binary/protobuf ingestion as a ground telemetry pipeline.

Create

gtfsAdapter.ts

gtfsNormalizer.ts

Responsibilities

fetch GTFS-Realtime feeds

decode protobuf payloads

normalize vehicle positions / route context

detect off-route or deviation conditions

emit ground position and route deviation events

Ground features to support

moving ground asset markers

route adherence checks

off-course alerting

protobuf ingestion credibility demo

Requirements

protobuf decoding stays inside the adapter layer

route deviation rules live in domain logic, not raw parser code

decode failures are safe and observable

7. Adapter scheduler + lifecycle
Goal

Centralize start/stop/retry/poll timing.

Create

pollingJobs.ts

adapterRegistry.ts

Responsibilities

start all enabled adapters

manage polling intervals

manage retry/backoff policy

expose adapter health summaries

allow source enable/disable via config

Requirements

polling logic is not buried inside random files

retry behavior is consistent

adapter status is inspectable for debugging

8. Source health + observability
Goal

Make source failures visible and non-destructive.

Add tracking for:

last successful fetch/receive time

last error time

consecutive failure count

source connected/disconnected status

source-specific staleness

Optional outputs

source health endpoint

source status card in UI later

source events in live event stream

Requirements

a failing source should degrade gracefully

source health should be queryable

dashboard should not silently go stale

9. Domain-specific event handling
Goal

Use adapter outputs to drive domain logic without source coupling.

Marine

vessel position updates

geofence entry/exit

drift/vector overlays

marine incident triggers

Aviation

aircraft position updates

stale track detection

transition to predicted search zone

aviation incident triggers

Satellite

pass/coverage events

visibility context

overlay generation

Ground

asset position updates

route deviation triggers

ground incident / off-course events

Requirements

source adapters emit normalized inputs

domain services decide incident meaning

UI remains source-agnostic

10. Config + feature flags
Goal

Control which adapters run and in what mode.

Add config for:

adapter enabled/disabled

polling interval

bounding boxes / regions

API credentials

fallback to simulator

source-specific thresholds

Requirements

no adapter should hardcode credentials

no source-specific constants scattered across files

local/dev config should support simulator + partial real integrations

11. DTO expansion
Goal

Expose stable client contracts for real-source data and overlays.

Add DTOs for:

vessel position

aircraft position

satellite path / pass window

route deviation / ground asset position

source health summary

domain-specific overlay payloads

Requirements

frontend should not consume raw provider payloads

all real-source UI data should be backend-shaped DTOs

12. Frontend integration points
Goal

Use existing Sprint 2 feature modules without restructuring the app again.

Update features to support:

incidents feature consuming real-source incident updates

map layers supporting vessels, aircraft, satellite paths, ground assets

analytics counting real-source incidents cleanly

optional source-health panel later

2D map + future globe mode using same DTOs

Requirements

no provider-specific parsing in React components

feature modules stay source-agnostic

same map/rendering boundaries still apply

Recommended implementation order

define adapter interface + registry

implement AIS adapter first

wire AIS normalized events into marine domain flow

add source health tracking

implement OpenSky adapter

wire aviation track-loss logic

implement satellite adapter

implement GTFS adapter

expand DTOs and map layers

add config/feature flags cleanup

run multi-source smoke tests

Priority order by value
Highest value first

AIS

OpenSky

Satellite

GTFS

Best demo payoff

AIS

Satellite

OpenSky

GTFS

Acceptance criteria

Phase 4 is done when:

at least one real external source is running end-to-end through the ingestion boundary

adapters are isolated from domain logic

simulator can coexist or be toggled independently

marine/aviation/satellite/ground sources can be added without changing page architecture

provider-specific payloads do not leak into UI components

source health and failure states are visible

incidents created from real feeds appear in the same dashboard/replay/analytics flows

Smells this phase is trying to prevent

raw API calls inside domain services

provider payloads leaking into frontend

one-off parsing logic scattered across routes

polling loops hidden inside random modules

adapter-specific incident logic

silent source failures

hardcoded credentials / bounding boxes / intervals

UI conditional branches for specific providers everywhere

Minimal test target
Unit

each normalizer

stale track logic

geofence input mapping

route deviation input mapping

source health state transitions

Integration

AIS message -> normalized event -> marine incident flow

OpenSky poll -> normalized event -> aviation flow

satellite fetch -> coverage DTO output

GTFS protobuf -> normalized ground event

Manual

source connects

source disconnect/retry works

real events appear on map

incidents update from real feeds

dashboard remains stable if one source fails

simulator can still run if enabled

One-line intent

Phase 4 turns the app from a simulator-backed ops demo into a source-agnostic telemetry platform that can ingest real marine, aviation, satellite, and ground feeds through clean adapters.