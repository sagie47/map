import { INCIDENT_STATUSES, IncidentStatus } from '../../../shared/constants/statuses';
import { THRESHOLDS } from '../../../shared/constants/thresholds';

export function determineStatus(
  currentStatus: IncidentStatus,
  confidenceScore: number,
  isTest: boolean
): IncidentStatus {
  if (isTest) {
    return INCIDENT_STATUSES.TEST;
  }

  // Terminal states cannot transition automatically based on confidence
  if (
    currentStatus === INCIDENT_STATUSES.RESOLVED ||
    currentStatus === INCIDENT_STATUSES.DISMISSED
  ) {
    return currentStatus;
  }

  if (confidenceScore >= THRESHOLDS.CONFIDENCE.HIGH) {
    return INCIDENT_STATUSES.HIGH_CONFIDENCE;
  }

  if (confidenceScore >= THRESHOLDS.CONFIDENCE.MEDIUM) {
    return INCIDENT_STATUSES.ACTIVE;
  }

  return INCIDENT_STATUSES.CANDIDATE;
}

export function isTransitionAllowed(from: IncidentStatus, to: IncidentStatus): boolean {
  if (from === to) return true;

  // Terminal states
  if (from === INCIDENT_STATUSES.RESOLVED || from === INCIDENT_STATUSES.DISMISSED) {
    // Can reopen to candidate or active
    if (to === INCIDENT_STATUSES.ACTIVE || to === INCIDENT_STATUSES.CANDIDATE) {
      return true;
    }
    return false;
  }

  // Test incidents stay test unless resolved/dismissed
  if (from === INCIDENT_STATUSES.TEST) {
    if (to === INCIDENT_STATUSES.RESOLVED || to === INCIDENT_STATUSES.DISMISSED) {
      return true;
    }
    return false;
  }

  // Normal progression
  const validTransitions: Record<string, string[]> = {
    [INCIDENT_STATUSES.CANDIDATE]: [
      INCIDENT_STATUSES.ACTIVE,
      INCIDENT_STATUSES.HIGH_CONFIDENCE,
      INCIDENT_STATUSES.RESOLVED,
      INCIDENT_STATUSES.DISMISSED
    ],
    [INCIDENT_STATUSES.ACTIVE]: [
      INCIDENT_STATUSES.HIGH_CONFIDENCE,
      INCIDENT_STATUSES.RESOLVED,
      INCIDENT_STATUSES.DISMISSED
    ],
    [INCIDENT_STATUSES.HIGH_CONFIDENCE]: [
      INCIDENT_STATUSES.RESOLVED,
      INCIDENT_STATUSES.DISMISSED
    ]
  };

  return validTransitions[from]?.includes(to) ?? false;
}
