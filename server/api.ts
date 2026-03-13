import { Express } from 'express';
import { incidentsRepo } from './db/repositories/incidentsRepo';
import { signalEventsRepo } from './db/repositories/signalEventsRepo';
import { receiversRepo } from './db/repositories/receiversRepo';
import { toIncidentDto } from './api/dto/incidentDto';
import { toReceiverDto } from './api/dto/receiverDto';
import { toTimelineDto } from './api/dto/timelineDto';

export function setupApi(app: Express) {
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/incidents', (req, res) => {
    const incidents = incidentsRepo.listWithFilters();
    res.json(incidents.map(toIncidentDto));
  });

  app.get('/api/incidents/:id', (req, res) => {
    const incident = incidentsRepo.getById(req.params.id);
    
    if (!incident) return res.status(404).json({ error: 'Not found' });
    res.json(toIncidentDto(incident));
  });

  app.get('/api/incidents/:id/events', (req, res) => {
    const events = signalEventsRepo.listByIncident(req.params.id);
    res.json(events.map(toTimelineDto));
  });

  app.get('/api/receivers', (req, res) => {
    const receivers = receiversRepo.listReceivers();
    res.json(receivers.map(toReceiverDto));
  });

  app.get('/api/analytics', (req, res) => {
    const incidentStats = incidentsRepo.getAnalyticsStats();
    const receiverStats = receiversRepo.getAnalyticsStats();
    
    // Mock time-series data for the last 7 days since real data will be sparse on startup
    const now = new Date();
    const timeSeries = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return {
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        incidents: Math.floor(Math.random() * 20) + 5
      };
    });

    res.json({
      activeIncidents: incidentStats.activeIncidents,
      totalIncidents: incidentStats.totalIncidents,
      falsePositives: incidentStats.falsePositives,
      receiverUptime: receiverStats.receiverUptime,
      domainStats: incidentStats.domainStats,
      timeSeries
    });
  });
}
