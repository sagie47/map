Objective

Make the system credible under failure, usable by an operator, and stable enough to run beyond demo conditions.

End state:

source failures, ingest failures, and processing failures are visible

operator actions are first-class and audited

replay, analytics, and live ops are trustworthy under restart/reconnect conditions

config, logging, testing, and deployment are formalized

the system can run in dev, demo, and live modes without code changes

Non-goals

Do not do:

large visual redesign

major domain expansion

auth/RBAC beyond basic groundwork unless required

premature multi-region/cloud complexity

full enterprise compliance stack

exotic optimization work before core reliability is in place

Core intent

By this phase, the app already has:

clean backend boundaries

modular frontend

replay/history

real adapters

Phase 5 makes it dependable.

The system should be able to answer:

what failed

when it failed

what the operator did

what the system inferred

whether the current view is live, stale, replayed, or degraded

Target structure
server/
  app/
    logger.ts
    errorHandling.ts
    featureFlags.ts

  domain/
    operators/
      operatorActionsService.ts
      auditService.ts
    health/
      systemHealthService.ts
      dataFreshnessService.ts
    alerts/
      alertRulesService.ts

  jobs/
    staleIncidentJob.ts
    sourceHealthJob.ts
    cleanupJob.ts

  db/
    repositories/
      operatorActionsRepo.ts
      auditRepo.ts
      systemHealthRepo.ts

  api/
    routes/
      health.ts
      operators.ts
      audit.ts
      config.ts
Workstreams
1. Structured logging
Goal

Replace console-style logging with consistent, queryable logs.

Add

request logs

source adapter lifecycle logs

ingestion logs

incident lifecycle logs

operator action logs

replay/analytics job logs

error logs with context

Requirements

every log entry should include timestamp, subsystem, event type, and identifiers where relevant

incident IDs, source names, receiver IDs, and adapter names should be included when available

logs should distinguish info/warn/error/debug

no silent failures

2. Error handling + failure boundaries
Goal

Make failures explicit and non-destructive.

Add

centralized API error handling

adapter error isolation

ingestion failure isolation

frontend error boundaries for critical views

explicit degraded/stale state messaging

Requirements

one source failing should not crash the app

one bad message should not poison an adapter stream

routes should return consistent error responses

frontend should show meaningful states for:

loading

empty

stale

degraded

failed

3. System health + freshness
Goal

Track whether the system and its data are healthy right now.

Add tracking for

source connected/disconnected

last successful ingest by source

last successful WS broadcast

DB write success/failure

stale dashboard data

replay availability

analytics generation status if cached

Expose

/api/health

/api/health/sources

/api/health/data-freshness

Requirements

operator can tell whether data is live or stale

source freshness is measured independently

health endpoints are cheap and stable

4. Operator actions
Goal

Add explicit operator control over incidents.

Add actions

resolve incident

dismiss incident

escalate incident

mark as false positive

mark as test/training

add note

pin/highlight incident

acknowledge incident

Create

operatorActionsService.ts

operatorActionsRepo.ts

Requirements

operator actions should not mutate records ad hoc from UI calls

every action should be validated

every action should be auditable

incident state changes from operator actions should flow through the same lifecycle rules where appropriate

5. Audit trail
Goal

Persist a clear record of system and operator decisions.

Track

source event received

incident created/updated/resolved

state transition reason

operator action taken

notification emitted

source degraded/recovered

replay requested if useful

analytics snapshot generation if useful

Requirements

audit entries should be timestamped and queryable

audit trail should support replay/debugging/trust

operator-originated vs system-originated changes should be distinguishable

6. Alert rules hardening
Goal

Formalize what causes alerts and how they are delivered.

Centralize rules for

new incident

high confidence reached

source down

source recovered

stale receiver/source

off-course trigger

geofence breach

track-loss trigger

Add behavior for

dedupe

cooldown

severity mapping

destination routing if multiple outputs later exist

Requirements

alert criteria should not be scattered across adapters/pages

repeated noisy events should not spam toasts/SMS

alert rules should be configurable

7. Background jobs + lifecycle jobs
Goal

Move recurring system maintenance into explicit jobs.

Add jobs

stale incident cleanup/checker

source freshness checker

receiver/source heartbeat sweeper

historical cleanup/archive

analytics precompute job if needed

old log/audit pruning if needed

Requirements

scheduled jobs should be explicit and isolated

