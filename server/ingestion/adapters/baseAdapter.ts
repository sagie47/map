import { Adapter, AdapterHealth, AdapterStatus, AdapterEvents } from './adapterInterface';

export abstract class BaseAdapter implements Adapter {
  abstract sourceName: string;
  abstract mode: 'streaming' | 'polling';
  
  protected status: AdapterStatus = 'stopped';
  protected lastSuccessfulFetch: string | null = null;
  private lastError: string | null = null;
  protected consecutiveFailures: number = 0;
  protected messagesReceived: number = 0;
  protected events: AdapterEvents = {};

  setEvents(events: AdapterEvents) {
    this.events = events;
  }

  async start(): Promise<void> {
    this.status = 'starting';
    try {
      await this.doStart();
      this.status = 'running';
    } catch (error) {
      this.status = 'error';
      this.lastError = error instanceof Error ? error.message : String(error);
      this.consecutiveFailures++;
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.status = 'stopping';
    try {
      await this.doStop();
      this.status = 'stopped';
    } catch (error) {
      this.status = 'error';
      this.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  health(): AdapterHealth {
    return {
      sourceName: this.sourceName,
      status: this.status,
      lastSuccessfulFetch: this.lastSuccessfulFetch,
      lastError: this.lastError,
      consecutiveFailures: this.consecutiveFailures,
      messagesReceived: this.messagesReceived
    };
  }

  protected recordSuccess() {
    this.lastSuccessfulFetch = new Date().toISOString();
    this.consecutiveFailures = 0;
    this.lastError = null;
  }

  protected recordFailure(error: string) {
    this.consecutiveFailures++;
    this.lastError = error;
  }

  protected recordMessage() {
    this.messagesReceived++;
  }

  protected emitError(error: Error, recoverable: boolean = true) {
    this.events.onSourceError?.({
      source: this.sourceName,
      message: error.message,
      timestamp: new Date().toISOString(),
      recoverable
    });
  }

  protected abstract doStart(): Promise<void>;
  protected abstract doStop(): Promise<void>;
}
