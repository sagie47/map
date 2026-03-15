export interface TimeSeriesDto {
  name: string;
  incidents: number;
  resolved: number;
}

export interface DomainStatDto {
  name: string;
  value: number;
}

export interface IncidentMetricsDto {
  avgDetectionsPerIncident: number;
  multiReceiverConfirmationRate: number;
  meanTimeToHighConfidence: number;
  meanTimeToResolution: number;
}

export interface AnalyticsResponseDto {
  activeIncidents: number;
  totalIncidents: number;
  falsePositives: number;
  resolvedIncidents: number;
  falsePositiveRate: number;
  receiverUptime: number;
  domainStats: DomainStatDto[];
  timeSeries: TimeSeriesDto[];
  metrics: IncidentMetricsDto;
}

export interface AnalyticsKPIDto {
  activeIncidents: number;
  totalIncidents: number;
  falsePositiveRate: number;
  receiverUptime: number;
  avgLatency: number;
}
