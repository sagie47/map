import WebSocket from 'ws';
import { BaseAdapter } from '../baseAdapter';
import { AdapterEvents } from '../adapterInterface';
import { windyNormalizer } from './windyNormalizer';
import { WindyObservation, WindyConfig } from './windyTypes';

export class WindyAdapter extends BaseAdapter {
  sourceName = 'windy';
  mode: 'streaming' | 'polling' = 'streaming';

  private ws: WebSocket | null = null;
  private config: WindyConfig = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;

  constructor(config: WindyConfig = {}) {
    super();
    this.config = config;
  }

  protected async doStart(): Promise<void> {
    let streamingUrl = this.config.streamingUrl;

    if (!streamingUrl && this.config.apiKey) {
      streamingUrl = 'wss://api.windy.com/v0/stream';
    }

    if (!streamingUrl) {
      console.log(`[Windy] No streaming URL configured, running in simulator mode`);
      this.recordSuccess();
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log(`[Windy] Connecting to ${streamingUrl}...`);
        this.ws = new WebSocket(streamingUrl);

        this.ws.on('open', () => {
          console.log(`[Windy] Connected to stream`);
          this.recordSuccess();
          this.reconnectAttempts = 0;

          if (this.config.apiKey) {
            this.authenticate(this.config.apiKey);
          }

          if (this.config.boundingBox) {
            this.subscribeToBoundingBox(this.config.boundingBox);
          }

          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const rawMessage = JSON.parse(data.toString());
            this.handleMessage(rawMessage);
          } catch (error) {
            console.error(`[Windy] Failed to parse message:`, error);
          }
        });

        this.ws.on('error', (error) => {
          console.error(`[Windy] WebSocket error:`, error);
          this.recordFailure(error.message);
          this.emitError(error);
        });

        this.ws.on('close', () => {
          console.log(`[Windy] Connection closed`);
          this.handleDisconnect();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  protected async doStop(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleMessage(message: unknown) {
    const observation = message as WindyObservation;

    if (!windyNormalizer.isValidObservation(observation)) {
      return;
    }

    if (this.config.boundingBox && !windyNormalizer.isInBoundingBox(observation, this.config.boundingBox)) {
      return;
    }

    const normalized = windyNormalizer.normalizeWindUpdate(observation);
    if (normalized) {
      this.recordMessage();
      this.recordSuccess();
      this.events.onPositionUpdate?.(normalized);
    }
  }

  private authenticate(apiKey: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const authMessage = {
        type: 'auth',
        apiKey: apiKey
      };
      this.ws.send(JSON.stringify(authMessage));
      console.log(`[Windy] Sent authentication`);
    }
  }

  private subscribeToBoundingBox(bbox: { latMin: number; latMax: number; lngMin: number; lngMax: number }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscription = {
        type: 'subscribe',
        boundingBox: {
          latMin: bbox.latMin,
          latMax: bbox.latMax,
          lngMin: bbox.lngMin,
          lngMax: bbox.lngMax
        },
        layers: ['wind', 'windObservation']
      };
      this.ws.send(JSON.stringify(subscription));
      console.log(`[Windy] Sent subscription for bounding box and wind layer`);
    }
  }

  private handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[Windy] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        this.start().catch(err => {
          console.error(`[Windy] Reconnection failed:`, err);
        });
      }, this.reconnectDelay);
    } else {
      console.error(`[Windy] Max reconnection attempts reached`);
      this.status = 'error';
    }
  }

  simulateWindUpdate(observation: WindyObservation) {
    this.handleMessage(observation);
  }
}
