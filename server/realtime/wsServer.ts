import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { broadcaster } from './broadcaster';

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws) => {
    broadcaster.addClient(ws);
    ws.on('close', () => broadcaster.removeClient(ws));
  });

  return wss;
}
