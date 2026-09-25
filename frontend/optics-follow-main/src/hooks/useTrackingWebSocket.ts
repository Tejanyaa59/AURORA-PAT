import { useCallback, useEffect, useRef, useState } from "react";
import { TrackingSocket } from "@/api/websocket";
import type { TrackingSample, TrackingUpdate, WebSocketStatus } from "@/types/tracking";
import { HISTORY_LIMIT } from "@/utils/apiConfig";
import { normalizeStatus } from "@/utils/status";

export interface TrackingStreamState {
  wsStatus: WebSocketStatus;
  wsDetail: string | null;
  latest: TrackingUpdate | null;
  history: TrackingSample[];
  lastMessageAt: number | null;
  reconnect: () => void;
  disconnect: () => void;
  clearHistory: () => void;
}

function toSample(update: TrackingUpdate, t0: number): TrackingSample {
  const ts = update.timestamp;
  const seconds = ts > 1e12 ? ts / 1000 : ts; // accept ms or s
  return {
    frame_id: update.frame_id,
    timestamp: seconds,
    t: Math.max(0, seconds - t0),
    status: normalizeStatus(update.status),
    error_x: update.error?.x ?? update.error_x_px ?? null,
    error_y: update.error?.y ?? update.error_y_px ?? null,
    error_mag: update.error?.magnitude ?? null,
    fps: update.performance?.fps ?? null,
    pan: update.camera?.pan ?? null,
    tilt: update.camera?.tilt ?? null,
    commanded_pan_deg_s: update.camera?.commanded_pan_deg_s ?? update.commanded_pan_deg_s ?? null,
    commanded_tilt_deg_s: update.camera?.commanded_tilt_deg_s ?? update.commanded_tilt_deg_s ?? null,
    actual_pan: update.camera?.actual_pan_deg ?? update.actual_pan_deg ?? update.camera?.pan ?? null,
    actual_tilt: update.camera?.actual_tilt_deg ?? update.actual_tilt_deg ?? update.camera?.tilt ?? null,
    confidence:
      update.target?.confidence ??
      update.confidence ??
      update.performance?.detection_confidence ??
      null,
    target_detected: Boolean(update.target_detected),
    kalman_state: update.target?.kalman_state ?? update.kalman_state ?? null,
  };
}

/**
 * Owns the single live /ws/tracking connection and an in-memory history buffer.
 * Rendering is throttled to animation frames so high-rate streams don't stall the UI.
 */
export function useTrackingWebSocket(wsUrl: string, enabled: boolean): TrackingStreamState {
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>("DISCONNECTED");
  const [wsDetail, setWsDetail] = useState<string | null>(null);
  const [latest, setLatest] = useState<TrackingUpdate | null>(null);
  const [history, setHistory] = useState<TrackingSample[]>([]);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);

  const socketRef = useRef<TrackingSocket | null>(null);
  const pendingRef = useRef<TrackingUpdate | null>(null);
  const bufferRef = useRef<TrackingSample[]>([]);
  const t0Ref = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    rafRef.current = null;
    if (pendingRef.current) {
      setLatest(pendingRef.current);
      pendingRef.current = null;
      setHistory([...bufferRef.current]);
      setLastMessageAt(Date.now());
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const socket = new TrackingSocket(wsUrl, {
      onStatus: (s, detail) => {
        setWsStatus(s);
        setWsDetail(detail ?? null);
      },
      onMessage: (update) => {
        const ts = update.timestamp > 1e12 ? update.timestamp / 1000 : update.timestamp;
        // New run detected (frame counter reset) → start a fresh history.
        const lastSample = bufferRef.current[bufferRef.current.length - 1];
        if (lastSample && update.frame_id < lastSample.frame_id) {
          bufferRef.current = [];
          t0Ref.current = null;
        }
        if (t0Ref.current === null) t0Ref.current = ts;
        bufferRef.current.push(toSample(update, t0Ref.current));
        if (bufferRef.current.length > HISTORY_LIMIT) {
          bufferRef.current.splice(0, bufferRef.current.length - HISTORY_LIMIT);
        }
        pendingRef.current = update;
        if (rafRef.current === null) rafRef.current = window.requestAnimationFrame(flush);
      },
    });
    socketRef.current = socket;
    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [wsUrl, enabled, flush]);

  const reconnect = useCallback(() => socketRef.current?.reconnectNow(), []);
  const disconnect = useCallback(() => socketRef.current?.disconnect(), []);
  const clearHistory = useCallback(() => {
    bufferRef.current = [];
    t0Ref.current = null;
    setHistory([]);
    setLatest(null);
  }, []);

  return {
    wsStatus,
    wsDetail,
    latest,
    history,
    lastMessageAt,
    reconnect,
    disconnect,
    clearHistory,
  };
}
