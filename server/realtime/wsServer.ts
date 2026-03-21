import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { broadcaster } from './broadcaster';
import { subsystemLoggers } from '../app/logger';

interface AliveWebSocket extends WebSocket {
  isAlive?: boolean;
}

export function setupWebSocketServer(server: Server) {
  const logger = subsystemLoggers.websocket;
  const wss = new WebSocketServer({ server });
  const heartbeatIntervalMs = 30000;
  
  wss.on('connection', (ws) => {
    const client = ws as AliveWebSocket;
    client.isAlive = true;

    broadcaster.addClient(client);

    client.on('pong', () => {
      client.isAlive = true;
    });

    client.on('error', (error) => {
      logger.warn('ws_client_error', 'WebSocket client emitted an error', {
        error: error.message
      });
    });

    client.on('close', () => {
      broadcaster.removeClient(client);
    });
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach(rawClient => {
      const client = rawClient as AliveWebSocket;
      if (client.isAlive === false) {
        logger.warn('ws_client_terminated', 'Terminating stale websocket client');
        broadcaster.removeClient(client);
        client.terminate();
        return;
      }

      client.isAlive = false;
      try {
        client.ping();
      } catch (error) {
        logger.warn('ws_ping_failed', 'Failed to ping websocket client', {
          error: (error as Error).message
        });
      }
    });
  }, heartbeatIntervalMs);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  return wss;
}