jobs should log start/success/failure

jobs should be safe to rerun

8. Config + runtime modes
Goal

Support dev/demo/live modes without code edits.

Add config for

simulator on/off

real adapters on/off

source regions/bounding boxes

alert routing on/off

logging level

replay retention

analytics retention

cleanup windows

demo mode fixtures/seeds

Define runtime modes

dev

demo

live

mixed

Requirements

no environment-specific behavior hidden in code

feature flags should be explicit

demo mode should be reproducible

9. Data retention + cleanup
Goal

Prevent the DB and event history from becoming unmanageable.

Define retention policy for

raw source events

signal events

audit entries

replay history

health snapshots

analytics snapshots if stored

Add

archival or purge policy

optional summarized aggregates before purge

index review for long-term performance

Requirements

retention policy should not break replay for incidents still in scope

cleanup should be reversible in dev/demo if needed

retention windows should be configurable

10. Deployment hardening
Goal

Make local/dev/demo/live deployment predictable.

Formalize

env var contract

startup checks

migration checks

adapter credential checks

healthcheck endpoint

graceful shutdown for polling/WS adapters

restart-safe lifecycle behavior

Requirements

app should fail fast on missing critical config

adapters should stop cleanly on shutdown

startup should verify DB and required config

deployment docs should match actual runtime needs

11. Test hardening
Goal

Move from smoke-only confidence to reliable regression coverage.

Expand test coverage for

incident lifecycle rules

operator actions

audit logging

source health transitions

stale data detection

alert rule dedupe/cooldown

adapter retry/backoff behavior

degraded UI states

Add seeded scenario tests for

source disconnect mid-stream

replay after restart

duplicate detections

false positive dismissal

operator resolution path

stale OpenSky/AIS input path

Requirements

critical workflows should have repeatable seeded tests

failure paths should be tested, not just happy paths

12. Frontend operational hardening
Goal

Make the UI communicate trust and system state clearly.

Add or improve

stale data indicators

source health/status panel

operator action controls

audit/history panel per incident if useful

clearer degraded/failure empty states

optimistic vs confirmed action handling

reconnect/recovery UX beyond just the banner

Requirements

user should know whether they are seeing live, stale, or replay data

operator actions should have clear success/failure feedback

UI should not silently ignore failed mutations

13. Documentation hardening
Goal

Make the system understandable by another engineer or reviewer.

Update docs for

system architecture

source adapter model

event contracts

incident lifecycle

replay model

analytics definitions

operator actions

alert rules

deployment/runbook

recovery steps for common failures

Add runbooks for

source disconnect

adapter auth failure

DB locked/corrupt

no live events appearing

replay broken

stale dashboard state

Requirements

docs should match actual file structure and runtime behavior

another engineer should be able to run and debug the system quickly

Recommended implementation order

structured logging + error handling

system health + freshness endpoints

operator actions service

audit trail persistence

alert rule centralization

background jobs

config/runtime modes cleanup

retention policy + cleanup jobs

deployment/startup hardening

frontend degraded/stale/operator UX

test expansion

docs/runbooks

Acceptance criteria

Phase 5 is done when:

failures are visible and isolated

operator actions are supported and audited

source/data freshness is measurable and exposed

alert rules are centralized and deduped

background jobs are explicit and safe

runtime mode/config is formalized

deployment is predictable

frontend clearly communicates live vs stale vs failed states

regression coverage exists for critical success and failure paths

Smells this phase is trying to prevent

silent source failure

console-log-only debugging

UI showing stale data as if live

operator actions directly mutating state with no audit

alert spam from repeated events

background timers hidden in random modules

missing startup/config validation

replay/history breaking after cleanup

docs that no longer match reality

Minimal test target
Unit

operator action validation

alert rule dedupe/cooldown

freshness status classification

audit entry generation

retention decision rules

Integration

source failure -> degraded health state

operator resolve/dismiss -> incident transition + audit entry

alert trigger -> dedupe/cooldown behavior

startup with bad config -> fails correctly

cleanup job -> removes only expired data

Manual

disconnect a source and verify degraded state

recover a source and verify recovery state

resolve/dismiss/escalate an incident from UI

confirm audit trail records the action

verify stale-data indicator appears when expected

restart app and confirm adapters shut down/start cleanly

One-line intent

Phase 5 makes the platform operationally credible: observable, controllable, auditable, and stable under real-world failure conditions.