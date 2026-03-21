import { Adapter } from './adapterInterface';
import { subsystemLoggers } from '../../app/logger';

interface PollingJob {
  adapter: Adapter;
  intervalId: ReturnType<typeof setInterval> | null;
  bootstrapTimeoutId: ReturnType<typeof setTimeout> | null;
  intervalMs: number;
  timeoutMs: number;
  pollFn: () => Promise<void>;
  running: boolean;
  runCount: number;
  failureCount: number;
  skippedRuns: number;
  backoffUntil: string | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastDurationMs: number | null;
  lastError: string | null;
}

class PollingScheduler {
  private jobs: Map<string, PollingJob> = new Map();
  private logger = subsystemLoggers.adapter;

  schedule(
    adapterName: string,
    adapter: Adapter,
    pollFn: () => Promise<void>,
    intervalMs: number,
    timeoutMs?: number
  ) {
    const safeIntervalMs = Math.max(1000, intervalMs);
    this.jobs.set(adapterName, {
      adapter,
      intervalId: null,
      bootstrapTimeoutId: null,
      intervalMs: safeIntervalMs,
      timeoutMs: timeoutMs ?? Math.max(5000, Math.floor(safeIntervalMs * 0.8)),
      pollFn,
      running: false,
      runCount: 0,
      failureCount: 0,
      skippedRuns: 0,
      backoffUntil: null,
      lastRunAt: null,
      lastSuccessAt: null,
      lastDurationMs: null,
      lastError: null
    });
  }

  start(adapterName: string) {
    const job = this.jobs.get(adapterName);
    if (!job || job.intervalId || job.bootstrapTimeoutId) return;

    const runPoll = async () => {
      if (job.running) {
        job.skippedRuns++;
        this.logger.warn('polling_run_skipped', `Polling run skipped for ${adapterName}; previous run still active`, {
          adapterName,
          skippedRuns: job.skippedRuns
        });
        return;
      }
      if (job.backoffUntil && Date.parse(job.backoffUntil) > Date.now()) {
        return;
      }

      job.running = true;
      const startedAt = Date.now();
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      try {
        await Promise.race([
          job.pollFn(),
          new Promise<void>((_, reject) => {
            timeoutHandle = setTimeout(() => reject(new Error(`Polling timeout after ${job.timeoutMs}ms`)), job.timeoutMs);
          })
        ]);
        job.failureCount = 0;
        job.backoffUntil = null;
        job.lastError = null;
        job.lastSuccessAt = new Date().toISOString();
      } catch (err) {
        job.failureCount++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isAuthError = /401|403/.test(errorMessage);
        const backoffMs = isAuthError
          ? 10 * 60 * 1000
          : Math.min(10 * 60 * 1000, job.intervalMs * (2 ** Math.min(job.failureCount, 6)));
        job.backoffUntil = new Date(Date.now() + backoffMs).toISOString();
        job.lastError = errorMessage;
        this.logger.error('polling_error', `Polling error for ${adapterName}`, err as Error, {
          adapterName,
          failureCount: job.failureCount,
          backoffMs
        });
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        job.running = false;
        job.runCount++;
        job.lastRunAt = new Date().toISOString();
        job.lastDurationMs = Date.now() - startedAt;
      }
    };

    const initialJitterMs = Math.floor(Math.random() * Math.max(250, Math.floor(job.intervalMs * 0.1)));
    job.bootstrapTimeoutId = setTimeout(() => {
      job.bootstrapTimeoutId = null;
      runPoll().catch(err => {
        this.logger.error('polling_run_failed', `Initial polling run failed for ${adapterName}`, err as Error, { adapterName });
      });
      job.intervalId = setInterval(() => {
        runPoll().catch(err => {
          this.logger.error('polling_run_failed', `Recurring polling run failed for ${adapterName}`, err as Error, { adapterName });
        });
      }, job.intervalMs);
    }, initialJitterMs);
  }

  stop(adapterName: string) {
    const job = this.jobs.get(adapterName);
    if (job?.bootstrapTimeoutId) {
      clearTimeout(job.bootstrapTimeoutId);
      job.bootstrapTimeoutId = null;
    }
    if (job?.intervalId) {
      clearInterval(job.intervalId);
      job.intervalId = null;
    }
  }

  startAll() {
    for (const name of this.jobs.keys()) {
      this.start(name);
    }
  }

  stopAll() {
    for (const name of this.jobs.keys()) {
      this.stop(name);
    }
  }

  isRunning(adapterName: string): boolean {
    const job = this.jobs.get(adapterName);
    return (job?.intervalId !== null) || (job?.bootstrapTimeoutId !== null);
  }

  getStatus(): Record<string, {
    running: boolean;
    intervalMs: number;
    timeoutMs: number;
    runCount: number;
    failureCount: number;
    skippedRuns: number;
    backoffUntil: string | null;
    lastError: string | null;
    lastRunAt: string | null;
    lastSuccessAt: string | null;
    lastDurationMs: number | null;
  }> {
    const status: Record<string, {
      running: boolean;
      intervalMs: number;
      timeoutMs: number;
      runCount: number;
      failureCount: number;
      skippedRuns: number;
      backoffUntil: string | null;
      lastError: string | null;
      lastRunAt: string | null;
      lastSuccessAt: string | null;
      lastDurationMs: number | null;
    }> = {};
    for (const [name, job] of this.jobs) {
      status[name] = {
        running: job.intervalId !== null || job.bootstrapTimeoutId !== null,
        intervalMs: job.intervalMs,
        timeoutMs: job.timeoutMs,
        runCount: job.runCount,
        failureCount: job.failureCount,
        skippedRuns: job.skippedRuns,
        backoffUntil: job.backoffUntil,
        lastError: job.lastError,
        lastRunAt: job.lastRunAt,
        lastSuccessAt: job.lastSuccessAt,
        lastDurationMs: job.lastDurationMs
      };
    }
    return status;
  }
}

export const pollingScheduler = new PollingScheduler();
