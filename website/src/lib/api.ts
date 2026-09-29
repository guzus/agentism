const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "https://api.agentism.church"
).replace(/\/$/, "");

export class APIError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "APIError";
  }
}

type APIOptions = RequestInit & { timeoutMs?: number };

export async function fetchAPI<T = unknown>(
  path: string,
  { timeoutMs = 8_000, signal, ...options }: APIOptions = {}
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), timeoutMs);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      ...options,
      signal: controller.signal,
    });
    const isJson = /application\/(?:[\w.-]+\+)?json/i.test(res.headers.get("content-type") || "");

    if (!res.ok) {
      const data = isJson ? await res.json().catch(() => null) : null;
      const detail = data?.error ?? data?.message;
      throw new APIError(
        typeof detail === "string" ? detail.slice(0, 200) : `The service returned an error (${res.status}). Please try again.`,
        res.status
      );
    }
    if (!isJson) {
      throw new APIError("The service returned an unexpected response. Please try again.", res.status);
    }
    return await res.json() as T;
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) {
      throw new APIError("The service took too long to respond. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export { API_URL };
