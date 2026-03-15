import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { initDb } from './server/db/client';
import { setupApi } from './server/api';
import { setupHealthRoutes } from './server/api/routes/health';
import { setupOperatorRoutes } from './server/api/routes/operators';
import { setupAuditRoutes } from './server/api/routes/audit';
import { startSimulation } from './server/ingestion/simulator/simulatorEngine';
import { setupWebSocketServer } from './server/realtime/wsServer';
import { initializeAdapters, shutdownAdapters } from './server/ingestion/adapters/adapterStartup';
import { featureFlags } from './server/app/featureFlags';
import { errorHandler, notFoundHandler } from './server/app/errorHandling';
import { logger } from './server/app/logger';
import { checkSourceHealth } from './server/jobs/sourceHealthJob';
import { checkStaleIncidents } from './server/jobs/staleIncidentJob';
import { runCleanup } from './server/jobs/cleanupJob';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  featureFlags.initialize();
  const flags = featureFlags.getFlags();
  const mode = featureFlags.getMode();
  
  logger.info('server_starting', `Starting server in ${mode} mode`, { port: PORT });

  initDb();
  logger.info('database_initialized', 'Database initialized');

  app.use(express.json());

  setupApi(app);
  setupHealthRoutes(app);
  setupOperatorRoutes(app);
  setupAuditRoutes(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info('server_started', `Server running on http://localhost:${PORT}`);
  });

  setupWebSocketServer(server);

  await initializeAdapters();

  if (flags.simulator.enabled) {
    startSimulation();
    logger.info('simulator_started', 'Simulation engine started');
  }

  setInterval(() => {
    checkSourceHealth().catch(err => {
      logger.error('source_health_job_error', 'Source health job failed', err);
    });
  }, 60000);

  setInterval(() => {
    checkStaleIncidents().catch(err => {
      logger.error('stale_incident_job_error', 'Stale incident job failed', err);
    });
  }, 300000);

  setInterval(() => {
    runCleanup().catch(err => {
      logger.error('cleanup_job_error', 'Cleanup job failed', err);
    });
  }, 3600000);

  process.on('SIGTERM', async () => {
    logger.info('shutdown_initiated', 'SIGTERM received, shutting down gracefully');
    await shutdownAdapters();
    server.close(() => {
      logger.info('server_shutdown', 'Server shutdown complete');
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    logger.info('shutdown_initiated', 'SIGINT received, shutting down gracefully');
    await shutdownAdapters();
    server.close(() => {
      logger.info('server_shutdown', 'Server shutdown complete');
      process.exit(0);
    });
  });
}

startServer().catch(err => {
  logger.error('server_startup_failed', 'Failed to start server', err);
  process.exit(1);
});
