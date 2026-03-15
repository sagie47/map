import { Express } from 'express';
import { systemHealthService } from '../../domain/health/systemHealthService';
import { asyncHandler } from '../../app/errorHandling';

export function setupHealthRoutes(app: Express) {
  app.get('/api/health', asyncHandler(async (req, res) => {
    const health = systemHealthService.checkSystemHealth();
    res.json(health);
  }));

  app.get('/api/health/sources', asyncHandler(async (req, res) => {
    const { sourceHealthService } = await import('../../ingestion/adapters/sourceHealthService');
    const summary = sourceHealthService.getHealthSummary();
    res.json(summary);
  }));

  app.get('/api/health/db', asyncHandler(async (req, res) => {
    const health = systemHealthService.getComponentHealth('database');
    res.json(health || { status: 'unknown' });
  }));
}
