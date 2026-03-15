import { Adapter } from './adapterInterface';

interface PollingJob {
  adapter: Adapter;
  intervalId: ReturnType<typeof setInterval> | null;
  intervalMs: number;
  pollFn: () => Promise<void>;
}

class PollingScheduler {
  private jobs: Map<string, PollingJob> = new Map();

  schedule(adapterName: string, adapter: Adapter, pollFn: () => Promise<void>, intervalMs: number) {
    this.jobs.set(adapterName, {
      adapter,
      intervalId: null,
      intervalMs,
      pollFn
    });
  }

  start(adapterName: string) {
    const job = this.jobs.get(adapterName);
    if (!job || job.intervalId) return;

    job.pollFn().catch(err => {
      console.error(`Polling error for ${adapterName}:`, err);
    });

    job.intervalId = setInterval(async () => {
      try {
        await job.pollFn();
      } catch (err) {
        console.error(`Polling error for ${adapterName}:`, err);
      }
    }, job.intervalMs);
  }

  stop(adapterName: string) {
    const job = this.jobs.get(adapterName);
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
    return job?.intervalId !== null;
  }

  getStatus(): Record<string, { running: boolean; intervalMs: number }> {
    const status: Record<string, { running: boolean; intervalMs: number }> = {};
    for (const [name, job] of this.jobs) {
      status[name] = {
        running: job.intervalId !== null,
        intervalMs: job.intervalMs
      };
    }
    return status;
  }
}

export const pollingScheduler = new PollingScheduler();
