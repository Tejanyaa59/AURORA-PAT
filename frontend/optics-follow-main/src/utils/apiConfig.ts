/**
 * Central backend configuration.
 *
 * Priority:
 *   1. Runtime override saved from the Settings page (browser localStorage)
 *   2. VITE_API_BASE_URL build-time environment variable
 *   3. http://localhost:8000
 */

export const DEFAULT_API_BASE_URL = "http://localhost:8000";
export const API_BASE_URL_STORAGE_KEY = "fsoc.apiBaseUrl";

export const REQUEST_TIMEOUT_MS = 8000;
export const HEALTH_POLL_INTERVAL_MS = 5000;
export const STATUS_POLL_INTERVAL_MS = 2000;
export const VIDEO_STATUS_POLL_INTERVAL_MS = 2000;

/** Number of tracking samples kept in memory for live charts. */
export const HISTORY_LIMIT = 900;

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getEnvApiBaseUrl(): string {
  const fromEnv = import.meta.env["VITE_API_BASE_URL"] as string | undefined;
  return stripTrailingSlash(fromEnv && fromEnv.trim().length > 0 ? fromEnv : DEFAULT_API_BASE_URL);
}

export function getStoredApiBaseUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(API_BASE_URL_STORAGE_KEY);
    return stored && stored.trim().length > 0 ? stripTrailingSlash(stored) : null;
  } catch {
    return null;
  }
}

export function setStoredApiBaseUrl(url: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (url && url.trim().length > 0) {
      window.localStorage.setItem(API_BASE_URL_STORAGE_KEY, stripTrailingSlash(url.trim()));
    } else {
      window.localStorage.removeItem(API_BASE_URL_STORAGE_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

/** e.g. http://localhost:8000 */
export function getApiBaseUrl(): string {
  return getStoredApiBaseUrl() ?? getEnvApiBaseUrl();
}

/** e.g. http://localhost:8000/api */
export function getRestBaseUrl(): string {
  return `${getApiBaseUrl()}/api`;
}

/** e.g. ws://localhost:8000/ws/tracking — derived from the HTTP base URL. */
export function getTrackingWebSocketUrl(): string {
  const base = getApiBaseUrl();
  const ws = base.replace(/^https:/i, "wss:").replace(/^http:/i, "ws:");
  return `${ws}/ws/tracking`;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
