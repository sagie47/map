import { Express } from 'express';
import { auditRepo, EntityType, AuditEventType } from '../../db/repositories/auditRepo';
import { asyncHandler } from '../../app/errorHandling';

export function setupAuditRoutes(app: Express) {
  app.get('/api/audit', asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const entries = auditRepo.getRecent(limit);
    res.json(entries);
  }));

  app.get('/api/audit/entity/:type/:id', asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const entries = auditRepo.getByEntity(type as EntityType, id);
    res.json(entries);
  }));

  app.get('/api/audit/event/:eventType', asyncHandler(async (req, res) => {
    const { eventType } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const entries = auditRepo.getByEventType(eventType as AuditEventType, limit);
    res.json(entries);
  }));

  app.get('/api/audit/range', asyncHandler(async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) {
      res.status(400).json({ error: 'start and end query params required' });
      return;
    }
    const entries = auditRepo.getByDateRange(start as string, end as string);
    res.json(entries);
  }));
}
