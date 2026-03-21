import { NormalizedAlert } from '../adapterInterface';
import { NWWSAlert, NWWSCapAlert } from './nwwsTypes';

export const nwwsNormalizer = {
  normalizeAlert(alert: NWWSAlert): NormalizedAlert | null {
    if (!alert.nwsHeadline) return null;

    const severity = this.determineSeverity(alert.nwsHeadline, alert.body);

    return {
      source: 'nwws',
      alertId: `nwws-${alert.pil}-${alert.issueTime}`,
      type: 'nwws_text',
      severity,
      certainty: 'observed',
      urgency: this.determineUrgency(severity),
      headline: alert.nwsHeadline,
      description: alert.body.substring(0, 500),
      polygon: undefined,
      timestamp: new Date(alert.issueTime).toISOString(),
      expires: new Date(alert.issueTime + 86400000).toISOString()
    };
  },

  normalizeCapEntry(entry: { title: string; updated: string; id: string; content?: { value?: string }; link?: { href?: string } }, feedId: string): NormalizedAlert | null {
    const content = entry.content?.value || '';
    const severity = this.determineSeverity(entry.title, content);

    return {
      source: 'nwws',
      alertId: `nwws-${entry.id || feedId}`,
      type: 'nwws_cap',
      severity,
      certainty: 'observed',
      urgency: this.determineUrgency(severity),
      headline: entry.title,
      description: content.substring(0, 500),
      polygon: undefined,
      timestamp: new Date(entry.updated).toISOString(),
      expires: new Date(Date.now() + 86400000).toISOString()
    };
  },

  determineSeverity(headline: string, body: string): string {
    const text = `${headline} ${body}`.toLowerCase();
    if (text.includes('emergency') || text.includes('extreme')) return 'critical';
    if (text.includes('warning') || text.includes('severe') || text.includes('tornado') || text.includes('flood')) return 'high';
    if (text.includes('watch') || text.includes('advisory')) return 'medium';
    return 'low';
  },

  determineUrgency(severity: string): string {
    return severity === 'critical' || severity === 'high' ? 'expected' : 'future';
  }
};
