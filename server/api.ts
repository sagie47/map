import { Express } from 'express';
import { incidentsRepo } from './db/repositories/incidentsRepo';
import { signalEventsRepo } from './db/repositories/signalEventsRepo';
import { receiversRepo } from './db/repositories/receiversRepo';
import { toIncidentDto } from './api/dto/incidentDto';
import { toReceiverDto } from './api/dto/receiverDto';
import { toTimelineDto } from './api/dto/timelineDto';
import { replayService } from './domain/replay/replayService';
import { replayFrameBuilder } from './domain/replay/replayFrameBuilder';
import { analyticsService } from './domain/analytics/analyticsService';
import { notificationService } from './domain/notifications/notificationService';
import { notificationRepo } from './domain/notifications/notificationRepo';

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

  app.get('/api/incidents/:id/timeline', (req, res) => {
    const timeline = replayService.getTimeline(req.params.id);
    
    if (!timeline) return res.status(404).json({ error: 'Timeline not found' });
    res.json(timeline);
  });

  app.get('/api/incidents/:id/replay', (req, res) => {
    const replay = replayService.getReplayData(req.params.id);
    
    if (!replay) return res.status(404).json({ error: 'Replay not found' });
    res.json(replay);
  });

  app.get('/api/incidents/:id/replay/frames', (req, res) => {
    const replay = replayService.getReplayData(req.params.id);
    
    if (!replay) return res.status(404).json({ error: 'Replay not found' });
    
    const frames = replayFrameBuilder.buildFrames({
      events: replay.events,
      transitions: replay.transitions,
      bounds: replay.bounds
    });
    
    res.json(frames);
  });

  app.get('/api/receivers', (req, res) => {
    const receivers = receiversRepo.listReceivers();
    res.json(receivers.map(toReceiverDto));
  });

  app.get('/api/analytics', (req, res) => {
    const days = parseInt(req.query.days as string) || 7;
    const analytics = analyticsService.getAnalytics(days);
    res.json(analytics);
  });

  app.get('/api/analytics/kpi', (req, res) => {
    const kpi = analyticsService.getKPISummary();
    res.json(kpi);
  });

  // Notification routes
  app.get('/api/notifications', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const notifications = notificationService.getNotifications(limit, offset);
    res.json(notifications);
  });

  app.get('/api/notifications/unread-count', (req, res) => {
    const count = notificationRepo.getUnreadCount();
    res.json({ count });
  });

  app.post('/api/notifications/:id/read', (req, res) => {
    const wasMarkedAsRead = notificationService.markAsRead(req.params.id);

    if (!wasMarkedAsRead) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  });
}
