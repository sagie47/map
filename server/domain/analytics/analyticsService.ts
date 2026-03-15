import { analyticsRepo, AnalyticsStats, TimeSeriesData, IncidentMetrics } from '../../db/repositories/analyticsRepo';

export interface AnalyticsResponse {
  activeIncidents: number;
  totalIncidents: number;
  falsePositives: number;
  resolvedIncidents: number;
  falsePositiveRate: number;
  receiverUptime: number;
  domainStats: { name: string; value: number }[];
  timeSeries: TimeSeriesData[];
  metrics: IncidentMetrics;
}

export class AnalyticsService {
  getAnalytics(days: number = 7): AnalyticsResponse {
    const stats = analyticsRepo.getIncidentStats();
    const timeSeries = analyticsRepo.getTimeSeries(days);
    const metrics = analyticsRepo.getIncidentMetrics();
    const receiverStats = analyticsRepo.getReceiverStats();

    const falsePositiveRate = stats.totalIncidents > 0 
      ? (stats.falsePositives / stats.totalIncidents) * 100 
      : 0;

    return {
      activeIncidents: stats.activeIncidents,
      totalIncidents: stats.totalIncidents,
      falsePositives: stats.falsePositives,
      resolvedIncidents: stats.resolvedIncidents,
      falsePositiveRate,
      receiverUptime: receiverStats.receiverUptime,
      domainStats: stats.domainStats,
      timeSeries,
      metrics
    };
  }

  getKPISummary() {
    const stats = analyticsRepo.getIncidentStats();
    const receiverStats = analyticsRepo.getReceiverStats();

    return {
      activeIncidents: stats.activeIncidents,
      totalIncidents: stats.totalIncidents,
      falsePositiveRate: stats.totalIncidents > 0 
        ? (stats.falsePositives / stats.totalIncidents) * 100 
        : 0,
      receiverUptime: receiverStats.receiverUptime,
      avgLatency: receiverStats.avgLatency
    };
  }

  getTimeSeriesData(days: number = 7): TimeSeriesData[] {
    return analyticsRepo.getTimeSeries(days);
  }

  getDomainBreakdown() {
    const stats = analyticsRepo.getIncidentStats();
    return stats.domainStats;
  }

  getIncidentMetrics(): IncidentMetrics {
    return analyticsRepo.getIncidentMetrics();
  }
}

export const analyticsService = new AnalyticsService();
