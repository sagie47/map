Turn replay and analytics into first-class systems backed by persisted event history instead of page-level reconstruction or ad hoc queries.

End state:

replay is driven by stored timeline data

replay frames are deterministic

analytics are computed from stable backend services

incident history includes explicit state transitions

live ops and replay share the same underlying event lineage

current UI keeps working

Non-goals

Do not do:

major frontend redesign

real external data integrations

auth

large schema overhaul beyond what replay/analytics need

operator workflow expansion unless required by replay/history

performance optimization beyond obvious blockers

Core intent

The app should stop treating replay and analytics as “views over current state” and start treating them as outputs derived from an event/history model.

This sprint should make the system able to answer:

what happened

when it happened

how the incident changed over time

what the user should see at any timestamp

how to aggregate reliable metrics from that history

Backend target structure
server/
  domain/
    replay/
      replayService.ts
      replayFrameBuilder.ts
    analytics/
      analyticsService.ts
    incidents/
      incidentTransitionsService.ts

  db/
    repositories/
      incidentTransitionsRepo.ts
      replayRepo.ts
      analyticsRepo.ts

  api/
    routes/
      replay.ts
      analytics.ts
Workstreams
1. Event history and transition persistence
Goal

Persist enough structured history to reconstruct incident progression and compute stable metrics.

Add or formalize

signal_events as ordered detection history

incident_state_transitions table or equivalent

explicit incident timestamps for:

created

activated

high confidence

resolved

dismissed

Requirements

incident status changes should be recorded explicitly, not inferred only from the current row

every replayable incident should have ordered history

analytics should not rely on reconstructing state transitions from guesswork

2. Replay service
Goal

Create a backend service that returns replay data from persisted history.

Create

domain/replay/replayService.ts

db/repositories/replayRepo.ts

Responsibilities

replayService should:

load incident history

load related signal events

load state transitions

return ordered replay input data

handle invalid or non-replayable incident IDs cleanly

Requirements

replay endpoint should not assemble everything inline in the route

replay data should come from persisted records, not current in-memory state

replay should work even if the live simulator is not running

3. Replay frame builder
Goal

Generate deterministic replay frames from event history.

Create

domain/replay/replayFrameBuilder.ts

Responsibilities

Given timeline + timestamp/index, derive:

current incident status

confidence score at that point

estimated position

active detections

visible receivers if needed

current map overlays

current highlighted event

Rules

same input history should always produce same frame output

replay frame generation should be pure

UI should not have to recompute incident evolution from raw events

Requirements

replay frame logic should not live in the page

frame generation should not depend on socket/live state

replay controls should only move through stored history, not trigger recomputation in multiple places

4. Replay API hardening
Goal

Standardize backend replay contracts.

Expose stable endpoints such as:

GET /api/incidents/:id/timeline

GET /api/incidents/:id/replay

Replay payload should include:

incident metadata

ordered event list

ordered transition list if separate

frame-ready snapshots or raw inputs depending on architecture

replay bounds / total duration

graceful not-found response

Requirements

replay API payload should be stable and typed

replay page should not stitch together multiple unrelated endpoints ad hoc

not-found and empty-history states should be explicit

5. Analytics service
Goal

Move analytics logic into a dedicated backend service with stable aggregations.

Create

domain/analytics/analyticsService.ts

db/repositories/analyticsRepo.ts

Responsibilities

Serve backend-computed metrics for:

KPI summary

incidents by day

incidents by domain

false positive rate

average detections per incident

multi-receiver confirmation rate

mean time to high confidence

mean time to resolution

receiver uptime / degradation summaries if already in scope

Requirements

analytics page should consume backend-derived aggregates

chart logic should not depend on raw incident arrays when avoidable

metric definitions should live in one service, not multiple routes/pages

6. Incident transition service
Goal

Centralize recording of incident lifecycle changes.

Create

incidents/incidentTransitionsService.ts

incidentTransitionsRepo.ts

Responsibilities

Whenever incident status changes:

persist transition

persist timestamp

capture from/to state

optionally capture reason / source event ID

Requirements

transition recording should happen once, inside incident lifecycle flow

replay and analytics should read the same transition history

do not duplicate transition logging in multiple places

7. Replay frontend alignment
Goal

Make replay consume backend replay contracts cleanly.

Frontend feature should use:

replay API module

replay hooks/selectors

replay components already established in Sprint 2

Adjust frontend so it reads:

stable ordered timeline

deterministic current frame

explicit bounds/duration

explicit not-found/empty-history states

Requirements

replay UI should not derive core history rules itself

playback should remain centralized in replay feature

event highlighting and map overlays should come from replay frame/selectors

8. Analytics frontend alignment
Goal

Make analytics consume stable backend aggregations.

Frontend feature should use:

analytics API module

analytics hooks/selectors

chart components from Sprint 2

Requirements

chart components receive already-shaped or nearly-ready data

analytics page should not compute domain metrics inline

metric names and chart semantics should match backend definitions

9. Shared DTO expansion
Goal

Formalize replay and analytics DTOs.

Add types for:

replay event item

replay transition item

replay frame

replay response

analytics KPI response

analytics series response

analytics breakdown response

Requirements

frontend/backend agree on replay and analytics shapes

no untyped or ad hoc payload evolution

Required behavior after Sprint 3

Must work:

replay still loads

replay current frame matches timeline progression

replay controls still work

auto-scroll/highlighting still work

not-found replay state still works

analytics charts still render

KPI values still render

dashboard/live views still work

incident flow still updates and persists correctly

Implementation order

persist explicit incident transitions

formalize replay repositories and replay service

build pure replay frame builder

harden replay API contracts

build analytics repository + analytics service

align frontend replay feature to new contracts

align frontend analytics feature to new contracts

add shared replay/analytics DTOs

smoke test end-to-end

Acceptance criteria

Sprint 3 is done when:

replay is generated from persisted history

replay frames are deterministic

incident transitions are stored explicitly

analytics are served by a backend analytics service

replay and analytics contracts are typed and stable

frontend replay/analytics modules consume those contracts cleanly

current product behavior still works end-to-end

Smells this sprint removes

replay reconstructed from current state only

replay logic split across page and backend inconsistently

analytics computed ad hoc in routes/pages

implicit incident transitions inferred from snapshots

no single source of truth for incident lifecycle timing

chart metrics derived differently in different places

replay behavior depending on simulator/live socket state

Minimal test target

Unit:

replay frame builder

analytics metric calculations

transition recording logic

Integration:

incident update persists transition

replay endpoint returns stable ordered history

analytics endpoint returns expected aggregates for seeded data

Manual:

replay progression looks correct

event highlighting stays in sync

analytics values look plausible

charts still render

live dashboard unaffected

One-line intent