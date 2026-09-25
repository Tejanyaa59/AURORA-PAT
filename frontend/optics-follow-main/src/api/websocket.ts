import type { TrackingUpdate, WebSocketStatus } from "@/types/tracking";

export interface TrackingSocketHandlers {
  onStatus: (status: WebSocketStatus, detail?: string) => void;
  onMessage: (update: TrackingUpdate) => void;
}

export interface TrackingSocketOptions {
  /** Initial reconnect delay in ms (doubles each attempt). */
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Stop trying after this many consecutive failures. */
  maxAttempts?: number;
}

function isTrackingUpdate(value: unknown): value is TrackingUpdate {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v["frame_id"] === "number" && typeof v["status"] === "string";
}

/**
 * Reusable WebSocket service with bounded exponential-backoff reconnection.
 * Pure transport — it never fabricates tracking data.
 */
export class TrackingSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: TrackingSocketHandlers;
  private attempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;
  private readonly baseDelay: number;
  private readonly maxDelay: number;
  private readonly maxAttempts: number;

  constructor(url: string, handlers: TrackingSocketHandlers, options: TrackingSocketOptions = {}) {
    this.url = url;
    this.handlers = handlers;
    this.baseDelay = options.baseDelayMs ?? 1000;
    this.maxDelay = options.maxDelayMs ?? 15000;
    this.maxAttempts = options.maxAttempts ?? 8;
  }

  connect(): void {
    if (typeof window === "undefined") return;
    this.manuallyClosed = false;
    this.clearTimer();
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    this.handlers.onStatus(this.attempts > 0 ? "RECONNECTING" : "CONNECTING");

    let socket: WebSocket;
    try {
      socket = new WebSocket(this.url);
    } catch {
      this.handlers.onStatus("ERROR", "Invalid WebSocket URL.");
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      this.attempts = 0;
      this.handlers.onStatus("CONNECTED");
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return; // ignore non-JSON payloads (e.g. pings)
      }
      if (isTrackingUpdate(parsed)) this.handlers.onMessage(parsed);
    };

    socket.onerror = () => {
      this.handlers.onStatus("ERROR", "Live stream connection error.");
    };

    socket.onclose = () => {
      this.ws = null;
      if (this.manuallyClosed) {
        this.handlers.onStatus("DISCONNECTED");
        return;
      }
      this.scheduleReconnect();
    };
  }

  /** Reset the backoff counter and reconnect immediately. */
  reconnectNow(): void {
    this.attempts = 0;
    this.closeSocket();
    this.connect();
  }

  setUrl(url: string): void {
    if (url === this.url) return;
    this.url = url;
    this.reconnectNow();
  }

  disconnect(): void {
    this.manuallyClosed = true;
    this.clearTimer();
    this.closeSocket();
    this.handlers.onStatus("DISCONNECTED");
  }

  private closeSocket(): void {
    if (this.ws) {
      const s = this.ws;
      this.ws = null;
      s.onopen = null;
      s.onmessage = null;
      s.onerror = null;
      s.onclose = null;
      try {
        s.close();
      } catch {
        /* already closed */
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.attempts >= this.maxAttempts) {
      this.handlers.onStatus(
        "DISCONNECTED",
        "Live stream unavailable. Reconnect manually once the backend is running.",
      );
      return;
    }
    const delay = Math.min(this.baseDelay * 2 ** this.attempts, this.maxDelay);
    this.attempts += 1;
    this.handlers.onStatus("RECONNECTING", `Reconnecting in ${Math.round(delay / 1000)}s…`);
    this.clearTimer();
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private clearTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
