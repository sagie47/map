import { WebSocket } from 'ws';
import { subsystemLoggers } from '../app/logger';

export interface OutboundEnvelope<T = any> {
  version: string;
  type: string;
  sentAt: string;
  payload: T;
}

class Broadcaster {
  private clients = new Set<WebSocket>();
  private logger = subsystemLoggers.websocket;
  private totalBroadcasts = 0;
  private totalDelivered = 0;
  private totalDropped = 0;
  private maxBufferedBytes = 1024 * 1024;

  public addClient(ws: WebSocket) {
    this.clients.add(ws);
    this.logger.info('ws_client_connected', 'WebSocket client connected', {
      connectedClients: this.clients.size
    });
  }

  public removeClient(ws: WebSocket) {
    this.clients.delete(ws);
    this.logger.info('ws_client_disconnected', 'WebSocket client disconnected', {
      connectedClients: this.clients.size
    });
  }

  public broadcast<T>(type: string, payload: T) {
    this.totalBroadcasts++;
    const envelope: OutboundEnvelope<T> = {
      version: '1.0',
      type,
      sentAt: new Date().toISOString(),
      payload
    };
    
    const message = JSON.stringify(envelope);
    
    this.clients.forEach(client => {
      if (client.readyState !== WebSocket.OPEN) {
        this.totalDropped++;
        return;
      }
      if (client.bufferedAmount > this.maxBufferedBytes) {
        this.totalDropped++;
        this.logger.warn('ws_backpressure_drop', 'Dropping outbound websocket message due to client backpressure', {
          type,
          bufferedAmount: client.bufferedAmount
        });
        return;
      }
      try {
        client.send(message);
        this.totalDelivered++;
      } catch (error) {
        this.totalDropped++;
        this.logger.error('ws_send_failed', 'Failed to send websocket payload', error as Error, { type });
      }
    });
  }

  public getStats() {
    return {
      connectedClients: this.clients.size,
      totalBroadcasts: this.totalBroadcasts,
      totalDelivered: this.totalDelivered,
      totalDropped: this.totalDropped
    };
  }
}

export const broadcaster = new Broadcaster();
