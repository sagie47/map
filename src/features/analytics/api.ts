export interface AnalyticsData {
  activeIncidents: number;
  totalIncidents: number;
  falsePositives: number;
  receiverUptime: number;
  domainStats: { name: string; value: number }[];
  timeSeries: { name: string; incidents: number }[];
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const response = await fetch('/api/analytics');
  if (!response.ok) throw new Error('Failed to fetch analytics');
  return response.json();
}
