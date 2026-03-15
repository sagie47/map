import WebSocket from 'ws';
import { BaseAdapter } from '../baseAdapter';
import { AdapterEvents, AdapterConfig } from '../adapterInterface';
import { aisNormalizer } from './aisNormalizer';
import { AISShipPosition, AISConfig } from './aisTypes';

export class AISAdapter extends BaseAdapter {
  sourceName = 'ais';
  mode: 'streaming' | 'polling' = 'streaming';
  
  private ws: WebSocket | null = null;
  private config: AISConfig = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;

  constructor(config: AISConfig = {}) {
    super();
    this.config = config;
  }

  protected async doStart(): Promise<void> {
    const streamingUrl = this.config.streamingUrl;
    
    if (!streamingUrl) {
      console.log(`[AIS] No streaming URL configured, running in simulator mode`);
      this.recordSuccess();
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(streamingUrl);

        this.ws.on('open', () => {
          console.log(`[AIS] Connected to stream`);
          this.recordSuccess();
          this.reconnectAttempts = 0;
          
          if (this.config.boundingBox) {
            this.subscribeToBoundingBox(this.config.boundingBox);
          }
          
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString()) as AISShipPosition;
            this.handleMessage(message);
          } catch (error) {
            console.error(`[AIS] Failed to parse message:`, error);
          }
        });

        this.ws.on('error', (error) => {
          console.error(`[AIS] WebSocket error:`, error);
          this.recordFailure(error.message);
          this.emitError(error);
        });

        this.ws.on('close', () => {
          console.log(`[AIS] Connection closed`);
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

  private handleMessage(message: AISShipPosition) {
    if (!aisNormalizer.isValidPosition(message)) {
      return;
    }

    if (this.config.boundingBox && !aisNormalizer.isInBoundingBox(message, this.config.boundingBox)) {
      return;
    }

    const normalized = aisNormalizer.normalizePosition(message);
    if (normalized) {
      this.recordMessage();
      this.recordSuccess();
      this.events.onPositionUpdate?.(normalized);
    }
  }

  private subscribeToBoundingBox(bbox: { latMin: number; latMax: number; lngMin: number; lngMax: number }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        boundingBox: bbox
      }));
    }
  }

  private handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[AIS] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.start().catch(err => {
          console.error(`[AIS] Reconnection failed:`, err);
        });
      }, this.reconnectDelay);
    } else {
      console.error(`[AIS] Max reconnection attempts reached`);
      this.status = 'error';
    }
  }

  simulatePosition(position: AISShipPosition) {
    this.handleMessage(position);
  }
}
