import { useConnectionStore } from './store';

type MessageHandler = (type: string, payload: any) => void;

class SocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectAttempt = 0;
  private intentionalClose = false;
  private lastMessageStatusTs = 0;

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    const { setStatus, setLastMessageAt } = useConnectionStore.getState();
    setStatus('connecting');
    this.intentionalClose = false;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      setStatus('connected');
      this.reconnectAttempt = 0;
      this.lastMessageStatusTs = 0;
    };

    this.ws.onclose = () => {
      setStatus('disconnected');
      this.ws = null;
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      setStatus('error');
    };

    this.ws.onmessage = (event) => {
      const now = Date.now();
      if (now - this.lastMessageStatusTs >= 1000) {
        this.lastMessageStatusTs = now;
        setLastMessageAt(new Date(now).toISOString());
      }
      try {
        const { type, payload } = JSON.parse(event.data);
        this.handlers.forEach(handler => handler(type, payload));
      } catch (e) {
        console.error('Failed to parse websocket message', e);
      }
    };
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempt = 0;
    this.lastMessageStatusTs = 0;
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect
      this.ws.close();
      this.ws = null;
    }
    useConnectionStore.getState().setStatus('disconnected');
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    const cappedAttempt = Math.min(this.reconnectAttempt, 5);
    const baseDelay = 1000 * (2 ** cappedAttempt);
    const jitter = Math.floor(Math.random() * 500);
    const delay = Math.min(30000, baseDelay + jitter);
    this.reconnectAttempt++;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}

export const socketClient = new SocketClient();
