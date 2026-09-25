import { getRestBaseUrl, REQUEST_TIMEOUT_MS } from "@/utils/apiConfig";

export type ApiErrorKind = "offline" | "timeout" | "http" | "invalid" | "unknown";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number | undefined;

  constructor(kind: ApiErrorKind, message: string, status?: number | undefined) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

/** Human-readable message for any thrown value. Never leaks raw JS errors. */
export function describeError(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.name === "AbortError") return "Request timed out.";
  return fallback;
}

function backendOfflineMessage(): string {
  return "Backend unavailable. Ensure the backend server is running.";
}

async function extractDetail(res: Response): Promise<string | undefined> {
  try {
    const data: unknown = await res.clone().json();
    if (data && typeof data === "object") {
      const d = data as { detail?: unknown; message?: unknown };
      if (typeof d.detail === "string") return d.detail;
      if (Array.isArray(d.detail)) {
        const first = d.detail[0] as { msg?: string; loc?: unknown[] } | undefined;
        if (first?.msg) {
          const loc = Array.isArray(first.loc) ? first.loc.slice(1).join(".") : "";
          return loc ? `${loc}: ${first.msg}` : first.msg;
        }
      }
      if (typeof d.message === "string") return d.message;
    }
  } catch {
    /* not json */
  }
  return undefined;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | undefined;
  body?: unknown;
  formData?: FormData | undefined;
  timeoutMs?: number | undefined;
  signal?: AbortSignal | undefined;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, timeoutMs = REQUEST_TIMEOUT_MS, signal } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });

  const headers: Record<string, string> = { Accept: "application/json" };
  let payload: BodyInit | undefined;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    const init: RequestInit = {
      method,
      headers,
      signal: controller.signal,
      ...(payload !== undefined ? { body: payload } : {}),
    };
    res = await fetch(`${getRestBaseUrl()}${path}`, init);
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError("timeout", "Backend did not respond in time (network timeout).");
    }
    throw new ApiError("offline", backendOfflineMessage());
  }
  clearTimeout(timer);

  if (!res.ok) {
    const detail = await extractDetail(res);
    if (res.status === 422 || res.status === 400) {
      throw new ApiError(
        "invalid",
        detail ?? "Invalid configuration rejected by backend.",
        res.status,
      );
    }
    if (res.status === 404) {
      throw new ApiError("http", detail ?? `Endpoint not found: ${path}`, res.status);
    }
    if (res.status === 409) {
      throw new ApiError(
        "http",
        detail ?? "Action not allowed in the current simulation state.",
        res.status,
      );
    }
    throw new ApiError(
      "http",
      detail ?? `Backend request failed (HTTP ${res.status}).`,
      res.status,
    );
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("unknown", "Backend returned an unreadable response.");
  }
}

export const apiClient = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "POST", body }),
  postForm: <T>(
    path: string,
    formData: FormData,
    opts?: Omit<RequestOptions, "method" | "formData">,
  ) => request<T>(path, { ...opts, method: "POST", formData }),
};
