import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { initDb } from './server/db/client';
import { setupApi } from './server/api';
import { setupHealthRoutes } from './server/api/routes/health';
import { setupOperatorRoutes } from './server/api/routes/operators';
import { setupAuditRoutes } from './server/api/routes/audit';
import { startSimulation, stopSimulation, triggerDemoIncident } from './server/ingestion/simulator/simulatorEngine';
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
  const parsedPort = Number.parseInt(process.env.PORT || '3000', 10);
  const PORT = Number.isFinite(parsedPort) ? parsedPort : 3000;

  featureFlags.initialize();
  const flags = featureFlags.getFlags();
  const mode = featureFlags.getMode();
  
  logger.info('server_starting', `Starting server in ${mode} mode`, { port: PORT });

  initDb();
  logger.info('database_initialized', 'Database initialized');

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  if (flags.logging.requestLogging) {
    app.use((req, res, next) => {
      const started = Date.now();
      res.on('finish', () => {
        logger.info('http_request', `${req.method} ${req.path}`, {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Date.now() - started
        });
      });
      next();
    });
  }

  setupApi(app);
  setupHealthRoutes(app);
  setupOperatorRoutes(app);
  setupAuditRoutes(app);

  if (mode !== 'live') {
    app.post('/api/demo/incident', (_req, res) => {
      const scenario = triggerDemoIncident();
      res.json({ success: true, beaconId: scenario.beaconId, domainType: scenario.domainType });
    });

    app.post('/api/demo/simulator/:action', (req, res) => {
      const { action } = req.params;
      if (action === 'start') {
        startSimulation();
        res.json({ success: true, status: 'started' });
      } else if (action === 'stop') {
        stopSimulation();
        res.json({ success: true, status: 'stopped' });
      } else {
        res.status(400).json({ error: 'Invalid action. Use start or stop.' });
      }
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    // Vite middleware mode is more stable here without HMR; allow explicit opt-in.
    if (process.env.DISABLE_HMR == null) {
      process.env.DISABLE_HMR = 'true';
    }

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

  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info('server_started', `Server running on http://localhost:${PORT}`);
  });

  const wss = setupWebSocketServer(server);

  await initializeAdapters();

  if (flags.simulator.enabled) {
    startSimulation();
    logger.info('simulator_started', 'Simulation engine started');
  }

  const intervals: ReturnType<typeof setInterval>[] = [];

  intervals.push(setInterval(() => {
    checkSourceHealth().catch(err => {
      logger.error('source_health_job_error', 'Source health job failed', err);
    });
  }, 60000));

  intervals.push(setInterval(() => {
    checkStaleIncidents().catch(err => {
      logger.error('stale_incident_job_error', 'Stale incident job failed', err);
    });
  }, 300000));

  intervals.push(setInterval(() => {
    runCleanup().catch(err => {
      logger.error('cleanup_job_error', 'Cleanup job failed', err);
    });
  }, 3600000));

  let shuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info('shutdown_initiated', `${signal} received, shutting down gracefully`);
    intervals.forEach(clearInterval);
    stopSimulation();
    await shutdownAdapters();
    await new Promise<void>(resolve => {
      wss.close(() => resolve());
    });
    await new Promise<void>(resolve => {
      server.close(() => {
        logger.info('server_shutdown', 'Server shutdown complete');
        resolve();
      });
    });
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });
}

process.on('unhandledRejection', reason => {
  logger.error('unhandled_rejection', 'Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)));
});

process.on('uncaughtException', error => {
  if ((error as NodeJS.ErrnoException).code === 'EPIPE') {
    logger.warn('uncaught_epipe', 'Ignoring EPIPE from detached stdout/stderr');
    return;
  }
  logger.error('uncaught_exception', 'Uncaught exception', error);
  process.exit(1);
});

startServer().catch(err => {
  logger.error('server_startup_failed', 'Failed to start server', err);
  process.exit(1);
});
