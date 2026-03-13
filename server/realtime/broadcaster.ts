import { WebSocket } from 'ws';

export interface OutboundEnvelope<T = any> {
  version: string;
  type: string;
  sentAt: string;
  payload: T;
}

class Broadcaster {
  private clients = new Set<WebSocket>();

  public addClient(ws: WebSocket) {
    this.clients.add(ws);
  }

  public removeClient(ws: WebSocket) {
    this.clients.delete(ws);
  }

  public broadcast<T>(type: string, payload: T) {
    const envelope: OutboundEnvelope<T> = {
      version: '1.0',
      type,
      sentAt: new Date().toISOString(),
      payload
    };
    
    const message = JSON.stringify(envelope);
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

export const broadcaster = new Broadcaster();
