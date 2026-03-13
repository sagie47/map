import { useConnectionStore } from './store';

type MessageHandler = (type: string, payload: any) => void;

class SocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private handlers: Set<MessageHandler> = new Set();

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    const { setStatus, setLastMessageAt } = useConnectionStore.getState();
    setStatus('connecting');

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      setStatus('connected');
    };

    this.ws.onclose = () => {
      setStatus('disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      setStatus('error');
    };

    this.ws.onmessage = (event) => {
      setLastMessageAt(new Date().toISOString());
      try {
        const { type, payload } = JSON.parse(event.data);
        this.handlers.forEach(handler => handler(type, payload));
      } catch (e) {
        console.error('Failed to parse websocket message', e);
      }
    };
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect
      this.ws.close();
      this.ws = null;
    }
    useConnectionStore.getState().setStatus('disconnected');
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 3000);
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}

export const socketClient = new SocketClient();
