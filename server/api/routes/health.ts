import { Express } from 'express';
import { systemHealthService } from '../../domain/health/systemHealthService';
import { asyncHandler } from '../../app/errorHandling';
import { pollingScheduler } from '../../ingestion/adapters/pollingScheduler';
import { broadcaster } from '../../realtime/broadcaster';

export function setupHealthRoutes(app: Express) {
  app.get('/api/health/live', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime())
    });
  });

  app.get('/api/health/ready', asyncHandler(async (_req, res) => {
    const health = systemHealthService.checkSystemHealth();
    const ready = health.overall !== 'unhealthy';
    res.status(ready ? 200 : 503).json({
      ready,
      overall: health.overall,
      timestamp: health.timestamp
    });
  }));

  app.get('/api/health', asyncHandler(async (req, res) => {
    const health = systemHealthService.checkSystemHealth();
    const statusCode = health.overall === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json({
      ...health,
      polling: pollingScheduler.getStatus(),
      websocket: broadcaster.getStats(),
      uptimeSeconds: Math.floor(process.uptime())
    });
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
